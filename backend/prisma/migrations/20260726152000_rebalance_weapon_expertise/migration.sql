-- Zachowujemy calkowite EXP, ale przeliczamy zapisany poziom wedlug
-- nieliniowej krzywej: 75 EXP na pierwszy awans, potem +25 na kazdy kolejny.
-- Poziom jest ograniczony do 20.
UPDATE "combatant_weapon_expertise"
SET "level" = LEAST(
  20,
  1 + FLOOR(
    (
      -5 + SQRT(25 + (8 * "experience"::numeric / 25))
    ) / 2
  )::integer
);
