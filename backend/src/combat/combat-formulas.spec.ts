import {
  calculateCritChance,
  calculateDamage,
  calculateAttackRange,
  calculateEffectiveDefense,
  calculateHitChance,
  calculateMaxHp,
  calculateParryChance,
  resolveAttack,
} from './combat-formulas';
import { CombatSnapshot } from './combat.types';

function snapshot(overrides: Partial<CombatSnapshot> = {}): CombatSnapshot {
  return {
    combatantId: 'combatant-1',
    strength: 10,
    agility: 10,
    endurance: 10,
    intelligence: 10,
    attackPower: 10,
    defensePower: 5,
    parryRating: 0,
    weaponExpertiseLevel: 1,
    weaponType: 'SWORD',
    ...overrides,
  };
}

describe('calculateMaxHp', () => {
  it('rosnie z wytrzymaloscia i poziomem', () => {
    expect(calculateMaxHp(0, 1)).toBe(57); // 50 + 0 + 7
    expect(calculateMaxHp(10, 1)).toBe(97); // 50 + 40 + 7
    expect(calculateMaxHp(10, 5)).toBe(125); // 50 + 40 + 35
  });
});

describe('calculateHitChance', () => {
  it('zwraca 88% przy rownej zrecznosci obu stron', () => {
    expect(calculateHitChance(snapshot({ agility: 10 }), snapshot({ agility: 10 }))).toBeCloseTo(
      0.88,
    );
  });

  it('rosnie, gdy atakujacy jest bardziej zrecznny', () => {
    const chance = calculateHitChance(snapshot({ agility: 20 }), snapshot({ agility: 10 }));
    expect(chance).toBeGreaterThan(0.5);
  });

  it('nie spada ponizej dolnego limitu (MIN_HIT_CHANCE)', () => {
    const chance = calculateHitChance(snapshot({ agility: 0 }), snapshot({ agility: 1000 }));
    expect(chance).toBeCloseTo(0.6);
  });

  it('nie przekracza gornego limitu (MAX_HIT_CHANCE)', () => {
    const chance = calculateHitChance(snapshot({ agility: 1000 }), snapshot({ agility: 0 }));
    expect(chance).toBeCloseTo(0.97);
  });

  it('uwzglednia premie trafienia i unik wynikajace z cech spotkania', () => {
    expect(calculateHitChance(
      snapshot({ hitChanceModifier: 0.03 }),
      snapshot({ evasionChanceModifier: 0.02 }),
    )).toBeCloseTo(0.89);
  });
});

describe('calculateParryChance', () => {
  it('jest zerowa bez parryRating', () => {
    expect(calculateParryChance(snapshot({ parryRating: 0, intelligence: 0 }))).toBe(0);
  });

  it('rosnie z parryRating, ale nie przekracza 30%', () => {
    expect(calculateParryChance(snapshot({ parryRating: 20, intelligence: 0 }))).toBeCloseTo(0.08);
    expect(calculateParryChance(snapshot({ parryRating: 999 }))).toBeCloseTo(0.3);
  });

  it('rosnie z inteligencja', () => {
    expect(calculateParryChance(snapshot({ intelligence: 20 }))).toBeGreaterThan(
      calculateParryChance(snapshot({ intelligence: 0 })),
    );
  });

  it('uwzglednia bezposrednia premie parowania przeciwnika PvE', () => {
    expect(calculateParryChance(snapshot({ intelligence: 0, parryChanceModifier: 0.05 })))
      .toBeCloseTo(0.05);
  });
});

describe('calculateCritChance', () => {
  it('rosnie z agility i poziomem ekspertyzy broni', () => {
    const base = calculateCritChance(snapshot({ agility: 0, weaponExpertiseLevel: 0 }));
    const higher = calculateCritChance(snapshot({ agility: 20, weaponExpertiseLevel: 5 }));
    expect(higher).toBeGreaterThan(base);
  });

  it('maleje wraz z inteligencja obroncy', () => {
    const attacker = snapshot({ agility: 20 });
    expect(calculateCritChance(attacker, snapshot({ intelligence: 30 }))).toBeLessThan(
      calculateCritChance(attacker, snapshot({ intelligence: 0 })),
    );
  });

  it('nie pozwala niskopoziomowej postaci latwo osiagnac limitu', () => {
    const chance = calculateCritChance(snapshot({
      agility: 17,
      weaponExpertiseLevel: 3,
      criticalChanceBonus: 50,
    }));
    expect(chance).toBeLessThan(0.25);
  });

  it('nigdy nie przekracza twardego limitu 50%', () => {
    expect(calculateCritChance(snapshot({
      agility: 999,
      weaponExpertiseLevel: 999,
      criticalChanceBonus: 999,
    }))).toBe(0.5);
  });

  it('uwzglednia premie i odpornosc na trafienie krytyczne', () => {
    const attacker = snapshot({ agility: 0, weaponExpertiseLevel: 0, criticalChanceModifier: 0.05 });
    const defender = snapshot({ intelligence: 0, criticalResistanceModifier: 0.02 });
    expect(calculateCritChance(attacker, defender)).toBeCloseTo(0.06);
  });
});

