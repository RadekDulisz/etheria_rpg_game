import { GemIcon } from '../../components/ui/GemIcon';
import { ItemIcon } from '../../components/ui/ItemIcon';
import type { GemStack, InventoryEntry } from '../../types/game';
import type { BackpackIconSize, BackpackSelection } from './backpack.types';

interface BackpackGridProps {
  items: InventoryEntry[];
  gems: GemStack[];
  iconSize: BackpackIconSize;
  selected: BackpackSelection | null;
  onSelect: (selection: BackpackSelection) => void;
}

export function BackpackGrid({ items, gems, iconSize, selected, onSelect }: BackpackGridProps) {
  if (!items.length && !gems.length) {
    return <div className="backpack-grid-empty"><strong>Brak wyników</strong><span>Zmień wyszukiwanie lub wybrane filtry.</span></div>;
  }

  return (
    <div className={`backpack-grid backpack-grid-${iconSize.toLowerCase()}`}>
      {items.map((entry) => {
        const rarity = entry.item.rarity.toLowerCase();
        const active = selected?.kind === 'ITEM' && selected.entry.id === entry.id;
        return (
          <button type="button" key={entry.id} className={`backpack-slot backpack-slot-${rarity} ${active ? 'active' : ''}`} onClick={() => onSelect({ kind: 'ITEM', entry })}>
            <span className="backpack-slot-art"><ItemIcon item={entry.item} /></span>
            {entry.enhancementLevel > 0 ? <b className="backpack-slot-enhancement">+{entry.enhancementLevel}</b> : null}
            {entry.unlockedSockets > 0 ? <i className="backpack-slot-sockets">{entry.unlockedSockets}◇</i> : null}
            <span className="backpack-slot-grade">{entry.item.grade === 'NO_GRADE' ? 'N' : entry.item.grade.slice(0, 2)}</span>
            <span className="backpack-slot-tooltip"><strong>{entry.item.name}</strong><small>{entry.item.rarity} · poziom {entry.item.minLevel}</small></span>
          </button>
        );
      })}
      {gems.map((stack) => {
        const active = selected?.kind === 'GEM' && selected.entry.gemDefinitionId === stack.gemDefinitionId;
        return (
          <button type="button" key={stack.gemDefinitionId} className={`backpack-slot backpack-slot-gem gem-${stack.gemDefinition.family.toLowerCase()} ${active ? 'active' : ''}`} onClick={() => onSelect({ kind: 'GEM', entry: stack })}>
            <span className="backpack-slot-art"><GemIcon gem={stack.gemDefinition} /></span>
            <b className="backpack-slot-quantity">×{stack.quantity}</b>
            <span className="backpack-slot-grade">{stack.gemDefinition.tier.slice(0, 2)}</span>
            <span className="backpack-slot-tooltip"><strong>{stack.gemDefinition.name}</strong><small>Klejnot · ×{stack.quantity}</small></span>
          </button>
        );
      })}
    </div>
  );
}
