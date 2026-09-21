import { useEffect, useRef } from 'react';

/**
 * Reveal-on-scroll. Attach the returned ref to a container; any descendant
 * with `[data-reveal]` (or the `.reveal` class) gets `.is-in` / `.revealed`
 * added when it scrolls into view. Honors `prefers-reduced-motion` by
 * revealing everything immediately.
 *
 * Optional attributes on the revealed element:
 *   data-reveal="up|fade|scale|blur|mask"  — travel style (CSS in styles.css)
 *   data-reveal-stagger                    — cascade direct children via `--i`
 *   data-reveal-delay="120"                — extra ms before this one starts
 *   data-reveal-repeat                     — re-hide when it leaves the viewport
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const els = root.querySelectorAll<HTMLElement>('[data-reveal], .reveal');
    if (!els.length) return;

    const applyStagger = (el: HTMLElement) => {
      if (el.dataset.revealStagger === undefined) return;
      Array.from(el.children).forEach((c, i) => {
        (c as HTMLElement).style.setProperty('--i', String(i));
      });
    };

    const show = (el: HTMLElement) => {
      const delay = el.dataset.revealDelay;
      if (delay) el.style.setProperty('--reveal-delay', `${parseInt(delay, 10)}ms`);
      el.classList.add('is-in', 'revealed');
    };

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      els.forEach((el) => { applyStagger(el); el.classList.add('is-in', 'revealed'); });
      return;
    }

    els.forEach(applyStagger);

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          const el = e.target as HTMLElement;
          if (e.isIntersecting) {
            show(el);
            if (el.dataset.revealRepeat === undefined) obs.unobserve(el);
          } else if (el.dataset.revealRepeat !== undefined) {
            el.classList.remove('is-in', 'revealed');
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );

    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return ref;
}
