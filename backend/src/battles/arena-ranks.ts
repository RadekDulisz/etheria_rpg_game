export interface ArenaRankDetails {
  title: string;
  color: string;
  frame: 'ash' | 'iron' | 'bronze' | 'silver' | 'gold' | 'crimson' | 'legend';
  threshold: number;
}

const ARENA_RANKS: Array<ArenaRankDetails> = [
  { threshold: 0, title: 'Nowicjusz Areny', color: '#8c8982', frame: 'ash' },
  { threshold: 1100, title: 'Pretendent', color: '#b58b58', frame: 'bronze' },
  { threshold: 1250, title: 'Żelazny Wojownik', color: '#aeb8bd', frame: 'iron' },
  { threshold: 1450, title: 'Gladiator', color: '#c9d8df', frame: 'silver' },
  { threshold: 1700, title: 'Mistrz Areny', color: '#e0b95f', frame: 'gold' },
  { threshold: 2000, title: 'Czempion Etherii', color: '#db6d61', frame: 'crimson' },
  { threshold: 2350, title: 'Legenda Koloseum', color: '#d9b6ff', frame: 'legend' },
];

export function getArenaRankDetails(rating: number): ArenaRankDetails {
  return [...ARENA_RANKS]
    .reverse()
    .find((rank) => rating >= rank.threshold) ?? ARENA_RANKS[0];
}

export function getNextArenaRankDetails(rating: number): ArenaRankDetails | null {
  return ARENA_RANKS.find((rank) => rank.threshold > rating) ?? null;
}
