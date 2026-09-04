import React, { useState, useEffect } from 'react';
import {
  fixedAssetsApi,
  type FixedAsset, type AssetCategory, type AssetStatus,
} from '../../services/fixedAssetsApi';
import { api } from '../../services/api';
import type { AccountDto } from '../../services/accountingApi';

const statusConfig: Record<AssetStatus, { bg: string; text: string; border: string; label: string }> = {
  Active: { bg: 'bg-emerald-950', text: 'text-emerald-400', border: 'border-emerald-800/50', label: 'نشط' },
  FullyDepreciated: { bg: 'bg-blue-950', text: 'text-blue-400', border: 'border-blue-800/50', label: 'محقق بالكامل' },
  Disposed: { bg: 'bg-red-950', text: 'text-red-400', border: 'border-red-800/50', label: 'تم التخلص' },
};

export const FixedAssets: React.FC = () => {
  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [accounts, setAccounts] = useState<AccountDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showDisposalModal, setShowDisposalModal] = useState<FixedAsset | null>(null);
  const [error, setError] = useState('');

  const [regForm, setRegForm] = useState({
    assetCode: '', name: '', categoryId: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    purchaseCost: 0, salvageValue: 0, usefulLifeYears: 5,
  });

  const [catForm, setCatForm] = useState({
    code: '', name: '', assetAccountId: '',
    accumulatedDepreciationAccountId: '', depreciationExpenseAccountId: '',
    defaultUsefulLifeYears: 5,
  });

  const [disposalForm, setDisposalForm] = useState({ disposalValue: 0, description: '' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [a, c, acc] = await Promise.all([
        fixedAssetsApi.getAll(),
        fixedAssetsApi.getCategories(),
        api.get<AccountDto[]>('/api/accounts/flat').then(r => r.data),
      ]);
      setAssets(a);
      setCategories(c);
      setAccounts(acc.filter(x => !x.isHeader));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const previewDepr = regForm.purchaseCost > 0 && regForm.usefulLifeYears > 0
    ? ((regForm.purchaseCost - regForm.salvageValue) / (regForm.usefulLifeYears * 12))
    : 0;

  const handleRegister = async () => {
    if (!regForm.assetCode || !regForm.name || !regForm.categoryId || regForm.purchaseCost <= 0) {
      setError('جميع الحقول مطلوبة. تكلفة الشراء يجب أن تكون > 0.'); return;
    }
    try {
      await fixedAssetsApi.create(regForm);
      setShowRegisterModal(false);
      setRegForm({ assetCode: '', name: '', categoryId: '', purchaseDate: new Date().toISOString().split('T')[0], purchaseCost: 0, salvageValue: 0, usefulLifeYears: 5 });
      await loadData();
    } catch (err: any) { setError(err.response?.data?.error || 'فشل في تسجيل الأصل.'); }
  };

  const handleCreateCategory = async () => {
    if (!catForm.code || !catForm.name || !catForm.assetAccountId || !catForm.accumulatedDepreciationAccountId || !catForm.depreciationExpenseAccountId) {
      setError('جميع حقول الفئة مطلوبة.'); return;
    }
    try {
      await fixedAssetsApi.createCategory(catForm);
      setShowCategoryModal(false);
      setCatForm({ code: '', name: '', assetAccountId: '', accumulatedDepreciationAccountId: '', depreciationExpenseAccountId: '', defaultUsefulLifeYears: 5 });
      await loadData();
    } catch (err: any) { setError(err.response?.data?.error || 'فشل في إنشاء الفئة.'); }
  };

  const handleDisposal = async () => {
    if (!showDisposalModal) return;
    try {
      await fixedAssetsApi.dispose(showDisposalModal.id, disposalForm);
      setShowDisposalModal(null);
      setDisposalForm({ disposalValue: 0, description: '' });
      await loadData();
    } catch (err: any) { alert(err.response?.data?.error || 'فشل في التخلص من الأصل.'); }
  };

  const fmt = (n: number) => new Intl.NumberFormat('en-LY', { minimumFractionDigits: 2 }).format(n);

  if (loading) return <div className="flex items-center justify-center h-64 text-muted-foreground">جاري تحميل الأصول الثابتة...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">الأصول الثابتة</h1>
          <p className="text-sm text-muted-foreground mt-1">إدارة الممتلكات والمعدات مع الإهلاك التلقائي (SLM — D-031)</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => { setShowCategoryModal(!showCategoryModal); setError(''); }}
            className="px-4 py-2 bg-accent hover:bg-accent text-foreground rounded-lg font-medium transition-colors">
            + فئة
          </button>
          <button onClick={() => { setShowRegisterModal(!showRegisterModal); setError(''); }}
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition-colors">
            + تسجيل أصل
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[10px] font-bold text-muted-foreground uppercase">إجمالي الأصول</p>
          <p className="text-xl font-bold text-foreground mt-1">{assets.length}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[10px] font-bold text-muted-foreground uppercase">التكلفة الإجمالية</p>
          <p className="text-xl font-bold text-blue-400 mt-1">{fmt(assets.reduce((s, a) => s + a.purchaseCost, 0))}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[10px] font-bold text-muted-foreground uppercase">الإهلاك المتراكم</p>
          <p className="text-xl font-bold text-amber-400 mt-1">{fmt(assets.reduce((s, a) => s + a.accumulatedDepreciation, 0))}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-[10px] font-bold text-muted-foreground uppercase">صافي القيمة الدفترية</p>
          <p className="text-xl font-bold text-emerald-400 mt-1">{fmt(assets.reduce((s, a) => s + a.currentBookValue, 0))}</p>
        </div>
      </div>

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <h2 className="text-lg font-bold text-foreground mb-4">فئة أصل جديدة</h2>
            {error && <div className="mb-4 px-3 py-2 bg-red-950 border border-red-800/50 rounded-lg text-sm text-red-400">{error}</div>}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">الكود *</label>
                  <input type="text" value={catForm.code} onChange={e => setCatForm({ ...catForm, code: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:border-indigo-500 focus:outline-none" placeholder="EQUIP" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">العمر الافتراضي (سنوات)</label>
                  <input type="number" value={catForm.defaultUsefulLifeYears} onChange={e => setCatForm({ ...catForm, defaultUsefulLifeYears: parseInt(e.target.value) || 5 })}
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:border-indigo-500 focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">الاسم *</label>
                <input type="text" value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:border-indigo-500 focus:outline-none" placeholder="معدات مكتبية" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">حساب الأصل الرئيسي *</label>
                <select value={catForm.assetAccountId} onChange={e => setCatForm({ ...catForm, assetAccountId: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:border-indigo-500 focus:outline-none">
                  <option value="">اختر...</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">حساب الإهلاك المتراكم *</label>
                <select value={catForm.accumulatedDepreciationAccountId} onChange={e => setCatForm({ ...catForm, accumulatedDepreciationAccountId: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:border-indigo-500 focus:outline-none">
                  <option value="">اختر...</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">حساب مصروف الإهلاك *</label>
                <select value={catForm.depreciationExpenseAccountId} onChange={e => setCatForm({ ...catForm, depreciationExpenseAccountId: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:border-indigo-500 focus:outline-none">
                  <option value="">اختر...</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setShowCategoryModal(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground bg-muted border border-border rounded-lg">إلغاء</button>
              <button onClick={handleCreateCategory} className="px-4 py-2 text-sm text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg">إنشاء</button>
            </div>
          </div>
        </div>
      )}

      {/* Register Asset Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <h2 className="text-lg font-bold text-foreground mb-4">تسجيل أصل جديد</h2>
            {error && <div className="mb-4 px-3 py-2 bg-red-950 border border-red-800/50 rounded-lg text-sm text-red-400">{error}</div>}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">كود الأصل *</label>
                  <input type="text" value={regForm.assetCode} onChange={e => setRegForm({ ...regForm, assetCode: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:border-indigo-500 focus:outline-none" placeholder="FA-001" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">الفئة *</label>
                  <select value={regForm.categoryId} onChange={e => setRegForm({ ...regForm, categoryId: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:border-indigo-500 focus:outline-none">
                    <option value="">اختر...</option>
                    {categories.filter(c => c.isActive).map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">الاسم *</label>
                <input type="text" value={regForm.name} onChange={e => setRegForm({ ...regForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:border-indigo-500 focus:outline-none" placeholder="حاسوب مكتبي" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">تكلفة الشراء (د.ل) *</label>
                  <input type="number" step="0.01" value={regForm.purchaseCost || ''} onChange={e => setRegForm({ ...regForm, purchaseCost: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:border-indigo-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">القيمة التخلي</label>
                  <input type="number" step="0.01" value={regForm.salvageValue || ''} onChange={e => setRegForm({ ...regForm, salvageValue: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:border-indigo-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">العمر الإنتاجي (سنوات)</label>
                  <input type="number" value={regForm.usefulLifeYears} onChange={e => setRegForm({ ...regForm, usefulLifeYears: parseInt(e.target.value) || 5 })}
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:border-indigo-500 focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">تاريخ الشراء</label>
                <input type="date" value={regForm.purchaseDate} onChange={e => setRegForm({ ...regForm, purchaseDate: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:border-indigo-500 focus:outline-none" />
              </div>

              {previewDepr > 0 && (
                <div className="p-3 bg-indigo-950/50 border border-indigo-800/40 rounded-lg">
                  <p className="text-xs font-bold text-indigo-400 mb-1">معاينة الإهلاك المستقيم</p>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div><span className="text-muted-foreground">سنوي:</span> <span className="text-foreground font-mono">{fmt(previewDepr * 12)}</span></div>
                    <div><span className="text-muted-foreground">شهري:</span> <span className="text-foreground font-mono">{fmt(previewDepr)}</span></div>
                    <div><span className="text-muted-foreground">قابل للإهلاك:</span> <span className="text-foreground font-mono">{fmt(regForm.purchaseCost - regForm.salvageValue)}</span></div>
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setShowRegisterModal(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground bg-muted border border-border rounded-lg">إلغاء</button>
              <button onClick={handleRegister} className="px-4 py-2 text-sm text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg">تسجيل الأصل</button>
            </div>
          </div>
        </div>
      )}

      {/* Disposal Modal */}
      {showDisposalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-foreground mb-2">التخلص من الأصل</h2>
            <p className="text-sm text-muted-foreground mb-4">{showDisposalModal.assetCode} — {showDisposalModal.name}</p>
            <div className="p-3 bg-muted/50 rounded-lg mb-4 text-xs space-y-1">
              <div className="flex justify-between"><span className="text-muted-foreground">تكلفة الشراء:</span><span className="text-foreground font-mono">{fmt(showDisposalModal.purchaseCost)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">الإهلاك المتراكم:</span><span className="text-amber-400 font-mono">{fmt(showDisposalModal.accumulatedDepreciation)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">القيمة الدفترية الحالية:</span><span className="text-foreground font-mono">{fmt(showDisposalModal.currentBookValue)}</span></div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">قيمة التخلص (د.ل)</label>
                <input type="number" step="0.01" value={disposalForm.disposalValue || ''} onChange={e => setDisposalForm({ ...disposalForm, disposalValue: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:border-indigo-500 focus:outline-none" />
                {disposalForm.disposalValue > 0 && (
                  <p className={`text-xs mt-1 font-bold ${disposalForm.disposalValue >= showDisposalModal.currentBookValue ? 'text-emerald-400' : 'text-red-400'}`}>
                    {disposalForm.disposalValue >= showDisposalModal.currentBookValue ? 'ربح' : 'خسارة'}: {fmt(Math.abs(disposalForm.disposalValue - showDisposalModal.currentBookValue))}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">الوصف</label>
                <input type="text" value={disposalForm.description} onChange={e => setDisposalForm({ ...disposalForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:border-indigo-500 focus:outline-none" placeholder="بيع لمُ recycler" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setShowDisposalModal(null)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground bg-muted border border-border rounded-lg">إلغاء</button>
              <button onClick={handleDisposal} className="px-4 py-2 text-sm text-foreground bg-red-600 hover:bg-red-500 rounded-lg">التخلص من الأصل</button>
            </div>
          </div>
        </div>
      )}

      {/* Assets Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">الكود</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">الاسم</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">الفئة</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">التكلفة</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">الإهلاك المتراكم</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">القيمة الدفترية</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">الإهلاك الشهري</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">الحالة</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {assets.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">لا توجد أصول ثابتة مسجلة بعد.</td></tr>
              ) : (
                assets.map(asset => {
                  const sc = statusConfig[asset.status];
                  return (
                    <tr key={asset.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="px-4 py-3 font-mono text-sm text-foreground">{asset.assetCode}</td>
                      <td className="px-4 py-3 text-sm font-medium text-foreground">{asset.name}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{asset.categoryName}</td>
                      <td className="px-4 py-3 text-right font-mono text-sm text-foreground">{fmt(asset.purchaseCost)}</td>
                      <td className="px-4 py-3 text-right font-mono text-sm text-amber-400">{fmt(asset.accumulatedDepreciation)}</td>
                      <td className="px-4 py-3 text-right font-mono text-sm font-bold text-emerald-400">{fmt(asset.currentBookValue)}</td>
                      <td className="px-4 py-3 text-right font-mono text-sm text-muted-foreground">{fmt(asset.monthlyDepreciation)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${sc.bg} ${sc.text} border ${sc.border}`}>
                          {sc.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {asset.status === 'Active' && (
                          <button onClick={() => { setShowDisposalModal(asset); setDisposalForm({ disposalValue: 0, description: '' }); }}
                            className="px-3 py-1 text-xs font-medium text-red-400 hover:text-red-300 bg-red-950/50 border border-red-800/40 rounded transition-colors">
                            تخلص
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
