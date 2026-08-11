import {
  calculateArenaHpCost,
  calculateArenaRatingChange,
  calculateArenaReputationReward,
  calculateArenaExperienceReward,
  calculateArenaGoldReward,
  canEnterArena,
  estimateArenaOpponentRating,
} from './arena-balance';

describe('arena balance', () => {
  it('keeps repeatable arena rewards below expedition rewards', () => {
    expect(calculateArenaGoldReward(10)).toBe(25);
    expect(calculateArenaExperienceReward(10)).toBe(18);
    expect(calculateArenaGoldReward(20)).toBe(45);
    expect(calculateArenaExperienceReward(20)).toBe(33);
  });

  it('charges eight percent of maximum health and blocks exhausted heroes', () => {
    expect(calculateArenaHpCost(247)).toBe(20);
    expect(canEnterArena(62, 247)).toBe(true);
    expect(canEnterArena(61, 247)).toBe(false);
  });

  it('moves rating in the direction of the battle result', () => {
    expect(calculateArenaRatingChange(1000, 100, 100, 'ATTACKER_WIN')).toBe(16);
    expect(calculateArenaRatingChange(1000, 100, 100, 'DEFENDER_WIN')).toBe(-16);
    expect(calculateArenaRatingChange(1000, 100, 100, 'DRAW')).toBe(0);
    expect(calculateArenaRatingChange(1000, 100, 130, 'ATTACKER_WIN')).toBeGreaterThan(16);
  });

  it('estimates an opponent rating from the actual power difference', () => {
    expect(estimateArenaOpponentRating(1000, 100, 100)).toBe(1000);
    expect(estimateArenaOpponentRating(1000, 100, 120)).toBe(1100);
    expect(estimateArenaOpponentRating(1000, 100, 60)).toBe(840);
  });

  it('awards one moral point only for an arena victory', () => {
    expect(calculateArenaReputationReward(-500, true)).toBe(1);
    expect(calculateArenaReputationReward(500, true)).toBe(-1);
    expect(calculateArenaReputationReward(-500, false)).toBe(0);
  });
});
