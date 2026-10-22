// Serves link-preview HTML (Open Graph / Twitter tags) to social and chat crawlers
// for /share/:token. The app is a single-page app, so crawlers that don't run
// JavaScript would otherwise only see the generic site card. vercel.json routes
// only crawler user agents here; people get the normal app.

const SITE = 'https://voyagetravel.app';
const DEFAULT_IMAGE = `${SITE}/og-image.jpg`;
const API_URL = (process.env.API_URL || process.env.VITE_API_URL || '').replace(/\/$/, '');

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const clip = (s, n) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

function fmtRange(start, end) {
  const opts = { month: 'short', day: 'numeric', timeZone: 'UTC' };
  const s = new Date(start);
  const e = new Date(end);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return '';
  const year = e.getUTCFullYear();
  return `${s.toLocaleDateString('en-US', opts)} – ${e.toLocaleDateString('en-US', opts)}, ${year}`;
}

export function buildHtml(token, trip) {
  const url = `${SITE}/share/${encodeURIComponent(token)}`;
  let title = 'Shared trip — Voyage';
  let description = 'See this trip on Voyage: plan trips with friends and earn XP on sidequests.';
  let image = DEFAULT_IMAGE;

  if (trip) {
    const by = trip.owner?.name ? ` · shared by ${trip.owner.name}` : '';
    const count = Array.isArray(trip.items) ? trip.items.length : 0;
    title = clip(`${trip.title} — ${trip.destination}`, 90);
    description = clip(
      [fmtRange(trip.startDate, trip.endDate), count ? `${count} planned ${count === 1 ? 'stop' : 'stops'}` : '', trip.description]
        .filter(Boolean)
        .join(' · ') + by,
      200
    );
    const cover = Array.isArray(trip.items) ? trip.items.find((i) => typeof i.imageUrl === 'string' && i.imageUrl.startsWith('https://')) : null;
    if (cover) image = cover.imageUrl;
  }

  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}" />
<meta name="robots" content="noindex, nofollow" />
<link rel="canonical" href="${esc(url)}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Voyage" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(description)}" />
<meta property="og:url" content="${esc(url)}" />
<meta property="og:image" content="${esc(image)}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(title)}" />
<meta name="twitter:description" content="${esc(description)}" />
<meta name="twitter:image" content="${esc(image)}" />
</head><body><p><a href="${esc(url)}">${esc(title)}</a></p></body></html>`;
}

export default async function handler(req, res) {
  const token = String(req.query?.token ?? '');
  let trip = null;
  if (/^[a-f0-9]{20,64}$/i.test(token) && API_URL) {
    try {
      const r = await fetch(`${API_URL}/api/public/trips/${token}`, { signal: AbortSignal.timeout(4000) });
      if (r.ok) trip = await r.json();
    } catch {
      /* fall back to the generic card */
    }
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  // Short cache so edits and unshared trips don't linger in the CDN.
  res.setHeader('Cache-Control', trip ? 'public, s-maxage=300, stale-while-revalidate=600' : 'public, s-maxage=60');
  res.status(200).send(buildHtml(token, trip));
}
