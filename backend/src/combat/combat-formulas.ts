import * as C from './combat.constants';
import { AttackOutcome, CombatSnapshot } from './combat.types';
import { calculateExpertiseDamageBonus } from './weapon-expertise';

export function calculateMaxHp(endurance: number, level: number, flatBonus = 0): number {
  return C.BASE_HP + endurance * C.HP_PER_ENDURANCE + level * C.HP_PER_LEVEL + flatBonus;
}

export function calculateHitChance(attacker: CombatSnapshot, defender: CombatSnapshot): number {
  const raw =
    C.BASE_HIT_CHANCE +
    (attacker.agility - defender.agility) * C.HIT_CHANCE_PER_AGILITY_DIFF +
    (attacker.hitChanceModifier ?? 0) -
    (defender.evasionChanceModifier ?? 0);
  return clamp(raw, C.MIN_HIT_CHANCE, C.MAX_HIT_CHANCE);
}

export function calculateParryChance(defender: CombatSnapshot): number {
  return clamp(
    defender.parryRating * C.PARRY_CHANCE_PER_RATING +
      defender.intelligence * C.PARRY_CHANCE_PER_INTELLIGENCE +
      (defender.parryChanceModifier ?? 0),
    0,
    C.MAX_PARRY_CHANCE,
  );
}

export function calculateCritChance(attacker: CombatSnapshot, defender?: CombatSnapshot): number {
  const raw =
    C.BASE_CRIT_CHANCE +
    attacker.agility * C.CRIT_CHANCE_PER_AGILITY +
    Math.min(C.MAX_WEAPON_EXPERTISE_LEVEL, attacker.weaponExpertiseLevel) *
      C.CRIT_CHANCE_PER_EXPERTISE_LEVEL +
    (attacker.criticalChanceBonus ?? 0) * C.CRIT_CHANCE_PER_ITEM_POINT -
    (defender?.intelligence ?? 0) * C.CRIT_RESISTANCE_PER_INTELLIGENCE +
    (attacker.criticalChanceModifier ?? 0) -
    (defender?.criticalResistanceModifier ?? 0);
  return clamp(raw, 0, C.MAX_CRIT_CHANCE);
}

export function calculateAttackRange(attacker: CombatSnapshot): { min: number; max: number } {
  const equipmentMin = attacker.damageMin ?? attacker.attackPower;
  const equipmentMax = attacker.damageMax ?? attacker.attackPower;
  const attributeBonus =
    Math.floor(primaryDamageAttribute(attacker) * C.PRIMARY_ATTRIBUTE_TO_DAMAGE) +
    calculateExpertiseDamageBonus(attacker.weaponExpertiseLevel);

  return {
    min: Math.max(
      C.MIN_DAMAGE,
      Math.floor(Math.min(equipmentMin, equipmentMax) * C.EQUIPMENT_DAMAGE_MULTIPLIER) +
        attributeBonus,
    ),
    max: Math.max(
      C.MIN_DAMAGE,
      Math.floor(Math.max(equipmentMin, equipmentMax) * C.EQUIPMENT_DAMAGE_MULTIPLIER) +
        attributeBonus,
    ),
  };
}

export function calculateEffectiveDefense(defender: CombatSnapshot): number {
  return defender.defensePower + Math.floor(defender.endurance * C.ENDURANCE_TO_DEFENSE);
}

export function calculateDamage(
  attacker: CombatSnapshot,
  defender: CombatSnapshot,
  critical: boolean,
): number {
  const baseDamage =
    Math.floor(attacker.attackPower * C.EQUIPMENT_DAMAGE_MULTIPLIER) +
    Math.floor(primaryDamageAttribute(attacker) * C.PRIMARY_ATTRIBUTE_TO_DAMAGE) +
    calculateExpertiseDamageBonus(attacker.weaponExpertiseLevel);
  const defense = calculateEffectiveDefense(defender);

  let damage = Math.max(
    C.MIN_DAMAGE,
    Math.round(baseDamage / (1 + defense * C.DEFENSE_MITIGATION_PER_POINT)),
  );
  if (critical) {
    damage = Math.round(damage * C.CRIT_DAMAGE_MULTIPLIER);
  }
  return Math.max(
    C.MIN_DAMAGE,
    Math.round(
      damage *
        (attacker.damageDealtMultiplier ?? 1) *
        (defender.damageTakenMultiplier ?? 1),
    ),
  );
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
