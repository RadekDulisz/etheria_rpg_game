import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { unequipItem } from '../../api/inventory.api';
import { ActionToast } from '../../components/ui/ActionToast';
import { GamePanel } from '../../components/ui/GamePanel';
import { SectionTitle } from '../../components/ui/SectionTitle';
import { WeaponExpertiseProgress } from '../../components/ui/WeaponExpertiseProgress';
import { getChestAppearance } from '../../lib/hero-appearance';
import type { Character, EquipmentSlot, EquippedEntry } from '../../types/game';
import { BackpackDetails } from './BackpackDetails';
import { CharacterEquipmentSlot } from './CharacterEquipmentSlot';
import { equipmentSlots } from './equipment-slots';
import type { BackpackSelection } from './backpack.types';

interface CharacterViewProps {
  character: Character;
  equipment: EquippedEntry[];
  onOpenBlacksmith: () => void;
}

export function CharacterView({ character, equipment, onOpenBlacksmith }: CharacterViewProps) {
  const queryClient = useQueryClient();
  const [selection, setSelection] = useState<BackpackSelection | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const equippedBySlot = useMemo(() => new Map(equipment.map((entry) => [entry.slot, entry])), [equipment]);
  const left = equipmentSlots.slice(0, 9);
  const right = equipmentSlots.slice(9);
  const appearance = getChestAppearance(equipment);

  const unequipMutation = useMutation({
    mutationFn: (entry: EquippedEntry) => unequipItem(entry.slot as EquipmentSlot),
    onSuccess: async (_, entry) => {
      setNotice(`Zdjęto: ${entry.item.name}.`);
      setSelection(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['inventory'] }),
        queryClient.invalidateQueries({ queryKey: ['equipment'] }),
        queryClient.invalidateQueries({ queryKey: ['character', 'me'] }),
        queryClient.invalidateQueries({ queryKey: ['blacksmith'] }),
        queryClient.invalidateQueries({ queryKey: ['arena', 'opponent'] }),
      ]);
    },
  });

  function selectEntry(entry: EquippedEntry) {
    setSelection({ kind: 'EQUIPPED', entry });
    unequipMutation.reset();
  }

  return (
    <div className="view-enter character-loadout-view">
      <SectionTitle eyebrow="Karta bohatera" title="Wyposażenie postaci" description="Przejrzyj każdy element rynsztunku, osadzone klejnoty i premie tworzące aktualny zestaw bohatera." />
      {notice ? <ActionToast onDismiss={() => setNotice(null)}>{notice}</ActionToast> : null}

      <div className="character-loadout-layout">
        <section className="character-loadout-stage">
          <header className="character-loadout-heading"><h2>Sylwetka bohatera</h2></header>

          <div className="character-loadout-board">
            <div className="character-loadout-column character-loadout-column-left">
              {left.map((slot) => {
                const entry = equippedBySlot.get(slot.id);
                return <CharacterEquipmentSlot key={slot.id} slot={slot} entry={entry} side="left" active={Boolean(entry && selection?.kind === 'EQUIPPED' && selection.entry.ownedItemId === entry.ownedItemId)} onSelect={selectEntry} />;
              })}
            </div>

            <div className="character-loadout-figure">
              <span className="ornament-corner ornament-corner-tl" /><span className="ornament-corner ornament-corner-tr" />
              <span className="ornament-corner ornament-corner-bl" /><span className="ornament-corner ornament-corner-br" />
              <div className="character-loadout-aura" aria-hidden="true" />
              <img src={appearance.paperDollAsset} alt={`Sylwetka bohatera ${character.name}`} />
              <footer><strong>{character.name}</strong><span>{character.reputationRank}</span></footer>
            </div>

            <div className="character-loadout-column character-loadout-column-right">
              {right.map((slot) => {
                const entry = equippedBySlot.get(slot.id);
                return <CharacterEquipmentSlot key={slot.id} slot={slot} entry={entry} side="right" active={Boolean(entry && selection?.kind === 'EQUIPPED' && selection.entry.ownedItemId === entry.ownedItemId)} onSelect={selectEntry} />;
              })}
            </div>
          </div>
        </section>

        <aside className={`character-loadout-details backpack-side-pane ${selection ? 'has-selection' : ''}`}>
          <header><span>SZCZEGÓŁY RYNSZTUNKU</span><h2>Wybrany przedmiot</h2></header>
          <BackpackDetails
            selection={selection} equipment={equipment} characterStats={character.stats}
            busy={unequipMutation.isPending} error={unequipMutation.error}
            onSlot={() => undefined} onEquip={() => undefined} onSell={() => undefined}
            onUnequip={() => selection?.kind === 'EQUIPPED' && unequipMutation.mutate(selection.entry)}
            onDismissError={() => unequipMutation.reset()} onOpenBlacksmith={onOpenBlacksmith} onClose={() => setSelection(null)}
          />
        </aside>
      </div>

      <GamePanel className="mt-4 character-expertise-panel" title="Biegłość broni" eyebrow="Każdy rodzaj rozwija się niezależnie">
        <div className="weapon-expertise-grid">
          {character.weaponExpertise.map((entry) => <WeaponExpertiseProgress key={entry.weaponType} expertise={entry} />)}
        </div>
      </GamePanel>
    </div>
  );
}
