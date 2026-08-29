import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, RefreshCw, Trash2, Clock } from 'lucide-react';
import { customerFinancing, type InstallmentDuration } from '../api';
import Modal from '../components/Modal';
import Badge from '../components/Badge';

interface Props { lang: 'en' | 'ar' }
type ModalMode = 'create' | 'edit' | 'delete' | null;

const t = {
  en: {
    title: 'Installment Durations', add: 'Add Duration', search: 'Search durations...',
    months: 'Months', sortOrder: 'Sort Order', active: 'Active',
    actions: 'Actions',
    save: 'Save', cancel: 'Cancel', delete: 'Delete', create: 'Create Duration',
    edit: 'Edit Duration', confirm: 'Delete this duration?', noData: 'No durations found.',
    loading: 'Loading...', error: 'Failed to load durations.', all: 'All', inactive: 'Inactive',
    monthsUnit: 'mo.', retry: 'Retry', monthsRequired: 'Months is required and must be greater than 0.'
  },
  ar: {
    title: 'مدد التقسيط', add: 'إضافة مدة', search: 'بحث في المدد...',
    months: 'الأشهر', sortOrder: 'الترتيب', active: 'نشطة',
    actions: 'الإجراءات',
    save: 'حفظ', cancel: 'إلغاء', delete: 'حذف', create: 'إنشاء مدة',
    edit: 'تعديل المدة', confirm: 'حذف هذه المدة؟', noData: 'لا توجد مدد تقسيط.',
    loading: 'جاري التحميل...', error: 'فشل تحميل المدد.', all: 'الكل', inactive: 'غير نشطة',
    monthsUnit: 'شهر', retry: 'إعادة المحاولة', monthsRequired: 'عدد الأشهر مطلوب ويجب أن يكون أكبر من 0.'
  },
};

const emptyForm = (): Partial<InstallmentDuration> => ({ months: 12, isActive: true, sortOrder: 0 });

