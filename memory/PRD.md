# Connect — Phase 2 + 2.1 Complete

A warm, calm, low-blue-light shared-presence platform. Expo (React Native) + FastAPI + MongoDB + WebSockets.

## Phase 2.1 (shipped — v0.3.1)

Three deferred items from Phase 2 completed:

### 1. User audio upload
- New `POST /api/audio/uploads` (auth-gated, ≤14MB base64) → returns `{id, title}`
- `GET /api/audio/uploads` returns metadata list (no payload)
- `GET /api/audio/uploads/{id}` returns full data URL for playback
- Space content model now accepts `upload_id` — upload_id wins over `audio_id` if both are sent
- Add Content sheet → Audio tab now has **Curated / Your uploads** sub-tabs + **Upload** button that uses `expo-document-picker` → base64 → server

### 2. Sessions category in Files
- Files tab now has 4 segments: **Recent · By person · Categories · Sessions**
- Sessions segment lists `space_sessions` entries with mode icons (video / audio / idle)
- Categories grid also includes a **Sessions** card that switches to the segment

### 3. Watch Together seek bar
- Seek bar row below the YouTube player with current/total position ("1:28 / live")
- Host-only ±10s scrub buttons that call `POST /api/spaces/{id}/state` and broadcast the new position via WebSocket
- Layout constrained (`aspectRatio: 16/9`, `maxHeight: 320`) so controls remain visible on all viewports

## Phase 2 (shipped — v0.3)
Spaces flagship — see the Space Room, real-time WebSocket sync, presence toasts, reactions, chat overlay, session memory, etc. Full details in git history / earlier PRD sections.

## Phase 1 (shipped — v0.1 / v0.2)
Auth, chat (text/voice/image/file), Files hub, mocked voice calls, tabs, top-left profile, appearance (4 palettes, 3 typography pairs).

## Tested
- **Backend**: 53/53 pytest pass (22 Phase-1 regression + 18 Phase-2 + 13 Phase-2.1)
- **Frontend**: testing agent full walk-through pass; the reported "seek bar off-viewport" bug has been fixed and verified on 390×844 mobile viewport

## Known deferred / next
- Migrate `expo-av` → `expo-audio` / `expo-video` before SDK 55 (deprecation warnings)
- Real WebRTC for voice calls
- Push notifications
- Public/discoverable spaces (intentionally out of scope)
