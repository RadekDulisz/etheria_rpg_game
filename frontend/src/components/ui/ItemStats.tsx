import type { Item } from '../../types/game';

interface ItemStatsProps {
  item: Item;
  compact?: boolean;
}

export function ItemStats({ item, compact = false }: ItemStatsProps) {
  const stats: Array<[string, string]> = [];

  if (item.damageMax > 0) stats.push(['Obrażenia', `${item.damageMin}–${item.damageMax}`]);
  if (item.attackPower > 0) stats.push(['Atak', String(item.attackPower)]);
  if (item.defensePower > 0) stats.push(['Obrona', String(item.defensePower)]);
  if (item.strengthBonus !== 0) stats.push(['Siła', signed(item.strengthBonus)]);
  if (item.agilityBonus !== 0) stats.push(['Zręczność', signed(item.agilityBonus)]);
  if (item.enduranceBonus !== 0) stats.push(['Wytrzymałość', signed(item.enduranceBonus)]);
  if (item.intelligenceBonus !== 0) stats.push(['Inteligencja', signed(item.intelligenceBonus)]);
  if (item.maxHpBonus !== 0) stats.push(['Punkty życia', `${signed(item.maxHpBonus)} HP`]);
  if (item.parryBonus !== 0) stats.push(['Parowanie', signed(item.parryBonus)]);
  if (item.criticalChanceBonus !== 0) stats.push(['Trafienie krytyczne', `${signed(item.criticalChanceBonus)}%`]);

  return (
    <dl className={`item-stats ${compact ? 'item-stats-compact' : ''}`}>
      {stats.length ? stats.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd className="game-number">{value}</dd>
        </div>
      )) : <div><dt>Właściwości</dt><dd>Brak</dd></div>}
    </dl>
  );
}

function signed(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}