export default function InstallmentDurations({ lang }: Props) {
  const i18n = t[lang];
  const isRtl = lang === 'ar';
  const qc = useQueryClient();
  const [isActiveFilter, setIsActiveFilter] = useState<boolean | undefined>(undefined);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selected, setSelected] = useState<InstallmentDuration | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [formError, setFormError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['installment-durations-admin'],
    queryFn: () => customerFinancing.listDurations(),
  });

  const createMut = useMutation({ mutationFn: (data: Partial<InstallmentDuration>) => customerFinancing.createDuration(data), onSuccess: () => { qc.invalidateQueries({ queryKey: ['installment-durations-admin'] }); closeModal(); }, onError: (error: Error) => setFormError(error.message) });
  const updateMut = useMutation({ mutationFn: ({ id, data }: { id: string; data: Partial<InstallmentDuration> }) => customerFinancing.updateDuration(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: ['installment-durations-admin'] }); closeModal(); }, onError: (error: Error) => setFormError(error.message) });
  const deleteMut = useMutation({ mutationFn: (id: string) => customerFinancing.deleteDuration(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['installment-durations-admin'] }); closeModal(); }, onError: (error: Error) => setFormError(error.message) });

  useEffect(() => { if (query.error) setFormError(query.error.message); }, [query.error]);

  function openCreate() { setSelected(null); setForm(emptyForm()); setFormError(null); setModalMode('create'); }
  function openEdit(duration: InstallmentDuration) { setSelected(duration); setForm({ months: duration.months, isActive: duration.isActive, sortOrder: duration.sortOrder ?? 0 }); setFormError(null); setModalMode('edit'); }
  function openDelete(duration: InstallmentDuration) { setSelected(duration); setFormError(null); setModalMode('delete'); }
  function closeModal() { setModalMode(null); setSelected(null); setFormError(null); }

  function submit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    const months = Number(form.months);
    if (!months || months < 1) {
      setFormError(i18n.monthsRequired);
      return;
    }
    const payload = { ...form, months, sortOrder: Number(form.sortOrder) || 0 };
    if (modalMode === 'create')
      createMut.mutate(payload);
    else if (modalMode === 'edit' && selected)
      updateMut.mutate({ id: selected.id, data: payload });
  }

  const rows = (query.data ?? [])
    .filter(d => (isActiveFilter === undefined ? true : d.isActive === isActiveFilter))
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.months - b.months);

  const isBusy = createMut.isPending || updateMut.isPending || deleteMut.isPending;

  return <div className="page-container" style={{ direction: isRtl ? 'rtl' : 'ltr' }}>
    <div className="flex items-center justify-between mb-6"><div><h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}><Clock size={28} />{i18n.title}</h1><p className="text-muted" style={{ fontSize: '0.875rem' }}>{rows.length} {isRtl ? 'مدة' : 'durations'}</p></div><button className="btn btn-primary" onClick={openCreate}><Plus size={16} /> {i18n.add}</button></div>

    <div className="card mb-4" style={{ padding: '0.75rem 1rem' }}><div className="flex items-center gap-2"><select className="input-field" value={isActiveFilter === undefined ? 'all' : String(isActiveFilter)} onChange={event => setIsActiveFilter(event.target.value === 'all' ? undefined : event.target.value === 'true')}><option value="all">{i18n.all}</option><option value="true">{i18n.active}</option><option value="false">{i18n.inactive}</option></select><button onClick={() => query.refetch()} className="btn btn-outline" style={{ padding: '0.375rem' }} title="Refresh"><RefreshCw size={14} /></button></div></div>

    <div className="table-container">{query.isLoading ? <div className="center-content"><div className="spinner" /><span>{i18n.loading}</span></div> : query.isError ? <div className="center-content" style={{ color: 'var(--error)' }}><span>{i18n.error}</span><button className="btn btn-outline mt-4" onClick={() => query.refetch()}>{i18n.retry}</button></div> : rows.length === 0 ? <div className="center-content"><Clock size={40} style={{ opacity: 0.3, marginBottom: '0.75rem' }} /><span>{i18n.noData}</span></div> : <table><thead><tr><th>{i18n.months}</th><th>{i18n.sortOrder}</th><th>{i18n.active}</th><th>{i18n.actions}</th></tr></thead><tbody>{rows.map(d => <tr key={d.id}><td><span style={{ fontWeight: 600 }}>{d.months}</span> <span className="text-muted" style={{ fontSize: '0.85em' }}>{i18n.monthsUnit}</span></td><td>{d.sortOrder}</td><td><Badge status={d.isActive ? 'active' : 'inactive'} lang={lang} /></td><td><div className="flex gap-2"><button className="btn btn-outline" style={{ padding: '0.375rem 0.625rem' }} onClick={() => openEdit(d)} title="Edit"><Pencil size={14} /></button><button className="btn" style={{ padding: '0.375rem 0.625rem', background: 'var(--error-bg)', color: 'var(--error)' }} onClick={() => openDelete(d)} title="Delete"><Trash2 size={14} /></button></div></td></tr>)}</tbody></table>}</div>

    {(modalMode === 'create' || modalMode === 'edit') && <Modal title={modalMode === 'create' ? i18n.create : i18n.edit} onClose={closeModal} footer={<><button className="btn btn-outline" onClick={closeModal} disabled={isBusy}>{i18n.cancel}</button><button className="btn btn-primary" onClick={submit as any} disabled={isBusy}>{isBusy && <span className="spinner" style={{ width: 16, height: 16 }} />}{i18n.save}</button></>}><form onSubmit={submit}>{formError && <div className="login-error" style={{ marginBottom: '1rem' }}>{formError}</div>}<div className="input-group"><label className="input-label">{i18n.months} *</label><input className="input-field" type="number" min="1" step="1" value={form.months} onChange={event => setForm(current => ({ ...current, months: Number(event.target.value) }))} required /></div><div className="input-group"><label className="input-label">{i18n.sortOrder}</label><input className="input-field" type="number" min="0" value={form.sortOrder} onChange={event => setForm(current => ({ ...current, sortOrder: Number(event.target.value) }))} /></div><div className="input-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.75rem', marginTop: '1rem' }}><input type="checkbox" checked={form.isActive} onChange={event => setForm(current => ({ ...current, isActive: event.target.checked }))} /><label className="input-label">{i18n.active}</label></div></form></Modal>}

    {modalMode === 'delete' && selected && <Modal title={i18n.delete} onClose={closeModal} footer={<><button className="btn btn-outline" onClick={closeModal} disabled={isBusy}>{i18n.cancel}</button><button className="btn" style={{ background: 'var(--error)', color: 'white' }} onClick={() => deleteMut.mutate(selected.id)} disabled={isBusy}>{i18n.delete}</button></>}><div>{formError && <div className="login-error" style={{ marginBottom: '1rem' }}>{formError}</div>}<p>{i18n.confirm}</p><p style={{ fontWeight: 600, marginTop: '0.5rem' }}>{selected.months} {i18n.monthsUnit}</p></div></Modal>}
  </div>;
}
