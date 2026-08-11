import {
  EXPERTISE_LEVELS_PER_DAMAGE_POINT,
  MAX_WEAPON_EXPERTISE_LEVEL,
  WEAPON_EXPERTISE_BASE_XP_TO_NEXT_LEVEL,
  WEAPON_EXPERTISE_XP_GROWTH_PER_LEVEL,
} from './combat.constants';

export interface WeaponExpertiseProgress {
  level: number;
  totalExperience: number;
  experienceInLevel: number;
  experienceToNextLevel: number;
  progressPercent: number;
  maxLevel: boolean;
}

export function experienceToNextExpertiseLevel(level: number): number {
  const safeLevel = Math.min(
    MAX_WEAPON_EXPERTISE_LEVEL,
    Math.max(1, Math.floor(level)),
  );
  if (safeLevel >= MAX_WEAPON_EXPERTISE_LEVEL) return 0;
  return (
    WEAPON_EXPERTISE_BASE_XP_TO_NEXT_LEVEL +
    (safeLevel - 1) * WEAPON_EXPERTISE_XP_GROWTH_PER_LEVEL
  );
}

export function calculateWeaponExpertiseProgress(
  totalExperience: number,
): WeaponExpertiseProgress {
  const safeExperience = Math.max(0, Math.floor(totalExperience));
  let level = 1;
  let spentExperience = 0;

  while (level < MAX_WEAPON_EXPERTISE_LEVEL) {
    const required = experienceToNextExpertiseLevel(level);
    if (safeExperience < spentExperience + required) break;
    spentExperience += required;
    level += 1;
  }

  if (level >= MAX_WEAPON_EXPERTISE_LEVEL) {
    return {
      level: MAX_WEAPON_EXPERTISE_LEVEL,
      totalExperience: safeExperience,
      experienceInLevel: 0,
      experienceToNextLevel: 0,
      progressPercent: 100,
      maxLevel: true,
    };
  }

  const experienceInLevel = safeExperience - spentExperience;
  const experienceToNextLevel = experienceToNextExpertiseLevel(level);
  return {
    level,
    totalExperience: safeExperience,
    experienceInLevel,
    experienceToNextLevel,
    progressPercent: Math.round((experienceInLevel / experienceToNextLevel) * 100),
    maxLevel: false,
  };
}

export function calculateExpertiseDamageBonus(level: number): number {
  const safeLevel = Math.min(
    MAX_WEAPON_EXPERTISE_LEVEL,
    Math.max(1, Math.floor(level)),
  );
  return Math.floor(safeLevel / EXPERTISE_LEVELS_PER_DAMAGE_POINT);
}
