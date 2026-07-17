import * as C from './combat.constants';
import { AttackOutcome, CombatSnapshot } from './combat.types';

export function calculateMaxHp(endurance: number, level: number, flatBonus = 0): number {
  return C.BASE_HP + endurance * C.HP_PER_ENDURANCE + level * C.HP_PER_LEVEL + flatBonus;
}

export function calculateHitChance(attacker: CombatSnapshot, defender: CombatSnapshot): number {
  const raw =
    C.BASE_HIT_CHANCE + (attacker.agility - defender.agility) * C.HIT_CHANCE_PER_AGILITY_DIFF;
  return clamp(raw, C.MIN_HIT_CHANCE, C.MAX_HIT_CHANCE);
}

export function calculateParryChance(defender: CombatSnapshot): number {
  return clamp(
    defender.parryRating * C.PARRY_CHANCE_PER_RATING +
      defender.intelligence * C.PARRY_CHANCE_PER_INTELLIGENCE,
    0,
    C.MAX_PARRY_CHANCE,
  );
}

export function calculateCritChance(attacker: CombatSnapshot, defender?: CombatSnapshot): number {
  const raw =
    C.BASE_CRIT_CHANCE +
    attacker.agility * C.CRIT_CHANCE_PER_AGILITY +
    attacker.weaponExpertiseLevel * C.CRIT_CHANCE_PER_EXPERTISE_LEVEL +
    (attacker.criticalChanceBonus ?? 0) * C.CRIT_CHANCE_PER_ITEM_POINT -
    (defender?.intelligence ?? 0) * C.CRIT_RESISTANCE_PER_INTELLIGENCE;
  return clamp(raw, 0, C.MAX_CRIT_CHANCE);
}

export function calculateDamage(
  attacker: CombatSnapshot,
  defender: CombatSnapshot,
  critical: boolean,
): number {
  const baseDamage =
    attacker.attackPower +
    Math.floor(primaryDamageAttribute(attacker) * C.PRIMARY_ATTRIBUTE_TO_DAMAGE) +
    attacker.weaponExpertiseLevel * C.EXPERTISE_TO_DAMAGE;
  const defense = defender.defensePower + Math.floor(defender.endurance * C.ENDURANCE_TO_DEFENSE);

  let damage = Math.max(C.MIN_DAMAGE, baseDamage - defense);
  if (critical) {
    damage = Math.round(damage * C.CRIT_DAMAGE_MULTIPLIER);
  }
  return damage;
}

/**
 * Rozstrzyga pojedynczy cios: trafienie -> parowanie -> krytyk -> obrazenia.
 * `rng` zwraca liczbe z [0,1) - domyslnie Math.random, ale jest
 * wstrzykiwane, zeby dalo sie deterministycznie testowac (mockowany RNG).
 */
export function resolveAttack(
  attacker: CombatSnapshot,
  defender: CombatSnapshot,
  rng: () => number = Math.random,
): AttackOutcome {
  const hitChance = calculateHitChance(attacker, defender);
  if (rng() > hitChance) {
    return { hit: false, parried: false, critical: false, damage: 0 };
  }

  const parryChance = calculateParryChance(defender);
  if (rng() < parryChance) {
    return { hit: true, parried: true, critical: false, damage: 0 };
  }

  const critChance = calculateCritChance(attacker, defender);
  const critical = rng() < critChance;
  const damageMin = attacker.damageMin ?? attacker.attackPower;
  const damageMax = attacker.damageMax ?? attacker.attackPower;
  const rolledAttackPower = randomIntInclusive(damageMin, damageMax, rng);
  const damage = calculateDamage({ ...attacker, attackPower: rolledAttackPower }, defender, critical);

  return { hit: true, parried: false, critical, damage };
}

function primaryDamageAttribute(attacker: CombatSnapshot): number {
  switch (attacker.weaponType) {
    case 'DAGGER':
    case 'BOW':
      return attacker.agility;
    case 'STAFF':
      return attacker.intelligence;
    default:
      return attacker.strength;
  }
}

function randomIntInclusive(min: number, max: number, rng: () => number): number {
  const safeMin = Math.min(min, max);
  const safeMax = Math.max(min, max);
  return safeMin + Math.floor(rng() * (safeMax - safeMin + 1));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
