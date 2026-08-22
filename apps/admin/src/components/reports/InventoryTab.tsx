import { useQuery } from '@tanstack/react-query';
import { reports, type InventoryStatus } from '../../api';
import { exportToCsv } from './ExportUtils';
import { Download } from 'lucide-react';

interface Props {
  preset: string;
  startDate: string;
  endDate: string;
  branchId: string;
  lang: 'en' | 'ar';
}

export default function InventoryTab({ preset, startDate, endDate, branchId, lang }: Props) {
  const isRtl = lang === 'ar';
  
  const { data: inventory, isLoading: isInvLoading } = useQuery<InventoryStatus>({
    queryKey: ['inventory-status', branchId],
    queryFn: () => reports.getInventoryStatus({ branches: branchId }),
  });

  const { data: movement, isLoading: isMovLoading } = useQuery<any>({
    queryKey: ['inventory-movement', preset, startDate, endDate, branchId],
    queryFn: () => reports.getInventoryMovement({ preset, startDate, endDate, branches: branchId }),
  });

  const formatCurrency = (amount: number) => {
    return Number(amount).toLocaleString('en', {
      style: 'currency',
      currency: 'EGP',
      maximumFractionDigits: 0,
    });
  };

  if (isInvLoading || isMovLoading) return <div>Loading inventory data...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem', gap: '0.5rem' }}>
        <button 
          className="btn btn-secondary" 
          onClick={() => {
            if (inventory?.byStatus) {
              const exportData = inventory.byStatus.map(b => ({
                Status: b.status,
                Count: b.count,
                Value: b.value
              }));
              exportToCsv('inventory_status', exportData);
            }
          }}
        >
          <Download size={16} /> Export Status
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="card">
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Units</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{inventory?.total || 0}</div>
        </div>
        <div className="card">
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Average Age (Days)</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{Math.round(inventory?.averageAge || 0)}</div>
        </div>
        <div className="card">
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Value</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
            {formatCurrency(inventory?.byStatus?.reduce((acc, curr) => acc + curr.value, 0) || 0)}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        <div className="card">
          <h3 style={{ marginBottom: '1rem', fontWeight: 600 }}>Inventory by Status</h3>
          <table style={{ width: '100%', textAlign: isRtl ? 'right' : 'left' }}>
            <thead>
              <tr>
                <th style={{ paddingBottom: '0.5rem', borderBottom: '1px solid var(--border)' }}>Status</th>
                <th style={{ paddingBottom: '0.5rem', borderBottom: '1px solid var(--border)' }}>Units</th>
                <th style={{ paddingBottom: '0.5rem', borderBottom: '1px solid var(--border)' }}>Value</th>
              </tr>
            </thead>
            <tbody>
              {inventory?.byStatus?.map((s, i) => (
                <tr key={i}>
                  <td style={{ paddingTop: '0.5rem', textTransform: 'capitalize' }}>{s.status.replace('_', ' ')}</td>
                  <td style={{ paddingTop: '0.5rem' }}>{s.count}</td>
                  <td style={{ paddingTop: '0.5rem', fontWeight: 600 }}>{formatCurrency(s.value)}</td>
                </tr>
              ))}
              {(!inventory?.byStatus || inventory.byStatus.length === 0) && (
                <tr><td colSpan={3} style={{ textAlign: 'center', paddingTop: '1rem', color: 'var(--text-muted)' }}>No data</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: '1rem', fontWeight: 600 }}>Inventory by Brand</h3>
          <table style={{ width: '100%', textAlign: isRtl ? 'right' : 'left' }}>
            <thead>
              <tr>
                <th style={{ paddingBottom: '0.5rem', borderBottom: '1px solid var(--border)' }}>Brand</th>
                <th style={{ paddingBottom: '0.5rem', borderBottom: '1px solid var(--border)' }}>Units</th>
                <th style={{ paddingBottom: '0.5rem', borderBottom: '1px solid var(--border)' }}>Value</th>
              </tr>
            </thead>
            <tbody>
              {inventory?.byBrand?.map((b, i) => (
                <tr key={i}>
                  <td style={{ paddingTop: '0.5rem' }}>{b.brand}</td>
                  <td style={{ paddingTop: '0.5rem' }}>{b.count}</td>
                  <td style={{ paddingTop: '0.5rem', fontWeight: 600 }}>{formatCurrency(b.value)}</td>
                </tr>
              ))}
              {(!inventory?.byBrand || inventory.byBrand.length === 0) && (
                <tr><td colSpan={3} style={{ textAlign: 'center', paddingTop: '1rem', color: 'var(--text-muted)' }}>No data</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
