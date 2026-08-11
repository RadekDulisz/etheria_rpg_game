export interface PropertyBonuses {
  factor: number;
  regenMultiplier: number;
  missionSuccessBonus: number;
  missionGoldMultiplier: number;
  itemRewardChanceBonus: number;
  restorationPercentBonus: number;
  alignment: 'GOOD' | 'EVIL' | 'NEUTRAL';
}

const MISSION_SUCCESS_BONUS_PER_PROPERTY_LEVEL = 0.0015;
const MISSION_GOLD_BONUS_PER_PROPERTY_LEVEL = 0.004;
const ITEM_REWARD_CHANCE_BONUS_PER_PROPERTY_LEVEL = 0.0005;

export function calculateRestorationGoldCost(
  characterLevel: number,
  propertyLevel: number,
): number {
  const previousCost = 10 + characterLevel * 3 + propertyLevel * 15;
  return Math.max(1, Math.ceil(previousCost / 2));
}

export function calculatePropertyBonuses(
  propertyLevel: number | null | undefined,
  reputation: number,
): PropertyBonuses {
  const level = Math.max(0, Math.min(10, propertyLevel ?? 0));
  const alignment = reputation > 0 ? 'GOOD' : reputation < 0 ? 'EVIL' : 'NEUTRAL';
  const factor = Math.min(1, Math.abs(reputation) / 10_000) * level / 10;
  const levelMissionSuccessBonus =
    level * MISSION_SUCCESS_BONUS_PER_PROPERTY_LEVEL;
  const levelMissionGoldBonus =
    level * MISSION_GOLD_BONUS_PER_PROPERTY_LEVEL;
  const levelItemRewardChanceBonus =
    level * ITEM_REWARD_CHANCE_BONUS_PER_PROPERTY_LEVEL;

  return {
    factor,
    regenMultiplier: 1 + level * 0.05 + (alignment === 'GOOD' ? factor * 0.1 : 0),
    missionSuccessBonus:
      levelMissionSuccessBonus + (alignment === 'GOOD' ? factor * 0.03 : 0),
    missionGoldMultiplier:
      1 + levelMissionGoldBonus + (alignment === 'EVIL' ? factor * 0.09 : 0),
    itemRewardChanceBonus:
      levelItemRewardChanceBonus + (alignment === 'EVIL' ? factor * 0.012 : 0),
    restorationPercentBonus: alignment === 'GOOD' ? factor * 6 : 0,
    alignment,
  };
}
