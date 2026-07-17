import type { ReactNode } from 'react';

interface StatTileProps {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  mark?: string;
  tooltip?: string;
}

export function StatTile({ label, value, detail, mark, tooltip }: StatTileProps) {
  return (
    <div className="stat-tile" tabIndex={tooltip ? 0 : undefined} aria-label={tooltip ? `${label}: ${tooltip}` : undefined}>
      <div className="stat-tile-heading">
        {mark ? <span className="stat-mark-frame" aria-hidden="true">{mark}</span> : null}
        <p>{label}</p>
      </div>
      <div className="stat-tile-value game-number text-xl text-amber-200">{value}</div>
      <p className="stat-tile-detail text-[0.65rem] text-stone-600">{detail ?? '\u00a0'}</p>
      {tooltip ? <span className="stat-tooltip">{tooltip}</span> : null}
    </div>
  );
}
