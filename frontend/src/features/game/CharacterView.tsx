import { useMemo } from 'react';
import type { Character, EquippedEntry } from '../../types/game';
import { SectionTitle } from '../../components/ui/SectionTitle';
import { EquipmentSlot } from './EquipmentSlot';
import { equipmentSlots } from './equipment-slots';
import { getChestAppearance } from '../../lib/hero-appearance';

interface CharacterViewProps {
  character: Character;
  equipment: EquippedEntry[];
}

export function CharacterView({ character, equipment }: CharacterViewProps) {
  const equippedBySlot = useMemo(() => new Map(equipment.map((entry) => [entry.slot, entry])), [equipment]);
  const left = equipmentSlots.slice(0, 9);
  const right = equipmentSlots.slice(9);
  const appearance = getChestAppearance(equipment);

  return (
    <div className="view-enter">
      <SectionTitle eyebrow="Karta bohatera" title="Wyposażenie postaci" description="Przejrzyj założone przedmioty i sprawdź, jakie premie zapewniają bohaterowi." />
      <div className="grid gap-4 lg:grid-cols-[minmax(150px,1fr)_minmax(220px,0.8fr)_minmax(150px,1fr)] lg:items-start">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">{left.map((slot) => <EquipmentSlot key={slot.id} label={slot.label} entry={equippedBySlot.get(slot.id)} />)}</div>
        <div className="character-stage">
          <span className="ornament-corner ornament-corner-tl" /><span className="ornament-corner ornament-corner-tr" /><span className="ornament-corner ornament-corner-bl" /><span className="ornament-corner ornament-corner-br" />
          <div className="character-paper-doll" aria-hidden="true"><img src={appearance.paperDollAsset} alt="" /></div>
          <p className="relative mt-4 text-center text-xl text-amber-100 fantasy-title">{character.name}</p>
          <p className="relative mt-1 text-center text-[0.68rem] uppercase tracking-[0.16em] text-stone-500">Poziom <span className="game-number text-stone-400">{character.level}</span></p>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">{right.map((slot) => <EquipmentSlot key={slot.id} label={slot.label} entry={equippedBySlot.get(slot.id)} />)}</div>
      </div>
    </div>
  );
}
