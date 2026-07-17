import { formatInteger } from '../../lib/formatters';

interface ExperienceProgressProps {
  current: string;
  required: string;
  compact?: boolean;
}

export function ExperienceProgress({ current, required, compact = false }: ExperienceProgressProps) {
  const currentValue = BigInt(current);
  const requiredValue = BigInt(required);
  const percent = requiredValue > 0n ? Math.min(100, Number((currentValue * 10_000n) / requiredValue) / 100) : 0;
  const progressLabel = `${formatInteger(current)} / ${formatInteger(required)} XP`;

  return (
    <div>
      <p className="text-xs uppercase tracking-[0.14em] text-stone-400">Doświadczenie</p>
      <div className={`meter-track progress-track mt-2 ${compact ? 'h-2' : 'h-3'}`} role="progressbar" tabIndex={0} aria-label={`Postęp doświadczenia: ${progressLabel}`} aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
        <span className="progress-fill-experience" style={{ width: `${percent}%` }} />
        <span className="progress-marker" style={{ left: `${percent}%` }} />
        <span className="meter-tooltip game-number">{progressLabel}</span>
      </div>
      {!compact ? <p className="experience-value game-number mt-1.5 text-right text-[0.8rem]">{progressLabel}</p> : null}
    </div>
  );
}
