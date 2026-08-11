import { expRequiredForLevel } from '../characters/leveling';

export interface MissionTierBalance {
  tier: number;
  name: string;
  chance: number;
  gold: { baseMin: number; perLevelMin: number; baseMax: number; perLevelMax: number };
  xpPercent: { min: number; max: number };
  hpPercent: { min: number; max: number };
  itemChance: number;
}

export const MISSION_TIERS: MissionTierBalance[] = [
  { tier: 1, name: 'Zlecenie przydrożne', chance: 45, gold: { baseMin: 5, perLevelMin: 3, baseMax: 9, perLevelMax: 4 }, xpPercent: { min: 1, max: 1.5 }, hpPercent: { min: 4, max: 7 }, itemChance: 4 },
  { tier: 2, name: 'Wyprawa zwiadowcza', chance: 28, gold: { baseMin: 11, perLevelMin: 5, baseMax: 18, perLevelMax: 6 }, xpPercent: { min: 2, max: 2.5 }, hpPercent: { min: 8, max: 12 }, itemChance: 6 },
  { tier: 3, name: 'Niebezpieczna wyprawa', chance: 15, gold: { baseMin: 21, perLevelMin: 7, baseMax: 35, perLevelMax: 10 }, xpPercent: { min: 3, max: 4 }, hpPercent: { min: 13, max: 19 }, itemChance: 8 },
  { tier: 4, name: 'Wyprawa wysokiego ryzyka', chance: 8, gold: { baseMin: 40, perLevelMin: 12, baseMax: 64, perLevelMax: 16 }, xpPercent: { min: 4.5, max: 6 }, hpPercent: { min: 20, max: 29 }, itemChance: 11 },
  { tier: 5, name: 'Wyprawa legendarna', chance: 4, gold: { baseMin: 88, perLevelMin: 20, baseMax: 138, perLevelMax: 30 }, xpPercent: { min: 7, max: 9 }, hpPercent: { min: 32, max: 44 }, itemChance: 15 },
];

export function missionRanges(tier: MissionTierBalance, level: number) {
  const requiredXp = Number(expRequiredForLevel(level));
  return {
    goldMin: tier.gold.baseMin + tier.gold.perLevelMin * level,
    goldMax: tier.gold.baseMax + tier.gold.perLevelMax * level,
    experienceMin: Math.max(1, Math.floor(requiredXp * tier.xpPercent.min / 100)),
    experienceMax: Math.max(1, Math.floor(requiredXp * tier.xpPercent.max / 100)),
    hpPercentMin: tier.hpPercent.min,
    hpPercentMax: tier.hpPercent.max,
    itemRewardChance: tier.itemChance,
  };
}

export function rollMissionTier(random: number, missionsSinceTierFive: number) {
  if (missionsSinceTierFive >= 9) return MISSION_TIERS[4];
  const roll = random * 100;
  let threshold = 0;
  for (const tier of MISSION_TIERS) {
    threshold += tier.chance;
    if (roll < threshold) return tier;
  }
  return MISSION_TIERS[MISSION_TIERS.length - 1];
}

export function randomInteger(min: number, max: number, random = Math.random()) {
  return Math.floor(random * (max - min + 1)) + min;
}

export function rollReputationChange(morality: 'GOOD' | 'EVIL', random = Math.random()) {
  return randomInteger(1, 3, random) * (morality === 'GOOD' ? 1 : -1);
}
