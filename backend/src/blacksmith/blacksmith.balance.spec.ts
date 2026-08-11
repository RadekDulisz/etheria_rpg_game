import { GemFamily, GemTier, ItemGrade, ItemRarity, SlotGroup } from '@prisma/client';
import {
  calculateSocketUnlockCost,
  calculateUpgradeChance,
  calculateUpgradeCost,
  enhancementCapForGrade,
  gemBonuses,
  initialSocketState,
  resolveOwnedItemStats,
} from './blacksmith.balance';

describe('blacksmith balance', () => {
  it('ogranicza ulepszenie rangą przedmiotu zamiast poziomem bohatera', () => {
    expect(enhancementCapForGrade(ItemGrade.NO_GRADE)).toBe(3);
    expect(enhancementCapForGrade(ItemGrade.D)).toBe(4);
    expect(enhancementCapForGrade(ItemGrade.S)).toBe(8);
    expect(enhancementCapForGrade(ItemGrade.ANCIENT)).toBe(10);
  });

  it('skaluje koszty i ochronę przed pechem', () => {
    expect(calculateUpgradeCost(100, 1)).toBe(25n);
    expect(calculateUpgradeCost(100, 10)).toBe(900n);
    expect(calculateUpgradeChance(8, 0)).toBe(0.55);
    expect(calculateUpgradeChance(8, 3)).toBeCloseTo(0.85);
    expect(calculateUpgradeChance(10, 10)).toBe(1);
  });

  it('nigdy nie przekracza pojemności wynikającej z rzadkości', () => {
    expect(initialSocketState({ rarity: ItemRarity.COMMON, slotGroup: SlotGroup.WEAPON }, () => 0)).toEqual({ socketCapacity: 1, unlockedSockets: 1 });
    expect(initialSocketState({ rarity: ItemRarity.LEGENDARY, slotGroup: SlotGroup.UPPER_BODY }, () => 0)).toEqual({ socketCapacity: 3, unlockedSockets: 3 });
    expect(initialSocketState({ rarity: ItemRarity.LEGENDARY, slotGroup: SlotGroup.RING }, () => 0)).toEqual({ socketCapacity: 0, unlockedSockets: 0 });
  });

  it('rozróżnia działanie klejnotu według rodzaju wyposażenia', () => {
    expect(gemBonuses(GemFamily.RUBY, GemTier.CUT, SlotGroup.WEAPON)).toEqual(expect.objectContaining({ attackPower: 2, damageMin: 2, damageMax: 2, maxHpBonus: 0 }));
    expect(gemBonuses(GemFamily.RUBY, GemTier.CUT, SlotGroup.UPPER_BODY)).toEqual(expect.objectContaining({ attackPower: 0, maxHpBonus: 8 }));
    expect(gemBonuses(GemFamily.EMERALD, GemTier.FLAWLESS, SlotGroup.SHIELD_SIGIL)).toEqual(expect.objectContaining({ parryBonus: 3, agilityBonus: 0 }));
  });

  it('ulepsza bazową broń i dopiero potem dodaje klejnot', () => {
    const item = {
      id: 'sword', name: 'Miecz', description: null, category: 'WEAPON',
      rarity: ItemRarity.RARE, grade: 'NO_GRADE', slotGroup: SlotGroup.WEAPON,
      weaponType: 'SWORD', maxStack: 1, price: 100, iconUrl: null, minLevel: 1,
      strengthBonus: 0, agilityBonus: 0, enduranceBonus: 0, intelligenceBonus: 0,
      attackPower: 20, damageMin: 10, damageMax: 20, defensePower: 0,
      parryBonus: 0, maxHpBonus: 0, criticalChanceBonus: 0,
      createdAt: new Date(0), updatedAt: new Date(0),
    } as any;
    const gem = { id: 'ruby', family: GemFamily.RUBY, tier: GemTier.SHARD, name: 'Rubin', minLevel: 1 } as any;
    const resolved = resolveOwnedItemStats({
      id: 'owned', combatantId: 'combatant', itemId: item.id,
      enhancementLevel: 10, socketCapacity: 1, unlockedSockets: 1, forgeFailStack: 0,
      createdAt: new Date(0), updatedAt: new Date(0), item,
      sockets: [{ ownedItemId: 'owned', position: 0, gemDefinitionId: gem.id, gemDefinition: gem, createdAt: new Date(0), updatedAt: new Date(0) }],
    });
    expect(resolved.attackPower).toBe(31);
    expect(resolved.damageMin).toBe(21);
    expect(resolved.damageMax).toBe(31);
  });

  it('wycenia kolejne gniazda wykładniczo', () => {
    expect(calculateSocketUnlockCost(100, 0)).toBe(75n);
    expect(calculateSocketUnlockCost(100, 1)).toBe(200n);
    expect(calculateSocketUnlockCost(100, 2)).toBe(500n);
  });
});
