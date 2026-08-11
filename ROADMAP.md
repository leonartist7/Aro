# Connect — Roadmap & Progress Outline

Status snapshot of the app: Expo (web) + FastAPI + MongoDB + LiveKit.

## ✅ Done

### Foundation & tooling
- Installed all frontend deps (`npm install`), added `dev` script (`expo start --web`)
- Docker (MongoDB) + backend up locally; `backend/.env` with real secrets (gitignored)
- Frontend deployed to Vercel: https://dist-eight-pi-93.vercel.app

### PWA / installability
- Web manifest + service worker + PWA icons (`frontend/public/`)
- App renamed to **Connect**, theme-color/display config in `app.json`
- Verified live: `/manifest.json`, `/sw.js`, icons all 200

### Backend security & hardening
- JWT secret fail-fast (refuses to start with weak/missing secret)
- CORS lockdown (explicit origins + `*.vercel.app` regex, no wildcard)
- Media size caps on messages; audio-upload ownership checks; space playback host-only
- Deprecated `@app.on_event` → lifespan; seed no longer resets demo passwords
- Deps bumped for Python 3.14 (pymongo 4.17, motor 3.7.1, bcrypt 5)

### Features
- Quick message modal: input auto-focuses, ready to type
- Radial menu modes actually work: **Voice memo** (timer + duration) and **Send file** (document picker)
- **Real call flow** (signaling): ring → incoming-call overlay anywhere in the app → accept/decline/busy → timer → history for both users (CallHub WebSocket + `/api/calls/*`)
- **LiveKit audio integration** (web): token endpoint `POST /api/calls/{id}/token`, `livekit-client` room connect, real mic publish, working mute, audio status indicators, graceful fallback

### Theme & UX
- 9 themes (added Honey, Rose, Sage, Cocoa, Moon)
- All screens converted to `useTheme()` (login, call, chat, message parts) — dark mode consistent

### Bug fixes
- Chat: text no longer lost on send failure; correct PNG mime; mic button no accidental sends; polling stops when unfocused; error banners with retry
- Unhandled `fetch` failures handled on Files, Calls, Create Space, New Message

## 🔲 Missing / Next

### High priority
- **LiveKit credentials**: add `LIVEKIT_URL` / `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` to `backend/.env` (from cloud.livekit.io) → real audio goes live
- **Deploy the backend** (Render + MongoDB Atlas) so the installed PWA works for anyone (frontend currently points at local backend)
- **Native mobile build**: LiveKit RN SDK needs Expo dev build (`expo prebuild`/EAS) — web is audio-capable now, mobile is not

### Medium
- Real voice recording in chat + playback of voice messages (currently duration-only)
- WS presence TTL / heartbeat for spaces (stale "Active now")
- Call buttons: Video/More controls; group calls (LiveKit rooms already support it)
- Global 401 handling → auto-redirect to login
- `backend/run_backend.py` prod params; `.env.example` missing; pymongo list pagination

### Low / polish
- Dead buttons on You screen (Notifications/Privacy/Help)
- Remove unused deps (`expo-av`, `@expo/ngrok`, etc.), unused exports (`shadows`, `headingRegular`)
- Login screen: remove demo credential prefill for prod
- Session summaries copy ("Phase 2" footer) cleanup

## How to run (dev)
1. `docker compose up -d` (MongoDB) — in `backend/`
2. `python -m uvicorn server:app --port 8000` — in `backend/`
3. `npm run dev` — in `frontend/` (opens at localhost:8081)

Demo accounts: `ava@` / `leo@` / `noor@` / `sage@connect.app` · `connect123`
