import { getProvisionDefinition, rollStageWoundPercent, TAVERN_BAG_CAPACITY, TAVERN_PROVISIONS } from './tavern.provisions';

describe('tavern provisions balance', () => {
  it('keeps the expedition bag deliberately small', () => {
    expect(TAVERN_BAG_CAPACITY).toBe(3);
    expect(TAVERN_PROVISIONS).toHaveLength(3);
  });

  it('scales prices with level and preserves healing hierarchy', () => {
    const potion = getProvisionDefinition('HEALING_POTION');
    const bandage = getProvisionDefinition('TRAVEL_BANDAGE');
    expect(potion.healPercent).toBe(20);
    expect(bandage.healPercent).toBe(10);
    expect(potion.price(20)).toBeGreaterThan(potion.price(1));
  });

  it('makes failed and harder stages inflict more wounds', () => {
    expect(rollStageWoundPercent('EASY', true, () => 0)).toBe(1);
    expect(rollStageWoundPercent('EASY', false, () => 0)).toBe(3);
    expect(rollStageWoundPercent('HARD', false, () => 0.999)).toBe(7);
  });
});
