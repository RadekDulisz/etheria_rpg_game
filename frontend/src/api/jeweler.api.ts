import type { GemDefinition, JewelerItem, JewelerWorkshop } from '../types/game';
import { httpClient } from './http';

export interface CombineGemsResult {
  success: boolean;
  inputGem: GemDefinition;
  resultGem: GemDefinition;
  consumedQuantity: number;
  createdQuantity: number;
  goldCost: string;
  balanceAfter: string;
}

export interface ExtractGemResult {
  success: boolean;
  extractedGem: GemDefinition;
  goldCost: string;
  balanceAfter: string;
  item: JewelerItem;
}

export async function getJewelerWorkshop(): Promise<JewelerWorkshop> {
  const response = await httpClient.get<JewelerWorkshop>('/jeweler/workshop');
  return response.data;
}

export async function combineJewelerGems(
  gemDefinitionId: string,
  count: number,
): Promise<CombineGemsResult> {
  const response = await httpClient.post<CombineGemsResult>('/jeweler/combine', {
    gemDefinitionId,
    count,
  });
  return response.data;
}

export async function extractJewelerGem(
  ownedItemId: string,
  position: number,
): Promise<ExtractGemResult> {
  const response = await httpClient.post<ExtractGemResult>('/jeweler/extract', {
    ownedItemId,
    position,
  });
  return response.data;
}
