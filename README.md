# FE-Streaming-app — viewer app for the VSR livestream

React Native / Expo app for **watching live streams, chatting, and
managing your profile**. The streamer side (camera capture, gesture
detection, encoding) runs as a Python process on a laptop and is part
of the backend repo ([../Streaming-App/](../Streaming-App/)).

Three platform targets from one codebase:
- **iOS** — custom Expo dev client (TestFlight or ad-hoc)
- **Android** — custom Expo dev client (APK sideload)
- **Web** — any modern browser, no install needed

> **Custom dev client required** for mobile. [LiveKit's React Native
> SDK](https://docs.livekit.io/realtime/quickstarts/react-native/)
> needs native WebRTC modules that Expo Go does not ship. Once you
> install the dev client *once*, the daily QR-scan workflow is
> identical to Expo Go. Web has WebRTC built in, no extra build step.

> **Setting up for the first time?** The end-to-end demo (backend +
> broadcaster + FE) is documented in
> [../Streaming-App/SETUP.md](../Streaming-App/SETUP.md) — start there.
> This README is the FE-specific reference.

---

## Quick start (development)

```bash
npm install
npx expo start
```

Pick a target from the terminal:
- `w` → **web** at `http://localhost:8081` (works immediately, no native build)
- `a` / `i` → opens whatever dev client / simulator is already installed
- Scan QR with a previously-installed dev client (see below)

---

## Building the dev client (once per platform)

You need an [Expo account](https://expo.dev/signup) and `eas-cli`:

```bash
npm install -g eas-cli
eas login
```

### Android

```bash
eas build --profile development --platform android
```

You'll get an `.apk` install link. On the phone:
1. Settings → enable "Install from unknown sources" for your browser.
2. Open the link, install the APK.
3. Done — the dev client app is now on the home screen.

After install, you never touch EAS again. Just run `npx expo start`
on your laptop and scan the QR with the dev client.

### iOS

```bash
eas build --profile development --platform ios
```

Requires Apple Developer membership ($99/yr). For local-only testing
without TestFlight, use the simulator build:

```bash
eas build --profile development-simulator --platform ios
```

(Download the `.app`, drag it into the iOS Simulator.)

### Preview build (for non-developer testers)

```bash
eas build --profile preview --platform android
```

Same as `development` but does NOT include the dev-client packager
loop — installs as a standalone APK. Points at whatever `API_BASE` is
baked in at build time.

---

## Web viewers (zero install)

```bash
npx expo start --web
```

Serves the app at `http://<your-laptop-LAN-IP>:8081`. Any modern
browser. Easiest demo path for sharing — no install required.

---

## Environment

`app.config.ts` reads these env vars (or `.env` via dotenv) at build
time. Copy `.env.example` → `.env` and fill in:

```env
API_BASE=http://192.168.1.42:5001       # Backend REST URL (LAN IP for phone testing)
SOCKET_URL=http://192.168.1.42:5001     # defaults to API_BASE
```

For **web** in dev, the browser shares the host with the backend so
`http://localhost:5001` works.

For **phone** dev clients, the backend must be reachable from the
phone — use the host laptop's LAN IP (not `localhost`), and ensure
both devices are on the same Wi-Fi.

---

## Features

### Streams
- TikTok-style swipe feed of live streams.
- Each stream player shows the streamer's **profile picture** and
  **display name** fetched live from `/api/v1/users/<id>`.
- **Mute gesture**: when the streamer mutes via open-palm gesture, a
  🔇 badge appears and the viewer's audio element is muted immediately
  via Socket.IO `stream_state_update`.

### Profile & account
- Profile page shows avatar, display name, and `@username`.
- **Set profile picture**: tap the avatar on your own profile to pick
  an image; it is uploaded as a public media item and linked to your
  account via `PATCH /api/v1/auth/me`.
- **Settings modal** (gear icon on own profile):
  - Change display name.
  - Change password (requires current password verification).

### Content library
- Grid of uploaded media items per user.
- Visibility filters (public / unlisted / private) for own library.
- Upload, edit metadata, delete.

---

## File layout

```
app/                          expo-router routes
  login.tsx                   login / register screen
  (tabs)/
    _layout.tsx               tab bar config
    index.tsx                 redirect to /streams
    streams.tsx               swipe feed of live streams
    profile/
      index.tsx               own profile (redirects to /profile/me)
      [id].tsx                any user's profile
    settings.tsx              API_BASE / account config
  upload.tsx                  media upload screen
  library/[id].tsx            single-item media viewer

components/
  stream-player.tsx           web variant (livekit-client + <video>)
  stream-player.native.tsx    iOS/Android (@livekit/react-native)
  comment-panel.tsx           overlay chat
  floating-hearts.tsx         heart-button animation

features/
  social/                     chat + heart + follow hooks/components
  content-library/
    screens/
      library-grid.tsx        profile header (avatar, display name,
                              settings gear, upload button) + media grid
    components/               media tile, filter tabs, edit modal
    hooks/                    useMediaList, useDeleteMedia

lib/
  api/
    users.ts                  fetchMe / fetchUser / updateMe
                              (display_name, avatar_media_id, password change)
    upload.ts                 uploadWithProgress — handles blob: URIs on web
                              by fetching them into a real File before XHR
    realtime.tsx              Socket.IO context provider
  auth/
    auth-provider.tsx         API key in secure storage
  streams.ts                  stream REST client
  config.ts                   reads API_BASE from app.config extras
  theme/                      design tokens (getToken)
```

---

## Architecture references

- [../Streaming-App/docs/decisions/001-livekit-over-mux.md](../Streaming-App/docs/decisions/001-livekit-over-mux.md)
- [../Streaming-App/docs/decisions/002-broadcaster-burn-in-compositing.md](../Streaming-App/docs/decisions/002-broadcaster-burn-in-compositing.md)
- [../Streaming-App/docs/decisions/003-python-broadcaster-not-phone.md](../Streaming-App/docs/decisions/003-python-broadcaster-not-phone.md)
