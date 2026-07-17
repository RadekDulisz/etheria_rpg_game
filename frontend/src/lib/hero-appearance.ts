import type { EquippedEntry, ItemGrade } from '../types/game';

const eliteGrades: ItemGrade[] = ['A', 'S', 'RUNIC', 'ANCIENT'];
const standardGrades: ItemGrade[] = ['D', 'C', 'B'];

interface ChestAppearance {
  paperDollAsset: string;
  portraitAsset: string;
  equipped: boolean;
}

export function getChestAppearance(equipment: EquippedEntry[]): ChestAppearance {
  const chest = equipment.find((entry) => entry.slot === 'UPPER_BODY');
  if (!chest) {
    return {
      paperDollAsset: '/assets/hero-paper-doll.png',
      portraitAsset: '/assets/hero-portrait.png',
      equipped: false,
    };
  }
  if (eliteGrades.includes(chest.item.grade)) {
    return {
      paperDollAsset: '/assets/hero-paper-doll-chest-elite.png',
      portraitAsset: '/assets/hero-portrait-chest-elite.png',
      equipped: true,
    };
  }
  if (standardGrades.includes(chest.item.grade)) {
    return {
      paperDollAsset: '/assets/hero-paper-doll-chest-standard.png',
      portraitAsset: '/assets/hero-portrait-chest-standard.png',
      equipped: true,
    };
  }
  return {
    paperDollAsset: '/assets/hero-paper-doll-chest-novice.png',
    portraitAsset: '/assets/hero-portrait-chest-novice.png',
    equipped: true,
  };
}
