# Voyage — Progress Log

A running, date-stamped record of what's been built, why, and anything worth
remembering later. Newest entries first. See `CLAUDE.md` for the technical
architecture overview — this file is the narrative of how it got that way.

---

## 2026-11-05

### Interest chips, and a fix for the empty quest map in dev
Quests now carry 1 to 4 interest chips from a fixed list of 15 (outdoors, food,
dating, friends, parties, fitness, music, arts, fashion, travel, learning,
nostalgia, wellness, giving, campus), defined in `backend/src/lib/interests.ts`
and mirrored in `questMeta.ts`. The board has a multi-select chip row with live
counts; a quest matches if it has any selected interest, with a "Match all"
toggle for two or more, and the filter combines with suit, difficulty, the map
and near-me. The selection lives in the URL (`?interests=...&match=all`) so a
filtered view is shareable. Tiles show their chips (clicking one toggles that
filter), the quest sheet lists them, and the create modal has a picker that
falls back to inferring chips from the text when left blank. New endpoint:
`PATCH /api/public-sidequests/:id/interests` for creators and admins (no UI yet).
Interests are inferred by keyword rules (`inferInterests`); the backfill script
`tagQuestInterests.ts` (dry run by default, `--write`, only touches untagged
quests unless `--retag`) has been run against production for all 332 quests, and
the new seed script tags what it inserts. The rules are approximate, so expect
some off tags. Separately, the quest map lost every pin under React StrictMode
(dev) because the clusterer library dropped its markers; `QuestMap` now owns its
markers and `@googlemaps/markerclusterer` directly (added as a dependency),
rebuilds them only when the pin set really changes, and tears them down
properly. Verified in a browser against real quest data in both dev and
production builds. **Known gaps:** no UI yet to edit a quest's interests after
creation, and cluster badges now use the library's default colors.

### Map pin popups and 200 college sidequests
Selecting a pin on the quest map now opens an info-window popup anchored to
the pin (quest, rank/XP, place, distance, Open quest and Directions) instead
of a card below the map. Added 200 official quests aimed at college students,
themed on current trends (in-person and double dating, daytime "darties" and
soft clubbing, run clubs, sober-curious socials, thrift and fit-check
culture, nostalgia and film cameras, Dubai chocolate, tier lists, RushTok,
study "lock-in"): 104 that work anywhere plus 96 pinned quests, 8 each near
UC Berkeley, UCLA, UCSD, UC Davis, UC Irvine, UC Santa Barbara, UC Santa
Cruz, UC Riverside, UC Merced, UW Seattle, NYU and Ohio State. Content lives
in `backend/src/scripts/data/` and is loaded by `seedCollegeTrendQuests.ts`
(dry run by default, `--write` to apply, idempotent, never deletes; it has
been run against the production database). Places are geocoded with
OpenStreetMap Nominatim and rejected if they land outside a per-campus radius,
which caught several bad lookups. House rules for the content: nothing
requires alcohol, nothing involves trespassing or risky stunts, and anything
involving other people assumes consent. **Known gaps:** the trend research
was thin for fall 2026 specifically, quest cover illustrations are picked by
keyword so a few may look slightly off, and the popup hasn't been checked
visually in a browser.

### Sidequest map, "near me", and place-specific quests
Quests can now be pinned to real places: a new `places` array (name, address,
lat/lng) on `PublicSidequest`, so a quest can be unpinned (works anywhere),
pinned to one spot ("Play Pickup Soccer Under Tokyo Tower"), or pinned to
several spots (the paper-map dare now lists seven cities instead of only
Tokyo). The board gets a Cards/Map toggle (clustered, suit-colored pins with a
quest card and Directions link) and a "Find quests near me" filter with a
radius picker (miles in en-US, km elsewhere) that sorts by distance and keeps
unpinned quests in a "Do these anywhere" group. The create-quest modal has a
Google Places search to pin places, `PATCH /api/public-sidequests/:id/places`
lets creators/admins edit pins, and the location search now matches place
names. `/sidequests` is now wrapped in `GoogleMapsProvider`. Distance and the
map filter run in the browser over the already-loaded quest list, matching how
the board works today; add a server-side geo query if the quest count grows
into the thousands. New `seedPlaceQuests.ts` (dry run by default, `--write` to
apply, idempotent, never deletes) geocodes with OpenStreetMap Nominatim, pins
11 existing seed quests and adds 19 official place-specific ones; it has been
run against the production database. **Known gaps:** only quests made by the
seed account were pinned (the other ~100 are location-free by design), user
quests can only be pinned through the create modal or the API, and the map UI
hasn't been checked visually in a browser.

