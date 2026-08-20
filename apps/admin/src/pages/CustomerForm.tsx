import { useState, type FormEvent, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save } from 'lucide-react';
import { customers, type CustomerInput } from '../api';

interface Props { lang: 'en' | 'ar' }

const t = {
  en: {
    back: 'Customers',
    createTitle: 'Create Customer',
    editTitle: 'Edit Customer',
    loading: 'Loading…',
    name: 'Name',
    namePlaceholder: 'Customer full name',
    phone: 'Phone',
    phonePlaceholder: '+966 50 123 4567',
    email: 'Email',
    emailPlaceholder: 'customer@example.com (optional)',
    nationalId: 'National ID',
    nationalIdPlaceholder: '1234567890 (optional)',
    notes: 'Staff Notes',
    notesPlaceholder: 'Internal notes about this customer…',
    save: 'Save Customer',
    cancel: 'Cancel',
    required: 'Required',
    createSuccess: 'Customer created successfully!',
    updateSuccess: 'Customer updated successfully!',
  },
  ar: {
    back: 'العملاء',
    createTitle: 'إنشاء عميل',
    editTitle: 'تعديل العميل',
    loading: 'جاري التحميل…',
    name: 'الاسم',
    namePlaceholder: 'اسم العميل الكامل',
    phone: 'رقم الهاتف',
    phonePlaceholder: '٩٦٦٥٠١٢٣٤٥٦٧+',
    email: 'البريد الإلكتروني',
    emailPlaceholder: 'customer@example.com (اختياري)',
    nationalId: 'رقم الهوية',
    nationalIdPlaceholder: '١٢٣٤٥٦٧٨٩٠ (اختياري)',
    notes: 'ملاحظات الموظفين',
    notesPlaceholder: 'ملاحظات داخلية عن هذا العميل…',
    save: 'حفظ العميل',
    cancel: 'إلغاء',
    required: 'مطلوب',
    createSuccess: 'تم إنشاء العميل بنجاح!',
    updateSuccess: 'تم تحديث العميل بنجاح!',
  },
};

const emptyForm = (): CustomerInput => ({
  name: '',
  phone: '',
  email: '',
  nationalId: '',
  notes: '',
});

export default function CustomerForm({ lang }: Props) {
  const i18n = t[lang];
  const isRtl = lang === 'ar';
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isEditMode = id !== 'new';

  const [form, setForm] = useState<CustomerInput>(emptyForm());
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch customer data if editing
  const { data: customer, isLoading } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => customers.get(id!),
    enabled: isEditMode,
  });

  useEffect(() => {
    if (customer && isEditMode) {
      setForm({
        name: customer.name,
        phone: customer.phone,
        email: customer.email || '',
        nationalId: customer.nationalId || '',
        notes: customer.notes || '',
      });
    }
  }, [customer, isEditMode]);

  const createMut = useMutation({
    mutationFn: (data: CustomerInput) => customers.create(data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      navigate(`/customers/${data.id}`);
    },
    onError: (e: Error) => setFormError(e.message),
  });

  const updateMut = useMutation({
    mutationFn: (data: CustomerInput) => customers.update(id!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customer', id] });
      qc.invalidateQueries({ queryKey: ['customers'] });
      navigate(`/customers/${id}`);
    },
    onError: (e: Error) => setFormError(e.message),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!form.name.trim()) {
      setFormError('Name is required');
      return;
    }
    if (!form.phone.trim()) {
      setFormError('Phone is required');
      return;
    }

    const payload: CustomerInput = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email?.trim() || undefined,
      nationalId: form.nationalId?.trim() || undefined,
      notes: form.notes?.trim() || undefined,
    };

    if (isEditMode) {
      updateMut.mutate(payload);
    } else {
      createMut.mutate(payload);
    }
  }

  const isBusy = createMut.isPending || updateMut.isPending;

  if (isEditMode && isLoading) {
    return (
      <div className="page-container center-content" style={{ direction: isRtl ? 'rtl' : 'ltr' }}>
        <div className="spinner" /><span style={{ marginTop: '0.75rem' }}>{i18n.loading}</span>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ direction: isRtl ? 'rtl' : 'ltr', maxWidth: 700 }}>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link to={isEditMode ? `/customers/${id}` : '/customers'} className="btn btn-outline" style={{ padding: '0.375rem' }}>
          <ArrowLeft size={18} />
        </Link>
        <h1 style={{ margin: 0 }}>{isEditMode ? i18n.editTitle : i18n.createTitle}</h1>
      </div>

      {/* Form */}
      <div className="card">
        <form onSubmit={handleSubmit}>
          {formError && (
            <div style={{ marginBottom: '1.5rem', padding: '0.75rem', background: 'var(--error-bg)', color: 'var(--error)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }}>
              {formError}
            </div>
          )}

          <div className="input-group">
            <label className="input-label">
              {i18n.name} <span style={{ color: 'var(--error)' }}>*</span>
            </label>
            <input
              className="input-field"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder={i18n.namePlaceholder}
              required
              autoFocus
            />
          </div>

          <div className="input-group">
            <label className="input-label">
              {i18n.phone} <span style={{ color: 'var(--error)' }}>*</span>
            </label>
            <input
              className="input-field"
              type="tel"
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder={i18n.phonePlaceholder}
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label">{i18n.email}</label>
            <input
              className="input-field"
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder={i18n.emailPlaceholder}
            />
          </div>

          <div className="input-group">
            <label className="input-label">{i18n.nationalId}</label>
            <input
              className="input-field"
              value={form.nationalId}
              onChange={e => setForm(f => ({ ...f, nationalId: e.target.value }))}
              placeholder={i18n.nationalIdPlaceholder}
            />
          </div>

          <div className="input-group">
            <label className="input-label">{i18n.notes}</label>
            <textarea
              className="input-field"
              rows={4}
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder={i18n.notesPlaceholder}
              style={{ resize: 'vertical' }}
            />
          </div>

          <div className="flex gap-3 justify-end" style={{ marginTop: '1.5rem' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => navigate(isEditMode ? `/customers/${id}` : '/customers')}
              disabled={isBusy}
            >
              {i18n.cancel}
            </button>
            <button type="submit" className="btn btn-primary" disabled={isBusy}>
              {isBusy ? <span className="spinner" style={{ width: 16, height: 16 }} /> : <Save size={16} />}
              {i18n.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
