import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Plus } from 'lucide-react';
import { motorcycles, transfers, type Branch, type CreateTransferInput, type MotorcycleListItem } from '../api';
import { useBranch } from '../contexts/BranchContext';

interface Props { lang: 'en' | 'ar' }

export default function TransferCreate({ lang }: Props) {
  const isRtl = lang === 'ar';
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { branches, branchId } = useBranch();
  const [sourceBranchId, setSourceBranchId] = useState(branchId ?? '');
  const [destinationBranchId, setDestinationBranchId] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const motorcycleQuery = useQuery({
    queryKey: ['transfer-motorcycles', sourceBranchId, search],
    queryFn: () => motorcycles.list({ branchId: sourceBranchId, status: 'available', search: search || undefined, limit: 100 }),
    enabled: !!sourceBranchId,
  });
  const availableMotorcycles = (motorcycleQuery.data?.items ?? []).filter(item => item.status === 'available' && item.branchId === sourceBranchId);

  const createMutation = useMutation({
    mutationFn: (data: CreateTransferInput) => transfers.create(data),
    onSuccess: transfer => {
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      queryClient.invalidateQueries({ queryKey: ['motorcycles'] });
      navigate(`/transfers/${transfer.id}`);
    },
    onError: (reason: Error) => setError(reason.message),
  });

  function toggleMotorcycle(id: string) {
    setSelectedIds(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!sourceBranchId || !destinationBranchId) return setError(isRtl ? 'اختر فرعي المصدر والوجهة.' : 'Select source and destination branches.');
    if (sourceBranchId === destinationBranchId) return setError(isRtl ? 'يجب أن يختلف فرع الوجهة عن المصدر.' : 'Destination branch must differ from source branch.');
    if (selectedIds.length === 0) return setError(isRtl ? 'اختر دراجة واحدة على الأقل.' : 'Select at least one motorcycle.');
    createMutation.mutate({ fromBranchId: sourceBranchId, toBranchId: destinationBranchId, motorcycleIds: selectedIds, notes: notes.trim() || undefined });
  }

  const branchName = (branch: Branch) => isRtl ? branch.nameAr : branch.nameEn;
  return <div className="page-container" style={{ direction: isRtl ? 'rtl' : 'ltr', maxWidth: 900 }}>
    <div className="flex items-center gap-4 mb-6"><button className="btn btn-outline" onClick={() => navigate('/transfers')}><ArrowLeft size={18} /></button><h1 style={{ margin: 0 }}>{isRtl ? 'إنشاء تحويل مخزون' : 'Create Stock Transfer'}</h1></div>
    <form onSubmit={submit}>
      {error && <div className="login-error" style={{ marginBottom: '1rem' }}>{error}</div>}
      <div className="card mb-4"><h2 style={{ fontSize: '1rem' }}>{isRtl ? 'الفروع' : 'Branches'}</h2><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}><label className="input-group"><span className="input-label">{isRtl ? 'فرع المصدر' : 'Source branch'}</span><select className="input" value={sourceBranchId} onChange={event => { setSourceBranchId(event.target.value); setSelectedIds([]); }}><option value="">{isRtl ? 'اختر المصدر' : 'Select source'}</option>{branches.map(branch => <option key={branch.id} value={branch.id}>{branchName(branch)}</option>)}</select></label><label className="input-group"><span className="input-label">{isRtl ? 'فرع الوجهة' : 'Destination branch'}</span><select className="input" value={destinationBranchId} onChange={event => setDestinationBranchId(event.target.value)}><option value="">{isRtl ? 'اختر الوجهة' : 'Select destination'}</option>{branches.filter(branch => branch.id !== sourceBranchId).map(branch => <option key={branch.id} value={branch.id}>{branchName(branch)}</option>)}</select></label></div></div>
      <div className="card mb-4"><div className="flex items-center justify-between"><h2 style={{ fontSize: '1rem', margin: 0 }}>{isRtl ? 'الدراجات المتاحة' : 'Available motorcycles'}</h2><span className="text-muted">{selectedIds.length} selected</span></div><input className="input" placeholder={isRtl ? 'ابحث بالموديل أو رقم الهيكل' : 'Search model or VIN'} value={search} onChange={event => setSearch(event.target.value)} style={{ margin: '1rem 0' }} />{!sourceBranchId ? <p className="text-muted">{isRtl ? 'اختر فرع المصدر أولاً.' : 'Select a source branch first.'}</p> : motorcycleQuery.isLoading ? <div className="center-content">Loading available motorcycles...</div> : motorcycleQuery.isError ? <div className="center-content" style={{ color: 'var(--error)' }}>Failed to load motorcycles.</div> : availableMotorcycles.length === 0 ? <div className="center-content">No available motorcycles in this source branch.</div> : <div style={{ display: 'grid', gap: '.5rem' }}>{availableMotorcycles.map(motorcycle => <MotorcycleOption key={motorcycle.id} motorcycle={motorcycle} selected={selectedIds.includes(motorcycle.id)} onToggle={() => toggleMotorcycle(motorcycle.id)} lang={lang} />)}</div>}</div>
      <div className="card mb-4"><label className="input-group"><span className="input-label">{isRtl ? 'ملاحظات' : 'Notes'}</span><textarea className="input" rows={3} value={notes} onChange={event => setNotes(event.target.value)} /></label></div>
      <button className="btn btn-primary" type="submit" disabled={createMutation.isPending}><Plus size={16} />{createMutation.isPending ? 'Saving...' : 'Create Transfer'}</button>
    </form>
  </div>;
}

function MotorcycleOption({ motorcycle, selected, onToggle, lang }: { motorcycle: MotorcycleListItem; selected: boolean; onToggle: () => void; lang: 'en' | 'ar' }) {
  return <button type="button" onClick={onToggle} className="card" style={{ display: 'flex', alignItems: 'center', gap: '.75rem', textAlign: 'left', border: selected ? '1px solid var(--accent-primary)' : '1px solid var(--border)', background: selected ? 'rgba(59,130,246,.1)' : 'transparent' }}><span style={{ width: 24, height: 24, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)', background: selected ? 'var(--accent-primary)' : 'transparent', color: 'white' }}>{selected && <Check size={16} />}</span><span><strong>{motorcycle.brand ? (lang === 'ar' ? motorcycle.brand.nameAr : motorcycle.brand.nameEn) : ''} {motorcycle.model}</strong><small style={{ display: 'block', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{motorcycle.vin} · {motorcycle.year}</small></span></button>;
}
