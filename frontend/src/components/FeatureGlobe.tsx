import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

/* ──────────────────────────────────────────────────────────────
   Interactive feature globe. Auto-drifts, drag to spin, and spins
   to bring a feature's city to the front when `activeId` changes.
   Lazy-loaded from HomePage so three.js stays out of the main chunk.
   ────────────────────────────────────────────────────────────── */

const R = 1.5;
const DEG = Math.PI / 180;
const TILT_Z = -0.36;

export type GlobeFeature = { id: string; lat: number; lng: number };

function latLng(lat: number, lng: number, r = R) {
  const phi = (90 - lat) * DEG;
  const theta = (lng + 180) * DEG;
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta),
  );
}

const shortest = (d: number) => Math.atan2(Math.sin(d), Math.cos(d));

type Palette = {
  sphere: string; emissive: string; line: string; halo: string;
  arc: string; pin: string; pinActive: string;
};
const LIGHT: Palette = {
  sphere: '#b9d7f7', emissive: '#0862b8', line: '#0862b8', halo: '#4da3ff',
  arc: '#0862b8', pin: '#3b8fe0', pinActive: '#0a4f96',
};
const DARK: Palette = {
  sphere: '#1c2b3d', emissive: '#0b76dd', line: '#7dbbff', halo: '#4da3ff',
  arc: '#9ccbff', pin: '#4d9be6', pinActive: '#d6e9ff',
};
const readPalette = (): Palette =>
  (typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark') ? DARK : LIGHT;

/* Thin lat/long ring lines. */
function buildGraticule(color: string) {
  const group = new THREE.Group();
  const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.4 });
  for (let lat = -60; lat <= 60; lat += 30) {
    const r = Math.cos(lat * DEG) * R * 1.004;
    const y = Math.sin(lat * DEG) * R * 1.004;
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 72; i++) {
      const a = (i / 72) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r));
    }
    group.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), mat));
  }
  for (let lng = 0; lng < 180; lng += 30) {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 72; i++) {
      const a = (i / 72) * Math.PI * 2;
      pts.push(new THREE.Vector3(
        Math.cos(a) * Math.cos(lng * DEG) * R * 1.004,
        Math.sin(a) * R * 1.004,
        Math.cos(a) * Math.sin(lng * DEG) * R * 1.004,
      ));
    }
    group.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), mat));
  }
  return group;
}

function greatArc(a: THREE.Vector3, b: THREE.Vector3) {
  const start = a.clone().normalize();
  const end = b.clone().normalize();
  const angle = start.angleTo(end);
  const lift = 0.05 + angle * 0.08;
  const q = new THREE.Quaternion().setFromUnitVectors(start, end);
  const id = new THREE.Quaternion();
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 44; i++) {
    const t = i / 44;
    const v = start.clone().applyQuaternion(id.clone().slerp(q, t));
    v.multiplyScalar(R * (1 + lift * Math.sin(Math.PI * t)));
    pts.push(v);
  }
  return new THREE.CatmullRomCurve3(pts);
}

function TravellingDot({ curve, color, offset }: { curve: THREE.CatmullRomCurve3; color: string; offset: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = (clock.elapsedTime * 0.11 + offset) % 1;
    ref.current.position.copy(curve.getPointAt(t));
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.026, 12, 12]} />
      <meshBasicMaterial color={color} />
    </mesh>
  );
}

function Arcs({ points, color, reduced }: { points: THREE.Vector3[]; color: string; reduced: boolean }) {
  const { lines, curves } = useMemo(() => {
    const curves: THREE.CatmullRomCurve3[] = [];
    const lines: THREE.Line[] = [];
    for (let i = 0; i < points.length; i++) {
      const c = greatArc(points[i], points[(i + 1) % points.length]);
      curves.push(c);
      lines.push(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(c.getPoints(44)),
        new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.6 }),
      ));
    }
    return { lines, curves };
  }, [points, color]);

  useEffect(() => () => {
    lines.forEach((l) => { l.geometry.dispose(); (l.material as THREE.Material).dispose(); });
  }, [lines]);

  return (
    <>
      {lines.map((l, i) => <primitive key={i} object={l} />)}
      {!reduced && curves.map((c, i) => (
        <TravellingDot key={i} curve={c} color={color} offset={i / curves.length} />
      ))}
    </>
  );
}

function Pin({
  pos, active, palette, reduced, onPick,
}: {
  pos: THREE.Vector3; active: boolean; palette: Palette; reduced: boolean; onPick: () => void;
}) {
  const group = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);
  const dotMat = useRef<THREE.MeshBasicMaterial>(null);
  const world = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ camera, clock }) => {
    const g = group.current;
    if (!g) return;
    g.getWorldPosition(world);
    const facing = world.clone().normalize().dot(camera.position.clone().normalize());
    const vis = THREE.MathUtils.clamp((facing - 0.05) * 2.6, 0, 1);
    const pulse = active && !reduced ? 1 + Math.sin(clock.elapsedTime * 3.2) * 0.12 : 1;
    g.scale.setScalar((active ? 1.55 : 0.9 + vis * 0.25) * pulse);
    if (dotMat.current) dotMat.current.opacity = active ? 1 : 0.25 + vis * 0.6;
    if (ring.current) ring.current.quaternion.copy(camera.quaternion);
  });

  return (
    <group ref={group} position={pos}>
      <mesh
        onPointerDown={(e) => { e.stopPropagation(); onPick(); }}
        onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = ''; }}
      >
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshBasicMaterial ref={dotMat} color={active ? palette.pinActive : palette.pin} transparent />
      </mesh>
      {active && (
        <>
          <mesh ref={ring}>
            <ringGeometry args={[0.1, 0.128, 44]} />
            <meshBasicMaterial color={palette.pinActive} transparent opacity={0.9} side={THREE.DoubleSide} />
          </mesh>
          <mesh scale={1.9}>
            <sphereGeometry args={[0.05, 16, 16]} />
            <meshBasicMaterial color={palette.pinActive} transparent opacity={0.12} />
          </mesh>
        </>
      )}
    </group>
  );
}

