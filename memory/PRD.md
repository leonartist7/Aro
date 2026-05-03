# Connect — Phase 1 MVP

A warm, calm, low-blue-light 1:1 messaging app built with Expo (React Native) + FastAPI + MongoDB.

## Phase 1 Scope (shipped)

- Email/password auth (JWT, bcrypt) with session persistence (AsyncStorage)
- Bottom tab nav: **Home · Files · Calls · You** (architected to add **Spaces** as a 5th tab)
- Home: chat list + top-right `+` button
  - Tap → "New message" modal (search & start chat)
  - Long-press → animated radial action menu (4 nodes; spring animation)
- 1:1 chat with text, voice messages, images, files
  - Voice: tap-and-hold mic to record, slide to cancel/send (mocked audio bytes; duration recorded)
  - Image: gallery picker (base64 inline)
  - File: document picker (filename + size)
  - Polling every 4s for new messages (websocket-ready architecture)
  - "Start a shared space" pill (Phase 2 placeholder, non-functional)
- Files hub: Recent / By person / Categories (Images, Documents, Audio)
- Calls tab: history list, mocked call screen with pulsing rings, end-call records call
- You tab: profile, settings rows, sign out

## Architecture for Phase 2 (Spaces)

- `chats` collection has a `type` field (`"dm"` today; `"space"` in future) so the same messaging API serves both.
- Bottom tab nav is data-driven — adding a `Spaces` tab is a one-liner.
- Chat screen already renders a "Start a shared space" pill placeholder.
- Messages are room-based via `chat_id`, so multi-user rooms reuse `/api/chats/{id}/messages` unchanged.

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
