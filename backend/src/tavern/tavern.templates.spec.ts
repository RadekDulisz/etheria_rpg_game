import { buildTavernOffers, tavernRefreshCost } from './tavern.templates';

describe('tavern templates', () => {
  it('generates exactly one offer for every difficulty', () => {
    const offers = buildTavernOffers(10, [], () => 0);
    expect(offers.map((offer) => offer.difficulty)).toEqual(['EASY', 'MEDIUM', 'HARD']);
    expect(offers.every((offer) => offer.goldMax > offer.goldMin)).toBe(true);
    expect(offers[2].experienceMax > offers[0].experienceMax).toBe(true);
  });

  it('avoids the previous template when another one is available', () => {
    const first = buildTavernOffers(10, [], () => 0);
    const next = buildTavernOffers(10, first.map((offer) => offer.templateKey), () => 0);
    expect(next.every((offer, index) => offer.templateKey !== first[index].templateKey)).toBe(true);
  });

  it('increases the price of subsequent refreshes', () => {
    expect(tavernRefreshCost(10, 0)).toBe(25);
    expect(tavernRefreshCost(10, 1)).toBe(50);
    expect(tavernRefreshCost(10, 2)).toBe(100);
  });
});
