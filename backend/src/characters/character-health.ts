const REGEN_INTERVAL_MS = 5 * 60 * 1000;
const REGEN_PERCENT_PER_INTERVAL = 5;

export function getCurrentHp(
  storedHp: number | null,
  maxHp: number,
  healthUpdatedAt: Date,
  now = new Date(),
  regenMultiplier = 1,
): number {
  if (maxHp <= 0) return 0;
  if (storedHp === null) return maxHp;

  const intervals = Math.floor(
    Math.max(0, now.getTime() - healthUpdatedAt.getTime()) / REGEN_INTERVAL_MS,
  );
  const regeneratedPerInterval = Math.max(
    1,
    Math.ceil(maxHp * REGEN_PERCENT_PER_INTERVAL / 100 * Math.max(1, regenMultiplier)),
  );
  return Math.min(maxHp, Math.max(1, storedHp) + intervals * regeneratedPerInterval);
}
