import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CreditCard, DollarSign, AlertCircle } from 'lucide-react';
import { payments, invoices, type PaymentMethod } from '../api';

interface Props {
  lang: 'en' | 'ar';
}

const t = {
  en: {
    back: 'Back',
    title: 'Record Payment',
    subtitle: 'Record a new payment for an invoice',
    invoice: 'Invoice',
    selectInvoice: 'Select invoice...',
    invoiceNotFound: 'Invoice not found',
    customer: 'Customer',
    totalAmount: 'Total Amount',
    paidAmount: 'Paid Amount',
    remainingAmount: 'Remaining Amount',
    paymentDetails: 'Payment Details',
    paymentAmount: 'Payment Amount',
    paymentAmountPlaceholder: 'Enter amount...',
    paymentMethod: 'Payment Method',
    cash: 'Cash',
    card: 'Card',
    bank_transfer: 'Bank Transfer',
    cheque: 'Cheque',
    cashDetails: 'Cash Details',
    amountReceived: 'Amount Received',
    change: 'Change',
    reference: 'Reference (Optional)',
    referencePlaceholder: 'Payment reference or transaction ID...',
    notes: 'Notes (Optional)',
    notesPlaceholder: 'Additional notes...',
    submit: 'Record Payment',
    cancel: 'Cancel',
    loading: 'Loading...',
    processing: 'Processing...',
    success: 'Payment recorded successfully!',
    error: 'Failed to record payment.',
    invalidAmount: 'Invalid payment amount',
    amountTooLarge: 'Payment amount exceeds remaining balance',
    amountRequired: 'Payment amount is required',
    cashReceivedRequired: 'Amount received is required for cash payments',
    cashReceivedTooLow: 'Amount received must be greater than or equal to payment amount',
    methodRequired: 'Payment method is required',
  },
  ar: {
    back: 'رجوع',
    title: 'تسجيل دفعة',
    subtitle: 'تسجيل دفعة جديدة لفاتورة',
    invoice: 'الفاتورة',
    selectInvoice: 'اختر فاتورة...',
    invoiceNotFound: 'الفاتورة غير موجودة',
    customer: 'العميل',
    totalAmount: 'المبلغ الإجمالي',
    paidAmount: 'المبلغ المدفوع',
    remainingAmount: 'المبلغ المتبقي',
    paymentDetails: 'تفاصيل الدفعة',
    paymentAmount: 'مبلغ الدفعة',
    paymentAmountPlaceholder: 'أدخل المبلغ...',
    paymentMethod: 'طريقة الدفع',
    cash: 'نقدي',
    card: 'بطاقة',
    bank_transfer: 'تحويل بنكي',
    cheque: 'شيك',
    cashDetails: 'تفاصيل النقد',
    amountReceived: 'المبلغ المستلم',
    change: 'الباقي',
    reference: 'المرجع (اختياري)',
    referencePlaceholder: 'مرجع الدفع أو رقم المعاملة...',
    notes: 'ملاحظات (اختياري)',
    notesPlaceholder: 'ملاحظات إضافية...',
    submit: 'تسجيل الدفعة',
    cancel: 'إلغاء',
    loading: 'جاري التحميل...',
    processing: 'جاري المعالجة...',
    success: 'تم تسجيل الدفعة بنجاح!',
    error: 'فشل تسجيل الدفعة.',
    invalidAmount: 'مبلغ الدفعة غير صالح',
    amountTooLarge: 'مبلغ الدفعة يتجاوز المبلغ المتبقي',
    amountRequired: 'مبلغ الدفعة مطلوب',
    cashReceivedRequired: 'المبلغ المستلم مطلوب للدفع النقدي',
    cashReceivedTooLow: 'المبلغ المستلم يجب أن يكون أكبر من أو يساوي مبلغ الدفعة',
    methodRequired: 'طريقة الدفع مطلوبة',
  },
};

