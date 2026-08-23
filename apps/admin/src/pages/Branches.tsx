import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Pencil, Plus, RefreshCw, Search, Settings2, Trash2 } from 'lucide-react';
import { branches, configuration, type Branch, type BranchInput } from '../api';
import Badge from '../components/Badge';
import Modal from '../components/Modal';

interface BranchesProps {
  lang?: 'en' | 'ar';
}

const emptyForm = (): BranchInput => ({
  nameAr: '',
  nameEn: '',
  address: '',
  phone: '',
  isActive: true,
});

export default function Branches({ lang = 'en' }: BranchesProps) {
  const isRtl = lang === 'ar';
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'delete' | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [form, setForm] = useState<BranchInput>(emptyForm());
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['branches', debouncedSearch],
    queryFn: () => branches.list({ page: 1, limit: 100, search: debouncedSearch || undefined }),
  });

  const rows = data?.items ?? [];

  useEffect(() => {
    if (!rows.length) {
      setSelectedId(null);
      setSelectedBranch(null);
      return;
    }

    if (!selectedId || !rows.some((branch) => branch.id === selectedId)) {
      setSelectedId(rows[0].id);
      setSelectedBranch(rows[0]);
    }
  }, [rows, selectedId]);

  const configQuery = useQuery({
    queryKey: ['branch-config', selectedId],
    queryFn: () => configuration.getBranchConfig(selectedId!),
    enabled: !!selectedId,
  });

  const selectedBranchData = useMemo(
    () => rows.find((branch) => branch.id === selectedId) ?? null,
    [rows, selectedId],
  );

  const createMut = useMutation({
    mutationFn: (input: BranchInput) => branches.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['branches'] });
      qc.invalidateQueries({ queryKey: ['admin-branches'] });
      closeModal();
    },
    onError: (error: Error) => setFormError(error.message),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<BranchInput> }) => branches.update(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['branches'] });
      qc.invalidateQueries({ queryKey: ['admin-branches'] });
      closeModal();
    },
    onError: (error: Error) => setFormError(error.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => branches.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['branches'] });
      qc.invalidateQueries({ queryKey: ['admin-branches'] });
      closeModal();
    },
    onError: (error: Error) => setFormError(error.message),
  });

  function closeModal() {
    setModalMode(null);
    setSelectedBranch(null);
    setFormError(null);
    setForm(emptyForm());
  }

  function openCreate() {
    setForm(emptyForm());
    setFormError(null);
    setModalMode('create');
  }

  function openEdit(branch: Branch) {
    setSelectedBranch(branch);
    setForm({
      nameAr: branch.nameAr,
      nameEn: branch.nameEn,
      address: branch.address ?? '',
      phone: branch.phone ?? '',
      isActive: branch.isActive,
    });
    setFormError(null);
    setModalMode('edit');
  }

  function openDelete(branch: Branch) {
    setSelectedBranch(branch);
    setFormError(null);
    setModalMode('delete');
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    if (!form.nameAr.trim() || !form.nameEn.trim()) {
      setFormError(isRtl ? 'يجب إدخال اسم الفرع بالعربية والإنجليزية.' : 'Both Arabic and English names are required.');
      return;
    }

    if (modalMode === 'create') {
      createMut.mutate({
        ...form,
        nameAr: form.nameAr.trim(),
        nameEn: form.nameEn.trim(),
        address: form.address?.trim() || undefined,
        phone: form.phone?.trim() || undefined,
      });
      return;
    }

    if (modalMode === 'edit' && selectedBranch) {
      updateMut.mutate({
        id: selectedBranch.id,
        input: {
          ...form,
          nameAr: form.nameAr.trim(),
          nameEn: form.nameEn.trim(),
          address: form.address?.trim() || undefined,
          phone: form.phone?.trim() || undefined,
        },
      });
    }
  }

  const isBusy = createMut.isPending || updateMut.isPending || deleteMut.isPending;

  return (
    <div className="page-container" style={{ direction: isRtl ? 'rtl' : 'ltr' }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 style={{ background: 'linear-gradient(135deg, #f8fafc, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {isRtl ? 'الفروع' : 'Branches'}
          </h1>
          <p className="text-muted" style={{ fontSize: '0.875rem' }}>
            {isRtl ? `${rows.length} فرع` : `${rows.length} branches`}
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={16} /> {isRtl ? 'إضافة فرع' : 'Add Branch'}
        </button>
      </div>

      <div className="card mb-4" style={{ padding: '0.75rem 1rem' }}>
        <div className="flex items-center gap-2">
          <Search size={16} style={{ color: 'var(--text-muted)' }} />
          <input
            className="input-field"
            style={{ flex: 1, border: 'none', background: 'transparent', padding: '0.25rem 0' }}
            placeholder={isRtl ? 'بحث عن فروع…' : 'Search branches…'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button onClick={() => refetch()} className="btn btn-outline" style={{ padding: '0.375rem' }}>
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      <div className="grid" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem' }}>
        <div className="table-container">
          {isLoading && (
            <div className="center-content">
              <div className="spinner" />
              <span style={{ marginTop: '0.75rem', fontSize: '0.875rem' }}>{isRtl ? 'جاري التحميل…' : 'Loading…'}</span>
            </div>
          )}

          {isError && (
            <div className="center-content" style={{ color: 'var(--error)' }}>
              <span>{isRtl ? 'فشل تحميل الفروع.' : 'Failed to load branches.'}</span>
              <button className="btn btn-outline mt-4" onClick={() => refetch()}>Retry</button>
            </div>
          )}

          {!isLoading && !isError && rows.length === 0 && (
            <div className="center-content">
              <Building2 size={40} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
              <span style={{ fontSize: '0.875rem' }}>{isRtl ? 'لا توجد فروع.' : 'No branches found.'}</span>
              <button className="btn btn-primary mt-4" onClick={openCreate}>
                <Plus size={16} /> {isRtl ? 'إضافة فرع' : 'Add Branch'}
              </button>
            </div>
          )}

          {!isLoading && !isError && rows.length > 0 && (
            <table>
              <thead>
                <tr>
                  <th>{isRtl ? 'اسم الفرع' : 'Branch'}</th>
                  <th>{isRtl ? 'الهاتف' : 'Phone'}</th>
                  <th>{isRtl ? 'الحالة' : 'Status'}</th>
                  <th>{isRtl ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((branch) => (
                  <tr
                    key={branch.id}
                    onClick={() => setSelectedId(branch.id)}
                    style={{ cursor: 'pointer', background: selectedBranchData?.id === branch.id ? 'rgba(59,130,246,0.06)' : undefined }}
                  >
                    <td>
                      <div style={{ fontWeight: 600 }}>{branch.nameEn}</div>
                      <div className="text-muted">{branch.nameAr}</div>
                    </td>
                    <td>{branch.phone || '—'}</td>
                    <td><Badge status={branch.isActive ? 'active' : 'inactive'} lang={lang} /></td>
                    <td onClick={(event) => event.stopPropagation()}>
                      <div className="flex gap-2">
                        <button className="btn btn-outline" style={{ padding: '0.375rem 0.625rem' }} onClick={() => openEdit(branch)}>
                          <Pencil size={14} />
                        </button>
                        <button className="btn" style={{ padding: '0.375rem 0.625rem', background: 'var(--error-bg)', color: 'var(--error)', border: '1px solid rgba(239,68,68,0.2)' }} onClick={() => openDelete(branch)}>
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

        <div className="card" style={{ padding: '1rem' }}>
          {selectedBranchData ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 style={{ margin: 0 }}>{selectedBranchData.nameEn}</h2>
                <Settings2 size={18} style={{ color: 'var(--text-muted)' }} />
              </div>

              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-muted">{isRtl ? 'الاسم العربي' : 'Arabic Name'}</div>
                  <div style={{ fontWeight: 600 }}>{selectedBranchData.nameAr}</div>
                </div>
                <div>
                  <div className="text-muted">{isRtl ? 'العنوان' : 'Address'}</div>
                  <div>{selectedBranchData.address || '—'}</div>
                </div>
                <div>
                  <div className="text-muted">{isRtl ? 'الهاتف' : 'Phone'}</div>
                  <div>{selectedBranchData.phone || '—'}</div>
                </div>
                <div>
                  <div className="text-muted">{isRtl ? 'الحالة' : 'Status'}</div>
                  <Badge status={selectedBranchData.isActive ? 'active' : 'inactive'} lang={lang} />
                </div>
              </div>

              <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                <div className="flex items-center justify-between mb-3">
                  <strong>{isRtl ? 'إعدادات الفرع' : 'Branch configuration'}</strong>
                  <span className="text-muted">{configQuery.data?.length ?? 0}</span>
                </div>

                {configQuery.isLoading ? (
                  <div className="text-muted">{isRtl ? 'جاري تحميل الإعدادات…' : 'Loading configuration…'}</div>
                ) : configQuery.data && configQuery.data.length > 0 ? (
                  <div className="space-y-2">
                    {configQuery.data.slice(0, 5).map((config) => (
                      <div key={config.id} className="card" style={{ padding: '0.5rem 0.75rem' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{config.configKey}</div>
                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                          {config.inheritsFromCompany ? (isRtl ? 'موروث من الشركة' : 'Inherited from company') : (isRtl ? 'تجاوز فرع' : 'Branch override')}
                        </div>
                      </div>
                    ))}
                    {configQuery.data.length > 5 && (
                      <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                        {isRtl ? `...و${configQuery.data.length - 5} إضافي` : `...and ${configQuery.data.length - 5} more`}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-muted">{isRtl ? 'لا توجد إعدادات مخصصة لهذا الفرع.' : 'No branch-specific config overrides found.'}</div>
                )}
              </div>
            </>
          ) : (
            <div className="center-content" style={{ minHeight: '250px' }}>
              <Building2 size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
              <span className="text-muted">{isRtl ? 'اختر فرعًا لعرض التفاصيل.' : 'Select a branch to view details.'}</span>
            </div>
          )}
        </div>
      </div>

      {(modalMode === 'create' || modalMode === 'edit') && (
        <Modal
          title={modalMode === 'create' ? (isRtl ? 'إنشاء فرع' : 'Create Branch') : (isRtl ? 'تعديل الفرع' : 'Edit Branch')}
          onClose={closeModal}
          footer={
            <>
              <button className="btn btn-outline" onClick={closeModal} disabled={isBusy}>{isRtl ? 'إلغاء' : 'Cancel'}</button>
              <button className="btn btn-primary" onClick={handleSubmit as any} disabled={isBusy}>
                {isBusy ? <span className="spinner" style={{ width: 16, height: 16 }} /> : null}
                {isRtl ? 'حفظ' : 'Save'}
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
              <label className="input-label">{isRtl ? 'الاسم العربي' : 'Arabic Name'} *</label>
              <input className="input-field" value={form.nameAr} onChange={(e) => setForm((current) => ({ ...current, nameAr: e.target.value }))} />
            </div>

            <div className="input-group">
              <label className="input-label">{isRtl ? 'الاسم الإنجليزي' : 'English Name'} *</label>
              <input className="input-field" value={form.nameEn} onChange={(e) => setForm((current) => ({ ...current, nameEn: e.target.value }))} />
            </div>

            <div className="input-group">
              <label className="input-label">{isRtl ? 'العنوان' : 'Address'}</label>
              <input className="input-field" value={form.address || ''} onChange={(e) => setForm((current) => ({ ...current, address: e.target.value }))} />
            </div>

            <div className="input-group">
              <label className="input-label">{isRtl ? 'الهاتف' : 'Phone'}</label>
              <input className="input-field" value={form.phone || ''} onChange={(e) => setForm((current) => ({ ...current, phone: e.target.value }))} />
            </div>

            <label className="flex items-center gap-2" style={{ marginTop: '0.25rem' }}>
              <input type="checkbox" checked={form.isActive ?? true} onChange={(e) => setForm((current) => ({ ...current, isActive: e.target.checked }))} />
              <span>{isRtl ? 'نشط' : 'Active'}</span>
            </label>
          </form>
        </Modal>
      )}

      {modalMode === 'delete' && selectedBranch && (
        <Modal
          title={isRtl ? 'حذف الفرع' : 'Delete Branch'}
          onClose={closeModal}
          footer={
            <>
              <button className="btn btn-outline" onClick={closeModal} disabled={isBusy}>{isRtl ? 'إلغاء' : 'Cancel'}</button>
              <button className="btn" style={{ background: 'var(--error-bg)', color: 'var(--error)', border: '1px solid rgba(239,68,68,0.2)' }} onClick={() => deleteMut.mutate(selectedBranch.id)} disabled={isBusy}>
                {isBusy ? <span className="spinner" style={{ width: 16, height: 16 }} /> : null}
                {isRtl ? 'حذف' : 'Delete'}
              </button>
            </>
          }
        >
          <p style={{ margin: 0 }}>
            {isRtl ? `هل تريد حذف الفرع ${selectedBranch.nameEn}؟` : `Delete ${selectedBranch.nameEn}?`}
          </p>
        </Modal>
      )}
    </div>
  );
}
