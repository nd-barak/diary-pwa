# 🔒 S-Diary — Secure Journal

> Journal intime **chiffré de bout en bout**, synchronisé dans le cloud et utilisable **hors-ligne**.

![PWA](https://img.shields.io/badge/PWA-ready-blue)
![Chiffrement](https://img.shields.io/badge/Chiffrement-AES--GCM%20256bit-green)
![Supabase](https://img.shields.io/badge/Database-Supabase-3ECF8E)
![Licence](https://img.shields.io/badge/Licence-MIT-yellow)

---

## ✨ Fonctionnalités

- 🔐 **Chiffrement AES-GCM 256 bits** — vos entrées sont chiffrées avant d'être sauvegardées. Personne ne peut les lire, même pas le serveur.
- 🧂 **Dérivation PBKDF2 + SHA-512** — mot de passe maître protégé contre les attaques par force brute (600 000 itérations).
- 👥 **Multi-comptes** — plusieurs utilisateurs peuvent coexister sur le même appareil.
- ☁️ **Synchronisation Supabase** — sauvegardez et restaurez vos données chiffrées depuis n'importe quel appareil.
- 📴 **Offline-first (PWA)** — fonctionne entièrement sans connexion internet.
- 🔒 **Verrouillage automatique** — session fermée après 5 minutes d'inactivité.
- 📤 **Export / Import JSON** — sauvegarde locale portable.

---

## 🚀 Demo

👉 **[Accéder à l'application](https://diary-pwa.vercel.app)**

---

## 🛠️ Technologies utilisées

| Technologie | Rôle |
|---|---|
| **HTML / CSS / JS** | Interface utilisateur |
| **Web Crypto API** | Chiffrement AES-GCM & PBKDF2 |
| **IndexedDB** | Stockage local des données |
| **Supabase** | Base de données cloud (PostgreSQL) |
| **Service Worker** | Mode hors-ligne (PWA) |
| **Vercel** | Hébergement |

---

## 📁 Structure du projet

```
diary-pwa/
├── js/
│   ├── crypto.js         # Moteur cryptographique (AES-GCM, PBKDF2)
│   ├── db.js             # Gestion IndexedDB locale
│   ├── auth.js           # Authentification multi-comptes + sync Supabase
│   ├── sync.js           # Synchronisation cloud + export/import
│   └── app.js            # Logique principale de l'interface
├── styles/
│   └── main.css          # Styles de l'application
├── prisma/
│   └── schema.prisma     # Schéma de base de données
├── index.html            # Interface principale
├── manifest.json         # Configuration PWA
├── sw.js                 # Service Worker (mode hors-ligne)
├── prisma.config.ts      # Configuration Prisma
├── package.json          # Dépendances Node.js
└── .gitignore
```

---

## ⚙️ Installation locale

**1. Clonez le dépôt :**
```bash
git clone https://github.com/nd-barak/diary-pwa.git
cd diary-pwa
```

**2. Installez les dépendances :**
```bash
npm install
```

**3. Configurez les variables d'environnement :**
```bash
cp .env.example .env
# Remplissez avec vos clés Supabase
```

**4. Lancez localement :**
```bash
python -m http.server 8080
```
Ouvrez `http://localhost:8080`

---

## 🗄️ Structure de la base de données (Supabase)

### Table `users`
| Colonne | Type | Description |
|---|---|---|
| `username` | text (PK) | Pseudonyme unique |
| `salt` | text | Sel de dérivation PBKDF2 |
| `validationIv` | text | IV de validation |
| `validationData` | text | Données de validation chiffrées |

### Table `entries`
| Colonne | Type | Description |
|---|---|---|
| `id` | int8 (PK) | Identifiant (timestamp) |
| `owner` | text | Pseudonyme du propriétaire |
| `timestamp` | int8 | Date de création |
| `titleIv` | text | IV du titre chiffré |
| `titleData` | text | Titre chiffré |
| `contentIv` | text | IV du contenu chiffré |
| `contentData` | text | Contenu chiffré |

---

## 🔐 Sécurité

- Clé de déchiffrement stockée **uniquement en RAM**
- Données envoyées à Supabase **déjà chiffrées**
- **Row Level Security (RLS)** activé sur Supabase
- Protection XSS sur toutes les injections HTML
- Verrouillage automatique après inactivité

---

## 📄 Licence

MIT — libre d'utilisation et de modification.

---

<p align="center">Fait avec ❤️ par <a href="https://github.com/nd-barak">nd-barak</a></p>
