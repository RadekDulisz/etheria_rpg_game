import type { PlayerProperty } from '../types/game';
import { httpClient } from './http';

export async function getMyProperty(): Promise<PlayerProperty | null> {
  return (await httpClient.get<PlayerProperty | null>('/properties/me')).data;
}

export async function buyProperty(input: { name: string; description?: string }): Promise<PlayerProperty> {
  return (await httpClient.post<PlayerProperty>('/properties/me/buy', input)).data;
}

export async function upgradeProperty(): Promise<PlayerProperty> {
  return (await httpClient.post<PlayerProperty>('/properties/me/upgrade')).data;
}

export async function restoreAtProperty(): Promise<PlayerProperty> {
  return (await httpClient.post<PlayerProperty>('/properties/me/restore')).data;
}
