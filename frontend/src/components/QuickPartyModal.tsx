import React, { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, X } from 'lucide-react';
import { salesApi } from '../services/salesApi';
import { purchasesApi } from '../services/purchasesApi';
import { showSuccess } from '../lib/toast';
import { phoenixHeaderInput } from './phoenix/tokens';

// ═══════════════════════════════════════════════════════════
//  QUICK PARTY MODAL (إضافة سريعة)
//  Minimal customer/supplier creation used from invoice screens.
//  Mount it conditionally (only while open) so every open starts
//  with fresh state, then select the created party in the parent
//  form through onCreated — the invoice being edited is never lost.
// ═══════════════════════════════════════════════════════════

export type PartyKind = 'customer' | 'supplier';

export interface PartyOption {
  id: string;
  code: string;
  name: string;
}

interface QuickPartyModalProps {
  kind: PartyKind;
  /** Existing codes of the same kind — used to suggest the next code. */
  existingCodes: string[];
  onClose: () => void;
  /** Called with the newly created party so it can be auto-selected. */
  onCreated: (party: PartyOption) => void;
}

const CODE_PREFIX: Record<PartyKind, string> = { customer: 'CUST', supplier: 'SUP' };

/** Next free sequence code (CUST-001, CUST-002 …) based on the existing codes. */
const suggestCode = (kind: PartyKind, codes: string[]): string => {
  const prefix = CODE_PREFIX[kind];
  const pattern = new RegExp(`^${prefix}-(\\d+)$`, 'i');
  let max = 0;
  for (const code of codes) {
    const match = pattern.exec(code.trim());
    if (match) max = Math.max(max, parseInt(match[1], 10));
  }
  return `${prefix}-${String(max + 1).padStart(3, '0')}`;
};

export const QuickPartyModal: React.FC<QuickPartyModalProps> = ({ kind, existingCodes, onClose, onCreated }) => {
  const queryClient = useQueryClient();
  const isCustomer = kind === 'customer';

  const [code, setCode] = useState(() => suggestCode(kind, existingCodes));
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);

  const labels = useMemo(
    () => ({
      title: isCustomer ? 'إضافة عميل سريعة' : 'إضافة مورد سريع',
      namePlaceholder: isCustomer ? 'اسم العميل' : 'اسم المورد',
      success: isCustomer ? 'تم إنشاء العميل' : 'تم إنشاء المورد',
      queryKey: isCustomer ? 'customers' : 'suppliers',
    }),
    [isCustomer]
  );

  const createMutation = useMutation({
    mutationFn: async () => {
      const data = {
        code: code.trim(),
        name: name.trim(),
        phone: phone.trim() || null,
        email: null,
        taxNumber: null,
        address: null,
        isActive: true,
      };
      return isCustomer
        ? salesApi.createCustomer(data)
        : purchasesApi.createSupplier(data);
    },
    onSuccess: (party) => {
      queryClient.invalidateQueries({ queryKey: [labels.queryKey] });
      showSuccess(`${labels.success} ${party.code} — ${party.name}`);
      onCreated({ id: party.id, code: party.code, name: party.name });
      onClose();
    },
    onError: (err: { response?: { data?: { message?: string; detail?: string } } }) => {
      setError(err.response?.data?.message || err.response?.data?.detail || 'فشل في حفظ البيانات');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(`يجب إدخال ${isCustomer ? 'اسم العميل' : 'اسم المورد'}.`);
      return;
    }
    setError(null);
    createMutation.mutate();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md text-right"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
          <h3 className="text-base font-bold text-foreground">{labels.title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          {error && (
            <div className="p-2.5 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-xs">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground mb-1">الكود *</label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className={`${phoenixHeaderInput} font-mono`}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                {isCustomer ? 'اسم العميل' : 'اسم المورد'} *
              </label>
              <input
                type="text"
                required
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={labels.namePlaceholder}
                className={phoenixHeaderInput}
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground mb-1">الهاتف</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+218..."
              className={phoenixHeaderInput}
            />
          </div>

          <p className="text-[10px] text-muted-foreground">
            يتم الحفظ مباشرة وربط الحساب المحاسبي تلقائياً، ويظل نموذج الفاتورة الحالي كما هو.
          </p>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-9 text-xs font-bold text-foreground bg-muted hover:bg-accent border border-border rounded-lg transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="flex-1 h-9 text-xs font-bold text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {createMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : null}
              حفظ واختيار
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuickPartyModal;
