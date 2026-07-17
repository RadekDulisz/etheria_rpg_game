import { formatSignedReputation, REPUTATION_VISUAL_LIMIT } from '../../lib/reputation';

interface ReputationMeterProps {
  value: number;
  compact?: boolean;
  rank?: string;
  rankColor?: string;
}

export function ReputationMeter({ value, compact = false, rank = 'Neutralny', rankColor = '#8f8a82' }: ReputationMeterProps) {
  const accessibleValue = Math.max(-REPUTATION_VISUAL_LIMIT, Math.min(REPUTATION_VISUAL_LIMIT, value));
  const markerPosition = ((accessibleValue + REPUTATION_VISUAL_LIMIT) / (REPUTATION_VISUAL_LIMIT * 2)) * 100;
  const fillStart = Math.min(50, markerPosition);
  const fillWidth = Math.abs(markerPosition - 50);
  const evil = value < 0;
  const reputationLabel = `${formatSignedReputation(value)} · ${rank}`;

  return (
    <div>
      <p className={`text-xs uppercase tracking-[0.14em] ${evil ? 'text-red-300/80' : value > 0 ? 'text-blue-300/80' : 'text-stone-400'}`}>Reputacja</p>
      <div className={`meter-track reputation-track mt-2 ${compact ? 'h-2' : 'h-3'}`} role="meter" tabIndex={0} aria-label={`Reputacja: ${reputationLabel}`} aria-valuenow={accessibleValue} aria-valuemin={-REPUTATION_VISUAL_LIMIT} aria-valuemax={REPUTATION_VISUAL_LIMIT} aria-valuetext={reputationLabel}>
        <span className="reputation-evil-aura" />
        <span className="reputation-good-aura" />
        <span className="reputation-center" />
        {value !== 0 ? (
          <span
            className={evil ? 'reputation-fill-evil' : 'reputation-fill-good'}
            style={{ left: `${fillStart}%`, width: `${fillWidth}%` }}
          />
        ) : null}
        <span className={`reputation-marker ${evil ? 'reputation-marker-evil' : value > 0 ? 'reputation-marker-good' : 'reputation-marker-neutral'}`} style={{ left: `${markerPosition}%`, color: rankColor, boxShadow: `0 0 7px ${rankColor}bf, inset 0 0 3px ${rankColor}80` }} />
        <span className="meter-tooltip game-number">{reputationLabel}</span>
      </div>
      {!compact ? <><div className="mt-1.5 flex justify-between text-[0.6rem] uppercase tracking-[0.12em]"><span className="text-red-300/70">Zły</span><span className="text-stone-500">Neutralny</span><span className="text-blue-300/75">Dobry</span></div><p className="mt-2 text-center text-[0.62rem] uppercase tracking-[0.16em]" style={{ color: rankColor }}>{rank}</p></> : null}
    </div>
  );
}
