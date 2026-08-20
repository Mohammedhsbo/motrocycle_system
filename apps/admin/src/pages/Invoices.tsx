import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { FileText, RefreshCw, ChevronRight, Search } from 'lucide-react';
import { invoices, type InvoiceStatus } from '../api';
import Badge from '../components/Badge';

interface Props { lang: 'en' | 'ar' }

const t = {
  en: {
    title: 'Invoices',
    subtitle: 'invoices',
    search: 'Search by invoice number or customer...',
    invoiceNumber: 'Invoice #',
    customer: 'Customer',
    total: 'Total',
    paid: 'Paid',
    remaining: 'Remaining',
    status: 'Status',
    date: 'Date',
    actions: '',
    all: 'All',
    draft: 'Draft',
    issued: 'Issued',
    cancelled: 'Cancelled',
    refunded: 'Refunded',
    noData: 'No invoices found.',
    loading: 'Loading…',
    error: 'Failed to load invoices.',
    view: 'View',
    items: 'items',
  },
  ar: {
    title: 'الفواتير',
    subtitle: 'فاتورة',
    search: 'البحث برقم الفاتورة أو العميل...',
    invoiceNumber: 'رقم الفاتورة',
    customer: 'العميل',
    total: 'الإجمالي',
    paid: 'المدفوع',
    remaining: 'المتبقي',
    status: 'الحالة',
    date: 'التاريخ',
    actions: '',
    all: 'الكل',
    draft: 'مسودة',
    issued: 'صادرة',
    cancelled: 'ملغاة',
    refunded: 'مستردة',
    noData: 'لا توجد فواتير.',
    loading: 'جاري التحميل…',
    error: 'فشل التحميل.',
    view: 'عرض',
    items: 'عناصر',
  },
};

const STATUSES: { key: InvoiceStatus | 'all'; label: { en: string; ar: string } }[] = [
  { key: 'all', label: { en: 'All', ar: 'الكل' } },
  { key: 'draft', label: { en: 'Draft', ar: 'مسودة' } },
  { key: 'issued', label: { en: 'Issued', ar: 'صادرة' } },
  { key: 'partially_paid', label: { en: 'Partial', ar: 'جزئيًا' } },
  { key: 'paid', label: { en: 'Paid', ar: 'مدفوعة' } },
  { key: 'overpaid', label: { en: 'Overpaid', ar: 'زيادة' } },
  { key: 'cancelled', label: { en: 'Cancelled', ar: 'ملغاة' } },
  { key: 'refunded', label: { en: 'Refunded', ar: 'مستردة' } },
];

export default function Invoices({ lang }: Props) {
  const i18n = t[lang];
  const isRtl = lang === 'ar';
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search
  const handleSearch = (value: string) => {
    setSearchQuery(value);
    const timer = setTimeout(() => setDebouncedSearch(value), 500);
    return () => clearTimeout(timer);
  };

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['invoices', statusFilter, debouncedSearch],
    queryFn: () =>
      invoices.list({
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: debouncedSearch || undefined,
        limit: 50,
      }),
  });

  const rows = data?.items ?? [];

  const formatCurrency = (amount: number) =>
    amount.toLocaleString(lang === 'ar' ? 'ar-SA' : 'en-US', {
      style: 'currency',
      currency: 'SAR',
      maximumFractionDigits: 0,
    });

  return (
    <div className="page-container" style={{ direction: isRtl ? 'rtl' : 'ltr' }}>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1
            style={{
              background: 'linear-gradient(135deg, #f8fafc, #94a3b8)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {i18n.title}
          </h1>
          <p className="text-muted" style={{ fontSize: '0.875rem' }}>
            {data?.total ?? 0} {i18n.subtitle}
          </p>
        </div>
      </div>

      {/* Search bar */}
      <div className="mb-4" style={{ position: 'relative' }}>
        <Search
          size={18}
          style={{
            position: 'absolute',
            left: isRtl ? 'auto' : '0.75rem',
            right: isRtl ? '0.75rem' : 'auto',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-muted)',
            pointerEvents: 'none',
          }}
        />
        <input
          type="text"
          placeholder={i18n.search}
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '0.625rem',
            paddingLeft: isRtl ? '0.75rem' : '2.5rem',
            paddingRight: isRtl ? '2.5rem' : '0.75rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
            background: 'var(--bg-secondary)',
            fontSize: '0.875rem',
          }}
        />
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 mb-4" style={{ flexWrap: 'wrap' }}>
        {STATUSES.map((s) => (
          <button
            key={s.key}
            onClick={() => setStatusFilter(s.key)}
            className="btn"
            style={{
              padding: '0.375rem 0.875rem',
              fontSize: '0.8rem',
              background: statusFilter === s.key ? 'var(--accent-primary)' : 'var(--bg-secondary)',
              color: statusFilter === s.key ? 'white' : 'var(--text-secondary)',
              border: `1px solid ${statusFilter === s.key ? 'transparent' : 'var(--border)'}`,
            }}
          >
            {s.label[lang]}
          </button>
        ))}
        <button
          onClick={() => refetch()}
          className="btn btn-outline"
          style={{ padding: '0.375rem' }}
          title="Refresh"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Table */}
      <div className="table-container">
        {isLoading && (
          <div className="center-content">
            <div className="spinner" />
            <span style={{ marginTop: '0.75rem', fontSize: '0.875rem' }}>{i18n.loading}</span>
          </div>
        )}
        {isError && (
          <div className="center-content" style={{ color: 'var(--error)' }}>
            <span>{i18n.error}</span>
            <button className="btn btn-outline mt-4" onClick={() => refetch()}>
              Retry
            </button>
          </div>
        )}
        {!isLoading && !isError && rows.length === 0 && (
          <div className="center-content">
            <FileText size={40} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
            <span style={{ fontSize: '0.875rem' }}>{i18n.noData}</span>
          </div>
        )}
        {!isLoading && !isError && rows.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>{i18n.invoiceNumber}</th>
                <th>{i18n.customer}</th>
                <th>{i18n.total}</th>
                <th>{i18n.paid}</th>
                <th>{i18n.remaining}</th>
                <th>{i18n.status}</th>
                <th>{i18n.date}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((inv) => (
                <tr key={inv.id}>
                  <td
                    style={{
                      fontFamily: 'monospace',
                      fontWeight: 600,
                      color: 'var(--accent-primary)',
                    }}
                  >
                    {inv.invoiceNumber}
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                      {inv.itemCount} {i18n.items}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{inv.customer.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {inv.customer.phone}
                    </div>
                  </td>
                  <td style={{ fontWeight: 600 }}>{formatCurrency(inv.totalAmount)}</td>
                  <td style={{ color: 'var(--success)' }}>{formatCurrency(inv.paidAmount)}</td>
                  <td style={{ color: inv.remainingAmount > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>
                    {formatCurrency(inv.remainingAmount)}
                  </td>
                  <td>
                    <Badge status={inv.status} lang={lang} />
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    {new Date(inv.createdAt).toLocaleDateString(
                      lang === 'ar' ? 'ar-SA' : 'en-US'
                    )}
                  </td>
                  <td>
                    <Link
                      to={`/invoices/${inv.id}`}
                      className="btn btn-outline"
                      style={{ padding: '0.375rem 0.625rem', fontSize: '0.8rem' }}
                    >
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
