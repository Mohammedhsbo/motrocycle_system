import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ShoppingCart, PackageCheck, XCircle, ClipboardList } from 'lucide-react';
import { purchases } from '../api';
import Badge from '../components/Badge';
import ReceiveItems from '../components/ReceiveItems';

interface Props { lang: 'en' | 'ar' }

const t = {
  en: {
    back: 'Purchases', loading: 'Loading…', error: 'Failed to load purchase.',
    supplier: 'Supplier', branch: 'Branch', created: 'Created', ordered: 'Ordered', received: 'Received',
    items: 'Items', model: 'Model', qty: 'Qty', unitCost: 'Unit Cost', subtotal: 'Subtotal', status: 'Status',
    total: 'Total Amount', receiveTitle: 'Receive Items',
    btnOrder: 'Mark as Ordered', btnCancel: 'Cancel Purchase',
    confirmOrder: 'Confirm: Mark this purchase as Ordered?',
    confirmCancel: 'Confirm: Cancel this purchase? This cannot be undone.',
    orderSuccess: 'Purchase ordered!', cancelSuccess: 'Purchase cancelled.',
  },
  ar: {
    back: 'المشتريات', loading: 'جاري التحميل…', error: 'فشل تحميل الطلب.',
    supplier: 'المورد', branch: 'الفرع', created: 'أنشئ في', ordered: 'طُلب في', received: 'استُلم في',
    items: 'الأصناف', model: 'الموديل', qty: 'الكمية', unitCost: 'سعر الوحدة', subtotal: 'الإجمالي الفرعي', status: 'الحالة',
    total: 'الإجمالي', receiveTitle: 'استلام الأصناف',
    btnOrder: 'تأكيد الطلب', btnCancel: 'إلغاء الطلب',
    confirmOrder: 'هل تريد تأكيد هذا الطلب؟',
    confirmCancel: 'هل تريد إلغاء هذا الطلب؟ لا يمكن التراجع.',
    orderSuccess: 'تم تأكيد الطلب!', cancelSuccess: 'تم إلغاء الطلب.',
  },
};

