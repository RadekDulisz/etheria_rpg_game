import { buildCombatSnapshot } from './combat-snapshot.builder';

const baseStats = {
  combatantId: 'combatant-1',
  strength: 5,
  agility: 5,
  endurance: 5,
  intelligence: 5,
  unspentPoints: 0,
  parryRating: 2,
  updatedAt: new Date(),
} as const;

function equipped(overrides: Record<string, unknown>) {
  return {
    combatantId: 'combatant-1',
    slot: 'WEAPON',
    itemId: 'item-1',
    equippedAt: new Date(),
    item: {
      id: 'item-1',
      name: 'Test Item',
      description: null,
      category: 'WEAPON',
      slotGroup: 'WEAPON',
      weaponType: 'SWORD',
      maxStack: 1,
      price: 0,
      iconUrl: null,
      minLevel: 1,
      strengthBonus: 0,
      agilityBonus: 0,
      enduranceBonus: 0,
      intelligenceBonus: 0,
      attackPower: 0,
      defensePower: 0,
      parryBonus: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    },
    ...('slot' in overrides ? { slot: overrides.slot } : {}),
  } as never;
}

describe('buildCombatSnapshot', () => {
  it('bez ekwipunku daje bazowe staty i minimalny atak "goloraka"', () => {
    const snapshot = buildCombatSnapshot('combatant-1', baseStats, [], []);

    expect(snapshot.strength).toBe(5);
    expect(snapshot.attackPower).toBeGreaterThan(0); // BASE_UNARMED_ATTACK
    expect(snapshot.weaponType).toBeNull();
  });

  it('dolicza bonusy statystyk z zalozonych przedmiotow', () => {
    const items = [equipped({ strengthBonus: 3, attackPower: 10, weaponType: 'AXE' })];

    const snapshot = buildCombatSnapshot('combatant-1', baseStats, items, []);

    expect(snapshot.strength).toBe(8); // 5 + 3
    expect(snapshot.attackPower).toBe(10);
    expect(snapshot.weaponType).toBe('AXE');
  });

  it('sumuje parryBonus z ekwipunku do bazowego parryRating', () => {
    const items = [
      equipped({ parryBonus: 15, attackPower: 5, weaponType: null, slotGroup: 'SHIELD_SIGIL' }),
    ];

    const snapshot = buildCombatSnapshot('combatant-1', baseStats, items, []);

    expect(snapshot.parryRating).toBe(17); // 2 (bazowe) + 15
  });

  it('pobiera poziom ekspertyzy odpowiadajacy typowi zalozonej broni', () => {
    const items = [equipped({ weaponType: 'BOW', attackPower: 8 })];
    const expertise = [
      {
        combatantId: 'combatant-1',
        weaponType: 'BOW',
        experience: 100,
        level: 3,
        updatedAt: new Date(),
      },
      {
        combatantId: 'combatant-1',
        weaponType: 'SWORD',
        experience: 999,
        level: 9,
        updatedAt: new Date(),
      },
    ] as never;

    const snapshot = buildCombatSnapshot('combatant-1', baseStats, items, expertise);

    expect(snapshot.weaponExpertiseLevel).toBe(2);
  });
});
