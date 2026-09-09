import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '../../services/settingsApi';
import { showSuccess, showError } from '../../lib/toast';
import { getApiErrorMessage } from '../../utils/apiErrors';
import { StatusBadge } from '../../components/StatusBadge';

// ═══════════════════════════════════════════════════════════
//  GENERAL SETTINGS — إعدادات المنظومة
//  Active settings persist per-company via PUT /api/settings/general.
//  Placeholder switches are disabled UI only — they do not call the API.
// ═══════════════════════════════════════════════════════════

interface SettingRow {
  key: string;
  label: string;
  description: string;
}

const PLACEHOLDER_GROUPS: { title: string; rows: SettingRow[] }[] = [
  {
    title: 'المبيعات',
    rows: [
      { key: 'AllowInvoiceDiscount', label: 'السماح بحسم الفواتير', description: 'خصم على مستوى الفاتورة' },
      { key: 'RequireCustomerForSales', label: 'إلزامية العميل في البيع', description: 'إلزام اختيار العميل في فواتير البيع' },
      { key: 'AllowPriceChangeInSales', label: 'السماح بتعديل السعر', description: 'تعديل السعر يدوياً في شبكة البيع' },
      { key: 'AllowBelowCostSale', label: 'السماح للبيع تحت التكلفة', description: 'بيع المواد بأقل من سعر التكلفة' },
      { key: 'EnableMultiplePriceLists', label: 'قوائم أسعار متعددة', description: 'قائمة الجملة والقطاعي وغيرها' },
      { key: 'EnableSalespersonTracking', label: 'تتبع مندوبي البيع', description: 'ربط الفواتير بمندوب مبيعات محدد' },
      { key: 'MaxDiscountPercentage', label: 'الحد الأقصى للخصم', description: 'تقييد الخصم الأقصى لكل مستخدم' },
    ],
  },
  {
    title: 'المشتريات والمخزون',
    rows: [
      { key: 'RequirePurchaseOrderForInvoice', label: 'إلزامية أمر الشراء', description: 'ربط فاتورة الشراء بأمر شراء' },
      { key: 'AutoUpdateProductPurchasePrice', label: 'تحديث سعر الشراء تلقائياً', description: 'تحديث سعر التكلفة عند الشراء' },
      { key: 'AllowOverReceivingInPurchase', label: 'السماح باستلام زائد', description: 'استلام كمية أكبر من أمر الشراء' },
      { key: 'EnableMultiWarehouse', label: 'تعدد المستودعات', description: 'تتبع المخزون والتحويل بين المستودعات' },
      { key: 'EnableExpiryDateTracking', label: 'تتبع تواريخ الانتهاء', description: 'تتبع تاريخ الانتهاء وتشغيلات الإنتاج' },
      { key: 'EnableSerialNumberTracking', label: 'تتبع الأرقام التسلسلية', description: 'رقم تسلسلي لكل وحدة' },
      { key: 'EnableBarcodeAutoGeneration', label: 'توليد الباركود تلقائياً', description: 'توليد باركود للمواد الجديدة' },
      { key: 'PreventNegativeStockTransfer', label: 'منع التحويل بالسالب', description: 'منع تحويل كميات أكبر من الرصيد' },
      { key: 'EnableStockReorderAlerts', label: 'تنبيهات إعادة الطلب', description: 'تنبيه عند بلوغ الحد الأدنى للمخزون' },
    ],
  },
  {
    title: 'المحاسبة',
    rows: [
      { key: 'AutoPostJournalEntries', label: 'ترحيل القيود تلقائياً', description: 'ترحيل القيود الناتجة عن الفواتير' },
      { key: 'AllowBackdatedTransactions', label: 'السماح بتواريخ سابقة', description: 'قيود وفواتير بتواريخ أقدم' },
      { key: 'LockClosedFiscalPeriods', label: 'قفل الفترات المغلقة', description: 'منع الحركة في فترات مالية مغلقة' },
      { key: 'EnableCostCenterMandatory', label: 'إلزامية مركز التكلفة', description: 'إلزام اختيار مركز التكلفة' },
      { key: 'EnableMultiCurrency', label: 'تعدد العملات', description: 'تتبع العملات وأسعار الصرف' },
    ],
  },
  {
    title: 'النقد والصندوق',
    rows: [
      { key: 'RequireShiftClosing', label: 'إلزام إغلاق الورديات', description: 'إغلاق جلسة/وردية نقاط البيع' },
      { key: 'MaxCashDrawerLimit', label: 'الحد الأقصى للصندوق', description: 'تنبيه عند تجاوز رصيد الدرج' },
      { key: 'AllowNegativeCashBalance', label: 'السماح برصيد نقدي سالب', description: 'سماح بأرصدة سالبة في الصناديق' },
    ],
  },
  {
    title: 'العرض والطباعة',
    rows: [
      { key: 'AutoPrintInvoiceOnPost', label: 'طباعة الفاتورة تلقائياً', description: 'طباعة الفاتورة عند الترحيل' },
      { key: 'PrintThermalReceipt', label: 'طباعة حرارية 80 مم', description: 'الطباعة الحرارية كوضع افتراضي' },
      { key: 'ShowProductImageInGrid', label: 'صورة الصنف في الشبكة', description: 'عرض صورة مصغرة في البحث' },
      { key: 'EnableSoundEffects', label: 'المؤثرات الصوتية', description: 'صوت عند مسح الباركود' },
      { key: 'RequireInvoiceNotes', label: 'إلزامية ملاحظات الفاتورة', description: 'إلزام الوصف/الملاحظات في الفاتورة' },
    ],
  },
];

