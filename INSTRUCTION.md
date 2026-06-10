# FE-Streaming-app — Viewer App

React Native / Expo app for watching live streams, chatting, and managing
your account profile.

> **First time setting up the full demo?** Start with
> [../Streaming-App/SETUP.md](../Streaming-App/SETUP.md) — it covers
> both repos end-to-end.

---

## What this app does

- **Swipe feed** of live streams (TikTok-style).
- **Stream player** — WebRTC via LiveKit. Sub-second latency. Viewers see
  composited effects (confetti, hearts, fireworks) that the broadcaster
  burned into the published video.
- **Mute badge** — when the streamer mutes via gesture, a 🔇 badge appears
  and the viewer's audio element is silenced immediately via Socket.IO.
- **Profile page** — avatar, display name, content library grid.
  - Tap your avatar to upload a new profile picture.
  - Tap the ⚙️ gear button to change your display name or password.
- **Chat panel** — live comment overlay over the stream.
- **Heart button** — tap to send a floating heart animation.

---

## Quick start

```bash
cd FE-Streaming-app
npm install
npx expo start
```

From the terminal menu:
- `w` → web at `http://localhost:8081` (works immediately, no native build)
- `a` / `i` → native app on a device that has the dev client installed
- Scan QR code with a previously-built dev client

---

## Environment variables

Copy `.env.example` → `.env` and fill in:

```env
API_BASE=http://192.168.1.42:5001    # backend REST URL (use LAN IP for phones)
SOCKET_URL=http://192.168.1.42:5001  # defaults to API_BASE if omitted
```

For **web dev** on the same machine as the backend, `http://localhost:5001`
works. For **phone** dev clients, use the host laptop's LAN IP — phones
on Wi-Fi can't reach `localhost` on your laptop.

---

## Building the custom dev client (mobile, once per platform)

Expo Go cannot load LiveKit's native WebRTC code. You need to build and
install a dev client once; after that the daily workflow is just
`npx expo start` + scan QR.

```bash
npm install -g eas-cli
eas login
eas build --profile development --platform android   # or --platform ios
```

Install the resulting APK (Android) or IPA (iOS) on the device. Done —
no rebuild needed until native dependencies change.

For iOS without TestFlight, use:
```bash
eas build --profile development-simulator --platform ios
```

---

## Features reference

### Streams tab
- Swipe vertically through all active live streams.
- Each stream card shows the streamer's avatar and display name fetched
  from `/api/v1/users/<id>`.

### Profile page
- View any user's public profile at `/profile/<id>`.
- **Own profile** shows extra controls:
  - Tap avatar → pick image → uploaded via `PATCH /api/v1/auth/me`
    (`avatar_media_id`). Works on web (blob: URIs are resolved to real
    `File` objects before upload) and on native.
  - ⚙️ gear icon → settings modal:
    - **Change display name** — updates `display_name` via the same PATCH.
    - **Change password** — requires current password + new password
      (minimum 8 characters).

### Content library
- Grid of media items per user.
- Own library supports upload, visibility filter, metadata edit, delete.

---

## File layout

```
app/
  login.tsx                     login / register screen
  (tabs)/
    _layout.tsx                 tab bar
    index.tsx                   redirect to /streams
    streams.tsx                 swipe feed
    profile/
      index.tsx                 own profile
      [id].tsx                  any user's profile
    settings.tsx                API_BASE / account settings
  upload.tsx                    media upload
  library/[id].tsx              single-item viewer

components/
  stream-player.tsx             web variant (livekit-client + <video>)
  stream-player.native.tsx      iOS/Android (@livekit/react-native)
  comment-panel.tsx             overlay chat
  floating-hearts.tsx           heart animation

features/
  social/                       chat + heart + follow
  content-library/
    screens/
      library-grid.tsx          profile header (avatar, settings gear,
                                upload button) + media grid + settings modal
    components/                 media tile, filter tabs, edit modal
    hooks/                      useMediaList, useDeleteMedia

lib/
  api/
    users.ts                    fetchMe / fetchUser / updateMe
                                (display_name, avatar_media_id, password change)
    upload.ts                   uploadWithProgress — fetches blob: URIs on web
                                into real File objects before XHR
    realtime.tsx                Socket.IO context
  auth/
    auth-provider.tsx           API key in secure storage
  streams.ts                    stream REST client
  config.ts                     reads API_BASE from app.config extras
  theme/                        design tokens
```

---

## Architecture notes

- **Why no Expo Go:** LiveKit React Native SDK requires native WebRTC
  modules that Expo Go doesn't include. A one-time EAS dev-client build
  is the trade-off. Web has WebRTC built in — no build step needed there.
- **Why blob: URI conversion:** `expo-image-picker` returns `blob:` URIs
  on web. Browsers don't send these correctly in `FormData` unless fetched
  and materialized as real `File` objects first — `upload.ts` does this.
- **Mute flow:** streamer's gesture → `LocalAudioTrack.mute()` in the
  broadcaster → Socket.IO `stream_state_update` → viewer's `useEffect`
  mutes the `<audio>` DOM element directly.
