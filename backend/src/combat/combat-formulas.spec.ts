import {
  calculateCritChance,
  calculateDamage,
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
    expect(calculateMaxHp(0, 1)).toBe(60); // 50 + 0 + 10
    expect(calculateMaxHp(10, 1)).toBe(110); // 50 + 50 + 10
    expect(calculateMaxHp(10, 5)).toBe(150); // 50 + 50 + 50
  });
});

describe('calculateHitChance', () => {
  it('zwraca 50% przy rownej zrecznosci obu stron', () => {
    expect(calculateHitChance(snapshot({ agility: 10 }), snapshot({ agility: 10 }))).toBeCloseTo(
      0.5,
    );
  });

  it('rosnie, gdy atakujacy jest bardziej zrecznny', () => {
    const chance = calculateHitChance(snapshot({ agility: 20 }), snapshot({ agility: 10 }));
    expect(chance).toBeGreaterThan(0.5);
  });

  it('nie spada ponizej dolnego limitu (MIN_HIT_CHANCE)', () => {
    const chance = calculateHitChance(snapshot({ agility: 0 }), snapshot({ agility: 1000 }));
    expect(chance).toBeCloseTo(0.1);
  });

  it('nie przekracza gornego limitu (MAX_HIT_CHANCE)', () => {
    const chance = calculateHitChance(snapshot({ agility: 1000 }), snapshot({ agility: 0 }));
    expect(chance).toBeCloseTo(0.95);
  });
});

describe('calculateParryChance', () => {
  it('jest zerowa bez parryRating', () => {
    expect(calculateParryChance(snapshot({ parryRating: 0, intelligence: 0 }))).toBe(0);
  });

  it('rosnie z parryRating, ale nie przekracza 50%', () => {
    expect(calculateParryChance(snapshot({ parryRating: 20, intelligence: 0 }))).toBeCloseTo(0.2);
    expect(calculateParryChance(snapshot({ parryRating: 999 }))).toBeCloseTo(0.5);
  });

  it('rosnie z inteligencja', () => {
    expect(calculateParryChance(snapshot({ intelligence: 20 }))).toBeGreaterThan(
      calculateParryChance(snapshot({ intelligence: 0 })),
    );
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
