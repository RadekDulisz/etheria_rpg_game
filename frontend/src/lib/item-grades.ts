import type { ItemGrade } from '../types/game';

const labels: Record<ItemGrade, string> = {
  NO_GRADE: 'Nowicjusz',
  D: 'Ranga D',
  C: 'Ranga C',
  B: 'Ranga B',
  A: 'Ranga A',
  S: 'Ranga S',
  RUNIC: 'Ranga Runiczna',
  ANCIENT: 'Ranga Pradawna',
};

export function formatItemGrade(grade: ItemGrade): string {
  return labels[grade];
}
