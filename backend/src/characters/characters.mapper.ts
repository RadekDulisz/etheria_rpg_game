import { Character, Combatant, CombatantStats, CombatantWeaponExpertise, EquippedItem, Item } from '@prisma/client';
import { calculateCritChance, calculateMaxHp, calculateParryChance } from '../combat/combat-formulas';
import { buildCombatSnapshot } from '../combat/combat-snapshot.builder';
import { expRequiredForLevel } from './leveling';
import { getReputationRankDetails } from './reputation';
import { getCurrentHp } from './character-health';
import { calculatePropertyBonuses } from '../properties/property-bonuses';

export type CharacterWithStats = Character & {
  property?: { level: number } | null;
  combatant: Combatant & {
    stats: CombatantStats | null;
    equippedItems: Array<EquippedItem & { item: Item }>;
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
  gold: string;
  reputation: number;
  reputationRank: string;
  reputationRankColor: string;
  avatarUrl: string | null;
  stats: {
    strength: number;
    agility: number;
    endurance: number;
    intelligence: number;
    unspentPoints: number;
    parryRating: number;
    attackPower: number;
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
  const equippedEndurance = character.combatant.equippedItems.reduce(
    (total, equipped) => total + equipped.item.enduranceBonus,
    0,
  );
  const equippedMaxHp = character.combatant.equippedItems.reduce(
    (total, equipped) => total + equipped.item.maxHpBonus,
    0,
  );
  const maxHp = stats
    ? calculateMaxHp(stats.endurance + equippedEndurance, character.level, equippedMaxHp)
    : 0;
  const snapshot = stats
    ? buildCombatSnapshot(
        character.combatant.id,
        stats,
        character.combatant.equippedItems,
        character.combatant.weaponExpertise,
      )
    : null;
  const reputationRank = getReputationRankDetails(character.reputation);
  const propertyBonuses = calculatePropertyBonuses(character.property?.level, character.reputation);

  return {
    id: character.id,
    name: character.name,
    level: character.level,
    experience: character.experience.toString(),
    experienceToNextLevel: expRequiredForLevel(character.level).toString(),
    maxHp,
    currentHp: getCurrentHp(
      character.currentHp,
      maxHp,
      character.healthUpdatedAt,
      new Date(),
      propertyBonuses.regenMultiplier,
    ),
    gold: character.gold.toString(),
    reputation: character.reputation,
    reputationRank: reputationRank.name,
    reputationRankColor: reputationRank.color,
    avatarUrl: character.avatarUrl,
    stats: stats
      ? {
          strength: snapshot?.strength ?? stats.strength,
          agility: snapshot?.agility ?? stats.agility,
          endurance: snapshot?.endurance ?? stats.endurance,
          intelligence: snapshot?.intelligence ?? stats.intelligence,
          unspentPoints: stats.unspentPoints,
          parryRating: snapshot?.parryRating ?? stats.parryRating,
          attackPower: snapshot?.attackPower ?? 0,
          defensePower: snapshot?.defensePower ?? 0,
          criticalChance: snapshot ? Math.round(calculateCritChance(snapshot) * 1000) / 10 : 0,
          parryChance: snapshot ? Math.round(calculateParryChance(snapshot) * 1000) / 10 : 0,
        }
      : null,
  };
}
