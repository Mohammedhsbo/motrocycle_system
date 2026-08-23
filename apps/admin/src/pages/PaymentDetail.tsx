import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, CreditCard, AlertCircle, DollarSign, RotateCcw } from 'lucide-react';
import { payments, refunds, type PaymentMethod } from '../api';
import Badge from '../components/Badge';
import Modal from '../components/Modal';

interface Props {
  lang: 'en' | 'ar';
}

const t = {
  en: {
    back: 'Back to Payments',
    payment: 'Payment',
    details: 'Payment Details',
    paymentRef: 'Payment Reference',
    invoice: 'Invoice',
    customer: 'Customer',
    amount: 'Amount',
    method: 'Method',
    status: 'Status',
    date: 'Date',
    confirmedDate: 'Confirmed Date',
    cashReceived: 'Cash Received',
    change: 'Change',
    reference: 'Reference',
    notes: 'Notes',
    noNotes: 'No notes.',
    refunds: 'Refunds',
    refundRef: 'Refund Ref',
    reason: 'Reason',
    noRefunds: 'No refunds issued.',
    actions: 'Actions',
    issueRefund: 'Issue Refund',
    loading: 'Loading…',
    error: 'Failed to load payment.',
    refundTitle: 'Issue Refund',
    refundAmount: 'Refund Amount',
    refundAmountPlaceholder: 'Enter refund amount...',
    maxRefund: 'Maximum refundable',
    refundReason: 'Reason',
    refundReasonPlaceholder: 'Enter reason for refund...',
    refundMethod: 'Refund Method',
    refundNotes: 'Notes (Optional)',
    refundNotesPlaceholder: 'Additional notes...',
    cancel: 'Cancel',
    confirm: 'Issue Refund',
    processing: 'Processing...',
    refundSuccess: 'Refund issued successfully!',
    refundError: 'Failed to issue refund.',
    amountRequired: 'Refund amount is required',
    amountInvalid: 'Invalid refund amount',
    amountTooLarge: 'Refund amount exceeds available balance',
    reasonRequired: 'Refund reason is required',
    cash: 'Cash',
    card: 'Card',
    bank_transfer: 'Bank Transfer',
    cheque: 'Cheque',
    totalRefunded: 'Total Refunded',
    availableForRefund: 'Available for Refund',
  },
  ar: {
    back: 'العودة للدفعات',
    payment: 'دفعة',
    details: 'تفاصيل الدفعة',
    paymentRef: 'رقم الدفعة',
    invoice: 'الفاتورة',
    customer: 'العميل',
    amount: 'المبلغ',
    method: 'الطريقة',
    status: 'الحالة',
    date: 'التاريخ',
    confirmedDate: 'تاريخ التأكيد',
    cashReceived: 'المبلغ المستلم',
    change: 'الباقي',
    reference: 'المرجع',
    notes: 'ملاحظات',
    noNotes: 'لا توجد ملاحظات.',
    refunds: 'الاستردادات',
    refundRef: 'رقم الاسترداد',
    reason: 'السبب',
    noRefunds: 'لم يتم إصدار استردادات.',
    actions: 'الإجراءات',
    issueRefund: 'إصدار استرداد',
    loading: 'جاري التحميل…',
    error: 'فشل تحميل الدفعة.',
    refundTitle: 'إصدار استرداد',
    refundAmount: 'مبلغ الاسترداد',
    refundAmountPlaceholder: 'أدخل مبلغ الاسترداد...',
    maxRefund: 'الحد الأقصى',
    refundReason: 'السبب',
    refundReasonPlaceholder: 'أدخل سبب الاسترداد...',
    refundMethod: 'طريقة الاسترداد',
    refundNotes: 'ملاحظات (اختياري)',
    refundNotesPlaceholder: 'ملاحظات إضافية...',
    cancel: 'إلغاء',
    confirm: 'إصدار الاسترداد',
    processing: 'جاري المعالجة...',
    refundSuccess: 'تم إصدار الاسترداد بنجاح!',
    refundError: 'فشل إصدار الاسترداد.',
    amountRequired: 'مبلغ الاسترداد مطلوب',
    amountInvalid: 'مبلغ الاسترداد غير صالح',
    amountTooLarge: 'مبلغ الاسترداد يتجاوز الرصيد المتاح',
    reasonRequired: 'سبب الاسترداد مطلوب',
    cash: 'نقدي',
    card: 'بطاقة',
    bank_transfer: 'تحويل بنكي',
    cheque: 'شيك',
    totalRefunded: 'إجمالي المسترد',
    availableForRefund: 'المتاح للاسترداد',
  },
};

