import { useEffect, useRef, useState } from 'react';

type Opts = {
  /** ms */
  duration?: number;
  /** decimal places to show */
  decimals?: number;
  /** don't animate until this is true (e.g. element revealed) */
  start?: boolean;
};

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Tweens a number 0 → `value` once, when `start` becomes true (default true).
 * Honors prefers-reduced-motion by jumping straight to the value.
 */
export function useCountUp(value: number, { duration = 1100, decimals = 0, start = true }: Opts = {}) {
  const [display, setDisplay] = useState(0);
  const done = useRef(false);

  useEffect(() => {
    if (!start || done.current) return;
    done.current = true;

    if (
      typeof window === 'undefined' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      value === 0
    ) {
      setDisplay(value);
      return;
    }

    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      const v = easeOut(p) * value;
      setDisplay(decimals ? parseFloat(v.toFixed(decimals)) : Math.round(v));
      if (p < 1) raf = requestAnimationFrame(tick);
      else setDisplay(value);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration, decimals, start]);

  return display;
}
