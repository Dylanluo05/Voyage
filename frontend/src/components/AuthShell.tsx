import type { ReactNode } from 'react';
import { Icon } from './Icon';

/** Split layout for login and register: an action photo with a tagline, and the form beside it. */
export default function AuthShell({ title, lede, children }: { title: ReactNode; lede: string; children: ReactNode }) {
  return (
    <div className="au">
      <aside className="au-side" aria-hidden="true">
        <img src="/video/montage-poster.jpg" alt="" draggable={false} />
        <div className="au-side-shade" />
        <p className="au-side-line">
          Make <em className="punch">sh*t</em> happen.
        </p>
        <span className="au-side-chip">
          <Icon name="lightning" size={14} weight="fill" /> Up to 1,500 XP per quest
        </span>
      </aside>
      <section className="au-main">
        <h1 className="au-title">{title}</h1>
        <p className="au-lede">{lede}</p>
        {children}
      </section>
    </div>
  );
}
