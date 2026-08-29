import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { CreditCard, RefreshCw, ChevronRight, Search } from 'lucide-react';
import { payments, type PaymentStatus, type PaymentMethod } from '../api';
import CustomerSearch from '../components/CustomerSearch';
import { useBranch } from '../contexts/BranchContext';
import Badge from '../components/Badge';

interface Props {
  lang: 'en' | 'ar';
}

const t = {
  en: {
    title: 'Payments',
    subtitle: 'payments',
    search: 'Search by payment reference or customer...',
    paymentRef: 'Payment Ref',
    invoice: 'Invoice',
    customer: 'Customer',
    amount: 'Amount',
    method: 'Method',
    status: 'Status',
    date: 'Date',
    view: 'View',
    all: 'All',
    pending: 'Pending',
    completed: 'Completed',
    failed: 'Failed',
    cancelled: 'Cancelled',
    refunded: 'Refunded',
    partially_refunded: 'Partial Refund',
    cash: 'Cash',
    card: 'Card',
    bank_transfer: 'Bank Transfer',
    cheque: 'Cheque',
    noData: 'No payments found.',
    loading: 'Loading…',
    error: 'Failed to load payments.',
  },
  ar: {
    title: 'الدفعات',
    subtitle: 'دفعة',
    search: 'البحث برقم الدفعة أو العميل...',
    paymentRef: 'رقم الدفعة',
    invoice: 'الفاتورة',
    customer: 'العميل',
    amount: 'المبلغ',
    method: 'الطريقة',
    status: 'الحالة',
    date: 'التاريخ',
    view: 'عرض',
    all: 'الكل',
    pending: 'معلقة',
    completed: 'مكتملة',
    failed: 'فشلت',
    cancelled: 'ملغاة',
    refunded: 'مستردة',
    partially_refunded: 'استرداد جزئي',
    cash: 'نقدي',
    card: 'بطاقة',
    bank_transfer: 'تحويل بنكي',
    cheque: 'شيك',
    noData: 'لا توجد دفعات.',
    loading: 'جاري التحميل…',
    error: 'فشل التحميل.',
  },
};

const STATUSES: { key: PaymentStatus | 'all'; label: { en: string; ar: string } }[] = [
  { key: 'all', label: { en: 'All', ar: 'الكل' } },
  { key: 'pending', label: { en: 'Pending', ar: 'معلقة' } },
  { key: 'completed', label: { en: 'Completed', ar: 'مكتملة' } },
  { key: 'failed', label: { en: 'Failed', ar: 'فشلت' } },
  { key: 'cancelled', label: { en: 'Cancelled', ar: 'ملغاة' } },
  { key: 'refunded', label: { en: 'Refunded', ar: 'مستردة' } },
  { key: 'partially_refunded', label: { en: 'Partial Refund', ar: 'استرداد جزئي' } },
];

export default function Payments({ lang }: Props) {
  const i18n = t[lang];
  const isRtl = lang === 'ar';
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const { branchId } = useBranch();
  const [customerId, setCustomerId] = useState<string>();
  const [customerName, setCustomerName] = useState('');
  const [methodFilter, setMethodFilter] = useState<PaymentMethod | 'all'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    const timer = setTimeout(() => setDebouncedSearch(value), 500);
    return () => clearTimeout(timer);
  };

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['payments', statusFilter, debouncedSearch, customerId, methodFilter, branchId, startDate, endDate],
    queryFn: () =>
      payments.list({
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: debouncedSearch || undefined,
        customerId,
        method: methodFilter === 'all' ? undefined : methodFilter,
        // branchId intentionally omitted — the server scopes by the JWT user's
        // own branchId for non-super_admin users; sending it here is a no-op
        // and matches the site-wide decision to not forward hardcoded branchIds.
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        limit: 50,
      }),
  });

  const rows = data?.items ?? [];

  const formatCurrency = (amount: number) =>
    amount.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-EG', {
      style: 'currency',
      currency: 'EGP',
      maximumFractionDigits: 0,
    });

  const getMethodLabel = (method: PaymentMethod) => i18n[method as keyof typeof i18n] as string;

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
      <div className="card mb-4 flex gap-2" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
        <CustomerSearch lang={lang} onSelect={customer => { setCustomerId(customer.id); setCustomerName(customer.name); }} trigger={<button type="button" className="btn btn-outline">{customerName || 'Customer'}</button>} />
        {customerId && <button className="btn btn-outline" onClick={() => { setCustomerId(undefined); setCustomerName(''); }}>Clear customer</button>}
        <select className="input" value={methodFilter} onChange={e => setMethodFilter(e.target.value as PaymentMethod | 'all')}><option value="all">All methods</option>{(['cash', 'card', 'bank_transfer', 'cheque'] as PaymentMethod[]).map(method => <option key={method} value={method}>{method}</option>)}</select>
        <select className="input" value={branchId ?? ''} disabled><option value="">Main Branch</option></select>
        <input className="input" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
        <input className="input" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
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
          title={isRtl ? 'تحديث' : 'Refresh'}
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
            <CreditCard size={40} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
            <span style={{ fontSize: '0.875rem' }}>{i18n.noData}</span>
          </div>
        )}
        {!isLoading && !isError && rows.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>{i18n.paymentRef}</th>
                <th>{i18n.invoice}</th>
                <th>{i18n.customer}</th>
                <th>{i18n.amount}</th>
                <th>{i18n.method}</th>
                <th>{i18n.status}</th>
                <th>{i18n.date}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((payment) => (
                <tr key={payment.id}>
                  <td
                    style={{
                      fontFamily: 'monospace',
                      fontWeight: 600,
                      color: 'var(--accent-primary)',
                    }}
                  >
                    {payment.paymentReference}
                  </td>
                  <td>
                    <Link
                      to={`/invoices/${payment.invoice.id}`}
                      style={{
                        fontFamily: 'monospace',
                        fontSize: '0.875rem',
                        color: 'var(--text-secondary)',
                        textDecoration: 'underline',
                      }}
                    >
                      {payment.invoice.invoiceNumber}
                    </Link>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{payment.customer.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {payment.customer.phone}
                    </div>
                  </td>
                  <td style={{ fontWeight: 600 }}>{formatCurrency(payment.amount)}</td>
                  <td style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    {getMethodLabel(payment.method)}
                  </td>
                  <td>
                    <Badge status={payment.status} lang={lang} />
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    {new Date(payment.createdAt).toLocaleDateString(
                      lang === 'ar' ? 'ar-EG' : 'en-EG'
                    )}
                  </td>
                  <td>
                    <Link
                      to={`/payments/${payment.id}`}
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
