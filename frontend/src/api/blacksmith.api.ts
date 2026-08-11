import type { BlacksmithItem, BlacksmithWorkshop } from '../types/game';
import { httpClient } from './http';

export interface BlacksmithActionResult {
  success: boolean;
  balanceAfter: string;
  chancePercent?: number;
  item: BlacksmithItem;
}

export async function getBlacksmithWorkshop(): Promise<BlacksmithWorkshop> {
  const response = await httpClient.get<BlacksmithWorkshop>('/blacksmith/workshop');
  return response.data;
}

export async function upgradeBlacksmithItem(ownedItemId: string): Promise<BlacksmithActionResult> {
  const response = await httpClient.post<BlacksmithActionResult>('/blacksmith/upgrade', { ownedItemId });
  return response.data;
}

export async function unlockBlacksmithSocket(ownedItemId: string): Promise<BlacksmithActionResult> {
  const response = await httpClient.post<BlacksmithActionResult>('/blacksmith/sockets/unlock', { ownedItemId });
  return response.data;
}

export async function insertBlacksmithGem(
  ownedItemId: string,
  position: number,
  gemDefinitionId: string,
  replaceExisting = false,
): Promise<BlacksmithActionResult> {
  const response = await httpClient.post<BlacksmithActionResult>('/blacksmith/sockets/insert', {
    ownedItemId,
    position,
    gemDefinitionId,
    replaceExisting,
  });
  return response.data;
}
