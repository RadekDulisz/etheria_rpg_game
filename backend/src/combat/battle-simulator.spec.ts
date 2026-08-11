import { simulateBattle } from './battle-simulator';
import { CombatSnapshot } from './combat.types';

function snapshot(id: string, overrides: Partial<CombatSnapshot> = {}): CombatSnapshot {
  return {
    combatantId: id,
    strength: 10,
    agility: 10,
    endurance: 5,
    intelligence: 5,
    attackPower: 10,
    defensePower: 0,
    parryRating: 0,
    weaponExpertiseLevel: 1,
    weaponType: 'SWORD',
    ...overrides,
  };
}

describe('simulateBattle', () => {
  it('can continue a journey battle from explicitly provided health', () => {
    const result = simulateBattle(snapshot('a'), 5, snapshot('b'), 5, () => 0.5, { attacker: 7, defender: 9 });
    expect(result.rounds[0].actorHpAfter).toBe(7);
    expect(result.rounds[0].targetHpAfter).toBeLessThanOrEqual(9);
  });
  it('znacznie silniejszy atakujacy wygrywa (deterministyczny RNG - zawsze trafienie, brak parowania/krytyka)', () => {
    // rng zawsze zwraca 0.4: < kazda hitChance (>=0.5 przy rownej zrecznosci
    // lub wiecej), ale >= typowych progow parry/crit - czyste trafienia.
    const rng = () => 0.4;

    const attacker = snapshot('attacker', { attackPower: 50, strength: 20 });
    const defender = snapshot('defender', { attackPower: 1, strength: 0, endurance: 1 });

    const result = simulateBattle(attacker, 10, defender, 1, rng);

    expect(result.result).toBe('ATTACKER_WIN');
    expect(result.rounds.length).toBeGreaterThan(0);
    expect(result.attackerHitsLanded).toBeGreaterThan(0);
  });

  it('konczy sie remisem po MAX_BATTLE_ROUNDS, gdy nikt nigdy nie trafia', () => {
    const rng = () => 0.999; // zawsze > kazda hitChance -> same pudla

    const result = simulateBattle(snapshot('a'), 5, snapshot('b'), 5, rng);

    expect(result.result).toBe('DRAW');
    expect(result.attackerHitsLanded).toBe(0);
    expect(result.defenderHitsLanded).toBe(0);
  });

  it('po limicie rund przyznaje zwyciestwo stronie z wiekszym procentem zdrowia', () => {
    const rng = () => 0.4;
    const attacker = snapshot('attacker', { attackPower: 12, damageMin: 12, damageMax: 12 });
    const defender = snapshot('defender', { attackPower: 5, damageMin: 5, damageMax: 5 });

    const result = simulateBattle(attacker, 100, defender, 100, rng);

    expect(result.result).toBe('ATTACKER_WIN');
    expect(result.rounds).toHaveLength(40);
  });

  it('numeruje rundy naprzemiennie (attacker, defender) z tym samym roundNumber', () => {
    const rng = () => 0.4;
    const result = simulateBattle(snapshot('attacker'), 1, snapshot('defender'), 1, rng);

    expect(result.rounds[0].roundNumber).toBe(1);
    expect(result.rounds[0].actorId).toBe('attacker');
    expect(result.rounds[1].roundNumber).toBe(1);
    expect(result.rounds[1].actorId).toBe('defender');
  });

  it('HP nigdy nie spada ponizej zera w zapisanych rundach', () => {
    const rng = () => 0.4;
    const attacker = snapshot('attacker', { attackPower: 1000 });
    const result = simulateBattle(attacker, 1, snapshot('defender'), 1, rng);

    for (const round of result.rounds) {
      expect(round.actorHpAfter).toBeGreaterThanOrEqual(0);
      expect(round.targetHpAfter).toBeGreaterThanOrEqual(0);
    }
  });

  it('wiekszosc wyrownanych walk konczy sie przed limitem 20 rund', () => {
    const representativeFighter = {
      strength: 22,
      agility: 12,
      endurance: 22,
      intelligence: 6,
      attackPower: 5,
      damageMin: 4,
      damageMax: 6,
      defensePower: 17,
      parryRating: 14,
      maxHpBonus: 40,
      criticalChanceBonus: 9,
      weaponExpertiseLevel: 13,
      weaponType: 'SWORD' as const,
    };
    const roundCounts: number[] = [];

    for (let seed = 1; seed <= 300; seed += 1) {
      const result = simulateBattle(
        snapshot('attacker', representativeFighter),
        8,
        snapshot('defender', representativeFighter),
        8,
        seededRng(seed),
      );
      roundCounts.push(result.rounds[result.rounds.length - 1].roundNumber);
    }

    const completedBeforeLimit = roundCounts.filter((round) => round < 20).length;
    const averageRounds =
      roundCounts.reduce((total, round) => total + round, 0) / roundCounts.length;

    expect(completedBeforeLimit / roundCounts.length).toBeGreaterThanOrEqual(0.75);
    expect(averageRounds).toBeLessThan(18);
  });
});

function seededRng(seed: number): () => number {
  let state = seed;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
