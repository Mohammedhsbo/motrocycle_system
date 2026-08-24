import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image, Pencil, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import { brands, type BrandCreate, type BrandResponse } from '../api';
import Modal from '../components/Modal';
import ImageUpload from '../components/ImageUpload';
import Badge from '../components/Badge';

interface Props { lang: 'en' | 'ar' }
type ModalMode = 'create' | 'edit' | 'delete' | null;

const t = {
  en: {
    title: 'Brands', add: 'Add Brand', search: 'Search brands…', nameAr: 'Arabic name', nameEn: 'English name', logo: 'Logo', active: 'Active', sort: 'Sort order', motorcycles: 'Motorcycles', actions: 'Actions', save: 'Save', cancel: 'Cancel', delete: 'Delete', create: 'Create Brand', edit: 'Edit Brand', confirm: 'Delete this brand?', noData: 'No brands found.', loading: 'Loading…', error: 'Failed to load brands.', all: 'All', inactive: 'Inactive', inUse: 'Brands with motorcycles cannot be deleted.',
  },
  ar: {
    title: 'العلامات التجارية', add: 'إضافة علامة', search: 'بحث في العلامات…', nameAr: 'الاسم بالعربية', nameEn: 'الاسم بالإنجليزية', logo: 'الشعار', active: 'نشطة', sort: 'ترتيب العرض', motorcycles: 'الدراجات', actions: 'الإجراءات', save: 'حفظ', cancel: 'إلغاء', delete: 'حذف', create: 'إنشاء علامة', edit: 'تعديل العلامة', confirm: 'حذف هذه العلامة؟', noData: 'لا توجد علامات.', loading: 'جاري التحميل…', error: 'فشل تحميل العلامات.', all: 'الكل', inactive: 'غير نشطة', inUse: 'لا يمكن حذف علامة مرتبطة بدراجات.',
  },
};

const emptyForm = (): BrandCreate & { isActive: boolean } => ({ nameAr: '', nameEn: '', logo: '', sortOrder: 0, isActive: true });

