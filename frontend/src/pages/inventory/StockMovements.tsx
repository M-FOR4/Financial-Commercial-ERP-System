import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryApi, type ProductDto, type WarehouseDto, type MovementType, type CreateStockMovementRequest } from '../../services/inventoryApi';

const formatCurrency = (n: number) => new Intl.NumberFormat('en-LY', { minimumFractionDigits: 4, maximumFractionDigits: 4 }).format(n);
const formatStock = (n: number) => new Intl.NumberFormat('en', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);

const movementTypeConfig: Record<MovementType, { color: string; label: string; sign: string; arLabel: string }> = {
  In: { color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30', label: 'In', sign: '+', arLabel: 'وارد' },
  Out: { color: 'text-rose-400 bg-rose-500/15 border-rose-500/30', label: 'Out', sign: '-', arLabel: 'صادر' },
  Adjustment: { color: 'text-amber-400 bg-amber-500/15 border-amber-500/30', label: 'Adjustment', sign: '±', arLabel: 'تسوية' },
  Transfer: { color: 'text-purple-400 bg-purple-500/15 border-purple-500/30', label: 'Transfer', sign: '⇄', arLabel: 'تحويل' },
};

interface NewMovementFormProps { isOpen: boolean; onClose: () => void; products: ProductDto[]; warehouses: WarehouseDto[]; }
const NewMovementForm: React.FC<NewMovementFormProps> = ({ isOpen, onClose, products, warehouses }) => {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-border sticky top-0 bg-card z-10"><h3 className="text-lg font-bold text-foreground">حركة مخزون جديدة</h3></div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-lg text-red-300 text-sm">{error}</div>}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">نوع الحركة</label>
            <div className="grid grid-cols-4 gap-2">
              {(['In', 'Out', 'Adjustment', 'Transfer'] as MovementType[]).map(t => {
                const cfg = movementTypeConfig[t];
                return (<button key={t} type="button" onClick={() => setMovementType(t)} className={`px-3 py-2.5 text-xs font-semibold rounded-lg border transition-all ${movementType === t ? cfg.color : 'bg-muted text-muted-foreground border-border hover:text-foreground'}`}>
                  <span className="block text-lg leading-none mb-1">{cfg.sign}</span>{cfg.arLabel}
                </button>);
              })}
            </div>
          </div>
          <div><label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">الصنف</label>
            <select required value={productId} onChange={e => setProductId(e.target.value)} className="w-full px-4 py-2.5 bg-input border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">اختر الصنف...</option>{products.filter(p => p.isActive).map(p => <option key={p.id} value={p.id}>{p.sku} — {p.name} (المخزون: {formatStock(p.currentStock)})</option>)}
            </select>
            {selectedProduct && <p className="text-xs text-muted-foreground mt-1">المخزون الحالي: <span className="font-mono text-muted-foreground">{formatStock(selectedProduct.currentStock)} {selectedProduct.unitOfMeasure}</span></p>}
          </div>
          <div><label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">المستودع</label>
            <select required value={warehouseId} onChange={e => setWarehouseId(e.target.value)} className="w-full px-4 py-2.5 bg-input border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">اختر المستودع...</option>{warehouses.filter(w => w.isActive).map(w => <option key={w.id} value={w.id}>{w.code} — {w.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div><label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">الكمية</label>
              <input type="number" min="0.0001" step="0.0001" required value={quantity} onChange={e => setQuantity(e.target.value)} className="w-full px-4 py-2.5 bg-input border-border rounded-lg text-foreground placeholder-muted-foreground text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
            <div><label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">تكلفة الوحدة (د.ل)</label>
              <input type="number" min="0" step="0.0001" value={unitCost} onChange={e => setUnitCost(e.target.value)} className="w-full px-4 py-2.5 bg-input border-border rounded-lg text-foreground placeholder-muted-foreground text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
            <div><label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">التاريخ</label>
              <input type="date" required value={movementDate} onChange={e => setMovementDate(e.target.value)} className="w-full px-4 py-2.5 bg-input border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
          </div>
          <div><label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">المستند المرجعي</label>
            <input type="text" value={referenceDocument} onChange={e => setReferenceDocument(e.target.value)} placeholder="مثال: PO-001, SO-042" className="w-full px-4 py-2.5 bg-input border-border rounded-lg text-foreground placeholder-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
          <div><label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">ملاحظات</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="ملاحظات اختيارية..." className="w-full px-4 py-2.5 bg-input border-border rounded-lg text-foreground placeholder-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
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
  const { data: stockStatus = [], isLoading: statusLoading } = useQuery({ queryKey: ['stockStatus'], queryFn: () => inventoryApi.getStockStatus() });
  const { data: movements = [], isLoading: movementsLoading } = useQuery({ queryKey: ['stockMovements', typeFilter, warehouseFilter], queryFn: () => inventoryApi.getStockMovements({ type: typeFilter as MovementType || undefined, warehouseId: warehouseFilter || undefined }) });
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: () => inventoryApi.getProducts() });
  const { data: warehouses = [] } = useQuery({ queryKey: ['warehouses'], queryFn: () => inventoryApi.getWarehouses() });
  const filteredStatus = stockStatus.filter(s => !searchQuery || s.productSKU.toLowerCase().includes(searchQuery.toLowerCase()) || s.productName.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredMovements = movements.filter(m => !searchQuery || m.productSKU.toLowerCase().includes(searchQuery.toLowerCase()) || m.productName.toLowerCase().includes(searchQuery.toLowerCase()) || (m.referenceDocument?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false));
  const isLoading = activeTab === 'status' ? statusLoading : movementsLoading;

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
        <button onClick={() => setActiveTab('status')} className={`flex-1 px-4 py-2.5 text-sm font-semibold rounded-lg transition-colors ${activeTab === 'status' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>حالة المخزون ({stockStatus.length})</button>
        <button onClick={() => setActiveTab('movements')} className={`flex-1 px-4 py-2.5 text-sm font-semibold rounded-lg transition-colors ${activeTab === 'movements' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>سجل الحركات ({movements.length})</button>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 flex flex-wrap gap-4 items-center">
        <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="بحث بالرمز أو الاسم أو المرجع..." className="flex-1 min-w-[200px] px-4 py-2 bg-input border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
        {activeTab === 'movements' && (<>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as MovementType | '')} className="px-4 py-2 bg-input border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">جميع الأنواع</option>{(['In', 'Out', 'Adjustment', 'Transfer'] as MovementType[]).map(t => <option key={t} value={t}>{movementTypeConfig[t].arLabel}</option>)}
          </select>
          <select value={warehouseFilter} onChange={e => setWarehouseFilter(e.target.value)} className="px-4 py-2 bg-input border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">جميع المستودعات</option>{warehouses.filter(w => w.isActive).map(w => <option key={w.id} value={w.id}>{w.code} — {w.name}</option>)}
          </select>
        </>)}
      </div>

      {isLoading && <div className="flex items-center justify-center p-12 text-muted-foreground space-x-3"><div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /><span>جاري التحميل...</span></div>}

      {!isLoading && activeTab === 'status' && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-muted/40 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <th className="px-5 py-3 text-left">رمز الصنف</th><th className="px-5 py-3 text-left">الصنف</th><th className="px-5 py-3 text-left">الفئة</th><th className="px-5 py-3 text-right">إجمالي المخزون</th><th className="px-5 py-3 text-right">الحد الأدنى</th><th className="px-5 py-3 text-center">الحالة</th><th className="px-5 py-3 text-left">تفصيل المستودعات</th>
            </tr></thead>
            <tbody className="divide-y divide-border/50">
              {filteredStatus.length === 0 ? <tr><td colSpan={7} className="px-5 py-12 text-center text-muted-foreground">لا توجد بيانات مخزون.</td></tr> : filteredStatus.map(s => (
                <tr key={s.productId} className="hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3 font-mono font-semibold text-indigo-400">{s.productSKU}</td>
                  <td className="px-5 py-3 text-foreground">{s.productName}</td>
                  <td className="px-5 py-3 text-muted-foreground">{s.categoryName}</td>
                  <td className="px-5 py-3 text-right"><span className={`font-mono font-bold text-base ${s.isLowStock ? 'text-amber-400' : 'text-emerald-400'}`}>{formatStock(s.totalStock)}</span></td>
                  <td className="px-5 py-3 text-right font-mono text-muted-foreground">{formatStock(s.minStockLevel)}</td>
                  <td className="px-5 py-3 text-center">{s.isLowStock ? <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">مخزون منخفض</span> : <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">جيد</span>}</td>
                  <td className="px-5 py-3"><div className="flex flex-wrap gap-1">{s.warehouseStocks.map(ws => <span key={ws.warehouseId} className="px-2 py-0.5 text-[10px] font-mono bg-muted text-muted-foreground rounded">{ws.warehouseCode}: {formatStock(ws.quantity)}</span>)}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!isLoading && activeTab === 'movements' && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-muted/40 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <th className="px-5 py-3 text-left">التاريخ</th><th className="px-5 py-3 text-left">الصنف</th><th className="px-5 py-3 text-center">النوع</th><th className="px-5 py-3 text-left">المستودع</th><th className="px-5 py-3 text-right">الكمية</th><th className="px-5 py-3 text-right">تكلفة الوحدة</th><th className="px-5 py-3 text-left">المرجع</th>
            </tr></thead>
            <tbody className="divide-y divide-border/50">
              {filteredMovements.length === 0 ? <tr><td colSpan={7} className="px-5 py-12 text-center text-muted-foreground">لا توجد حركات مسجلة.</td></tr> : filteredMovements.map(m => (
                <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{new Date(m.movementDate).toLocaleDateString()}</td>
                  <td className="px-5 py-3"><span className="font-mono text-xs text-muted-foreground mr-1">{m.productSKU}</span><span className="text-foreground">{m.productName}</span></td>
                  <td className="px-5 py-3 text-center"><span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${movementTypeConfig[m.movementType].color}`}>{movementTypeConfig[m.movementType].arLabel}</span></td>
                  <td className="px-5 py-3 text-sm text-muted-foreground">{m.warehouseName}</td>
                  <td className="px-5 py-3 text-right font-mono font-semibold">{m.movementType === 'In' ? '+' : m.movementType === 'Out' ? '-' : '±'}{formatStock(m.quantity)}</td>
                  <td className="px-5 py-3 text-right font-mono text-foreground">{formatCurrency(m.unitCost)}</td>
                  <td className="px-5 py-3 text-xs text-muted-foreground font-mono">{m.referenceDocument || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <NewMovementForm isOpen={showForm} onClose={() => setShowForm(false)} products={products} warehouses={warehouses} />
    </div>
  );
};
