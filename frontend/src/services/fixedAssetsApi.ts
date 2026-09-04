import { api } from './api';

// ═══════════════════════════════════
//  TYPES
// ═══════════════════════════════════

export type AssetStatus = 'Active' | 'FullyDepreciated' | 'Disposed';

export interface AssetCategory {
  id: string;
  code: string;
  name: string;
  assetAccountId: string;
  assetAccountName: string;
  accumulatedDepreciationAccountId: string;
  accumulatedDepreciationAccountName: string;
  depreciationExpenseAccountId: string;
  depreciationExpenseAccountName: string;
  defaultUsefulLifeYears: number;
  isActive: boolean;
  createdAt: string;
}

export interface AssetCategoryRequest {
  code: string;
  name: string;
  assetAccountId: string;
  accumulatedDepreciationAccountId: string;
  depreciationExpenseAccountId: string;
  defaultUsefulLifeYears: number;
}

export interface FixedAsset {
  id: string;
  assetCode: string;
  name: string;
  categoryId: string;
  categoryName: string;
  purchaseDate: string;
  purchaseCost: number;
  salvageValue: number;
  usefulLifeYears: number;
  currentBookValue: number;
  accumulatedDepreciation: number;
  monthlyDepreciation: number;
  status: AssetStatus;
  journalEntryId: string | null;
  journalEntryNumber: string | null;
  createdAt: string;
}

export interface FixedAssetRequest {
  assetCode: string;
  name: string;
  categoryId: string;
  purchaseDate: string;
  purchaseCost: number;
  salvageValue: number;
  usefulLifeYears: number;
}

export interface DepreciationRunRequest {
  periodStartDate: string;
  periodEndDate: string;
}

export interface DepreciationResultItem {
  assetId: string;
  assetCode: string;
  assetName: string;
  depreciationAmount: number;
  bookValueAfter: number;
  journalEntryId: string;
}

export interface DepreciationRunResponse {
  assetsProcessed: number;
  totalDepreciationAmount: number;
  items: DepreciationResultItem[];
}

export interface DepreciationEntryResponse {
  id: string;
  assetId: string;
  assetCode: string;
  assetName: string;
  processDate: string;
  periodStartDate: string;
  periodEndDate: string;
  depreciationAmount: number;
  bookValueAfter: number;
  journalEntryId: string | null;
  journalEntryNumber: string | null;
  createdAt: string;
}

export interface AssetDisposalRequest {
  disposalValue: number;
  description: string;
}

export interface AssetDisposalResponse {
  assetId: string;
  assetCode: string;
  assetName: string;
  purchaseCost: number;
  accumulatedDepreciation: number;
  disposalValue: number;
  gainOrLoss: number;
  journalEntryId: string;
  journalEntryNumber: string;
}

// ═══════════════════════════════════
//  API
// ═══════════════════════════════════

export const fixedAssetsApi = {
  // Categories
  getCategories: () => api.get<AssetCategory[]>('/api/assets/categories').then(r => r.data),
  getCategory: (id: string) => api.get<AssetCategory>(`/api/assets/categories/${id}`).then(r => r.data),
  createCategory: (data: AssetCategoryRequest) => api.post<AssetCategory>('/api/assets/categories', data).then(r => r.data),
  updateCategory: (id: string, data: AssetCategoryRequest) => api.put<AssetCategory>(`/api/assets/categories/${id}`, data).then(r => r.data),

  // Fixed Assets
  getAll: () => api.get<FixedAsset[]>('/api/assets').then(r => r.data),
  getById: (id: string) => api.get<FixedAsset>(`/api/assets/${id}`).then(r => r.data),
  create: (data: FixedAssetRequest) => api.post<FixedAsset>('/api/assets', data).then(r => r.data),
  update: (id: string, data: FixedAssetRequest) => api.put<FixedAsset>(`/api/assets/${id}`, data).then(r => r.data),

  // Depreciation
  runDepreciation: (data: DepreciationRunRequest) => api.post<DepreciationRunResponse>('/api/assets/depreciate', data).then(r => r.data),
  getDepreciationEntries: (assetId?: string) =>
    api.get<DepreciationEntryResponse[]>('/api/assets/depreciation-entries', { params: assetId ? { assetId } : {} }).then(r => r.data),

  // Disposal
  dispose: (id: string, data: AssetDisposalRequest) => api.post<AssetDisposalResponse>(`/api/assets/${id}/dispose`, data).then(r => r.data),
};
