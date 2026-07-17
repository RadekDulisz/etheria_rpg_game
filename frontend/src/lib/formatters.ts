import type { Item } from '../types/game';

const integerFormatter = new Intl.NumberFormat('pl-PL');

export function formatInteger(value: string | number | bigint): string {
  return integerFormatter.format(BigInt(value));
}

const itemCategoryLabels: Record<string, string> = {
  WEAPON: 'Broń',
  SHIELD_SIGIL: 'Tarcza lub sigil',
  ARMOR: 'Pancerz',
  ACCESSORY: 'Biżuteria',
  SPECIAL: 'Przedmiot specjalny',
};

export function formatItemCategory(category: string): string {
  return itemCategoryLabels[category] ?? category;
}

export function formatItemType(item: Pick<Item, 'category' | 'name'>): string {
  if (item.category !== 'SHIELD_SIGIL') return formatItemCategory(item.category);
  return item.name.toLocaleLowerCase('pl-PL').includes('sigil') ? 'Sigil' : 'Tarcza';
}
