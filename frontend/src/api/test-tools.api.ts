import type { Character } from '../types/game';
import { httpClient } from './http';

export type TestToolAction =
  | 'ADD_GOLD'
  | 'ADD_EXPERIENCE'
  | 'SET_LEVEL'
  | 'SET_HEALTH_PERCENT'
  | 'SET_REPUTATION'
  | 'SET_LEARNING_POINTS'
  | 'SET_ARENA_RATING'
  | 'MAX_EXPERTISE'
  | 'RESET_EXPERTISE'
  | 'ADD_ALL_GEMS'
  | 'GUARANTEE_LEGENDARY_MISSION'
  | 'RESET_LIMITS'
  | 'RESET_TAVERN_QUEST'
  | 'REROLL_TAVERN_OFFERS';

export interface TestToolResult {
  message: string;
  character: Character;
}

export async function executeTestTool(action: TestToolAction, value?: number): Promise<TestToolResult> {
  const response = await httpClient.post<TestToolResult>('/test-tools/execute', { action, value });
  return response.data;
}
