# Launch checklist

Things only the owner can do before opening Voyage to the public and advertising it.
Created 2026-10-22 after the pre-release audit; the code-side fixes from that audit
(blockers, high-priority list, legal pages, SEO, analytics, share-preview function)
are done and merged to `main` (2026-10-22, plus a `www` canonical-URL fix on 2026-11-06).
Tick items off as you go. Status notes below were last updated 2026-11-06.

## 1. Before deploying the audit changes

- [x] Commit and review the diff (done: merged to `main`)
- [x] `npm run typecheck` in `backend/` and `frontend/` (passed before merge)
- [ ] Take an Atlas snapshot/backup before deploying

## 2. Backend environment (Render)

- [x] `NODE_ENV=production`
- [~] `CLIENT_ORIGIN`: the site is served from **`https://www.voyagetravel.app`** (the apex redirects there). Verified 2026-11-06 that the API accepts both origins. Still to do: make sure the **first** value in the list is the `www` one, since email links use the first entry
- [ ] `JWT_SECRET` is 32+ random characters (rotating signs everyone out; fine pre-launch)
- [ ] **`REQUIRE_EMAIL_OTP=true`: DELIBERATELY DEFERRED (decided 2026-11-06).** We're in the outreach phase and don't want new users to hit a 2FA step when signing up. Revisit before paid ads or wider launch. While it's off:
  - Email sign-ups are marked `emailVerified: false`. If that address later signs in with Google, Google's proof of ownership wins and the unverified account's password is removed.
  - **People invited to a trip by email who then sign up with email/password are NOT auto-added to the trip** (pending invites only attach once the address is proven). Google sign-in does attach them. Possible fix that keeps sign-up frictionless: a non-blocking "verify your email" link sent after sign-up that marks the account verified and attaches pending invites.
  - When turning it on: test a real sign-up from a non-owner email first (the Resend domain is verified; OTP send failures are only logged, and the app still says "code sent").
