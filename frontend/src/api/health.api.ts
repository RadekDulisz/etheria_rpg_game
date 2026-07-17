import type { HealthStatus } from '../types/game';
import { httpClient } from './http';

export async function getHealth(): Promise<HealthStatus> {
  const response = await httpClient.get<HealthStatus>('/health');
  return response.data;
}

