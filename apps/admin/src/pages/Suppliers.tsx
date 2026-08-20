import { useState, useEffect, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Search, Building2, RefreshCw } from 'lucide-react';
import { suppliers, type Supplier, type SupplierInput } from '../api';
import Modal from '../components/Modal';
import Badge from '../components/Badge';

interface Props { lang: 'en' | 'ar' }

const t = {
  en: {
    title: 'Suppliers', add: 'Add Supplier', search: 'Search suppliers…',
    name: 'Name', contact: 'Contact Person', phone: 'Phone', email: 'Email',
    address: 'Address', status: 'Status', actions: 'Actions',
    save: 'Save', cancel: 'Cancel', delete: 'Delete',
    edit: 'Edit Supplier', create: 'Create Supplier',
    confirmDelete: 'Delete this supplier? This cannot be undone.',
    noData: 'No suppliers found.', loading: 'Loading…', error: 'Failed to load suppliers.',
    active: 'Active', inactive: 'Inactive',
  },
  ar: {
    title: 'الموردون', add: 'إضافة مورد', search: 'بحث عن موردين…',
    name: 'الاسم', contact: 'جهة الاتصال', phone: 'الهاتف', email: 'البريد الإلكتروني',
    address: 'العنوان', status: 'الحالة', actions: 'الإجراءات',
    save: 'حفظ', cancel: 'إلغاء', delete: 'حذف',
    edit: 'تعديل المورد', create: 'إنشاء مورد',
    confirmDelete: 'حذف هذا المورد؟ لا يمكن التراجع.',
    noData: 'لا يوجد موردون.', loading: 'جاري التحميل…', error: 'فشل تحميل الموردين.',
    active: 'نشط', inactive: 'غير نشط',
  },
};

const emptyForm = (): SupplierInput => ({ name: '', contactPerson: '', phone: '', email: '', address: '', isActive: true });

