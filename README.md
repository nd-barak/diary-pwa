# 🔒 S-Diary — Secure Journal

> A **end-to-end encrypted** personal diary, synced to the cloud and fully **offline-ready**.

![PWA](https://img.shields.io/badge/PWA-ready-blue)
![Encryption](https://img.shields.io/badge/Encryption-AES--GCM%20256bit-green)
![Supabase](https://img.shields.io/badge/Database-Supabase-3ECF8E)
![License](https://img.shields.io/badge/License-MIT-yellow)

---

## ✨ Features

- 🔐 **AES-GCM 256-bit Encryption** — entries are encrypted before being saved. Nobody can read them, not even the server.
- 🧂 **PBKDF2 + SHA-512 Key Derivation** — master password protected against brute-force attacks (600,000 iterations).
- 👥 **Multi-account** — multiple users can coexist on the same device, each with their own isolated entries.
- ☁️ **Supabase Cloud Sync** — save and restore your encrypted data from any device.
- 📴 **Offline-first (PWA)** — works entirely without an internet connection thanks to the Service Worker.
- 🔒 **Auto-lock** — session closes automatically after 5 minutes of inactivity.
- 📤 **Export / Import JSON** — portable local backup of your encrypted data.
- 💾 **IndexedDB Local Storage** — no unencrypted data ever goes through the network.

---

## 🚀 Live Demo

👉 **[Open the app](https://diary-pwa.vercel.app)**

---

## 🛠️ Tech Stack

| Technology | Role |
|---|---|
| **HTML / CSS / JS** | User interface |
| **Web Crypto API** | AES-GCM encryption & PBKDF2 |
| **IndexedDB** | Local data storage |
| **Supabase** | Cloud database (PostgreSQL) |
| **Service Worker** | Offline mode (PWA) |
| **Vercel** | Hosting |

---

## 📁 Project Structure

```
diary-pwa/
├── js/
│   ├── crypto.js         # Cryptographic engine (AES-GCM, PBKDF2)
│   ├── db.js             # Local IndexedDB management
│   ├── auth.js           # Multi-account auth + Supabase sync
│   ├── sync.js           # Cloud sync + export/import
│   └── app.js            # Main UI logic
├── styles/
│   └── main.css          # App styles
├── prisma/
│   └── schema.prisma     # Database schema
├── index.html            # Main interface
├── manifest.json         # PWA configuration
├── sw.js                 # Service Worker (offline mode)
├── prisma.config.ts      # Prisma configuration
├── package.json          # Node.js dependencies
└── .gitignore
```

---

## ⚙️ Local Setup

**1. Clone the repository:**
```bash
git clone https://github.com/nd-barak/diary-pwa.git
cd diary-pwa
```

**2. Install dependencies:**
```bash
npm install
```

**3. Set up environment variables:**
```bash
cp .env.example .env
# Fill in your Supabase keys
```

**4. Run locally:**
```bash
python -m http.server 8080
```
Open `http://localhost:8080`

---

## 🗄️ Database Structure (Supabase)

### Table `users`
| Column | Type | Description |
|---|---|---|
| `username` | text (PK) | Unique username |
| `salt` | text | PBKDF2 derivation salt |
| `validationIv` | text | Validation IV |
| `validationData` | text | Encrypted validation data |

### Table `entries`
| Column | Type | Description |
|---|---|---|
| `id` | int8 (PK) | Identifier (timestamp) |
| `owner` | text | Entry owner username |
| `timestamp` | int8 | Creation date |
| `titleIv` | text | Encrypted title IV |
| `titleData` | text | Encrypted title |
| `contentIv` | text | Encrypted content IV |
| `contentData` | text | Encrypted content |

---

## 🔐 Security

- Decryption key stored **in RAM only**, never persisted to disk
- Data sent to Supabase is **already encrypted** — even Supabase cannot read your journal
- **Row Level Security (RLS)** enabled on all Supabase tables
- XSS protection on all HTML injections
- Auto-lock after inactivity

---

## 🤝 Contributing

Contributions are welcome!

1. Fork the project
2. Create a branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m "Add my feature"`)
4. Push (`git push origin feature/my-feature`)
5. Open a **Pull Request**

---

## 📄 License

MIT — free to use and modify.

---

<p align="center">Made with ❤️ by <a href="https://github.com/nd-barak">nd-barak</a></p>
