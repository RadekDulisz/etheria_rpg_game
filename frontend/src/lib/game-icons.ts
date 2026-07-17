import type { Item } from '../types/game';

export type GameIconName =
  | 'strength' | 'agility' | 'endurance' | 'intelligence'
  | 'attack' | 'defense' | 'critical' | 'parry' | 'points'
  | 'level' | 'experience' | 'gold' | 'reputation'
  | 'weapons' | 'armor' | 'jewelry' | 'special';

export function itemCategoryIcon(item: Pick<Item, 'category' | 'slotGroup'>): GameIconName {
  if (item.category === 'WEAPON') return 'weapons';
  if (item.category === 'ACCESSORY') return 'jewelry';
  if (item.category === 'SPECIAL' || item.slotGroup === 'CLOAK') return 'special';
  return 'armor';
}