const Switch: React.FC<{
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange?: (v: boolean) => void;
}> = ({ checked, disabled = false, label, onChange }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
    onClick={() => onChange?.(!checked)}
    className={`relative inline-flex h-6 w-11 shrink-0 items-center justify-start rounded-full border p-0.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
      disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
    } ${checked ? 'bg-primary border-primary' : 'bg-muted border-border'}`}
  >
    <span
      className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
        checked ? '-translate-x-6' : 'translate-x-0'
      }`}
    />
  </button>
);

export const GeneralSettings: React.FC = () => {
  const queryClient = useQueryClient();
  // Server data is the source of truth; a non-null draft is a local, unsaved edit.
  const [draft, setDraft] = useState<boolean | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['systemSettings'],
    queryFn: settingsApi.getGeneral,
  });

  const allowNegativeStock = draft ?? data?.allowNegativeStock ?? false;

  const saveMutation = useMutation({
    mutationFn: settingsApi.updateGeneral,
    onSuccess: (res) => {
      queryClient.setQueryData(['systemSettings'], res.settings);
      setDraft(null);
      showSuccess('تم حفظ الإعدادات بنجاح.');
    },
    onError: (err) => showError(getApiErrorMessage(err, 'فشل في حفظ الإعدادات.')),
  });

  const hasChanges = draft !== null && draft !== (data?.allowNegativeStock ?? false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12 text-muted-foreground gap-3">
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span>جاري تحميل الإعدادات...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">
        {getApiErrorMessage(error, 'فشل في تحميل الإعدادات. تأكد من تشغيل الخادم.')}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">إعدادات المنظومة</h1>
          <p className="text-sm text-muted-foreground mt-1">إعدادات عامة تتحكم في سلوك النظام — تُطبق على الشركة الحالية</p>
        </div>
        <button
          onClick={() => saveMutation.mutate({ allowNegativeStock })}
          disabled={!hasChanges || saveMutation.isPending}
          className="px-4 py-2 text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 flex items-center gap-2"
        >
          {saveMutation.isPending && (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          )}
          {saveMutation.isPending ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
        </button>
      </div>

      {/* Active settings */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-border bg-muted/40">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">إعدادات فعالة</h2>
        </div>
        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-foreground">السماح بالبيع بالسالب</h3>
                <StatusBadge status={allowNegativeStock ? 'good' : 'off'} tone={allowNegativeStock ? 'success' : 'neutral'} label={allowNegativeStock ? 'مُفعّل' : 'معطّل'} />
              </div>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                عند التمكين يمكن ترحيل فواتير البيع حتى لو كان رصيد المستودع غير كافٍ (قد يصبح رصيد المخزون سالباً).
                تُحتسب تكلفة البضاعة المباعة للكميات غير المتوفرة بسعر الشراء الأخير للمادة.
              </p>
            </div>
            <Switch checked={allowNegativeStock} label="السماح بالبيع بالسالب" onChange={v => setDraft(v)} />
          </div>
        </div>
      </div>

      {/* Placeholder feature groups */}
      {PLACEHOLDER_GROUPS.map(group => (
        <div key={group.title} className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-border bg-muted/40">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">{group.title}</h2>
          </div>
          <div className="divide-y divide-border/50">
            {group.rows.map(row => (
              <div key={row.key} className="px-5 py-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-muted-foreground">{row.label}</h3>
                    <StatusBadge status="UnderDevelopment" label="تحت التطوير" tone="info" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{row.description}</p>
                </div>
                <Switch checked={false} disabled label={row.label} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