### Sidequest cover photos and official quests
Quest creators can now upload a cover photo when creating a quest, and
creators and admins can change or remove it later from the quest sheet
(`PATCH /api/public-sidequests/:id/cover`). Quests made by the Voyage team
carry a new `official` flag and get an illustrated cover
(`QuestIllustration`) instead of suit art; only admins can choose a card rank
above the lowest when creating a quest. Quest covers no longer fall back to a
guessed Pexels stock photo, since a generic photo that doesn't match the
quest looked worse than none. The cover order is now the viewer's own proof
photo, the creator's cover, a public completion photo, then illustration or
suit art. The report queue preview for a quest now includes its cover.
**Deploy note:** run `backend/src/scripts/markOfficialSidequests.ts` once
after the backend deploys to flag the existing seeded quests as official
(non-destructive, only sets `official: true`); until then they show suit art.
The `coverImageUrl`/`official` type additions were already pushed earlier,
inside the payments ledger commit.

### Expense payments ledger (replaces per-share "settled")
Per-share Settle/Undo and the pair-level Settle up are gone. Balances are now
the netted shares between two people minus recorded payments, so a pair that
pays each other only the difference records just that amount instead of
leaving the other side's debt un-offset (the "I suddenly owe $35" bug). New
`payments` array on `Trip` (`POST /api/trips/:id/payments`, `DELETE
.../payments/:paymentId`; only the sender or receiver can record, and the
sender, receiver or recorder can delete). Balance rows get a **Record
payment** button prefilled with the full balance (editable for partial
payments), and a collapsible payment history lists who paid whom. Payment
names are resolved from member ids at render time rather than stored.
Legacy `settled` flags stay on splits but are ignored; run
`backend/src/scripts/migrateSettledToPayments.ts` (dry run by default,
`--write` to apply, idempotent) to convert them into one netted payment per
pair, which keeps every existing balance identical. **Deploy order:** migrate
first, then deploy, otherwise old settled shares show as unpaid. Already run
for the NYC Fall Break trip. **Known gaps:** no overpayment warning, payment
notes are supported by the API but not exposed in the UI, and the new UI
hasn't been checked visually in a browser. (Follow-up: the `$` amount input
styles were scoped to the add-expense form, so the payment form's field
rendered as a box inside a box; the rules now apply anywhere `.xf-prefixed`
is used.)

## 2026-10-26

### Expense "Settle up" for netted payments
Per-share Settle was all-or-nothing and ignored netting: when a pair paid each
other only the difference (e.g. $9), settling one side's shares recorded far
more as paid and left the other side's debt unoffset, so a balance went *up*.
Added a **Settle up** button on each balance row involving the current user,
backed by `POST /api/trips/:id/expenses/settle-up` (`{ withUserId }`), which
marks every unsettled share between the two people as settled in both
directions, after a confirm showing the net amount. Per-share Settle/Undo are
unchanged. **Known gap:** the app still doesn't store how much was actually
paid, so partial payments can't be recorded.

## 2026-10-22

### Pre-launch audit: security fixes, legal pages, SEO, analytics
Ran a full release-readiness audit and fixed what could be fixed in code.
Blockers: the Stripe webhook never verified (it was mounted after
`express.json()`), the SSE endpoint could crash the process on a bad trip id,
unverified email signups could be hijacked via Google sign-in or inherit
pending trip invites (now tracked with `User.emailVerified`), the public share
link and `/api/public-sidequests` leaked expenses, bookings, emails and
private photos (now allow-listed views), photos were stored as base64 inside
trip documents (now Cloudinary-only, with caps), and the Mongo URI was logged
at boot. Also: chat and sidequest AI cost caps, per-trip badge once, request
body error handling, `npm audit fix`. Added updated Terms/Privacy (safety and
assumption of risk, DMCA, auto-renewal, new processors), meta/Open Graph tags,
`robots.txt`/sitemap, per-route titles, security headers, opt-in Plausible
analytics, and a Vercel function (`frontend/api/share-meta.js`) that serves
link previews to crawlers. `LAUNCH_CHECKLIST.md` lists the owner-only steps
(env vars, live Stripe, Google OAuth publishing, Spotify quota, DMCA agent,
lawyer review) and the open items. **Known gaps:** existing trips still hold
base64 photos (needs a migration), account deletion leaves Cloudinary files,
7-day JWTs aren't revoked on password reset, guest uploads still depend on the
public share token, no automated tests, and none of this has been exercised
against live Stripe/Anthropic/Cloudinary yet.

