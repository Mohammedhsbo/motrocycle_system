import { useQuery } from '@tanstack/react-query';
import { reports, type ExecutiveDashboard } from '../../api';
import { TrendingUp, DollarSign, Package, Users, CreditCard, BarChart3, Download } from 'lucide-react';
import { exportToCsv } from './ExportUtils';

interface Props {
  preset: string;
  startDate: string;
  endDate: string;
  branchId?: string;
  lang: 'en' | 'ar';
}

export default function ExecutiveTab({ preset, startDate, endDate, branchId, lang }: Props) {
  const isRtl = lang === 'ar';
  
  const { data: dashboard, isLoading, isError } = useQuery<ExecutiveDashboard>({
    queryKey: ['executive-dashboard', preset, startDate, endDate, branchId],
    queryFn: () => reports.getExecutiveDashboard({ preset, startDate, endDate, branches: branchId }),
    refetchInterval: 60000,
  });

  const formatCurrency = (amount: number) => {
    return Number(amount).toLocaleString('en', {
      style: 'currency',
      currency: 'EGP',
      maximumFractionDigits: 0,
    });
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  if (isLoading) {
    return (
      <div className="center-content">
        <div className="spinner" />
        <span style={{ marginTop: '0.75rem' }}>{isRtl ? 'جاري التحميل...' : 'Loading...'}</span>
      </div>
    );
  }

  if (isError || !dashboard) {
    return (
      <div className="center-content" style={{ color: 'var(--error)' }}>
        <span>{isRtl ? 'فشل تحميل لوحة التحكم' : 'Failed to load dashboard'}</span>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <button 
          className="btn btn-secondary" 
          onClick={() => {
            const data = dashboard.sales.topMotorcycles.map(m => ({
              Brand: m.brand,
              Model: m.model,
              Count: m.count,
              Revenue: m.revenue
            }));
            exportToCsv('top_motorcycles', data);
          }}
        >
          <Download size={16} /> {isRtl ? 'تصدير أبرز الطرازات' : 'Export Top Models'}
        </button>
      </div>

      {/* Sales Metrics */}
      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1rem', fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <TrendingUp size={20} style={{ color: 'var(--accent-primary)' }} />
          {isRtl ? 'المبيعات' : 'Sales'}
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div className="card">
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>{isRtl ? 'إجمالي الإيرادات' : 'Total Revenue'}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
              {formatCurrency(dashboard.sales.totalRevenue)}
            </div>
            <div style={{ fontSize: '0.75rem', color: dashboard.sales.growth >= 0 ? '#10b981' : '#ef4444', marginTop: '0.25rem' }}>
              {formatPercent(dashboard.sales.growth)} Growth
            </div>
          </div>
          <div className="card">
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Orders</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{dashboard.sales.orderCount}</div>
          </div>
          <div className="card">
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>{isRtl ? 'متوسط قيمة الطلب' : 'Avg Order Value'}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{formatCurrency(dashboard.sales.averageOrderValue)}</div>
          </div>
        </div>
      </div>

      {/* Revenue Metrics */}
      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1rem', fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <DollarSign size={20} style={{ color: '#10b981' }} />
          {isRtl ? 'الإيرادات' : 'Revenue'}
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div className="card">
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>{isRtl ? 'إجمالي الإيرادات' : 'Gross Revenue'}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{formatCurrency(dashboard.revenue.grossRevenue)}</div>
          </div>
          <div className="card">
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Collected</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981' }}>{formatCurrency(dashboard.revenue.collectedAmount)}</div>
          </div>
          <div className="card">
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>{isRtl ? 'المبلغ المستحق' : 'Outstanding'}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f59e0b' }}>{formatCurrency(dashboard.revenue.outstandingAmount)}</div>
          </div>
          <div className="card">
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>{isRtl ? 'صافي الإيرادات' : 'Net Revenue'}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-primary)' }}>{formatCurrency(dashboard.revenue.netRevenue)}</div>
          </div>
        </div>
      </div>

      {/* Top Motorcycles */}
      {dashboard.sales.topMotorcycles && dashboard.sales.topMotorcycles.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BarChart3 size={20} style={{ color: 'var(--accent-primary)' }} />
            {isRtl ? 'أبرز الدراجات' : 'Top Motorcycles'}
          </h3>
          <div className="card">
            <table style={{ width: '100%', textAlign: isRtl ? 'right' : 'left' }}>
              <thead>
                <tr>
                  <th style={{ paddingBottom: '0.5rem', borderBottom: '1px solid var(--border)' }}>Brand</th>
                  <th style={{ paddingBottom: '0.5rem', borderBottom: '1px solid var(--border)' }}>Model</th>
                  <th style={{ paddingBottom: '0.5rem', borderBottom: '1px solid var(--border)' }}>Units Sold</th>
                  <th style={{ paddingBottom: '0.5rem', borderBottom: '1px solid var(--border)' }}>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.sales.topMotorcycles.slice(0, 5).map((moto, idx) => (
                  <tr key={idx}>
                    <td style={{ paddingTop: '0.5rem', fontWeight: 500 }}>{moto.brand}</td>
                    <td style={{ paddingTop: '0.5rem' }}>{moto.model}</td>
                    <td style={{ paddingTop: '0.5rem', fontFamily: 'monospace' }}>{moto.count}</td>
                    <td style={{ paddingTop: '0.5rem', fontWeight: 600, color: 'var(--accent-primary)' }}>
                      {formatCurrency(moto.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
