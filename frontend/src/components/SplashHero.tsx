import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useLenis } from 'lenis/react';
import { Icon } from './Icon';

/* ─────────────────────────────────────────────────────────────────────────
 * SplashHero: full-bleed video splash with a load-in sequence and a scroll exit.
 *
 * LOAD-IN (every page load or reload, skipped for reduced motion):
 *   intro  sky-tinted screen, one line rising word by word, a paper plane
 *          flying across trailing a line                        (~2.1s)
 *   reveal the panel lifts (text stays put) to uncover the video,
 *          the headline rises word by word                      (~1.2s)
 *   done   scroll unlocked, intro unmounted
 * Navigating back to Home inside the app skips the intro but still rises the
 * headline in. Everything is CSS keyed off `data-phase`; React only changes
 * phase 3 times.
 *
 * QUEST CARD: every cut of the montage is presented as a sidequest (playing
 * card with suit, rank and real XP). It follows the video via requestAnimationFrame
 * and only re-renders when the cut changes. Edit CUTS alongside the video.
 *
 * SCROLL EXIT: the <section> is SCENE_HEIGHT tall with a sticky 100svh stage.
 * progress (0→1) drives ONE css variable (`--p`) written by a single rAF loop
 * (Lenis's animated scroll, sleeps off screen, no scroll listener). CSS calc()s
 * shrink the video into a rounded card and lift/fade the text.
 * ───────────────────────────────────────────────────────────────────────── */

type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
type Rank = 'J' | 'Q' | 'K' | 'A';

