import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, User, MapPin, Bike, AlertCircle, Clock, History } from 'lucide-react';
import { reservations } from '../api';
import Badge from '../components/Badge';
import ReservationActions from '../components/ReservationActions';

interface Props {
  lang: 'en' | 'ar';
}

const t = {
  en: {
    backToReservations: 'Back to Reservations',
    loading: 'Loading reservation...',
    error: 'Failed to load reservation.',
    notFound: 'Reservation not found.',
    reservationDetails: 'Reservation Details',
    reservationNumber: 'Reservation Number',
    createdOn: 'Created On',
    status: 'Status',
    source: 'Source',
    ecommerce: 'E-commerce',
    pos: 'POS',
    customer: 'Customer',
    phone: 'Phone',
    email: 'Email',
    address: 'Address',
    motorcycle: 'Motorcycle',
    vin: 'VIN',
    model: 'Model',
    year: 'Year',
    color: 'Color',
    brand: 'Brand',
    currentStatus: 'Current Status',
    branch: 'Branch',
    createdBy: 'Created By',
    pricingSnapshot: 'Pricing (At Reservation Time)',
    basePrice: 'Base Price',
    vat: 'VAT',
    discount: 'Discount',
    totalPrice: 'Total Price',
    paymentSummary: 'Payment Summary',
    depositPaid: 'Deposit Paid',
    remainingAmount: 'Remaining Amount',
    expiration: 'Expiration',
    expiresAt: 'Expires At',
    expired: 'Expired',
    expiresIn: 'Expires in',
    daysUntilExpiry: 'Days Until Expiry',
    notes: 'Notes',
    noNotes: 'No notes',
    convertedOrder: 'Converted to Order',
    orderNumber: 'Order Number',
    viewOrder: 'View Order',
    cancelReason: 'Cancellation Reason',
    statusHistory: 'Status History',
    action: 'Action',
    before: 'Before',
    after: 'After',
    changedBy: 'Changed By',
    reason: 'Reason',
    at: 'at',
    day: 'day',
    days: 'days',
    hour: 'hour',
    hours: 'hours',
    noHistory: 'No history available',
    actions: 'Actions',
  },
  ar: {
    backToReservations: 'العودة إلى الحجوزات',
    loading: 'جاري تحميل الحجز...',
    error: 'فشل تحميل الحجز.',
    notFound: 'الحجز غير موجود.',
    reservationDetails: 'تفاصيل الحجز',
    reservationNumber: 'رقم الحجز',
    createdOn: 'تم الإنشاء في',
    status: 'الحالة',
    source: 'المصدر',
    ecommerce: 'التجارة الإلكترونية',
    pos: 'نقطة البيع',
    customer: 'العميل',
    phone: 'الهاتف',
    email: 'البريد الإلكتروني',
    address: 'العنوان',
    motorcycle: 'الدراجة',
    vin: 'رقم الهيكل',
    model: 'الموديل',
    year: 'السنة',
    color: 'اللون',
    brand: 'العلامة التجارية',
    currentStatus: 'الحالة الحالية',
    branch: 'الفرع',
    createdBy: 'أنشأه',
    pricingSnapshot: 'التسعير (عند وقت الحجز)',
    basePrice: 'السعر الأساسي',
    vat: 'ضريبة القيمة المضافة',
    discount: 'الخصم',
    totalPrice: 'السعر الإجمالي',
    paymentSummary: 'ملخص الدفع',
    depositPaid: 'العربون المدفوع',
    remainingAmount: 'المبلغ المتبقي',
    expiration: 'انتهاء الصلاحية',
    expiresAt: 'تنتهي في',
    expired: 'منتهي',
    expiresIn: 'تنتهي خلال',
    daysUntilExpiry: 'الأيام حتى انتهاء الصلاحية',
    notes: 'ملاحظات',
    noNotes: 'لا توجد ملاحظات',
    convertedOrder: 'تم التحويل إلى طلب',
    orderNumber: 'رقم الطلب',
    viewOrder: 'عرض الطلب',
    cancelReason: 'سبب الإلغاء',
    statusHistory: 'سجل الحالة',
    action: 'الإجراء',
    before: 'قبل',
    after: 'بعد',
    changedBy: 'تم التغيير بواسطة',
    reason: 'السبب',
    at: 'في',
    day: 'يوم',
    days: 'أيام',
    hour: 'ساعة',
    hours: 'ساعات',
    noHistory: 'لا يوجد سجل',
    actions: 'الإجراءات',
  },
};

