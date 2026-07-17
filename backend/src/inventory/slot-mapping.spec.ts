import { EquipmentSlot, SlotGroup } from '@prisma/client';
import { isSlotCompatible } from './slot-mapping';

describe('isSlotCompatible', () => {
  it('pozwala zalozyc pierscionek w RING_1 i RING_2', () => {
    expect(isSlotCompatible(SlotGroup.RING, EquipmentSlot.RING_1)).toBe(true);
    expect(isSlotCompatible(SlotGroup.RING, EquipmentSlot.RING_2)).toBe(true);
  });

  it('nie pozwala zalozyc pierscionka w slocie helmu', () => {
    expect(isSlotCompatible(SlotGroup.RING, EquipmentSlot.HELM)).toBe(false);
  });

  it('sloty pojedyncze (np. BELT) mapuja sie 1:1', () => {
    expect(isSlotCompatible(SlotGroup.BELT, EquipmentSlot.BELT)).toBe(true);
    expect(isSlotCompatible(SlotGroup.BELT, EquipmentSlot.BRACELET)).toBe(false);
  });

  it('bron pasuje wylacznie do slotu WEAPON', () => {
    expect(isSlotCompatible(SlotGroup.WEAPON, EquipmentSlot.WEAPON)).toBe(true);
    expect(isSlotCompatible(SlotGroup.WEAPON, EquipmentSlot.SHIELD_SIGIL)).toBe(false);
  });
});
