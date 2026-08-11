import { ItemIcon } from '../../components/ui/ItemIcon';
import type { EquippedEntry } from '../../types/game';
import { equipmentSlots } from './equipment-slots';
import type { BackpackSelection } from './backpack.types';

interface EquipmentGridProps {
  equipment: EquippedEntry[];
  selected: BackpackSelection | null;
  onSelect: (selection: BackpackSelection) => void;
}

export function EquipmentGrid({ equipment, selected, onSelect }: EquipmentGridProps) {
  return (
    <div className="backpack-equipment-grid">
      {equipmentSlots.map((slot) => {
        const entry = equipment.find((item) => item.slot === slot.id);
        const active = entry && selected?.kind === 'EQUIPPED' && selected.entry.ownedItemId === entry.ownedItemId;
        const rarity = entry?.item.rarity.toLowerCase() ?? 'empty';
        return (
          <button
            type="button"
            key={slot.id}
            disabled={!entry}
            className={`backpack-equipment-slot backpack-slot-${rarity} ${active ? 'active' : ''}`}
            onClick={() => entry && onSelect({ kind: 'EQUIPPED', entry })}
            title={entry ? `${slot.label}: ${entry.item.name}` : `${slot.label}: puste`}
          >
            {entry ? <ItemIcon item={entry.item} /> : <span>{slot.label.slice(0, 2).toUpperCase()}</span>}
            <small>{slot.label}</small>
            {entry?.enhancementLevel ? <b>+{entry.enhancementLevel}</b> : null}
          </button>
        );
      })}
    </div>
  );
}
