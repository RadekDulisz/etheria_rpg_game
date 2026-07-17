import { formatItemType } from '../../lib/formatters';
import { ItemIcon } from '../../components/ui/ItemIcon';
import { ItemStats } from '../../components/ui/ItemStats';
import { GradeBadge } from '../../components/ui/GradeBadge';
import type { EquippedEntry } from '../../types/game';

interface EquipmentSlotProps {
  label: string;
  entry?: EquippedEntry;
}

export function EquipmentSlot({ label, entry }: EquipmentSlotProps) {
  const rarity = entry?.item.rarity.toLowerCase();
  return (
    <div className={`equipment-slot ${entry ? `equipment-slot-filled equipment-slot-rarity-${rarity}` : ''}`}>
      <span className={`equipment-slot-gem ${rarity ? `rarity-gem rarity-gem-${rarity}` : ''}`} aria-hidden="true">{entry ? <ItemIcon item={entry.item} /> : null}</span>
      <div className="equipment-slot-content">
        <div className="min-w-0 equipment-slot-copy">
          <p className="text-[0.55rem] uppercase tracking-[0.16em] text-amber-500/55">{label}</p>
        {entry ? (
          <>
            <p className="mt-1 truncate text-xs text-stone-200" title={entry.item.name}>{entry.item.name}</p>
            <p className="mt-0.5 text-[0.58rem] text-stone-600">{formatItemType(entry.item)}</p>
          </>
        ) : <p className="mt-1 text-xs text-stone-600">Puste miejsce</p>}
        </div>
        {entry ? (
          <div className="equipment-slot-properties">
            <GradeBadge grade={entry.item.grade} />
            <ItemStats item={entry.item} compact />
          </div>
        ) : null}
      </div>
    </div>
  );
}
