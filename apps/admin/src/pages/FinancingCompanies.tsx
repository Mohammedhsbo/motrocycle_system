import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, RefreshCw, Search, Trash2, Building2 } from 'lucide-react';
import { customerFinancing, type FinancingCompany } from '../api';
import Modal from '../components/Modal';
import Badge from '../components/Badge';

interface Props { lang: 'en' | 'ar' }
type ModalMode = 'create' | 'edit' | 'delete' | null;

const t = {
  en: {
    title: 'Financing Companies', add: 'Add Company', search: 'Search companies...',
    name: 'Name', whatsappNumber: 'WhatsApp number', sortOrder: 'Sort Order', active: 'Active',
    actions: 'Actions',
    save: 'Save', cancel: 'Cancel', delete: 'Delete', create: 'Create Company',
    edit: 'Edit Company', confirm: 'Delete this company?', noData: 'No companies found.',
    loading: 'Loading...', error: 'Failed to load companies.', all: 'All', inactive: 'Inactive',
    retry: 'Retry', nameRequired: 'Name is required.', whatsappRequired: 'WhatsApp number is required.', invalidWhatsApp: 'WhatsApp number must be a valid phone number.'
  },
  ar: {
    title: 'شركات التمويل', add: 'إضافة شركة', search: 'بحث في الشركات...',
    name: 'الاسم', whatsappNumber: 'رقم واتساب', sortOrder: 'الترتيب', active: 'نشطة',
    actions: 'الإجراءات',
    save: 'حفظ', cancel: 'إلغاء', delete: 'حذف', create: 'إنشاء شركة',
    edit: 'تعديل الشركة', confirm: 'حذف هذه الشركة؟', noData: 'لا توجد شركات.',
    loading: 'جاري التحميل...', error: 'فشل تحميل الشركات.', all: 'الكل', inactive: 'غير نشطة',
    retry: 'إعادة المحاولة', nameRequired: 'الاسم مطلوب.', whatsappRequired: 'رقم واتساب مطلوب.', invalidWhatsApp: 'رقم واتساب غير صحيح.'
  },
};

const whatsappPattern = /^\+?[0-9\s-]{8,20}$/;
const emptyForm = (): Partial<FinancingCompany> => ({ name: '', whatsappNumber: '', isActive: true, sortOrder: 0 });

