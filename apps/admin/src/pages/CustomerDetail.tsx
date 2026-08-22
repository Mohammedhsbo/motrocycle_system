import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, User, Mail, Phone, IdCard, MapPin, Pencil, XCircle, CheckCircle, StickyNote } from 'lucide-react';
import { customers } from '../api';
import Badge from '../components/Badge';
import CustomerSummary from '../components/CustomerSummary';
import Modal from '../components/Modal';

interface Props { lang: 'en' | 'ar' }

const t = {
  en: {
    back: 'Customers', loading: 'Loading…', error: 'Failed to load customer.',
    personalInfo: 'Personal Information', addresses: 'Addresses', summary: 'Summary',
    name: 'Name', phone: 'Phone', email: 'Email', nationalId: 'National ID', notes: 'Staff Notes',
    created: 'Member Since', status: 'Status', noEmail: 'No email', noNationalId: 'Not provided', noNotes: 'No notes',
    edit: 'Edit Customer', deactivate: 'Deactivate', reactivate: 'Reactivate',
    confirmDeactivate: 'Deactivate this customer? They will not be able to place orders.',
    confirmReactivate: 'Reactivate this customer?',
    deactivateReason: 'Reason for deactivation (required)',
    reasonPlaceholder: 'e.g., Fraudulent activity, Requested by customer…',
    cancel: 'Cancel', confirm: 'Confirm',
    deactivateSuccess: 'Customer deactivated', reactivateSuccess: 'Customer reactivated',
    noAddresses: 'No addresses', default: 'Default',
  },
  ar: {
    back: 'العملاء', loading: 'جاري التحميل…', error: 'فشل تحميل العميل.',
    personalInfo: 'المعلومات الشخصية', addresses: 'العناوين', summary: 'الملخص',
    name: 'الاسم', phone: 'الهاتف', email: 'البريد الإلكتروني', nationalId: 'رقم الهوية', notes: 'ملاحظات الموظفين',
    created: 'عضو منذ', status: 'الحالة', noEmail: 'لا يوجد بريد', noNationalId: 'غير محدد', noNotes: 'لا توجد ملاحظات',
    edit: 'تعديل العميل', deactivate: 'إلغاء التفعيل', reactivate: 'إعادة التفعيل',
    confirmDeactivate: 'إلغاء تفعيل هذا العميل؟ لن يتمكن من إجراء الطلبات.',
    confirmReactivate: 'إعادة تفعيل هذا العميل؟',
    deactivateReason: 'سبب إلغاء التفعيل (مطلوب)',
    reasonPlaceholder: 'مثال: نشاط احتيالي، طلب العميل…',
    cancel: 'إلغاء', confirm: 'تأكيد',
    deactivateSuccess: 'تم إلغاء تفعيل العميل', reactivateSuccess: 'تم إعادة تفعيل العميل',
    noAddresses: 'لا توجد عناوين', default: 'افتراضي',
  },
};

