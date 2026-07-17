import type { EquipmentSlot } from '../../types/game';

export interface EquipmentSlotDefinition {
  id: EquipmentSlot;
  label: string;
}

export const equipmentSlots: EquipmentSlotDefinition[] = [
  { id: 'HELM', label: 'Hełm' },
  { id: 'UPPER_BODY', label: 'Napierśnik' },
  { id: 'LOWER_BODY', label: 'Nogawice' },
  { id: 'GLOVES', label: 'Rękawice' },
  { id: 'BOOTS', label: 'Buty' },
  { id: 'CLOAK', label: 'Płaszcz' },
  { id: 'SHIRT', label: 'Koszula' },
  { id: 'WEAPON', label: 'Broń' },
  { id: 'SHIELD_SIGIL', label: 'Druga ręka' },
  { id: 'NECKLACE', label: 'Naszyjnik' },
  { id: 'EARRING_1', label: 'Kolczyk I' },
  { id: 'EARRING_2', label: 'Kolczyk II' },
  { id: 'RING_1', label: 'Pierścień I' },
  { id: 'RING_2', label: 'Pierścień II' },
  { id: 'BELT', label: 'Pas' },
  { id: 'BRACELET', label: 'Bransoleta' },
  { id: 'BROOCH', label: 'Brosza' },
  { id: 'HAIR_ACCESSORY', label: 'Ozdoba włosów' },
];

const compatibleSlots: Record<string, EquipmentSlot[]> = {
  WEAPON: ['WEAPON'],
  SHIELD_SIGIL: ['SHIELD_SIGIL'],
  HELM: ['HELM'],
  UPPER_BODY: ['UPPER_BODY'],
  LOWER_BODY: ['LOWER_BODY'],
  GLOVES: ['GLOVES'],
  BOOTS: ['BOOTS'],
  CLOAK: ['CLOAK'],
  SHIRT: ['SHIRT'],
  NECKLACE: ['NECKLACE'],
  EARRING: ['EARRING_1', 'EARRING_2'],
  RING: ['RING_1', 'RING_2'],
  BELT: ['BELT'],
  BRACELET: ['BRACELET'],
  BROOCH: ['BROOCH'],
  HAIR_ACCESSORY: ['HAIR_ACCESSORY'],
};

export function getCompatibleSlots(slotGroup: string | null): EquipmentSlot[] {
  return slotGroup ? compatibleSlots[slotGroup] ?? [] : [];
}

export function getEquipmentSlotLabel(slot: string): string {
  return equipmentSlots.find((definition) => definition.id === slot)?.label ?? slot;
}