export default function FinancingCompanies({ lang }: Props) {
  const i18n = t[lang];
  const isRtl = lang === 'ar';
  const qc = useQueryClient();
  const [isActiveFilter, setIsActiveFilter] = useState<boolean | undefined>(undefined);
  const [search, setSearch] = useState('');
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selected, setSelected] = useState<FinancingCompany | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [formError, setFormError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['financing-companies'],
    queryFn: () => customerFinancing.listCompanies(),
  });
  
  const createMut = useMutation({ mutationFn: (data: Partial<FinancingCompany>) => customerFinancing.createCompany(data), onSuccess: () => { qc.invalidateQueries({ queryKey: ['financing-companies'] }); closeModal(); }, onError: (error: Error) => setFormError(error.message) });
  const updateMut = useMutation({ mutationFn: ({ id, data }: { id: string; data: Partial<FinancingCompany> }) => customerFinancing.updateCompany(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: ['financing-companies'] }); closeModal(); }, onError: (error: Error) => setFormError(error.message) });
  const deleteMut = useMutation({ mutationFn: (id: string) => customerFinancing.deleteCompany(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['financing-companies'] }); closeModal(); }, onError: (error: Error) => setFormError(error.message) });

  useEffect(() => { if (query.error) setFormError(query.error.message); }, [query.error]);
  
  function openCreate() { setSelected(null); setForm(emptyForm()); setFormError(null); setModalMode('create'); }
  function openEdit(company: FinancingCompany) { setSelected(company); setForm({ name: company.name, whatsappNumber: company.whatsappNumber ?? '', isActive: company.isActive, sortOrder: company.sortOrder ?? 0 }); setFormError(null); setModalMode('edit'); }
  function openDelete(company: FinancingCompany) { setSelected(company); setFormError(null); setModalMode('delete'); }
  function closeModal() { setModalMode(null); setSelected(null); setFormError(null); }
  
  function submit(event: FormEvent) { 
    event.preventDefault(); 
    setFormError(null); 
    if (!form.name?.trim()) { 
      setFormError(i18n.nameRequired); 
      return; 
    }
    const trimmedWhatsapp = form.whatsappNumber?.trim() ?? '';
    if (!trimmedWhatsapp) {
      setFormError(i18n.whatsappRequired);
      return;
    }
    if (!whatsappPattern.test(trimmedWhatsapp)) {
      setFormError(i18n.invalidWhatsApp);
      return;
    }
    const payload = { ...form, whatsappNumber: trimmedWhatsapp, sortOrder: Number(form.sortOrder) || 0 };
    if (modalMode === 'create') 
      createMut.mutate(payload); 
    else if (modalMode === 'edit' && selected) 
      updateMut.mutate({ id: selected.id, data: payload }); 
  }

  const rows = (query.data ?? [])
    .filter(c => (isActiveFilter === undefined ? true : c.isActive === isActiveFilter))
    .filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
    
  const isBusy = createMut.isPending || updateMut.isPending || deleteMut.isPending;

  return <div className="page-container" style={{ direction: isRtl ? 'rtl' : 'ltr' }}>
    <div className="flex items-center justify-between mb-6"><div><h1>{i18n.title}</h1><p className="text-muted" style={{ fontSize: '0.875rem' }}>{rows.length} {isRtl ? 'شركة' : 'companies'}</p></div><button className="btn btn-primary" onClick={openCreate}><Plus size={16} /> {i18n.add}</button></div>
    <div className="card mb-4" style={{ padding: '0.75rem 1rem' }}><div className="flex items-center gap-2"><Search size={16} style={{ color: 'var(--text-muted)' }} /><input className="input-field" style={{ flex: 1, border: 'none', background: 'transparent', padding: '0.25rem 0' }} placeholder={i18n.search} value={search} onChange={event => setSearch(event.target.value)} /><select className="input-field" value={isActiveFilter === undefined ? 'all' : String(isActiveFilter)} onChange={event => setIsActiveFilter(event.target.value === 'all' ? undefined : event.target.value === 'true')}><option value="all">{i18n.all}</option><option value="true">{i18n.active}</option><option value="false">{i18n.inactive}</option></select><button onClick={() => query.refetch()} className="btn btn-outline" style={{ padding: '0.375rem' }} title="Refresh"><RefreshCw size={14} /></button></div></div>
    <div className="table-container">{query.isLoading ? <div className="center-content"><div className="spinner" /><span>{i18n.loading}</span></div> : query.isError ? <div className="center-content" style={{ color: 'var(--error)' }}><span>{i18n.error}</span><button className="btn btn-outline mt-4" onClick={() => query.refetch()}>{i18n.retry}</button></div> : rows.length === 0 ? <div className="center-content"><Building2 size={40} style={{ opacity: 0.3, marginBottom: '0.75rem' }} /><span>{i18n.noData}</span></div> : <table><thead><tr><th>{i18n.name}</th><th>{i18n.whatsappNumber}</th><th>{i18n.sortOrder}</th><th>{i18n.active}</th><th>{i18n.actions}</th></tr></thead><tbody>{rows.map(c => <tr key={c.id}><td>{c.name}</td><td>{c.whatsappNumber ?? '-'}</td><td>{c.sortOrder}</td><td><Badge status={c.isActive ? 'active' : 'inactive'} lang={lang} /></td><td><div className="flex gap-2"><button className="btn btn-outline" style={{ padding: '0.375rem 0.625rem' }} onClick={() => openEdit(c)} title="Edit"><Pencil size={14} /></button><button className="btn" style={{ padding: '0.375rem 0.625rem', background: 'var(--error-bg)', color: 'var(--error)' }} onClick={() => openDelete(c)} title="Delete"><Trash2 size={14} /></button></div></td></tr>)}</tbody></table>}</div>
    {(modalMode === 'create' || modalMode === 'edit') && <Modal title={modalMode === 'create' ? i18n.create : i18n.edit} onClose={closeModal} footer={<><button className="btn btn-outline" onClick={closeModal} disabled={isBusy}>{i18n.cancel}</button><button className="btn btn-primary" onClick={submit as any} disabled={isBusy}>{isBusy && <span className="spinner" style={{ width: 16, height: 16 }} />}{i18n.save}</button></>}><form onSubmit={submit}>{formError && <div className="login-error" style={{ marginBottom: '1rem' }}>{formError}</div>}<div className="input-group"><label className="input-label">{i18n.name} *</label><input className="input-field" value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} required /></div><div className="input-group"><label className="input-label">{i18n.whatsappNumber} *</label><input className="input-field" value={form.whatsappNumber ?? ''} onChange={event => setForm(current => ({ ...current, whatsappNumber: event.target.value }))} placeholder="+966..." required /></div><div className="input-group"><label className="input-label">{i18n.sortOrder}</label><input className="input-field" type="number" min="0" value={form.sortOrder} onChange={event => setForm(current => ({ ...current, sortOrder: Number(event.target.value) }))} /></div><div className="input-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.75rem', marginTop: '1rem' }}><input type="checkbox" checked={form.isActive} onChange={event => setForm(current => ({ ...current, isActive: event.target.checked }))} /><label className="input-label">{i18n.active}</label></div></form></Modal>}
    {modalMode === 'delete' && selected && <Modal title={i18n.delete} onClose={closeModal} footer={<><button className="btn btn-outline" onClick={closeModal} disabled={isBusy}>{i18n.cancel}</button><button className="btn" style={{ background: 'var(--error)', color: 'white' }} onClick={() => deleteMut.mutate(selected.id)} disabled={isBusy}>{i18n.delete}</button></>}><div>{formError && <div className="login-error" style={{ marginBottom: '1rem' }}>{formError}</div>}<p>{i18n.confirm}</p><p style={{ fontWeight: 600, marginTop: '0.5rem' }}>{selected.name}</p></div></Modal>}
  </div>;
}
