import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, ArrowLeft } from 'lucide-react';
import { suppliers, purchases, type PurchaseCreateInput } from '../api';
import { useBranch } from '../contexts/BranchContext';

interface Props { lang: 'en' | 'ar' }

const t = {
  en: {
    title: 'New Purchase Order', back: 'Back', supplier: 'Supplier', items: 'Items',
    model: 'Model / Description', quantity: 'Qty', unitCost: 'Unit Cost (EGP)', addItem: 'Add Item',
    total: 'Total', submit: 'Create Purchase', cancel: 'Cancel',
    selectSupplier: '— Select Supplier —', required: 'Required',
    successMsg: 'Purchase created!', errorMsg: 'Failed to create purchase.',
    loading: 'Loading suppliers…',
  },
  ar: {
    title: 'أمر شراء جديد', back: 'رجوع', supplier: 'المورد', items: 'الأصناف',
    model: 'الموديل / الوصف', quantity: 'الكمية', unitCost: 'سعر الوحدة (ر.س)', addItem: 'إضافة صنف',
    total: 'الإجمالي', submit: 'إنشاء الطلب', cancel: 'إلغاء',
    selectSupplier: '— اختر المورد —', required: 'مطلوب',
    successMsg: 'تم إنشاء طلب الشراء!', errorMsg: 'فشل إنشاء الطلب.',
    loading: 'تحميل الموردين…',
  },
};

interface LineItem { model: string; quantity: number; unitCost: number; vin?: string }

const emptyItem = (): LineItem => ({ model: '', quantity: 1, unitCost: 0 });

export default function PurchaseForm({ lang }: Props) {
  const i18n = t[lang];
  const isRtl = lang === 'ar';
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { branchId } = useBranch();

  const [supplierId, setSupplierId] = useState('');
  const [items, setItems] = useState<LineItem[]>([emptyItem()]);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: suppData, isLoading: suppLoading } = useQuery({
    queryKey: ['suppliers', 'active'],
    queryFn: () => suppliers.list({ limit: 100 }),
  });

  const createMut = useMutation({
    mutationFn: (d: PurchaseCreateInput) => purchases.create(d),
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ['purchases'] });
      navigate(`/purchases/${p.id}`);
    },
    onError: (e: Error) => setFormError(e.message),
  });

  function addItem() { setItems(items => [...items, emptyItem()]); }
  function removeItem(idx: number) { setItems(items => items.filter((_, i) => i !== idx)); }
  function updateItem(idx: number, patch: Partial<LineItem>) {
    setItems(items => items.map((it, i) => i === idx ? { ...it, ...patch } : it));
  }

  const total = items.reduce((acc, it) => acc + (it.quantity || 0) * (it.unitCost || 0), 0);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!supplierId) { setFormError('Please select a supplier.'); return; }
    const invalidItem = items.find(it => !it.model.trim() || it.quantity < 1 || it.unitCost < 0);
    if (invalidItem) { setFormError('All items must have a model and valid quantity/cost.'); return; }
    if (!branchId) { setFormError('Please select a branch.'); return; }
    createMut.mutate({ supplierId, branchId, items });
  }

  const isBusy = createMut.isPending;

  return (
    <div className="page-container" style={{ direction: isRtl ? 'rtl' : 'ltr', maxWidth: 800 }}>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button className="btn btn-outline" style={{ padding: '0.375rem' }} onClick={() => navigate('/purchases')}>
          <ArrowLeft size={18} />
        </button>
        <h1 style={{ margin: 0, background: 'linear-gradient(135deg, #f8fafc, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          {i18n.title}
        </h1>
      </div>

      <form onSubmit={handleSubmit}>
        {formError && (
          <div style={{ marginBottom: '1rem', padding: '0.875rem', background: 'var(--error-bg)', color: 'var(--error)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }}>
            {formError}
          </div>
        )}

        {/* Supplier selector */}
        <div className="card mb-4">
          <h2 style={{ fontSize: '1rem', marginBottom: '1rem' }}>{i18n.supplier}</h2>
          <div className="input-group" style={{ marginBottom: 0 }}>
            {suppLoading
              ? <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{i18n.loading}</span>
              : (
                <select
                  className="input-field"
                  value={supplierId}
                  onChange={e => setSupplierId(e.target.value)}
                  required
                >
                  <option value="">{i18n.selectSupplier}</option>
                  {(suppData?.items ?? []).filter(s => s.isActive).map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              )
            }
          </div>
        </div>

        {/* Items */}
        <div className="card mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 style={{ fontSize: '1rem', margin: 0 }}>{i18n.items} ({items.length})</h2>
            <button type="button" className="btn btn-outline" onClick={addItem} style={{ fontSize: '0.8rem' }}>
              <Plus size={14} /> {i18n.addItem}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {items.map((item, idx) => (
              <div key={idx} style={{
                display: 'grid', gridTemplateColumns: '1fr 80px 120px 36px',
                gap: '0.5rem', alignItems: 'center',
                padding: '0.75rem', background: 'var(--bg-primary)',
                borderRadius: 'var(--radius-md)', border: '1px solid var(--border)',
              }}>
                <input
                  className="input-field" placeholder={i18n.model}
                  value={item.model} onChange={e => updateItem(idx, { model: e.target.value })}
                  style={{ margin: 0 }}
                />
                <input
                  className="input-field" type="number" min={1} placeholder={i18n.quantity}
                  value={item.quantity} onChange={e => updateItem(idx, { quantity: Number(e.target.value) })}
                  style={{ margin: 0 }}
                />
                <input
                  className="input-field" type="number" min={0} step="0.01" placeholder={i18n.unitCost}
                  value={item.unitCost} onChange={e => updateItem(idx, { unitCost: Number(e.target.value) })}
                  style={{ margin: 0 }}
                />
                <button
                  type="button"
                  onClick={() => items.length > 1 && removeItem(idx)}
                  disabled={items.length === 1}
                  style={{ background: 'var(--error-bg)', color: 'var(--error)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius-md)', padding: '0.375rem', cursor: 'pointer', opacity: items.length === 1 ? 0.4 : 1 }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          {/* Total */}
          <div style={{
            display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
            marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)',
            gap: '1rem',
          }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{i18n.total}:</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
              {total.toLocaleString('en', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-outline" onClick={() => navigate('/purchases')} disabled={isBusy}>
            {i18n.cancel}
          </button>
          <button type="submit" className="btn btn-primary" disabled={isBusy}>
            {isBusy ? <span className="spinner" style={{ width: 16, height: 16 }} /> : <Plus size={16} />}
            {i18n.submit}
          </button>
        </div>
      </form>
    </div>
  );
}
