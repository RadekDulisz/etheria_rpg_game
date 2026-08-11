import type { TavernQuestDifficulty } from '@prisma/client';
import { calculateMaxHp } from '../combat/combat-formulas';
import type { CombatSnapshot } from '../combat/combat.types';
import {
  TAVERN_ENEMIES,
  TAVERN_ENEMY_FAMILY_TRAITS,
  type TavernCombatModifiers,
  type TavernEnemyDefinition,
} from './tavern.bestiary';

export type { TavernEnemyDefinition } from './tavern.bestiary';

interface EncounterIdentity {
  templateKey: string;
  difficulty: TavernQuestDifficulty;
  stageIndex: number;
  stageCount: number;
  score: number;
}

const AUTHORED_COMBAT_STAGES: Record<string, number[]> = {
  'ash-road-lantern': [3],
  'stone-bridge-voices': [1, 4],
  'bone-chimera-heart': [1, 4],
};

export function isTavernCombatStage(
  difficulty: TavernQuestDifficulty,
  stageIndex: number,
  stageCount: number,
  templateKey?: string,
): boolean {
  if (templateKey && AUTHORED_COMBAT_STAGES[templateKey]) {
    return AUTHORED_COMBAT_STAGES[templateKey].includes(stageIndex);
  }
  if (difficulty === 'EASY') return stageIndex === stageCount - 1;
  if (difficulty === 'MEDIUM') return stageIndex === 1 || stageIndex === stageCount - 1;
  return stageIndex === 1 || stageIndex >= stageCount - 2;
}

export function getTavernEnemy(run: EncounterIdentity): TavernEnemyDefinition {
  const enemies = TAVERN_ENEMIES[run.templateKey] ?? TAVERN_ENEMIES['ash-road-lantern'];
  const combatStages = Array.from({ length: run.stageCount }, (_, index) => index)
    .filter((index) => isTavernCombatStage(run.difficulty, index, run.stageCount, run.templateKey));
  const encounterIndex = Math.max(0, combatStages.indexOf(run.stageIndex));
  return enemies[Math.min(encounterIndex, enemies.length - 1)];
}

export interface TavernPreparationContext {
  successfulChoiceIds?: string[];
  solvedPuzzleKeys?: string[];
}

export function shouldResolveTavernQuestAfterCombat(attackerWon: boolean, isFinalStage: boolean): boolean {
  return !attackerWon || isFinalStage;
}

export function buildTavernEnemySnapshot(
  definition: TavernEnemyDefinition,
  difficulty: TavernQuestDifficulty,
  playerLevel: number,
  preparationScore: number,
  preparation: TavernPreparationContext = {},
): {
  snapshot: CombatSnapshot;
  level: number;
  maxHp: number;
  preparationPercent: number;
  signatureSuppressed: boolean;
} {
  const difficultyOffset = difficulty === 'EASY' ? -1 : 0;
  const level = Math.max(1, playerLevel + difficultyOffset);
  const profile = definition.profile;
  const preparationPercent = Math.max(-8, Math.min(12, preparationScore * 2));
  const pressure = 1 - preparationPercent / 100;
  const baseAttribute = 5 + Math.floor(level * 1.15);
  const brute = profile === 'BRUTE';
  const swift = profile === 'SWIFT';
  const rankScale = definition.rank === 'COMMON'
    ? .84
    : definition.rank === 'ELITE'
      ? .9
      : definition.rank === 'BOSS'
        ? .95
        : 1;
  const signatureSuppressed = isSignatureSuppressed(definition, preparation);
  const encounterModifiers = mergeModifiers(
    TAVERN_ENEMY_FAMILY_TRAITS[definition.family].modifiers,
    signatureSuppressed ? {} : definition.signature.modifiers,
  );
  const snapshot: CombatSnapshot = {
    combatantId: `tavern-enemy:${definition.key}`,
    strength: Math.max(1, Math.round((baseAttribute + (brute ? 3 : 0)) * pressure * rankScale)),
    agility: Math.max(1, Math.round((baseAttribute + (swift ? 3 : 0)) * pressure * rankScale)),
    endurance: Math.max(1, Math.round((baseAttribute + (brute ? 2 : 0)) * pressure * rankScale)),
    intelligence: Math.max(1, Math.round((baseAttribute + (profile === 'WARDEN' ? 3 : 0)) * pressure * rankScale)),
    attackPower: Math.max(3, Math.round((3 + level * 1.25 + (brute ? 2 : 0)) * pressure * rankScale)),
    damageMin: Math.max(2, Math.round((2 + level * .95) * pressure * rankScale)),
    damageMax: Math.max(4, Math.round((5 + level * 1.35 + (brute ? 2 : 0)) * pressure * rankScale)),
    defensePower: Math.max(0, Math.round((level * .9 + (profile === 'WARDEN' ? 3 : 1)) * pressure * rankScale)),
    parryRating: definition.weaponType ? Math.max(0, Math.round((1 + level * .25) * pressure * rankScale)) : 0,
    maxHpBonus: difficulty === 'HARD' ? 12 : difficulty === 'MEDIUM' ? 5 : 0,
    criticalChanceBonus: swift ? 3 : 0,
    weaponExpertiseLevel: Math.min(20, Math.max(1, Math.floor(level * .8))),
    weaponType: definition.weaponType,
    ...encounterModifiers,
  };
  return {
    snapshot,
    level,
    maxHp: calculateMaxHp(snapshot.endurance, level, snapshot.maxHpBonus),
    preparationPercent,
    signatureSuppressed,
  };
}

function isSignatureSuppressed(
  definition: TavernEnemyDefinition,
  preparation: TavernPreparationContext,
): boolean {
  const counteredBy = definition.signature.counteredBy;
  if (!counteredBy) return false;
  return Boolean(
    counteredBy.choiceIds?.some((choiceId) => preparation.successfulChoiceIds?.includes(choiceId)) ||
    counteredBy.puzzleKeys?.some((puzzleKey) => preparation.solvedPuzzleKeys?.includes(puzzleKey)),
  );
}

function mergeModifiers(
  family: TavernCombatModifiers,
  signature: TavernCombatModifiers,
): TavernCombatModifiers {
  return {
    hitChanceModifier: (family.hitChanceModifier ?? 0) + (signature.hitChanceModifier ?? 0),
    evasionChanceModifier: (family.evasionChanceModifier ?? 0) + (signature.evasionChanceModifier ?? 0),
    parryChanceModifier: (family.parryChanceModifier ?? 0) + (signature.parryChanceModifier ?? 0),
    criticalChanceModifier: (family.criticalChanceModifier ?? 0) + (signature.criticalChanceModifier ?? 0),
    criticalResistanceModifier:
      (family.criticalResistanceModifier ?? 0) + (signature.criticalResistanceModifier ?? 0),
    damageDealtMultiplier:
      (family.damageDealtMultiplier ?? 1) * (signature.damageDealtMultiplier ?? 1),
    damageTakenMultiplier:
      (family.damageTakenMultiplier ?? 1) * (signature.damageTakenMultiplier ?? 1),
  };
}
