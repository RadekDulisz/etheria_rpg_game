import { calculatePropertyBonuses, calculateRestorationGoldCost } from './property-bonuses';

describe('calculatePropertyBonuses', () => {
  it('dobra reputacja wzmacnia regeneracje i powodzenie wypraw', () => {
    const bonuses = calculatePropertyBonuses(10, 10_000);

    expect(bonuses.alignment).toBe('GOOD');
    expect(bonuses.regenMultiplier).toBe(1.6);
    expect(bonuses.missionSuccessBonus).toBe(0.03);
    expect(bonuses.missionGoldMultiplier).toBe(1);
  });

  it('zla reputacja wzmacnia zloto i szanse zdobycia przedmiotu', () => {
    const bonuses = calculatePropertyBonuses(10, -10_000);

    expect(bonuses.alignment).toBe('EVIL');
    expect(bonuses.missionGoldMultiplier).toBe(1.09);
    expect(bonuses.itemRewardChanceBonus).toBe(0.012);
    expect(bonuses.missionSuccessBonus).toBe(0);
  });

  it('neutralna posiadlosc zapewnia tylko bazowy bonus poziomu', () => {
    const bonuses = calculatePropertyBonuses(4, 0);

    expect(bonuses.alignment).toBe('NEUTRAL');
    expect(bonuses.regenMultiplier).toBe(1.2);
    expect(bonuses.factor).toBe(0);
  });
});

describe('calculateRestorationGoldCost', () => {
  it('zmniejsza poprzedni koszt rytualu o polowe i zaokragla w gore', () => {
    // Poprzednio: 10 + 5 * 3 + 1 * 15 = 40.
    expect(calculateRestorationGoldCost(5, 1)).toBe(20);
    // Poprzednio: 10 + 6 * 3 + 3 * 15 = 73.
    expect(calculateRestorationGoldCost(6, 3)).toBe(37);
  });
});
