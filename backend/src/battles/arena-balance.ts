export function calculateArenaGoldReward(level: number): number {
  return 5 + Math.max(1, level) * 2;
}

export function calculateArenaExperienceReward(level: number): number {
  return 3 + Math.ceil(Math.max(1, level) * 1.5);
}

export const ARENA_HP_COST_PERCENT = 8;
export const ARENA_MINIMUM_HP_PERCENT = 25;
const ARENA_RATING_K_FACTOR = 32;

export function calculateArenaHpCost(maxHp: number): number {
  return Math.max(1, Math.ceil(Math.max(1, maxHp) * ARENA_HP_COST_PERCENT / 100));
}

export function canEnterArena(currentHp: number, maxHp: number): boolean {
  return currentHp > Math.max(1, maxHp) * ARENA_MINIMUM_HP_PERCENT / 100;
}

export function calculateArenaReputationReward(
  opponentReputation: number,
  attackerWon: boolean,
): number {
  if (!attackerWon || opponentReputation === 0) return 0;
  return opponentReputation < 0 ? 1 : -1;
}

export function estimateArenaOpponentRating(
  playerRating: number,
  playerPower: number,
  opponentPower: number,
): number {
  const safePlayerPower = Math.max(1, playerPower);
  const powerDifference = Math.max(
    -160,
    Math.min(160, Math.round((opponentPower / safePlayerPower - 1) * 500)),
  );
  return Math.max(0, playerRating + powerDifference);
}

export function calculateArenaRatingChange(
  currentRating: number,
  playerPower: number,
  opponentPower: number,
  result: 'ATTACKER_WIN' | 'DEFENDER_WIN' | 'DRAW',
): number {
  const estimatedOpponentRating = estimateArenaOpponentRating(
    currentRating,
    playerPower,
    opponentPower,
  );
  const expectedScore = 1 / (
    1 + 10 ** ((estimatedOpponentRating - currentRating) / 400)
  );
  const actualScore = result === 'ATTACKER_WIN' ? 1 : result === 'DRAW' ? 0.5 : 0;
  const change = Math.round(ARENA_RATING_K_FACTOR * (actualScore - expectedScore));

  if (result === 'ATTACKER_WIN') return Math.max(8, change);
  if (result === 'DEFENDER_WIN') return Math.min(-8, change);
  return change;
}
