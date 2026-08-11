import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { formatInteger } from '../../lib/formatters';
import { CurrencyCoin } from './CurrencyCoin';

export type RewardKind = 'gold' | 'xp' | 'rounds' | 'damage' | 'reputation' | 'item' | 'expertise';

export interface RewardCascadeEntry {
  kind: RewardKind;
  label: string;
  value: number | string;
  prefix?: string;
  suffix?: string;
  icon?: ReactNode;
  detail?: ReactNode;
}

interface RewardCascadeProps {
  entries: RewardCascadeEntry[];
  className?: string;
  initialDelay?: number;
  stepDelay?: number;
}

export function RewardCascade({
  entries,
  className = '',
  initialDelay = 400,
  stepDelay = 480,
}: RewardCascadeProps) {
  return <div className={`reward-cascade ${className}`.trim()} aria-label="Podsumowanie nagród">
    {entries.map((entry, index) => {
      const delay = initialDelay + index * stepDelay;
      return <article
        className={`reward-cascade-entry reward-cascade-${entry.kind} ${entry.detail ? 'reward-cascade-level-up' : ''}`}
        key={`${entry.kind}-${entry.label}`}
        style={{ '--reward-delay': `${delay}ms` } as CSSProperties}
      >
        <RewardIcon entry={entry} />
        <span>{entry.label}</span>
        <strong>
          {entry.prefix}
          {typeof entry.value === 'number'
            ? <AnimatedRewardNumber value={entry.value} delay={delay} />
            : entry.value}
          {entry.suffix}
        </strong>
        {entry.detail
          ? <em className="reward-cascade-detail">{entry.detail}</em>
          : <em className="reward-cascade-detail reward-cascade-detail-empty" aria-hidden="true">&nbsp;</em>}
      </article>;
    })}
  </div>;
}

function RewardIcon({ entry }: { entry: RewardCascadeEntry }) {
  if (entry.icon) return <i className="reward-cascade-emblem reward-cascade-custom" aria-hidden="true">{entry.icon}</i>;
  if (entry.kind === 'gold') {
    return <i className="reward-cascade-emblem" aria-hidden="true"><CurrencyCoin className="reward-cascade-coin" /></i>;
  }
  if (entry.kind === 'rounds') {
    return <i className="reward-cascade-emblem" aria-hidden="true"><span className="reward-cascade-swords"><b /><b /></span></i>;
  }
  const symbol = entry.kind === 'xp'
    ? '✦'
    : entry.kind === 'damage'
      ? '♥'
      : entry.kind === 'expertise'
        ? '✧'
        : '◆';
  return <i className="reward-cascade-emblem" aria-hidden="true"><span className="reward-cascade-glyph">{symbol}</span></i>;
}

function AnimatedRewardNumber({ value, delay, duration = 720 }: { value: number; delay: number; duration?: number }) {
  const [displayedValue, setDisplayedValue] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplayedValue(value);
      return;
    }
    let animationFrame = 0;
    let startedAt = 0;
    const delayTimer = window.setTimeout(() => {
      const animate = (timestamp: number) => {
        if (!startedAt) startedAt = timestamp;
        const progress = Math.min(1, (timestamp - startedAt) / duration);
        setDisplayedValue(Math.round(value * (1 - Math.pow(1 - progress, 3))));
        if (progress < 1) animationFrame = window.requestAnimationFrame(animate);
      };
      animationFrame = window.requestAnimationFrame(animate);
    }, delay);
    return () => {
      window.clearTimeout(delayTimer);
      window.cancelAnimationFrame(animationFrame);
    };
  }, [delay, duration, value]);

  return <span className="game-number">{formatInteger(displayedValue)}</span>;
}
