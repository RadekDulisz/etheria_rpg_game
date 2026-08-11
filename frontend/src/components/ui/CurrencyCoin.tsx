interface CurrencyCoinProps {
  compact?: boolean;
  className?: string;
}

export function CurrencyCoin({ compact = false, className = '' }: CurrencyCoinProps) {
  return (
    <span
      className={`currency-coin ${compact ? 'currency-coin-small' : ''} ${className}`.trim()}
      aria-hidden="true"
    >
      <span className="currency-coin-gem" />
    </span>
  );
}
