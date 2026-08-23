import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Mail,
  User,
  Calendar,
  FileText,
  Download,
  CheckCircle,
  XCircle,
  Send,
  Ban,
} from 'lucide-react';
import { letters, type LetterStatus, type LetterDocument, type LetterHistoryEntry } from '../api';
import Modal from '../components/Modal';

interface Props {
  lang: 'en' | 'ar';
}

const t = {
  en: {
    back: 'Back to Letters',
    loading: 'Loading letter...',
    error: 'Failed to load letter.',
    letterNumber: 'Letter Number',
    type: 'Type',
    status: 'Status',
    customer: 'Customer',
    order: 'Order',
    contract: 'Contract',
    subject: 'Subject',
    content: 'Content',
    issueDate: 'Issue Date',
    sentDate: 'Sent Date',
    receivedDate: 'Received Date',
    expiryDate: 'Expiry Date',
    createdBy: 'Created By',
    issuedBy: 'Issued By',
    receivedBy: 'Received By',
    notes: 'Notes',
    documents: 'Documents',
    history: 'History',
    actions: 'Actions',
    issue: 'Issue Letter',
    send: 'Mark as Sent',
    confirmReceipt: 'Confirm Receipt',
    markNotReceived: 'Mark Not Received',
    cancel: 'Cancel Letter',
    generateDoc: 'Generate Document',
    downloadDoc: 'Download',
    generateEnglish: 'Generate English',
    generateArabic: 'Generate Arabic',
    viewOrder: 'View Order',
    viewContract: 'View Contract',
    viewCustomer: 'View Customer',
    confirmReceiptTitle: 'Confirm Receipt',
    confirmReceiptPrompt: 'Confirm that this letter was received by the customer?',
    receivedByLabel: 'Received by (optional)',
    notesLabel: 'Notes (optional)',
    markNotReceivedTitle: 'Mark Not Received',
    markNotReceivedPrompt: 'Why was this letter not received?',
    reasonLabel: 'Reason',
    cancelTitle: 'Cancel Letter',
    cancelPrompt: 'Are you sure you want to cancel this letter?',
    confirm: 'Confirm',
    close: 'Close',
    success: 'Operation successful',
    types: {
      receipt_acknowledgment: 'Receipt Acknowledgment',
      delivery_notice: 'Delivery Notice',
      payment_reminder: 'Payment Reminder',
      contract_expiry: 'Contract Expiry',
      general: 'General',
      receipt: 'Receipt',
      delivery: 'Delivery',
    },
    statuses: {
      draft: 'Draft',
      issued: 'Issued',
      sent: 'Sent',
      received: 'Received',
      not_received: 'Not Received',
      cancelled: 'Cancelled',
    },
    historyActions: {
      create: 'Created',
      issue: 'Issued',
      send: 'Sent',
      confirm_receipt: 'Receipt Confirmed',
      mark_not_received: 'Marked Not Received',
      cancel: 'Cancelled',
    },
  },
  ar: {
    back: 'العودة إلى الخطابات',
    loading: 'جاري تحميل الخطاب...',
    error: 'فشل تحميل الخطاب.',
    letterNumber: 'رقم الخطاب',
    type: 'النوع',
    status: 'الحالة',
    customer: 'العميل',
    order: 'الطلب',
    contract: 'العقد',
    subject: 'الموضوع',
    content: 'المحتوى',
    issueDate: 'تاريخ الإصدار',
    sentDate: 'تاريخ الإرسال',
    receivedDate: 'تاريخ الاستلام',
    expiryDate: 'تاريخ الانتهاء',
    createdBy: 'تم الإنشاء بواسطة',
    issuedBy: 'تم الإصدار بواسطة',
    receivedBy: 'تم الاستلام بواسطة',
    notes: 'ملاحظات',
    documents: 'المستندات',
    history: 'السجل',
    actions: 'الإجراءات',
    issue: 'إصدار الخطاب',
    send: 'تعيين كمرسل',
    confirmReceipt: 'تأكيد الاستلام',
    markNotReceived: 'تعيين كغير مستلم',
    cancel: 'إلغاء الخطاب',
    generateDoc: 'إنشاء مستند',
    downloadDoc: 'تنزيل',
    generateEnglish: 'إنشاء بالإنجليزية',
    generateArabic: 'إنشاء بالعربية',
    viewOrder: 'عرض الطلب',
    viewContract: 'عرض العقد',
    viewCustomer: 'عرض العميل',
    confirmReceiptTitle: 'تأكيد الاستلام',
    confirmReceiptPrompt: 'تأكيد أن هذا الخطاب تم استلامه من قبل العميل؟',
    receivedByLabel: 'استلمه (اختياري)',
    notesLabel: 'ملاحظات (اختياري)',
    markNotReceivedTitle: 'تعيين كغير مستلم',
    markNotReceivedPrompt: 'لماذا لم يتم استلام هذا الخطاب؟',
    reasonLabel: 'السبب',
    cancelTitle: 'إلغاء الخطاب',
    cancelPrompt: 'هل أنت متأكد من إلغاء هذا الخطاب؟',
    confirm: 'تأكيد',
    close: 'إغلاق',
    success: 'تمت العملية بنجاح',
    types: {
      receipt_acknowledgment: 'إقرار الاستلام',
      delivery_notice: 'إشعار التسليم',
      payment_reminder: 'تذكير بالدفع',
      contract_expiry: 'انتهاء العقد',
      general: 'عام',
      receipt: 'إيصال',
      delivery: 'تسليم',
    },
    statuses: {
      draft: 'مسودة',
      issued: 'صادر',
      sent: 'مرسل',
      received: 'مستلم',
      not_received: 'غير مستلم',
      cancelled: 'ملغي',
    },
    historyActions: {
      create: 'تم الإنشاء',
      issue: 'تم الإصدار',
      send: 'تم الإرسال',
      confirm_receipt: 'تم تأكيد الاستلام',
      mark_not_received: 'تم التعيين كغير مستلم',
      cancel: 'تم الإلغاء',
    },
  },
};