export default function PaymentDetail({ lang }: Props) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const i18n = t[lang];
  const isRtl = lang === 'ar';

  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refundMethod, setRefundMethod] = useState<PaymentMethod>('cash');
  const [refundNotes, setRefundNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const confirmMutation = useMutation({
    mutationFn: () => payments.confirm(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment', id] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['invoice', payment?.invoiceId] });
    },
  });
  const cancelMutation = useMutation({
    mutationFn: (reason: string) => payments.cancel(id!, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment', id] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['invoice', payment?.invoiceId] });
    },
  });

  const { data: payment, isLoading, isError } = useQuery({
    queryKey: ['payment', id],
    queryFn: () => payments.get(id!),
    enabled: !!id,
  });

  const createRefundMutation = useMutation({
    mutationFn: (data: any) => refunds.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment', id] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['invoice', payment?.invoiceId] });
      setShowRefundModal(false);
      alert(i18n.refundSuccess);
    },
    onError: (error: any) => {
      const message = error.message || i18n.refundError;
      setErrors({ submit: message });
    },
  });

  const formatCurrency = (amount: number) =>
    amount.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-EG', {
      style: 'currency',
      currency: 'EGP',
      maximumFractionDigits: 2,
    });

  const formatDate = (date?: string) =>
    date
      ? new Date(date).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-EG', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '—';

  const getMethodLabel = (method: PaymentMethod) => i18n[method as keyof typeof i18n] as string;

  const calculateTotalRefunded = () => {
    if (!payment?.refunds) return 0;
    return payment.refunds.reduce((sum, r) => sum + r.amount, 0);
  };

  const calculateAvailableForRefund = () => {
    if (!payment) return 0;
    return payment.amount - calculateTotalRefunded();
  };

  const validateRefundForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    const available = calculateAvailableForRefund();

    if (!refundAmount || isNaN(Number(refundAmount)) || Number(refundAmount) <= 0) {
      newErrors.refundAmount = i18n.amountRequired;
    } else if (Number(refundAmount) > available) {
      newErrors.refundAmount = i18n.amountTooLarge;
    }

    if (!refundReason.trim()) {
      newErrors.refundReason = i18n.reasonRequired;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRefundSubmit = () => {
    if (!validateRefundForm() || !payment) return;

    createRefundMutation.mutate({
      paymentId: payment.id,
      amount: Number(refundAmount),
      reason: refundReason,
      method: refundMethod,
      notes: refundNotes || undefined,
    });
  };

  const openRefundModal = () => {
    setRefundAmount(calculateAvailableForRefund().toString());
    setRefundMethod(payment?.method || 'cash');
    setRefundReason('');
    setRefundNotes('');
    setErrors({});
    setShowRefundModal(true);
  };

  if (isLoading) {
    return (
      <div className="page-container center-content">
        <div className="spinner" />
        <span style={{ marginTop: '0.75rem' }}>{i18n.loading}</span>
      </div>
    );
  }

  if (isError || !payment) {
    return (
      <div className="page-container center-content" style={{ color: 'var(--error)' }}>
        <AlertCircle size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
        <span>{i18n.error}</span>
        <button className="btn btn-outline mt-4" onClick={() => navigate('/payments')}>
          {i18n.back}
        </button>
      </div>
    );
  }

  const canRefund = payment.status === 'completed' && calculateAvailableForRefund() > 0;
  const canConfirm = payment.status === 'pending';
  const canCancel = payment.status === 'pending';

  return (
    <div className="page-container" style={{ direction: isRtl ? 'rtl' : 'ltr' }}>
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/payments')}
          className="btn btn-outline"
          style={{ marginBottom: '1rem', padding: '0.375rem 0.75rem', fontSize: '0.875rem' }}
        >
          <ArrowLeft size={16} /> {i18n.back}
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 style={{ marginBottom: '0.5rem' }}>
              {i18n.payment} {payment.paymentReference}
            </h1>
            <Badge status={payment.status} lang={lang} />
          </div>
          <div className="flex gap-2">
            {canConfirm && <button onClick={() => confirmMutation.mutate()} className="btn btn-primary" disabled={confirmMutation.isPending}>Confirm</button>}
            {canCancel && <button onClick={() => { const reason = window.prompt('Reason for cancelling this payment:'); if (reason?.trim()) cancelMutation.mutate(reason.trim()); }} className="btn btn-outline" disabled={cancelMutation.isPending}>Cancel Payment</button>}
            {canRefund && <button onClick={openRefundModal} className="btn btn-primary"><RotateCcw size={16} /> {i18n.issueRefund}</button>}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Details Card */}
          <div className="card">
            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CreditCard size={20} /> {i18n.details}
            </h3>
            <div style={{ display: 'grid', gap: '0.75rem', fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>{i18n.invoice}:</span>
                <Link
                  to={`/invoices/${payment.invoice.id}`}
                  style={{ fontFamily: 'monospace', color: 'var(--accent-primary)', textDecoration: 'underline' }}
                >
                  {payment.invoice.invoiceNumber}
                </Link>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>{i18n.customer}:</span>
                <div style={{ textAlign: isRtl ? 'left' : 'right' }}>
                  <div style={{ fontWeight: 500 }}>{payment.customer.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {payment.customer.phone}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>{i18n.method}:</span>
                <span style={{ fontWeight: 500 }}>{getMethodLabel(payment.method)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>{i18n.date}:</span>
                <span>{formatDate(payment.createdAt)}</span>
              </div>
              {payment.confirmedAt && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{i18n.confirmedDate}:</span>
                  <span>{formatDate(payment.confirmedAt)}</span>
                </div>
              )}
              {payment.method === 'cash' && payment.cashAmountReceived && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{i18n.cashReceived}:</span>
                    <span style={{ fontWeight: 600 }}>{formatCurrency(payment.cashAmountReceived)}</span>
                  </div>
                  {payment.cashChange !== undefined && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>{i18n.change}:</span>
                      <span>{formatCurrency(payment.cashChange)}</span>
                    </div>
                  )}
                </>
              )}
              {payment.reference && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{i18n.reference}:</span>
                  <span style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{payment.reference}</span>
                </div>
              )}
            </div>
            {payment.notes && (
              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                  {i18n.notes}
                </div>
                <div style={{ fontSize: '0.875rem' }}>{payment.notes}</div>
              </div>
            )}
          </div>

          {/* Refunds Card */}
          <div className="card">
            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <RotateCcw size={20} /> {i18n.refunds}
            </h3>
            {!payment.refunds || payment.refunds.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                {i18n.noRefunds}
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {payment.refunds.map((refund) => (
                  <div
                    key={refund.id}
                    style={{
                      padding: '0.75rem',
                      background: 'var(--bg-secondary)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.875rem', fontWeight: 600 }}>
                        {refund.refundReference}
                      </span>
                      <span style={{ fontWeight: 600, color: 'var(--error)' }}>
                        -{formatCurrency(refund.amount)}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                      {i18n.reason}: {refund.reason}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {formatDate(refund.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Summary */}
        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>{i18n.amount}</h3>
          <div style={{ display: 'grid', gap: '0.75rem', fontSize: '0.875rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>{i18n.amount}:</span>
              <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>{formatCurrency(payment.amount)}</span>
            </div>
            {payment.refunds && payment.refunds.length > 0 && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--error)' }}>
                  <span>{i18n.totalRefunded}:</span>
                  <span style={{ fontWeight: 600 }}>-{formatCurrency(calculateTotalRefunded())}</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    paddingTop: '0.75rem',
                    borderTop: '1px solid var(--border)',
                    color: 'var(--success)',
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{i18n.availableForRefund}:</span>
                  <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>
                    {formatCurrency(calculateAvailableForRefund())}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Refund Modal */}
      <Modal isOpen={showRefundModal} onClose={() => setShowRefundModal(false)} title={i18n.refundTitle}>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
            {i18n.refundAmount} *
          </label>
          <input
            type="number"
            step="0.01"
            value={refundAmount}
            onChange={(e) => setRefundAmount(e.target.value)}
            placeholder={i18n.refundAmountPlaceholder}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: 'var(--radius-md)',
              border: `1px solid ${errors.refundAmount ? 'var(--error)' : 'var(--border)'}`,
              background: 'var(--bg-secondary)',
              fontSize: '0.875rem',
            }}
          />
          {errors.refundAmount && (
            <span style={{ display: 'block', marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--error)' }}>
              {errors.refundAmount}
            </span>
          )}
          <span style={{ display: 'block', marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {i18n.maxRefund}: {formatCurrency(calculateAvailableForRefund())}
          </span>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
            {i18n.refundMethod} *
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
            {(['cash', 'card', 'bank_transfer', 'cheque'] as PaymentMethod[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setRefundMethod(m)}
                className="btn"
                style={{
                  padding: '0.5rem',
                  fontSize: '0.85rem',
                  background: refundMethod === m ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                  color: refundMethod === m ? 'white' : 'var(--text-primary)',
                  border: `1px solid ${refundMethod === m ? 'transparent' : 'var(--border)'}`,
                }}
              >
                {getMethodLabel(m)}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
            {i18n.refundReason} *
          </label>
          <textarea
            value={refundReason}
            onChange={(e) => setRefundReason(e.target.value)}
            placeholder={i18n.refundReasonPlaceholder}
            rows={3}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: 'var(--radius-md)',
              border: `1px solid ${errors.refundReason ? 'var(--error)' : 'var(--border)'}`,
              background: 'var(--bg-secondary)',
              fontSize: '0.875rem',
              resize: 'vertical',
            }}
          />
          {errors.refundReason && (
            <span style={{ display: 'block', marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--error)' }}>
              {errors.refundReason}
            </span>
          )}
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
            {i18n.refundNotes}
          </label>
          <textarea
            value={refundNotes}
            onChange={(e) => setRefundNotes(e.target.value)}
            placeholder={i18n.refundNotesPlaceholder}
            rows={2}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              background: 'var(--bg-secondary)',
              fontSize: '0.875rem',
              resize: 'vertical',
            }}
          />
        </div>

        {errors.submit && (
          <div
            style={{
              marginBottom: '1rem',
              padding: '0.75rem',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid var(--error)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--error)',
              fontSize: '0.875rem',
            }}
          >
            {errors.submit}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button
            onClick={() => setShowRefundModal(false)}
            className="btn btn-outline"
            disabled={createRefundMutation.isPending}
          >
            {i18n.cancel}
          </button>
          <button
            onClick={handleRefundSubmit}
            className="btn"
            style={{ background: 'var(--error)', color: 'white' }}
            disabled={createRefundMutation.isPending}
          >
            {createRefundMutation.isPending ? i18n.processing : i18n.confirm}
          </button>
        </div>
      </Modal>
    </div>
  );
}
