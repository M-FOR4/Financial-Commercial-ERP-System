import React, { useState, useEffect } from 'react';
import {
  fixedAssetsApi,
  type FixedAsset, type AssetCategory,
} from '../../services/fixedAssetsApi';
import { api } from '../../services/api';
import type { AccountDto } from '../../services/accountingApi';
import { X } from 'lucide-react';
import { showError } from '../../lib/toast';
import { StatusBadge } from '../../components/StatusBadge';
import { formatCurrency } from '../../utils/format';

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
    } catch (err: any) { showError('تعذر التخلص من الأصل', err.response?.data?.error || 'فشل في التخلص من الأصل.'); }
  };

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
            className="px-4 py-2 bg-muted hover:bg-accent text-foreground border border-border rounded-xl font-semibold transition-colors">
            + فئة
          </button>
          <button onClick={() => { setShowRegisterModal(!showRegisterModal); setError(''); }}
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold transition-colors">
            + تسجيل أصل
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-muted-foreground">إجمالي الأصول</p>
          <p className="text-2xl font-bold text-foreground mt-2">{assets.length}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-muted-foreground">التكلفة الإجمالية</p>
          <p className="text-2xl font-bold text-blue-400 mt-2">{formatCurrency(assets.reduce((s, a) => s + a.purchaseCost, 0))}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-muted-foreground">الإهلاك المتراكم</p>
          <p className="text-2xl font-bold text-amber-400 mt-2">{formatCurrency(assets.reduce((s, a) => s + a.accumulatedDepreciation, 0))}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-muted-foreground">صافي القيمة الدفترية</p>
          <p className="text-2xl font-bold text-emerald-400 mt-2">{formatCurrency(assets.reduce((s, a) => s + a.currentBookValue, 0))}</p>
        </div>
      </div>

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[calc(100vh-4rem)] overflow-y-auto relative">
            <button type="button" onClick={() => setShowCategoryModal(false)} aria-label="إغلاق" className="absolute left-4 top-4 p-1.5 text-muted-foreground hover:text-foreground opacity-70 hover:opacity-100 transition-all">
              <X size={20} />
            </button>
            <h2 className="text-lg font-bold text-foreground mb-4 pl-12">فئة أصل جديدة</h2>
            {error && <div className="mb-4 px-3 py-2 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive">{error}</div>}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">الكود *</label>
                  <input type="text" value={catForm.code} onChange={e => setCatForm({ ...catForm, code: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:ring-2 focus:ring-ring focus:outline-none" placeholder="EQUIP" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">العمر الافتراضي (سنوات)</label>
                  <input type="number" value={catForm.defaultUsefulLifeYears} onChange={e => setCatForm({ ...catForm, defaultUsefulLifeYears: parseInt(e.target.value) || 5 })}
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:ring-2 focus:ring-ring focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">الاسم *</label>
                <input type="text" value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:ring-2 focus:ring-ring focus:outline-none" placeholder="معدات مكتبية" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">حساب الأصل الرئيسي *</label>
                <select value={catForm.assetAccountId} onChange={e => setCatForm({ ...catForm, assetAccountId: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:ring-2 focus:ring-ring focus:outline-none">
                  <option value="">اختر...</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">حساب الإهلاك المتراكم *</label>
                <select value={catForm.accumulatedDepreciationAccountId} onChange={e => setCatForm({ ...catForm, accumulatedDepreciationAccountId: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:ring-2 focus:ring-ring focus:outline-none">
                  <option value="">اختر...</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">حساب مصروف الإهلاك *</label>
                <select value={catForm.depreciationExpenseAccountId} onChange={e => setCatForm({ ...catForm, depreciationExpenseAccountId: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:ring-2 focus:ring-ring focus:outline-none">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[calc(100vh-4rem)] overflow-y-auto relative">
            <button type="button" onClick={() => setShowRegisterModal(false)} aria-label="إغلاق" className="absolute left-4 top-4 p-1.5 text-muted-foreground hover:text-foreground opacity-70 hover:opacity-100 transition-all">
              <X size={20} />
            </button>
            <h2 className="text-lg font-bold text-foreground mb-4 pl-12">تسجيل أصل جديد</h2>
            {error && <div className="mb-4 px-3 py-2 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive">{error}</div>}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">كود الأصل *</label>
                  <input type="text" value={regForm.assetCode} onChange={e => setRegForm({ ...regForm, assetCode: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:ring-2 focus:ring-ring focus:outline-none" placeholder="FA-001" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">الفئة *</label>
                  <select value={regForm.categoryId} onChange={e => setRegForm({ ...regForm, categoryId: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:ring-2 focus:ring-ring focus:outline-none">
                    <option value="">اختر...</option>
                    {categories.filter(c => c.isActive).map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">الاسم *</label>
                <input type="text" value={regForm.name} onChange={e => setRegForm({ ...regForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:ring-2 focus:ring-ring focus:outline-none" placeholder="حاسوب مكتبي" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">تكلفة الشراء (د.ل) *</label>
                  <input type="number" step="0.01" value={regForm.purchaseCost || ''} onChange={e => setRegForm({ ...regForm, purchaseCost: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:ring-2 focus:ring-ring focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">القيمة التخريدية</label>
                  <input type="number" step="0.01" value={regForm.salvageValue || ''} onChange={e => setRegForm({ ...regForm, salvageValue: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:ring-2 focus:ring-ring focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">العمر الإنتاجي (سنوات)</label>
                  <input type="number" value={regForm.usefulLifeYears} onChange={e => setRegForm({ ...regForm, usefulLifeYears: parseInt(e.target.value) || 5 })}
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:ring-2 focus:ring-ring focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">تاريخ الشراء</label>
                <input type="date" value={regForm.purchaseDate} onChange={e => setRegForm({ ...regForm, purchaseDate: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:ring-2 focus:ring-ring focus:outline-none" />
              </div>

              {previewDepr > 0 && (
                <div className="p-3 bg-primary/10 border border-primary/20 rounded-xl">
                  <p className="text-xs font-bold text-primary mb-1">معاينة الإهلاك المستقيم</p>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div><span className="text-muted-foreground">سنوي:</span> <span className="text-foreground font-semibold">{formatCurrency(previewDepr * 12)}</span></div>
                    <div><span className="text-muted-foreground">شهري:</span> <span className="text-foreground font-semibold">{formatCurrency(previewDepr)}</span></div>
                    <div><span className="text-muted-foreground">قابل للإهلاك:</span> <span className="text-foreground font-semibold">{formatCurrency(regForm.purchaseCost - regForm.salvageValue)}</span></div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[calc(100vh-4rem)] overflow-y-auto relative">
            <button type="button" onClick={() => setShowDisposalModal(null)} aria-label="إغلاق" className="absolute left-4 top-4 p-1.5 text-muted-foreground hover:text-foreground opacity-70 hover:opacity-100 transition-all">
              <X size={20} />
            </button>
            <h2 className="text-lg font-bold text-foreground mb-2 pl-12">التخلص من الأصل</h2>
            <p className="text-sm text-muted-foreground mb-4">{showDisposalModal.assetCode} — {showDisposalModal.name}</p>
            <div className="p-3 bg-muted/50 rounded-lg mb-4 text-xs space-y-1">
              <div className="flex justify-between"><span className="text-muted-foreground">تكلفة الشراء:</span><span className="text-foreground font-semibold">{formatCurrency(showDisposalModal.purchaseCost)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">الإهلاك المتراكم:</span><span className="text-amber-400 font-semibold">{formatCurrency(showDisposalModal.accumulatedDepreciation)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">القيمة الدفترية الحالية:</span><span className="text-foreground font-semibold">{formatCurrency(showDisposalModal.currentBookValue)}</span></div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">قيمة التخلص (د.ل)</label>
                <input type="number" step="0.01" value={disposalForm.disposalValue || ''} onChange={e => setDisposalForm({ ...disposalForm, disposalValue: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:ring-2 focus:ring-ring focus:outline-none" />
                {disposalForm.disposalValue > 0 && (
                  <p className={`text-xs mt-1 font-bold ${disposalForm.disposalValue >= showDisposalModal.currentBookValue ? 'text-emerald-400' : 'text-destructive'}`}>
                    {disposalForm.disposalValue >= showDisposalModal.currentBookValue ? 'ربح' : 'خسارة'}: {formatCurrency(Math.abs(disposalForm.disposalValue - showDisposalModal.currentBookValue))}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">الوصف</label>
                <input type="text" value={disposalForm.description} onChange={e => setDisposalForm({ ...disposalForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:ring-2 focus:ring-ring focus:outline-none" placeholder="بيع لمُ recycler" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setShowDisposalModal(null)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground bg-muted border border-border rounded-lg">إلغاء</button>
              <button onClick={handleDisposal} className="px-4 py-2 text-sm text-destructive-foreground bg-destructive hover:bg-destructive/90 rounded-lg">التخلص من الأصل</button>
            </div>
          </div>
        </div>
      )}

      {/* Assets Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-3 text-right">الكود</th>
                <th className="px-5 py-3 text-right">الاسم</th>
                <th className="px-5 py-3 text-right">الفئة</th>
                <th className="px-5 py-3 text-left">التكلفة</th>
                <th className="px-5 py-3 text-left">الإهلاك المتراكم</th>
                <th className="px-5 py-3 text-left">القيمة الدفترية</th>
                <th className="px-5 py-3 text-left">الإهلاك الشهري</th>
                <th className="px-5 py-3 text-center">الحالة</th>
                <th className="px-5 py-3 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {assets.length === 0 ? (
                <tr><td colSpan={9} className="px-5 py-12 text-center text-muted-foreground">لا توجد أصول ثابتة مسجلة بعد.</td></tr>
              ) : (
                assets.map(asset => {
                  return (
                    <tr key={asset.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-3 font-semibold text-primary text-right">{asset.assetCode}</td>
                      <td className="px-5 py-3 font-medium text-foreground text-right">{asset.name}</td>
                      <td className="px-5 py-3 text-muted-foreground text-right">{asset.categoryName}</td>
                      <td className="px-5 py-3 text-left text-foreground">{formatCurrency(asset.purchaseCost)}</td>
                      <td className="px-5 py-3 text-left text-amber-400">{formatCurrency(asset.accumulatedDepreciation)}</td>
                      <td className="px-5 py-3 text-left font-bold text-emerald-400">{formatCurrency(asset.currentBookValue)}</td>
                      <td className="px-5 py-3 text-left text-muted-foreground">{formatCurrency(asset.monthlyDepreciation)}</td>
                      <td className="px-5 py-3 text-center">
                        <StatusBadge status={asset.status} />
                      </td>
                      <td className="px-5 py-3 text-center">
                        {asset.status === 'Active' && (
                          <button onClick={() => { setShowDisposalModal(asset); setDisposalForm({ disposalValue: 0, description: '' }); }}
                            className="px-2.5 py-1 text-xs font-semibold text-destructive hover:text-destructive/80 bg-destructive/10 border border-destructive/20 rounded-lg hover:bg-destructive/20 transition-colors">
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

