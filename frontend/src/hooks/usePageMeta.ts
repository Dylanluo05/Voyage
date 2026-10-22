import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SITE = 'https://voyagetravel.app';
const DEFAULT_TITLE = 'Voyage — Plan trips with friends, earn XP on sidequests';
const DEFAULT_DESC =
  'Voyage is a free trip planner for friends: build itineraries together, split expenses, get AI help, and take on photo-verified sidequests to earn XP wherever you travel.';

interface Meta {
  title: string;
  description?: string;
  /** Keep out of search results (private or token-gated pages). */
  noindex?: boolean;
}

const ROUTES: Array<{ match: (p: string) => boolean; meta: Meta }> = [
  { match: (p) => p === '/', meta: { title: DEFAULT_TITLE } },
  { match: (p) => p === '/discover', meta: { title: 'Discover trips — Voyage', description: 'Browse public trip itineraries from other travelers and get ideas for your next adventure.' } },
  { match: (p) => p === '/how-to-play', meta: { title: 'How sidequests work — Voyage', description: 'Claim sidequests, complete them with a photo, and earn XP and badges as you travel.' } },
  { match: (p) => p === '/register', meta: { title: 'Sign up free — Voyage', description: 'Create a free Voyage account to plan trips with friends and take on sidequests.' } },
  { match: (p) => p === '/login', meta: { title: 'Log in — Voyage' } },
  { match: (p) => p === '/privacy', meta: { title: 'Privacy Policy — Voyage' } },
  { match: (p) => p === '/terms', meta: { title: 'Terms of Service — Voyage' } },
  { match: (p) => p === '/leaderboard', meta: { title: 'Leaderboard — Voyage', noindex: true } },
  { match: (p) => p.startsWith('/trips'), meta: { title: 'My trips — Voyage', noindex: true } },
  { match: (p) => p.startsWith('/sidequests'), meta: { title: 'Sidequests — Voyage', noindex: true } },
  { match: (p) => p.startsWith('/profile'), meta: { title: 'Profile — Voyage', noindex: true } },
  { match: (p) => p.startsWith('/subscription'), meta: { title: 'Plans — Voyage', noindex: true } },
  { match: (p) => p.startsWith('/share/'), meta: { title: 'Shared trip — Voyage', noindex: true } },
  { match: (p) => p.startsWith('/upload/'), meta: { title: 'Add photos — Voyage', noindex: true } },
  { match: (p) => p.startsWith('/admin'), meta: { title: 'Admin — Voyage', noindex: true } },
  { match: (p) => p === '/forgot-password' || p === '/reset-password', meta: { title: 'Reset password — Voyage', noindex: true } },
];

function setTag(selector: string, create: () => HTMLElement, attr: string, value: string) {
  let el = document.head.querySelector<HTMLElement>(selector);
  if (!el) {
    el = create();
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
}

const metaByName = (name: string, content: string) =>
  setTag(`meta[name="${name}"]`, () => Object.assign(document.createElement('meta'), { name }), 'content', content);
const metaByProp = (property: string, content: string) =>
  setTag(`meta[property="${property}"]`, () => { const m = document.createElement('meta'); m.setAttribute('property', property); return m; }, 'content', content);

/** Updates title, description, canonical, robots and social tags on every client-side navigation. */
export default function usePageMeta() {
  const { pathname } = useLocation();

  useEffect(() => {
    const meta = ROUTES.find((r) => r.match(pathname))?.meta ?? { title: DEFAULT_TITLE };
    const description = meta.description ?? DEFAULT_DESC;
    const url = SITE + (pathname === '/' ? '/' : pathname);

    document.title = meta.title;
    metaByName('description', description);
    metaByName('robots', meta.noindex ? 'noindex, nofollow' : 'index, follow');
    metaByName('twitter:title', meta.title);
    metaByName('twitter:description', description);
    metaByProp('og:title', meta.title);
    metaByProp('og:description', description);
    metaByProp('og:url', url);
    setTag('link[rel="canonical"]', () => Object.assign(document.createElement('link'), { rel: 'canonical' }), 'href', url);
  }, [pathname]);
}
