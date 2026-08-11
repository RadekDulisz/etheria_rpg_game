import { createPortal } from 'react-dom';
import { RewardCascade, type RewardCascadeEntry } from './RewardCascade';

interface RewardCelebrationProps {
  eyebrow?: string;
  title: string;
  description?: string;
  entries: RewardCascadeEntry[];
  tone?: 'reward' | 'defeat';
  onClose: () => void;
}

export function RewardCelebration({
  eyebrow = 'Nagroda',
  title,
  description,
  entries,
  tone = 'reward',
  onClose,
}: RewardCelebrationProps) {
  return createPortal(
    <div className={`reward-celebration reward-celebration-${tone}`} role="dialog" aria-modal="true" aria-label={title}>
      <div className="reward-celebration-shade" />
      <main>
        <span>{eyebrow}</span>
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
        {entries.length ? <RewardCascade entries={entries} initialDelay={350} stepDelay={480} /> : null}
        <button type="button" onClick={onClose}>Kontynuuj</button>
      </main>
    </div>,
    document.body,
  );
}
