const REGEN_INTERVAL_MS = 5 * 60 * 1000;
const REGEN_PERCENT_PER_INTERVAL = 5;

export interface HealthRegenerationPreview {
  currentHp: number;
  amount: number;
  nextHp: number;
  nextTickAt: Date | null;
  intervalSeconds: number;
  percentPerTick: number;
}

export function getHealthRegenerationPreview(
  storedHp: number | null,
  maxHp: number,
  healthUpdatedAt: Date,
  now = new Date(),
  regenMultiplier = 1,
): HealthRegenerationPreview {
  const safeMultiplier = Math.max(1, regenMultiplier);
  const intervalSeconds = REGEN_INTERVAL_MS / 1000;
  const percentPerTick = REGEN_PERCENT_PER_INTERVAL * safeMultiplier;
  if (maxHp <= 0) return { currentHp: 0, amount: 0, nextHp: 0, nextTickAt: null, intervalSeconds, percentPerTick };
  if (storedHp === null) return { currentHp: maxHp, amount: 0, nextHp: maxHp, nextTickAt: null, intervalSeconds, percentPerTick };

  const elapsedMs = Math.max(0, now.getTime() - healthUpdatedAt.getTime());
  const intervals = Math.floor(elapsedMs / REGEN_INTERVAL_MS);
  const regeneratedPerInterval = Math.max(
    1,
    Math.ceil(maxHp * REGEN_PERCENT_PER_INTERVAL / 100 * safeMultiplier),
  );
  const currentHp = Math.min(maxHp, Math.max(1, storedHp) + intervals * regeneratedPerInterval);
  if (currentHp >= maxHp) {
    return { currentHp, amount: 0, nextHp: currentHp, nextTickAt: null, intervalSeconds, percentPerTick };
  }

  const nextHp = Math.min(maxHp, currentHp + regeneratedPerInterval);
  return {
    currentHp,
    amount: nextHp - currentHp,
    nextHp,
    nextTickAt: new Date(healthUpdatedAt.getTime() + (intervals + 1) * REGEN_INTERVAL_MS),
    intervalSeconds,
    percentPerTick,
  };
}

export function getCurrentHp(
  storedHp: number | null,
  maxHp: number,
  healthUpdatedAt: Date,
  now = new Date(),
  regenMultiplier = 1,
): number {
  return getHealthRegenerationPreview(storedHp, maxHp, healthUpdatedAt, now, regenMultiplier).currentHp;
}
