import type { Item } from '../../types/game';

const rarityLabels: Record<Item['rarity'], string> = {
  COMMON: 'Zwykły',
  UNCOMMON: 'Niezwykły',
  RARE: 'Rzadki',
  EPIC: 'Epicki',
  LEGENDARY: 'Relikt',
};

export function RarityBadge({ rarity }: { rarity: Item['rarity'] }) {
  return <span className={`rarity-badge rarity-${rarity.toLowerCase()}`}>{rarityLabels[rarity]}</span>;
}
