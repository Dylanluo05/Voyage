import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useLenis } from 'lenis/react';

/* ─────────────────────────────────────────────────────────────────────────
 * SplashHero — full-bleed video splash with a load-in sequence and a scroll exit.
 *
 * LOAD-IN (first visit per session, skipped for reduced motion):
 *   intro  black curtain + one line rising word by word        (~2.1s)
 *   reveal curtain lifts, video settles, headline rises        (~1.2s)
 *   done   scroll unlocked, curtain unmounted
 * Repeat visits skip the curtain but still rise the headline in.
 * Everything is CSS keyed off `data-phase`; React only changes phase 3 times.
 *
 * SCROLL EXIT: the <section> is SCENE_HEIGHT tall with a sticky 100svh stage.
 * progress (0→1) drives ONE css variable (`--p`) written by a single rAF loop
 * (Lenis's animated scroll, sleeps off screen, no scroll listener). CSS calc()s
 * shrink the video into a rounded card and lift/fade the text.
 *
 * VIDEO: one pre-cut looping montage. To swap in the real one, replace the two
 * files in public/video/ (or change MONTAGE). Cuts live inside the file.
 * ───────────────────────────────────────────────────────────────────────── */

const MONTAGE = { src: '/video/montage.mp4', poster: '/video/montage-poster.jpg' };

const SCENE_HEIGHT = '220svh';
const INTRO_HOLD_MS = 2100; // curtain stays down this long
const REVEAL_MS = 1250; // curtain lift + headline entrance
const SEEN_KEY = 'voyage-intro-seen';

type Phase = 'intro' | 'reveal' | 'done';

const INTRO_LINE = [{ t: 'Life' }, { t: 'is' }, { t: 'short.', em: true }];
const TITLE_LINES = [
  [{ t: 'Make' }, { t: 'sh*t', em: true }],
  [{ t: 'happen.' }],
];

const clamp01 = (n: number) => Math.min(Math.max(n, 0), 1);

function readSeen(): boolean {
  try {
    return sessionStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

/** One word inside an overflow mask; --i staggers the rise. */
function Word({ t, em, i }: { t: string; em?: boolean; i: number }) {
  return (
    <span className="w">
      <span className={em ? 'punch' : undefined} style={{ ['--i' as string]: i } as CSSProperties}>
        {t}
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
  const [showIntro] = useState(() => !reduced && !readSeen());
  const [phase, setPhase] = useState<Phase>('intro');

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
          try {
            sessionStorage.setItem(SEEN_KEY, '1');
          } catch {
            /* private mode: intro simply replays next visit */
          }
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

  // ── Video: reduced motion shows the poster only ────────────────────────
  useEffect(() => {
    const v = videoRef.current;
    if (!v || reduced) return;
    v.play().catch(() => {
      /* autoplay blocked: poster stays */
    });
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
            <p className="splash-intro__line">
              {INTRO_LINE.map((w) => (
                <Word key={w.t} t={w.t} em={w.em} i={introIndex++} />
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
            <h1 className="splash__title">
              {TITLE_LINES.map((line, li) => (
                <span key={li} className="splash__line">
                  {line.map((w) => (
                    <Word key={w.t} t={w.t} em={w.em} i={titleIndex++} />
                  ))}
                </span>
              ))}
            </h1>
            <p className="splash__sub">
              Claim sidequests, film the chaos, and keep every trip&apos;s plans, photos and costs in
              one place.
            </p>
            <div className="splash__actions">{children}</div>
          </div>
        </div>
      </section>
    </>
  );
}
