import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Search, ShoppingBag } from 'lucide-react';
import { orders, type OrderListItem, type OrderStatus } from '../api';

type Lang = 'en' | 'ar';

const T = {
  en: {
    title: 'Orders',
    search: 'Search orders...',
    all: 'All',
    draft: 'Draft',
    confirmed: 'Confirmed',
    processing: 'Processing',
    awaiting: 'Awaiting',
    completed: 'Completed',
    cancelled: 'Cancelled',
    noOrders: 'No orders found',
    loading: 'Loading...',
    customer: 'Customer',
    items: 'items',
    item: 'item',
  },
  ar: {
    title: 'الطلبات',
    search: 'البحث في الطلبات...',
    all: 'الكل',
    draft: 'مسودة',
    confirmed: 'مؤكد',
    processing: 'قيد المعالجة',
    awaiting: 'في الانتظار',
    completed: 'مكتمل',
    cancelled: 'ملغي',
    noOrders: 'لا توجد طلبات',
    loading: 'جاري التحميل...',
    customer: 'العميل',
    items: 'عناصر',
    item: 'عنصر',
  },
};

const statusLabels: Record<OrderStatus | 'all', { en: string; ar: string }> = {
  all: { en: 'All', ar: 'الكل' },
  draft: { en: 'Draft', ar: 'مسودة' },
  confirmed: { en: 'Confirmed', ar: 'مؤكد' },
  processing: { en: 'Processing', ar: 'قيد المعالجة' },
  awaiting_delivery: { en: 'Awaiting', ar: 'في الانتظار' },
  completed: { en: 'Completed', ar: 'مكتمل' },
  cancelled: { en: 'Cancelled', ar: 'ملغي' },
  refunded: { en: 'Refunded', ar: 'مسترد' },
};

interface Props {
  lang: Lang;
}

export default function OrdersPOS({ lang }: Props) {
  const t = T[lang];
  const isRtl = lang === 'ar';
  const navigate = useNavigate();

  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['orders', statusFilter],
    queryFn: () =>
      orders.list({
        status: statusFilter === 'all' ? undefined : statusFilter,
        limit: 100,
      }),
  });

  const ordersList = data?.items ?? [];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-EG', {
      style: 'currency',
      currency: 'EGP',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-EG', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleOrderClick = (orderId: string) => {
    navigate(`/orders/${orderId}`);
  };

  return (
    <div className="pos-body" style={{ direction: isRtl ? 'rtl' : 'ltr' }}>
      {/* Left panel - order list */}
      <div className="pos-list-panel">
        {/* Panel header */}
        <div className="panel-header">
          <ShoppingBag size={18} style={{ color: 'var(--blue-light)' }} />
          <span className="panel-title">{t.title}</span>
          <span
            style={{
              marginLeft: 'auto',
              fontSize: '0.75rem',
              color: 'var(--text-3)',
            }}
          >
            {ordersList.length}
          </span>
        </div>

        {/* Status filters */}
        <div
          style={{
            padding: '0.75rem',
            borderBottom: '1px solid var(--pos-border)',
            display: 'flex',
            gap: '0.375rem',
            flexWrap: 'wrap',
          }}
        >
          {(['all', 'draft', 'confirmed', 'processing', 'awaiting_delivery', 'completed', 'cancelled'] as const).map(
            (status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className="badge"
                style={{
                  cursor: 'pointer',
                  opacity: statusFilter === status ? 1 : 0.5,
                  transform: statusFilter === status ? 'scale(1.05)' : 'scale(1)',
                  transition: 'var(--transition)',
                }}
              >
                {statusLabels[status][lang]}
              </button>
            )
          )}
        </div>

        {/* Order list */}
        <div className="po-list">
          {isLoading && (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-3)' }}>
              {t.loading}
            </div>
          )}
          {!isLoading && ordersList.length === 0 && (
            <div
              style={{
                textAlign: 'center',
                padding: '2rem',
                color: 'var(--text-3)',
              }}
            >
              <ShoppingBag size={40} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
              <div style={{ fontSize: '0.875rem' }}>{t.noOrders}</div>
            </div>
          )}
          {!isLoading &&
            ordersList.map((order) => (
              <div
                key={order.id}
                className={`po-card ${selectedOrderId === order.id ? 'selected' : ''}`}
                onClick={() => handleOrderClick(order.id)}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'start',
                    marginBottom: '0.5rem',
                  }}
                >
                  <div className="po-number">{order.orderNumber}</div>
                  <span className={`badge badge-${order.status}`}>
                    {statusLabels[order.status][lang]}
                  </span>
                </div>
                <div className="po-supplier">
                  {t.customer}: {order.customer.name}
                </div>
                <div
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-3)',
                    fontFamily: 'monospace',
                    marginTop: '0.25rem',
                  }}
                >
                  {order.customer.phone}
                </div>
                <div className="po-meta">
                  <span className="po-items-count">
                    {order.itemCount} {order.itemCount === 1 ? t.item : t.items}
                  </span>
                  <span
                    style={{
                      fontSize: '0.875rem',
                      fontWeight: 700,
                      color: 'var(--blue-light)',
                      fontFamily: 'monospace',
                    }}
                  >
                    {formatCurrency(order.netAmount)}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: '0.7rem',
                    color: 'var(--text-3)',
                    marginTop: '0.5rem',
                  }}
                >
                  {formatDate(order.createdAt)}
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Right panel - placeholder */}
      <div className="pos-detail-panel">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: 'var(--text-3)',
            fontSize: '0.875rem',
          }}
        >
          {isRtl ? 'اختر طلباً لعرض التفاصيل' : 'Select an order to view details'}
        </div>
      </div>
    </div>
  );
}
