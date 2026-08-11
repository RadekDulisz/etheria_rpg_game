import {
  GemDefinition,
  GemFamily,
  GemTier,
  Item,
  ItemGrade,
  ItemRarity,
  ItemSocket,
  OwnedItem,
  SlotGroup,
} from '@prisma/client';

export const MAX_ENHANCEMENT_LEVEL = 10;
export const ENHANCEMENT_BONUS_PER_LEVEL = 0.025;
export const FORGE_PITY_PER_FAILURE = 0.1;

export const UPGRADE_COST_MULTIPLIERS = [
  0.25, 0.4, 0.65, 1, 1.5, 2.2, 3.2, 4.6, 6.5, 9,
] as const;

export const UPGRADE_SUCCESS_CHANCES = [1, 1, 1, 1, 1, 0.85, 0.7, 0.55, 0.4, 0.25] as const;

export const UPGRADE_CAP_BY_GRADE: Record<ItemGrade, number> = {
  NO_GRADE: 3,
  D: 4,
  C: 5,
  B: 6,
  A: 7,
  S: 8,
  RUNIC: 9,
  ANCIENT: MAX_ENHANCEMENT_LEVEL,
};

export function enhancementCapForGrade(grade: ItemGrade): number {
  return UPGRADE_CAP_BY_GRADE[grade];
}

export const SOCKET_UNLOCK_COST_MULTIPLIERS = [0.75, 2, 5] as const;

export const SOCKETABLE_SLOT_GROUPS = new Set<SlotGroup>([
  SlotGroup.WEAPON,
  SlotGroup.SHIELD_SIGIL,
  SlotGroup.HELM,
  SlotGroup.UPPER_BODY,
  SlotGroup.LOWER_BODY,
  SlotGroup.GLOVES,
  SlotGroup.BOOTS,
]);

const GEM_ATTRIBUTE_VALUES: Record<GemTier, number> = {
  SHARD: 1,
  CUT: 2,
  FLAWLESS: 3,
  ROYAL: 4,
  ANCIENT: 6,
};

const GEM_HP_VALUES: Record<GemTier, number> = {
  SHARD: 4,
  CUT: 8,
  FLAWLESS: 12,
  ROYAL: 18,
  ANCIENT: 26,
};

export const GEM_TIER_MIN_LEVEL: Record<GemTier, number> = {
  SHARD: 1,
  CUT: 20,
  FLAWLESS: 40,
  ROYAL: 61,
  ANCIENT: 80,
};

export type OwnedItemWithDetails = OwnedItem & {
  item: Item;
  sockets: Array<ItemSocket & { gemDefinition: GemDefinition | null }>;
};

export interface ItemStatBonuses {
  strengthBonus: number;
  agilityBonus: number;
  enduranceBonus: number;
  intelligenceBonus: number;
  attackPower: number;
  damageMin: number;
  damageMax: number;
  defensePower: number;
  parryBonus: number;
  maxHpBonus: number;
  criticalChanceBonus: number;
}

export function socketCapacityForRarity(rarity: ItemRarity): number {
  switch (rarity) {
    case ItemRarity.RARE:
    case ItemRarity.EPIC:
      return 2;
    case ItemRarity.LEGENDARY:
      return 3;
    default:
      return 1;
  }
}

export function isSocketableItem(item: Pick<Item, 'slotGroup'>): boolean {
  return item.slotGroup !== null && SOCKETABLE_SLOT_GROUPS.has(item.slotGroup);
}

export function initialSocketState(
  item: Pick<Item, 'rarity' | 'slotGroup'>,
  rng: () => number = Math.random,
): { socketCapacity: number; unlockedSockets: number } {
  if (!isSocketableItem(item)) return { socketCapacity: 0, unlockedSockets: 0 };

  const socketCapacity = socketCapacityForRarity(item.rarity);
  const roll = rng();
  let unlockedSockets = 0;

  switch (item.rarity) {
    case ItemRarity.COMMON:
      unlockedSockets = roll < 0.1 ? 1 : 0;
      break;
    case ItemRarity.UNCOMMON:
      unlockedSockets = roll < 0.3 ? 1 : 0;
      break;
    case ItemRarity.RARE:
      unlockedSockets = roll < 0.1 ? 2 : roll < 0.6 ? 1 : 0;
      break;
    case ItemRarity.EPIC:
      unlockedSockets = roll < 0.25 ? 2 : 1;
      break;
    case ItemRarity.LEGENDARY:
      unlockedSockets = roll < 0.1 ? 3 : 2;
      break;
  }

  return { socketCapacity, unlockedSockets };
}

