# Voyage

Plan trips with friends, take on real-world dares along the way, and keep the photos and receipts in one place.

Voyage is a full-stack app: **Express + TypeScript + Mongoose** (REST and SSE) on the back end, **Vite + React 18** on the front end.

## What it does

- **Trips.** A workspace per trip: overview and readiness checklist, day-by-day itinerary with drag and drop, map, weather, flights, hotels, budget, shared expenses, playlist, trip log, and collaborators who see changes live.
- **AI assistant.** A chat inside each trip that can add items, rebuild a day and attach photos. Confirmation emails for flights and hotels are parsed into structured bookings. Playlist suggestions come from a vibe.
- **Sidequests.** Community dares tied to real places, scored like a deck of cards: the suit is the category, the rank is the difficulty, and both set the XP. Claim one, submit a photo as proof, earn XP and climb eight ranks. There is a leaderboard, a profile with trophies, and an image-led quest board.
- **Sharing.** Public trips appear in Discover. Any trip can be shared by link (read-only itinerary, printable) and can accept guest photo uploads.
- **Billing (optional).** Stripe subscriptions raise daily AI limits and the trip cap.

## Layout

```
backend/    Express + TypeScript + Mongoose API (port 4000)
frontend/   Vite + React SPA (port 5173)
```

Two independent npm projects; there is no root `package.json`. Run commands from inside each folder.

## Run it locally

You need Node 18+ and a MongoDB database (local or Atlas).

```bash
# terminal 1
cd backend
cp .env.example .env      # then fill it in
npm install
npm run dev               # http://localhost:4000

# terminal 2
cd frontend
cp .env.example .env      # optional
npm install
npm run dev               # http://localhost:5173
```

`npm run dev` in `backend/` frees port 4000 first by killing whatever is bound to it.

### Environment

Back end (`backend/.env`, see `.env.example`): `MONGO_URI` and `JWT_SECRET` are required. Also used: `JWT_EXPIRES_IN`, `CLIENT_ORIGIN` (comma-separated list allowed), `ANTHROPIC_API_KEY`, `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET`, `PEXELS_API_KEY` (stock photos), `ADMIN_EMAILS` (skip quotas), and optionally `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` and `STRIPE_PRICE_*`. Without Stripe keys the billing endpoints return 503 and everything else works.

Front end (`frontend/.env`): `VITE_API_URL` (default `http://localhost:4000`) and `VITE_GOOGLE_MAPS_API_KEY`.

## Checks

There is no test suite or linter. The automated check is the type checker, in both packages:

```bash
cd backend  && npm run typecheck
cd frontend && npm run typecheck && npm run build
```

Auth routes are rate limited to 20 requests per 15 minutes per IP, and every full page load calls `/api/auth/me`. Reloading a lot while developing can lock you out for a few minutes.

## Front end notes

- **Design system.** Neutral surfaces, one blue accent, Switzer type with a bold-italic emphasis word, pill buttons, one radius scale, light and dark themes. Tokens live at the top of `frontend/src/styles.css`.
- **Opening screen.** `SplashHero` plays a white intro (a paper plane crosses the screen), then wipes to a looping video montage. Replace `frontend/public/video/montage.mp4` and `montage-poster.jpg` to change the footage, and edit `CUTS` in `SplashHero.tsx` so the sidequest card matches each cut. The placeholder footage is free Pexels stock, credited in `frontend/public/video/CREDITS.md`.
- **Photos.** Quest and trip covers use the owner's own photos first, then a cached stock photo from `/api/photos/search`, then generated art.
- **Code splitting.** Every page except Home is lazy-loaded. The 3D globe on the landing page is its own chunk.

## Architecture in brief

- `Trip` is a large aggregate: items, groups, playlist, log, hotels, flights, expenses and collaborators are embedded documents, and a post-save hook fans an SSE event out to connected clients. SSE state is in memory, so it supports a single back-end instance.
- Auth is a JWT bearer token. Trip access is a query filter (`owner` or `collaborators`), not middleware.
- Every AI call goes through `lib/aiQuota.ts` first. Plans (`free`, `explorer`, `pro`, `globetrotter`) set the daily limits and trip caps.
- User photos upload from the browser straight to Cloudinary with an unsigned preset; only the URL is stored.

See `CLAUDE.md` for more detail.
