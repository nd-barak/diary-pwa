/**
 * Logique principale de l'interface du journal
 */
const AppService = (function() {
    let currentEntryId = null;
    let currentUser = null; // Propriétaire du journal en cours d'utilisation

    // Éléments du DOM
    const entriesList = document.getElementById('entries-list');
    const editorEmpty = document.getElementById('editor-empty');
    const editorActive = document.getElementById('editor-active');
    
    const inputTitle = document.getElementById('entry-title');
    const inputContent = document.getElementById('entry-content');
    
    const btnNew = document.getElementById('btn-new-entry');
    const btnSave = document.getElementById('btn-save');
    const btnDelete = document.getElementById('btn-delete');
    const sidebar = document.getElementById('sidebar');
    const editor = document.getElementById('editor');
    
    function setOwner(username) {
        currentUser = username;
    }
    
    function getOwner() {
        return currentUser;
    }

    // Gestionnaire de date locale formatée courte
    function formatDate(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleDateString() + ' ' + date.getHours().toString().padStart(2, '0') + ':' + date.getMinutes().toString().padStart(2, '0');
    }

    function clearUI() {
        inputTitle.value = '';
        inputContent.value = '';
        editorActive.classList.add('hidden');
        editorEmpty.classList.remove('hidden');
        entriesList.innerHTML = '';
        currentEntryId = null;
        if (!CryptoService.hasKey()) {
            currentUser = null; // Le verrouillage nettoie le nom de compte lié
        }
    }

    async function loadEntries() {
        if (!currentUser) return;
        entriesList.innerHTML = '<p class="text-small" style="padding:1rem;text-align:center;">Déchiffrement...</p>';
        try {
            const entries = await DBService.getEntriesByOwner(currentUser);
            entriesList.innerHTML = '';
            
            if (entries.length === 0) {
                entriesList.innerHTML = '<p class="text-small" style="padding:1rem;color:var(--text-muted);text-align:center;">Aucune entrée pour ce compte.<br>Cliquez sur "+" pour commencer.</p>';
                return;
            }

            for (const entry of entries) {
                try {
                    // Déchiffrer le titre pour l'affichage de la barre latérale
                    const decryptedTitle = await CryptoService.decrypt(entry.titleIv, entry.titleData);
                    
                    const div = document.createElement('div');
                    div.className = `entry-item ${currentEntryId === entry.id ? 'active' : ''}`;
                    div.innerHTML = `
                        <div class="entry-item-title">${escapeHtml(decryptedTitle) || 'Nouvelle entrée'}</div>
                        <div class="entry-item-date">${formatDate(entry.timestamp)}</div>
                    `;
                    div.addEventListener('click', () => openEntry(entry));
                    
                    entriesList.appendChild(div);
                } catch(e) {
                    console.error("Impossible de déchiffrer l'entrée", entry.id);
                }
            }
        } catch (error) {
            console.error(error);
            entriesList.innerHTML = '<p class="error-msg" style="padding:1rem;">Erreur base de données.</p>';
        }
    }

    async function openEntry(entryMetadata) {
        try {
            // Lecture intégrale (bien qu'on l'ait déjà en cache dans getall, on refait un get propre)
            const entry = await DBService.getEntry(entryMetadata.id);
            if (!entry || entry.owner !== currentUser) return; // Sécurité

            const decryptedTitle = await CryptoService.decrypt(entry.titleIv, entry.titleData);
            const decryptedContent = await CryptoService.decrypt(entry.contentIv, entry.contentData);
            
            currentEntryId = entry.id;
            inputTitle.value = decryptedTitle;
            inputContent.value = decryptedContent;
            
            editorEmpty.classList.add('hidden');
            editorActive.classList.remove('hidden');
            
            // Recharger la liste pour appliquer la classe CSS `.active`
            loadEntries();
            
            // Mode mobile : on affiche l'éditeur et on masque la liste
            if (window.innerWidth <= 768) {
                editor.classList.add('open');
            }
        } catch (e) {
            console.error("Échec d'ouverture de l'entrée", e);
            alert("Erreur de déchiffrement ou expiration du token d'authentification.");
        }
    }

    async function saveCurrentEntry() {
        if (!currentUser) return;
        
        const titleText = inputTitle.value.trim();
        const contentText = inputContent.value.trim();
        
        if (!titleText && !contentText) return; // Ne pas sauvegarder un document totalement vide
        
        const timestamp = currentEntryId || Date.now();
        
        try {
            const encryptedTitle = await CryptoService.encrypt(titleText);
            const encryptedContent = await CryptoService.encrypt(contentText);
            
            const entry = {
                id: timestamp,
                owner: currentUser,
                timestamp: timestamp,
                titleIv: encryptedTitle.iv,
                titleData: encryptedTitle.data,
                contentIv: encryptedContent.iv,
                contentData: encryptedContent.data
            };
            
            await DBService.saveEntry(entry);
            currentEntryId = timestamp;
            
            // Feedback visuel de sauvegarde réussie
            const previousText = btnSave.textContent;
            btnSave.textContent = "✔ Enregistré";
            setTimeout(() => { btnSave.textContent = previousText; }, 2000);
            
            loadEntries();
        } catch (e) {
            console.error(e);
            alert("Erreur lors de la sauvegarde sécurisée.");
        }
    }

    async function deleteCurrentEntry() {
        if (!currentEntryId || !currentUser) return;
        if (!confirm("Voulez-vous vraiment supprimer cette entrée définitivement ?")) return;
        
        try {
            await DBService.deleteEntry(currentEntryId);
            clearUI();
            // Ramener l'owner manquant éventuellement si clearUI l'a dégagé parce que mal codé.
            // Wait, clearUI ne dégage currentUser que si CryptoService a perdu la clé. Ce qui est bon.
            loadEntries();
            editor.classList.remove('open'); // Rétracter l'éditeur sur mobile
        } catch(e) {
            console.error(e);
            alert("Erreur lors de la suppression.");
        }
    }

    function createNewEntry() {
        currentEntryId = null;
        inputTitle.value = "";
        inputContent.value = "";
        editorEmpty.classList.add('hidden');
        editorActive.classList.remove('hidden');
        inputTitle.focus();
        if (window.innerWidth <= 768) {
            editor.classList.add('open');
        }
    }
    
    // Auto-sauvegarde élémentaire (facultatif / bonus fluide)
    let autoSaveTimer;
    function triggerAutoSave() {
        clearTimeout(autoSaveTimer);
        autoSaveTimer = setTimeout(() => {
            if (currentEntryId || inputTitle.value || inputContent.value) saveCurrentEntry();
        }, 3000); // 3 secondes après l'arrêt de frappe
    }
    inputTitle.addEventListener('input', triggerAutoSave);
    inputContent.addEventListener('input', triggerAutoSave);
    
    // Protection basique Cross-Site Scripting (XSS) pour le text brut injecté dans .innerHTML
    function escapeHtml(unsafe) {
        return (unsafe||"").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    // Connecter les écouteurs de clics
    btnNew.addEventListener('click', createNewEntry);
    btnSave.addEventListener('click', saveCurrentEntry);
    btnDelete.addEventListener('click', deleteCurrentEntry);
    
    // Bouton de retour en mode mobile
    document.addEventListener('keydown', (e) => {
        if (e.key === "Escape" && window.innerWidth <= 768) {
            editor.classList.remove('open');
        }
    });

    // Booting / Initialisation des composants fondamentaux
    async function boot() {
        try {
            await DBService.init();
            await AuthService.init();
        } catch(e) {
            console.error("Erreur critique de démarrage:", e);
            alert("Erreur critique de la base de données. L'application ne peut s'initialiser.");
        }
    }

    return { loadEntries, clearUI, boot, setOwner, getOwner };
})();

document.addEventListener('DOMContentLoaded', () => {
    // Rend le AppService global afin que AuthService puisse s'y greffer
    window.AppService = AppService;
    AppService.boot();
});
