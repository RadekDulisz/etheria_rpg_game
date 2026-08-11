import type { EquipmentSlot, EquippedEntry, GemStack, InventoryEntry } from '../types/game';
import { httpClient } from './http';

export async function getInventory(): Promise<InventoryEntry[]> {
  const response = await httpClient.get<InventoryEntry[]>('/characters/me/inventory');
  return response.data;
}

export async function getInventoryGems(): Promise<GemStack[]> {
  const response = await httpClient.get<GemStack[]>('/characters/me/inventory/gems');
  return response.data;
}

export async function getEquipment(): Promise<EquippedEntry[]> {
  const response = await httpClient.get<EquippedEntry[]>('/characters/me/equipment');
  return response.data;
}

export async function equipItem(ownedItemId: string, slot: EquipmentSlot): Promise<EquippedEntry[]> {
  const response = await httpClient.post<EquippedEntry[]>('/characters/me/equipment', { ownedItemId, slot });
  return response.data;
}

export async function unequipItem(slot: EquipmentSlot): Promise<EquippedEntry[]> {
  const response = await httpClient.delete<EquippedEntry[]>(`/characters/me/equipment/${slot}`);
  return response.data;
}

export async function sellItem(ownedItemId: string, quantity = 1): Promise<{ proceeds: string }> {
  const response = await httpClient.post<{ proceeds: string }>(`/characters/me/inventory/${ownedItemId}/sell`, { quantity });
  return response.data;
}