export default function ReservationDetail({ lang }: Props) {
  const { id } = useParams<{ id: string }>();
  const i18n = t[lang];
  const isRtl = lang === 'ar';

  const { data: reservation, isLoading, isError } = useQuery({
    queryKey: ['reservation', id],
    queryFn: () => reservations.get(id!),
    enabled: !!id,
  });

  const { data: history } = useQuery({
    queryKey: ['reservation-history', id],
    queryFn: () => reservations.getHistory(id!),
    enabled: !!id,
  });

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
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getExpirationDisplay = () => {
    if (!reservation?.expiresAt) return null;
    const now = new Date();
    const expires = new Date(reservation.expiresAt);
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
    return null;
  };

  if (isLoading) {
    return (
      <div className="page-container" style={{ direction: isRtl ? 'rtl' : 'ltr' }}>
        <div className="center-content">
          <div className="spinner" />
          <span style={{ marginTop: '0.75rem', fontSize: '0.875rem' }}>{i18n.loading}</span>
        </div>
      </div>
    );
  }

  if (isError || !reservation) {
    return (
      <div className="page-container" style={{ direction: isRtl ? 'rtl' : 'ltr' }}>
        <div className="center-content" style={{ color: 'var(--error)' }}>
          <AlertCircle size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
          <span>{i18n.error}</span>
        </div>
      </div>
    );
  }

  const expirationDisplay = getExpirationDisplay();

  return (
    <div className="page-container" style={{ direction: isRtl ? 'rtl' : 'ltr' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Link to="/reservations" className="btn btn-outline" style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>
          <ArrowLeft size={16} />
          {i18n.backToReservations}
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 style={{ marginBottom: '0.5rem' }}>{i18n.reservationDetails}</h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              {i18n.reservationNumber}: <strong style={{ fontFamily: 'monospace', color: 'var(--accent-primary)' }}>{reservation.reservationNumber}</strong>
            </p>
          </div>
          <Badge status={reservation.status as any} lang={lang} />
        </div>
      </div>

      {/* Expiration Alert */}
      {expirationDisplay && (
        <div
          className="card"
          style={{
            padding: '1rem',
            marginBottom: '1.5rem',
            backgroundColor: expirationDisplay.urgent ? '#fef3c7' : 'var(--bg-muted)',
            borderColor: expirationDisplay.color,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Clock size={24} style={{ color: expirationDisplay.color }} />
            <div>
              <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: expirationDisplay.color }}>
                {expirationDisplay.text}
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>
                {formatDate(reservation.expiresAt!)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      {reservation.status === 'active' && (
        <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '0.9375rem', fontWeight: 600 }}>{i18n.actions}</h3>
          <ReservationActions lang={lang} reservation={reservation} />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {/* Customer Info */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <User size={18} style={{ color: 'var(--accent-primary)' }} />
            <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600 }}>{i18n.customer}</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{i18n.customer}</div>
              <div style={{ fontWeight: 500 }}>{reservation.customer.name}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{i18n.phone}</div>
              <div style={{ fontFamily: 'monospace' }}>{reservation.customer.phone}</div>
            </div>
            {reservation.customer.email && (
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{i18n.email}</div>
                <div style={{ fontSize: '0.875rem' }}>{reservation.customer.email}</div>
              </div>
            )}
            {reservation.customer.defaultAddress && (
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{i18n.address}</div>
                <div style={{ fontSize: '0.875rem' }}>
                  {reservation.customer.defaultAddress.addressLine}
                  {reservation.customer.defaultAddress.city && `, ${reservation.customer.defaultAddress.city}`}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Motorcycle Info */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Bike size={18} style={{ color: 'var(--accent-primary)' }} />
            <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600 }}>{i18n.motorcycle}</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{i18n.brand}</div>
              <div style={{ fontWeight: 500 }}>{lang === 'ar' ? reservation.motorcycle.brand.nameAr : reservation.motorcycle.brand.nameEn}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{i18n.model}</div>
              <div>{reservation.motorcycle.model}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{i18n.year}</div>
                <div>{reservation.motorcycle.year}</div>
              </div>
              {reservation.motorcycle.color && (
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{i18n.color}</div>
                  <div>{reservation.motorcycle.color}</div>
                </div>
              )}
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{i18n.vin}</div>
              <div style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>{reservation.motorcycle.vin}</div>
            </div>
          </div>
        </div>

        {/* Pricing & Payment */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '0.9375rem', fontWeight: 600 }}>{i18n.paymentSummary}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{i18n.totalPrice}</span>
              <span style={{ fontWeight: 600 }}>{formatCurrency(reservation.totalPrice)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{i18n.depositPaid}</span>
              <span style={{ fontWeight: 600, color: '#10b981' }}>{formatCurrency(reservation.depositAmount)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.9375rem', fontWeight: 600 }}>{i18n.remainingAmount}</span>
              <span style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--accent-primary)' }}>{formatCurrency(reservation.remainingAmount)}</span>
            </div>
          </div>
        </div>

        {/* Other Details */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '0.9375rem', fontWeight: 600 }}>{i18n.reservationDetails}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{i18n.branch}</div>
              <div>{lang === 'ar' ? reservation.branch.nameAr : reservation.branch.nameEn}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{i18n.source}</div>
              <div>{reservation.source === 'ecommerce' ? i18n.ecommerce : i18n.pos}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{i18n.createdBy}</div>
              <div>{reservation.user.name}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{i18n.createdOn}</div>
              <div style={{ fontSize: '0.875rem' }}>{formatDate(reservation.createdAt)}</div>
            </div>
            {reservation.expiresAt && (
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{i18n.expiresAt}</div>
                <div style={{ fontSize: '0.875rem', color: expirationDisplay?.color || 'inherit' }}>
                  {formatDate(reservation.expiresAt)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Converted Order */}
      {reservation.convertedOrder && (
        <div className="card" style={{ padding: '1.25rem', marginTop: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '0.9375rem', fontWeight: 600 }}>{i18n.convertedOrder}</h3>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{i18n.orderNumber}</div>
              <div style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--accent-primary)' }}>{reservation.convertedOrder.orderNumber}</div>
            </div>
            <Link to={`/orders/${reservation.convertedOrder.id}`} className="btn btn-primary" style={{ fontSize: '0.875rem' }}>
              {i18n.viewOrder}
            </Link>
          </div>
        </div>
      )}

      {/* Notes */}
      {(reservation.notes || reservation.cancelReason) && (
        <div className="card" style={{ padding: '1.25rem', marginTop: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '0.9375rem', fontWeight: 600 }}>
            {reservation.cancelReason ? i18n.cancelReason : i18n.notes}
          </h3>
          <p style={{ margin: 0, whiteSpace: 'pre-wrap', color: 'var(--text-secondary)' }}>
            {reservation.cancelReason || reservation.notes}
          </p>
        </div>
      )}

      {/* Status History */}
      {history && history.length > 0 && (
        <div className="card" style={{ padding: '1.25rem', marginTop: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <History size={18} style={{ color: 'var(--accent-primary)' }} />
            <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600 }}>{i18n.statusHistory}</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {history.map((entry) => (
              <div key={entry.id} style={{ paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 500 }}>{entry.action}</span>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    {formatDate(entry.createdAt)}
                  </span>
                </div>
                {entry.before?.status && entry.after.status && (
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.375rem' }}>
                    {entry.before.status} → {entry.after.status}
                  </div>
                )}
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  {i18n.changedBy}: {entry.user.name}
                </div>
                {entry.reason && (
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.375rem', fontStyle: 'italic' }}>
                    {i18n.reason}: {entry.reason}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
