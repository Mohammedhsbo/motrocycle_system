import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, ShoppingCart, RefreshCw, ChevronRight } from 'lucide-react';
import { purchases, type PurchaseStatus } from '../api';
import Badge from '../components/Badge';

interface Props { lang: 'en' | 'ar' }

const t = {
  en: {
    title: 'Purchases', subtitle: 'purchase orders', add: 'New Purchase',
    number: 'PO Number', supplier: 'Supplier', branch: 'Branch',
    total: 'Total', status: 'Status', date: 'Date', actions: '',
    all: 'All', draft: 'Draft', ordered: 'Ordered', partial: 'Partial', received: 'Received', cancelled: 'Cancelled',
    noData: 'No purchases found.', loading: 'Loading…', error: 'Failed to load purchases.',
    view: 'View',
  },
  ar: {
    title: 'المشتريات', subtitle: 'طلبات شراء', add: 'طلب جديد',
    number: 'رقم الطلب', supplier: 'المورد', branch: 'الفرع',
    total: 'الإجمالي', status: 'الحالة', date: 'التاريخ', actions: '',
    all: 'الكل', draft: 'مسودة', ordered: 'مطلوب', partial: 'جزئي', received: 'مستلم', cancelled: 'ملغي',
    noData: 'لا يوجد مشتريات.', loading: 'جاري التحميل…', error: 'فشل التحميل.',
    view: 'عرض',
  },
};

const STATUSES: { key: PurchaseStatus | 'all'; label: { en: string; ar: string } }[] = [
  { key: 'all', label: { en: 'All', ar: 'الكل' } },
  { key: 'draft', label: { en: 'Draft', ar: 'مسودة' } },
  { key: 'ordered', label: { en: 'Ordered', ar: 'مطلوب' } },
  { key: 'partially_received', label: { en: 'Partial', ar: 'جزئي' } },
  { key: 'received', label: { en: 'Received', ar: 'مستلم' } },
  { key: 'cancelled', label: { en: 'Cancelled', ar: 'ملغي' } },
];

export default function Purchases({ lang }: Props) {
  const i18n = t[lang];
  const isRtl = lang === 'ar';
  const [statusFilter, setStatusFilter] = useState<PurchaseStatus | 'all'>('all');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['purchases', statusFilter],
    queryFn: () => purchases.list({ status: statusFilter === 'all' ? undefined : statusFilter, limit: 50 }),
  });

  const rows = data?.items ?? [];

  return (
    <div className="page-container" style={{ direction: isRtl ? 'rtl' : 'ltr' }}>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 style={{ background: 'linear-gradient(135deg, #f8fafc, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {i18n.title}
          </h1>
          <p className="text-muted" style={{ fontSize: '0.875rem' }}>
            {data?.total ?? 0} {i18n.subtitle}
          </p>
        </div>
        <Link to="/purchases/new" className="btn btn-primary">
          <Plus size={16} /> {i18n.add}
        </Link>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 mb-4" style={{ flexWrap: 'wrap' }}>
        {STATUSES.map(s => (
          <button
            key={s.key}
            onClick={() => setStatusFilter(s.key)}
            className="btn"
            style={{
              padding: '0.375rem 0.875rem', fontSize: '0.8rem',
              background: statusFilter === s.key ? 'var(--accent-primary)' : 'var(--bg-secondary)',
              color: statusFilter === s.key ? 'white' : 'var(--text-secondary)',
              border: `1px solid ${statusFilter === s.key ? 'transparent' : 'var(--border)'}`,
            }}
          >
            {s.label[lang]}
          </button>
        ))}
        <button onClick={() => refetch()} className="btn btn-outline" style={{ padding: '0.375rem' }} title="Refresh">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Table */}
      <div className="table-container">
        {isLoading && (
          <div className="center-content"><div className="spinner" /><span style={{ marginTop: '0.75rem', fontSize: '0.875rem' }}>{i18n.loading}</span></div>
        )}
        {isError && (
          <div className="center-content" style={{ color: 'var(--error)' }}>
            <span>{i18n.error}</span>
            <button className="btn btn-outline mt-4" onClick={() => refetch()}>Retry</button>
          </div>
        )}
        {!isLoading && !isError && rows.length === 0 && (
          <div className="center-content">
            <ShoppingCart size={40} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
            <span style={{ fontSize: '0.875rem' }}>{i18n.noData}</span>
            <Link to="/purchases/new" className="btn btn-primary mt-4">
              <Plus size={16} /> {i18n.add}
            </Link>
          </div>
        )}
        {!isLoading && !isError && rows.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>{i18n.number}</th>
                <th>{i18n.supplier}</th>
                <th>{i18n.total}</th>
                <th>{i18n.status}</th>
                <th>{i18n.date}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(p => (
                <tr key={p.id}>
                  <td style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--accent-primary)' }}>{p.purchaseNumber}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{p.supplier?.name ?? '—'}</td>
                  <td style={{ fontWeight: 600 }}>
                    {Number(p.totalAmount).toLocaleString('en', { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 })}
                  </td>
                  <td><Badge status={p.status} lang={lang} /></td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    {new Date(p.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US')}
                  </td>
                  <td>
                    <Link to={`/purchases/${p.id}`} className="btn btn-outline" style={{ padding: '0.375rem 0.625rem', fontSize: '0.8rem' }}>
                      {i18n.view} <ChevronRight size={14} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
