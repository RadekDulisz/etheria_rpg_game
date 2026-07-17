import type { MissionMorality, MissionOverview, MissionResult } from '../types/game';
import { httpClient } from './http';

export async function getMissionOverview(): Promise<MissionOverview> {
  const response = await httpClient.get<MissionOverview>('/missions');
  return response.data;
}

export async function embarkOnMission(morality: MissionMorality): Promise<MissionResult> {
  const response = await httpClient.post<MissionResult>('/missions/embark', { morality });
  return response.data;
}
