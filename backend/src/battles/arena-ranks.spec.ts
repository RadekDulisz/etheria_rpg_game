import { getArenaRankDetails, getNextArenaRankDetails } from './arena-ranks';

describe('arena ranks', () => {
  it('assigns titles at exact rating thresholds', () => {
    expect(getArenaRankDetails(1099).title).toBe('Nowicjusz Areny');
    expect(getArenaRankDetails(1100).title).toBe('Pretendent');
    expect(getArenaRankDetails(1450).title).toBe('Gladiator');
    expect(getArenaRankDetails(2350).title).toBe('Legenda Koloseum');
  });

  it('reports progress toward the next cosmetic frame', () => {
    expect(getNextArenaRankDetails(1000)?.title).toBe('Pretendent');
    expect(getNextArenaRankDetails(2350)).toBeNull();
  });
});
