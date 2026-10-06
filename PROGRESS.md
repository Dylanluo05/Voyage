# Voyage — Progress Log

A running, date-stamped record of what's been built, why, and anything worth
remembering later. Newest entries first. See `CLAUDE.md` for the technical
architecture overview — this file is the narrative of how it got that way.

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
