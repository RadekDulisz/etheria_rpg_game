import type { EquippedEntry, GemStack, InventoryEntry } from '../../types/game';

export type BackpackCategory = 'ALL' | 'WEAPON' | 'ARMOR' | 'JEWELRY' | 'SPECIAL' | 'GEM';
export type BackpackSort = 'NEWEST' | 'NAME' | 'LEVEL' | 'RARITY' | 'VALUE' | 'ENHANCEMENT';
export type BackpackIconSize = 'SMALL' | 'LARGE';

export type BackpackSelection =
  | { kind: 'ITEM'; entry: InventoryEntry }
  | { kind: 'GEM'; entry: GemStack }
  | { kind: 'EQUIPPED'; entry: EquippedEntry };

export const BACKPACK_CATEGORY_LABELS: Record<BackpackCategory, string> = {
  ALL: 'Wszystko',
  WEAPON: 'Broń',
  ARMOR: 'Pancerz',
  JEWELRY: 'Biżuteria',
  SPECIAL: 'Dodatki',
  GEM: 'Klejnoty',
};