export default function Suppliers({ lang }: Props) {
  const i18n = t[lang];
  const isRtl = lang === 'ar';
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'delete' | null>(null);
  const [selected, setSelected] = useState<Supplier | null>(null);
  const [form, setForm] = useState<SupplierInput>(emptyForm());
  const [formError, setFormError] = useState<string | null>(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['suppliers', debouncedSearch],
    queryFn: () => suppliers.list({ search: debouncedSearch || undefined, limit: 50 }),
  });

  const createMut = useMutation({
    mutationFn: (d: SupplierInput) => suppliers.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['suppliers'] }); closeModal(); },
    onError: (e: Error) => setFormError(e.message),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, d }: { id: string; d: Partial<SupplierInput> }) => suppliers.update(id, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['suppliers'] }); closeModal(); },
    onError: (e: Error) => setFormError(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => suppliers.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['suppliers'] }); closeModal(); },
    onError: (e: Error) => setFormError(e.message),
  });

  function openCreate() { setForm(emptyForm()); setFormError(null); setModalMode('create'); }
  function openEdit(s: Supplier) {
    setSelected(s);
    setForm({ name: s.name, contactPerson: s.contactPerson ?? '', phone: s.phone ?? '', email: s.email ?? '', address: s.address ?? '', isActive: s.isActive });
    setFormError(null);
    setModalMode('edit');
  }
  function openDelete(s: Supplier) { setSelected(s); setFormError(null); setModalMode('delete'); }
  function closeModal() { setModalMode(null); setSelected(null); }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setFormError('Name is required'); return; }
    if (modalMode === 'create') createMut.mutate(form);
    else if (modalMode === 'edit' && selected) updateMut.mutate({ id: selected.id, d: form });
  }

  const isBusy = createMut.isPending || updateMut.isPending || deleteMut.isPending;
  const rows = data?.items ?? [];

  return (
    <div className="page-container" style={{ direction: isRtl ? 'rtl' : 'ltr' }}>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 style={{ background: 'linear-gradient(135deg, #f8fafc, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {i18n.title}
          </h1>
          <p className="text-muted" style={{ fontSize: '0.875rem' }}>
            {isRtl ? `${data?.total ?? 0} مورد` : `${data?.total ?? 0} suppliers`}
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={16} /> {i18n.add}
        </button>
      </div>

      {/* Search bar */}
      <div className="card mb-4" style={{ padding: '0.75rem 1rem' }}>
        <div className="flex items-center gap-2">
          <Search size={16} style={{ color: 'var(--text-muted)' }} />
          <input
            className="input-field"
            style={{ flex: 1, border: 'none', background: 'transparent', padding: '0.25rem 0' }}
            placeholder={i18n.search}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button onClick={() => refetch()} className="btn btn-outline" style={{ padding: '0.375rem' }}>
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        {isLoading && (
          <div className="center-content">
            <div className="spinner" />
            <span style={{ marginTop: '0.75rem', fontSize: '0.875rem' }}>{i18n.loading}</span>
          </div>
        )}

        {isError && (
          <div className="center-content" style={{ color: 'var(--error)' }}>
            <span>{i18n.error}</span>
            <button className="btn btn-outline mt-4" onClick={() => refetch()}>Retry</button>
          </div>
        )}

        {!isLoading && !isError && rows.length === 0 && (
          <div className="center-content">
            <Building2 size={40} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
            <span style={{ fontSize: '0.875rem' }}>{i18n.noData}</span>
            <button className="btn btn-primary mt-4" onClick={openCreate}>
              <Plus size={16} /> {i18n.add}
            </button>
          </div>
        )}

        {!isLoading && !isError && rows.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>{i18n.name}</th>
                <th>{i18n.contact}</th>
                <th>{i18n.phone}</th>
                <th>{i18n.email}</th>
                <th>{i18n.status}</th>
                <th>{i18n.actions}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(s => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 500 }}>{s.name}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{s.contactPerson || '—'}</td>
                  <td style={{ color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{s.phone || '—'}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{s.email || '—'}</td>
                  <td><Badge status={s.isActive ? 'active' : 'inactive'} lang={lang} /></td>
                  <td>
                    <div className="flex gap-2">
                      <button className="btn btn-outline" style={{ padding: '0.375rem 0.625rem' }} onClick={() => openEdit(s)} title="Edit">
                        <Pencil size={14} />
                      </button>
                      <button
                        className="btn"
                        style={{ padding: '0.375rem 0.625rem', background: 'var(--error-bg)', color: 'var(--error)', border: '1px solid rgba(239,68,68,0.2)' }}
                        onClick={() => openDelete(s)} title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create / Edit modal */}
      {(modalMode === 'create' || modalMode === 'edit') && (
        <Modal
          title={modalMode === 'create' ? i18n.create : i18n.edit}
          onClose={closeModal}
          footer={
            <>
              <button className="btn btn-outline" onClick={closeModal} disabled={isBusy}>{i18n.cancel}</button>
              <button className="btn btn-primary" onClick={handleSubmit as any} disabled={isBusy}>
                {isBusy ? <span className="spinner" style={{ width: 16, height: 16 }} /> : null}
                {i18n.save}
              </button>
            </>
          }
        >
          <form onSubmit={handleSubmit}>
            {formError && (
              <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'var(--error-bg)', color: 'var(--error)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }}>
                {formError}
              </div>
            )}

            <div className="input-group">
              <label className="input-label">{i18n.name} *</label>
              <input className="input-field" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="input-group">
              <label className="input-label">{i18n.contact}</label>
              <input className="input-field" value={form.contactPerson ?? ''} onChange={e => setForm(f => ({ ...f, contactPerson: e.target.value }))} />
            </div>
            <div className="input-group">
              <label className="input-label">{i18n.phone}</label>
              <input className="input-field" value={form.phone ?? ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="input-group">
              <label className="input-label">{i18n.email}</label>
              <input className="input-field" type="email" value={form.email ?? ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="input-group">
              <label className="input-label">{i18n.address}</label>
              <textarea className="input-field" rows={3} value={form.address ?? ''} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} style={{ resize: 'vertical' }} />
            </div>
            <div className="input-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.75rem', marginBottom: 0 }}>
              <input type="checkbox" id="isActive" checked={form.isActive ?? true} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} />
              <label htmlFor="isActive" className="input-label" style={{ marginBottom: 0, cursor: 'pointer' }}>{i18n.active}</label>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete confirmation modal */}
      {modalMode === 'delete' && selected && (
        <Modal
          title={isRtl ? 'حذف المورد' : 'Delete Supplier'}
          onClose={closeModal}
          footer={
            <>
              <button className="btn btn-outline" onClick={closeModal} disabled={isBusy}>{i18n.cancel}</button>
              <button
                className="btn"
                style={{ background: 'var(--error)', color: 'white' }}
                onClick={() => deleteMut.mutate(selected.id)}
                disabled={isBusy}
              >
                {isBusy ? <span className="spinner" style={{ width: 16, height: 16 }} /> : null}
                {i18n.delete}
              </button>
            </>
          }
        >
          {formError && (
            <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'var(--error-bg)', color: 'var(--error)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }}>
              {formError}
            </div>
          )}
          <p style={{ color: 'var(--text-secondary)' }}>{i18n.confirmDelete}</p>
          <p style={{ fontWeight: 600, marginTop: '0.5rem' }}>{selected.name}</p>
        </Modal>
      )}
    </div>
  );
}