export default function PurchaseDetail({ lang }: Props) {
  const i18n = t[lang];
  const isRtl = lang === 'ar';
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const { data: purchase, isLoading, isError, refetch } = useQuery({
    queryKey: ['purchase', id],
    queryFn: () => purchases.get(id!),
    enabled: !!id,
  });

  const orderMut = useMutation({
    mutationFn: () => purchases.order(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase', id] });
      qc.invalidateQueries({ queryKey: ['purchases'] });
      setActionSuccess(i18n.orderSuccess);
    },
    onError: (e: Error) => setActionError(e.message),
  });

  const cancelMut = useMutation({
    mutationFn: () => purchases.cancel(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase', id] });
      qc.invalidateQueries({ queryKey: ['purchases'] });
      setActionSuccess(i18n.cancelSuccess);
    },
    onError: (e: Error) => setActionError(e.message),
  });

  const isBusy = orderMut.isPending || cancelMut.isPending;

  if (isLoading) return (
    <div className="page-container center-content" style={{ direction: isRtl ? 'rtl' : 'ltr' }}>
      <div className="spinner" /><span style={{ marginTop: '0.75rem' }}>{i18n.loading}</span>
    </div>
  );

  if (isError || !purchase) return (
    <div className="page-container center-content" style={{ direction: isRtl ? 'rtl' : 'ltr', color: 'var(--error)' }}>
      <ShoppingCart size={40} style={{ opacity: 0.4 }} />
      <span style={{ marginTop: '0.75rem' }}>{i18n.error}</span>
      <button className="btn btn-outline mt-4" onClick={() => refetch()}>Retry</button>
    </div>
  );

  const canOrder = purchase.status === 'draft';
  const canCancel = purchase.status === 'draft';
  const canReceive = purchase.status === 'ordered' || purchase.status === 'partially_received';
  const total = Number(purchase.totalAmount);

  return (
    <div className="page-container" style={{ direction: isRtl ? 'rtl' : 'ltr', maxWidth: 900 }}>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link to="/purchases" className="btn btn-outline" style={{ padding: '0.375rem' }}>
          <ArrowLeft size={18} />
        </Link>
        <div style={{ flex: 1 }}>
          <div className="flex items-center gap-3">
            <h1 style={{ margin: 0, fontFamily: 'monospace', fontSize: '1.5rem', color: 'var(--accent-primary)' }}>
              {purchase.purchaseNumber}
            </h1>
            <Badge status={purchase.status} lang={lang} />
          </div>
          <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
            {i18n.created}: {new Date(purchase.createdAt).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-EG')}
          </p>
        </div>
        {/* Actions */}
        <div className="flex gap-2">
          {canOrder && (
            <button
              className="btn btn-primary"
              onClick={() => { if (window.confirm(i18n.confirmOrder)) orderMut.mutate(); }}
              disabled={isBusy}
            >
              <ClipboardList size={16} /> {i18n.btnOrder}
            </button>
          )}
          {canCancel && (
            <button
              className="btn"
              style={{ background: 'var(--error-bg)', color: 'var(--error)', border: '1px solid rgba(239,68,68,0.2)' }}
              onClick={() => { if (window.confirm(i18n.confirmCancel)) cancelMut.mutate(); }}
              disabled={isBusy}
            >
              <XCircle size={16} /> {i18n.btnCancel}
            </button>
          )}
        </div>
      </div>

      {/* Feedback banners */}
      {actionError && (
        <div style={{ padding: '0.75rem', background: 'var(--error-bg)', color: 'var(--error)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.875rem' }}>
          {actionError}
        </div>
      )}
      {actionSuccess && (
        <div style={{ padding: '0.75rem', background: 'var(--success-bg)', color: 'var(--success)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.875rem' }}>
          {actionSuccess}
        </div>
      )}

      {/* Meta cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{i18n.supplier}</div>
          <div style={{ fontWeight: 600 }}>{purchase.supplier?.name ?? '—'}</div>
        </div>
        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{i18n.total}</div>
          <div style={{ fontWeight: 700, fontSize: '1.25rem', color: 'var(--accent-primary)' }}>
            {total.toLocaleString('en', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 })}
          </div>
        </div>
        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{i18n.items}</div>
          <div style={{ fontWeight: 600 }}>{purchase.items.length}</div>
        </div>
      </div>

      {/* Items table */}
      <div className="card mb-6">
        <h2 style={{ fontSize: '1rem', marginBottom: '1rem' }}>{i18n.items}</h2>
        <div className="table-container" style={{ border: 'none' }}>
          <table>
            <thead>
              <tr>
                <th>{i18n.model}</th>
                <th>{i18n.qty}</th>
                <th>{i18n.unitCost}</th>
                <th>{i18n.subtotal}</th>
                <th>{i18n.status}</th>
              </tr>
            </thead>
            <tbody>
              {purchase.items.map(item => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 500 }}>{item.model}</td>
                  <td>{item.quantity}</td>
                  <td style={{ fontFamily: 'monospace' }}>
                    {Number(item.unitCost).toLocaleString('en', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 })}
                  </td>
                  <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                    {(item.quantity * Number(item.unitCost)).toLocaleString('en', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 })}
                  </td>
                  <td>
                    {item.receivedAt
                      ? <Badge status="received" lang={lang} />
                      : <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Receive items section */}
      {canReceive && (
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <PackageCheck size={20} style={{ color: 'var(--accent-primary)' }} />
            <h2 style={{ fontSize: '1rem', margin: 0 }}>{i18n.receiveTitle}</h2>
          </div>
          <ReceiveItems
            purchase={purchase}
            lang={lang}
            onSuccess={() => refetch()}
          />
        </div>
      )}
    </div>
  );
}
