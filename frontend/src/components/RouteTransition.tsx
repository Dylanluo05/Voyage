import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useLenis } from 'lenis/react';

/**
 * Fades + rises the page in on every route change. Keyed on pathname so the
 * wrapper remounts; CSS `.page-enter` does the rest. No-op animation under
 * prefers-reduced-motion (class still applied, CSS zeroes the transform).
 */
export default function RouteTransition({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const [key, setKey] = useState(pathname);
  const prev = useRef(pathname);
  const lenis = useLenis();

  useEffect(() => {
    if (prev.current === pathname) return;
    prev.current = pathname;
    setKey(pathname);
    if (lenis) lenis.scrollTo(0, { immediate: true });
    else window.scrollTo(0, 0);
  }, [pathname, lenis]);

  return (
    <div key={key} className="page-enter">
      {children}
    </div>
  );
}