describe('calculateDamage', () => {
  it('nigdy nie schodzi ponizej MIN_DAMAGE, nawet przy wysokiej obronie', () => {
    const dmg = calculateDamage(
      snapshot({ attackPower: 1, strength: 0, weaponExpertiseLevel: 0 }),
      snapshot({ defensePower: 999, endurance: 999 }),
      false,
    );
    expect(dmg).toBe(1);
  });

  it('trafienie krytyczne mnozy obrazenia x1.5 (zaokraglone)', () => {
    const attacker = snapshot({ attackPower: 10, strength: 0, weaponExpertiseLevel: 0 });
    const defender = snapshot({ defensePower: 0, endurance: 0 });

    const normal = calculateDamage(attacker, defender, false);
    const crit = calculateDamage(attacker, defender, true);

    expect(crit).toBe(Math.round(normal * 1.5));
  });

  it('obrona redukuje obrazenia procentowo z malejacym zwrotem', () => {
    const attacker = snapshot({ attackPower: 40, strength: 10, weaponExpertiseLevel: 1 });
    const unarmored = calculateDamage(attacker, snapshot({ defensePower: 0, endurance: 0 }), false);
    const armored = calculateDamage(attacker, snapshot({ defensePower: 20, endurance: 0 }), false);
    expect(armored).toBeLessThan(unarmored);
    expect(armored).toBeGreaterThan(1);
  });

  it('uwzglednia modyfikatory zadawanych i otrzymywanych obrazen', () => {
    const base = calculateDamage(
      snapshot({ attackPower: 20, strength: 0, weaponExpertiseLevel: 0 }),
      snapshot({ defensePower: 0, endurance: 0 }),
      false,
    );
    const modified = calculateDamage(
      snapshot({ attackPower: 20, strength: 0, weaponExpertiseLevel: 0, damageDealtMultiplier: 1.1 }),
      snapshot({ defensePower: 0, endurance: 0, damageTakenMultiplier: 0.9 }),
      false,
    );
    expect(modified).toBe(Math.round(base * 1.1 * 0.9));
  });

  it.each([
    ['SWORD', 'strength'],
    ['DAGGER', 'agility'],
    ['BOW', 'agility'],
    ['STAFF', 'intelligence'],
  ] as const)('%s skaluje obrazenia przez atrybut %s', (weaponType, attribute) => {
    const base = calculateDamage(snapshot({ weaponType, strength: 0, agility: 0, intelligence: 0 }), snapshot({ defensePower: 0, endurance: 0 }), false);
    const boosted = calculateDamage(snapshot({ weaponType, strength: 0, agility: 0, intelligence: 0, [attribute]: 20 }), snapshot({ defensePower: 0, endurance: 0 }), false);
    expect(boosted).toBeGreaterThan(base);
  });
});

describe('efektywne statystyki bojowe', () => {
  it('pokazuje zakres ataku wraz z atrybutem głównym i biegłością', () => {
    expect(calculateAttackRange(snapshot({
      damageMin: 8,
      damageMax: 12,
      strength: 20,
      weaponExpertiseLevel: 3,
    }))).toEqual({ min: 20, max: 25 });
  });

  it('pokazuje obronę pancerza wraz z premią z wytrzymałości', () => {
    expect(calculateEffectiveDefense(snapshot({ defensePower: 7, endurance: 20 }))).toBe(12);
  });
});

describe('resolveAttack', () => {
  it('kolejnosc rng: trafienie -> parowanie -> krytyk (miss przy pierwszym rzucie)', () => {
    const rng = jest.fn().mockReturnValueOnce(0.99); // > hitChance (0.5) -> miss
    const outcome = resolveAttack(snapshot(), snapshot(), rng);

    expect(outcome).toEqual({ hit: false, parried: false, critical: false, damage: 0 });
    expect(rng).toHaveBeenCalledTimes(1);
  });

  it('trafienie + parowanie konczy sie zerowymi obrazeniami', () => {
    const rng = jest
      .fn()
      .mockReturnValueOnce(0.01) // < hitChance -> trafienie
      .mockReturnValueOnce(0.0); // < parryChance -> sparowane
    const outcome = resolveAttack(snapshot(), snapshot({ parryRating: 50 }), rng);

    expect(outcome.hit).toBe(true);
    expect(outcome.parried).toBe(true);
    expect(outcome.damage).toBe(0);
  });

  it('trafienie + brak parowania + krytyk liczy podwyzszone obrazenia', () => {
    const rng = jest
      .fn()
      .mockReturnValueOnce(0.01) // trafienie
      .mockReturnValueOnce(0.99) // nie sparowane
      .mockReturnValueOnce(0.0) // krytyk
      .mockReturnValueOnce(0.5); // rzut obrazen broni
    const outcome = resolveAttack(snapshot(), snapshot(), rng);

    expect(outcome.hit).toBe(true);
    expect(outcome.parried).toBe(false);
    expect(outcome.critical).toBe(true);
    expect(outcome.damage).toBeGreaterThan(0);
  });
});
