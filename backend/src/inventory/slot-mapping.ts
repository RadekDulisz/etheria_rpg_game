import { EquipmentSlot, SlotGroup } from '@prisma/client';

/**
 * Ktore konkretne, fizyczne sloty (EquipmentSlot) akceptuja dany ogolny
 * typ przedmiotu (SlotGroup). Wiekszosc typow mapuje sie 1:1, poza
 * kolczykami i pierscionkami, ktore maja dwie fizyczne instancje - gracz
 * wybiera, do ktorej z nich trafia przedmiot (patrz docs/erd-02...md).
 */
export const SLOT_GROUP_TO_SLOTS: Record<SlotGroup, EquipmentSlot[]> = {
  WEAPON: [EquipmentSlot.WEAPON],
  SHIELD_SIGIL: [EquipmentSlot.SHIELD_SIGIL],
  HELM: [EquipmentSlot.HELM],
  UPPER_BODY: [EquipmentSlot.UPPER_BODY],
  LOWER_BODY: [EquipmentSlot.LOWER_BODY],
  GLOVES: [EquipmentSlot.GLOVES],
  BOOTS: [EquipmentSlot.BOOTS],
  CLOAK: [EquipmentSlot.CLOAK],
  SHIRT: [EquipmentSlot.SHIRT],
  NECKLACE: [EquipmentSlot.NECKLACE],
  EARRING: [EquipmentSlot.EARRING_1, EquipmentSlot.EARRING_2],
  RING: [EquipmentSlot.RING_1, EquipmentSlot.RING_2],
  BELT: [EquipmentSlot.BELT],
  BRACELET: [EquipmentSlot.BRACELET],
  BROOCH: [EquipmentSlot.BROOCH],
  HAIR_ACCESSORY: [EquipmentSlot.HAIR_ACCESSORY],
};

export function isSlotCompatible(slotGroup: SlotGroup, slot: EquipmentSlot): boolean {
  return SLOT_GROUP_TO_SLOTS[slotGroup].includes(slot);
}
