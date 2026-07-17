interface AdjustedStatValueProps {
  value: number | string;
  equipmentBonus?: number;
}

export function AdjustedStatValue({ value, equipmentBonus = 0 }: AdjustedStatValueProps) {
  return (
    <span className="adjusted-stat-value">
      {equipmentBonus !== 0 ? (
        <span className={`equipment-stat-bonus ${equipmentBonus > 0 ? 'equipment-stat-bonus-positive' : 'equipment-stat-bonus-negative'}`}>
          ({equipmentBonus > 0 ? '+' : ''}{equipmentBonus})
        </span>
      ) : null}
      <span>{value}</span>
    </span>
  );
}
