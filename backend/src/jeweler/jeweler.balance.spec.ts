import { GemTier } from '@prisma/client';
import {
  calculateGemCombineCost,
  calculateGemExtractionCost,
  GEM_COMBINE_RATIO,
  nextGemTier,
} from './jeweler.balance';

describe('jeweler balance', () => {
  it('łączy trzy identyczne klejnoty w kolejny szlif', () => {
    expect(GEM_COMBINE_RATIO).toBe(3);
    expect(nextGemTier(GemTier.SHARD)).toBe(GemTier.CUT);
    expect(nextGemTier(GemTier.ROYAL)).toBe(GemTier.ANCIENT);
    expect(nextGemTier(GemTier.ANCIENT)).toBeNull();
  });

  it('skaluje deterministyczny koszt z liczbą połączeń', () => {
    expect(calculateGemCombineCost(GemTier.CUT, 1)).toBe(120n);
    expect(calculateGemCombineCost(GemTier.ANCIENT, 2)).toBe(12_000n);
  });

  it('wycenia bezpieczne odzyskanie według szlifu', () => {
    expect(calculateGemExtractionCost(GemTier.SHARD)).toBe(60n);
    expect(calculateGemExtractionCost(GemTier.ANCIENT)).toBe(9_000n);
  });
});
