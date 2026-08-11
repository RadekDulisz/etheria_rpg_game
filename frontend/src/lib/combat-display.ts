export const CRIT_PERCENT_PER_ITEM_POINT = 0.35;
export const MAX_CRIT_PERCENT = 50;
export const PARRY_PERCENT_PER_ITEM_POINT = 0.4;
export const MAX_PARRY_PERCENT = 30;

const percentFormatter = new Intl.NumberFormat('pl-PL', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatSignedPercent(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  if (rounded > 0) return `+${percentFormatter.format(rounded)}%`;
  if (rounded < 0) return `−${percentFormatter.format(Math.abs(rounded))}%`;
  return '0%';
}

export function itemCritPercent(criticalChanceBonus: number): number {
  return criticalChanceBonus * CRIT_PERCENT_PER_ITEM_POINT;
}

export function itemParryPercent(parryBonus: number): number {
  return parryBonus * PARRY_PERCENT_PER_ITEM_POINT;
}
