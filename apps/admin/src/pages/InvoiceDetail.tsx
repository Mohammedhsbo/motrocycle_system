import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  User,
  Building2,
  Calendar,
  CheckCircle,
  XCircle,
  CreditCard,
  AlertCircle,
  Printer,
} from 'lucide-react';
import { invoices, payments, type InvoiceStatus, type PaymentMethod } from '../api';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import PrintableInvoice from '../components/PrintableInvoice';

interface Props {
  lang: 'en' | 'ar';
}

const t = {
  en: {
    back: 'Back to Invoices',
    invoice: 'Invoice',
    details: 'Invoice Details',
    customer: 'Customer',
    branch: 'Branch',
    issueDate: 'Issue Date',
    dueDate: 'Due Date',
    status: 'Status',
    items: 'Items',
    item: 'Item',
    quantity: 'Qty',
    unitPrice: 'Unit Price',
    discount: 'Discount',
    total: 'Total',
    summary: 'Summary',
    subtotal: 'Subtotal',
    totalAmount: 'Total Amount',
    paidAmount: 'Paid Amount',
    remainingAmount: 'Remaining Amount',
    payments: 'Payment History',
    paymentRef: 'Payment Ref',
    method: 'Method',
    amount: 'Amount',
    date: 'Date',
    noPayments: 'No payments recorded yet.',
    actions: 'Actions',
    issueInvoice: 'Issue Invoice',
    recordPayment: 'Record Payment',
    cancelInvoice: 'Cancel Invoice',
    print: 'Print Invoice',
    loading: 'Loading…',
    error: 'Failed to load invoice.',
    notFound: 'Invoice not found.',
    issueConfirm: 'Issue this invoice?',
    issueDesc: 'The invoice will be sent to the customer and payment can be recorded.',
    cancel: 'Cancel',
    confirm: 'Confirm',
    cancelReason: 'Cancellation Reason',
    cancelReasonPlaceholder: 'Enter reason for cancellation...',
    cancelConfirm: 'Cancel Invoice?',
    cancelDesc: 'This action cannot be undone. The invoice will be permanently cancelled.',
    issueSuccess: 'Invoice issued successfully.',
    cancelSuccess: 'Invoice cancelled successfully.',
    notes: 'Notes',
    noNotes: 'No notes.',
    cash: 'Cash',
    card: 'Card',
    bank_transfer: 'Bank Transfer',
    cheque: 'Cheque',
    vin: 'VIN',
    model: 'Model',
    year: 'Year',
    color: 'Color',
    relatedOrder: 'Related Order',
    relatedReservation: 'Related Reservation',
  },
  ar: {
    back: 'العودة للفواتير',
    invoice: 'فاتورة',
    details: 'تفاصيل الفاتورة',
    customer: 'العميل',
    branch: 'الفرع',
    issueDate: 'تاريخ الإصدار',
    dueDate: 'تاريخ الاستحقاق',
    status: 'الحالة',
    items: 'العناصر',
    item: 'العنصر',
    quantity: 'الكمية',
    unitPrice: 'سعر الوحدة',
    discount: 'الخصم',
    total: 'الإجمالي',
    summary: 'الملخص',
    subtotal: 'المجموع الفرعي',
    totalAmount: 'المبلغ الإجمالي',
    paidAmount: 'المبلغ المدفوع',
    remainingAmount: 'المبلغ المتبقي',
    payments: 'سجل الدفعات',
    paymentRef: 'مرجع الدفع',
    method: 'الطريقة',
    amount: 'المبلغ',
    date: 'التاريخ',
    noPayments: 'لم يتم تسجيل دفعات بعد.',
    actions: 'الإجراءات',
    issueInvoice: 'إصدار الفاتورة',
    recordPayment: 'تسجيل دفعة',
    cancelInvoice: 'إلغاء الفاتورة',
    print: 'طباعة الفاتورة',
    loading: 'جاري التحميل…',
    error: 'فشل تحميل الفاتورة.',
    notFound: 'الفاتورة غير موجودة.',
    issueConfirm: 'إصدار هذه الفاتورة؟',
    issueDesc: 'سيتم إرسال الفاتورة للعميل ويمكن تسجيل الدفعات.',
    cancel: 'إلغاء',
    confirm: 'تأكيد',
    cancelReason: 'سبب الإلغاء',
    cancelReasonPlaceholder: 'أدخل سبب الإلغاء...',
    cancelConfirm: 'إلغاء الفاتورة؟',
    cancelDesc: 'لا يمكن التراجع عن هذا الإجراء. سيتم إلغاء الفاتورة نهائيًا.',
    issueSuccess: 'تم إصدار الفاتورة بنجاح.',
    cancelSuccess: 'تم إلغاء الفاتورة بنجاح.',
    notes: 'ملاحظات',
    noNotes: 'لا توجد ملاحظات.',
    cash: 'نقدي',
    card: 'بطاقة',
    bank_transfer: 'تحويل بنكي',
    cheque: 'شيك',
    vin: 'رقم الهيكل',
    model: 'الموديل',
    year: 'السنة',
    color: 'اللون',
    relatedOrder: 'الطلب المرتبط',
    relatedReservation: 'الحجز المرتبط',
  },
};

