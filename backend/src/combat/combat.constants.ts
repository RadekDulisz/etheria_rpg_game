/**
 * Wszystkie liczby balansowe silnika walki w jednym miejscu - celowo
 * proste formuly (liniowe), latwe do uzasadnienia i do przestrojenia
 * pozniej (kandydat pod przyszly panel administracyjny, sekcja 3).
 */

// HP jest wyliczane na starcie kazdej walki, nie przechowywane.
export const BASE_HP = 50;
export const HP_PER_ENDURANCE = 5;
export const HP_PER_LEVEL = 10;

// Szansa trafienia.
export const BASE_HIT_CHANCE = 0.5;
export const HIT_CHANCE_PER_AGILITY_DIFF = 0.02;
export const MIN_HIT_CHANCE = 0.1;
export const MAX_HIT_CHANCE = 0.95;

// Szansa na sparowanie (tylko gdy cios trafil).
export const PARRY_CHANCE_PER_RATING = 0.01;
export const PARRY_CHANCE_PER_INTELLIGENCE = 0.002;
export const MAX_PARRY_CHANCE = 0.5;

// Szansa na trafienie krytyczne (tylko gdy cios nie zostal sparowany).
export const BASE_CRIT_CHANCE = 0.05;
export const CRIT_CHANCE_PER_AGILITY = 0.005;
export const CRIT_CHANCE_PER_EXPERTISE_LEVEL = 0.01;
export const CRIT_CHANCE_PER_ITEM_POINT = 0.01;
export const CRIT_RESISTANCE_PER_INTELLIGENCE = 0.0025;
export const MAX_CRIT_CHANCE = 0.5;
export const CRIT_DAMAGE_MULTIPLIER = 1.5;

// Obrazenia.
export const PRIMARY_ATTRIBUTE_TO_DAMAGE = 0.5;
export const EXPERTISE_TO_DAMAGE = 2;
export const ENDURANCE_TO_DEFENSE = 0.3;
export const MIN_DAMAGE = 1;
export const BASE_UNARMED_ATTACK = 3;

// Bezpiecznik przed nieskonczona petla (remis, jesli obie strony przetrwaja).
export const MAX_BATTLE_ROUNDS = 20;

// Ekspertyza broni.
export const WEAPON_EXPERTISE_XP_PER_HIT = 5;
export const WEAPON_EXPERTISE_XP_PER_LEVEL = 50;
