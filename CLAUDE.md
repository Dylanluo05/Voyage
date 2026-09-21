# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Work modes

The user will name one of these modes. Follow it until told to switch.

- **build mode** — Plan and build everything the user asks, end to end. Take the feature from design through implementation without stopping for hand-offs; make reasonable decisions and keep going.
- **test mode** — Debug, test, and validate code. Focus on finding and fixing bugs, checking behavior, running `npm run typecheck` in both packages, and verifying correctness. Don't build new features unless a fix requires it.
- **learn mode** — The user implements the feature; you guide them through the process without giving the answer directly. Teach the concepts, point to the right files and approaches, review what they write, and let them do the coding. Never paste code for them to copy.

## Repo shape

Two independent npm projects, no root `package.json`. Run commands from inside `backend/` or `frontend/`.

- `backend/` — Express + TypeScript + Mongoose REST/SSE API (port 4000)
- `frontend/` — Vite + React 18 + react-router v6 SPA (port 5173)

The `README.md` is stale — it predates AI chat, billing, Spotify, photo logs, and the sidequest/gamification system. Trust the code over the README.

## Commands

### backend/
- `npm run dev` — ts-node-dev with reload. **Kills whatever is bound to port 4000 first** (`lsof -ti:4000 | xargs kill -9`), so it will terminate an unrelated process on that port.
- `npm run build` — `tsc` to `dist/`
- `npm start` — run compiled `dist/index.js`
- `npm run typecheck` — `tsc --noEmit`
- One-off scripts (need a populated DB and a user matching the hardcoded email): `npx ts-node src/scripts/reseedSidequests.ts`, `npx ts-node src/scripts/seedTestCompletions.ts`

### frontend/
- `npm run dev` — Vite dev server on 5173
- `npm run build` — `tsc -b && vite build`
- `npm run preview` — serve the production build
- `npm run typecheck` — `tsc --noEmit`

### Testing / linting
There is **no test suite and no ESLint config**. `npm run typecheck` in both packages is the only automated check — run it before considering a change done. TypeScript `strict` is on in both.

## Environment

Backend `.env` (see `backend/.env.example`): `MONGO_URI`, `JWT_SECRET` (required), `JWT_EXPIRES_IN`, `CLIENT_ORIGIN` (comma-separated list allowed), `ANTHROPIC_API_KEY`, `SPOTIFY_CLIENT_ID`/`SPOTIFY_CLIENT_SECRET`, plus optional `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET`/`STRIPE_PRICE_*`, `PEXELS_API_KEY`, `ADMIN_EMAILS`. The Anthropic SDK is constructed as `new Anthropic()` and reads `ANTHROPIC_API_KEY` from the environment implicitly.

Frontend `.env` (see `frontend/.env.example`): `VITE_API_URL` (default `http://localhost:4000`), `VITE_GOOGLE_MAPS_API_KEY`. Google OAuth client ID is currently wired in code, not env.

## Architecture

### Data model — three Mongoose models hold almost everything
- **`Trip`** is a large aggregate document. Itinerary `items`, `groups`, `playlist`, `log` (photos + ratings), `hotels`, `flights`, `expenses`, `dayAnchors`, `collaborators` are all embedded subdocuments. Most mutations load the whole trip, mutate arrays in memory, and call `trip.save()`. A `tripSchema.post('save')` hook calls `notifyTripUpdate()` to fan out an SSE event — so any save propagates to connected clients.
- **`User`** carries `aiUsage` (plan + daily AI request counter + Stripe IDs), gamification state (`xp`, `badges`, `sidequestHistory`), and profile fields.
- **`PublicSidequest`** — the card-game-themed challenge system: each has a `cardSuit`/`cardRank` that determines `xpReward`, plus `claims`, `completions` (with photo), `comments`, and an optional `event` with `enrollments`.

