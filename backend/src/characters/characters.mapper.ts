import {
  Character,
  Combatant,
  CombatantStats,
  CombatantWeaponExpertise,
  EquippedItem,
  WeaponType,
} from '@prisma/client';
import { OwnedItemWithDetails } from '../blacksmith/blacksmith.balance';
import {
  calculateAttackRange,
  calculateCritChance,
  calculateEffectiveDefense,
  calculateMaxHp,
  calculateParryChance,
} from '../combat/combat-formulas';
import { buildCombatSnapshot } from '../combat/combat-snapshot.builder';
import { expRequiredForLevel } from './leveling';
import { getReputationRankDetails } from './reputation';
import { getHealthRegenerationPreview } from './character-health';
import { calculatePropertyBonuses } from '../properties/property-bonuses';
import { calculateWeaponExpertiseProgress } from '../combat/weapon-expertise';
import { getArenaRankDetails } from '../battles/arena-ranks';

const WEAPON_TYPES: WeaponType[] = [
  'SWORD',
  'AXE',
  'DAGGER',
  'BOW',
  'BLUNT',
  'POLEARM',
  'STAFF',
];

export interface WeaponExpertiseResponse {
  weaponType: WeaponType;
  level: number;
  experience: number;
  experienceInLevel: number;
  experienceToNextLevel: number;
  progressPercent: number;
  maxLevel: boolean;
  active: boolean;
}

export type CharacterWithStats = Character & {
  property?: { level: number } | null;
  combatant: Combatant & {
    stats: CombatantStats | null;
    equippedItems: Array<EquippedItem & { ownedItem: OwnedItemWithDetails }>;
    weaponExpertise: CombatantWeaponExpertise[];
  };
};

export interface CharacterResponse {
  id: string;
  name: string;
  level: number;
  experience: string;
  experienceToNextLevel: string;
  maxHp: number;
  currentHp: number;
  healthRegeneration: {
    amount: number;
    nextHp: number;
    nextTickAt: string | null;
    intervalSeconds: number;
    percentPerTick: number;
  };
  gold: string;
  reputation: number;
  reputationRank: string;
  reputationRankColor: string;
  arenaRating: number;
  arenaWins: number;
  arenaLosses: number;
  arenaDraws: number;
  arenaRank: ReturnType<typeof getArenaRankDetails>;
  avatarUrl: string | null;
  weaponExpertise: WeaponExpertiseResponse[];
  activeWeaponExpertise: WeaponExpertiseResponse | null;
  stats: {
    strength: number;
    agility: number;
    endurance: number;
    intelligence: number;
    unspentPoints: number;
    parryRating: number;
    attackPower: number;
    attackMin: number;
    attackMax: number;
    defensePower: number;
    criticalChance: number;
    parryChance: number;
  } | null;
}

/**
 * BigInt (experience, gold) nie da sie zserializowac natywnym
 * JSON.stringify - konwertujemy jawnie na string przed zwroceniem z API.
 */
export function toCharacterResponse(character: CharacterWithStats): CharacterResponse {
  const stats = character.combatant.stats;
  const snapshot = stats
    ? buildCombatSnapshot(
        character.combatant.id,
        stats,
        character.combatant.equippedItems,
        character.combatant.weaponExpertise,
      )
    : null;
  const maxHp = snapshot
    ? calculateMaxHp(snapshot.endurance, character.level, snapshot.maxHpBonus)
    : 0;
  const reputationRank = getReputationRankDetails(character.reputation);
  const arenaRating = character.arenaRating ?? 1000;
  const arenaRank = getArenaRankDetails(arenaRating);
  const propertyBonuses = calculatePropertyBonuses(character.property?.level, character.reputation);
  const healthRegeneration = getHealthRegenerationPreview(
    character.currentHp,
    maxHp,
    character.healthUpdatedAt,
    new Date(),
    propertyBonuses.regenMultiplier,
  );
  const attackRange = snapshot ? calculateAttackRange(snapshot) : { min: 0, max: 0 };
  const weaponExpertise = WEAPON_TYPES.map((weaponType): WeaponExpertiseResponse => {
    const stored = character.combatant.weaponExpertise.find(
      (entry) => entry.weaponType === weaponType,
    );
    const experience = stored?.experience ?? 0;
    const progress = calculateWeaponExpertiseProgress(experience);
    return {
      weaponType,
      level: progress.level,
      experience,
      experienceInLevel: progress.experienceInLevel,
      experienceToNextLevel: progress.experienceToNextLevel,
      progressPercent: progress.progressPercent,
      maxLevel: progress.maxLevel,
      active: snapshot?.weaponType === weaponType,
    };
  });

  const activeWeaponExpertise = weaponExpertise.find((entry) => entry.active) ?? null;

  return {
    id: character.id,
    name: character.name,
    level: character.level,
    experience: character.experience.toString(),
    experienceToNextLevel: expRequiredForLevel(character.level).toString(),
    maxHp,
    currentHp: healthRegeneration.currentHp,
    healthRegeneration: {
      amount: healthRegeneration.amount,
      nextHp: healthRegeneration.nextHp,
      nextTickAt: healthRegeneration.nextTickAt?.toISOString() ?? null,
      intervalSeconds: healthRegeneration.intervalSeconds,
      percentPerTick: Math.round(healthRegeneration.percentPerTick * 10) / 10,
    },
    gold: character.gold.toString(),
    reputation: character.reputation,
    reputationRank: reputationRank.name,
    reputationRankColor: reputationRank.color,
    arenaRating,
    arenaWins: character.arenaWins ?? 0,
    arenaLosses: character.arenaLosses ?? 0,
    arenaDraws: character.arenaDraws ?? 0,
    arenaRank,
    avatarUrl: character.avatarUrl,
    weaponExpertise,
    activeWeaponExpertise,
    stats: stats
      ? {
          strength: snapshot?.strength ?? stats.strength,
          agility: snapshot?.agility ?? stats.agility,
          endurance: snapshot?.endurance ?? stats.endurance,
          intelligence: snapshot?.intelligence ?? stats.intelligence,
          unspentPoints: stats.unspentPoints,
          parryRating: snapshot?.parryRating ?? stats.parryRating,
          attackPower: Math.round((attackRange.min + attackRange.max) / 2),
          attackMin: attackRange.min,
          attackMax: attackRange.max,
          defensePower: snapshot ? calculateEffectiveDefense(snapshot) : 0,
          criticalChance: snapshot ? Math.round(calculateCritChance(snapshot) * 1000) / 10 : 0,
          parryChance: snapshot ? Math.round(calculateParryChance(snapshot) * 1000) / 10 : 0,
        }
      : null,
  };
}