- [x] `ADMIN_EMAILS` set, lowercase, every address already a registered account
- [~] `ANTHROPIC_API_KEY` set (done). **Monthly spend limit in the Anthropic console: still to do.** Console -> Settings -> Limits (org or workspace spend limit; menu names change, look for "spend limit"/"usage limits"). Suggested: set a hard monthly cap you'd be comfortable losing, and alert thresholds at 50% and 80%. Use a dedicated workspace/key for production if available. Rough sizing: a chat request costs about $0.01-0.03 typically (up to ~$0.15-0.20 worst case); a sidequest photo check costs a fraction of a cent. When the cap is hit, AI features return errors until the next period, so also watch the admin dashboard's AI cost chart.
- [x] `SENTRY_DSN` set (boot log says whether it's enabled)
- [ ] `PEXELS_API_KEY`, `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `RESEND_API_KEY` set
- [ ] Hardcoded model IDs (`claude-sonnet-4-6`, `claude-haiku-4-5-20251001`) still resolve with your key
- [ ] Atlas network access + backup schedule configured
- [ ] **Rotate the Mongo password** (the old connection string was logged at every boot) and delete old log lines containing it

## 3. Frontend environment (Vercel)

- [ ] `VITE_API_URL` -> Render backend
- [x] `API_URL` -> same value (set; backend is `https://api.voyagetravel.app`, verified healthy 2026-11-06)
- [ ] `VITE_GOOGLE_CLIENT_ID`, `VITE_GOOGLE_MAPS_API_KEY`, `VITE_SENTRY_DSN` set
- [ ] `VITE_PLAUSIBLE_DOMAIN=voyagetravel.app` (once the Plausible site exists)

## 4. Stripe

- [ ] Live keys: `STRIPE_SECRET_KEY` and the three `STRIPE_PRICE_*` IDs
- [ ] Live webhook at `https://<backend>/api/billing/webhook` for `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`; set `STRIPE_WEBHOOK_SECRET`
- [ ] **Test-mode end-to-end first** (the webhook never worked before the audit fix): buy a plan -> account upgrades; change plan in portal; cancel -> drops to free
- [ ] Customer portal enabled (cancellation allowed); customer receipts on
- [ ] Decide on sales tax / VAT (Stripe Tax or confirm below thresholds)

## 5. Third-party limits that break at scale

- [ ] **Google OAuth:** consent screen from "Testing" to "In production" (Testing caps at 100 users); add Terms/Privacy URLs; verify the app if asked
- [ ] **Spotify:** dev mode allows ~25 allow-listed users; apply for extended quota or hide playlist export; redirect URI `https://<backend>/api/spotify/callback`
- [ ] **Pexels:** ~200 req/hour free tier; add visible "Photos provided by Pexels" attribution or request higher limits
- [ ] **Google Maps key:** restricted to the production domain; budget alert set
- [ ] **Cloudinary:** unsigned preset `hvun0z9j` allows only images, has a size limit, fixed folder, ideally moderation; usage alert set

## 6. Legal and business

- [ ] Lawyer review of Terms + Privacy (safety/assumption-of-risk, minors, liability cap, dispute clause)
- [ ] Register a DMCA designated agent with the US Copyright Office (~$6); the Terms promise a takedown process
- [ ] Consider an LLC before charging subscriptions (policies currently name an individual)
- [ ] Move contact email off Gmail (e.g. `support@voyagetravel.app`); update `CONTACT_EMAIL` in `TermsPage.tsx` and `PrivacyPage.tsx`
- [ ] Be able to keep the policy promises: privacy requests answered within 45 days, Cloudinary photos removed on request, notice before price changes
- [ ] Confirm the Anthropic "no training on API content" claim against your account terms
- [ ] Decide who monitors the contact inbox and the admin reports queue, and response times

## 7. Analytics and SEO setup

- [ ] Create the Plausible site; add goals `Signup`, `Google Auth`, `Trip Created`, `Checkout Started`
- [ ] Google Search Console: verify `voyagetravel.app`, submit `sitemap.xml`; same for Bing Webmaster Tools
- [ ] Replace `frontend/public/og-image.jpg` (currently a stock-video frame) with a branded 1200x630 image; replace the placeholder `favicon.svg`
- [ ] After deploy, test a real `/share/...` link in the Facebook Sharing Debugger, Slack and iMessage (crawler routing in `vercel.json` can only be tested live)
- [ ] Replace the placeholder splash video if you want a branded first impression

## 8. Post-deploy verification (~30 min)

- [ ] Sign up via email + OTP from a non-owner address; also via Google
- [ ] Create a trip, add an item with a photo, add a log photo; photo URLs should be `res.cloudinary.com` links, not huge strings
- [ ] Open a share link in a private window: no expenses, bookings, or emails visible
- [ ] Complete a sidequest; a second account must not see the first user's private photo
- [ ] `GET /api/trips/xyz/events?token=1` returns an error and the server stays up
- [ ] Send one AI chat message; quota drops by exactly one
- [ ] Delete a throwaway account; its Stripe subscription is cancelled
- [ ] Sentry shows no new errors from the above

## 9. Before spending on ads

- [ ] Soft launch to a small group for about a week; watch Anthropic spend, Sentry, Mongo document sizes
- [ ] Uptime monitoring on `/api/health`; check Render logs for crashes and rate-limit hits

## Known open items (flagged in the audit, not fixed)

- 7-day JWTs aren't revoked on password reset (needs a token version or shorter expiry)
- Registration reveals whether an email is already taken (409)
- Guest photo upload is gated only by the public share token (consider a separate upload token)
- No moderation of uploaded photos; profiles/avatars/trip-log photos can't be reported; no user blocking
- Existing trips still hold base64 photos in Mongo (needs a one-off migration to Cloudinary)
- Account deletion doesn't remove Cloudinary files or sidequests the user created
- `react-router` (needs v7) and `qs` (pinned by Express) advisories remain
- No automated tests
- SSE live updates, rate limits and sidequest cooldowns are in-memory (single backend instance only)
- Free users' sidequest attempts now share the 5/day AI quota with chat (product decision)
