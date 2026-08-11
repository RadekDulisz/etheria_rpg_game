import { ItemIcon } from '../../components/ui/ItemIcon';
import type { EquippedEntry } from '../../types/game';
import type { EquipmentSlotDefinition } from './equipment-slots';

interface CharacterEquipmentSlotProps {
  slot: EquipmentSlotDefinition;
  entry?: EquippedEntry;
  side: 'left' | 'right';
  active: boolean;
  onSelect: (entry: EquippedEntry) => void;
}

export function CharacterEquipmentSlot({ slot, entry, side, active, onSelect }: CharacterEquipmentSlotProps) {
  const rarity = entry?.item.rarity.toLowerCase() ?? 'empty';
  return (
    <button
      type="button"
      disabled={!entry}
      className={`character-loadout-slot character-loadout-slot-${side} backpack-slot-${rarity} ${active ? 'active' : ''}`}
      onClick={() => entry && onSelect(entry)}
    >
      <span className="character-loadout-slot-label"><small>{slot.label}</small><strong>{entry?.item.name ?? 'Puste'}</strong></span>
      <span className="character-loadout-slot-icon">
        {entry ? <ItemIcon item={entry.item} /> : <i>{slot.label.slice(0, 2).toUpperCase()}</i>}
        {entry?.enhancementLevel ? <b>+{entry.enhancementLevel}</b> : null}
        {entry?.unlockedSockets ? <em>{entry.unlockedSockets}◇</em> : null}
      </span>
    </button>
  );
}
