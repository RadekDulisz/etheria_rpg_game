import { MISSION_TIERS, missionRanges, rollMissionTier, rollReputationChange } from './mission-balance';

describe('mission balance', () => {
  it('uses probabilities that add up to 100% and keeps tier V at no more than 5%', () => {
    expect(MISSION_TIERS.reduce((sum, tier) => sum + tier.chance, 0)).toBe(100);
    expect(MISSION_TIERS[4].chance).toBeLessThanOrEqual(5);
  });

  it('guarantees tier V on the tenth mission without a tier V result', () => {
    expect(rollMissionTier(0, 9).tier).toBe(5);
    expect(rollMissionTier(0.99, 9).tier).toBe(5);
  });

  it('maps probability boundaries from the most common to the rarest tier', () => {
    expect(rollMissionTier(0, 0).tier).toBe(1);
    expect(rollMissionTier(0.45, 0).tier).toBe(2);
    expect(rollMissionTier(0.73, 0).tier).toBe(3);
    expect(rollMissionTier(0.88, 0).tier).toBe(4);
    expect(rollMissionTier(0.96, 0).tier).toBe(5);
  });

  it('scales gold with level while keeping experience below one whole level', () => {
    const lowLevel = missionRanges(MISSION_TIERS[4], 1);
    const highLevel = missionRanges(MISSION_TIERS[4], 40);
    expect(highLevel.goldMin).toBeGreaterThan(lowLevel.goldMin);
    expect(highLevel.experienceMax).toBeLessThan(40 * 100);
  });

  it('limits experience rewards to the reduced range of 1–9% of a level', () => {
    expect(missionRanges(MISSION_TIERS[0], 20).experienceMin).toBe(20);
    expect(missionRanges(MISSION_TIERS[0], 20).experienceMax).toBe(30);
    expect(missionRanges(MISSION_TIERS[4], 20).experienceMax).toBe(180);
  });

  it('changes reputation by exactly 1–3 points in the chosen direction', () => {
    expect(rollReputationChange('GOOD', 0)).toBe(1);
    expect(rollReputationChange('GOOD', 0.999)).toBe(3);
    expect(rollReputationChange('EVIL', 0)).toBe(-1);
    expect(rollReputationChange('EVIL', 0.999)).toBe(-3);
  });
});
