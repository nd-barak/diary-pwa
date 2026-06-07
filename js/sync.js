/**
 * Gestion de la synchronisation cloud (Supabase) + import/export local
 */
const SyncService = (function() {

    // ─── Configuration Supabase ───────────────────────────────────────────────
    const SUPABASE_URL = 'https://kukusmtmpfreomdxwybk.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_5fE9NJHwQ53RiW_wMElNSw_neDr5gxe';

    // Initialisation du client Supabase (la lib doit être chargée avant ce script)
    let cloud = null;
    function getCloud() {
        if (!cloud) {
            cloud = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        }
        return cloud;
    }

    // ─── Synchronisation CLOUD ────────────────────────────────────────────────

    /**
     * Envoie les données locales (utilisateur + entrées) vers Supabase.
     * Les données sont déjà chiffrées, Supabase ne voit jamais le contenu réel.
     */
    async function syncToCloud() {
        if (!window.AppService || !window.AppService.getOwner()) {
            return alert("Vous devez être connecté pour synchroniser.");
        }

        try {
            const owner = window.AppService.getOwner();
            const db = getCloud();

            // 1. Envoyer le profil utilisateur
            const user = await DBService.getUser(owner);
            if (user) {
                const { error: userError } = await db.from('users').upsert(user);
                if (userError) throw new Error("Erreur sync utilisateur : " + userError.message);
            }

            // 2. Envoyer toutes les entrées du journal
            const entries = await DBService.getEntriesByOwner(owner);
            if (entries.length > 0) {
                const { error: entriesError } = await db.from('entries').upsert(entries);
                if (entriesError) throw new Error("Erreur sync entrées : " + entriesError.message);
            }

            alert(`✅ Synchronisation réussie ! ${entries.length} entrée(s) sauvegardée(s) dans le cloud.`);
        } catch (e) {
            console.error(e);
            alert("❌ Erreur lors de la synchronisation : " + e.message);
        }
    }

    /**
     * Récupère les données depuis Supabase et les restaure en local.
     * Utile pour accéder à son journal depuis un nouvel appareil.
     */
    async function syncFromCloud() {
        const username = prompt("Entrez votre pseudonyme pour restaurer depuis le cloud :");
        if (!username) return;

        try {
            const db = getCloud();

            // 1. Récupérer le profil utilisateur
            const { data: user, error: userError } = await db
                .from('users')
                .select('*')
                .eq('username', username.trim().toLowerCase())
                .single();

            if (userError || !user) {
                alert("❌ Utilisateur introuvable dans le cloud.");
                return;
            }

            // 2. Récupérer les entrées
            const { data: entries, error: entriesError } = await db
                .from('entries')
                .select('*')
                .eq('owner', username.trim().toLowerCase());

            if (entriesError) throw new Error("Erreur récupération entrées : " + entriesError.message);

            if (!confirm(`⚠️ Restauration de "${username}" avec ${entries.length} entrée(s). Les données locales existantes seront écrasées. Continuer ?`)) return;

            // 3. Importer dans IndexedDB local
            await DBService.importOwnerData({ user, entries: entries || [] });

            alert("✅ Restauration réussie ! L'application va se recharger.");
            window.location.reload();
        } catch (e) {
            console.error(e);
            alert("❌ Erreur lors de la restauration : " + e.message);
        }
    }

    // ─── Export / Import LOCAL (fichier JSON) ─────────────────────────────────

    async function exportData() {
        if (!window.AppService || !window.AppService.getOwner()) {
            return alert("Vous devez être connecté pour exporter vos données.");
        }
        try {
            const owner = window.AppService.getOwner();
            const data = await DBService.exportOwnerData(owner);
            const jsonStr = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonStr], { type: "application/json" });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `s-diary-${owner}-${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error(e);
            alert("Erreur lors de l'export des données.");
        }
    }

    function importDataFile(file) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (!data.user || !data.entries) {
                    throw new Error("Format invalide : il manque 'user' ou 'entries'.");
                }
                if (confirm(`⚠️ ATTENTION : L'importation restaurera les données de "${data.user.username}". Continuer ?`)) {
                    await DBService.importOwnerData(data);
                    alert("Importation réussie ! L'application va se recharger.");
                    window.location.reload();
                }
            } catch (err) {
                console.error(err);
                alert("Erreur : Le fichier de sauvegarde est invalide ou corrompu.");
            }
        };
        reader.readAsText(file);
    }

    function triggerImport() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        input.style.display = 'none';
        input.onchange = (e) => importDataFile(e.target.files[0]);
        document.body.appendChild(input);
        input.click();
        setTimeout(() => document.body.removeChild(input), 1000);
    }

    // ─── Connexion des boutons ────────────────────────────────────────────────

    document.addEventListener('DOMContentLoaded', () => {
        const btnExport  = document.getElementById('btn-export');
        const btnImport  = document.getElementById('btn-import');
        const btnSyncUp  = document.getElementById('btn-sync-up');
        const btnSyncDown = document.getElementById('btn-sync-down');

        if (btnExport)   btnExport.addEventListener('click', exportData);
        if (btnImport)   btnImport.addEventListener('click', triggerImport);
        if (btnSyncUp)   btnSyncUp.addEventListener('click', syncToCloud);
        if (btnSyncDown) btnSyncDown.addEventListener('click', syncFromCloud);
    });

    return { exportData, triggerImport, syncToCloud, syncFromCloud };
})();
