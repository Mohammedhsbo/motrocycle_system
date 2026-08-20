import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, XCircle, CheckCircle, Loader2 } from 'lucide-react';
import { reservations, type ReservationDetail } from '../api';
import Modal from './Modal';

interface ReservationActionsProps {
  lang: 'en' | 'ar';
  reservation: ReservationDetail;
  onSuccess?: () => void;
}

const t = {
  en: {
    extend: 'Extend Expiration',
    cancel: 'Cancel Reservation',
    convert: 'Convert to Order',
    extendTitle: 'Extend Reservation',
    extendDesc: 'Set a new expiration date for this reservation',
    newExpirationDate: 'New Expiration Date',
    reasonOptional: 'Reason (optional)',
    reasonRequired: 'Reason (required)',
    notesOptional: 'Notes (optional)',
    cancelTitle: 'Cancel Reservation',
    cancelDesc: 'Are you sure you want to cancel this reservation? The motorcycle will become available again.',
    cancelWarning: 'This action cannot be undone.',
    convertTitle: 'Convert to Order',
    convertDesc: 'This will create a sales order and mark the motorcycle as sold.',
    convertWarning: 'Make sure payment has been received before converting.',
    submit: 'Submit',
    cancel_action: 'Cancel',
    processing: 'Processing…',
    currentExpiration: 'Current Expiration',
    depositPaid: 'Deposit Paid',
    remainingAmount: 'Remaining Amount',
  },
  ar: {
    extend: 'تمديد الصلاحية',
    cancel: 'إلغاء الحجز',
    convert: 'تحويل إلى طلب',
    extendTitle: 'تمديد الحجز',
    extendDesc: 'تعيين تاريخ صلاحية جديد لهذا الحجز',
    newExpirationDate: 'تاريخ الصلاحية الجديد',
    reasonOptional: 'السبب (اختياري)',
    reasonRequired: 'السبب (مطلوب)',
    notesOptional: 'ملاحظات (اختيارية)',
    cancelTitle: 'إلغاء الحجز',
    cancelDesc: 'هل أنت متأكد من إلغاء هذا الحجز؟ ستصبح الدراجة متاحة مرة أخرى.',
    cancelWarning: 'لا يمكن التراجع عن هذا الإجراء.',
    convertTitle: 'التحويل إلى طلب',
    convertDesc: 'سيتم إنشاء طلب بيع وتحديد حالة الدراجة كمباعة.',
    convertWarning: 'تأكد من استلام الدفعة قبل التحويل.',
    submit: 'إرسال',
    cancel_action: 'إلغاء',
    processing: 'جاري المعالجة…',
    currentExpiration: 'الصلاحية الحالية',
    depositPaid: 'العربون المدفوع',
    remainingAmount: 'المبلغ المتبقي',
  },
};

