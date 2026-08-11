import type { TavernProvisionType, TavernQuestDifficulty } from '@prisma/client';

export interface TavernProvisionDefinition {
  type: TavernProvisionType;
  name: string;
  description: string;
  effectLabel: string;
  maxPerQuest: number;
  healPercent: number;
  price: (level: number) => number;
}

export const TAVERN_PROVISIONS: TavernProvisionDefinition[] = [
  {
    type: 'HEALING_POTION',
    name: 'Mikstura leczenia',
    description: 'Gęsty wywar Miry przygotowany z czerwonego mchu i gorzkiego korzenia.',
    effectLabel: 'Przywraca 20% maksymalnego HP',
    maxPerQuest: 2,
    healPercent: 20,
    price: (level) => 12 + Math.max(1, level) * 2,
  },
  {
    type: 'TRAVEL_BANDAGE',
    name: 'Bandaż podróżny',
    description: 'Czyste płótno, żywica i zacisk pozwalający opatrzyć ranę bez rozpalania obozu.',
    effectLabel: 'Przywraca 10% maksymalnego HP',
    maxPerQuest: 2,
    healPercent: 10,
    price: (level) => 7 + Math.max(1, level),
  },
  {
    type: 'VAEL_ANTIDOTE',
    name: 'Antidotum z Vael',
    description: 'Chłodny destylat tłumi jad, osłabienie i skutki jednej nieudanej próby.',
    effectLabel: 'Usuwa 1 punkt kary z nieudanej próby',
    maxPerQuest: 1,
    healPercent: 0,
    price: (level) => 15 + Math.max(1, level) * 2,
  },
];

export const TAVERN_BAG_CAPACITY = 3;

export function getProvisionDefinition(type: TavernProvisionType): TavernProvisionDefinition {
  const definition = TAVERN_PROVISIONS.find((entry) => entry.type === type);
  if (!definition) throw new Error(`Unknown tavern provision: ${type}`);
  return definition;
}

export function rollStageWoundPercent(difficulty: TavernQuestDifficulty, succeeded: boolean, rng: () => number = Math.random): number {
  const range = difficulty === 'EASY'
    ? succeeded ? [1, 2] : [3, 4]
    : difficulty === 'MEDIUM'
      ? succeeded ? [2, 3] : [5, 6]
      : succeeded ? [2, 3] : [6, 7];
  return Math.floor(rng() * (range[1] - range[0] + 1)) + range[0];
}
