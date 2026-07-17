import type { CatalogPage, CatalogSection, CatalogSummaryEntry, ItemGrade, ShopOffer } from '../types/game';
import { httpClient } from './http';

export async function getTodayOffers(): Promise<ShopOffer[]> {
  const response = await httpClient.get<ShopOffer[]>('/shop/today');
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