### Human review for AI-rejected sidequest photos
When the vision model says no to a sidequest photo, the photo is no longer
just discarded. It's saved as a private `reviewRequests` entry on the quest
(with the AI's reason), the user can press "Ask <creator> to review", and the
quest creator or any admin can approve or decline it from the quest sheet
(a banner on the sidequests page counts what's waiting; the creator also gets
an email). Approval creates a normal completion marked `reviewedBy` and pays
the full quest XP through one shared, atomic `recordCompletion()` used by both
the AI and human paths, so a double approval can't pay twice. Admin accounts
cover Voyage-made quests, and admins may now complete quests they created
(the seed scripts attribute Voyage quests to an account that would otherwise
be blocked by the no-self-completion rule). Review requests are visible only
to the submitter, the creator and admins, and account deletion removes them.
The same files also carry the earlier hardening pass: completion attempts now
spend AI quota and the daily cap, photo reuse is rejected, user-created quests
are always rank J and limited to 5 a day, and other users' private completion
photos and trip links are stripped from API responses (`sidequestView`).
**Known gaps:** pending requests never expire, there's no in-app notification
beyond the banner and the email (which needs the Resend domain to deliver),
the AI-rejection branch hasn't been exercised against the live Anthropic API,
and the UI hasn't been checked visually in a browser.

---

## 2026-10-21

### Expense form redesign and editing
Rebuilt the add-expense form to match the rest of the site: a large amount
field up top, "paid by" pills instead of a dropdown, prefixed tax/tip inputs,
an Equal/Custom pill switch, avatar-style member rows, and a summary card
(subtotal/tax/tip/total plus a "left to assign" badge in Custom mode). Added
editing of existing expenses via `PUT /api/trips/:id/expenses/:expenseId`,
reusing the same form; add and edit now share one server-side validation
helper. Only the payer or trip owner can edit. Shares with an unchanged
person and amount keep their settled state, otherwise they reopen. **Tradeoff:**
expenses only store final per-person totals, not the original subtotal/tax/tip,
so editing opens in Custom mode with the stored amounts and hides tax/tip.
**Known gaps:** a share belonging to someone removed from the trip is dropped
from the edit form (the user must reassign it), any collaborator can still
delete any expense, and the redesign hasn't been checked visually in a browser.

---

## 2026-10-20

### Expense split fixes and quality of life
Custom splits now take each person's pre-tax subtotal and spread tax + tip
across them proportionally, with cent rounding drift pushed onto the largest
share so splits always sum to the total; equal splits are likewise computed
in whole cents (leftover cents go to the first few people). Fixed a handful
of bugs: settled splits were still counted in Balances, a live update from a
collaborator reset the in-progress form, an equal split with nobody selected
could be submitted, and "You" was being saved as a user name for
collaborators. `addExpense` now validates server-side that the payer and
split users are trip members, with no duplicates, and that split amounts add
up to the total (within a cent per person). Added delete confirmation,
Settle visibility limited to the payer/debtor, an Undo for settled splits
(`PATCH .../splits/:userId` takes an optional `{ settled }` body, default
true), and a "you're owed / you owe" summary atop Balances. **Known gaps:**
no edit-expense flow, any collaborator can still delete any expense, and
balances are netted per pair rather than minimized across the whole group.

---

## 2026-10-06

### Sentry error tracking
Added `@sentry/node` (backend) and `@sentry/react` (frontend), both fully
opt-in via `SENTRY_DSN` / `VITE_SENTRY_DSN` — unset, they no-op completely.
Backend initializes Sentry first (`backend/src/instrument.ts`, imported
before any other module) so it auto-instruments Express and Mongoose;
unhandled exceptions and 5xx errors are captured automatically, while 4xx
`HttpError`s are skipped by default since those are expected business
errors, not bugs. Frontend's existing `ErrorBoundary` now also reports
caught render crashes to Sentry instead of just console-logging them.
**Note:** frontend stack traces will show minified code until source maps
are uploaded during the build (needs the Sentry Vite plugin + an auth token
in CI) — not set up yet, follow-up if readable stack traces matter.

### Admin dashboard & distinguished admin accounts
Admin accounts (anyone in `ADMIN_EMAILS`) now get a visibly different nav —
a gold shield-badged "Admin" dropdown, separate from the personal user menu
— linking to a new `/admin` dashboard and the reports queue. The dashboard
(`GET /api/admin/analytics`, admin-only) shows growth metrics (users, trips,
sidequest activity, a 30-day signup chart), revenue (estimated MRR computed
from the existing `TIER_CONFIG` pricing × plan counts — no live Stripe API
calls needed), and system health (pending reports, AI requests today).

### Content moderation: reports + admin review queue
Users can report public trips, sidequests, completion photos, and comments
via a reusable `ReportButton` (hidden on your own content). Reports land in
a new `Report` collection; `/admin/reports` lets an admin see a resolved
preview of the flagged content (text snippet or photo thumbnail) and either
remove it (deletes the actual content and resolves the report in one click)
or dismiss it. Gated by a new `requireAdmin` middleware.

### Account deletion
Added a "Danger zone" on the profile page: type `DELETE` + current password
(skipped for Google-only accounts) to permanently delete. Trips you own are
deleted outright; trips you only collaborate on are left alone, you're just
removed from the collaborator list. Sidequest claims/completions/comments/
event-enrollments are pruned from public sidequests, but the sidequests
themselves aren't deleted (same as how most platforms handle UGC from
deleted accounts). Active Stripe subscriptions are cancelled best-effort
before the account is wiped. **Known gap:** a few deeply-embedded
references (trip group member lists, playlist "added by," expense "paid
by") aren't scrubbed when you were a collaborator — not owner — on someone
else's trip; they just become harmless orphaned IDs.

### Password reset
Mirrors the email-OTP pattern already in place: a TTL-indexed, single-use
hashed token emailed via the branded mailer template, 30s resend cooldown,
and enumeration-safe responses (same message whether or not the email has
an account). Successful reset logs the user in automatically.

This closes out all four "decision blocker" items from the production-
readiness audit: Privacy Policy/ToS → password reset → account deletion →
content moderation.

---

## 2026-10-04

### Privacy Policy & Terms of Service
Grounded in Voyage's actual data flows (Google/password auth, Stripe,
Cloudinary, Anthropic AI chat, Spotify, Resend), with GDPR rights language
(access/rectification/erasure/portability, legal bases) and CCPA language
(right to know/delete, no sale of data). Individual-operator/California
framing, `team.voyageapp@gmail.com` as contact. Linked from the footer and
the signup form.

