import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRightLeft, ChevronRight, Plus, RefreshCw } from 'lucide-react';
import { transfers, type TransferDetail, type TransferStatus } from '../api';
import { useBranch } from '../contexts/BranchContext';
import Badge from '../components/Badge';

interface Props { lang: 'en' | 'ar' }

const statuses: Array<TransferStatus | 'all'> = ['all', 'initiated', 'in_transit', 'received', 'cancelled'];

export default function Transfers({ lang }: Props) {
  const isRtl = lang === 'ar';
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { branches, branchId } = useBranch();
  const [status, setStatus] = useState<TransferStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(id ?? null);
  const [sourceBranchId, setSourceBranchId] = useState('');
  const [destinationBranchId, setDestinationBranchId] = useState('');

  const list = useQuery({
    queryKey: ['transfers', status, search, branchId, sourceBranchId, destinationBranchId, dateFrom, dateTo],
    queryFn: () => transfers.list({
      status: status === 'all' ? undefined : status,
      search: search || undefined,
      fromBranchId: sourceBranchId || branchId || undefined,
      toBranchId: destinationBranchId || undefined,
      startDate: dateFrom || undefined,
      endDate: dateTo || undefined,
      limit: 50,
    }),
  });
  const detail = useQuery({ queryKey: ['transfer', selectedId], queryFn: () => transfers.get(selectedId!), enabled: !!selectedId });

  const transition = useMutation({
    mutationFn: ({ action, id }: { action: 'ship' | 'receive' | 'cancel'; id: string }) => transfers[action](id),
    onSuccess: (_value, variables) => {
      queryClient.invalidateQueries({ queryKey: ['transfer', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      queryClient.invalidateQueries({ queryKey: ['motorcycles'] });
    },
  });

  const rows = list.data?.items ?? [];
  const branchName = (id?: string) => branches.find(branch => branch.id === id)?.[isRtl ? 'nameAr' : 'nameEn'] ?? id ?? '—';
  const labels: Record<string, string> = isRtl ? { all: 'الكل', initiated: 'مُنشأ', in_transit: 'قيد النقل', received: 'مستلم', cancelled: 'ملغى' } : { all: 'All', initiated: 'Initiated', in_transit: 'In transit', received: 'Received', cancelled: 'Cancelled' };

  return <div className="page-container" style={{ direction: isRtl ? 'rtl' : 'ltr' }}>
    <div className="flex items-center justify-between mb-6"><div><h1 style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}><ArrowRightLeft size={30} />{isRtl ? 'تحويلات المخزون' : 'Stock Transfers'}</h1><p className="text-muted">{list.data?.total ?? 0} {isRtl ? 'تحويل' : 'transfers'}</p></div><button className="btn btn-primary" onClick={() => navigate('/transfers/new')}><Plus size={16} />{isRtl ? 'تحويل جديد' : 'New Transfer'}</button></div>
    <div className="card mb-4" style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap', alignItems: 'center' }}><input className="input" placeholder={isRtl ? 'ابحث برقم التحويل' : 'Search transfer number'} value={search} onChange={event => setSearch(event.target.value)} /><select className="input" value={status} onChange={event => setStatus(event.target.value as TransferStatus | 'all')}>{statuses.map(value => <option key={value} value={value}>{labels[value]}</option>)}</select><select className="input" value={sourceBranchId} onChange={event => setSourceBranchId(event.target.value)}><option value="">{isRtl ? 'كل المصادر' : 'All sources'}</option>{branches.map(branch => <option key={branch.id} value={branch.id}>{branchName(branch.id)}</option>)}</select><select className="input" value={destinationBranchId} onChange={event => setDestinationBranchId(event.target.value)}><option value="">{isRtl ? 'كل الوجهات' : 'All destinations'}</option>{branches.map(branch => <option key={branch.id} value={branch.id}>{branchName(branch.id)}</option>)}</select><input className="input" type="date" value={dateFrom} onChange={event => setDateFrom(event.target.value)} /><input className="input" type="date" value={dateTo} onChange={event => setDateTo(event.target.value)} /><button className="btn btn-outline" onClick={() => list.refetch()} title={isRtl ? 'تحديث' : 'Refresh'}><RefreshCw size={15} /></button></div>
    <div className="table-container">{list.isLoading ? <div className="center-content"><div className="spinner" />{isRtl ? 'جاري تحميل التحويلات...' : 'Loading transfers...'}</div> : list.isError ? <div className="center-content" style={{ color: 'var(--error)' }}>{isRtl ? 'فشل تحميل التحويلات.' : 'Failed to load transfers.'}</div> : rows.length === 0 ? <div className="center-content"><ArrowRightLeft size={40} style={{ opacity: .3 }} />{isRtl ? 'لا توجد تحويلات.' : 'No transfers found.'}</div> : <table><thead><tr><th>{isRtl ? 'التحويل' : 'Transfer'}</th><th>{isRtl ? 'المصدر' : 'Source'}</th><th>{isRtl ? 'الوجهة' : 'Destination'}</th><th>{isRtl ? 'الدراجات' : 'Motorcycles'}</th><th>{isRtl ? 'الحالة' : 'Status'}</th><th>{isRtl ? 'تاريخ الإنشاء' : 'Created'}</th><th /></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{row.transferNumber}</td><td>{row.fromBranch[isRtl ? 'nameAr' : 'nameEn']}</td><td>{row.toBranch[isRtl ? 'nameAr' : 'nameEn']}</td><td>{row.motorcycleCount}</td><td><Badge status={row.status} lang={lang} /></td><td>{new Date(row.createdAt).toLocaleDateString(isRtl ? 'ar-EG' : 'en-EG')}</td><td><button className="btn btn-outline" onClick={() => setSelectedId(row.id)}>{isRtl ? 'عرض' : 'View'}<ChevronRight size={14} /></button></td></tr>)}</tbody></table>}</div>
    {selectedId && <TransferDrawer detail={detail.data} loading={detail.isLoading} error={detail.isError} lang={lang} onClose={() => setSelectedId(null)} onTransition={(action) => { if (action === 'cancel' && !window.confirm(isRtl ? 'إلغاء هذا التحويل؟' : 'Cancel this transfer?')) return; transition.mutate({ action, id: selectedId }); }} pending={transition.isPending} />}
  </div>;
}

