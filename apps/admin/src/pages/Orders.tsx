import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ShoppingBag, RefreshCw, ChevronRight } from 'lucide-react';
import { orders, type OrderStatus } from '../api';
import Badge from '../components/Badge';
import OrderSearch, { type SearchFilters } from '../components/OrderSearch';

interface Props {
  lang: 'en' | 'ar';
}

const t = {
  en: {
    title: 'Orders',
    subtitle: 'sales orders',
    orderNumber: 'Order #',
    customer: 'Customer',
    branch: 'Branch',
    items: 'Items',
    amount: 'Amount',
    status: 'Status',
    date: 'Date',
    noData: 'No orders found.',
    loading: 'Loading…',
    error: 'Failed to load orders.',
    view: 'View',
    item: 'item',
    itemsPlural: 'items',
  },
  ar: {
    title: 'الطلبات',
    subtitle: 'طلبات البيع',
    orderNumber: 'رقم الطلب',
    customer: 'العميل',
    branch: 'الفرع',
    items: 'العناصر',
    amount: 'المبلغ',
    status: 'الحالة',
    date: 'التاريخ',
    noData: 'لا يوجد طلبات.',
    loading: 'جاري التحميل…',
    error: 'فشل التحميل.',
    view: 'عرض',
    item: 'عنصر',
    itemsPlural: 'عناصر',
  },
};

export default function Orders({ lang }: Props) {
  const i18n = t[lang];
  const isRtl = lang === 'ar';
  const [filters, setFilters] = useState<SearchFilters>({});
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['orders', filters, page],
    queryFn: () =>
      orders.list({
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

  const formatCurrency = (amount: number) => {
    return Number(amount).toLocaleString('en', {
      style: 'currency',
      currency: 'EGP',
      maximumFractionDigits: 0,
    });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
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

      {/* Search & Filters */}
      <OrderSearch lang={lang} onSearch={handleSearch} />

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
            <ShoppingBag size={40} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
            <span style={{ fontSize: '0.875rem' }}>{i18n.noData}</span>
          </div>
        )}
        {!isLoading && !isError && rows.length > 0 && (
          <>
            <table>
              <thead>
                <tr>
                  <th>{i18n.orderNumber}</th>
                  <th>{i18n.customer}</th>
                  <th>{i18n.branch}</th>
                  <th>{i18n.items}</th>
                  <th>{i18n.amount}</th>
                  <th>{i18n.status}</th>
                  <th>{i18n.date}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((order) => (
                  <tr key={order.id}>
                    <td
                      style={{
                        fontFamily: 'monospace',
                        fontWeight: 600,
                        color: 'var(--accent-primary)',
                      }}
                    >
                      {order.orderNumber}
                    </td>
                    <td>
                      <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                        {order.customer.name}
                      </div>
                      <div
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--text-muted)',
                          fontFamily: 'monospace',
                        }}
                      >
                        {order.customer.phone}
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                      {lang === 'ar' ? order.branch.nameAr : order.branch.nameEn}
                    </td>
                    <td style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                      {order.itemCount} {order.itemCount === 1 ? i18n.item : i18n.itemsPlural}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {formatCurrency(order.netAmount)}
                      </div>
                      {order.discount > 0 && (
                        <div
                          style={{
                            fontSize: '0.75rem',
                            color: 'var(--text-muted)',
                            textDecoration: 'line-through',
                          }}
                        >
                          {formatCurrency(order.totalAmount)}
                        </div>
                      )}
                    </td>
                    <td>
                      <Badge status={order.status as any} lang={lang} />
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {formatDate(order.createdAt)}
                    </td>
                    <td>
                      <Link
                        to={`/orders/${order.id}`}
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
