import { useEffect, useRef, useState } from 'react';
import { useCountUp } from '../hooks/useCountUp';

type Props = {
  value: number;
  decimals?: number;
  duration?: number;
  /** text before/after the number */
  prefix?: string;
  suffix?: string;
  /** format the tweened value (e.g. thousands separators) */
  format?: (n: number) => string;
  className?: string;
};

/**
 * Renders a number that tweens 0 → value the first time it scrolls into view.
 * Instant under prefers-reduced-motion (handled inside useCountUp).
 */
export default function CountUp({ value, decimals = 0, duration, prefix = '', suffix = '', format, className }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setSeen(true); obs.disconnect(); } },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const n = useCountUp(value, { decimals, duration, start: seen });
  const body = format ? format(n) : n.toLocaleString();

  return <span ref={ref} className={className}>{prefix}{body}{suffix}</span>;
}
