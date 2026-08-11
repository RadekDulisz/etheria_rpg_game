import type { TavernOverview, TavernProvisionType, TavernQuestClaim, TavernQuestRun } from '../types/game';
import { httpClient } from './http';

export async function getTavern(): Promise<TavernOverview> {
  const response = await httpClient.get<TavernOverview>('/tavern');
  return response.data;
}

export async function getActiveTavernQuest(): Promise<TavernQuestRun | null> {
  const response = await httpClient.get<TavernQuestRun | null>('/tavern/quests/active');
  return response.data;
}

export async function refreshTavernBoard(): Promise<TavernOverview> {
  const response = await httpClient.post<TavernOverview>('/tavern/refresh');
  return response.data;
}

export async function acceptTavernOffer(offerId: string, provisions: Array<{ type: TavernProvisionType; quantity: number }>): Promise<TavernQuestRun> {
  const response = await httpClient.post<TavernQuestRun>(`/tavern/offers/${offerId}/accept`, { provisions });
  return response.data;
}

export async function purchaseTavernProvision(type: TavernProvisionType, quantity = 1): Promise<TavernOverview> {
  const response = await httpClient.post<TavernOverview>(`/tavern/provisions/${type}/purchase`, { quantity });
  return response.data;
}

export async function useTavernProvision(type: TavernProvisionType): Promise<TavernQuestRun> {
  const response = await httpClient.post<TavernQuestRun>('/tavern/quests/active/use-provision', { type });
  return response.data;
}

export async function chooseTavernPath(choiceId: string): Promise<TavernQuestRun> {
  const response = await httpClient.post<TavernQuestRun>('/tavern/quests/active/choose', { choiceId });
  return response.data;
}

export async function fightTavernEncounter(): Promise<TavernQuestRun> {
  const response = await httpClient.post<TavernQuestRun>('/tavern/quests/active/fight');
  return response.data;
}

export async function solveTavernPuzzle(answer: string[]): Promise<TavernQuestRun> {
  const response = await httpClient.post<TavernQuestRun>('/tavern/quests/active/puzzle', { answer });
  return response.data;
}

export async function claimTavernQuest(): Promise<TavernQuestClaim> {
  const response = await httpClient.post<TavernQuestClaim>('/tavern/quests/active/claim');
  return response.data;
}

export async function abandonTavernQuest(): Promise<TavernQuestRun> {
  const response = await httpClient.post<TavernQuestRun>('/tavern/quests/active/abandon');
  return response.data;
}