export default function LetterDetail({ lang }: Props) {
  const { id } = useParams<{ id: string }>();
  const i18n = t[lang];
  const isRtl = lang === 'ar';
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [confirmReceiptModal, setConfirmReceiptModal] = useState(false);
  const [notReceivedModal, setNotReceivedModal] = useState(false);
  const [cancelModal, setCancelModal] = useState(false);
  const [receivedBy, setReceivedBy] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  const { data: letter, isLoading, isError } = useQuery({
    queryKey: ['letter', id],
    queryFn: () => letters.get(id!),
    enabled: !!id,
  });

  const { data: history } = useQuery({
    queryKey: ['letter-history', id],
    queryFn: () => letters.getHistory(id!),
    enabled: !!id,
  });

  const issueMutation = useMutation({
    mutationFn: () => letters.issue(id!, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['letter', id] });
      queryClient.invalidateQueries({ queryKey: ['letter-history', id] });
      setNotes('');
    },
  });

  const sendMutation = useMutation({
    mutationFn: () => letters.send(id!, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['letter', id] });
      queryClient.invalidateQueries({ queryKey: ['letter-history', id] });
      setNotes('');
    },
  });

  const confirmReceiptMutation = useMutation({
    mutationFn: () => letters.confirmReceipt(id!, receivedBy || undefined, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['letter', id] });
      queryClient.invalidateQueries({ queryKey: ['letter-history', id] });
      setConfirmReceiptModal(false);
      setReceivedBy('');
      setNotes('');
    },
  });

  const markNotReceivedMutation = useMutation({
    mutationFn: () => letters.markNotReceived(id!, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['letter', id] });
      queryClient.invalidateQueries({ queryKey: ['letter-history', id] });
      setNotReceivedModal(false);
      setReason('');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => letters.cancel(id!, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['letter', id] });
      queryClient.invalidateQueries({ queryKey: ['letter-history', id] });
      setCancelModal(false);
      setReason('');
    },
  });

  const generateDocMutation = useMutation({
    mutationFn: (language: 'en' | 'ar') => letters.generateDocument(id!, language),
    onSuccess: (data: { url: string }) => {
      queryClient.invalidateQueries({ queryKey: ['letter', id] });
      window.open(data.url, '_blank');
    },
  });

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'draft': return 'var(--text-muted)';
      case 'issued': return '#3b82f6';
      case 'sent': return '#f59e0b';
      case 'received': return '#10b981';
      case 'not_received': return '#ef4444';
      case 'cancelled': return 'var(--error)';
      default: return 'var(--text-secondary)';
    }
  };

  if (isLoading) {
    return (
      <div className="page-container" style={{ direction: isRtl ? 'rtl' : 'ltr' }}>
        <div className="center-content">
          <div className="spinner" />
          <span style={{ marginTop: '0.75rem' }}>{i18n.loading}</span>
        </div>
      </div>
    );
  }

  if (isError || !letter) {
    return (
      <div className="page-container" style={{ direction: isRtl ? 'rtl' : 'ltr' }}>
        <div className="center-content" style={{ color: 'var(--error)' }}>
          <span>{i18n.error}</span>
        </div>
      </div>
    );
  }

  const status = letter.status as string;

  return (
    <div className="page-container" style={{ direction: isRtl ? 'rtl' : 'ltr' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <Link
          to="/letters"
          className="btn btn-outline"
          style={{ marginBottom: '1rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <ArrowLeft size={16} />
          {i18n.back}
        </Link>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
          <div>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Mail size={28} style={{ color: 'var(--accent-primary)' }} />
              {letter.letterNumber}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              {i18n.types[letter.type]}
            </p>
          </div>
          <span
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              backgroundColor: `${getStatusColor(letter.status)}15`,
              color: getStatusColor(letter.status),
            }}
          >
            {i18n.statuses[letter.status]}
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Letter Details */}
          <div className="card">
            <h3 style={{ marginBottom: '1rem', fontSize: '1.125rem', fontWeight: 600 }}>
              {i18n.subject}
            </h3>
            <p style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '1rem' }}>
              {letter.subject}
            </p>
            <h3 style={{ marginBottom: '0.75rem', fontSize: '1rem', fontWeight: 600 }}>
              {i18n.content}
            </h3>
            <div
              style={{
                padding: '1rem',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: '0.375rem',
                whiteSpace: 'pre-wrap',
                fontSize: '0.875rem',
                lineHeight: '1.6',
              }}
            >
              {letter.content}
            </div>
            {letter.notes && (
              <>
                <h3 style={{ marginTop: '1rem', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  {i18n.notes}
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  {letter.notes}
                </p>
              </>
            )}
          </div>

          {/* Documents */}
          {letter.documents && letter.documents.length > 0 && (
            <div className="card">
              <h3 style={{ marginBottom: '1rem', fontSize: '1rem', fontWeight: 600 }}>
                {i18n.documents}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {letter.documents.map((doc: LetterDocument) => (
                  <div
                    key={doc.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.75rem',
                      border: '1px solid var(--border)',
                      borderRadius: '0.375rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <FileText size={20} style={{ color: 'var(--accent-primary)' }} />
                      <div>
                        <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{doc.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {formatDateTime(doc.generatedAt)} • {doc.language.toUpperCase()}
                        </div>
                      </div>
                    </div>
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-outline"
                      style={{ padding: '0.375rem 0.625rem', fontSize: '0.8rem' }}
                    >
                      <Download size={14} /> {i18n.downloadDoc}
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* History */}
          {history && history.length > 0 && (
            <div className="card">
              <h3 style={{ marginBottom: '1rem', fontSize: '1rem', fontWeight: 600 }}>
                {i18n.history}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {history.map((entry: LetterHistoryEntry) => (
                  <div
                    key={entry.id}
                    style={{
                      padding: '0.75rem',
                      backgroundColor: 'var(--bg-secondary)',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: 600 }}>
                        {(i18n.historyActions as Record<string, string>)[entry.action] || entry.action}
                      </span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        {formatDateTime(entry.createdAt)}
                      </span>
                    </div>
                    <div style={{ color: 'var(--text-secondary)' }}>
                      {i18n.createdBy}: {entry.user.name}
                    </div>
                    {entry.reason && (
                      <div style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        {entry.reason}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Info Card */}
          <div className="card">
            <h3 style={{ marginBottom: '1rem', fontSize: '1rem', fontWeight: 600 }}>
              {i18n.customer}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem' }}>
              <div>
                <div style={{ color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{i18n.customer}</div>
                <Link
                  to={`/customers/${letter.customer.id}`}
                  style={{ fontWeight: 600, color: 'var(--accent-primary)', textDecoration: 'none' }}
                >
                  {letter.customer.name}
                </Link>
                <div style={{ color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                  {letter.customer.phone}
                </div>
              </div>

              {letter.order && (
                <div>
                  <div style={{ color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{i18n.order}</div>
                  <Link
                    to={`/orders/${letter.order.id}`}
                    style={{ fontWeight: 600, color: 'var(--accent-primary)', textDecoration: 'none', fontFamily: 'monospace' }}
                  >
                    {letter.order.orderNumber}
                  </Link>
                </div>
              )}

              {letter.financingContract && (
                <div>
                  <div style={{ color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{i18n.contract}</div>
                  <Link
                    to={`/financing/${letter.financingContract.id}`}
                    style={{ fontWeight: 600, color: 'var(--accent-primary)', textDecoration: 'none', fontFamily: 'monospace' }}
                  >
                    {letter.financingContract.contractNumber}
                  </Link>
                </div>
              )}

              <div>
                <div style={{ color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{i18n.issueDate}</div>
                <div style={{ fontWeight: 500 }}>{formatDate(letter.issueDate)}</div>
              </div>

              {letter.sentDate && (
                <div>
                  <div style={{ color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{i18n.sentDate}</div>
                  <div style={{ fontWeight: 500 }}>{formatDate(letter.sentDate)}</div>
                </div>
              )}

              {letter.receivedDate && (
                <div>
                  <div style={{ color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{i18n.receivedDate}</div>
                  <div style={{ fontWeight: 500 }}>{formatDate(letter.receivedDate)}</div>
                </div>
              )}

              {letter.expiryDate && (
                <div>
                  <div style={{ color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{i18n.expiryDate}</div>
                  <div style={{ fontWeight: 500 }}>{formatDate(letter.expiryDate)}</div>
                </div>
              )}

              <div>
                <div style={{ color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{i18n.createdBy}</div>
                <div style={{ fontWeight: 500 }}>{letter.creator.name}</div>
              </div>

              {letter.issuer && (
                <div>
                  <div style={{ color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{i18n.issuedBy}</div>
                  <div style={{ fontWeight: 500 }}>{letter.issuer.name}</div>
                </div>
              )}

              {letter.receiver && (
                <div>
                  <div style={{ color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{i18n.receivedBy}</div>
                  <div style={{ fontWeight: 500 }}>{letter.receiver.name}</div>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="card">
            <h3 style={{ marginBottom: '1rem', fontSize: '1rem', fontWeight: 600 }}>
              {i18n.actions}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {status === 'draft' && (
                <button
                  onClick={() => issueMutation.mutate()}
                  disabled={issueMutation.isPending}
                  className="btn btn-primary"
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  <CheckCircle size={16} /> {i18n.issue}
                </button>
              )}

              {status === 'issued' && (
                <button
                  onClick={() => sendMutation.mutate()}
                  disabled={sendMutation.isPending}
                  className="btn btn-primary"
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  <Send size={16} /> {i18n.send}
                </button>
              )}

              {status === 'sent' && (
                <>
                  <button
                    onClick={() => setConfirmReceiptModal(true)}
                    className="btn btn-primary"
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    <CheckCircle size={16} /> {i18n.confirmReceipt}
                  </button>
                  <button
                    onClick={() => setNotReceivedModal(true)}
                    className="btn btn-outline"
                    style={{ width: '100%', justifyContent: 'center', color: '#ef4444', borderColor: '#ef4444' }}
                  >
                    <XCircle size={16} /> {i18n.markNotReceived}
                  </button>
                </>
              )}

              {(status === 'issued' || status === 'sent') && (
                <>
                  <hr style={{ margin: '0.5rem 0', border: 'none', borderTop: '1px solid var(--border)' }} />
                  <button
                    onClick={() => generateDocMutation.mutate('en')}
                    disabled={generateDocMutation.isPending}
                    className="btn btn-outline"
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    <FileText size={16} /> {i18n.generateEnglish}
                  </button>
                  <button
                    onClick={() => generateDocMutation.mutate('ar')}
                    disabled={generateDocMutation.isPending}
                    className="btn btn-outline"
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    <FileText size={16} /> {i18n.generateArabic}
                  </button>
                </>
              )}

              {status !== 'cancelled' && status !== 'received' && (
                <>
                  <hr style={{ margin: '0.5rem 0', border: 'none', borderTop: '1px solid var(--border)' }} />
                  <button
                    onClick={() => setCancelModal(true)}
                    className="btn btn-outline"
                    style={{ width: '100%', justifyContent: 'center', color: 'var(--error)', borderColor: 'var(--error)' }}
                  >
                    <Ban size={16} /> {i18n.cancel}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {confirmReceiptModal && (
        <Modal onClose={() => setConfirmReceiptModal(false)} title={i18n.confirmReceiptTitle}>
          <p style={{ marginBottom: '1rem' }}>{i18n.confirmReceiptPrompt}</p>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
            {i18n.receivedByLabel}
          </label>
          <input
            type="text"
            value={receivedBy}
            onChange={(e) => setReceivedBy(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid var(--border)',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
            }}
          />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
            {i18n.notesLabel}
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid var(--border)',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              resize: 'vertical',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button onClick={() => setConfirmReceiptModal(false)} className="btn btn-outline">
            {i18n.close}
          </button>
          <button
            onClick={() => confirmReceiptMutation.mutate()}
            disabled={confirmReceiptMutation.isPending}
            className="btn btn-primary"
          >
            {i18n.confirm}
          </button>
        </div>
      </Modal>
      )}

      {notReceivedModal && (
        <Modal onClose={() => setNotReceivedModal(false)} title={i18n.markNotReceivedTitle}>
          <p style={{ marginBottom: '1rem' }}>{i18n.markNotReceivedPrompt}</p>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
            {i18n.reasonLabel}
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            required
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid var(--border)',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              resize: 'vertical',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button onClick={() => setNotReceivedModal(false)} className="btn btn-outline">
            {i18n.close}
          </button>
          <button
            onClick={() => markNotReceivedMutation.mutate()}
            disabled={markNotReceivedMutation.isPending || !reason.trim()}
            className="btn btn-primary"
          >
            {i18n.confirm}
          </button>
        </div>
      </Modal>
      )}

      {cancelModal && (
        <Modal onClose={() => setCancelModal(false)} title={i18n.cancelTitle}>
          <p style={{ marginBottom: '1rem' }}>{i18n.cancelPrompt}</p>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
            {i18n.reasonLabel}
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            required
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid var(--border)',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              resize: 'vertical',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button onClick={() => setCancelModal(false)} className="btn btn-outline">
            {i18n.close}
          </button>
          <button
            onClick={() => cancelMutation.mutate()}
            disabled={cancelMutation.isPending || !reason.trim()}
            className="btn btn-primary"
            style={{ backgroundColor: 'var(--error)' }}
          >
            {i18n.confirm}
          </button>
        </div>
      </Modal>
      )}
    </div>
  );
}
