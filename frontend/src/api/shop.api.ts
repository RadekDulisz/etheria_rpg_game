import type { CatalogPage, CatalogSection, CatalogSummaryEntry, ItemGrade, ShopOffer } from '../types/game';
import { httpClient } from './http';

export interface MarketRefreshStatus {
  refreshesUsed: number;
  refreshesRemaining: number;
  nextRefreshCost: number | null;
}

export async function getTodayOffers(): Promise<ShopOffer[]> {
  const response = await httpClient.get<ShopOffer[]>('/shop/today');
  return response.data;
}

export async function getMarketRefreshStatus(): Promise<MarketRefreshStatus> {
  const response = await httpClient.get<MarketRefreshStatus>('/shop/refresh/status');
  return response.data;
}

export async function refreshMarketOffers(): Promise<MarketRefreshStatus> {
  const response = await httpClient.post<MarketRefreshStatus>('/shop/refresh');
  return response.data;
}

export async function purchaseItem(shopEntryId: string, quantity: number): Promise<{ status: string }> {
  const response = await httpClient.post<{ status: string }>('/shop/purchase', { shopEntryId, quantity });
  return response.data;
}

export async function getShopCatalog(section: CatalogSection, grade: ItemGrade, page: number, pageSize = 12): Promise<CatalogPage> {
  const response = await httpClient.get<CatalogPage>('/shop/catalog', { params: { section, grade, page, pageSize } });
  return response.data;
}

export async function getShopCatalogSummary(): Promise<CatalogSummaryEntry[]> {
  const response = await httpClient.get<CatalogSummaryEntry[]>('/shop/catalog/summary');
  return response.data;
}

export async function purchaseCatalogItem(itemId: string, quantity: number): Promise<{ status: string }> {
  const response = await httpClient.post<{ status: string }>('/shop/catalog/purchase', { itemId, quantity });
  return response.data;
}
