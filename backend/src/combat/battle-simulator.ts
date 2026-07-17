import { BattleActionType, BattleResult } from '@prisma/client';
import { MAX_BATTLE_ROUNDS } from './combat.constants';
import { resolveAttack } from './combat-formulas';
import { AttackOutcome, CombatSnapshot } from './combat.types';
import { calculateMaxHp } from './combat-formulas';

export interface SimulatedRound {
  roundNumber: number;
  actorId: string;
  actionType: BattleActionType;
  damageDealt: number;
  actorHpAfter: number;
  targetHpAfter: number;
}

export interface BattleSimulationResult {
  result: BattleResult;
  rounds: SimulatedRound[];
  attackerHitsLanded: number;
  defenderHitsLanded: number;
}

/**
 * Rozgrywa cala walke runda po rundzie (naprzemiennie: atakujacy,
 * broniacy sie) az do polozenia jednej ze stron albo do MAX_BATTLE_ROUNDS
 * (wtedy remis - zabezpieczenie przed nieskonczona petla). Bez dostepu do
 * bazy danych - w pelni testowalne z wstrzykiwanym RNG.
 */
export function simulateBattle(
  attacker: CombatSnapshot,
  attackerLevel: number,
  defender: CombatSnapshot,
  defenderLevel: number,
  rng: () => number = Math.random,
): BattleSimulationResult {
  const attackerMaxHp = calculateMaxHp(attacker.endurance, attackerLevel, attacker.maxHpBonus ?? 0);
  const defenderMaxHp = calculateMaxHp(defender.endurance, defenderLevel, defender.maxHpBonus ?? 0);
  let attackerHp = attackerMaxHp;
  let defenderHp = defenderMaxHp;

  const rounds: SimulatedRound[] = [];
  let attackerHitsLanded = 0;
  let defenderHitsLanded = 0;
  let result: BattleResult = 'DRAW';

  for (let round = 1; round <= MAX_BATTLE_ROUNDS; round++) {
    const attackerOutcome = resolveAttack(attacker, defender, rng);
    defenderHp -= attackerOutcome.damage;
    if (attackerOutcome.hit && !attackerOutcome.parried) {
      attackerHitsLanded += 1;
    }
    rounds.push(toRound(round, attacker.combatantId, attackerOutcome, attackerHp, defenderHp));

    if (defenderHp <= 0) {
      result = 'ATTACKER_WIN';
      break;
    }

    const defenderOutcome = resolveAttack(defender, attacker, rng);
    attackerHp -= defenderOutcome.damage;
    if (defenderOutcome.hit && !defenderOutcome.parried) {
      defenderHitsLanded += 1;
    }
    rounds.push(toRound(round, defender.combatantId, defenderOutcome, defenderHp, attackerHp));

    if (attackerHp <= 0) {
      result = 'DEFENDER_WIN';
      break;
    }
  }

  // Po uplywie limitu rund o wyniku decyduje pozostaly procent zdrowia.
  // Remis zachowujemy tylko wtedy, gdy obie strony zakonczyly starcie w
  // identycznym stanie (np. obie przez cala walke pudlowaly). Wczesniej
  // nawet wyrazna przewaga po 20 rundach byla zawsze zapisywana jako remis.
  if (result === 'DRAW') {
    const attackerHealthRatio = attackerHp / attackerMaxHp;
    const defenderHealthRatio = defenderHp / defenderMaxHp;
    if (attackerHealthRatio > defenderHealthRatio) result = 'ATTACKER_WIN';
    if (defenderHealthRatio > attackerHealthRatio) result = 'DEFENDER_WIN';
  }

  return { result, rounds, attackerHitsLanded, defenderHitsLanded };
}

function toRound(
  roundNumber: number,
  actorId: string,
  outcome: AttackOutcome,
  actorHp: number,
  targetHp: number,
): SimulatedRound {
  return {
    roundNumber,
    actorId,
    actionType: toActionType(outcome),
    damageDealt: outcome.damage,
    actorHpAfter: Math.max(0, actorHp),
    targetHpAfter: Math.max(0, targetHp),
  };
}

function toActionType(outcome: AttackOutcome): BattleActionType {
  if (!outcome.hit) return 'MISS';
  if (outcome.parried) return 'PARRIED';
  if (outcome.critical) return 'CRITICAL_HIT';
  return 'HIT';
}
