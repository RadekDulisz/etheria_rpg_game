import type { WeaponType } from '../types/game';

export const weaponTypeLabels: Record<WeaponType, string> = {
  SWORD: 'Miecz',
  AXE: 'Topór',
  DAGGER: 'Sztylet',
  BOW: 'Łuk',
  BLUNT: 'Broń obuchowa',
  POLEARM: 'Broń drzewcowa',
  STAFF: 'Kostur',
};

export const weaponTypeMarks: Record<WeaponType, string> = {
  SWORD: 'SWD',
  AXE: 'AXE',
  DAGGER: 'DAG',
  BOW: 'BOW',
  BLUNT: 'BLT',
  POLEARM: 'POL',
  STAFF: 'STF',
};

export function getWeaponTypeLabel(weaponType: WeaponType): string {
  return weaponTypeLabels[weaponType];
}
