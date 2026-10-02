# Private Stream

A small Next.js app for streaming a phone's camera and microphone to one viewer. Next.js runs on Vercel; [LiveKit Cloud](https://cloud.livekit.io/) carries the live media between devices.

## Setup

1. Create a LiveKit Cloud project and copy its WebSocket URL, API key, and API secret.
2. Copy `.env.example` to `.env.local` and fill in every value. Set `SESSION_SECRET` to a long random value, for example `openssl rand -base64 48`. Use a strong, unique `APP_PASSWORD`.
3. Run `npm install` and `npm run dev`.
4. Open `http://localhost:3000` on your computer. For phone testing, use a deployed HTTPS URL; browsers require a secure context for camera and microphone access.

## Vercel deployment

Import this repository into Vercel as a Next.js project. Add these environment variables to the project for the environments you deploy:

| Variable | Purpose |
| --- | --- |
| `APP_USERNAME` | Shared login username |
| `APP_PASSWORD` | Shared login password |
| `SESSION_SECRET` | Signs the 24-hour login cookie |
| `LIVEKIT_URL` | LiveKit Cloud WebSocket URL (`wss://...`) |
| `LIVEKIT_API_KEY` | Server-side LiveKit API key |
| `LIVEKIT_API_SECRET` | Server-side LiveKit API secret |

No variable needs the `NEXT_PUBLIC_` prefix. The server issues a short-lived LiveKit join token only after verifying the login cookie.

## Use

Sign in on the phone and open **Stream**. Tap **Start stream**, allow camera and microphone access, and keep the page visible. Sign in with the same credentials on a second device and open **Watch**. The viewer can arrive before or after the phone starts. If the browser blocks audio playback, tap **Enable audio**.

The app allows one broadcaster and one viewer at a time. Opening the same role on another device replaces its earlier connection. Phone browsers may stop camera capture when the page is backgrounded or the screen locks; the stream page requests a screen wake lock when supported.

## Checks

Run `npm run lint`, `npm run typecheck`, and `npm run build`. A real end-to-end stream check needs valid LiveKit credentials and two devices or browser profiles.

