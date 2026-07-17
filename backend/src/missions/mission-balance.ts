import { expRequiredForLevel } from '../characters/leveling';

export interface MissionTierBalance {
  tier: number;
  name: string;
  chance: number;
  gold: { baseMin: number; perLevelMin: number; baseMax: number; perLevelMax: number };
  xpPercent: { min: number; max: number };
  hpPercent: { min: number; max: number };
}

export const MISSION_TIERS: MissionTierBalance[] = [
  { tier: 1, name: 'Zlecenie przydrożne', chance: 45, gold: { baseMin: 4, perLevelMin: 2, baseMax: 7, perLevelMax: 3 }, xpPercent: { min: 1, max: 1.5 }, hpPercent: { min: 5, max: 8 } },
  { tier: 2, name: 'Wyprawa zwiadowcza', chance: 28, gold: { baseMin: 7, perLevelMin: 3, baseMax: 12, perLevelMax: 4 }, xpPercent: { min: 2, max: 2.5 }, hpPercent: { min: 9, max: 14 } },
  { tier: 3, name: 'Niebezpieczna wyprawa', chance: 15, gold: { baseMin: 12, perLevelMin: 4, baseMax: 20, perLevelMax: 6 }, xpPercent: { min: 3, max: 4 }, hpPercent: { min: 15, max: 22 } },
  { tier: 4, name: 'Wyprawa wysokiego ryzyka', chance: 8, gold: { baseMin: 20, perLevelMin: 6, baseMax: 32, perLevelMax: 8 }, xpPercent: { min: 4.5, max: 6 }, hpPercent: { min: 24, max: 34 } },
  { tier: 5, name: 'Wyprawa legendarna', chance: 4, gold: { baseMin: 35, perLevelMin: 8, baseMax: 55, perLevelMax: 12 }, xpPercent: { min: 7, max: 9 }, hpPercent: { min: 38, max: 50 } },
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