export default function InvoiceDetail({ lang }: Props) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const i18n = t[lang];
  const isRtl = lang === 'ar';

  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showPrintView, setShowPrintView] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const { data: invoice, isLoading, isError } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => invoices.get(id!),
    enabled: !!id,
  });

  const issueMutation = useMutation({
    mutationFn: () => invoices.issue(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', id] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setShowIssueModal(false);
      alert(i18n.issueSuccess);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => invoices.cancel(id!, cancelReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', id] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setShowCancelModal(false);
      alert(i18n.cancelSuccess);
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
        })
      : '—';

  const getPaymentMethodLabel = (method: PaymentMethod) => {
    const labels: Record<PaymentMethod, string> = {
      cash: i18n.cash,
      card: i18n.card,
      bank_transfer: i18n.bank_transfer,
      cheque: i18n.cheque,
    };
    return labels[method] || method;
  };

  if (isLoading) {
    return (
      <div className="page-container center-content">
        <div className="spinner" />
        <span style={{ marginTop: '0.75rem' }}>{i18n.loading}</span>
      </div>
    );
  }

  if (isError || !invoice) {
    return (
      <div className="page-container center-content" style={{ color: 'var(--error)' }}>
        <AlertCircle size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
        <span>{i18n.error}</span>
        <button className="btn btn-outline mt-4" onClick={() => navigate('/invoices')}>
          {i18n.back}
        </button>
      </div>
    );
  }

  const canIssue = invoice.status === 'draft';
  const canCancel = invoice.status === 'draft' || invoice.status === 'issued';
  const canRecordPayment =
    invoice.status === 'issued' ||
    invoice.status === 'partially_paid' ||
    invoice.status === 'overpaid';

  return (
    <div className="page-container" style={{ direction: isRtl ? 'rtl' : 'ltr' }}>
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/invoices')}
          className="btn btn-outline"
          style={{ marginBottom: '1rem', padding: '0.375rem 0.75rem', fontSize: '0.875rem' }}
        >
          <ArrowLeft size={16} /> {i18n.back}
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 style={{ marginBottom: '0.5rem' }}>
              {i18n.invoice} {invoice.invoiceNumber}
            </h1>
            <Badge status={invoice.status} lang={lang} />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowPrintView(true)}
              className="btn btn-outline"
              style={{ color: 'var(--primary)' }}
            >
              <Printer size={16} /> {i18n.print}
            </button>
            {canIssue && (
              <button
                onClick={() => setShowIssueModal(true)}
                className="btn btn-primary"
                disabled={issueMutation.isPending}
              >
                <CheckCircle size={16} /> {i18n.issueInvoice}
              </button>
            )}
            {canRecordPayment && (
              <Link to={`/payments/new?invoiceId=${invoice.id}`} className="btn btn-primary">
                <CreditCard size={16} /> {i18n.recordPayment}
              </Link>
            )}
            {canCancel && (
              <button
                onClick={() => setShowCancelModal(true)}
                className="btn btn-outline"
                style={{ color: 'var(--error)' }}
                disabled={cancelMutation.isPending}
              >
                <XCircle size={16} /> {i18n.cancelInvoice}
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Details Card */}
          <div className="card">
            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={20} /> {i18n.details}
            </h3>
            <div style={{ display: 'grid', gap: '0.75rem', fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>{i18n.customer}:</span>
                <div style={{ textAlign: isRtl ? 'left' : 'right' }}>
                  <div style={{ fontWeight: 500 }}>{invoice.customer.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {invoice.customer.phone}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>{i18n.branch}:</span>
                <span style={{ fontWeight: 500 }}>
                  {lang === 'ar' ? invoice.branch.nameAr : invoice.branch.nameEn}
                </span>
              </div>
              {invoice.address && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{lang === 'ar' ? 'العنوان' : 'Address'}:</span>
                  <span style={{ fontWeight: 500, textAlign: isRtl ? 'left' : 'right' }}>{invoice.address}</span>
                </div>
              )}
              {invoice.issueDate && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{i18n.issueDate}:</span>
                  <span>{formatDate(invoice.issueDate)}</span>
                </div>
              )}
              {invoice.dueDate && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{i18n.dueDate}:</span>
                  <span>{formatDate(invoice.dueDate)}</span>
                </div>
              )}
              {invoice.order && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{i18n.relatedOrder}:</span>
                  <Link
                    to={`/orders/${invoice.order.id}`}
                    style={{ color: 'var(--accent-primary)', textDecoration: 'underline' }}
                  >
                    {invoice.order.orderNumber}
                  </Link>
                </div>
              )}
              {invoice.reservation && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{i18n.relatedReservation}:</span>
                  <span style={{ fontFamily: 'monospace' }}>
                    {invoice.reservation.reservationNumber}
                  </span>
                </div>
              )}
            </div>
            {invoice.notes && (
              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                  {i18n.notes}
                </div>
                <div style={{ fontSize: '0.875rem' }}>{invoice.notes}</div>
              </div>
            )}
          </div>

          {/* Summary Card */}
          <div className="card">
            <h3 style={{ marginBottom: '1rem' }}>{i18n.summary}</h3>
            <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{i18n.totalAmount}:</span>
                <span style={{ fontWeight: 600, fontSize: '1rem' }}>
                  {formatCurrency(invoice.totalAmount)}
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  color: 'var(--success)',
                }}
              >
                <span>{i18n.paidAmount}:</span>
                <span style={{ fontWeight: 600 }}>{formatCurrency(invoice.paidAmount)}</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingTop: '0.5rem',
                  borderTop: '1px solid var(--border)',
                  color: invoice.remainingAmount > 0 ? 'var(--warning)' : 'var(--text-muted)',
                }}
              >
                <span style={{ fontWeight: 600 }}>{i18n.remainingAmount}:</span>
                <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>
                  {formatCurrency(invoice.remainingAmount)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Items Card */}
          <div className="card">
            <h3 style={{ marginBottom: '1rem' }}>{i18n.items}</h3>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {invoice.items.map((item) => (
                <div
                  key={item.id}
                  style={{
                    padding: '0.75rem',
                    background: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.875rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                        {item.motorcycle
                          ? `${lang === 'ar' ? item.motorcycle.brand.nameAr : item.motorcycle.brand.nameEn} ${item.motorcycle.model}`
                          : item.description}
                      </div>
                      {item.motorcycle && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {i18n.vin}: {item.motorcycle.vin} • {item.motorcycle.year}
                          {item.motorcycle.color && ` • ${item.motorcycle.color}`}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: isRtl ? 'left' : 'right', fontWeight: 600 }}>
                      {formatCurrency(item.totalPrice)}
                    </div>
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr 1fr',
                      gap: '0.5rem',
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                    }}
                  >
                    <div>
                      {i18n.quantity}: {item.quantity}
                    </div>
                    <div>
                      {i18n.unitPrice}: {formatCurrency(item.unitPrice)}
                    </div>
                    <div>
                      {i18n.discount}: {formatCurrency(item.discount)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment History Card */}
          <div className="card">
            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CreditCard size={20} /> {i18n.payments}
            </h3>
            {!invoice.payments || invoice.payments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                {i18n.noPayments}
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {invoice.payments.map((payment) => (
                  <Link
                    key={payment.id}
                    to={`/payments/${payment.id}`}
                    style={{
                      display: 'block',
                      padding: '0.75rem',
                      background: 'var(--bg-secondary)',
                      borderRadius: 'var(--radius-md)',
                      textDecoration: 'none',
                      border: '1px solid transparent',
                      transition: 'var(--transition)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--accent-primary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'transparent';
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.875rem', fontWeight: 600 }}>
                        {payment.paymentReference}
                      </span>
                      <Badge status={payment.status} lang={lang} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>
                        {getPaymentMethodLabel(payment.method)}
                      </span>
                      <span style={{ fontWeight: 600 }}>{formatCurrency(payment.amount)}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      {formatDate(payment.createdAt)}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showPrintView && (
        <Modal isOpen={showPrintView} onClose={() => setShowPrintView(false)} title={i18n.print}>
          <PrintableInvoice invoice={invoice} lang={lang} />
          <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <button onClick={() => setShowPrintView(false)} className="btn btn-outline">
              {i18n.cancel}
            </button>
            <button onClick={() => window.print()} className="btn btn-primary">
              <Printer size={16} /> {i18n.print}
            </button>
          </div>
        </Modal>
      )}

      {/* Issue Modal */}
      <Modal isOpen={showIssueModal} onClose={() => setShowIssueModal(false)} title={i18n.issueConfirm}>
        <p style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>{i18n.issueDesc}</p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button onClick={() => setShowIssueModal(false)} className="btn btn-outline">
            {i18n.cancel}
          </button>
          <button
            onClick={() => issueMutation.mutate()}
            className="btn btn-primary"
            disabled={issueMutation.isPending}
          >
            {i18n.confirm}
          </button>
        </div>
      </Modal>

      {/* Cancel Modal */}
      <Modal isOpen={showCancelModal} onClose={() => setShowCancelModal(false)} title={i18n.cancelConfirm}>
        <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>{i18n.cancelDesc}</p>
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
            {i18n.cancelReason}
          </label>
          <textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder={i18n.cancelReasonPlaceholder}
            rows={3}
            style={{
              width: '100%',
              padding: '0.5rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              background: 'var(--bg-secondary)',
              fontSize: '0.875rem',
              resize: 'vertical',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button onClick={() => setShowCancelModal(false)} className="btn btn-outline">
            {i18n.cancel}
          </button>
          <button
            onClick={() => cancelMutation.mutate()}
            className="btn"
            style={{ background: 'var(--error)', color: 'white' }}
            disabled={cancelMutation.isPending || !cancelReason.trim()}
          >
            {i18n.cancelInvoice}
          </button>
        </div>
      </Modal>
    </div>
  );
}
