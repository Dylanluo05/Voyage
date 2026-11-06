import type { ReactNode } from 'react';
import type { PublicSidequest } from '../../types';

/* Illustrated covers for Voyage-made quests. Each scene is flat, translucent white shapes that sit
   on the quest's suit-coloured gradient, so the four suits stay recognisable. A scene is picked by
   keyword from the quest's title, description and location; `explore` is the catch-all. */

export type Theme = 'water' | 'food' | 'night' | 'sunrise' | 'road' | 'music' | 'social' | 'sport' | 'camp' | 'explore';

// First match wins, so more specific themes come first.
const KEYWORDS: Array<[Theme, RegExp]> = [
  ['camp', /\b(camp|tent|sleeping bag|campsite|trailhead|overnight outdoors?)\b/],
  ['night', /\b(\d\s?am|midnight|rave|disco|all-nighter|after dark|late-night|night)\b/],
  ['sunrise', /\b(sunrise|summit|rooftop|hike|peak|climb|sunset|view)\b/],
  ['water', /\b(swim|plunge|ocean|lake|river|beach|sea|surf|cliff|jump|dive|kayak|paddle|coast\w*|water)\b/],
  ['food', /\b(eat|bakery|food|spicy|restaurant|coffee|matcha|dinner|breakfast|brunch|dessert|cook|menu|taco|ramen|pizza)\b/],
  ['music', /\b(sing|album|concert|show|dance|mic|karaoke|band|playlist|music|set)\b/],
  ['sport', /\b(run|race|5k|marathon|axe|gym|workout|lift|train|sport|bike|cycl\w*|miles?)\b/],
  ['road', /\b(bus|train|road trip|drive|ride|flight|fly|transit|trip|border|tank|ferry|hitch\w*)\b/],
  ['social', /\b(friend|stranger|invite|roommates?|someone|new people|date|party|meet|group|team|volunteer)\b/],
];

export function themeFor(quest: Pick<PublicSidequest, 'title' | 'description' | 'location'>): Theme {
  const text = `${quest.title} ${quest.description ?? ''} ${quest.location ?? ''}`.toLowerCase();
  return KEYWORDS.find(([, re]) => re.test(text))?.[0] ?? 'explore';
}

const W = (o: number) => ({ fill: '#fff', fillOpacity: o });