function TransferDrawer({ detail, loading, error, lang, onClose, onTransition, pending }: { detail?: TransferDetail; loading: boolean; error: boolean; lang: 'en' | 'ar'; onClose: () => void; onTransition: (action: 'ship' | 'receive' | 'cancel') => void; pending: boolean }) {
  const isRtl = lang === 'ar';
  return <div className="drawer-backdrop" onClick={onClose}><aside className="detail-drawer" onClick={event => event.stopPropagation()}><button className="drawer-close" onClick={onClose}>×</button>{loading ? <div className="state-panel">Loading transfer...</div> : error || !detail ? <div className="state-panel">Failed to load transfer.</div> : <><span className="eyebrow">{detail.transferNumber}</span><h2>{isRtl ? 'تفاصيل التحويل' : 'Transfer details'}</h2><div className="detail-summary"><span>{isRtl ? 'المصدر' : 'Source'}<strong>{isRtl ? detail.fromBranch.nameAr : detail.fromBranch.nameEn}</strong></span><span>{isRtl ? 'الوجهة' : 'Destination'}<strong>{isRtl ? detail.toBranch.nameAr : detail.toBranch.nameEn}</strong></span><span>{isRtl ? 'الحالة' : 'Status'}<strong><Badge status={detail.status} lang={lang} /></strong></span></div><p className="text-muted">{detail.notes || (isRtl ? 'لا توجد ملاحظات.' : 'No notes.')}</p><h3>{isRtl ? 'الدراجات' : 'Motorcycles'} ({detail.motorcycles.length})</h3><div className="schedule-list">{detail.motorcycles.map(motorcycle => <div className="schedule-row" key={motorcycle.id}><span><strong>{motorcycle.brand.nameEn} {motorcycle.model}</strong><small>{motorcycle.vin}</small></span><small>{motorcycle.currentStatus}</small></div>)}</div><div className="flex gap-2" style={{ marginTop: '1rem', flexWrap: 'wrap' }}>{detail.status === 'initiated' && <><button className="btn btn-primary" disabled={pending} onClick={() => onTransition('ship')}>{isRtl ? 'شحن' : 'Ship'}</button><button className="btn btn-outline" disabled={pending} onClick={() => onTransition('cancel')}>{isRtl ? 'إلغاء' : 'Cancel'}</button></>}{detail.status === 'in_transit' && <button className="btn btn-primary" disabled={pending} onClick={() => onTransition('receive')}>{isRtl ? 'استلام' : 'Receive'}</button>}</div></>}</aside></div>;
}
