# 🔒 S-Diary — Secure Journal

A personal diary app with **end-to-end encryption**, cloud sync, and full offline support.

---

## Features

- **AES-GCM 256-bit encryption** with PBKDF2 + SHA-512 key derivation
- **Multi-account support** — each user's data is fully isolated
- **Cloud sync** via Supabase — access your journal from any device
- **Offline-first PWA** — works without an internet connection
- **Auto-lock** after 5 minutes of inactivity
- **Export / Import** — portable JSON backup

## Tech Stack

- HTML / CSS / Vanilla JS
- Web Crypto API
- IndexedDB
- Supabase (PostgreSQL)
- Service Worker (PWA)
- Vercel (hosting)

## Live

👉 https://diary-pwa.vercel.app

## Getting Started

```bash
git clone https://github.com/nd-barak/diary-pwa.git
cd diary-pwa
npm install
```

Add your Supabase credentials in `js/auth.js` and `js/sync.js`, then open `index.html` with a local server.

## License

MIT
