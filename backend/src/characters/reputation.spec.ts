import { calculatePvpReputationDelta, getReputationRank } from './reputation';

describe('reputation helpers', () => {
  it('nagradza wygrana nad silniejszym przeciwnikiem', () => {
    expect(calculatePvpReputationDelta(1, 10, true)).toBe(2);
  });

  it('karze atak na duzo slabszego przeciwnika', () => {
    expect(calculatePvpReputationDelta(20, 1, true)).toBe(-2);
  });

  it('nie zmienia reputacji w pozostalych przypadkach', () => {
    expect(calculatePvpReputationDelta(5, 7, false)).toBe(0);
  });

  it('mapuje reputacje na czytelne rangi', () => {
    expect(getReputationRank(10000)).toBe('Noblesse');
    expect(getReputationRank(150)).toBe('Rycerz');
    expect(getReputationRank(1)).toBe('Włóczęga');
    expect(getReputationRank(0)).toBe('Neutralny');
    expect(getReputationRank(-150)).toBe('Rozbójnik');
    expect(getReputationRank(-10000)).toBe('Nemezis Etherii');
    expect(getReputationRank(20000)).toBe('Noblesse');
  });
});
