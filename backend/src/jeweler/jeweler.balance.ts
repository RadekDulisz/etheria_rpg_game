import { GemTier } from '@prisma/client';

export const GEM_COMBINE_RATIO = 3;

export const GEM_TIER_ORDER: readonly GemTier[] = [
  GemTier.SHARD,
  GemTier.CUT,
  GemTier.FLAWLESS,
  GemTier.ROYAL,
  GemTier.ANCIENT,
];

export const GEM_COMBINE_COST_BY_RESULT: Partial<Record<GemTier, bigint>> = {
  [GemTier.CUT]: 120n,
  [GemTier.FLAWLESS]: 480n,
  [GemTier.ROYAL]: 1_800n,
  [GemTier.ANCIENT]: 6_000n,
};

export const GEM_EXTRACTION_COST: Record<GemTier, bigint> = {
  [GemTier.SHARD]: 60n,
  [GemTier.CUT]: 240n,
  [GemTier.FLAWLESS]: 900n,
  [GemTier.ROYAL]: 3_000n,
  [GemTier.ANCIENT]: 9_000n,
};

export function nextGemTier(tier: GemTier): GemTier | null {
  const index = GEM_TIER_ORDER.indexOf(tier);
  return index < 0 || index === GEM_TIER_ORDER.length - 1
    ? null
    : GEM_TIER_ORDER[index + 1];
}

export function calculateGemCombineCost(resultTier: GemTier, combineCount: number): bigint {
  const unitCost = GEM_COMBINE_COST_BY_RESULT[resultTier];
  if (unitCost === undefined || !Number.isInteger(combineCount) || combineCount < 1) {
    throw new RangeError('Nieprawidłowa receptura łączenia klejnotów');
  }
  return unitCost * BigInt(combineCount);
}

export function calculateGemExtractionCost(tier: GemTier): bigint {
  return GEM_EXTRACTION_COST[tier];
}
