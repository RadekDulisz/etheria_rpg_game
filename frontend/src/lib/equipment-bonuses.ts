import type { EquippedEntry } from '../types/game';

export interface EquipmentAttributeBonuses {
  strength: number;
  agility: number;
  endurance: number;
  intelligence: number;
}

export function getEquipmentAttributeBonuses(equipment: EquippedEntry[]): EquipmentAttributeBonuses {
  return equipment.reduce<EquipmentAttributeBonuses>((bonuses, entry) => ({
    strength: bonuses.strength + entry.item.strengthBonus,
    agility: bonuses.agility + entry.item.agilityBonus,
    endurance: bonuses.endurance + entry.item.enduranceBonus,
    intelligence: bonuses.intelligence + entry.item.intelligenceBonus,
  }), { strength: 0, agility: 0, endurance: 0, intelligence: 0 });
}
