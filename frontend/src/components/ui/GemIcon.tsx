import type { GemDefinition } from '../../types/game';

const familyLabels: Record<GemDefinition['family'], string> = {
  RUBY: 'Rubin',
  AMETHYST: 'Ametyst',
  EMERALD: 'Szmaragd',
  SAPPHIRE: 'Szafir',
};

const tierLabels: Record<GemDefinition['tier'], string> = {
  SHARD: 'Szlif krągły',
  CUT: 'Szlif poduszkowy',
  FLAWLESS: 'Szlif owalny',
  ROYAL: 'Szlif koronny',
  ANCIENT: 'Szlif pradawny',
};

export function GemIcon({ gem, compact = false }: { gem: GemDefinition; compact?: boolean }) {
  return (
    <span
      className={`blacksmith-gem-stone gem-${gem.family.toLowerCase()} gem-tier-${gem.tier.toLowerCase()} ${compact ? 'compact' : ''}`}
      role="img"
      aria-label={`${familyLabels[gem.family]}, ${tierLabels[gem.tier]}`}
    >
      <i /><b /><em />
    </span>
  );
}
