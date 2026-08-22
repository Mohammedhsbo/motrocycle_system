import { useQuery } from '@tanstack/react-query';
import { reports, type AgingReport } from '../../api';
import { exportToCsv } from './ExportUtils';
import { Download } from 'lucide-react';

interface Props {
  preset: string;
  startDate: string;
  endDate: string;
  branchId: string;
  lang: 'en' | 'ar';
}

export default function FinancialsTab({ preset, startDate, endDate, branchId, lang }: Props) {
  const isRtl = lang === 'ar';
  
  const { data: revenue, isLoading: isRevLoading } = useQuery<any>({
    queryKey: ['revenue-collection', preset, startDate, endDate, branchId],
    queryFn: () => reports.getRevenueCollection({ preset, startDate, endDate, branches: branchId }),
  });

  const { data: aging, isLoading: isAgingLoading } = useQuery<AgingReport>({
    queryKey: ['aging-report', branchId],
    queryFn: () => reports.getAgingReport({ branches: branchId }),
  });

  const formatCurrency = (amount: number) => {
    return Number(amount).toLocaleString('en', {
      style: 'currency',
      currency: 'EGP',
      maximumFractionDigits: 0,
    });
  };

  if (isRevLoading || isAgingLoading) return <div>Loading financials...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem', gap: '0.5rem' }}>
        <button 
          className="btn btn-secondary" 
          onClick={() => {
            if (aging?.buckets) {
              const exportData = aging.buckets.map(b => ({
                Bucket: b.label,
                Amount: b.amount,
                Count: b.count
              }));
              exportToCsv('aging_summary', exportData);
            }
          }}
        >
          <Download size={16} /> Export Aging
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="card">
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Gross Revenue</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{formatCurrency(revenue?.summary?.grossRevenue || 0)}</div>
        </div>
        <div className="card">
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Net Revenue</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-primary)' }}>{formatCurrency(revenue?.summary?.netRevenue || 0)}</div>
        </div>
        <div className="card">
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Collected Amount</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981' }}>{formatCurrency(revenue?.summary?.collectedAmount || 0)}</div>
        </div>
        <div className="card">
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Outstanding</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ef4444' }}>{formatCurrency(revenue?.summary?.outstandingAmount || 0)}</div>
        </div>
      </div>

      {aging && (
        <div className="card">
          <h3 style={{ marginBottom: '1rem', fontWeight: 600 }}>Accounts Receivable Aging</h3>
          <table style={{ width: '100%', textAlign: isRtl ? 'right' : 'left' }}>
            <thead>
              <tr>
                <th style={{ paddingBottom: '0.5rem', borderBottom: '1px solid var(--border)' }}>Bucket</th>
                <th style={{ paddingBottom: '0.5rem', borderBottom: '1px solid var(--border)' }}>Days</th>
                <th style={{ paddingBottom: '0.5rem', borderBottom: '1px solid var(--border)' }}>Invoices</th>
                <th style={{ paddingBottom: '0.5rem', borderBottom: '1px solid var(--border)' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {aging.buckets?.map((b, i) => (
                <tr key={i}>
                  <td style={{ paddingTop: '0.5rem', fontWeight: 500 }}>{b.label}</td>
                  <td style={{ paddingTop: '0.5rem', color: 'var(--text-muted)' }}>{b.days}</td>
                  <td style={{ paddingTop: '0.5rem' }}>{b.count}</td>
                  <td style={{ paddingTop: '0.5rem', fontWeight: 600, color: i > 2 ? '#ef4444' : 'inherit' }}>
                    {formatCurrency(b.amount)}
                  </td>
                </tr>
              ))}
              {(!aging.buckets || aging.buckets.length === 0) && (
                <tr><td colSpan={4} style={{ textAlign: 'center', paddingTop: '1rem', color: 'var(--text-muted)' }}>No aging data</td></tr>
              )}
            </tbody>
            {aging.buckets && aging.buckets.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={3} style={{ paddingTop: '1rem', fontWeight: 700 }}>Total</td>
                  <td style={{ paddingTop: '1rem', fontWeight: 700 }}>{formatCurrency(aging.total)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  );
}
