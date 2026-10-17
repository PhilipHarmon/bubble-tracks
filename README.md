# Bubble Tracks 🫧

Music videos with pop-up trivia — a VH1 "Pop-Up Video"-style site on the MERN
stack. Videos stream through YouTube's official embed player (no hosting, no
copyright headaches); trivia bubbles ride a timed "pop track" synced to playback.

## Features

- **Watch page**: YouTube player + trivia bubbles timed to the video. Tap a
  bubble to pop it; popped facts collect in your scorecard at the end.
- **Queue**: line up videos, reorder, auto-advance when each ends.
- **Shuffle play** + **Pop of the Day** (deterministic daily pick).
- **Library**: search + category filters (80s, 70s, Kids…).
- **Admin panel** (`/admin`, gated by `ADMIN_KEY`): add videos, write and time
  every bubble, edit or delete. Paste a YouTube ID or full URL.

## Structure

- `api/` — Express + Mongoose. Seeds MongoDB from `api/data/seed-videos.json`
  on first boot (insert-only; never overwrites).
- `client/` — Vite + React, YouTube IFrame Player API.

## Deploy (Render)

1. Create a **new** GitHub repo (e.g. `bubble-tracks`) and push this folder.
2. Render → **New → Blueprint**, apply `render.yaml`.
3. On `bubbletracks-api`, set `MONGO_URI`, `ADMIN_KEY` (pick a strong random
   string), and `CLIENT_URL` once the client is live.
4. If the API URL differs from `https://bubbletracks-api.onrender.com`, update
   `VITE_API_URL` on the static site and redeploy.

## Content workflow

Each week: pick songs, research trivia, add them via `/admin` (video URL + one
bubble per fact with its %-through-the-video timing). The seed file holds the
launch catalog — edit it before first deploy if you want different starters.

## Local dev

```bash
cd api && npm install
MONGO_URI="mongodb+srv://..." ADMIN_KEY="dev-key" node server.js   # :5000

cd client && npm install && npm run dev                             # :5173
```