export default function ReservationActions({ lang, reservation, onSuccess }: ReservationActionsProps) {
  const i18n = t[lang];
  const isRtl = lang === 'ar';
  const queryClient = useQueryClient();

  const [extendModal, setExtendModal] = useState(false);
  const [cancelModal, setCancelModal] = useState(false);
  const [convertModal, setConvertModal] = useState(false);

  const [newExpiresAt, setNewExpiresAt] = useState('');
  const [extendReason, setExtendReason] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [convertNotes, setConvertNotes] = useState('');

  const extendMutation = useMutation({
    mutationFn: () => reservations.extend(reservation.id, newExpiresAt, extendReason || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['reservation', reservation.id] });
      setExtendModal(false);
      setNewExpiresAt('');
      setExtendReason('');
      onSuccess?.();
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => reservations.cancel(reservation.id, cancelReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['reservation', reservation.id] });
      setCancelModal(false);
      setCancelReason('');
      onSuccess?.();
    },
  });

  const convertMutation = useMutation({
    mutationFn: () => reservations.convert(reservation.id, convertNotes || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['reservation', reservation.id] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setConvertModal(false);
      setConvertNotes('');
      onSuccess?.();
    },
  });

  const formatCurrency = (amount: number) => {
    return Number(amount).toLocaleString('en', {
      style: 'currency',
      currency: 'SAR',
      maximumFractionDigits: 0,
    });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getMinExpirationDate = () => {
    if (!reservation.expiresAt) return '';
    const currentExpiration = new Date(reservation.expiresAt);
    currentExpiration.setDate(currentExpiration.getDate() + 1);
    return currentExpiration.toISOString().split('T')[0];
  };

  const canExtend = reservation.status === 'active';
  const canCancel = reservation.status === 'active';
  const canConvert = reservation.status === 'active' && (!reservation.expiresAt || new Date(reservation.expiresAt) > new Date());

  return (
    <div style={{ direction: isRtl ? 'rtl' : 'ltr' }}>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        {canExtend && (
          <button onClick={() => setExtendModal(true)} className="btn btn-primary" style={{ fontSize: '0.875rem' }}>
            <Calendar size={16} />
            {i18n.extend}
          </button>
        )}
        {canConvert && (
          <button onClick={() => setConvertModal(true)} className="btn" style={{ fontSize: '0.875rem', backgroundColor: '#10b981', color: '#fff', border: 'none' }}>
            <CheckCircle size={16} />
            {i18n.convert}
          </button>
        )}
        {canCancel && (
          <button onClick={() => setCancelModal(true)} className="btn" style={{ fontSize: '0.875rem', backgroundColor: '#ef4444', color: '#fff', border: 'none' }}>
            <XCircle size={16} />
            {i18n.cancel}
          </button>
        )}
      </div>

      {/* Extend Modal */}
      {extendModal && (
        <Modal title={i18n.extendTitle} onClose={() => !extendMutation.isPending && setExtendModal(false)}>
          <div style={{ direction: isRtl ? 'rtl' : 'ltr' }}>
            <p style={{ marginBottom: '1.25rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              {i18n.extendDesc}
            </p>

            {reservation.expiresAt && (
              <div style={{ marginBottom: '1rem' }}>
                <label className="label">{i18n.currentExpiration}</label>
                <div style={{ padding: '0.625rem 0.75rem', backgroundColor: 'var(--bg-muted)', borderRadius: 'var(--radius)', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  {formatDate(reservation.expiresAt)}
                </div>
              </div>
            )}

            <div style={{ marginBottom: '1rem' }}>
              <label className="label">{i18n.newExpirationDate} *</label>
              <input
                type="date"
                value={newExpiresAt}
                onChange={(e) => setNewExpiresAt(e.target.value)}
                min={getMinExpirationDate()}
                className="input"
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label className="label">{i18n.reasonOptional}</label>
              <textarea
                value={extendReason}
                onChange={(e) => setExtendReason(e.target.value)}
                rows={3}
                className="input"
                style={{ width: '100%', resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setExtendModal(false)} disabled={extendMutation.isPending} className="btn btn-outline" style={{ fontSize: '0.875rem' }}>
                {i18n.cancel_action}
              </button>
              <button
                onClick={() => extendMutation.mutate()}
                disabled={!newExpiresAt || extendMutation.isPending}
                className="btn btn-primary"
                style={{ fontSize: '0.875rem' }}
              >
                {extendMutation.isPending && <Loader2 size={14} className="spinner" />}
                {extendMutation.isPending ? i18n.processing : i18n.submit}
              </button>
            </div>

            {extendMutation.isError && (
              <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius)', color: '#dc2626', fontSize: '0.875rem' }}>
                {(extendMutation.error as Error).message}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Cancel Modal */}
      {cancelModal && (
        <Modal title={i18n.cancelTitle} onClose={() => !cancelMutation.isPending && setCancelModal(false)}>
          <div style={{ direction: isRtl ? 'rtl' : 'ltr' }}>
            <p style={{ marginBottom: '0.75rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              {i18n.cancelDesc}
            </p>
            <p style={{ marginBottom: '1.25rem', color: '#dc2626', fontSize: '0.8125rem', fontWeight: 600 }}>
              {i18n.cancelWarning}
            </p>

            <div style={{ marginBottom: '1.25rem' }}>
              <label className="label">{i18n.reasonRequired} *</label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
                placeholder={i18n.reasonRequired}
                className="input"
                style={{ width: '100%', resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setCancelModal(false)} disabled={cancelMutation.isPending} className="btn btn-outline" style={{ fontSize: '0.875rem' }}>
                {i18n.cancel_action}
              </button>
              <button
                onClick={() => cancelMutation.mutate()}
                disabled={!cancelReason.trim() || cancelMutation.isPending}
                className="btn"
                style={{ fontSize: '0.875rem', backgroundColor: '#ef4444', color: '#fff', border: 'none' }}
              >
                {cancelMutation.isPending && <Loader2 size={14} className="spinner" />}
                {cancelMutation.isPending ? i18n.processing : i18n.submit}
              </button>
            </div>

            {cancelMutation.isError && (
              <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius)', color: '#dc2626', fontSize: '0.875rem' }}>
                {(cancelMutation.error as Error).message}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Convert Modal */}
      {convertModal && (
        <Modal title={i18n.convertTitle} onClose={() => !convertMutation.isPending && setConvertModal(false)}>
          <div style={{ direction: isRtl ? 'rtl' : 'ltr' }}>
            <p style={{ marginBottom: '0.75rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              {i18n.convertDesc}
            </p>
            <p style={{ marginBottom: '1.25rem', color: '#d97706', fontSize: '0.8125rem', fontWeight: 600 }}>
              {i18n.convertWarning}
            </p>

            <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: 'var(--bg-muted)', borderRadius: 'var(--radius)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{i18n.depositPaid}</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#10b981' }}>{formatCurrency(reservation.depositAmount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{i18n.remainingAmount}</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#3b82f6' }}>{formatCurrency(reservation.remainingAmount)}</span>
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label className="label">{i18n.notesOptional}</label>
              <textarea
                value={convertNotes}
                onChange={(e) => setConvertNotes(e.target.value)}
                rows={3}
                className="input"
                style={{ width: '100%', resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setConvertModal(false)} disabled={convertMutation.isPending} className="btn btn-outline" style={{ fontSize: '0.875rem' }}>
                {i18n.cancel_action}
              </button>
              <button
                onClick={() => convertMutation.mutate()}
                disabled={convertMutation.isPending}
                className="btn"
                style={{ fontSize: '0.875rem', backgroundColor: '#10b981', color: '#fff', border: 'none' }}
              >
                {convertMutation.isPending && <Loader2 size={14} className="spinner" />}
                {convertMutation.isPending ? i18n.processing : i18n.submit}
              </button>
            </div>

            {convertMutation.isError && (
              <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius)', color: '#dc2626', fontSize: '0.875rem' }}>
                {(convertMutation.error as Error).message}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
