/**
 * Gestion de la base de données IndexedDB (Version 2 : Multi-comptes)
 */
const DBService = (function() {
    const DB_NAME = 'SDiaryDB';
    const DB_VERSION = 2; // Montée en version
    let db = null;

    function init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
                const _db = event.target.result;
                const oldVersion = event.oldVersion;
                
                // Migration : Si v1, on efface pour sécuriser le nouveau schéma multi-comptes
                if (oldVersion === 1) {
                    if (_db.objectStoreNames.contains('config')) _db.deleteObjectStore('config');
                    if (_db.objectStoreNames.contains('entries')) _db.deleteObjectStore('entries');
                }
                
                // Table pour les comptes utilisateurs
                if (!_db.objectStoreNames.contains('users')) {
                    _db.createObjectStore('users', { keyPath: 'username' });
                }

                // Table pour les entrées du journal
                if (!_db.objectStoreNames.contains('entries')) {
                    const entriesStore = _db.createObjectStore('entries', { keyPath: 'id' });
                    entriesStore.createIndex('timestamp', 'timestamp', { unique: false });
                    // Nouvel index requis pour isoler par compte
                    entriesStore.createIndex('owner', 'owner', { unique: false });
                }
            };

            request.onsuccess = (event) => {
                db = event.target.result;
                resolve(db);
            };

            request.onerror = (event) => {
                console.error("Erreur d'initialisation IndexedDB:", event.target.error);
                reject(event.target.error);
            };
        });
    }

    // Fonction utilitaire
    function executeTransaction(storeName, mode, callback) {
        return new Promise((resolve, reject) => {
            if (!db) return reject(new Error("Base de données non initialisée"));
            const transaction = db.transaction(storeName, mode);
            const store = transaction.objectStore(storeName);
            
            const request = callback(store);
            
            if (request) {
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            } else {
                 transaction.oncomplete = () => resolve();
                 transaction.onerror = () => reject(transaction.error);
            }
        });
    }

    return {
        init,
        
        // --- GESTION DES COMPTES (USERS) ---
        async saveUser(username, data) {
            return executeTransaction('users', 'readwrite', store => {
                const userObj = { username, ...data };
                return store.put(userObj);
            });
        },
        
        async getUser(username) {
            return executeTransaction('users', 'readonly', store => store.get(username));
        },

        // --- GESTION ENTRÉES DU JOURNAL ---
        async getEntriesByOwner(owner) {
            if (!db) throw new Error("Base de données non initialisée");
            return new Promise((resolve, reject) => {
                const transaction = db.transaction('entries', 'readonly');
                const store = transaction.objectStore('entries');
                
                // On utilise l'index owner
                const index = store.index('owner');
                const request = index.getAll(owner);
                
                request.onsuccess = (event) => {
                    const entries = event.target.result || [];
                    // Tri descendant des dates (le plus récent en premier) en JS pur
                    entries.sort((a, b) => b.timestamp - a.timestamp);
                    resolve(entries);
                };
                request.onerror = () => reject(request.error);
            });
        },

        async getEntry(id) {
            return executeTransaction('entries', 'readonly', store => store.get(id));
        },

        async saveEntry(entry) {
            // entry doit contenir : id, owner, encryptedTitle, encryptedContent, timestamp
            return executeTransaction('entries', 'readwrite', store => store.put(entry));
        },

        async deleteEntry(id) {
            return executeTransaction('entries', 'readwrite', store => store.delete(id));
        },
        
        // --- EXPORT / IMPORT POUR UN SEUL COMPTE ---
        async exportOwnerData(owner) {
            if (!db) throw new Error("Base de données non initialisée");
            const user = await this.getUser(owner);
            const entries = await this.getEntriesByOwner(owner);
            return { user, entries };
        },

        async importOwnerData(data) {
            if (!db) throw new Error("Base de données non initialisée");
            const { user, entries } = data;
            
            return new Promise((resolve, reject) => {
                const transaction = db.transaction(['users', 'entries'], 'readwrite');
                transaction.oncomplete = () => resolve();
                transaction.onerror = () => reject(transaction.error);
                
                const userStore = transaction.objectStore('users');
                const entriesStore = transaction.objectStore('entries');
                
                if (user) {
                    userStore.put(user);
                }
                
                // Vidage méticuleux via curseur de l'ancien contenu POU CE COMPTE UNIQUEMENT
                if (user && entries) {
                    const index = entriesStore.index('owner');
                    const cursorReq = index.openCursor(user.username);
                    cursorReq.onsuccess = (e) => {
                        const cursor = e.target.result;
                        if (cursor) {
                            entriesStore.delete(cursor.primaryKey);
                            cursor.continue();
                        } else {
                            // Quand fini d'effacer les restes, on injecte la nouvelle donnée
                            entries.forEach(entry => entriesStore.put(entry));
                        }
                    };
                }
            });
        }
    };
})();