export default function CustomerDetail({ lang }: Props) {
  const i18n = t[lang];
  const isRtl = lang === 'ar';
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [showReactivateModal, setShowReactivateModal] = useState(false);
  const [deactivateReason, setDeactivateReason] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const { data: customer, isLoading, isError, refetch } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => customers.get(id!),
    enabled: !!id,
  });

  const deactivateMut = useMutation({
    mutationFn: () => customers.deactivate(id!, deactivateReason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customer', id] });
      qc.invalidateQueries({ queryKey: ['customers'] });
      setActionSuccess(i18n.deactivateSuccess);
      setShowDeactivateModal(false);
      setDeactivateReason('');
    },
    onError: (e: Error) => setActionError(e.message),
  });

  const reactivateMut = useMutation({
    mutationFn: () => customers.reactivate(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customer', id] });
      qc.invalidateQueries({ queryKey: ['customers'] });
      setActionSuccess(i18n.reactivateSuccess);
      setShowReactivateModal(false);
    },
    onError: (e: Error) => setActionError(e.message),
  });

  const isBusy = deactivateMut.isPending || reactivateMut.isPending;

  if (isLoading) return (
    <div className="page-container center-content" style={{ direction: isRtl ? 'rtl' : 'ltr' }}>
      <div className="spinner" /><span style={{ marginTop: '0.75rem' }}>{i18n.loading}</span>
    </div>
  );

  if (isError || !customer) return (
    <div className="page-container center-content" style={{ direction: isRtl ? 'rtl' : 'ltr', color: 'var(--error)' }}>
      <User size={40} style={{ opacity: 0.4 }} />
      <span style={{ marginTop: '0.75rem' }}>{i18n.error}</span>
      <button className="btn btn-outline mt-4" onClick={() => refetch()}>Retry</button>
    </div>
  );

  return (
    <div className="page-container" style={{ direction: isRtl ? 'rtl' : 'ltr', maxWidth: 1000 }}>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link to="/customers" className="btn btn-outline" style={{ padding: '0.375rem' }}>
          <ArrowLeft size={18} />
        </Link>
        <div style={{ flex: 1 }}>
          <div className="flex items-center gap-3">
            <h1 style={{ margin: 0, fontSize: '1.75rem' }}>{customer.name}</h1>
            <Badge status={customer.isActive ? 'active' : 'inactive'} lang={lang} />
          </div>
          <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
            {i18n.created}: {new Date(customer.createdAt).toLocaleDateString(isRtl ? 'ar-EG' : 'en-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        {/* Actions */}
        <div className="flex gap-2">
          <button className="btn btn-outline" onClick={() => navigate(`/customers/${id}/edit`)}>
            <Pencil size={16} /> {i18n.edit}
          </button>
          {customer.isActive ? (
            <button
              className="btn"
              style={{ background: 'var(--error-bg)', color: 'var(--error)', border: '1px solid rgba(239,68,68,0.2)' }}
              onClick={() => setShowDeactivateModal(true)}
            >
              <XCircle size={16} /> {i18n.deactivate}
            </button>
          ) : (
            <button className="btn btn-primary" onClick={() => setShowReactivateModal(true)}>
              <CheckCircle size={16} /> {i18n.reactivate}
            </button>
          )}
        </div>
      </div>

      {/* Feedback banners */}
      {actionError && (
        <div style={{ padding: '0.75rem', background: 'var(--error-bg)', color: 'var(--error)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.875rem' }}>
          {actionError}
        </div>
      )}
      {actionSuccess && (
        <div style={{ padding: '0.75rem', background: 'var(--success-bg)', color: 'var(--success)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.875rem' }}>
          {actionSuccess}
        </div>
      )}

      {/* Personal Info */}
      <div className="card mb-6">
        <h2 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <User size={18} style={{ color: 'var(--accent-primary)' }} />
          {i18n.personalInfo}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {i18n.phone}
            </div>
            <div className="flex items-center gap-2" style={{ fontFamily: 'monospace', fontSize: '1rem', fontWeight: 500 }}>
              <Phone size={14} style={{ color: 'var(--text-muted)' }} />
              {customer.phone}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {i18n.email}
            </div>
            <div className="flex items-center gap-2" style={{ fontSize: '0.95rem' }}>
              <Mail size={14} style={{ color: 'var(--text-muted)' }} />
              {customer.email || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>{i18n.noEmail}</span>}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {i18n.nationalId}
            </div>
            <div className="flex items-center gap-2" style={{ fontFamily: 'monospace', fontSize: '0.95rem' }}>
              <IdCard size={14} style={{ color: 'var(--text-muted)' }} />
              {customer.nationalId || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>{i18n.noNationalId}</span>}
            </div>
          </div>
        </div>
        {customer.notes && (
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <StickyNote size={14} />
              {i18n.notes}
            </div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
              {customer.notes}
            </div>
          </div>
        )}
      </div>

      {/* Addresses */}
      <div className="card mb-6">
        <h2 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <MapPin size={18} style={{ color: 'var(--accent-primary)' }} />
          {i18n.addresses}
        </h2>
        {customer.addresses.length === 0 ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {i18n.noAddresses}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {customer.addresses.map(addr => (
              <div
                key={addr.id}
                style={{
                  padding: '1rem',
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-md)',
                  border: addr.isDefault ? '2px solid var(--accent-primary)' : '1px solid var(--border)',
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{addr.label}</div>
                  {addr.isDefault && (
                    <span className="badge badge-active" style={{ fontSize: '0.7rem' }}>{i18n.default}</span>
                  )}
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  {addr.addressLine}
                </div>
                {(addr.city || addr.region) && (
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                    {[addr.city, addr.region].filter(Boolean).join(', ')}
                  </div>
                )}
                {addr.postalCode && (
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    {addr.postalCode} · {addr.country}
                  </div>
                )}
                {addr.notes && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem', fontStyle: 'italic' }}>
                    {addr.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary */}
      <CustomerSummary customerId={id!} lang={lang} />

      {/* Deactivate Modal */}
      {showDeactivateModal && (
        <Modal
          title={i18n.deactivate}
          onClose={() => { setShowDeactivateModal(false); setDeactivateReason(''); setActionError(null); }}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setShowDeactivateModal(false)} disabled={isBusy}>
                {i18n.cancel}
              </button>
              <button
                className="btn"
                style={{ background: 'var(--error)', color: 'white' }}
                onClick={() => deactivateMut.mutate()}
                disabled={isBusy || !deactivateReason.trim()}
              >
                {isBusy ? <span className="spinner" style={{ width: 16, height: 16 }} /> : null}
                {i18n.confirm}
              </button>
            </>
          }
        >
          {actionError && (
            <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'var(--error-bg)', color: 'var(--error)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }}>
              {actionError}
            </div>
          )}
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>{i18n.confirmDeactivate}</p>
          <div className="input-group">
            <label className="input-label">{i18n.deactivateReason}</label>
            <textarea
              className="input-field"
              rows={3}
              placeholder={i18n.reasonPlaceholder}
              value={deactivateReason}
              onChange={e => setDeactivateReason(e.target.value)}
              style={{ resize: 'vertical' }}
            />
          </div>
        </Modal>
      )}

      {/* Reactivate Modal */}
      {showReactivateModal && (
        <Modal
          title={i18n.reactivate}
          onClose={() => { setShowReactivateModal(false); setActionError(null); }}
          footer={
            <>
              <button className="btn btn-outline" onClick={() => setShowReactivateModal(false)} disabled={isBusy}>
                {i18n.cancel}
              </button>
              <button className="btn btn-primary" onClick={() => reactivateMut.mutate()} disabled={isBusy}>
                {isBusy ? <span className="spinner" style={{ width: 16, height: 16 }} /> : null}
                {i18n.confirm}
              </button>
            </>
          }
        >
          {actionError && (
            <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'var(--error-bg)', color: 'var(--error)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }}>
              {actionError}
            </div>
          )}
          <p style={{ color: 'var(--text-secondary)' }}>{i18n.confirmReactivate}</p>
        </Modal>
      )}
    </div>
  );
}