const SCENES: Record<Theme, ReactNode> = {
  water: (
    <>
      <circle cx="285" cy="92" r="44" {...W(0.5)} />
      <path d="M0 190 Q50 168 100 190 T200 190 T300 190 T400 190 V320 H0Z" {...W(0.22)} />
      <path d="M0 225 Q50 203 100 225 T200 225 T300 225 T400 225 V320 H0Z" {...W(0.28)} />
      <path d="M0 262 Q50 240 100 262 T200 262 T300 262 T400 262 V320 H0Z" {...W(0.36)} />
      <path d="M130 70 q22 -34 44 0" fill="none" stroke="#fff" strokeOpacity="0.7" strokeWidth="5" strokeLinecap="round" />
    </>
  ),
  food: (
    <>
      <ellipse cx="200" cy="232" rx="128" ry="26" {...W(0.28)} />
      <path d="M92 190 H308 a108 100 0 0 1 -216 0Z" {...W(0.55)} />
      <path d="M160 150 q-14 -22 0 -42 q14 -20 0 -40" fill="none" stroke="#fff" strokeOpacity="0.6" strokeWidth="7" strokeLinecap="round" />
      <path d="M205 150 q-14 -22 0 -42 q14 -20 0 -40" fill="none" stroke="#fff" strokeOpacity="0.6" strokeWidth="7" strokeLinecap="round" />
      <path d="M250 150 q-14 -22 0 -42 q14 -20 0 -40" fill="none" stroke="#fff" strokeOpacity="0.6" strokeWidth="7" strokeLinecap="round" />
    </>
  ),
  night: (
    <>
      <path d="M300 40 a52 52 0 1 0 38 88 a42 42 0 1 1 -38 -88Z" {...W(0.6)} />
      {[[60, 60], [120, 110], [190, 50], [240, 120], [350, 160], [40, 150]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 2 ? 3 : 4.5} {...W(0.7)} />
      ))}
      <path d="M0 320 V230 h34 v-40 h40 v52 h28 v-70 h46 v58 h36 v-34 h42 v76 h30 v-50 h44 v78 h30 v-30 h70 V320Z" {...W(0.34)} />
      {[[50, 212], [110, 190], [150, 200], [215, 232], [270, 210], [335, 224]].map(([x, y], i) => (
        <rect key={i} x={x} y={y} width="8" height="10" {...W(0.7)} />
      ))}
    </>
  ),
  sunrise: (
    <>
      <circle cx="200" cy="196" r="62" {...W(0.55)} />
      {[-60, -30, 0, 30, 60].map((a) => (
        <line key={a} x1="200" y1="196" x2={200 + Math.sin((a * Math.PI) / 180) * 150} y2={196 - Math.cos((a * Math.PI) / 180) * 150} stroke="#fff" strokeOpacity="0.2" strokeWidth="6" strokeLinecap="round" />
      ))}
      <path d="M0 320 V236 L70 168 L130 226 L210 140 L290 232 L340 190 L400 244 V320Z" {...W(0.3)} />
      <path d="M0 320 V272 L90 222 L170 276 L250 214 L330 272 L400 240 V320Z" {...W(0.42)} />
    </>
  ),
  road: (
    <>
      <circle cx="320" cy="82" r="34" {...W(0.5)} />
      <path d="M0 176 L90 150 L150 172 L240 138 L330 168 L400 150 V320 H0Z" {...W(0.2)} />
      <path d="M160 176 H240 L360 320 H40Z" {...W(0.34)} />
      {[[200, 188, 6, 12], [200, 216, 8, 20], [200, 256, 11, 30], [200, 304, 15, 44]].map(([x, y, w, h], i) => (
        <rect key={i} x={x - w / 2} y={y} width={w} height={h} rx="2" {...W(0.85)} />
      ))}
    </>
  ),
  music: (
    <>
      {[40, 90, 140, 190, 240, 290, 340].map((x, i) => {
        const h = [70, 130, 190, 110, 160, 90, 60][i];
        return <rect key={x} x={x} y={250 - h} width="30" height={h} rx="15" {...W(0.18 + (i % 3) * 0.1)} />;
      })}
      <g {...W(0.75)}>
        <ellipse cx="116" cy="84" rx="19" ry="14" transform="rotate(-20 116 84)" />
        <rect x="131" y="30" width="6" height="56" />
        <path d="M137 30 q34 6 30 40 q-6 -22 -30 -24Z" />
      </g>
    </>
  ),
  social: (
    <>
      <circle cx="140" cy="168" r="78" {...W(0.26)} />
      <circle cx="262" cy="168" r="78" {...W(0.26)} />
      <circle cx="200" cy="168" r="30" {...W(0.34)} />
      <path d="M88 70 h104 a14 14 0 0 1 14 14 v36 a14 14 0 0 1 -14 14 h-62 l-26 22 v-22 h-16 a14 14 0 0 1 -14 -14 v-36 a14 14 0 0 1 14 -14Z" {...W(0.7)} />
      <circle cx="120" cy="102" r="6" fill="currentColor" fillOpacity="0.3" />
      <circle cx="140" cy="102" r="6" fill="currentColor" fillOpacity="0.3" />
      <circle cx="160" cy="102" r="6" fill="currentColor" fillOpacity="0.3" />
    </>
  ),
  sport: (
    <>
      <circle cx="200" cy="176" r="98" fill="none" stroke="#fff" strokeOpacity="0.5" strokeWidth="12" />
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i * 30 * Math.PI) / 180;
        return <line key={i} x1={200 + Math.sin(a) * 78} y1={176 - Math.cos(a) * 78} x2={200 + Math.sin(a) * 90} y2={176 - Math.cos(a) * 90} stroke="#fff" strokeOpacity="0.6" strokeWidth="5" strokeLinecap="round" />;
      })}
      <rect x="182" y="56" width="36" height="14" rx="4" {...W(0.6)} />
      <path d="M200 176 L242 130" stroke="#fff" strokeOpacity="0.85" strokeWidth="8" strokeLinecap="round" />
      <path d="M212 176 l-26 -52 h32 l-14 52Z" {...W(0.18)} />
    </>
  ),
  camp: (
    <>
      <circle cx="320" cy="70" r="26" {...W(0.55)} />
      {[[60, 50], [130, 90], [200, 40], [260, 100], [350, 130]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 2 ? 3 : 4.5} {...W(0.7)} />
      ))}
      <path d="M0 320 V250 Q100 200 200 250 T400 240 V320Z" {...W(0.28)} />
      <path d="M120 270 L200 130 L280 270Z" {...W(0.62)} />
      <path d="M200 130 L172 270 H228Z" {...W(0.28)} />
      <path d="M0 320 V285 Q120 262 240 290 T400 280 V320Z" {...W(0.4)} />
    </>
  ),
  explore: (
    <>
      <circle cx="200" cy="170" r="110" fill="none" stroke="#fff" strokeOpacity="0.5" strokeWidth="8" />
      <ellipse cx="200" cy="170" rx="46" ry="110" fill="none" stroke="#fff" strokeOpacity="0.32" strokeWidth="6" />
      <path d="M92 130 H308 M92 210 H308 M200 60 V280" stroke="#fff" strokeOpacity="0.32" strokeWidth="6" />
      <path d="M200 96 L226 170 L200 244 L174 170Z" {...W(0.7)} />
      <circle cx="200" cy="170" r="9" fill="currentColor" fillOpacity="0.35" />
    </>
  ),
};

export default function QuestIllustration({ quest }: { quest: Pick<PublicSidequest, 'title' | 'description' | 'location'> }) {
  const theme = themeFor(quest);
  return (
    <div className="qc-art qc-art--scene" aria-hidden="true" data-theme={theme}>
      <svg className="qc-illus" viewBox="0 0 400 320" preserveAspectRatio="xMidYMid slice" focusable="false">
        {SCENES[theme]}
      </svg>
    </div>
  );
}