export function calculateUpgradeCost(basePrice: number, nextLevel: number): bigint {
  const multiplier = UPGRADE_COST_MULTIPLIERS[nextLevel - 1];
  if (multiplier === undefined) throw new RangeError('Nieprawidłowy poziom ulepszenia');
  return BigInt(Math.max(1, Math.ceil(basePrice * multiplier)));
}

export function calculateUpgradeChance(nextLevel: number, failStack: number): number {
  const baseChance = UPGRADE_SUCCESS_CHANCES[nextLevel - 1];
  if (baseChance === undefined) throw new RangeError('Nieprawidłowy poziom ulepszenia');
  return Math.min(1, baseChance + Math.max(0, failStack) * FORGE_PITY_PER_FAILURE);
}

export function calculateSocketUnlockCost(basePrice: number, nextPosition: number): bigint {
  const multiplier = SOCKET_UNLOCK_COST_MULTIPLIERS[nextPosition];
  if (multiplier === undefined) throw new RangeError('Nieprawidłowe gniazdo');
  return BigInt(Math.max(1, Math.ceil(basePrice * multiplier)));
}

export function enhancedBaseValue(baseValue: number, enhancementLevel: number): number {
  if (baseValue <= 0 || enhancementLevel <= 0) return baseValue;
  const percentageBonus = Math.floor(baseValue * enhancementLevel * ENHANCEMENT_BONUS_PER_LEVEL);
  return baseValue + Math.max(enhancementLevel, percentageBonus);
}

function emptyBonuses(): ItemStatBonuses {
  return {
    strengthBonus: 0,
    agilityBonus: 0,
    enduranceBonus: 0,
    intelligenceBonus: 0,
    attackPower: 0,
    damageMin: 0,
    damageMax: 0,
    defensePower: 0,
    parryBonus: 0,
    maxHpBonus: 0,
    criticalChanceBonus: 0,
  };
}

export function gemBonuses(
  family: GemFamily,
  tier: GemTier,
  slotGroup: SlotGroup | null,
): ItemStatBonuses {
  const result = emptyBonuses();
  const value = GEM_ATTRIBUTE_VALUES[tier];
  const weapon = slotGroup === SlotGroup.WEAPON;
  const shield = slotGroup === SlotGroup.SHIELD_SIGIL;

  switch (family) {
    case GemFamily.RUBY:
      if (weapon) {
        result.attackPower = value;
        result.damageMin = value;
        result.damageMax = value;
      } else {
        result.maxHpBonus = GEM_HP_VALUES[tier];
      }
      break;
    case GemFamily.AMETHYST:
      if (weapon) result.strengthBonus = value;
      else result.enduranceBonus = value;
      break;
    case GemFamily.EMERALD:
      if (shield) result.parryBonus = value;
      else result.agilityBonus = value;
      break;
    case GemFamily.SAPPHIRE:
      if (shield) result.defensePower = value;
      else result.intelligenceBonus = value;
      break;
  }

  return result;
}

export function resolveOwnedItemStats(ownedItem: OwnedItemWithDetails): Item {
  const item = { ...ownedItem.item };
  if (item.slotGroup === SlotGroup.WEAPON) {
    item.attackPower = enhancedBaseValue(item.attackPower, ownedItem.enhancementLevel);
    item.damageMin = enhancedBaseValue(item.damageMin, ownedItem.enhancementLevel);
    item.damageMax = enhancedBaseValue(item.damageMax, ownedItem.enhancementLevel);
  } else if (isSocketableItem(item)) {
    item.defensePower = enhancedBaseValue(item.defensePower, ownedItem.enhancementLevel);
  }

  for (const socket of ownedItem.sockets) {
    if (!socket.gemDefinition) continue;
    const bonus = gemBonuses(
      socket.gemDefinition.family,
      socket.gemDefinition.tier,
      item.slotGroup,
    );
    item.strengthBonus += bonus.strengthBonus;
    item.agilityBonus += bonus.agilityBonus;
    item.enduranceBonus += bonus.enduranceBonus;
    item.intelligenceBonus += bonus.intelligenceBonus;
    item.attackPower += bonus.attackPower;
    item.damageMin += bonus.damageMin;
    item.damageMax += bonus.damageMax;
    item.defensePower += bonus.defensePower;
    item.parryBonus += bonus.parryBonus;
    item.maxHpBonus += bonus.maxHpBonus;
    item.criticalChanceBonus += bonus.criticalChanceBonus;
  }

  return item;
}

export function toOwnedItemResponse(ownedItem: OwnedItemWithDetails) {
  return {
    ...ownedItem,
    item: resolveOwnedItemStats(ownedItem),
    baseItem: ownedItem.item,
    quantity: 1,
  };
}
