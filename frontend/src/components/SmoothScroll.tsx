import { ReactLenis } from 'lenis/react';
import type { ReactNode } from 'react';

const reduced =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * App-wide smooth momentum scroll (Lenis). Skipped entirely under
 * prefers-reduced-motion. Scroll-locked containers opt out with
 * `data-lenis-prevent`.
 */
export default function SmoothScroll({ children }: { children: ReactNode }) {
  if (reduced) return <>{children}</>;
  return (
    <ReactLenis
      root
      options={{
        lerp: 0.08,
        wheelMultiplier: 1,
        touchMultiplier: 1.6,
        smoothWheel: true,
      }}
    >
      {children}
    </ReactLenis>
  );
}
