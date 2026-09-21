import { Component, lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { GlobeFeature } from './FeatureGlobe';

const FeatureGlobe = lazy(() => import('./FeatureGlobe'));

class GlobeBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

/**
 * Mounts the WebGL feature globe only once it scrolls near the viewport
 * (keeps three.js off the critical path), with a static disc fallback if
 * WebGL is unavailable or the chunk fails to load.
 */
export default function FeatureGlobeMount({
  features, activeId, onPick,
}: {
  features: GlobeFeature[]; activeId: string; onPick: (id: string) => void;
}) {
  const holdRef = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = holdRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setShow(true); obs.disconnect(); } },
      { rootMargin: '400px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const disc = <div className="fg-globe-skel" aria-hidden="true" />;

  return (
    <div className="fg-globe-hold" ref={holdRef}>
      {show ? (
        <GlobeBoundary fallback={disc}>
          <Suspense fallback={disc}>
            <FeatureGlobe features={features} activeId={activeId} onPick={onPick} />
          </Suspense>
        </GlobeBoundary>
      ) : disc}
    </div>
  );
}