export default function PaymentForm({ lang }: Props) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const invoiceId = searchParams.get('invoiceId');
  const i18n = t[lang];
  const isRtl = lang === 'ar';

  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [cashReceived, setCashReceived] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: () => invoices.get(invoiceId!),
    enabled: !!invoiceId,
  });

  // Auto-fill remaining amount when invoice loads
  useEffect(() => {
    if (invoice && !amount) {
      setAmount(invoice.remainingAmount.toString());
    }
  }, [invoice]);

  const createPaymentMutation = useMutation({
    mutationFn: (data: any) => payments.create(data),
    onSuccess: (payment) => {
      queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      alert(i18n.success);
      navigate(`/payments/${payment.id}`);
    },
    onError: (error: any) => {
      const message = error.message || i18n.error;
      setErrors({ submit: message });
    },
  });

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      newErrors.amount = i18n.amountRequired;
    }

    if (!method) {
      newErrors.method = i18n.methodRequired;
    }

    if (method === 'cash') {
      if (!cashReceived || isNaN(Number(cashReceived)) || Number(cashReceived) <= 0) {
        newErrors.cashReceived = i18n.cashReceivedRequired;
      } else if (Number(cashReceived) < Number(amount)) {
        newErrors.cashReceived = i18n.cashReceivedTooLow;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !invoice) return;

    const paymentAmount = Number(amount);
    const idempotencyKey = `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const paymentData: any = {
      idempotencyKey,
      invoiceId: invoice.id,
      amount: paymentAmount,
      method,
      reference: reference || undefined,
      notes: notes || undefined,
    };

    if (method === 'cash' && cashReceived) {
      const received = Number(cashReceived);
      paymentData.cashDetails = {
        amountReceived: received,
        change: received - paymentAmount,
      };
    }

    createPaymentMutation.mutate(paymentData);
  };

  const formatCurrency = (amount: number) =>
    amount.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-EG', {
      style: 'currency',
      currency: 'EGP',
      maximumFractionDigits: 2,
    });

  const calculateChange = () => {
    if (method === 'cash' && cashReceived && amount) {
      const change = Number(cashReceived) - Number(amount);
      return change >= 0 ? change : 0;
    }
    return 0;
  };

  if (isLoading) {
    return (
      <div className="page-container center-content">
        <div className="spinner" />
        <span style={{ marginTop: '0.75rem' }}>{i18n.loading}</span>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="page-container center-content" style={{ color: 'var(--error)' }}>
        <AlertCircle size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
        <span>{i18n.invoiceNotFound}</span>
        <button className="btn btn-outline mt-4" onClick={() => navigate('/invoices')}>
          {i18n.back}
        </button>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ direction: isRtl ? 'rtl' : 'ltr', maxWidth: '800px', margin: '0 auto' }}>
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate(`/invoices/${invoice.id}`)}
          className="btn btn-outline"
          style={{ marginBottom: '1rem', padding: '0.375rem 0.75rem', fontSize: '0.875rem' }}
        >
          <ArrowLeft size={16} /> {i18n.back}
        </button>
        <h1 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <CreditCard size={28} /> {i18n.title}
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{i18n.subtitle}</p>
      </div>

      {/* Invoice Summary Card */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>
          {i18n.invoice}: {invoice.invoiceNumber}
        </h3>
        <div style={{ display: 'grid', gap: '0.75rem', fontSize: '0.875rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>{i18n.customer}:</span>
            <span style={{ fontWeight: 500 }}>{invoice.customer.name}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)' }}>{i18n.totalAmount}:</span>
            <span style={{ fontWeight: 600 }}>{formatCurrency(invoice.totalAmount)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--success)' }}>
            <span>{i18n.paidAmount}:</span>
            <span style={{ fontWeight: 600 }}>{formatCurrency(invoice.paidAmount)}</span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              paddingTop: '0.75rem',
              borderTop: '1px solid var(--border)',
              color: 'var(--warning)',
            }}
          >
            <span style={{ fontWeight: 600 }}>{i18n.remainingAmount}:</span>
            <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>
              {formatCurrency(invoice.remainingAmount)}
            </span>
          </div>
        </div>
      </div>

      {/* Payment Form */}
      <form onSubmit={handleSubmit}>
        <div className="card">
          <h3 style={{ marginBottom: '1.5rem' }}>{i18n.paymentDetails}</h3>

          {/* Payment Amount */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
              {i18n.paymentAmount} *
            </label>
            <div style={{ position: 'relative' }}>
              <DollarSign
                size={18}
                style={{
                  position: 'absolute',
                  left: isRtl ? 'auto' : '0.75rem',
                  right: isRtl ? '0.75rem' : 'auto',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={i18n.paymentAmountPlaceholder}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  paddingLeft: isRtl ? '0.75rem' : '2.5rem',
                  paddingRight: isRtl ? '2.5rem' : '0.75rem',
                  borderRadius: 'var(--radius-md)',
                  border: `1px solid ${errors.amount ? 'var(--error)' : 'var(--border)'}`,
                  background: 'var(--bg-secondary)',
                  fontSize: '0.875rem',
                }}
              />
            </div>
            {errors.amount && (
              <span style={{ display: 'block', marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--error)' }}>
                {errors.amount}
              </span>
            )}
          </div>

          {/* Payment Method */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
              {i18n.paymentMethod} *
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
              {(['cash', 'card', 'bank_transfer', 'cheque'] as PaymentMethod[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  className="btn"
                  style={{
                    padding: '0.75rem',
                    background: method === m ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                    color: method === m ? 'white' : 'var(--text-primary)',
                    border: `1px solid ${method === m ? 'transparent' : 'var(--border)'}`,
                  }}
                >
                  {i18n[m as keyof typeof i18n] as string}
                </button>
              ))}
            </div>
            {errors.method && (
              <span style={{ display: 'block', marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--error)' }}>
                {errors.method}
              </span>
            )}
          </div>

          {/* Cash Details */}
          {method === 'cash' && (
            <div
              style={{
                marginBottom: '1.25rem',
                padding: '1rem',
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <h4 style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>{i18n.cashDetails}</h4>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                  {i18n.amountReceived} *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: `1px solid ${errors.cashReceived ? 'var(--error)' : 'var(--border)'}`,
                    background: 'var(--bg-primary)',
                    fontSize: '0.875rem',
                  }}
                />
                {errors.cashReceived && (
                  <span style={{ display: 'block', marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--error)' }}>
                    {errors.cashReceived}
                  </span>
                )}
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '0.75rem',
                  background: 'var(--bg-primary)',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 600,
                }}
              >
                <span>{i18n.change}:</span>
                <span style={{ fontSize: '1.1rem', color: 'var(--accent-primary)' }}>
                  {formatCurrency(calculateChange())}
                </span>
              </div>
            </div>
          )}

          {/* Reference */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
              {i18n.reference}
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder={i18n.referencePlaceholder}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                background: 'var(--bg-secondary)',
                fontSize: '0.875rem',
              }}
            />
          </div>

          {/* Notes */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
              {i18n.notes}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={i18n.notesPlaceholder}
              rows={3}
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

          {/* Error Message */}
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

          {/* Actions */}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => navigate(`/invoices/${invoice.id}`)}
              className="btn btn-outline"
              disabled={createPaymentMutation.isPending}
            >
              {i18n.cancel}
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={createPaymentMutation.isPending}
              style={{ minWidth: '150px' }}
            >
              {createPaymentMutation.isPending ? i18n.processing : i18n.submit}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
