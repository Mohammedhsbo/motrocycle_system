import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bike, Edit3, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getUser, motorcycles, pos, type MotorcycleInput, type MotorcycleSearchResult } from '../api';

type Lang = 'en' | 'ar';
const statuses = ['available', 'reserved', 'sold', 'maintenance'] as const;

export default function Inventory({ lang, branchId }: { lang: Lang; branchId?: string }) {
  const isRtl = lang === 'ar';
  const qc = useQueryClient();
  const navigate = useNavigate();
  const canManage = getUser()?.role.name === 'super_admin';
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const list = useQuery({ queryKey: ['desktop-inventory', query, branchId], queryFn: () => pos.searchMotorcycles(query, branchId, 50), enabled: query.length === 0 || query.length >= 2 });
  const changeStatus = useMutation({ mutationFn: ({ id, status }: { id: string; status: string }) => motorcycles.updateStatus(id, status), onSuccess: () => void qc.invalidateQueries({ queryKey: ['desktop-inventory'] }), onError: (err: Error) => setError(err.message) });
  const remove = useMutation({ mutationFn: motorcycles.remove, onSuccess: () => void qc.invalidateQueries({ queryKey: ['desktop-inventory'] }), onError: (err: Error) => setError(err.message) });
  const data = list.data || [];
  const money = (value: number) => `${value.toLocaleString(isRtl ? 'ar-EG' : 'en-EG', { maximumFractionDigits: 0 })} ${isRtl ? 'ج.م' : 'EGP'}`;
  return <section className="desktop-page" dir={isRtl ? 'rtl' : 'ltr'}>
    <div className="page-heading"><div><span className="eyebrow">{isRtl ? 'المخزون الحي' : 'Live inventory'}</span><h1>{isRtl ? 'المخزون' : 'Inventory'}</h1><p>{isRtl ? 'الوحدات المتاحة في نطاق الفرع الحالي.' : 'Available units within the current branch scope.'}</p></div><div className="report-controls"><button className="secondary-action" onClick={() => list.refetch()}><RefreshCw size={16} /> {isRtl ? 'تحديث' : 'Refresh'}</button>{canManage && <button className="primary-action" onClick={() => navigate('/inventory/new')}><Plus size={16} /> {isRtl ? 'دراجة جديدة' : 'New motorcycle'}</button>}</div></div>
    <div className="toolbar"><div className="search-box"><Search size={17} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder={isRtl ? 'ابحث بالموديل أو رقم الهيكل...' : 'Search model or VIN...'} /></div><span className="result-count">{data.length} {isRtl ? 'وحدة' : 'units'}</span></div>
    {error && <div className="state-panel" role="alert">{error}</div>}{list.isLoading && <div className="inventory-grid">{[1, 2, 3, 4].map(item => <div className="inventory-card skeleton" key={item} />)}</div>}{list.isError && <div className="state-panel">{isRtl ? 'تعذر تحميل المخزون.' : 'Could not load inventory.'}</div>}{!list.isLoading && !list.isError && data.length === 0 && <div className="state-panel">{isRtl ? 'لا توجد وحدات متاحة.' : 'No available units found.'}</div>}{!list.isLoading && !list.isError && <div className="inventory-grid">{data.map(item => <article className="inventory-card" key={item.id}><div className="inventory-image">{item.images?.[0] ? <img src={item.images[0]} alt="" /> : <Bike size={38} />}</div><div className="inventory-info"><span className="inventory-brand">{isRtl ? item.brand?.nameAr ?? '' : item.brand?.nameEn ?? ''}</span><h2>{item.model}</h2><p>{item.year} · {item.color || (isRtl ? 'بدون لون' : 'No color')}</p><code title={item.vin}>{item.vin}</code><div className="inventory-footer"><strong>{money(item.price)}</strong><span className="status-pill">{item.status}</span></div>{canManage && <div className="row-actions"><button className="icon-button" title="Edit" disabled={!item?.id} onClick={() => navigate(`/inventory/${item.id}/edit`)}><Edit3 size={15} /></button><select className="pos-input" value={item.status} onChange={event => changeStatus.mutate({ id: item.id, status: event.target.value })}>{statuses.map(status => <option key={status} value={status}>{status}</option>)}</select><button className="icon-button" title="Delete" onClick={() => { if (window.confirm(isRtl ? 'حذف هذه الدراجة؟' : 'Delete this motorcycle?')) remove.mutate(item.id); }}><Trash2 size={15} /></button></div>}</div></article>)}</div>}
  </section>;
}
