import { api } from './api';

// ═══════════════════════════════════════
//  SYSTEM SETTINGS (إعدادات المنظومة)
// ═══════════════════════════════════════

export interface SystemSettingsDto {
  /** Allow posting sales invoices beyond available stock (negative inventory balance). */
  allowNegativeStock: boolean;
}

export interface UpdateSystemSettingsRequest {
  allowNegativeStock: boolean;
}

export const settingsApi = {
  getGeneral: () =>
    api.get<SystemSettingsDto>('/api/settings/general').then(r => r.data),

  updateGeneral: (data: UpdateSystemSettingsRequest) =>
    api.put<{ success: boolean; message: string; settings: SystemSettingsDto }>(
      '/api/settings/general', data
    ).then(r => r.data),
};
