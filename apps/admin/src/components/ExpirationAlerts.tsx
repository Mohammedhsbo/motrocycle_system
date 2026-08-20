import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Clock } from 'lucide-react';
import { reservations } from '../api';

interface ExpirationAlertsProps {
  lang: 'en' | 'ar';
  onViewAll?: () => void;
}

export default function ExpirationAlerts({ lang, onViewAll }: ExpirationAlertsProps) {
  const isRtl = lang === 'ar';

  const { data } = useQuery({
    queryKey: ['reservations', 'expiring-soon'],
    queryFn: () =>
      reservations.list({
        status: 'active',
        expiringSoon: true,
        limit: 100,
      }),
    refetchInterval: 60000, // Refetch every minute
  });

  const count = data?.total ?? 0;

  if (count === 0) {
    return null;
  }

  return (
    <div
      className="card"
      style={{
        padding: '1rem',
        marginBottom: '1.5rem',
        backgroundColor: '#fef3c7',
        borderColor: '#fbbf24',
        direction: isRtl ? 'rtl' : 'ltr',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
        }}
      >
        <AlertCircle size={24} style={{ color: '#d97706', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#92400e' }}>
            {isRtl ? 'حجوزات تنتهي قريباً' : 'Expiring Soon'}
          </div>
          <div style={{ fontSize: '0.8125rem', color: '#78350f', marginTop: '0.125rem' }}>
            <strong>{count}</strong> {count === 1 ? (isRtl ? 'حجز' : 'reservation') : (isRtl ? 'حجوزات' : 'reservations')}{' '}
            {isRtl ? 'تنتهي خلال 48 ساعة' : 'expiring within 48 hours'}
          </div>
        </div>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="btn btn-outline"
            style={{
              fontSize: '0.8125rem',
              backgroundColor: '#fff',
              borderColor: '#fbbf24',
              color: '#92400e',
            }}
          >
            <Clock size={14} />
            {isRtl ? 'عرض الكل' : 'View All'}
          </button>
        )}
      </div>
    </div>
  );
}
