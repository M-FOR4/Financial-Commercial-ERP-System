import React, { useState } from 'react';
import { reportsApi, type AccountStatementResponse } from '../../services/reportsApi';
import { api } from '../../services/api';
import { formatNumber, formatCurrency, formatDate } from '../../utils/format';

interface Party { id: string; code: string; name: string; }

export const AccountStatement: React.FC = () => {
  const [partyType, setPartyType] = useState<'Customer' | 'Supplier'>('Customer');
  const [partyId, setPartyId] = useState('');
  const [partySearch, setPartySearch] = useState('');
  const [parties, setParties] = useState<Party[]>([]);
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [result, setResult] = useState<AccountStatementResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchParties = async (type: 'Customer' | 'Supplier') => {
    try {
      const endpoint = type === 'Customer' ? '/api/customers' : '/api/suppliers';
      const data = await api.get<Party[]>(endpoint).then(r => r.data);
      setParties(data);
    } catch (err) {
      console.error('Failed to load parties:', err);
    }
  };

  const handlePartyTypeChange = (type: 'Customer' | 'Supplier') => {
    setPartyType(type);
    setPartyId('');
    setPartySearch('');
    searchParties(type);
  };

  const handleGenerate = async () => {
    if (!partyId) { setError('يرجى اختيار الجهة أولاً.'); return; }
    setLoading(true);
    setError(null);
    try {
      const data = await reportsApi.getAccountStatement({ partyType, partyId, fromDate, toDate });
      setResult(data);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || 'فشل في إنشاء التقرير.');
    } finally {
      setLoading(false);
    }
  };

  const filteredParties = parties.filter(p => !partySearch || p.name.toLowerCase().includes(partySearch.toLowerCase()) || p.code.toLowerCase().includes(partySearch.toLowerCase()));

  return (
    <div className="space-y-6 text-right">
      <div>
        <h1 className="text-2xl font-bold text-foreground">كشف حساب</h1>
        <p className="text-sm text-muted-foreground mt-1">كشف حساب العميل أو المورد مع رصيد تراكمي مفصل</p>
      </div>

      {/* Parameters */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">نوع الجهة</label>
            <select
              value={partyType}
              onChange={(e) => handlePartyTypeChange(e.target.value as 'Customer' | 'Supplier')}
              className="px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="Customer">عميل</option>
              <option value="Supplier">مورد</option>
            </select>
          </div>
          <div className="flex-1 min-w-[200px] relative">
            <label className="block text-xs font-semibold text-muted-foreground mb-1">بحث في الجهات</label>
            <input
              type="text"
              value={partySearch}
              onChange={(e) => {
                setPartySearch(e.target.value);
                if (parties.length === 0) searchParties(partyType);
              }}
              onFocus={() => { if (parties.length === 0) searchParties(partyType); }}
              className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="بحث بالاسم أو الكود..."
            />
            {partySearch && filteredParties.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-popover border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {filteredParties.slice(0, 10).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setPartyId(p.id);
                      setPartySearch(`${p.code} — ${p.name}`);
                    }}
                    className="w-full px-3 py-2 text-right text-sm text-foreground hover:bg-accent transition-colors flex items-center justify-between"
                  >
                    <span>{p.name}</span>
                    <span className="text-xs font-bold text-muted-foreground">{p.code}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">من تاريخ</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">إلى تاريخ</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="px-6 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground rounded-lg font-semibold transition-colors"
          >
            {loading ? 'جاري التوليد...' : 'إنشاء التقرير'}
          </button>
        </div>
      </div>

      {error && <div className="px-4 py-3 bg-destructive/10 border border-destructive/20 rounded-xl text-sm text-destructive">{error}</div>}

      {result && (
        <div className="bg-card border border-border rounded-xl p-6 space-y-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div>
              <h2 className="text-lg font-bold text-foreground">{result.partyName}</h2>
              <p className="text-xs text-muted-foreground font-semibold mt-0.5">{result.partyCode}</p>
            </div>
            <div className="text-left text-xs text-muted-foreground">
              {formatDate(result.fromDate)} — {formatDate(result.toDate)}
            </div>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-muted/30 border border-border rounded-xl p-3 text-center">
              <p className="text-[10px] text-muted-foreground font-bold uppercase">الرصيد الافتتاحي</p>
              <p className={`text-base font-bold mt-1 ${result.openingBalance >= 0 ? 'text-foreground' : 'text-destructive'}`}>
                {formatCurrency(result.openingBalance)}
              </p>
            </div>
            <div className="bg-muted/30 border border-border rounded-xl p-3 text-center">
              <p className="text-[10px] text-muted-foreground font-bold uppercase">إجمالي المدين</p>
              <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {formatCurrency(result.totalDebit)}
              </p>
            </div>
            <div className="bg-muted/30 border border-border rounded-xl p-3 text-center">
              <p className="text-[10px] text-muted-foreground font-bold uppercase">الرصيد الختامي</p>
              <p className={`text-base font-bold mt-1 ${result.closingBalance >= 0 ? 'text-foreground' : 'text-destructive'}`}>
                {formatCurrency(result.closingBalance)}
              </p>
            </div>
          </div>

          {/* Statement Lines */}
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 text-right text-xs font-bold text-muted-foreground uppercase">التاريخ</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-muted-foreground uppercase">المرجع</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-muted-foreground uppercase">الوصف</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-muted-foreground uppercase">مدين</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-muted-foreground uppercase">دائن</th>
                  <th className="px-4 py-3 text-right text-xs font-bold text-muted-foreground uppercase">الرصيد</th>
                </tr>
              </thead>
              <tbody>
                {result.lines.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">لا توجد معاملات في هذه الفترة.</td></tr>
                ) : (
                  result.lines.map((line, i) => (
                    <tr key={i} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-2.5 text-muted-foreground text-xs font-medium">{formatDate(line.date)}</td>
                      <td className="px-4 py-2.5 text-foreground text-xs font-bold">{line.reference}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{line.description}</td>
                      <td className="px-4 py-2.5 text-right text-foreground font-medium">{line.debit > 0 ? formatNumber(line.debit) : '-'}</td>
                      <td className="px-4 py-2.5 text-right text-foreground font-medium">{line.credit > 0 ? formatNumber(line.credit) : '-'}</td>
                      <td className={`px-4 py-2.5 text-right font-bold ${line.balance >= 0 ? 'text-foreground' : 'text-destructive'}`}>
                        {formatNumber(line.balance)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
