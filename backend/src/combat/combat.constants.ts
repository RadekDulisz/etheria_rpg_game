/**
 * Wszystkie liczby balansowe silnika walki w jednym miejscu - celowo
 * proste formuly, latwe do uzasadnienia i do przestrojenia
 * pozniej (kandydat pod przyszly panel administracyjny, sekcja 3).
 *
 * Po kazdej zmianie zaktualizuj rowniez docs/BALANS_STATYSTYK.md,
 * testy combat-formulas.spec.ts oraz frontend/src/lib/combat-display.ts,
 * jesli zmiana dotyczy wartosci pokazywanych przy przedmiotach.
 */

// HP jest wyliczane na starcie kazdej walki, nie przechowywane.
export const BASE_HP = 50;
export const HP_PER_ENDURANCE = 4;
export const HP_PER_LEVEL = 7;

// Szansa trafienia. Przy podobnej zrecznosci pudlo jest wyjatkiem, a nie
// polowa wszystkich prob. Duza roznica DEX nadal pozostaje odczuwalna.
export const BASE_HIT_CHANCE = 0.88;
export const HIT_CHANCE_PER_AGILITY_DIFF = 0.01;
export const MIN_HIT_CHANCE = 0.6;
export const MAX_HIT_CHANCE = 0.97;

// Szansa na sparowanie (tylko gdy cios trafil).
export const PARRY_CHANCE_PER_RATING = 0.004;
export const PARRY_CHANCE_PER_INTELLIGENCE = 0.0005;
export const MAX_PARRY_CHANCE = 0.3;

// Szansa na trafienie krytyczne (tylko gdy cios nie zostal sparowany).
export const BASE_CRIT_CHANCE = 0.03;
export const CRIT_CHANCE_PER_AGILITY = 0.0015;
export const CRIT_CHANCE_PER_EXPERTISE_LEVEL = 0.002;
export const CRIT_CHANCE_PER_ITEM_POINT = 0.0035;
export const CRIT_RESISTANCE_PER_INTELLIGENCE = 0.0005;
export const MAX_CRIT_CHANCE = 0.5;
export const CRIT_DAMAGE_MULTIPLIER = 1.5;

// Obrazenia.
export const EQUIPMENT_DAMAGE_MULTIPLIER = 1.2;
export const PRIMARY_ATTRIBUTE_TO_DAMAGE = 0.5;
export const EXPERTISE_LEVELS_PER_DAMAGE_POINT = 2;
export const ENDURANCE_TO_DEFENSE = 0.25;
export const DEFENSE_MITIGATION_PER_POINT = 0.02;
export const MIN_DAMAGE = 1;
export const BASE_UNARMED_ATTACK = 3;

// Bezpiecznik przed nieskonczona petla (remis, jesli obie strony przetrwaja).
export const MAX_BATTLE_ROUNDS = 20;

// Ekspertyza broni.
export const WEAPON_EXPERTISE_XP_PER_HIT = 5;
export const WEAPON_EXPERTISE_BASE_XP_TO_NEXT_LEVEL = 75;
export const WEAPON_EXPERTISE_XP_GROWTH_PER_LEVEL = 25;
export const MAX_WEAPON_EXPERTISE_LEVEL = 20;