### Render free-tier cold-start diagnosis
Test users reported slow logins. Root cause: the backend was on Render's
free instance tier, which spins down after ~15 minutes of inactivity —
the next request has to cold-start the instance (30–60+s). Fixed by
upgrading to the $7/mo instance tier (no spin-down). Also discovered along
the way that `REQUIRE_EMAIL_OTP` was never actually enabled in production,
so 2FA wasn't the cause — but surfaced a real, separate bug: `MAIL_FROM`
was still the Resend sandbox sender, meaning invite emails were silently
failing for anyone but the account owner.

### Resend domain verification + branded transactional emails
Verified `voyagetravel.app` with Resend via Cloudflare auto-configure (the
domain's DNS), set `MAIL_FROM` to `no-reply@voyagetravel.app`, and replaced
the plain-text invite/OTP email bodies with a shared branded HTML template
(Voyage wordmark, card layout, accent-blue button) matching the app's
palette.

---

## Earlier (undated)

Work completed before this log started tracking dates:
- Live NYC subway transit widget (MTA integration)
- Trip collaborator invites by email, with auto-link on signup
- Email-based 2FA (OTP) for login and signup, behind a flag
- Sidequest load-time fix, trip-destination auto-filter, Reveal
  visibility bug fix
- Production-readiness audit and fixes: AI-quota race condition (atomic
  `findOneAndUpdate`), Stripe export IDOR, weak JWT secret validation,
  error-message leakage in production
- Trip itinerary export as a downloadable calendar file (.ics)
- voyagetravel.app domain migration, plus Google Maps referrer allowlist
  and Spotify redirect URI fixes
