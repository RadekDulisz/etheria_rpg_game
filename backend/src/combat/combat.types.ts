import { WeaponType } from '@prisma/client';

/**
 * "Zamrozony" stan bojowy jednego Combatanta na potrzeby jednej symulacji -
 * juz z doliczonymi bonusami z zalozonego ekwipunku (patrz
 * combat-snapshot.builder.ts). Silnik walki operuje wylacznie na tym
 * typie, bez wiedzy o Prisma/bazie danych - dzieki temu jest w pelni
 * testowalny bez zywej bazy.
 */
export interface CombatSnapshot {
  combatantId: string;
  strength: number;
  agility: number;
  endurance: number;
  intelligence: number;
  attackPower: number;
  damageMin?: number;
  damageMax?: number;
  defensePower: number;
  parryRating: number;
  maxHpBonus?: number;
  criticalChanceBonus?: number;
  weaponExpertiseLevel: number;
  weaponType: WeaponType | null;
}

export interface AttackOutcome {
  hit: boolean;
  parried: boolean;
  critical: boolean;
  damage: number;
}
