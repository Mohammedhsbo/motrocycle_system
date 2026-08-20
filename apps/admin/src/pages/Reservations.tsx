import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Bookmark, RefreshCw, ChevronRight, Clock } from 'lucide-react';
import { reservations, type ReservationStatus } from '../api';
import Badge from '../components/Badge';
import ReservationSearch, { type SearchFilters } from '../components/ReservationSearch';
import ExpirationAlerts from '../components/ExpirationAlerts';

interface Props {
  lang: 'en' | 'ar';
}

const t = {
  en: {
    title: 'Reservations',
    subtitle: 'motorcycle reservations',
    reservationNumber: 'Reservation #',
    customer: 'Customer',
    motorcycle: 'Motorcycle',
    branch: 'Branch',
    deposit: 'Deposit',
    remaining: 'Remaining',
    status: 'Status',
    expires: 'Expires',
    date: 'Date',
    noData: 'No reservations found.',
    loading: 'Loading…',
    error: 'Failed to load reservations.',
    view: 'View',
    expired: 'Expired',
    expiresIn: 'Expires in',
    days: 'days',
    day: 'day',
    hours: 'hours',
    hour: 'hour',
  },
  ar: {
    title: 'الحجوزات',
    subtitle: 'حجوزات الدراجات',
    reservationNumber: 'رقم الحجز',
    customer: 'العميل',
    motorcycle: 'الدراجة',
    branch: 'الفرع',
    deposit: 'العربون',
    remaining: 'المتبقي',
    status: 'الحالة',
    expires: 'تنتهي',
    date: 'التاريخ',
    noData: 'لا يوجد حجوزات.',
    loading: 'جاري التحميل…',
    error: 'فشل التحميل.',
    view: 'عرض',
    expired: 'منتهي',
    expiresIn: 'تنتهي خلال',
    days: 'أيام',
    day: 'يوم',
    hours: 'ساعات',
    hour: 'ساعة',
  },
};

export default function Reservations({ lang }: Props) {
  const i18n = t[lang];
  const isRtl = lang === 'ar';
  const [filters, setFilters] = useState<SearchFilters>({});
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['reservations', filters, page],
    queryFn: () =>
      reservations.list({
        ...filters,
        page,
        limit,
        sort: 'createdAt',
        order: 'desc',
      }),
  });

  const rows = data?.items ?? [];
  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  const handleSearch = (newFilters: SearchFilters) => {
    setFilters(newFilters);
    setPage(1);
  };

  const handleViewExpiring = () => {
    setFilters({ status: 'active', expiringSoon: true });
    setPage(1);
  };

  const formatCurrency = (amount: number) => {
    return Number(amount).toLocaleString('en', {
      style: 'currency',
      currency: 'SAR',
      maximumFractionDigits: 0,
    });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getExpirationDisplay = (expiresAt?: string) => {
    if (!expiresAt) return null;
    const now = new Date();
    const expires = new Date(expiresAt);
    const diffMs = expires.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMs < 0) {
      return { text: i18n.expired, color: '#dc2626', urgent: true };
    }
    if (diffHours < 48) {
      const hours = Math.floor(diffHours);
      return {
        text: `${i18n.expiresIn} ${hours} ${hours === 1 ? i18n.hour : i18n.hours}`,
        color: '#dc2626',
        urgent: true,
      };
    }
    if (diffDays <= 7) {
      return {
        text: `${i18n.expiresIn} ${diffDays} ${diffDays === 1 ? i18n.day : i18n.days}`,
        color: '#f59e0b',
        urgent: true,
      };
    }
    return {
      text: formatDate(expiresAt),
      color: 'var(--text-muted)',
      urgent: false,
    };
  };

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
        <button onClick={() => refetch()} className="btn btn-outline" title="Refresh">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Expiration Alerts */}
      <ExpirationAlerts lang={lang} onViewAll={handleViewExpiring} />

      {/* Search & Filters */}
      <ReservationSearch lang={lang} onSearch={handleSearch} />

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
            <Bookmark size={40} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
            <span style={{ fontSize: '0.875rem' }}>{i18n.noData}</span>
          </div>
        )}
        {!isLoading && !isError && rows.length > 0 && (
          <>
            <table>
              <thead>
                <tr>
                  <th>{i18n.reservationNumber}</th>
                  <th>{i18n.customer}</th>
                  <th>{i18n.motorcycle}</th>
                  <th>{i18n.branch}</th>
                  <th>{i18n.deposit}</th>
                  <th>{i18n.remaining}</th>
                  <th>{i18n.expires}</th>
                  <th>{i18n.status}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((reservation) => {
                  const expirationDisplay = getExpirationDisplay(reservation.expiresAt);
                  return (
                    <tr key={reservation.id}>
                      <td
                        style={{
                          fontFamily: 'monospace',
                          fontWeight: 600,
                          color: 'var(--accent-primary)',
                        }}
                      >
                        {reservation.reservationNumber}
                      </td>
                      <td>
                        <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                          {reservation.customer.name}
                        </div>
                        <div
                          style={{
                            fontSize: '0.75rem',
                            color: 'var(--text-muted)',
                            fontFamily: 'monospace',
                          }}
                        >
                          {reservation.customer.phone}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                          {lang === 'ar' ? reservation.motorcycle.brand.nameAr : reservation.motorcycle.brand.nameEn}
                        </div>
                        <div
                          style={{
                            fontSize: '0.75rem',
                            color: 'var(--text-muted)',
                            fontFamily: 'monospace',
                          }}
                        >
                          {reservation.motorcycle.vin}
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                        {lang === 'ar' ? reservation.branch.nameAr : reservation.branch.nameEn}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#10b981', fontSize: '0.875rem' }}>
                          {formatCurrency(reservation.depositAmount)}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--accent-primary)', fontSize: '0.875rem' }}>
                          {formatCurrency(reservation.remainingAmount)}
                        </div>
                      </td>
                      <td>
                        {expirationDisplay && (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.375rem',
                              fontSize: '0.8125rem',
                              color: expirationDisplay.color,
                              fontWeight: expirationDisplay.urgent ? 600 : 400,
                            }}
                          >
                            {expirationDisplay.urgent && <Clock size={14} />}
                            {expirationDisplay.text}
                          </div>
                        )}
                      </td>
                      <td>
                        <Badge status={reservation.status as any} lang={lang} />
                      </td>
                      <td>
                        <Link
                          to={`/reservations/${reservation.id}`}
                          className="btn btn-outline"
                          style={{ padding: '0.375rem 0.625rem', fontSize: '0.8rem' }}
                        >
                          {i18n.view} <ChevronRight size={14} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '1.5rem',
                  borderTop: '1px solid var(--border)',
                }}
              >
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn btn-outline"
                  style={{ fontSize: '0.875rem' }}
                >
                  {isRtl ? '→' : '←'}
                </button>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="btn btn-outline"
                  style={{ fontSize: '0.875rem' }}
                >
                  {isRtl ? '←' : '→'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
