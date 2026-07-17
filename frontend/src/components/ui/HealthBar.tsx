interface HealthBarProps {
  value: number;
  max: number;
  className?: string;
}

export function HealthBar({ value, max, className = '' }: HealthBarProps) {
  const safeMax = Math.max(0, max);
  const safeValue = Math.max(0, Math.min(value, safeMax));
  const percent = safeMax > 0 ? (safeValue / safeMax) * 100 : 0;

  return (
    <div className={className}>
      <div className="mb-1.5 flex items-center justify-between text-[0.65rem] uppercase tracking-[0.12em]">
        <span className="text-red-300/75">Punkty życia</span>
        <span className="game-number text-[0.78rem] text-red-100">{safeValue} / {safeMax} HP</span>
      </div>
      <div className="health-track" role="progressbar" aria-label={`Punkty życia: ${safeValue} z ${safeMax}`} aria-valuenow={safeValue} aria-valuemin={0} aria-valuemax={safeMax}>
        <span className="health-fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