### Auth
JWT bearer tokens. `signToken({ sub, email })` in `middleware/auth.ts`; `requireAuth` verifies and sets `req.user`. Frontend stores the token in `localStorage` under `trip_planner_token` and `api/client.ts`'s `apiFetch` attaches it. Registration/login also supports Google (`google-auth-library` verifies a Google access token server-side).

Trip access control is a query filter, not middleware: `{ _id, $or: [{ owner }, { collaborators }] }`. Public read-only access is via `shareToken` (`/share/:token` → `/api/public`) or the `isPublic` flag (Discover feed).

### Real-time updates (SSE) — in-memory, single-instance only
`lib/tripEvents.ts` and `lib/sseTokens.ts` are process-local `Map`s. Flow: `EventSource` can't send auth headers, so the client first `POST`s `/api/trips/:id/sse-token` (one-time token, 30s TTL) then opens `GET /api/trips/:id/events?token=...`. **This does not survive horizontal scaling** — multiple backend instances would each only notify their own connected clients.

### AI features (Anthropic SDK)
- `controllers/chatController.ts` — streaming SSE chat agent embedded in a trip. Defines tools (`add_itinerary_items`, `replace_day`, `add_photos`); executes tool calls server-side against the trip, streams `text` / `tool_result` / `done` events. Uses model `claude-sonnet-4-6`.
- `lib/vibeInterpreter.ts` — playlist song suggestions from vibe keywords (model `claude-haiku-4-5-20251001`).
- `controllers/importController.ts` — parse pasted hotel/flight confirmation text into structured JSON (haiku).
- **Every AI call must go through `lib/aiQuota.ts` `checkAndIncrementQuota()` first.** `TIER_CONFIG` defines per-plan daily AI limits and trip caps (`free`/`explorer`/`pro`/`globetrotter`). Emails in `ADMIN_EMAILS` bypass all quotas. Trip creation checks `checkTripQuota()`.

### Billing (Stripe, optional)
`routes/billing.ts` mounts `POST /api/billing/webhook` with `express.raw()` **before** the global `express.json()` — the raw body is required for signature verification. Webhook handlers (`checkout.session.completed`, `customer.subscription.updated`/`deleted`) write `user.aiUsage.plan`. If `STRIPE_SECRET_KEY` is unset, billing endpoints return 503 and the app otherwise works.

### Media
- **Pexels** (server-side, `PEXELS_API_KEY`) auto-fetches stock photos for itinerary items in chat and `/api/photos`.
- **Cloudinary** — user-uploaded photos (trip log, sidequest completions) upload *directly from the browser* using an unsigned preset hardcoded in `frontend/src/utils/image.ts`; only the resulting URL is stored in Mongo. Images are canvas-compressed client-side before upload.
- **Spotify** — `lib/spotify.ts` uses client-credentials (cached token) for track search; a separate OAuth auth-code flow (`controllers/spotifyController.ts`, `/api/spotify/callback`) lets a user export a trip playlist to their own account.

### Frontend specifics
- `AuthContext` provides `user` + auth actions; `ProtectedRoute` guards routes.
- `api/*.ts` wrap `apiFetch`; errors surface as `ApiError` with `.status`.
- Itinerary drag-and-drop uses `@dnd-kit`. Maps use `@react-google-maps/api`. `exifr` reads EXIF geotags from uploaded photos.
- Theme (`light`/`dark`) is set on `<html data-theme>` by an inline script in `index.html` reading `localStorage['voyage-theme']`; `hooks/useTheme.ts` toggles it.
- Deployed on Vercel (`vercel.json`): SPA rewrite-all-to-index plus a `Cross-Origin-Opener-Policy: same-origin-allow-popups` header needed for the Google sign-in popup.

### Error handling convention
Throw `HttpError(status, message)` (from `middleware/error.ts`) or let `ZodError` propagate; the central `errorHandler` maps them to JSON responses (`ZodError` → 400 with `details`, `HttpError` → its status, else 500). Request bodies are validated with `zod`.
