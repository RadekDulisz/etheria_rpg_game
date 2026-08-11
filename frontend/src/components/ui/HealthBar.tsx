import { useEffect, useRef, useState } from 'react';

interface HealthBarProps {
  value: number;
  max: number;
  className?: string;
  regeneration?: {
    amount: number;
    nextHp: number;
    nextTickAt: string | null;
    percentPerTick: number;
  };
  onRegenerationDue?: () => void;
}

export function HealthBar({ value, max, className = '', regeneration, onRegenerationDue }: HealthBarProps) {
  const [now, setNow] = useState(() => Date.now());
  const notifiedTickRef = useRef<string | null>(null);
  const safeMax = Math.max(0, max);
  const safeValue = Math.max(0, Math.min(value, safeMax));
  const percent = safeMax > 0 ? (safeValue / safeMax) * 100 : 0;
  const nextHp = Math.max(safeValue, Math.min(regeneration?.nextHp ?? safeValue, safeMax));
  const regenerationPercent = safeMax > 0 ? ((nextHp - safeValue) / safeMax) * 100 : 0;
  const nextTickAt = regeneration?.nextTickAt ?? null;
  const secondsRemaining = nextTickAt ? Math.max(0, Math.ceil((new Date(nextTickAt).getTime() - now) / 1000)) : 0;

  useEffect(() => {
    if (!nextTickAt) return;
    const update = () => {
      const currentTime = Date.now();
      setNow(currentTime);
      if (currentTime >= new Date(nextTickAt).getTime() && notifiedTickRef.current !== nextTickAt) {
        notifiedTickRef.current = nextTickAt;
        onRegenerationDue?.();
      }
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [nextTickAt, onRegenerationDue]);

  return (
    <div className={className}>
      <div className="mb-1.5 flex items-center justify-between text-[0.65rem] uppercase tracking-[0.12em]">
        <span className="text-red-300/75">Punkty życia</span>
        <span className="game-number text-[0.78rem] text-red-100">{safeValue} / {safeMax} HP</span>
      </div>
      <div
        className="health-track"
        role="progressbar"
        aria-label={`Punkty życia: ${safeValue} z ${safeMax}${regeneration?.amount ? `. Następna regeneracja: ${regeneration.amount} HP` : ''}`}
        aria-valuenow={safeValue}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        title={regeneration?.amount ? `Następny przypływ: +${regeneration.amount} HP` : undefined}
      >
        <span className="health-fill" style={{ width: `${percent}%` }} />
        {regenerationPercent > 0 ? <span className="health-regen-preview" style={{ left: `${percent}%`, width: `${regenerationPercent}%` }} /> : null}
      </div>
      {nextTickAt && regeneration?.amount ? (
        <div className="health-regen-status">
          <span>Następny przypływ <strong className="game-number">+{regeneration.amount} HP</strong></span>
          <time className="game-number" dateTime={nextTickAt}>{formatRegenerationTime(secondsRemaining)}</time>
        </div>
      ) : null}
    </div>
  );
}

function formatRegenerationTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}
