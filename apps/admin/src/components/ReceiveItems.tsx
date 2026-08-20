import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PackageCheck, Loader2, AlertTriangle } from 'lucide-react';
import { purchases, type Purchase, type ReceiveItemInput } from '../api';

interface Props {
  purchase: Purchase;
  lang: 'en' | 'ar';
  onSuccess: () => void;
}

const t = {
  en: {
    title: 'Receive Items',
    subtitle: 'Enter VINs for items you want to receive in this batch.',
    vin: 'VIN',
    vinPlaceholder: 'Vehicle Identification Number',
    receive: 'Receive Selected',
    received: 'Already received',
    noItems: 'All items have been received.',
    partialNote: 'You can receive a subset of items. Status will be set to Partially Received.',
    success: 'Items received successfully!',
    error: 'Receiving failed. ',
  },
  ar: {
    title: 'استلام الأصناف',
    subtitle: 'أدخل أرقام الهيكل (VIN) للأصناف التي تريد استلامها.',
    vin: 'رقم الهيكل',
    vinPlaceholder: 'رقم الهيكل',
    receive: 'استلام المحدد',
    received: 'تم الاستلام',
    noItems: 'تم استلام جميع الأصناف.',
    partialNote: 'يمكنك استلام جزء من الأصناف.',
    success: 'تم الاستلام بنجاح!',
    error: 'فشل الاستلام. ',
  },
};

export default function ReceiveItems({ purchase, lang, onSuccess }: Props) {
  const i18n = t[lang];
  const isRtl = lang === 'ar';
  const qc = useQueryClient();

  // Build local VIN map keyed by item ID
  const pendingItems = purchase.items.filter(it => !it.receivedAt);
  const [vins, setVins] = useState<Record<string, string>>(() =>
    Object.fromEntries(pendingItems.map(it => [it.id, '']))
  );
  const [selected, setSelected] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(pendingItems.map(it => [it.id, false]))
  );
  const [receiveError, setReceiveError] = useState<string | null>(null);
  const [receiveSuccess, setReceiveSuccess] = useState(false);

  const receiveMut = useMutation({
    mutationFn: (items: ReceiveItemInput[]) => purchases.receive(purchase.id, items),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase', purchase.id] });
      qc.invalidateQueries({ queryKey: ['purchases'] });
      setReceiveSuccess(true);
      setReceiveError(null);
      onSuccess();
    },
    onError: (e: Error) => {
      setReceiveError(i18n.error + e.message);
    },
  });

  function handleReceive() {
    setReceiveError(null);
    const checkedItems = Object.entries(selected)
      .filter(([, v]) => v)
      .map(([id]) => ({ purchaseItemId: id, vin: vins[id]?.trim() ?? '' }));

    if (checkedItems.length === 0) {
      setReceiveError(lang === 'en' ? 'Select at least one item to receive.' : 'اختر صنفاً واحداً على الأقل.');
      return;
    }
    const missingVin = checkedItems.find(it => !it.vin);
    if (missingVin) {
      setReceiveError(lang === 'en' ? 'All selected items must have a VIN.' : 'جميع الأصناف المحددة يجب أن يكون لها رقم هيكل.');
      return;
    }
    receiveMut.mutate(checkedItems);
  }

  if (pendingItems.length === 0) {
    return (
      <div className="center-content" style={{ minHeight: 120 }}>
        <PackageCheck size={32} style={{ color: 'var(--success)', marginBottom: '0.5rem' }} />
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{i18n.noItems}</span>
      </div>
    );
  }

  return (
    <div style={{ direction: isRtl ? 'rtl' : 'ltr' }}>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem' }}>{i18n.subtitle}</p>

      {receiveSuccess && (
        <div style={{ padding: '0.75rem', background: 'var(--success-bg)', color: 'var(--success)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <PackageCheck size={16} /> {i18n.success}
        </div>
      )}
      {receiveError && (
        <div style={{ padding: '0.75rem', background: 'var(--error-bg)', color: 'var(--error)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertTriangle size={16} /> {receiveError}
        </div>
      )}

      <p style={{ color: 'var(--warning)', fontSize: '0.8rem', marginBottom: '1rem' }}>ℹ {i18n.partialNote}</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
        {pendingItems.map(item => (
          <div key={item.id} style={{
            display: 'grid', gridTemplateColumns: '36px 1fr 1fr',
            alignItems: 'center', gap: '0.75rem',
            padding: '0.75rem 1rem', background: 'var(--bg-primary)',
            borderRadius: 'var(--radius-md)', border: '1px solid var(--border)',
            transition: 'var(--transition)',
            ...(selected[item.id] ? { borderColor: 'var(--accent-primary)', background: 'rgba(59,130,246,0.05)' } : {}),
          }}>
            <input
              type="checkbox"
              checked={selected[item.id]}
              onChange={e => setSelected(s => ({ ...s, [item.id]: e.target.checked }))}
              style={{ width: 18, height: 18, cursor: 'pointer', accentColor: 'var(--accent-primary)' }}
            />
            <div>
              <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{item.model}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                Qty: {item.quantity}
              </div>
            </div>
            <input
              className="input-field"
              placeholder={i18n.vinPlaceholder}
              value={vins[item.id] ?? ''}
              onChange={e => setVins(v => ({ ...v, [item.id]: e.target.value }))}
              disabled={!selected[item.id]}
              style={{ margin: 0, opacity: selected[item.id] ? 1 : 0.4 }}
            />
          </div>
        ))}

        {/* Already received items */}
        {purchase.items.filter(it => it.receivedAt).map(item => (
          <div key={item.id} style={{
            display: 'grid', gridTemplateColumns: '36px 1fr 1fr',
            alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem',
            background: 'var(--success-bg)', borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(16,185,129,0.2)', opacity: 0.7,
          }}>
            <PackageCheck size={18} style={{ color: 'var(--success)' }} />
            <div>
              <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{item.model}</div>
              <div style={{ color: 'var(--success)', fontSize: '0.75rem' }}>{i18n.received}</div>
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.vin ?? '—'}</div>
          </div>
        ))}
      </div>

      {/* Action button */}
      <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
        <button
          className="btn btn-primary"
          onClick={handleReceive}
          disabled={receiveMut.isPending || Object.values(selected).every(v => !v)}
        >
          {receiveMut.isPending ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <PackageCheck size={16} />}
          {i18n.receive}
        </button>
      </div>
    </div>
  );
}
