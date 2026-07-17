import { CombatantStats, CombatantWeaponExpertise, EquippedItem, Item } from '@prisma/client';
import { BASE_UNARMED_ATTACK } from './combat.constants';
import { CombatSnapshot } from './combat.types';

type EquippedItemWithItem = EquippedItem & { item: Item };

/**
 * Przeksztalca surowe dane z bazy (staty bazowe + zalozony ekwipunek +
 * ekspertyza broni) w "zamrozona" migawke bojowa, na ktorej dziala silnik
 * walki. To tutaj "spinaja sie" bonusy z Item (strengthBonus, attackPower,
 * parryBonus...), zaprojektowane w ERD obszar 2/N i 3/N, z faktyczna
 * matematyka walki.
 */
export function buildCombatSnapshot(
  combatantId: string,
  stats: CombatantStats,
  equippedItems: EquippedItemWithItem[],
  weaponExpertise: CombatantWeaponExpertise[],
): CombatSnapshot {
  let strength = stats.strength;
  let agility = stats.agility;
  let endurance = stats.endurance;
  let intelligence = stats.intelligence;
  let attackPower = 0;
  let damageMin = 0;
  let damageMax = 0;
  let defensePower = 0;
  let parryRating = stats.parryRating;
  let maxHpBonus = 0;
  let criticalChanceBonus = 0;
  let weaponType: CombatSnapshot['weaponType'] = null;

  for (const equipped of equippedItems) {
    const { item } = equipped;
    strength += item.strengthBonus;
    agility += item.agilityBonus;
    endurance += item.enduranceBonus;
    intelligence += item.intelligenceBonus;
    attackPower += item.attackPower;
    damageMin += item.damageMin;
    damageMax += item.damageMax;
    defensePower += item.defensePower;
    parryRating += item.parryBonus;
    maxHpBonus += item.maxHpBonus;
    criticalChanceBonus += item.criticalChanceBonus;

    if (equipped.slot === 'WEAPON' && item.weaponType) {
      weaponType = item.weaponType;
    }
  }

  // Brak zalozonej broni - postac walczy "goloraka" z minimalnym atakiem
  // bazowym, zamiast zerowym (co uczynilo by walke bez sensu).
  if (attackPower === 0) {
    attackPower = BASE_UNARMED_ATTACK;
    damageMin = BASE_UNARMED_ATTACK;
    damageMax = BASE_UNARMED_ATTACK;
  } else if (damageMin === 0 || damageMax === 0) {
    damageMin = attackPower;
    damageMax = attackPower;
  }

  const weaponExpertiseLevel = weaponType
    ? (weaponExpertise.find((entry) => entry.weaponType === weaponType)?.level ?? 1)
    : 0;

  return {
    combatantId,
    strength,
    agility,
    endurance,
    intelligence,
    attackPower,
    damageMin,
    damageMax,
    defensePower,
    parryRating,
    maxHpBonus,
    criticalChanceBonus,
    weaponExpertiseLevel,
    weaponType,
  };
}
