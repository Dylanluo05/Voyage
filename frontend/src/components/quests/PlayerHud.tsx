import CountUp from '../CountUp';
import { rankFor } from '../../utils/ranks';

type Props = {
  name: string;
  avatarUrl?: string;
  xp: number;
  completed: number;
  active: number;
};

/** The player's card: rank, XP progress to the next rank, and quest counts. */
export default function PlayerHud({ name, avatarUrl, xp, completed, active }: Props) {
  const r = rankFor(xp);
  return (
    <div className="hud">
      <div className="hud-id">
        <span className="hud-avatar">
          {avatarUrl ? <img src={avatarUrl} alt="" /> : name.trim().slice(0, 1).toUpperCase()}
        </span>
        <div>
          <p className="hud-name">{name}</p>
          <p className="hud-rank">
            {r.name} <span>· level {r.index + 1}</span>
          </p>
        </div>
      </div>

      <div className="hud-bar-wrap">
        <div className="hud-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(r.pct)}>
          <span style={{ width: `${r.pct}%` }} />
        </div>
        <p className="hud-bar-label">
          <b><CountUp value={xp} /> XP</b>
          {r.next ? <span>{r.toNext.toLocaleString()} to {r.next}</span> : <span>Top rank reached</span>}
        </p>
      </div>

      <dl className="hud-stats">
        <div>
          <dt>Completed</dt>
          <dd><CountUp value={completed} /></dd>
        </div>
        <div>
          <dt>In progress</dt>
          <dd><CountUp value={active} /></dd>
        </div>
      </dl>
    </div>
  );
}
