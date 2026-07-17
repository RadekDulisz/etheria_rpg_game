import type { Item } from '../../types/game';

export function ItemIcon({ item, className = '' }: { item: Item; className?: string }) {
  if (item.slotGroup === 'SHIRT') {
    return <span className={`item-icon item-icon-shirt item-icon-shirt-${item.grade.toLowerCase()} ${className}`} />;
  }
  if (item.slotGroup === 'LOWER_BODY') {
    return <span className={`item-icon item-icon-legs item-icon-grade-${item.grade.toLowerCase()} item-icon-rarity-${item.rarity.toLowerCase()} ${className}`} />;
  }
  if (item.iconUrl?.startsWith('relic:')) {
    const relic = item.iconUrl.slice('relic:'.length);
    return <span className={`item-icon item-icon-relic item-icon-relic-${relic} ${className}`} />;
  }
  if (item.iconUrl) {
    return <img className={`item-icon-image ${className}`} src={item.iconUrl} alt="" />;
  }

  const atlas = item.grade === 'NO_GRADE' ? 'novice' : 'standard';
  return <span className={`item-icon item-icon-${atlas} item-icon-${iconKey(item)} item-icon-grade-${item.grade.toLowerCase()} item-icon-rarity-${item.rarity.toLowerCase()} ${className}`} />;
}

function iconKey(item: Item): string {
  if (item.weaponType) return item.weaponType.toLowerCase();
  switch (item.slotGroup) {
    case 'SHIELD_SIGIL': return 'shield';
    case 'HELM': return 'helm';
    case 'UPPER_BODY': case 'LOWER_BODY': return 'armor';
    case 'GLOVES': return 'gloves';
    case 'BOOTS': return 'boots';
    case 'CLOAK': return 'cloak';
    case 'NECKLACE': return 'necklace';
    case 'EARRING': return 'earring';
    case 'RING': return 'ring';
    case 'BELT': case 'BRACELET': return 'bracelet';
    case 'BROOCH': case 'HAIR_ACCESSORY': return 'brooch';
    default: return 'armor';
  }
}
