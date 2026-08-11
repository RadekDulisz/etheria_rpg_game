import { ActionBubble } from '../../components/ui/ActionBubble';
import { Button } from '../../components/ui/Button';
import { CurrencyAmount } from '../../components/ui/CurrencyAmount';
import { GemIcon } from '../../components/ui/GemIcon';
import { GradeBadge } from '../../components/ui/GradeBadge';
import { ItemComparison } from '../../components/ui/ItemComparison';
import { ItemIcon } from '../../components/ui/ItemIcon';
import { ItemStats } from '../../components/ui/ItemStats';
import { getApiErrorMessage } from '../../lib/api-errors';
import type { CharacterStats, EquipmentSlot, EquippedEntry } from '../../types/game';
import { getCompatibleSlots, getEquipmentSlotLabel } from './equipment-slots';
import { GEM_FAMILY_LABELS, GEM_TIER_LABELS, gemEffects } from './gem-display';
import type { BackpackSelection } from './backpack.types';

interface BackpackDetailsProps {
  selection: BackpackSelection | null;
  equipment: EquippedEntry[];
  characterStats: CharacterStats | null;
  selectedSlot?: EquipmentSlot;
  busy: boolean;
  error: unknown;
  onSlot: (slot: EquipmentSlot) => void;
  onEquip: () => void;
  onUnequip: () => void;
  onSell: () => void;
  onDismissError: () => void;
  onOpenBlacksmith: () => void;
  onClose: () => void;
}

export function BackpackDetails(props: BackpackDetailsProps) {
  const { selection } = props;
  if (!selection) {
    return <div className="backpack-details-empty"><span>◇</span><strong>Wybierz przedmiot</strong><p>Kliknij ikonę w plecaku lub wyposażeniu, aby zobaczyć pełne informacje.</p></div>;
  }

  if (selection.kind === 'GEM') {
    const { gemDefinition: gem, quantity } = selection.entry;
    return (
      <article className={`backpack-details gem-${gem.family.toLowerCase()}`}>
        <button type="button" className="backpack-details-close" onClick={props.onClose} aria-label="Zamknij szczegóły">×</button>
        <header className="backpack-details-header backpack-details-gem-header">
          <div className="backpack-details-icon"><GemIcon gem={gem} /></div>
          <div><small>KLEJNOT · ×{quantity}</small><h3>{gem.name}</h3><p>{GEM_FAMILY_LABELS[gem.family]} · {GEM_TIER_LABELS[gem.tier]}</p></div>
        </header>
        <section className="backpack-gem-effects">
          <span>Działanie po osadzeniu</span>
          {gemEffects(gem).map((effect) => <p key={effect}>{effect}</p>)}
        </section>
        <p className="backpack-details-lore">Klejnot nie zajmuje miejsca wyposażenia. Można go osadzić wyłącznie w odblokowanym gnieździe przedmiotu.</p>
        <Button fullWidth onClick={props.onOpenBlacksmith}>Przejdź do kowala</Button>
      </article>
    );
  }

  const equipped = selection.kind === 'EQUIPPED';
  const entry = selection.entry;
  const item = entry.item;
  const slots = getCompatibleSlots(item.slotGroup);
  const salePrice = Math.max(1, Math.floor(item.price * .3));
  const sellable = item.price > 0;
  return (
    <article className={`backpack-details backpack-details-${item.rarity.toLowerCase()}`}>
      <button type="button" className="backpack-details-close" onClick={props.onClose} aria-label="Zamknij szczegóły">×</button>
      <header className="backpack-details-header">
        <div className={`backpack-details-icon rarity-gem rarity-gem-${item.rarity.toLowerCase()} backpack-slot-${item.rarity.toLowerCase()}`}><ItemIcon item={item} /></div>
        <div>
          <small>{equipped ? getEquipmentSlotLabel((entry as EquippedEntry).slot) : 'PRZEDMIOT W PLECAKU'}</small>
          <h3>{item.name}{entry.enhancementLevel ? ` +${entry.enhancementLevel}` : ''}</h3>
          <GradeBadge grade={item.grade} />
          <p>{item.category} · wymagany poziom {item.minLevel}</p>
        </div>
      </header>

      <ItemStats item={item} />

      {entry.socketCapacity > 0 ? (
        <section className="backpack-details-sockets">
          <span>Gniazda {entry.unlockedSockets}/{entry.socketCapacity}</span>
          <div>{Array.from({ length: entry.socketCapacity }, (_, position) => {
            const gem = entry.sockets.find((socket) => socket.position === position)?.gemDefinition;
            return <i key={position} className={gem ? `gem-${gem.family.toLowerCase()}` : ''} title={gem?.name ?? (position < entry.unlockedSockets ? 'Puste gniazdo' : 'Zamknięte gniazdo')}>{gem ? <GemIcon gem={gem} compact /> : position < entry.unlockedSockets ? '◇' : '×'}</i>;
          })}</div>
        </section>
      ) : null}

      {!equipped ? <ItemComparison item={item} equipment={props.equipment} characterStats={props.characterStats} /> : null}
      {props.error ? <div className="action-feedback-anchor"><ActionBubble onDismiss={props.onDismissError}>{getApiErrorMessage(props.error)}</ActionBubble></div> : null}

      <footer className="backpack-details-actions">
        {equipped ? (
          <Button variant="secondary" fullWidth disabled={props.busy} onClick={props.onUnequip}>{props.busy ? 'Zdejmowanie…' : 'Zdejmij'}</Button>
        ) : (
          <>
            {slots.length > 1 ? (
              <select value={props.selectedSlot ?? slots[0]} onChange={(event) => props.onSlot(event.target.value as EquipmentSlot)}>
                {slots.map((slot) => <option key={slot} value={slot}>{getEquipmentSlotLabel(slot)}</option>)}
              </select>
            ) : null}
            {slots.length ? <Button disabled={props.busy} onClick={props.onEquip}>{props.busy ? 'Zakładanie…' : 'Załóż'}</Button> : null}
            {sellable ? <Button variant="secondary" disabled={props.busy} onClick={props.onSell}><span className="inline-flex items-center gap-2">Sprzedaj <CurrencyAmount value={salePrice} compact /></span></Button> : <span className="backpack-story-keepsake">Pamiątka fabularna · niezbywalna</span>}
          </>
        )}
      </footer>
    </article>
  );
}
