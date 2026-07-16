# Connect — Phase 2 (Spaces) Build

A warm, calm, low-blue-light shared-presence platform built on Expo (React Native) + FastAPI + MongoDB + WebSockets.

## Phase 2 Scope (shipped — v0.3 / "Spaces")

### Spaces tab (upgraded from placeholder)
- **Active Now** — horizontal cards with activity badge (Watching / Listening), title, content preview, stacked active-member avatars
- **Your Rooms** — persistent saved spaces with members
- **Create Space** — prominent soft card

### Create Space flow (`/space/create`)
- Optional name + multi-select people picker → "Enter Space"

### Space Room (`/space/[id]`) — the core experience
- Floating header (back, title, "N people together", avatar stack)
- **Watch Together (YouTube)** via `react-native-webview` + iframe API; on web preview, falls back to a real `<iframe>`
- **Listen Together (Audio)** via `expo-av` Sound; album-style cover with a soft pulse animation while playing
- **Idle hero** when no content is loaded ("The room is open. Add a video or song…")
- **Floating bottom controls**: Add Content (+), Play / Pause (host-locked), Reactions ♥, Chat 💬, Leave
- **Add Content sheet** — bottom-sheet modal with two tabs: YouTube URL paste, Curated Audio (4 tracks)
- **Reactions** — 6-emoji strip; reactions float upward with stagger + fade animation, broadcast to all members
- **Presence toasts** — gentle fading text overlays ("Leo joined", "Indie paused")
- **Chat overlay** — sliding bottom sheet with bubbles, composer, real-time delivery via WebSocket
- **Leave** — saves a session memory entry once the last person leaves

### Real-time sync
- FastAPI `WebSocket /api/ws/spaces/{id}?token=<JWT>`
- Server is the source of truth: `{is_playing, position_sec, host_id, updated_at}`
- Clients project current position as `position_sec + (now - updated_at)` while playing — drift-resilient
- Snapshot pushed on connect; subsequent broadcasts: `presence`, `content`, `state`, `message`, `reaction`

### Chat integration
- The "Start a shared space" pill in `/chat/[id]` is now functional — creates a space, sends a `space_invite` message, opens the room
- `space_invite` messages render as a **Join Space card** that re-opens the room when tapped

### File integration / Session memory
- Each non-text message is already aggregated into the **Files** tab (Phase 1)
- Once the last member leaves a space with content, a `space_session` document is created with `{title, mode, ended_at, content}` (foundation for a future "Sessions" category in Files)

## API surface (Phase 2 additions)
- `POST/GET /api/spaces`  ·  `GET /api/spaces/{id}`
- `POST /api/spaces/{id}/{join,leave,content,state,messages,reactions}`
- `GET /api/spaces/{id}/messages`
- `GET /api/audio/library` (4 curated tracks)
- `WS /api/ws/spaces/{id}?token=`

## Tested
- Backend: **40/40 pytest** (22 Phase-1 regression + 18 new Spaces, including 2 async WebSocket cases)
- Frontend: full create → enter → add content → play → reactions → chat → leave walk-through

## Known limitations / deferred
- User audio upload — deferred to Phase 2.1 (curated tracks ship now)
- Web preview does not run the YouTube iframe API for sync (real iframe shows the video, but play/pause sync is mobile-only). Mobile builds get full sync.
- Multi-step seek scrubbing UI — playback is host-controlled play/pause (matches spec), no seek bar yet

## Demo accounts
See `/app/memory/test_credentials.md`.

## Phase 2.x candidates
- User audio upload + storage
- "Sessions" category in Files tab
- Seek bar in Watch Together
- Push notifications when an active member joins
- Real WebRTC for the existing voice-call flow
- Public/discoverable spaces (intentionally NOT in this phase)
