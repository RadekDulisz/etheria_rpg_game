import { formatInteger } from '../../lib/formatters';

interface CurrencyAmountProps {
  value: string | number | bigint;
  compact?: boolean;
}

export function CurrencyAmount({ value, compact = false }: CurrencyAmountProps) {
  return (
    <span className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap" aria-label={`${formatInteger(value)} monet`}>
      <span className={compact ? 'currency-coin currency-coin-small' : 'currency-coin'} aria-hidden="true"><span /></span>
      <span className={`game-number ${compact ? 'text-[0.8rem]' : ''}`}>{formatInteger(value)}</span>
    </span>
  );
}
