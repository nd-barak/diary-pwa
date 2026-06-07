/**
 * Gestion de l'authentification et du verrouillage (UI et Session Multi-comptes).
 */
const AuthService = (function() {
    const TIMEOUT_MINUTES = 5;
    let timeoutTimer = null;

    // Config Supabase (même clés que sync.js)
    const SUPABASE_URL = 'https://kukusmtmpfreomdxwybk.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_5fE9NJHwQ53RiW_wMElNSw_neDr5gxe';

    // Éléments du DOM
    const authScreen = document.getElementById('auth-screen');
    const appScreen = document.getElementById('app-screen');
    const authForm = document.getElementById('auth-form');
    const usernameInput = document.getElementById('auth-username');
    const passwordInput = document.getElementById('master-password');
    const authError = document.getElementById('auth-error');
    const btnSubmit = document.getElementById('auth-submit');
    
    const tabLogin = document.getElementById('tab-login');
    const tabSignup = document.getElementById('tab-signup');

    let currentMode = 'login'; // 'login' | 'signup'

    // Bascule UI
    function setMode(mode) {
        currentMode = mode;
        authError.classList.add('hidden');
        if (mode === 'signup') {
            tabSignup.classList.add('active');
            tabLogin.classList.remove('active');
            btnSubmit.textContent = "Créer le compte";
        } else {
            tabLogin.classList.add('active');
            tabSignup.classList.remove('active');
            btnSubmit.textContent = "Déverrouiller";
        }
    }

    tabLogin.addEventListener('click', () => setMode('login'));
    tabSignup.addEventListener('click', () => setMode('signup'));

    // Gérer l'inactivité pour verrouiller automatiquement
    function resetActivityTimer() {
        if (!CryptoService.hasKey()) return; 
        
        clearTimeout(timeoutTimer);
        timeoutTimer = setTimeout(() => {
            lockApp();
        }, TIMEOUT_MINUTES * 60 * 1000);
    }

    document.addEventListener('mousemove', resetActivityTimer);
    document.addEventListener('keypress', resetActivityTimer);
    document.addEventListener('touchstart', resetActivityTimer);

    async function init() {
        setMode('login');

        authForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            authError.classList.add('hidden');
            
            const username = usernameInput.value.trim().toLowerCase();
            const password = passwordInput.value;
            
            if (!username || !password) return;

            try {
                if (currentMode === 'signup') {

                    // 1. Vérifier si le pseudo existe déjà en local
                    const existingUser = await DBService.getUser(username);
                    if (existingUser) {
                        showError("Ce pseudonyme est déjà pris.");
                        return;
                    }
                    if (password.length < 8) {
                        showError("Le mot de passe doit faire au moins 8 caractères.");
                        return;
                    }

                    // 2. Vérifier si le pseudo existe déjà dans Supabase (cloud)
                    try {
                        const cloud = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
                        const { data: cloudUser } = await cloud
                            .from('users')
                            .select('username')
                            .eq('username', username)
                            .maybeSingle();

                        if (cloudUser) {
                            showError("Ce pseudonyme est déjà pris. Choisissez-en un autre.");
                            return;
                        }

                        // 3. Créer le compte localement
                        const authResult = await CryptoService.setupNewPassword(password);
                        await DBService.saveUser(username, authResult);

                        // 4. Enregistrer automatiquement dans Supabase
                        const { error } = await cloud.from('users').insert({
                            username,
                            ...authResult
                        });
                        if (error) throw new Error(error.message);

                    } catch (cloudErr) {
                        console.warn("Cloud indisponible, inscription locale uniquement :", cloudErr.message);
                        // Si pas de réseau, on crée quand même le compte localement
                        const authResult = await CryptoService.setupNewPassword(password);
                        await DBService.saveUser(username, authResult);
                    }

                    unlockApp(username);

                } else {
                    // ── CONNEXION ──
                    // 1. Chercher d'abord en local
                    let user = await DBService.getUser(username);

                    // 2. Si pas trouvé en local, chercher dans Supabase (nouvel appareil)
                    if (!user) {
                        try {
                            const cloud = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
                            const { data: cloudUser } = await cloud
                                .from('users')
                                .select('*')
                                .eq('username', username)
                                .maybeSingle();

                            if (cloudUser) {
                                // Restaurer le profil en local depuis le cloud
                                await DBService.saveUser(username, cloudUser);
                                user = cloudUser;
                            }
                        } catch (cloudErr) {
                            console.warn("Cloud indisponible lors de la connexion :", cloudErr.message);
                        }
                    }

                    if (!user) {
                        showError("Utilisateur introuvable ou mot de passe incorrect.");
                        return;
                    }
                    
                    const isValid = await CryptoService.verifyPassword(
                        password, 
                        user.salt, 
                        user.validationIv, 
                        user.validationData
                    );

                    if (isValid) {
                        unlockApp(username);
                    } else {
                        showError("Utilisateur introuvable ou mot de passe incorrect.");
                    }
                }
            } catch (err) {
                console.error(err);
                showError("Une erreur inattendue est survenue.");
            } finally {
                passwordInput.value = '';
            }
        });
        
        document.getElementById('btn-lock').addEventListener('click', lockApp);
    }

    function showError(msg) {
        authError.textContent = msg;
        authError.classList.remove('hidden');
        passwordInput.value = '';
        passwordInput.focus();
    }

    function unlockApp(username) {
        usernameInput.value = '';
        passwordInput.value = '';
        authError.classList.add('hidden');
        authScreen.classList.add('hidden');
        appScreen.classList.remove('hidden');
        resetActivityTimer();
        
        if (window.AppService) {
            window.AppService.setOwner(username);
            window.AppService.loadEntries();
        }
    }

    function lockApp() {
        CryptoService.clearKey();
        
        if (window.AppService) {
            window.AppService.clearUI();
        }

        appScreen.classList.add('hidden');
        authScreen.classList.remove('hidden');
        usernameInput.focus();
    }

    return { init, lockApp };
})();
