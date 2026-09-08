import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { salesApi, type CustomerDto, type CreateCustomerRequest } from '../../services/salesApi';
import { X } from 'lucide-react';
import { formatCurrency } from '../../utils/format';

interface CustomerModalProps { isOpen: boolean; onClose: () => void; customer?: CustomerDto | null; }

const CustomerModal: React.FC<CustomerModalProps> = ({ isOpen, onClose, customer }) => {
  const queryClient = useQueryClient();
  const isEditing = !!customer;
  const [code, setCode] = useState(customer?.code || '');
  const [name, setName] = useState(customer?.name || '');
  const [phone, setPhone] = useState(customer?.phone || '');
  const [email, setEmail] = useState(customer?.email || '');
  const [taxNumber, setTaxNumber] = useState(customer?.taxNumber || '');
  const [address, setAddress] = useState(customer?.address || '');
  const [isActive, setIsActive] = useState(customer?.isActive ?? true);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setCode(customer?.code || '');
      setName(customer?.name || '');
      setPhone(customer?.phone || '');
      setEmail(customer?.email || '');
      setTaxNumber(customer?.taxNumber || '');
      setAddress(customer?.address || '');
      setIsActive(customer?.isActive ?? true);
      setError(null);
    }
  }, [isOpen, customer]);

  const createMutation = useMutation({
    mutationFn: (data: CreateCustomerRequest) => salesApi.createCustomer(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['customers'] }); onClose(); },
    onError: (err: { response?: { data?: { message?: string } } }) => setError(err.response?.data?.message || 'فشل في حفظ العميل'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateCustomerRequest }) => salesApi.updateCustomer(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['customers'] }); onClose(); },
    onError: (err: { response?: { data?: { message?: string } } }) => setError(err.response?.data?.message || 'فشل في حفظ العميل'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const data: CreateCustomerRequest = {
      code: code.trim(),
      name: name.trim(),
      phone: phone.trim() || null,
      email: email.trim() || null,
      taxNumber: taxNumber.trim() || null,
      address: address.trim() || null,
      isActive,
    };
    if (isEditing && customer) updateMutation.mutate({ id: customer.id, data });
    else createMutation.mutate(data);
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[calc(100vh-4rem)] overflow-y-auto text-right" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-border sticky top-0 bg-card z-10 relative">
          <button type="button" onClick={onClose} aria-label="إغلاق" className="absolute left-4 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground opacity-70 hover:opacity-100 transition-all">
            <X size={20} />
          </button>
          <h3 className="text-lg font-bold text-foreground pl-12">{isEditing ? 'تعديل العميل' : 'إضافة عميل'}</h3>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">الكود *</label>
              <input type="text" required value={code} onChange={(e) => setCode(e.target.value)} disabled={isEditing} placeholder="CUST-001" className="w-full px-4 py-2.5 bg-input border border-border rounded-lg text-foreground placeholder-muted-foreground text-sm disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">الاسم *</label>
              <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم العميل" className="w-full px-4 py-2.5 bg-input border border-border rounded-lg text-foreground placeholder-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">الهاتف</label>
              <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+218..." className="w-full px-4 py-2.5 bg-input border border-border rounded-lg text-foreground placeholder-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">البريد الإلكتروني</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="customer@example.com" className="w-full px-4 py-2.5 bg-input border border-border rounded-lg text-foreground placeholder-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>
          {isEditing && customer && (
            <div className="p-3 bg-muted/40 border border-border rounded-lg">
              <p className="text-xs font-semibold text-muted-foreground mb-1">الحساب المحاسبي المرتبط</p>
              <p className="text-sm font-semibold text-foreground">{customer.code} — حساب العميل (1130)</p>
              <p className="text-xs text-muted-foreground mt-1">
                الرصيد الحالي: <span className={`font-bold ${customer.balance > 0 ? 'text-amber-500' : 'text-muted-foreground'}`}>{formatCurrency(customer.balance)}</span>
              </p>
            </div>
          )}
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="w-4 h-4 rounded border-border bg-input text-primary focus:ring-ring" />
            <span className="text-sm text-foreground">نشط</span>
          </label>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-semibold text-foreground bg-muted hover:bg-accent border border-border rounded-lg transition-colors">إلغاء</button>
            <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="flex-1 px-4 py-2.5 text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg transition-colors disabled:opacity-50">
              {(createMutation.isPending || updateMutation.isPending) ? 'جاري الحفظ...' : isEditing ? 'تحديث' : 'إنشاء'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const Customers: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerDto | null>(null);
  const { data: customers = [], isLoading, error } = useQuery({ queryKey: ['customers', searchQuery], queryFn: () => salesApi.getCustomers({ search: searchQuery || undefined }) });

  return (
    <div className="space-y-6 text-right">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">العملاء</h1>
          <p className="text-sm text-muted-foreground mt-1">إدارة العملاء — {customers.length} عميل</p>
        </div>
        <button onClick={() => { setEditingCustomer(null); setShowModal(true); }} className="px-4 py-2.5 text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary/90 rounded-xl transition-colors flex items-center gap-2">
          <span className="text-lg leading-none">+</span> إضافة عميل
        </button>
      </div>
      <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
        <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="بحث بالكود أو الاسم..." className="w-full px-4 py-2 bg-input border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm" />
      </div>
      {error && <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">فشل في تحميل العملاء.</div>}
      {isLoading && (
        <div className="flex items-center justify-center p-12 text-muted-foreground gap-3">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span>جاري التحميل...</span>
        </div>
      )}
      {!isLoading && !error && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3 text-right">الكود</th>
                  <th className="px-5 py-3 text-right">الاسم</th>
                  <th className="px-5 py-3 text-right">الهاتف</th>
                  <th className="px-5 py-3 text-right">الرصيد</th>
                  <th className="px-5 py-3 text-right">الفواتير</th>
                  <th className="px-5 py-3 text-right">الحالة</th>
                  <th className="px-5 py-3 text-center">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {customers.length === 0 ? (
                  <tr><td colSpan={7} className="px-5 py-12 text-center text-muted-foreground">لم يتم العثور على عملاء.</td></tr>
                ) : (
                  customers.map((c) => (
                    <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-3 text-right font-bold text-primary">{c.code}</td>
                      <td className="px-5 py-3 text-right text-foreground font-medium">{c.name}</td>
                      <td className="px-5 py-3 text-right text-muted-foreground">{c.phone || '-'}</td>
                      <td className={`px-5 py-3 text-right font-bold ${c.balance > 0 ? 'text-amber-500' : c.balance < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>{formatCurrency(c.balance)}</td>
                      <td className="px-5 py-3 text-right text-muted-foreground">{c.invoiceCount}</td>
                      <td className="px-5 py-3 text-right">
                        <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${c.isActive ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30' : 'bg-destructive/15 text-destructive border border-destructive/30'}`}>
                          {c.isActive ? 'نشط' : 'غير نشط'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <button onClick={() => { setEditingCustomer(c); setShowModal(true); }} className="px-2.5 py-1 text-xs font-semibold text-primary hover:text-primary/80 bg-primary/10 border border-primary/20 rounded-lg hover:bg-primary/20 transition-colors">
                          تعديل
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <CustomerModal isOpen={showModal} onClose={() => { setShowModal(false); setEditingCustomer(null); }} customer={editingCustomer} />
    </div>
  );
};
