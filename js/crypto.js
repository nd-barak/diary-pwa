/**
 * Moteur cryptographique (Web Crypto API)
 * Implémentation de PBKDF2 pour la dérivation et AES-GCM pour le chiffrement.
 */
const CryptoService = (function() {
    // Clé stockée uniquement en RAM, non accessible globalement
    let currentKey = null;

    const ITERATIONS = 600000; // Boost de sécurité : Norme recommandée (contre les GPU)
    const HASH_ALGO = "SHA-512"; // Augmentation de l'entropie de la sous-clef
    
    // Utilitaires de conversion chaîne <-> ArrayBuffer
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    // Génère un sel aléatoire (ex: pour la première création du mot de passe)
    function generateSalt(length = 16) {
        return window.crypto.getRandomValues(new Uint8Array(length));
    }

    // Génère un Vecteur d'Initialisation (IV) pour AES-GCM
    function generateIV(length = 12) {
        return window.crypto.getRandomValues(new Uint8Array(length));
    }

    /**
     * Convertit un ArrayBuffer en chaîne Base64 (utile pour le stockage JSON/IndexedDB)
     */
    function arrayBufferToBase64(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    }

    /**
     * Convertit une chaîne Base64 en Uint8Array
     */
    function base64ToUint8Array(base64) {
        const binary_string = window.atob(base64);
        const len = binary_string.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binary_string.charCodeAt(i);
        }
        return bytes;
    }

    /**
     * Dérive une clé AES-GCM 256 bits à partir d'un mot de passe et d'un sel.
     */
    async function deriveKey(password, saltBuffer) {
        // 1. Importer le mot de passe comme matériel de clé brute
        const keyMaterial = await window.crypto.subtle.importKey(
            "raw",
            encoder.encode(password),
            { name: "PBKDF2" },
            false,
            ["deriveBits", "deriveKey"]
        );

        // 2. Dériver la vraie clé avec PBKDF2
        return await window.crypto.subtle.deriveKey(
            {
                name: "PBKDF2",
                salt: saltBuffer,
                iterations: ITERATIONS,
                hash: HASH_ALGO
            },
            keyMaterial,
            { name: "AES-GCM", length: 256 },
            false, // Clé non extractible pour plus de sécurité
            ["encrypt", "decrypt"]
        );
    }

    return {
        // État de la session
        hasKey: () => currentKey !== null,
        clearKey: () => { currentKey = null; },

        // Gestion de l'authentification
        async setupNewPassword(password) {
            const salt = generateSalt();
            currentKey = await deriveKey(password, salt);
            
            // Pour vérifier le mot de passe plus tard, on chiffre un "message de test" constant
            const testMessage = "DIARY_AUTH_OK";
            const encryptedValidation = await this.encrypt(testMessage);

            return {
                salt: arrayBufferToBase64(salt),
                validationIv: encryptedValidation.iv,
                validationData: encryptedValidation.data
            };
        },

        async verifyPassword(password, base64Salt, validationIvBase64, validationDataBase64) {
            const salt = base64ToUint8Array(base64Salt);
            const tempKey = await deriveKey(password, salt);
            
            try {
                // Tentative de déchiffrement du message de test avec la clé dérivée.
                // Si le mot de passe est faux, le déchiffrement échouera silencieusement (OperationError).
                const iv = base64ToUint8Array(validationIvBase64);
                const data = base64ToUint8Array(validationDataBase64);
                
                const decryptedBuffer = await window.crypto.subtle.decrypt(
                    { name: "AES-GCM", iv: iv },
                    tempKey,
                    data
                );
                
                const decryptedText = decoder.decode(decryptedBuffer);
                if (decryptedText === "DIARY_AUTH_OK") {
                    currentKey = tempKey; // Mot de passe correct, on garde la clé en mémoire
                    return true;
                }
                return false;
            } catch (e) {
                return false; // Erreur de déchiffrement = mauvais mot de passe
            }
        },

        // Fonctions de chiffrement de données (pour le journal)
        async encrypt(text) {
            if (!currentKey) throw new Error("Clé non disponible. Veuillez vous authentifier.");
            
            const iv = generateIV();
            const encodedText = encoder.encode(text);
            
            const ciphertextBuffer = await window.crypto.subtle.encrypt(
                { name: "AES-GCM", iv: iv },
                currentKey,
                encodedText
            );
            
            return {
                iv: arrayBufferToBase64(iv),
                data: arrayBufferToBase64(ciphertextBuffer)
            };
        },

        async decrypt(base64Iv, base64Data) {
            if (!currentKey) throw new Error("Clé non disponible. Veuillez vous authentifier.");
            
            const iv = base64ToUint8Array(base64Iv);
            const data = base64ToUint8Array(base64Data);
            
            const decryptedBuffer = await window.crypto.subtle.decrypt(
                { name: "AES-GCM", iv: iv },
                currentKey,
                data
            );
            
            return decoder.decode(decryptedBuffer);
        }
    };
})();
