# Connect — Phase 1 MVP

A warm, calm, low-blue-light 1:1 messaging app built with Expo (React Native) + FastAPI + MongoDB.

## Phase 1 Scope (shipped — v0.2)

- Email/password auth (JWT, bcrypt) with session persistence (AsyncStorage)
- **Bottom nav redesign (v0.2)**: `Home · Files · [+] · Calls · Spaces` with a raised center FAB.
  - Tap `+` → Quick Message card (bottom sheet) with horizontal contact circles + inline text input
  - Long-press `+` → animated upward-arc radial menu with 4 nodes
- **Top-left profile avatar** on every tab → opens `/you` as a standalone screen
- 1:1 chat with text, voice messages, images, files
  - "Start a shared space" pill (Phase 2 placeholder, non-functional)
  - Polling every 4s for new messages (websocket-ready)
- Files hub: Recent / By person / Categories (Images, Documents, Audio)
- Calls tab: history + mocked call screen with pulsing rings
- **Spaces tab** (new): Phase-2 placeholder with hero + feature cards + "nudge me" waitlist CTA
- `/you`: profile, settings rows, sign out
- **`/appearance` (new)**: visual theme picker with live preview
  - 4 palette presets: **Warm** (default), **Dune**, **Evening**, **Charcoal**
  - 3 typography pairs: **Fraunces · DM Sans**, **Fraunces all the way**, **DM Sans only**
  - Choices persist in AsyncStorage, apply live across every screen

## Architecture for Phase 2 (Spaces)

- `chats` collection has a `type` field (`"dm"` today; `"space"` in future) — messaging API serves both.
- Bottom tab nav is data-driven — Spaces tab already exists; opening a real Space is the only new code.
- Chat screen already renders a "Start a shared space" pill placeholder.
- Messages are room-based via `chat_id`, so multi-user rooms reuse `/api/chats/{id}/messages` unchanged.

## Theming architecture

- `src/theme.ts` exports 4 `Palette` presets + 3 `FontPair` presets.
- `src/ThemeContext.tsx` provides `useTheme()` → `{ c, f, themeName, setTheme, fontKey, setFontKey }`.
- Every screen uses the `makeStyles(c, f)` pattern with `useMemo` so theme changes re-style instantly.
- Selection persists in AsyncStorage (`connect_theme`, `connect_font`).

## Tech

- **Frontend**: Expo SDK 54, expo-router, react-native-reanimated (radial + call ring animations), AsyncStorage, Ionicons, Fraunces (heading) + DM Sans (body)
- **Backend**: FastAPI + Motor (MongoDB), bcrypt, PyJWT
- **Storage**: base64 in MongoDB for the MVP
- **Calling**: mocked UI flow (no real audio stream)

## Demo accounts

See `/app/memory/test_credentials.md`.

## Phase 2 candidates

- Real-time websockets
- Spaces (multi-user shared rooms with shared media playback + presence)
- Real WebRTC voice/video
- Push notifications
- End-to-end encryption
