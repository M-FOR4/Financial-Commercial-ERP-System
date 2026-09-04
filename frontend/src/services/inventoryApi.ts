import { api } from './api';

// ── Types matching backend DTOs ──

export type MovementType = 'In' | 'Out' | 'Adjustment' | 'Transfer';

export interface CategoryDto {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  productCount: number;
  createdAt: string;
}

export interface CreateCategoryRequest {
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
}

export interface UpdateCategoryRequest {
  name: string;
  description: string | null;
  isActive: boolean;
}

export interface WarehouseDto {
  id: string;
  code: string;
  name: string;
  location: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface CreateWarehouseRequest {
  code: string;
  name: string;
  location: string | null;
  isActive: boolean;
}

export interface UpdateWarehouseRequest {
  name: string;
  location: string | null;
  isActive: boolean;
}

export interface ProductDto {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  categoryId: string;
  categoryName: string;
  unitOfMeasure: string;
  purchasePrice: number;
  sellingPrice: number;
  currentStock: number;
  minStockLevel: number;
  isLowStock: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface CreateProductRequest {
  sku: string;
  name: string;
  description: string | null;
  categoryId: string;
  unitOfMeasure: string;
  purchasePrice: number;
  sellingPrice: number;
  minStockLevel: number;
  isActive: boolean;
}

export interface UpdateProductRequest {
  name: string;
  description: string | null;
  categoryId: string;
  unitOfMeasure: string;
  purchasePrice: number;
  sellingPrice: number;
  minStockLevel: number;
  isActive: boolean;
}

export interface StockMovementDto {
  id: string;
  productId: string;
  productSKU: string;
  productName: string;
  warehouseId: string;
  warehouseName: string;
  movementType: MovementType;
  movementTypeName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  referenceDocument: string | null;
  notes: string | null;
  movementDate: string;
  createdByUserId: string | null;
  createdByUserName: string | null;
  createdAt: string;
}

export interface CreateStockMovementRequest {
  productId: string;
  warehouseId: string;
  movementType: MovementType;
  quantity: number;
  unitCost: number;
  referenceDocument: string | null;
  notes: string | null;
  movementDate: string | null;
}

export interface StockStatusDto {
  productId: string;
  productSKU: string;
  productName: string;
  categoryName: string;
  totalStock: number;
  minStockLevel: number;
  isLowStock: boolean;
  warehouseStocks: WarehouseStockDto[];
}

export interface WarehouseStockDto {
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  quantity: number;
}

export interface LowStockAlertDto {
  productId: string;
  productSKU: string;
  productName: string;
  categoryName: string;
  currentStock: number;
  minStockLevel: number;
  deficit: number;
}

// ── API Functions ──

export const inventoryApi = {
  // Categories
  getCategories: (activeOnly?: boolean) => {
    const params = activeOnly !== undefined ? `?activeOnly=${activeOnly}` : '';
    return api.get<CategoryDto[]>(`/api/categories${params}`).then(r => r.data);
  },
  getCategoryById: (id: string) => api.get<CategoryDto>(`/api/categories/${id}`).then(r => r.data),
  createCategory: (data: CreateCategoryRequest) => api.post<CategoryDto>('/api/categories', data).then(r => r.data),
  updateCategory: (id: string, data: UpdateCategoryRequest) => api.put<CategoryDto>(`/api/categories/${id}`, data).then(r => r.data),

  // Warehouses
  getWarehouses: (activeOnly?: boolean) => {
    const params = activeOnly !== undefined ? `?activeOnly=${activeOnly}` : '';
    return api.get<WarehouseDto[]>(`/api/warehouses${params}`).then(r => r.data);
  },
  getWarehouseById: (id: string) => api.get<WarehouseDto>(`/api/warehouses/${id}`).then(r => r.data),
  createWarehouse: (data: CreateWarehouseRequest) => api.post<WarehouseDto>('/api/warehouses', data).then(r => r.data),
  updateWarehouse: (id: string, data: UpdateWarehouseRequest) => api.put<WarehouseDto>(`/api/warehouses/${id}`, data).then(r => r.data),

  // Products
  getProducts: (params?: { categoryId?: string; activeOnly?: boolean; search?: string }) => {
    const qp = new URLSearchParams();
    if (params?.categoryId) qp.set('categoryId', params.categoryId);
    if (params?.activeOnly !== undefined) qp.set('activeOnly', String(params.activeOnly));
    if (params?.search) qp.set('search', params.search);
    const qs = qp.toString();
    return api.get<ProductDto[]>(`/api/products${qs ? `?${qs}` : ''}`).then(r => r.data);
  },
  getProductById: (id: string) => api.get<ProductDto>(`/api/products/${id}`).then(r => r.data),
  createProduct: (data: CreateProductRequest) => api.post<ProductDto>('/api/products', data).then(r => r.data),
  updateProduct: (id: string, data: UpdateProductRequest) => api.put<ProductDto>(`/api/products/${id}`, data).then(r => r.data),

  // Stock Movements
  getStockMovements: (params?: { productId?: string; warehouseId?: string; type?: MovementType; fromDate?: string; toDate?: string }) => {
    const qp = new URLSearchParams();
    if (params?.productId) qp.set('productId', params.productId);
    if (params?.warehouseId) qp.set('warehouseId', params.warehouseId);
    if (params?.type) qp.set('type', params.type);
    if (params?.fromDate) qp.set('fromDate', params.fromDate);
    if (params?.toDate) qp.set('toDate', params.toDate);
    const qs = qp.toString();
    return api.get<StockMovementDto[]>(`/api/inventory/movements${qs ? `?${qs}` : ''}`).then(r => r.data);
  },
  createStockMovement: (data: CreateStockMovementRequest) =>
    api.post<StockMovementDto>('/api/inventory/movements', data).then(r => r.data),

  // Stock Status
  getStockStatus: (params?: { productId?: string; warehouseId?: string }) => {
    const qp = new URLSearchParams();
    if (params?.productId) qp.set('productId', params.productId);
    if (params?.warehouseId) qp.set('warehouseId', params.warehouseId);
    const qs = qp.toString();
    return api.get<StockStatusDto[]>(`/api/inventory/stock-status${qs ? `?${qs}` : ''}`).then(r => r.data);
  },
  getLowStockAlerts: () => api.get<LowStockAlertDto[]>('/api/inventory/low-stock').then(r => r.data),
};
