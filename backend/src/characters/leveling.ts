/**
 * Czysta logika progresji poziomu - bez zaleznosci od bazy danych, zeby
 * dalo sie ja swobodnie testowac i przestrajac (kandydat pod przyszly
 * panel administracyjny do balansowania gry, sekcja 3 instrukcji).
 */

// Ile EXP potrzeba, zeby wejsc na dany poziom z poziomu ponizej.
// Formula celowo prosta (liniowa) - latwa do uzasadnienia i zmiany.
export const BASE_EXP_PER_LEVEL = 100;

// Punkty statystyk przyznawane za kazdy awans poziomu.
export const STAT_POINTS_PER_LEVEL = 3;

export function expRequiredForLevel(level: number): bigint {
  return BigInt(level) * BigInt(BASE_EXP_PER_LEVEL);
}

export interface LevelProgress {
  level: number;
  experience: bigint;
  unspentPointsGained: number;
}

/**
 * Dolicza zdobyte punkty doswiadczenia i rozstrzyga (rowniez wielokrotny
 * w jednym wywolaniu) awans poziomu. Nadwyzka EXP ponad prog kolejnego
 * poziomu jest zachowywana, nie tracona.
 */
export function applyExperienceGain(
  currentLevel: number,
  currentExperience: bigint,
  gainedExperience: bigint,
): LevelProgress {
  let level = currentLevel;
  let experience = currentExperience + gainedExperience;
  let unspentPointsGained = 0;

  while (experience >= expRequiredForLevel(level)) {
    experience -= expRequiredForLevel(level);
    level += 1;
    unspentPointsGained += STAT_POINTS_PER_LEVEL;
  }

  return { level, experience, unspentPointsGained };
}
