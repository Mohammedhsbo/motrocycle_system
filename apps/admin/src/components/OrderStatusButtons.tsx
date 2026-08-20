import { CheckCircle, XCircle, Loader, Package, Truck, Home } from 'lucide-react';
import type { OrderStatus } from '../api';

interface OrderStatusButtonsProps {
  currentStatus: OrderStatus;
  lang: 'en' | 'ar';
  onTransition: (newStatus: OrderStatus) => void;
  isLoading?: boolean;
}

const TRANSITIONS: Record<
  OrderStatus,
  Array<{
    status: OrderStatus;
    label: { en: string; ar: string };
    icon: React.FC<{ size: number }>;
    variant: 'primary' | 'success' | 'warning' | 'danger';
  }>
> = {
  draft: [
    {
      status: 'confirmed',
      label: { en: 'Confirm Order', ar: 'تأكيد الطلب' },
      icon: CheckCircle,
      variant: 'success',
    },
    {
      status: 'cancelled',
      label: { en: 'Cancel', ar: 'إلغاء' },
      icon: XCircle,
      variant: 'danger',
    },
  ],
  confirmed: [
    {
      status: 'processing',
      label: { en: 'Start Processing', ar: 'بدء المعالجة' },
      icon: Loader,
      variant: 'primary',
    },
    {
      status: 'cancelled',
      label: { en: 'Cancel', ar: 'إلغاء' },
      icon: XCircle,
      variant: 'danger',
    },
  ],
  processing: [
    {
      status: 'awaiting_delivery',
      label: { en: 'Ready for Delivery', ar: 'جاهز للتسليم' },
      icon: Truck,
      variant: 'primary',
    },
    {
      status: 'completed',
      label: { en: 'Complete (Direct)', ar: 'إكمال (مباشر)' },
      icon: CheckCircle,
      variant: 'success',
    },
    {
      status: 'refunded',
      label: { en: 'Refund', ar: 'استرداد' },
      icon: XCircle,
      variant: 'warning',
    },
  ],
  awaiting_delivery: [
    {
      status: 'completed',
      label: { en: 'Mark Delivered', ar: 'تم التسليم' },
      icon: Home,
      variant: 'success',
    },
  ],
  completed: [],
  cancelled: [],
  refunded: [],
};

const variantStyles = {
  primary: {
    background: 'var(--accent-primary)',
    color: 'white',
    border: 'none',
  },
  success: {
    background: '#10b981',
    color: 'white',
    border: 'none',
  },
  warning: {
    background: '#f59e0b',
    color: 'white',
    border: 'none',
  },
  danger: {
    background: '#ef4444',
    color: 'white',
    border: 'none',
  },
};

export default function OrderStatusButtons({
  currentStatus,
  lang,
  onTransition,
  isLoading = false,
}: OrderStatusButtonsProps) {
  const transitions = TRANSITIONS[currentStatus] || [];
  const isRtl = lang === 'ar';

  if (transitions.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        display: 'flex',
        gap: '0.75rem',
        flexWrap: 'wrap',
        direction: isRtl ? 'rtl' : 'ltr',
      }}
    >
      {transitions.map((transition) => {
        const Icon = transition.icon;
        return (
          <button
            key={transition.status}
            onClick={() => onTransition(transition.status)}
            disabled={isLoading}
            className="btn"
            style={{
              ...variantStyles[transition.variant],
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.875rem',
              padding: '0.625rem 1.125rem',
              opacity: isLoading ? 0.6 : 1,
              cursor: isLoading ? 'not-allowed' : 'pointer',
            }}
          >
            <Icon size={16} />
            {transition.label[lang]}
          </button>
        );
      })}
    </div>
  );
}