export default function Brands({ lang }: Props) {
  const i18n = t[lang];
  const isRtl = lang === 'ar';
  const qc = useQueryClient();
  const [isActiveFilter, setIsActiveFilter] = useState<boolean | undefined>(undefined);
  const [search, setSearch] = useState('');
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selected, setSelected] = useState<BrandResponse | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [formError, setFormError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['brands', isActiveFilter],
    queryFn: () => brands.list({ isActive: isActiveFilter }),
  });
  const createMut = useMutation({ mutationFn: (data: BrandCreate) => brands.create(data), onSuccess: () => { qc.invalidateQueries({ queryKey: ['brands'] }); closeModal(); }, onError: (error: Error) => setFormError(error.message) });
  const updateMut = useMutation({ mutationFn: ({ id, data }: { id: string; data: BrandCreate & { isActive?: boolean } }) => brands.update(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: ['brands'] }); closeModal(); }, onError: (error: Error) => setFormError(error.message) });
  const deleteMut = useMutation({ mutationFn: (id: string) => brands.delete(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['brands'] }); closeModal(); }, onError: (error: Error) => setFormError(error.message) });

  useEffect(() => { if (query.error) setFormError(query.error.message); }, [query.error]);
  function openCreate() { setSelected(null); setForm(emptyForm()); setFormError(null); setModalMode('create'); }
  function openEdit(brand: BrandResponse) { setSelected(brand); setForm({ nameAr: brand.nameAr, nameEn: brand.nameEn, logo: brand.logo ?? '', sortOrder: brand.sortOrder, isActive: brand.isActive }); setFormError(null); setModalMode('edit'); }
  function openDelete(brand: BrandResponse) { setSelected(brand); setFormError(null); setModalMode('delete'); }
  function closeModal() { setModalMode(null); setSelected(null); setFormError(null); }
  function submit(event: FormEvent) { event.preventDefault(); setFormError(null); if (!form.nameAr.trim() || !form.nameEn.trim()) { setFormError(isRtl ? 'الاسمان مطلوبان.' : 'Both names are required.'); return; } if (modalMode === 'create') createMut.mutate({ ...form, logo: form.logo || undefined }); else if (modalMode === 'edit' && selected) updateMut.mutate({ id: selected.id, data: { ...form, logo: form.logo || undefined } }); }

  const rows = (query.data ?? []).filter(brand => `${brand.nameAr} ${brand.nameEn}`.toLowerCase().includes(search.toLowerCase()));
  const isBusy = createMut.isPending || updateMut.isPending || deleteMut.isPending;

  return <div className="page-container" style={{ direction: isRtl ? 'rtl' : 'ltr' }}>
    <div className="flex items-center justify-between mb-6"><div><h1>{i18n.title}</h1><p className="text-muted" style={{ fontSize: '0.875rem' }}>{rows.length} {isRtl ? 'علامة' : 'brands'}</p></div><button className="btn btn-primary" onClick={openCreate}><Plus size={16} /> {i18n.add}</button></div>
    <div className="card mb-4" style={{ padding: '0.75rem 1rem' }}><div className="flex items-center gap-2"><Search size={16} style={{ color: 'var(--text-muted)' }} /><input className="input-field" style={{ flex: 1, border: 'none', background: 'transparent', padding: '0.25rem 0' }} placeholder={i18n.search} value={search} onChange={event => setSearch(event.target.value)} /><select className="input-field" value={isActiveFilter === undefined ? 'all' : String(isActiveFilter)} onChange={event => setIsActiveFilter(event.target.value === 'all' ? undefined : event.target.value === 'true')}><option value="all">{i18n.all}</option><option value="true">{i18n.active}</option><option value="false">{i18n.inactive}</option></select><button onClick={() => query.refetch()} className="btn btn-outline" style={{ padding: '0.375rem' }} title="Refresh"><RefreshCw size={14} /></button></div></div>
    <div className="table-container">{query.isLoading ? <div className="center-content"><div className="spinner" /><span>{i18n.loading}</span></div> : query.isError ? <div className="center-content" style={{ color: 'var(--error)' }}><span>{i18n.error}</span><button className="btn btn-outline mt-4" onClick={() => query.refetch()}>Retry</button></div> : rows.length === 0 ? <div className="center-content"><Image size={40} style={{ opacity: 0.3, marginBottom: '0.75rem' }} /><span>{i18n.noData}</span></div> : <table><thead><tr><th>{i18n.logo}</th><th>{i18n.nameAr}</th><th>{i18n.nameEn}</th><th>{i18n.active}</th><th>{i18n.sort}</th><th>{i18n.motorcycles}</th><th>{i18n.actions}</th></tr></thead><tbody>{rows.map(brand => <tr key={brand.id}><td>{brand.logo ? <img src={brand.logo} alt="" style={{ width: 42, height: 42, objectFit: 'contain' }} /> : <Image size={24} style={{ color: 'var(--text-muted)' }} />}</td><td>{brand.nameAr}</td><td>{brand.nameEn}</td><td><Badge status={brand.isActive ? 'active' : 'inactive'} lang={lang} /></td><td>{brand.sortOrder}</td><td>{brand._count?.motorcycles ?? 0}</td><td><div className="flex gap-2"><button className="btn btn-outline" style={{ padding: '0.375rem 0.625rem' }} onClick={() => openEdit(brand)} title="Edit"><Pencil size={14} /></button><button className="btn" style={{ padding: '0.375rem 0.625rem', background: 'var(--error-bg)', color: 'var(--error)' }} onClick={() => openDelete(brand)} title="Delete"><Trash2 size={14} /></button></div></td></tr>)}</tbody></table>}</div>
    {(modalMode === 'create' || modalMode === 'edit') && <Modal title={modalMode === 'create' ? i18n.create : i18n.edit} onClose={closeModal} footer={<><button className="btn btn-outline" onClick={closeModal} disabled={isBusy}>{i18n.cancel}</button><button className="btn btn-primary" onClick={submit as any} disabled={isBusy}>{isBusy && <span className="spinner" style={{ width: 16, height: 16 }} />}{i18n.save}</button></>}><form onSubmit={submit}>{formError && <div className="login-error" style={{ marginBottom: '1rem' }}>{formError}</div>}<div className="input-group"><label className="input-label">{i18n.nameAr} *</label><input className="input-field" value={form.nameAr} onChange={event => setForm(current => ({ ...current, nameAr: event.target.value }))} required /></div><div className="input-group"><label className="input-label">{i18n.nameEn} *</label><input className="input-field" value={form.nameEn} onChange={event => setForm(current => ({ ...current, nameEn: event.target.value }))} required /></div><ImageUpload lang={lang} value={form.logo} onUploaded={logo => setForm(current => ({ ...current, logo }))} onClear={() => setForm(current => ({ ...current, logo: '' }))} /><div className="input-group"><label className="input-label">{i18n.sort}</label><input className="input-field" type="number" min="0" value={form.sortOrder} onChange={event => setForm(current => ({ ...current, sortOrder: Number(event.target.value) }))} /></div><div className="input-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.75rem' }}><input type="checkbox" checked={form.isActive} onChange={event => setForm(current => ({ ...current, isActive: event.target.checked }))} /><label className="input-label">{i18n.active}</label></div></form></Modal>}
    {modalMode === 'delete' && selected && <Modal title={i18n.delete} onClose={closeModal} footer={<><button className="btn btn-outline" onClick={closeModal} disabled={isBusy}>{i18n.cancel}</button><button className="btn" style={{ background: 'var(--error)', color: 'white' }} onClick={() => deleteMut.mutate(selected.id)} disabled={isBusy}>{i18n.delete}</button></>}><div>{formError && <div className="login-error" style={{ marginBottom: '1rem' }}>{formError}</div>}<p>{i18n.confirm}</p><p style={{ fontWeight: 600, marginTop: '0.5rem' }}>{selected.nameEn}</p>{(selected._count?.motorcycles ?? 0) > 0 && <p className="text-muted" style={{ marginTop: '0.75rem' }}>{i18n.inUse}</p>}</div></Modal>}
  </div>;
}
