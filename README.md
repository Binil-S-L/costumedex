# CostumeDex

A retro handheld field-guide scanner for Halloween costumes. Point it at a costume, press A, get a deadpan nature-documentary entry.

## Stack

- **Frontend**: Vite + React, plain CSS, no heavy deps
- **Backend**: Vercel serverless function (`/api/scan`)
- **AI**: Anthropic Claude (vision) via `@anthropic-ai/sdk`

## Setup

```bash
cd costumedex
npm install
```

## Environment variables

| Variable | Required | Default | Notes |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | ✅ | — | Your Anthropic API key |
| `ANTHROPIC_MODEL` | ❌ | `claude-sonnet-4-6` | Override model if needed |

## Local development

Camera requires HTTPS **or** localhost. Two options:

### Option A — Vercel CLI (recommended, runs API too)

```bash
npm install -g vercel
vercel env add ANTHROPIC_API_KEY  # paste your key
vercel dev
# Opens at http://localhost:3000 — camera works, API works
```

### Option B — ngrok (test on real iPhone over HTTPS)

```bash
npm run dev &               # Start Vite at :5173
ngrok http 5173             # Get https://xyz.ngrok.io
# Open the ngrok URL on your iPhone
# For API calls you also need vercel dev running at :3000
```

### Option C — Vite HTTPS plugin (no ngrok needed locally)

```bash
npm install -D @vitejs/plugin-basic-ssl
```
Add to `vite.config.js`:
```js
import basicSsl from '@vitejs/plugin-basic-ssl';
plugins: [react(), basicSsl()],
```
Then open `https://localhost:5173` — accept the self-signed cert warning.

## Controls

| Button | Action |
|---|---|
| **A** | Scan (camera) · Save card (result) |
| **B** | Back |
| **D-pad ↑↓** | Scroll result entry |
| **DEX** (Start) | Toggle Dex history |
| **♪** (Select) | Toggle voice read-aloud |

Keyboard equivalents for desktop testing: `A`, `B`, `Enter`, `↑↓`.

## Deploy to Vercel (one command)

```bash
vercel --prod
```

Then add `ANTHROPIC_API_KEY` in the Vercel dashboard → Project → Settings → Environment Variables.

## Visual tests

```bash
npx playwright install chromium
npm run test:visual
# Screenshots saved to tests/screenshots/
```

## PWA — Add to Home Screen

On iPhone Safari: Share → Add to Home Screen. Launches fullscreen, no browser chrome.

## What's not polished yet

- Icons: `icon.svg` is used; for best iOS home screen icon generate a 192×512 PNG and reference it in `manifest.json` and `<link rel="apple-touch-icon">`
- Voice: uses browser default `speechSynthesis` voice (no custom TTS)
- Save card: canvas rendering uses system monospace font (not Press Start 2P) — html-to-image or dom-to-image library would match the UI exactly
- File-fallback path: `_pendingFile` ref pattern works but could be a proper callback
- Rate limiting: in-memory per serverless instance — resets on cold starts; add Redis/KV for production