function Rig({
  features, activeId, palette, reduced, onPick,
}: {
  features: GlobeFeature[]; activeId: string; palette: Palette; reduced: boolean; onPick: (id: string) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const rot = useRef({ y: 0, x: 0, ty: 0, tx: 0, idleUntil: 0 });
  const drag = useRef(false);
  const { gl, invalidate } = useThree();

  const tiltEuler = useMemo(() => new THREE.Euler(0, 0, TILT_Z), []);
  const pts = useMemo(() => features.map((f) => latLng(f.lat, f.lng)), [features]);
  const grat = useMemo(() => buildGraticule(palette.line), [palette.line]);
  useEffect(() => () => {
    grat.children.forEach((c) => { (c as THREE.LineLoop).geometry.dispose(); });
  }, [grat]);

  // spin to the active feature
  useEffect(() => {
    const i = features.findIndex((f) => f.id === activeId);
    if (i < 0) return;
    const local = pts[i].clone().applyEuler(tiltEuler);
    const desired = -Math.atan2(local.x, local.z);
    rot.current.ty += shortest(desired - rot.current.ty);
    rot.current.tx = THREE.MathUtils.clamp((local.y / R) * 0.3, -0.32, 0.32);
    rot.current.idleUntil = performance.now() + 6500;
    if (reduced) { rot.current.y = rot.current.ty; rot.current.x = rot.current.tx; }
    invalidate();
  }, [activeId, features, pts, tiltEuler, reduced, invalidate]);

  // drag to spin
  useEffect(() => {
    const el = gl.domElement;
    el.style.cursor = 'grab';
    const down = () => { drag.current = true; rot.current.idleUntil = performance.now() + 6500; el.style.cursor = 'grabbing'; };
    const up = () => { if (!drag.current) return; drag.current = false; rot.current.idleUntil = performance.now() + 5500; el.style.cursor = 'grab'; };
    const move = (e: PointerEvent) => {
      if (!drag.current) return;
      rot.current.ty += e.movementX * 0.0065;
      rot.current.tx = THREE.MathUtils.clamp(rot.current.tx + e.movementY * 0.0052, -0.52, 0.52);
      rot.current.y = rot.current.ty;
      rot.current.x = rot.current.tx;
      rot.current.idleUntil = performance.now() + 5500;
      invalidate();
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      el.style.cursor = '';
    };
  }, [gl, invalidate]);

  useFrame((_, delta) => {
    const g = groupRef.current;
    if (!g) return;
    const now = performance.now();
    const d = Math.min(1, delta * 4);
    if (!reduced && !drag.current && now > rot.current.idleUntil) {
      rot.current.ty -= delta * 0.13;
    }
    if (!drag.current) {
      rot.current.y += (rot.current.ty - rot.current.y) * d;
      rot.current.x += (rot.current.tx - rot.current.x) * d;
    }
    g.rotation.set(rot.current.x, rot.current.y, 0);
    g.position.y = reduced ? 0 : Math.sin(now * 0.0004) * 0.024;
  });

  return (
    <>
      <ambientLight intensity={0.85} />
      <directionalLight position={[4, 3.5, 5]} intensity={1.35} color="#ffffff" />
      <directionalLight position={[-5, -2, -3]} intensity={0.55} color={palette.halo} />

      <mesh scale={1.15}>
        <sphereGeometry args={[R, 32, 32]} />
        <meshBasicMaterial color={palette.halo} transparent opacity={0.1} side={THREE.BackSide} />
      </mesh>

      <group ref={groupRef}>
        <group rotation={[0, 0, TILT_Z]}>
          <mesh>
            <sphereGeometry args={[R, 64, 64]} />
            <meshStandardMaterial
              color={palette.sphere}
              emissive={palette.emissive}
              emissiveIntensity={0.18}
              roughness={0.55}
              metalness={0.1}
            />
          </mesh>
          <primitive object={grat} />
          <Arcs points={pts} color={palette.arc} reduced={reduced} />
          {features.map((f, i) => (
            <Pin
              key={f.id}
              pos={pts[i]}
              active={f.id === activeId}
              palette={palette}
              reduced={reduced}
              onPick={() => onPick(f.id)}
            />
          ))}
        </group>
      </group>
    </>
  );
}

export default function FeatureGlobe({
  features, activeId, onPick,
}: {
  features: GlobeFeature[]; activeId: string; onPick: (id: string) => void;
}) {
  const [palette, setPalette] = useState<Palette>(readPalette);
  const reduced = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    const obs = new MutationObserver(() => setPalette(readPalette()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);

  return (
    <Canvas
      className="fg-canvas"
      frameloop={reduced ? 'demand' : 'always'}
      dpr={[1, 1.8]}
      camera={{ position: [0, 0.35, 4.7], fov: 42 }}
      gl={{ alpha: true, antialias: true }}
      onCreated={({ gl }) => gl.setClearAlpha(0)}
    >
      <Rig features={features} activeId={activeId} palette={palette} reduced={reduced} onPick={onPick} />
    </Canvas>
  );
}
