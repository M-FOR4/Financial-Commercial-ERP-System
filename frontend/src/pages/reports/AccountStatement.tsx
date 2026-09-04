import React, { useState } from 'react';
import { reportsApi, type AccountStatementResponse } from '../../services/reportsApi';
import { api } from '../../services/api';

interface Party { id: string; code: string; name: string; }

export const AccountStatement: React.FC = () => {
  const [partyType, setPartyType] = useState<'Customer' | 'Supplier'>('Customer');
  const [partyId, setPartyId] = useState('');
  const [partySearch, setPartySearch] = useState('');
  const [parties, setParties] = useState<Party[]>([]);
  const [fromDate, setFromDate] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().split('T')[0]; });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [result, setResult] = useState<AccountStatementResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
    if (!partyId) { setError('يرجى اختيار الجهة.'); return; }
    setLoading(true);
    setError('');
    try {
      const data = await reportsApi.getAccountStatement({ partyType, partyId, fromDate, toDate });
      setResult(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'فشل في إنشاء التقرير.');
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n: number) => new Intl.NumberFormat('en-LY', { minimumFractionDigits: 2 }).format(n);
  const filteredParties = parties.filter(p => !partySearch || p.name.toLowerCase().includes(partySearch.toLowerCase()) || p.code.toLowerCase().includes(partySearch.toLowerCase()));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">كشف حساب</h1>
        <p className="text-sm text-muted-foreground mt-1">كشف حساب العميل أو المورد مع رصيد متراكم</p>
      </div>

      {/* Parameters */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">نوع الجهة</label>
            <select value={partyType} onChange={e => handlePartyTypeChange(e.target.value as 'Customer' | 'Supplier')}
              className="px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:border-indigo-500 focus:outline-none">
              <option value="Customer">عميل</option>
              <option value="Supplier">مورد</option>
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-semibold text-muted-foreground mb-1">بحث في الجهات</label>
            <input type="text" value={partySearch} onChange={e => { setPartySearch(e.target.value); if (parties.length === 0) searchParties(partyType); }}
              onFocus={() => { if (parties.length === 0) searchParties(partyType); }}
              className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:border-indigo-500 focus:outline-none"
              placeholder="بحث بالاسم أو الكود..." />
            {partySearch && filteredParties.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-muted border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {filteredParties.slice(0, 10).map(p => (
                  <button key={p.id} onClick={() => { setPartyId(p.id); setPartySearch(`${p.code} — ${p.name}`); }}
                    className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-accent">
                    <span className="font-mono text-muted-foreground mr-2">{p.code}</span>{p.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">From Date</label>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
              className="px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:border-indigo-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">To Date</label>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
              className="px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:border-indigo-500 focus:outline-none" />
          </div>
          <button onClick={handleGenerate} disabled={loading}
            className="px-6 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-foreground rounded-lg font-medium transition-colors">{loading ? 'جاري التوليد...' : 'إنشاء'}</button>
        </div>
      </div>

      {error && <div className="px-4 py-3 bg-red-950 border border-red-800/50 rounded-xl text-sm text-red-400">{error}</div>}

      {result && (
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div>
              <h2 className="text-lg font-bold text-foreground">{result.partyName}</h2>
              <p className="text-xs text-muted-foreground font-mono">{result.partyCode}</p>
            </div>
            <div className="text-right text-xs text-muted-foreground font-mono">
              {new Date(result.fromDate).toLocaleDateString()} — {new Date(result.toDate).toLocaleDateString()}
            </div>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground uppercase">الرصيد الافتتاحي</p>
              <p className={`text-sm font-bold font-mono ${result.openingBalance >= 0 ? 'text-foreground' : 'text-red-400'}`}>{fmt(result.openingBalance)}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground uppercase">إجمالي المدين</p>
              <p className="text-sm font-bold font-mono text-emerald-400">{fmt(result.totalDebit)}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground uppercase">الرصيد الختامي</p>
              <p className={`text-sm font-bold font-mono ${result.closingBalance >= 0 ? 'text-foreground' : 'text-red-400'}`}>{fmt(result.closingBalance)}</p>
            </div>
          </div>

          {/* Statement Lines */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase">التاريخ</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase">المرجع</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase">الوصف</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground uppercase">مدين</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground uppercase">دائن</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground uppercase">الرصيد</th>
                </tr>
              </thead>
              <tbody>
                {result.lines.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">لا توجد معاملات في هذه الفترة.</td></tr>
                ) : (
                  result.lines.map((line, i) => (
                    <tr key={i} className="border-b border-border/30 hover:bg-muted/20">
                      <td className="px-3 py-2 text-muted-foreground font-mono text-xs">{new Date(line.date).toLocaleDateString()}</td>
                      <td className="px-3 py-2 text-foreground font-mono text-xs">{line.reference}</td>
                      <td className="px-3 py-2 text-muted-foreground">{line.description}</td>
                      <td className="px-3 py-2 text-right font-mono text-foreground">{line.debit > 0 ? fmt(line.debit) : '-'}</td>
                      <td className="px-3 py-2 text-right font-mono text-foreground">{line.credit > 0 ? fmt(line.credit) : '-'}</td>
                      <td className={`px-3 py-2 text-right font-mono font-bold ${line.balance >= 0 ? 'text-foreground' : 'text-red-400'}`}>
                        {fmt(line.balance)}
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
