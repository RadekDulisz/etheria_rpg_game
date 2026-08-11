import type { ArenaBattleResult, ArenaOpponent, ArenaProfile } from '../types/game';
import { httpClient } from './http';

export type ArenaTargetAlignment = 'GOOD' | 'EVIL';

export async function getArenaOpponent(
  excludeOpponentId?: string,
  alignment: ArenaTargetAlignment = 'EVIL',
): Promise<ArenaOpponent> {
  const response = await httpClient.post<ArenaOpponent>('/battles/arena/opponent', {
    excludeOpponentId,
    alignment,
  });
  return response.data;
}

export async function fightArena(botId: string): Promise<ArenaBattleResult> {
  const response = await httpClient.post<ArenaBattleResult>(`/battles/arena/${botId}`);
  return response.data;
}

export async function getArenaProfile(): Promise<ArenaProfile> {
  const response = await httpClient.get<ArenaProfile>('/battles/arena/profile');
  return response.data;
}
