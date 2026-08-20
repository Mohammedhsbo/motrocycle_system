import { useQuery } from '@tanstack/react-query';
import { reports, type SalesSummary } from '../../api';
import { exportToCsv } from './ExportUtils';
import { Download } from 'lucide-react';

interface Props {
  preset: string;
  startDate: string;
  endDate: string;
  branchId: string;
  lang: 'en' | 'ar';
}

export default function SalesTab({ preset, startDate, endDate, branchId, lang }: Props) {
  const isRtl = lang === 'ar';
  
  const { data: sales, isLoading, isError } = useQuery<SalesSummary>({
    queryKey: ['sales-summary', preset, startDate, endDate, branchId],
    queryFn: () => reports.getSalesSummary({ preset, startDate, endDate, branches: branchId }),
  });

  const formatCurrency = (amount: number) => {
    return Number(amount).toLocaleString('en', {
      style: 'currency',
      currency: 'SAR',
      maximumFractionDigits: 0,
    });
  };

  if (isLoading) return <div>Loading sales data...</div>;
  if (isError || !sales) return <div style={{ color: 'var(--error)' }}>Failed to load sales data.</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <button 
          className="btn btn-secondary" 
          onClick={() => {
            const data = sales.trends.map(t => ({
              Period: t.period,
              Amount: t.amount,
              Count: t.count
            }));
            exportToCsv('sales_trends', data);
          }}
        >
          <Download size={16} /> Export Trends
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="card">
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Sales</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{formatCurrency(sales.totalSales)}</div>
        </div>
        <div className="card">
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Order Count</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{sales.orderCount}</div>
        </div>
        <div className="card">
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Avg Order Value</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{formatCurrency(sales.averageOrderValue)}</div>
        </div>
        <div className="card">
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Cancelled Orders</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{sales.cancelledCount}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        <div className="card">
          <h3 style={{ marginBottom: '1rem', fontWeight: 600 }}>Sales by Payment Method</h3>
          <table style={{ width: '100%', textAlign: isRtl ? 'right' : 'left' }}>
            <thead>
              <tr>
                <th style={{ paddingBottom: '0.5rem', borderBottom: '1px solid var(--border)' }}>Method</th>
                <th style={{ paddingBottom: '0.5rem', borderBottom: '1px solid var(--border)' }}>Count</th>
                <th style={{ paddingBottom: '0.5rem', borderBottom: '1px solid var(--border)' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {sales.byPaymentMethod?.map((m, i) => (
                <tr key={i}>
                  <td style={{ paddingTop: '0.5rem' }}>{m.method}</td>
                  <td style={{ paddingTop: '0.5rem' }}>{m.count}</td>
                  <td style={{ paddingTop: '0.5rem', fontWeight: 600 }}>{formatCurrency(m.amount)}</td>
                </tr>
              ))}
              {(!sales.byPaymentMethod || sales.byPaymentMethod.length === 0) && (
                <tr><td colSpan={3} style={{ textAlign: 'center', paddingTop: '1rem', color: 'var(--text-muted)' }}>No data</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: '1rem', fontWeight: 600 }}>Sales by Branch</h3>
          <table style={{ width: '100%', textAlign: isRtl ? 'right' : 'left' }}>
            <thead>
              <tr>
                <th style={{ paddingBottom: '0.5rem', borderBottom: '1px solid var(--border)' }}>Branch</th>
                <th style={{ paddingBottom: '0.5rem', borderBottom: '1px solid var(--border)' }}>Count</th>
                <th style={{ paddingBottom: '0.5rem', borderBottom: '1px solid var(--border)' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {sales.byBranch?.map((b, i) => (
                <tr key={i}>
                  <td style={{ paddingTop: '0.5rem' }}>{b.branchName || b.branchId}</td>
                  <td style={{ paddingTop: '0.5rem' }}>{b.count}</td>
                  <td style={{ paddingTop: '0.5rem', fontWeight: 600 }}>{formatCurrency(b.amount)}</td>
                </tr>
              ))}
              {(!sales.byBranch || sales.byBranch.length === 0) && (
                <tr><td colSpan={3} style={{ textAlign: 'center', paddingTop: '1rem', color: 'var(--text-muted)' }}>No data</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