// Mirrors backend computeXp(): base by rank, multiplier by suit, rounded to 5.
const BASE_XP: Record<Rank, number> = { J: 250, Q: 500, K: 750, A: 1000 };
const SUIT_MULT: Record<Suit, number> = { spades: 1.5, hearts: 1.0, diamonds: 1.2, clubs: 1.1 };
const SUIT_PIP: Record<Suit, string> = { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' };
const xpFor = (suit: Suit, rank: Rank) => Math.round((BASE_XP[rank] * SUIT_MULT[suit]) / 5) * 5;

/** One entry per cut in montage.mp4, in order. `dur` is seconds on screen. */
const CUTS: { dur: number; label: string; suit: Suit; rank: Rank }[] = [
  { dur: 1.3, label: 'Catch big air on a board', suit: 'spades', rank: 'K' },
  { dur: 1.2, label: 'Take the leap', suit: 'spades', rank: 'A' },
  { dur: 1.2, label: 'Cannonball with the whole group', suit: 'hearts', rank: 'J' },
  { dur: 1.3, label: 'Jump out of a plane', suit: 'spades', rank: 'A' },
  { dur: 1.3, label: 'Send a downhill trail', suit: 'spades', rank: 'Q' },
  { dur: 1.2, label: 'Cliff jump into open water', suit: 'spades', rank: 'K' },
  { dur: 1.4, label: 'Backflip off the dock', suit: 'hearts', rank: 'Q' },
  { dur: 1.2, label: 'Ride a dirt jump', suit: 'spades', rank: 'K' },
  { dur: 1.4, label: 'Get up on a wakeboard', suit: 'spades', rank: 'Q' },
  { dur: 1.1, label: 'Land a trampoline flip', suit: 'hearts', rank: 'J' },
  { dur: 1.3, label: 'Jump into a waterfall pool', suit: 'spades', rank: 'K' },
  { dur: 1.4, label: 'Ride a barrel wave', suit: 'spades', rank: 'Q' },
  { dur: 1.3, label: 'Dive from the high platform', suit: 'spades', rank: 'K' },
  { dur: 1.2, label: 'Land a snowboard trick', suit: 'spades', rank: 'Q' },
  { dur: 1.2, label: 'Sprint off the dock together', suit: 'hearts', rank: 'J' },
  { dur: 1.3, label: 'Ride a zipline with the crew', suit: 'clubs', rank: 'Q' },
  { dur: 1.2, label: 'Pop a BMX wheelie', suit: 'spades', rank: 'Q' },
];
const CUT_STARTS = CUTS.reduce<number[]>((acc, c, i) => {
  acc.push(i === 0 ? 0 : acc[i - 1] + CUTS[i - 1].dur);
  return acc;
}, []);

const MONTAGE = { src: '/video/montage.mp4', poster: '/video/montage-poster.jpg' };

const SCENE_HEIGHT = '220svh';
const INTRO_HOLD_MS = 2100; // intro screen stays up this long
const REVEAL_MS = 1250; // panel lift + headline entrance

type Phase = 'intro' | 'reveal' | 'done';
type WordSpec = { t: string; em?: boolean; dot?: boolean };

const INTRO_LINE: WordSpec[] = [{ t: 'Life' }, { t: 'is' }, { t: 'short', dot: true }];
const TITLE_LINES: WordSpec[][] = [
  [{ t: 'Make' }, { t: 'sh*t', em: true }],
  [{ t: 'happen.' }],
];

const clamp01 = (n: number) => Math.min(Math.max(n, 0), 1);

/** In-memory on purpose: resets on every page load or reload, but survives in-app
 *  navigation, so the intro replays on reload and not when clicking back to Home. */
let introPlayed = false;

/** One word inside an overflow mask; --i staggers the rise. `dot` appends a blue full stop. */
function Word({ t, em, dot, i }: WordSpec & { i: number }) {
  return (
    <span className="w">
      <span className={em ? 'punch' : undefined} style={{ ['--i' as string]: i } as CSSProperties}>
        {t}
        {dot && <i className="dot">.</i>}
      </span>
    </span>
  );
}

type Props = {
  /** CTA slot, rendered under the headline. */
  children?: ReactNode;
};

export default function SplashHero({ children }: Props) {
  const rootRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const lenis = useLenis();
  const lenisRef = useRef(lenis);
  lenisRef.current = lenis;

  const reduced =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [showIntro] = useState(() => !reduced && !introPlayed);
  const [phase, setPhase] = useState<Phase>('intro');
  const [cut, setCut] = useState(0);

  // ── Load-in timeline ───────────────────────────────────────────────────
  useEffect(() => {
    if (reduced) {
      setPhase('done');
      return;
    }
    const html = document.documentElement;
    const timers: number[] = [];
    const finish = () => {
      setPhase('done');
      html.classList.remove('splash-locked');
      lenisRef.current?.start();
    };

    if (showIntro) {
      html.classList.add('splash-locked');
      lenisRef.current?.stop();
      timers.push(
        window.setTimeout(() => {
          setPhase('reveal');
          introPlayed = true;
        }, INTRO_HOLD_MS),
        window.setTimeout(finish, INTRO_HOLD_MS + REVEAL_MS),
      );
    } else {
      timers.push(window.setTimeout(() => setPhase('reveal'), 60), window.setTimeout(finish, 60 + REVEAL_MS));
    }

    return () => {
      timers.forEach(window.clearTimeout);
      html.classList.remove('splash-locked');
      lenisRef.current?.start();
    };
  }, [reduced, showIntro]);

  // ── Video: reduced motion shows the poster only. Playback waits for the reveal
  //    so decoding does not compete with the intro animation (the poster is frame 1).
  const canPlay = !reduced && (!showIntro || phase !== 'intro');
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !canPlay) return;
    v.play().catch(() => {
      /* autoplay blocked: poster stays */
    });
  }, [canPlay]);

  // ── Quest card follows the current cut ─────────────────────────────────
  useEffect(() => {
    const root = rootRef.current;
    const v = videoRef.current;
    if (!root || !v || reduced) return;

    let raf = 0;
    let last = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const t = v.currentTime;
      let i = 0;
      for (let k = CUT_STARTS.length - 1; k >= 0; k--) {
        if (t >= CUT_STARTS[k]) {
          i = k;
          break;
        }
      }
      if (i !== last) {
        last = i;
        setCut(i);
      }
    };
    const io = new IntersectionObserver(([e]) => {
      cancelAnimationFrame(raf);
      raf = 0;
      if (e.isIntersecting) raf = requestAnimationFrame(tick);
    });
    io.observe(root);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [reduced]);

  // ── Scroll progress → --p ──────────────────────────────────────────────
  useEffect(() => {
    const root = rootRef.current;
    if (!root || reduced) return;

    let raf = 0;
    let last = NaN;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const scroll = lenisRef.current ? lenisRef.current.scroll : window.scrollY;
      const rect = root.getBoundingClientRect();
      const top = rect.top + window.scrollY; // layout position, scroll-independent
      const range = Math.max(1, rect.height - window.innerHeight);
      const p = clamp01((scroll - top) / range);
      if (p === last) return;
      last = p;
      root.style.setProperty('--p', p.toFixed(4));
    };
    const start = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop()));
    io.observe(root);
    return () => {
      stop();
      io.disconnect();
    };
  }, [reduced]);

  // --p is written imperatively by the rAF loop; CSS falls back to 0.
  const sectionStyle: CSSProperties = { height: reduced ? '100svh' : SCENE_HEIGHT };

  const quest = useMemo(() => {
    const c = CUTS[cut] ?? CUTS[0];
    return { ...c, pip: SUIT_PIP[c.suit], xp: xpFor(c.suit, c.rank) };
  }, [cut]);

  let introIndex = 0;
  let titleIndex = 0;

  return (
    <>
      {/* Portalled to <body>: the route-transition wrapper animates `transform`,
          which would make `position: fixed` resolve against the page, not the viewport. */}
      {showIntro &&
        phase !== 'done' &&
        createPortal(
          <div className="splash-intro" data-phase={phase} aria-hidden="true">
            <div className="splash-intro__bg" />
            <svg className="splash-intro__trail" viewBox="0 0 100 100" preserveAspectRatio="none" fill="none">
              <path d="M -8 86 C 18 60, 34 88, 54 68 C 74 48, 92 44, 108 14" pathLength="1" />
            </svg>
            <span className="splash-intro__plane">
              <Icon name="paperPlane" size={34} weight="fill" />
            </span>
            <p className="splash-intro__line">
              {INTRO_LINE.map((w) => (
                <Word key={w.t} {...w} i={introIndex++} />
              ))}
            </p>
          </div>,
          document.body,
        )}

      <section
        ref={rootRef}
        className="splash"
        style={sectionStyle}
        data-phase={phase}
        aria-label="Voyage"
      >
        <div className="splash__stage">
          <div className="splash__frame">
            <video
              ref={videoRef}
              className="splash__video"
              src={MONTAGE.src}
              poster={MONTAGE.poster}
              muted
              loop
              playsInline
              preload="auto"
              aria-hidden="true"
              tabIndex={-1}
            />
            <div className="splash__tint" aria-hidden="true" />
          </div>

          <div className="splash__content">
            <div className="splash__copy">
              <h1 className="splash__title">
                {TITLE_LINES.map((line, li) => (
                  <span key={li} className="splash__line">
                    {line.map((w) => (
                      <Word key={w.t} {...w} i={titleIndex++} />
                    ))}
                  </span>
                ))}
              </h1>
              <p className="splash__sub">
                Claim sidequests, film the chaos, and keep every trip&apos;s plans, photos and costs
                in one place.
              </p>
              <div className="splash__actions">{children}</div>
            </div>

            <div className="splash__quest" aria-hidden="true">
              <div key={cut} className={`quest-card suit-${quest.suit}`}>
                <div className="quest-card__top">
                  <span>{quest.rank}</span>
                  <span>{quest.pip}</span>
                </div>
                <div className="quest-card__title">{quest.label}</div>
                <div className="quest-card__xp">+{quest.xp} XP</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
