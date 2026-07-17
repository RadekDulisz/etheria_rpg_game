import type { Character } from '../types/game';
import { httpClient } from './http';

export async function getMyCharacter(): Promise<Character> {
  const response = await httpClient.get<Character>('/characters/me');
  return response.data;
}

export async function createCharacter(name: string): Promise<Character> {
  const response = await httpClient.post<Character>('/characters', { name });
  return response.data;
}

export type AllocatableStat = 'strength' | 'agility' | 'endurance' | 'intelligence';

export async function allocateStatPoint(stat: AllocatableStat): Promise<Character> {
  const allocation = { strength: 0, agility: 0, endurance: 0, intelligence: 0 };
  allocation[stat] = 1;
  const response = await httpClient.patch<Character>('/characters/me/stats', allocation);
  return response.data;
}
