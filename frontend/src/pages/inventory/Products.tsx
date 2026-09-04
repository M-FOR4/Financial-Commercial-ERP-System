import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryApi, type ProductDto, type CategoryDto, type CreateProductRequest } from '../../services/inventoryApi';

const formatCurrency = (n: number) => new Intl.NumberFormat('en-LY', { minimumFractionDigits: 4, maximumFractionDigits: 4 }).format(n);
const formatStock = (n: number) => new Intl.NumberFormat('en', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);
const uomOptions = ['Piece', 'Box', 'Carton', 'Kilogram', 'Meter', 'Dozen', 'Set', 'Liter'];
const uomAr: Record<string, string> = { Piece: 'قطعة', Box: 'صندوق', Carton: 'كرتونة', Kilogram: 'كيلوغرام', Meter: 'متر', Dozen: 'دستة', Set: 'طقم', Liter: 'لتر' };

interface ProductModalProps { isOpen: boolean; onClose: () => void; product?: ProductDto | null; categories: CategoryDto[]; }
const ProductModal: React.FC<ProductModalProps> = ({ isOpen, onClose, product, categories }) => {
  const queryClient = useQueryClient();
  const isEditing = !!product;
  const [sku, setSku] = useState(product?.sku || '');
  const [name, setName] = useState(product?.name || '');
  const [description, setDescription] = useState(product?.description || '');
  const [categoryId, setCategoryId] = useState(product?.categoryId || '');
  const [unitOfMeasure, setUnitOfMeasure] = useState(product?.unitOfMeasure || 'Piece');
  const [purchasePrice, setPurchasePrice] = useState(String(product?.purchasePrice || ''));
  const [sellingPrice, setSellingPrice] = useState(String(product?.sellingPrice || ''));
  const [minStockLevel, setMinStockLevel] = useState(String(product?.minStockLevel || ''));
  const [isActive, setIsActive] = useState(product?.isActive ?? true);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setSku(product?.sku || ''); setName(product?.name || ''); setDescription(product?.description || '');
      setCategoryId(product?.categoryId || ''); setUnitOfMeasure(product?.unitOfMeasure || 'Piece');
      setPurchasePrice(String(product?.purchasePrice || '')); setSellingPrice(String(product?.sellingPrice || ''));
      setMinStockLevel(String(product?.minStockLevel || '')); setIsActive(product?.isActive ?? true); setError(null);
    }
  }, [isOpen, product]);

  const createMutation = useMutation({ mutationFn: (data: CreateProductRequest) => inventoryApi.createProduct(data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['products'] }); onClose(); }, onError: (err: { response?: { data?: { message?: string } } }) => setError(err.response?.data?.message || 'فشل في إنشاء الصنف') });
  const updateMutation = useMutation({ mutationFn: ({ id, data }: { id: string; data: CreateProductRequest }) => inventoryApi.updateProduct(id, data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['products'] }); onClose(); }, onError: (err: { response?: { data?: { message?: string } } }) => setError(err.response?.data?.message || 'فشل في تحديث الصنف') });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); setError(null);
    const data: CreateProductRequest = { sku: sku.trim(), name: name.trim(), description: description.trim() || null, categoryId, unitOfMeasure, purchasePrice: parseFloat(purchasePrice) || 0, sellingPrice: parseFloat(sellingPrice) || 0, minStockLevel: parseFloat(minStockLevel) || 0, isActive };
    if (isEditing && product) updateMutation.mutate({ id: product.id, data }); else createMutation.mutate(data);
  };

  if (!isOpen) return null;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
          <h3 className="text-lg font-bold text-foreground">{isEditing ? 'تعديل الصنف' : 'إضافة صنف جديد'}</h3>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-lg text-red-300 text-sm">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">رمز الصنف</label>
              <input type="text" required value={sku} onChange={e => setSku(e.target.value)} disabled={isEditing} placeholder="مثال: WGT-001" className="w-full px-4 py-2.5 bg-input border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm disabled:opacity-50 disabled:cursor-not-allowed" /></div>
            <div><label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">الفئة</label>
              <select required value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full px-4 py-2.5 bg-input border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm">
                <option value="">اختر الفئة...</option>{categories.filter(c => c.isActive).map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
              </select></div>
          </div>
          <div><label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">اسم الصنف</label>
            <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="مثال: فأرة لاسلكية" className="w-full px-4 py-2.5 bg-input border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" /></div>
          <div><label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">الوصف</label>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="وصف اختياري" className="w-full px-4 py-2.5 bg-input border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">وحدة القياس</label>
              <select value={unitOfMeasure} onChange={e => setUnitOfMeasure(e.target.value)} className="w-full px-4 py-2.5 bg-input border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm">
                {uomOptions.map(u => <option key={u} value={u}>{u} ({uomAr[u]})</option>)}
              </select></div>
            <div><label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">الحد الأدنى للمخزون</label>
              <input type="number" min="0" step="0.01" value={minStockLevel} onChange={e => setMinStockLevel(e.target.value)} className="w-full px-4 py-2.5 bg-input border-border rounded-lg text-foreground placeholder-muted-foreground text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">سعر الشراء (د.ل)</label>
              <input type="number" min="0" step="0.0001" value={purchasePrice} onChange={e => setPurchasePrice(e.target.value)} className="w-full px-4 py-2.5 bg-input border-border rounded-lg text-foreground placeholder-muted-foreground text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
            <div><label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">سعر البيع (د.ل)</label>
              <input type="number" min="0" step="0.0001" value={sellingPrice} onChange={e => setSellingPrice(e.target.value)} className="w-full px-4 py-2.5 bg-input border-border rounded-lg text-foreground placeholder-muted-foreground text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="w-4 h-4 rounded border-border bg-input text-indigo-500 focus:ring-indigo-500" />
            <span className="text-sm text-foreground">نشط</span>
          </label>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-semibold text-foreground bg-muted hover:bg-accent border border-border rounded-lg transition-colors">إلغاء</button>
            <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-2.5 text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {isSubmitting ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> جاري الحفظ...</> : isEditing ? 'تحديث الصنف' : 'إنشاء الصنف'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const Products: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductDto | null>(null);
  const { data: products = [], isLoading, error } = useQuery({ queryKey: ['products', categoryFilter, searchQuery], queryFn: () => inventoryApi.getProducts({ categoryId: categoryFilter || undefined, search: searchQuery || undefined }) });
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: () => inventoryApi.getCategories() });
  const lowStockCount = products.filter(p => p.isLowStock).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">الأصناف</h1>
          <p className="text-sm text-muted-foreground mt-1">إدارة أصناف المخزون — {products.length} صنف{lowStockCount > 0 && <span className="ml-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">{lowStockCount} مخزون منخفض</span>}</p>
        </div>
        <button onClick={() => { setEditingProduct(null); setShowModal(true); }} className="px-4 py-2.5 text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary/90 rounded-xl transition-colors flex items-center gap-2"><span className="text-lg leading-none">+</span> إضافة صنف</button>
      </div>
      <div className="bg-card border border-border rounded-xl p-4 flex flex-wrap gap-4 items-center">
        <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="بحث بالرمز أو الاسم..." className="flex-1 min-w-[200px] px-4 py-2 bg-input border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="px-4 py-2 bg-input border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm">
          <option value="">جميع الفئات</option>{categories.filter(c => c.isActive).map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
        </select>
      </div>
      {error && <div className="p-4 bg-red-950/50 border border-red-800/80 rounded-lg text-red-300 text-sm">فشل في تحميل الأصناف.</div>}
      {isLoading && <div className="flex items-center justify-center p-12 text-muted-foreground space-x-3"><div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /><span>جاري تحميل الأصناف...</span></div>}
      {!isLoading && !error && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3 text-left">رمز الصنف</th><th className="px-5 py-3 text-left">الاسم</th><th className="px-5 py-3 text-left">الفئة</th><th className="px-5 py-3 text-center">وحدة القياس</th><th className="px-5 py-3 text-right">شراء</th><th className="px-5 py-3 text-right">بيع</th><th className="px-5 py-3 text-right">المخزون</th><th className="px-5 py-3 text-center">الحالة</th><th className="px-5 py-3 text-center">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {products.length === 0 ? <tr><td colSpan={9} className="px-5 py-12 text-center text-muted-foreground">لم يتم العثور على أصناف.</td></tr> : products.map(p => (
                  <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3 font-mono font-semibold text-indigo-400">{p.sku}</td>
                    <td className="px-5 py-3 text-foreground">{p.name}</td>
                    <td className="px-5 py-3 text-muted-foreground">{p.categoryName}</td>
                    <td className="px-5 py-3 text-center text-muted-foreground">{uomAr[p.unitOfMeasure] || p.unitOfMeasure}</td>
                    <td className="px-5 py-3 text-right font-mono text-foreground">{formatCurrency(p.purchasePrice)}</td>
                    <td className="px-5 py-3 text-right font-mono text-foreground">{formatCurrency(p.sellingPrice)}</td>
                    <td className="px-5 py-3 text-right">
                      <span className={`font-mono font-semibold ${p.isLowStock ? 'text-amber-400' : 'text-emerald-400'}`}>{formatStock(p.currentStock)}</span>
                      {p.isLowStock && <span className="ml-1.5 px-1.5 py-0.5 text-[9px] font-bold rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">منخفض</span>}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${p.isActive ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/15 text-red-400 border border-red-500/30'}`}>{p.isActive ? 'نشط' : 'غير نشط'}</span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <button onClick={() => { setEditingProduct(p); setShowModal(true); }} className="px-2 py-1 text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-900/30 border border-indigo-700/40 rounded hover:bg-indigo-900/50 transition-colors">تعديل</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <ProductModal isOpen={showModal} onClose={() => { setShowModal(false); setEditingProduct(null); }} product={editingProduct} categories={categories} />
    </div>
  );
};
