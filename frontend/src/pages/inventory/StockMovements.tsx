import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryApi, type ProductDto, type WarehouseDto, type MovementType, type CreateStockMovementRequest } from '../../services/inventoryApi';
import { X } from 'lucide-react';
import { StatusBadge, type StatusTone } from '../../components/StatusBadge';
import { formatCurrency, formatStock, formatDate } from '../../utils/format';

// Safe tone lookup — unknown movement types from the backend must never crash the page
const movementTone: Record<string, StatusTone> = {
  In: 'success',
  Out: 'destructive',
  Adjustment: 'warning',
  Transfer: 'info',
};
const movementMeta = (type?: string | null): { tone: StatusTone; label: string; sign: string } => {
  if (type && movementTone[type]) {
    const labels: Record<string, { label: string; sign: string }> = {
      In: { label: 'وارد', sign: '+' },
      Out: { label: 'صادر', sign: '-' },
      Adjustment: { label: 'تسوية', sign: '±' },
      Transfer: { label: 'تحويل', sign: '⇄' },
    };
    return { tone: movementTone[type], ...labels[type] };
  }
  return { tone: 'neutral', label: type || '—', sign: '•' };
};

interface NewMovementFormProps { isOpen: boolean; onClose: () => void; products: ProductDto[]; warehouses: WarehouseDto[]; }
const NewMovementForm: React.FC<NewMovementFormProps> = ({ isOpen, onClose, products = [], warehouses = [] }) => {
  const queryClient = useQueryClient();
  const [productId, setProductId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [movementType, setMovementType] = useState<MovementType>('In');
  const [quantity, setQuantity] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [referenceDocument, setReferenceDocument] = useState('');
  const [notes, setNotes] = useState('');
  const [movementDate, setMovementDate] = useState(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: (data: CreateStockMovementRequest) => inventoryApi.createStockMovement(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['stockMovements'] }); queryClient.invalidateQueries({ queryKey: ['stockStatus'] }); queryClient.invalidateQueries({ queryKey: ['products'] }); resetForm(); onClose(); },
    onError: (err: { response?: { data?: { message?: string } } }) => setError(err.response?.data?.message || 'فشل في إنشاء حركة المخزون'),
  });

  const resetForm = () => { setProductId(''); setWarehouseId(''); setMovementType('In'); setQuantity(''); setUnitCost(''); setReferenceDocument(''); setNotes(''); setMovementDate(new Date().toISOString().split('T')[0]); setError(null); };
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); setError(null); createMutation.mutate({ productId, warehouseId, movementType, quantity: parseFloat(quantity) || 0, unitCost: parseFloat(unitCost) || 0, referenceDocument: referenceDocument.trim() || null, notes: notes.trim() || null, movementDate }); };
  if (!isOpen) return null;
  const selectedProduct = products.find(p => p.id === productId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[calc(100vh-4rem)] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-border sticky top-0 bg-card z-10 relative">
          <button type="button" onClick={onClose} aria-label="إغلاق" className="absolute left-4 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground opacity-70 hover:opacity-100 transition-all">
            <X size={20} />
          </button>
          <h3 className="text-lg font-bold text-foreground pl-12">حركة مخزون جديدة</h3>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">{error}</div>}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">نوع الحركة</label>
            <div className="grid grid-cols-4 gap-2">
              {(['In', 'Out', 'Adjustment', 'Transfer'] as MovementType[]).map(t => {
                const meta = movementMeta(t);
                return (
                  <button key={t} type="button" onClick={() => setMovementType(t)}
                    className={`px-3 py-2.5 text-xs font-semibold rounded-lg border transition-all ${movementType === t ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-border hover:text-foreground'}`}>
                    <span className="block text-lg leading-none mb-1">{meta.sign}</span>{meta.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div><label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">الصنف</label>
            <select required value={productId} onChange={e => setProductId(e.target.value)} className="w-full px-4 py-2.5 bg-input border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="">اختر الصنف...</option>{products.filter(p => p.isActive).map(p => <option key={p.id} value={p.id}>{p.sku} — {p.name} (المخزون: {formatStock(p.currentStock)})</option>)}
            </select>
            {selectedProduct && <p className="text-xs text-muted-foreground mt-1">المخزون الحالي: <span className="text-foreground font-semibold">{formatStock(selectedProduct.currentStock)} {selectedProduct.unitOfMeasure}</span></p>}
          </div>
          <div><label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">المستودع</label>
            <select required value={warehouseId} onChange={e => setWarehouseId(e.target.value)} className="w-full px-4 py-2.5 bg-input border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="">اختر المستودع...</option>{warehouses.filter(w => w.isActive).map(w => <option key={w.id} value={w.id}>{w.code} — {w.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div><label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">الكمية</label>
              <input type="number" min="0.0001" step="0.0001" required value={quantity} onChange={e => setQuantity(e.target.value)} className="w-full px-4 py-2.5 bg-input border-border rounded-lg text-foreground placeholder-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
            <div><label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">تكلفة الوحدة (د.ل)</label>
              <input type="number" min="0" step="0.0001" value={unitCost} onChange={e => setUnitCost(e.target.value)} className="w-full px-4 py-2.5 bg-input border-border rounded-lg text-foreground placeholder-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
            <div><label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">التاريخ</label>
              <input type="date" required value={movementDate} onChange={e => setMovementDate(e.target.value)} className="w-full px-4 py-2.5 bg-input border-border rounded-lg text-foreground placeholder-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
          </div>
          <div><label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">المستند المرجعي</label>
            <input type="text" value={referenceDocument} onChange={e => setReferenceDocument(e.target.value)} placeholder="مثال: PO-001, SO-042" className="w-full px-4 py-2.5 bg-input border-border rounded-lg text-foreground placeholder-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
          <div><label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">ملاحظات</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="ملاحظات اختيارية..." className="w-full px-4 py-2.5 bg-input border-border rounded-lg text-foreground placeholder-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => { resetForm(); onClose(); }} className="flex-1 px-4 py-2.5 text-sm font-semibold text-foreground bg-muted hover:bg-accent border border-border rounded-lg transition-colors">إلغاء</button>
            <button type="submit" disabled={createMutation.isPending} className="flex-1 px-4 py-2.5 text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {createMutation.isPending ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> جاري المعالجة...</> : 'تقديم الحركة'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const StockMovements: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'status' | 'movements'>('status');
  const [showForm, setShowForm] = useState(false);
  const [typeFilter, setTypeFilter] = useState<MovementType | ''>('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const { data: stockStatus = [], isLoading: statusLoading, error: statusError } = useQuery({ queryKey: ['stockStatus'], queryFn: () => inventoryApi.getStockStatus() });
  const { data: movements = [], isLoading: movementsLoading, error: movementsError } = useQuery({ queryKey: ['stockMovements', typeFilter, warehouseFilter], queryFn: () => inventoryApi.getStockMovements({ type: typeFilter as MovementType || undefined, warehouseId: warehouseFilter || undefined }) });
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: () => inventoryApi.getProducts() });
  const { data: warehouses = [] } = useQuery({ queryKey: ['warehouses'], queryFn: () => inventoryApi.getWarehouses() });

  const q = searchQuery.toLowerCase();
  const filteredStatus = (stockStatus ?? []).filter(s => !q || (s.productSKU ?? '').toLowerCase().includes(q) || (s.productName ?? '').toLowerCase().includes(q));
  const filteredMovements = (movements ?? []).filter(m => !q || (m.productSKU ?? '').toLowerCase().includes(q) || (m.productName ?? '').toLowerCase().includes(q) || (m.referenceDocument ?? '').toLowerCase().includes(q));
  const isLoading = activeTab === 'status' ? statusLoading : movementsLoading;
  const hasError = !!(statusError || movementsError);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">حركات المخزون</h1>
          <p className="text-sm text-muted-foreground mt-1">نظرة عامة على حالة المخزون وسجل مراجعة الحركات</p>
        </div>
        <button onClick={() => setShowForm(true)} className="px-4 py-2.5 text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary/90 rounded-xl transition-colors flex items-center gap-2"><span className="text-lg leading-none">+</span> حركة جديدة</button>
      </div>

      <div className="flex gap-1 bg-card border border-border rounded-xl p-1">
        <button onClick={() => setActiveTab('status')} className={`flex-1 px-4 py-2.5 text-sm font-semibold rounded-lg transition-colors ${activeTab === 'status' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>حالة المخزون ({(stockStatus ?? []).length})</button>
        <button onClick={() => setActiveTab('movements')} className={`flex-1 px-4 py-2.5 text-sm font-semibold rounded-lg transition-colors ${activeTab === 'movements' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>سجل الحركات ({(movements ?? []).length})</button>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 flex flex-wrap gap-4 items-center">
        <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="بحث بالرمز أو الاسم أو المرجع..." className="flex-1 min-w-[200px] px-4 py-2 bg-input border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm" />
        {activeTab === 'movements' && (<>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as MovementType | '')} className="px-4 py-2 bg-input border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="">جميع الأنواع</option>{(['In', 'Out', 'Adjustment', 'Transfer'] as MovementType[]).map(t => <option key={t} value={t}>{movementMeta(t).label}</option>)}
          </select>
          <select value={warehouseFilter} onChange={e => setWarehouseFilter(e.target.value)} className="px-4 py-2 bg-input border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="">جميع المستودعات</option>{(warehouses ?? []).filter(w => w.isActive).map(w => <option key={w.id} value={w.id}>{w.code} — {w.name}</option>)}
          </select>
        </>)}
      </div>

      {hasError && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-sm text-destructive text-center">
          تعذر تحميل بيانات المخزون — تحقق من الاتصال بالخادم وأعد المحاولة.
        </div>
      )}

      {isLoading && <div className="flex items-center justify-center p-12 text-muted-foreground space-x-3"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /><span>جاري التحميل...</span></div>}

      {!isLoading && !hasError && activeTab === 'status' && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead><tr className="bg-muted/40 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <th className="px-5 py-3 text-right">رمز الصنف</th><th className="px-5 py-3 text-right">الصنف</th><th className="px-5 py-3 text-right">الفئة</th><th className="px-5 py-3 text-left">إجمالي المخزون</th><th className="px-5 py-3 text-left">الحد الأدنى</th><th className="px-5 py-3 text-center">الحالة</th><th className="px-5 py-3 text-right">تفصيل المستودعات</th>
            </tr></thead>
            <tbody className="divide-y divide-border/50">
              {filteredStatus.length === 0 ? <tr><td colSpan={7} className="px-5 py-12 text-center text-muted-foreground">لا توجد بيانات مخزون.</td></tr> : filteredStatus.map(s => (
                <tr key={s.productId} className="hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3 font-semibold text-primary text-right">{s.productSKU}</td>
                  <td className="px-5 py-3 text-foreground text-right">{s.productName}</td>
                  <td className="px-5 py-3 text-muted-foreground text-right">{s.categoryName}</td>
                  <td className="px-5 py-3 text-left"><span className={`font-bold text-base ${s.isLowStock ? 'text-amber-500 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{formatStock(s.totalStock)}</span></td>
                  <td className="px-5 py-3 text-left text-muted-foreground">{formatStock(s.minStockLevel)}</td>
                  <td className="px-5 py-3 text-center"><StatusBadge status={s.isLowStock ? 'lowStock' : 'good'} /></td>
                  <td className="px-5 py-3 text-right"><div className="flex flex-wrap gap-1 justify-start">{(s.warehouseStocks ?? []).map(ws => <span key={ws.warehouseId} className="px-2 py-0.5 text-xs bg-muted text-muted-foreground rounded">{ws.warehouseCode}: {formatStock(ws.quantity)}</span>)}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!isLoading && !hasError && activeTab === 'movements' && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead><tr className="bg-muted/40 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <th className="px-5 py-3 text-right">التاريخ</th><th className="px-5 py-3 text-right">الصنف</th><th className="px-5 py-3 text-center">النوع</th><th className="px-5 py-3 text-right">المستودع</th><th className="px-5 py-3 text-left">الكمية</th><th className="px-5 py-3 text-left">تكلفة الوحدة</th><th className="px-5 py-3 text-right">المرجع</th>
            </tr></thead>
            <tbody className="divide-y divide-border/50">
              {filteredMovements.length === 0 ? <tr><td colSpan={7} className="px-5 py-12 text-center text-muted-foreground">لا توجد حركات مسجلة.</td></tr> : filteredMovements.map(m => {
                const meta = movementMeta(m.movementType);
                return (
                  <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3 text-xs text-muted-foreground text-right">{formatDate(m.movementDate)}</td>
                    <td className="px-5 py-3 text-right"><span className="text-xs text-muted-foreground ml-1.5">{m.productSKU}</span><span className="text-foreground">{m.productName}</span></td>
                    <td className="px-5 py-3 text-center"><StatusBadge status={m.movementType ?? ''} tone={meta.tone} label={meta.label} /></td>
                    <td className="px-5 py-3 text-sm text-muted-foreground text-right">{m.warehouseName}</td>
                    <td className="px-5 py-3 text-left font-semibold">{m.movementType === 'In' ? '+' : m.movementType === 'Out' ? '-' : '±'}{formatStock(m.quantity)}</td>
                    <td className="px-5 py-3 text-left text-foreground">{formatCurrency(m.unitCost)}</td>
                    <td className="px-5 py-3 text-xs text-muted-foreground text-right">{m.referenceDocument || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <NewMovementForm isOpen={showForm} onClose={() => setShowForm(false)} products={products} warehouses={warehouses} />
    </div>
  );
};
