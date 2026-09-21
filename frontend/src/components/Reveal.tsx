import { useEffect, useRef } from 'react';
import type { CSSProperties, ElementType, ReactNode } from 'react';

type Props = {
  children: ReactNode;
  /** travel style — matches CSS in styles.css */
  variant?: 'up' | 'fade' | 'scale' | 'blur' | 'mask';
  /** cascade direct children via `--i` */
  stagger?: boolean;
  /** extra ms before this one starts */
  delay?: number;
  /** re-hide when it scrolls back out */
  repeat?: boolean;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
  /** passthrough — e.g. an `id` used as a scroll anchor */
  id?: string;
};

/**
 * Self-contained reveal-on-scroll wrapper (own IntersectionObserver, so it
 * works without an ancestor `useReveal`). Adds `.is-in` / `.revealed` when
 * it enters the viewport. Instant under prefers-reduced-motion.
 */
export default function Reveal({
  children,
  variant = 'up',
  stagger = false,
  delay,
  repeat = false,
  as: Tag = 'div',
  className = '',
  style,
  id,
}: Props) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (stagger) {
      Array.from(el.children).forEach((c, i) => {
        (c as HTMLElement).style.setProperty('--i', String(i));
      });
    }
    if (delay) el.style.setProperty('--reveal-delay', `${delay}ms`);

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.classList.add('is-in', 'revealed');
      return;
    }

    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.classList.add('is-in', 'revealed');
          if (!repeat) obs.disconnect();
        } else if (repeat) {
          el.classList.remove('is-in', 'revealed');
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [stagger, delay, repeat]);

  return (
    <Tag
      ref={ref as never}
      id={id}
      className={`reveal ${className}`.trim()}
      style={style}
      data-reveal={variant}
      {...(stagger ? { 'data-reveal-stagger': '' } : {})}
    >
      {children}
    </Tag>
  );
}
