import { useQuery } from '@tanstack/react-query';
import { ShoppingCart, CreditCard, Calendar, TrendingUp } from 'lucide-react';
import { customers, type CustomerSummary as CustomerSummaryType } from '../api';

interface Props {
  customerId: string;
  lang: 'en' | 'ar';
}

const t = {
  en: {
    title: 'Customer Summary',
    loading: 'Loading…',
    error: 'Failed to load summary',
    totalOrders: 'Total Orders',
    completedOrders: 'Completed',
    cancelledOrders: 'Cancelled',
    totalSpent: 'Total Spent',
    totalPaid: 'Total Paid',
    outstanding: 'Outstanding',
    activeReservations: 'Active Reservations',
    expiredReservations: 'Expired',
    activeInstallments: 'Active Installments',
    overdueInstallments: 'Overdue',
    lastOrder: 'Last Order',
    lastPayment: 'Last Payment',
    never: 'Never',
  },
  ar: {
    title: 'ملخص العميل',
    loading: 'جاري التحميل…',
    error: 'فشل تحميل الملخص',
    totalOrders: 'إجمالي الطلبات',
    completedOrders: 'المكتملة',
    cancelledOrders: 'الملغاة',
    totalSpent: 'إجمالي المصروفات',
    totalPaid: 'إجمالي المدفوعات',
    outstanding: 'المتبقي',
    activeReservations: 'الحجوزات النشطة',
    expiredReservations: 'المنتهية',
    activeInstallments: 'خطط التقسيط النشطة',
    overdueInstallments: 'المتأخرة',
    lastOrder: 'آخر طلب',
    lastPayment: 'آخر دفعة',
    never: 'لم يتم',
  },
};

export default function CustomerSummary({ customerId, lang }: Props) {
  const i18n = t[lang];
  const isRtl = lang === 'ar';

  const { data: summary, isLoading, isError } = useQuery({
    queryKey: ['customerSummary', customerId],
    queryFn: () => customers.getSummary(customerId),
  });

  if (isLoading) {
    return (
      <div className="card">
        <h2 style={{ fontSize: '1rem', marginBottom: '1rem' }}>{i18n.title}</h2>
        <div className="center-content" style={{ padding: '2rem 0' }}>
          <div className="spinner" />
          <span style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>{i18n.loading}</span>
        </div>
      </div>
    );
  }

  if (isError || !summary) {
    return (
      <div className="card">
        <h2 style={{ fontSize: '1rem', marginBottom: '1rem' }}>{i18n.title}</h2>
        <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--error)', fontSize: '0.875rem' }}>
          {i18n.error}
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number) =>
    amount.toLocaleString('en', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 });

  const formatDate = (date?: string) =>
    date ? new Date(date).toLocaleDateString(isRtl ? 'ar-EG' : 'en-EG') : i18n.never;

  return (
    <div className="card" style={{ direction: isRtl ? 'rtl' : 'ltr' }}>
      <h2 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <TrendingUp size={18} style={{ color: 'var(--accent-primary)' }} />
        {i18n.title}
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {/* Orders */}
        <div style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
          <div className="flex items-center gap-2 mb-2">
            <ShoppingCart size={16} style={{ color: 'var(--accent-primary)' }} />
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {i18n.totalOrders}
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{summary.totalOrders}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            {i18n.completedOrders}: {summary.completedOrders} · {i18n.cancelledOrders}: {summary.cancelledOrders}
          </div>
        </div>

        {/* Financial */}
        <div style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
          <div className="flex items-center gap-2 mb-2">
            <CreditCard size={16} style={{ color: 'var(--success)' }} />
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {i18n.totalSpent}
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success)' }}>{formatCurrency(summary.totalSpent)}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            {i18n.totalPaid}: {formatCurrency(summary.totalPaid)}
          </div>
          {summary.outstandingBalance > 0 && (
            <div style={{ fontSize: '0.75rem', color: 'var(--error)', marginTop: '0.25rem', fontWeight: 600 }}>
              {i18n.outstanding}: {formatCurrency(summary.outstandingBalance)}
            </div>
          )}
        </div>
      </div>

      {/* Reservations & Installments */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
        <div style={{ padding: '0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{i18n.activeReservations}</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>
            {summary.activeReservations}
            {summary.expiredReservations > 0 && (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                ({i18n.expiredReservations}: {summary.expiredReservations})
              </span>
            )}
          </div>
        </div>

        <div style={{ padding: '0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{i18n.activeInstallments}</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>
            {summary.activeInstallmentPlans}
            {summary.overdueInstallments > 0 && (
              <span style={{ fontSize: '0.75rem', color: 'var(--error)', marginLeft: '0.5rem', fontWeight: 700 }}>
                ({i18n.overdueInstallments}: {summary.overdueInstallments})
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Last activity */}
      <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-secondary)', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
        <div className="flex items-center gap-1">
          <Calendar size={12} />
          {i18n.lastOrder}: <span style={{ fontWeight: 600 }}>{formatDate(summary.lastOrderDate)}</span>
        </div>
        <div className="flex items-center gap-1">
          <Calendar size={12} />
          {i18n.lastPayment}: <span style={{ fontWeight: 600 }}>{formatDate(summary.lastPaymentDate)}</span>
        </div>
      </div>
    </div>
  );
}
