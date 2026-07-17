export const REPUTATION_BULLYING_LEVEL_GAP = 5;
export const REPUTATION_BULLYING_PENALTY = -2;
export const REPUTATION_DAREDEVIL_BONUS = 2;

export const REPUTATION_VISUAL_LIMIT = 10000;

export interface ReputationRank {
  name: string;
  color: string;
  threshold: number;
  alignment: 'GOOD' | 'EVIL' | 'NEUTRAL';
}

export const GOOD_REPUTATION_RANKS: ReputationRank[] = [
  { name: 'Włóczęga', color: '#9bdcff', threshold: 1, alignment: 'GOOD' },
  { name: 'Wasal', color: '#82ccff', threshold: 25, alignment: 'GOOD' },
  { name: 'Dziedzic', color: '#65b9f1', threshold: 75, alignment: 'GOOD' },
  { name: 'Rycerz', color: '#4ca7e8', threshold: 150, alignment: 'GOOD' },
  { name: 'Starszy', color: '#358ed6', threshold: 300, alignment: 'GOOD' },
  { name: 'Baron', color: '#2678c4', threshold: 600, alignment: 'GOOD' },
  { name: 'Wicehrabia', color: '#1d65b0', threshold: 1100, alignment: 'GOOD' },
  { name: 'Hrabia', color: '#18549e', threshold: 1800, alignment: 'GOOD' },
  { name: 'Markiz', color: '#244b9d', threshold: 2800, alignment: 'GOOD' },
  { name: 'Książę', color: '#203f8e', threshold: 4000, alignment: 'GOOD' },
  { name: 'Wielki Książę', color: '#1d367f', threshold: 5500, alignment: 'GOOD' },
  { name: 'Bohater', color: '#313c93', threshold: 7500, alignment: 'GOOD' },
  { name: 'Noblesse', color: '#e5bd58', threshold: 10000, alignment: 'GOOD' },
];

export const EVIL_REPUTATION_RANKS: ReputationRank[] = [
  { name: 'Wyrzutek', color: '#ffaaa5', threshold: 1, alignment: 'EVIL' },
  { name: 'Zbir', color: '#fa8b85', threshold: 25, alignment: 'EVIL' },
  { name: 'Łotr', color: '#f1736d', threshold: 75, alignment: 'EVIL' },
  { name: 'Rozbójnik', color: '#e15c58', threshold: 150, alignment: 'EVIL' },
  { name: 'Oprawca', color: '#cf494a', threshold: 300, alignment: 'EVIL' },
  { name: 'Herszt', color: '#bc3a40', threshold: 600, alignment: 'EVIL' },
  { name: 'Czarny Baron', color: '#a82d38', threshold: 1100, alignment: 'EVIL' },
  { name: 'Krwawy Hrabia', color: '#93232f', threshold: 1800, alignment: 'EVIL' },
  { name: 'Margrabia Cienia', color: '#7f1b29', threshold: 2800, alignment: 'EVIL' },
  { name: 'Mroczny Książę', color: '#6b1625', threshold: 4000, alignment: 'EVIL' },
  { name: 'Władca Otchłani', color: '#581021', threshold: 5500, alignment: 'EVIL' },
  { name: 'Herold Zagłady', color: '#46101f', threshold: 7500, alignment: 'EVIL' },
  { name: 'Nemezis Etherii', color: '#9a4bc2', threshold: 10000, alignment: 'EVIL' },
];

export function calculatePvpReputationDelta(
  attackerLevel: number,
  defenderLevel: number,
  attackerWon: boolean,
): number {
  const levelGap = attackerLevel - defenderLevel;

  if (levelGap >= REPUTATION_BULLYING_LEVEL_GAP) {
    return REPUTATION_BULLYING_PENALTY;
  }

  if (defenderLevel - attackerLevel >= REPUTATION_BULLYING_LEVEL_GAP && attackerWon) {
    return REPUTATION_DAREDEVIL_BONUS;
  }

  return 0;
}

export function getReputationRank(reputation: number): string {
  return getReputationRankDetails(reputation).name;
}

export function getReputationRankDetails(reputation: number): ReputationRank {
  if (reputation === 0) {
    return { name: 'Neutralny', color: '#8f8a82', threshold: 0, alignment: 'NEUTRAL' };
  }
  const ranks = reputation > 0 ? GOOD_REPUTATION_RANKS : EVIL_REPUTATION_RANKS;
  const magnitude = Math.abs(reputation);
  return [...ranks].reverse().find((rank) => magnitude >= rank.threshold) ?? ranks[0];
}
