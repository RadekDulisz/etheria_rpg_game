import type { ArenaBattleResult, ArenaOpponent } from '../types/game';
import { httpClient } from './http';

export async function getArenaOpponent(): Promise<ArenaOpponent> {
  const response = await httpClient.post<ArenaOpponent>('/battles/arena/opponent');
  return response.data;
}

export async function fightArena(botId: string): Promise<ArenaBattleResult> {
  const response = await httpClient.post<ArenaBattleResult>(`/battles/arena/${botId}`);
  return response.data;
}
