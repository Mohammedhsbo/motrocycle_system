import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CreditCard, AlertCircle, CheckCircle, DollarSign, Calendar, User, Package } from 'lucide-react';
import { financingContracts, installments, type InstallmentPaymentInput, type PaymentMethod } from '../api';
import Badge from '../components/Badge';
import Modal from '../components/Modal';

interface Props {
  lang: 'en' | 'ar';
}

const t = {
  en: {
    back: 'Back to Financing',
    contract: 'Financing Contract',
    details: 'Contract Details',
    contractNumber: 'Contract Number',
    customer: 'Customer',
    order: 'Order',
    branch: 'Branch',
    status: 'Status',
    totalAmount: 'Total Amount',
    downPayment: 'Down Payment',
    financingAmount: 'Financing Amount',
    interestRate: 'Interest Rate',
    numberOfInstallments: 'Number of Installments',
    startDate: 'Start Date',
    approvedAt: 'Approved At',
    completedAt: 'Completed At',
    creator: 'Created By',
    approver: 'Approved By',
    notes: 'Notes',
    installmentSchedule: 'Installment Schedule',
    installmentNum: '#',
    dueDate: 'Due Date',
    amount: 'Amount',
    paidAmount: 'Paid',
    remainingAmount: 'Remaining',
    installmentStatus: 'Status',
    actions: 'Actions',
    recordPayment: 'Record Payment',
    settle: 'Early Settlement',
    approve: 'Approve Contract',
    noInstallments: 'No installments.',
    loading: 'Loading…',
    error: 'Failed to load contract.',
    paymentTitle: 'Record Installment Payment',
    paymentAmount: 'Payment Amount',
    paymentMethod: 'Payment Method',
    reference: 'Reference',
    paymentNotes: 'Notes',
    cancel: 'Cancel',
    submit: 'Submit Payment',
    cash: 'Cash',
    card: 'Card',
    bank_transfer: 'Bank Transfer',
    cheque: 'Cheque',
    settlementTitle: 'Early Settlement',
    settlementConfirm: 'Are you sure you want to settle this contract early? This will pay off all remaining installments.',
    settlementAmount: 'Total Settlement Amount',
    confirmSettle: 'Confirm Settlement',
    approveConfirm: 'Are you sure you want to approve this contract?',
    confirmApprove: 'Confirm Approval',
    success: 'Success',
    paymentSuccess: 'Payment recorded successfully.',
    settlementSuccess: 'Contract settled successfully.',
    approvalSuccess: 'Contract approved successfully.',
    upcoming: 'Upcoming',
    due: 'Due',
    paid: 'Paid',
    overdue: 'Overdue',
  },
  ar: {
    back: 'العودة إلى التمويل',
    contract: 'عقد التمويل',
    details: 'تفاصيل العقد',
    contractNumber: 'رقم العقد',
    customer: 'العميل',
    order: 'الطلب',
    branch: 'الفرع',
    status: 'الحالة',
    totalAmount: 'المبلغ الإجمالي',
    downPayment: 'الدفعة المقدمة',
    financingAmount: 'المبلغ الممول',
    interestRate: 'معدل الفائدة',
    numberOfInstallments: 'عدد الأقساط',
    startDate: 'تاريخ البدء',
    approvedAt: 'تاريخ الموافقة',
    completedAt: 'تاريخ الإكمال',
    creator: 'أنشأ بواسطة',
    approver: 'وافق بواسطة',
    notes: 'ملاحظات',
    installmentSchedule: 'جدول الأقساط',
    installmentNum: '#',
    dueDate: 'تاريخ الاستحقاق',
    amount: 'المبلغ',
    paidAmount: 'المدفوع',
    remainingAmount: 'المتبقي',
    installmentStatus: 'الحالة',
    actions: 'الإجراءات',
    recordPayment: 'تسجيل دفعة',
    settle: 'التسوية المبكرة',
    approve: 'الموافقة على العقد',
    noInstallments: 'لا توجد أقساط.',
    loading: 'جاري التحميل…',
    error: 'فشل التحميل.',
    paymentTitle: 'تسجيل دفعة قسط',
    paymentAmount: 'مبلغ الدفعة',
    paymentMethod: 'طريقة الدفع',
    reference: 'المرجع',
    paymentNotes: 'ملاحظات',
    cancel: 'إلغاء',
    submit: 'إرسال الدفعة',
    cash: 'نقدي',
    card: 'بطاقة',
    bank_transfer: 'تحويل بنكي',
    cheque: 'شيك',
    settlementTitle: 'التسوية المبكرة',
    settlementConfirm: 'هل أنت متأكد من أنك تريد تسوية هذا العقد مبكراً؟ سيتم دفع جميع الأقساط المتبقية.',
    settlementAmount: 'إجمالي مبلغ التسوية',
    confirmSettle: 'تأكيد التسوية',
    approveConfirm: 'هل أنت متأكد من أنك تريد الموافقة على هذا العقد؟',
    confirmApprove: 'تأكيد الموافقة',
    success: 'نجح',
    paymentSuccess: 'تم تسجيل الدفعة بنجاح.',
    settlementSuccess: 'تمت التسوية بنجاح.',
    approvalSuccess: 'تمت الموافقة بنجاح.',
    upcoming: 'قادم',
    due: 'مستحق',
    paid: 'مدفوع',
    overdue: 'متأخر',
  },
};

const PAYMENT_METHODS: { key: PaymentMethod; label: { en: string; ar: string } }[] = [
  { key: 'cash', label: { en: 'Cash', ar: 'نقدي' } },
  { key: 'card', label: { en: 'Card', ar: 'بطاقة' } },
  { key: 'bank_transfer', label: { en: 'Bank Transfer', ar: 'تحويل بنكي' } },
  { key: 'cheque', label: { en: 'Cheque', ar: 'شيك' } },
];

export default function FinancingContractDetail({ lang }: Props) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const i18n = t[lang];
  const isRtl = lang === 'ar';

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInstallment, setSelectedInstallment] = useState<string | null>(null);
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    method: 'cash' as PaymentMethod,
    reference: '',
    notes: '',
  });
  const [settlementForm, setSettlementForm] = useState({
    method: 'cash' as PaymentMethod,
    reference: '',
    notes: '',
  });

  const { data: contract, isLoading, isError } = useQuery({
    queryKey: ['financing-contract', id],
    queryFn: () => financingContracts.get(id!),
    enabled: !!id,
  });

  const paymentMutation = useMutation({
    mutationFn: (data: { installmentId: string; payment: InstallmentPaymentInput }) =>
      installments.createPayment(data.installmentId, data.payment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financing-contract', id] });
      setShowPaymentModal(false);
      setPaymentForm({ amount: '', method: 'cash', reference: '', notes: '' });
      alert(i18n.paymentSuccess);
    },
  });

  const settlementMutation = useMutation({
    mutationFn: () => financingContracts.settle(id!, {
      paymentMethod: settlementForm.method,
      reference: settlementForm.reference || undefined,
      notes: settlementForm.notes || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financing-contract', id] });
      setShowSettlementModal(false);
      alert(i18n.settlementSuccess);
    },
  });

  const approvalMutation = useMutation({
    mutationFn: () => financingContracts.approve(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financing-contract', id] });
      setShowApprovalModal(false);
      alert(i18n.approvalSuccess);
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(isRtl ? 'ar-SA' : 'en-US', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(isRtl ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handlePayment = (installmentId: string, installmentAmount: number) => {
    setSelectedInstallment(installmentId);
    setPaymentForm({ ...paymentForm, amount: installmentAmount.toString() });
    setShowPaymentModal(true);
  };

  const submitPayment = () => {
    if (!selectedInstallment) return;
    const idempotencyKey = `payment-${selectedInstallment}-${Date.now()}`;
    paymentMutation.mutate({
      installmentId: selectedInstallment,
      payment: {
        amount: parseFloat(paymentForm.amount),
        method: paymentForm.method,
        reference: paymentForm.reference || undefined,
        idempotencyKey,
        notes: paymentForm.notes || undefined,
      },
    });
  };

  const submitSettlement = () => {
    settlementMutation.mutate();
  };

  const submitApproval = () => {
    approvalMutation.mutate();
  };

  const remainingBalance = contract?.installments
    .filter(i => i.status !== 'paid')
    .reduce((sum, i) => sum + i.remainingAmount, 0) ?? 0;

  if (isLoading) {
    return (
      <div className="page-container" style={{ direction: isRtl ? 'rtl' : 'ltr' }}>
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
          <p className="text-muted">{i18n.loading}</p>
        </div>
      </div>
    );
  }

  if (isError || !contract) {
    return (
      <div className="page-container" style={{ direction: isRtl ? 'rtl' : 'ltr' }}>
        <div className="card" style={{ padding: '3rem', textAlign: 'center', borderLeft: '3px solid #ef4444' }}>
          <AlertCircle size={48} style={{ margin: '0 auto 1rem', color: '#ef4444' }} />
          <p style={{ color: '#ef4444' }}>{i18n.error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ direction: isRtl ? 'rtl' : 'ltr' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link to="/financing" className="link" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <ArrowLeft size={16} />
          {i18n.back}
        </Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <CreditCard size={32} />
              {i18n.contract}
            </h1>
            <p className="text-muted" style={{ fontSize: '0.875rem' }}>
              <code style={{ fontSize: '1rem', fontWeight: 600 }}>{contract.contractNumber}</code>
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {contract.status === 'active' && (
              <>
                <button onClick={() => setShowSettlementModal(true)} className="btn btn-secondary">
                  <CheckCircle size={18} />
                  {i18n.settle}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="card">
          <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-muted)' }}>{i18n.details}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <div className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>{i18n.customer}</div>
              <div style={{ fontWeight: 600 }}>{contract.customer.name}</div>
              <div className="text-muted" style={{ fontSize: '0.75rem' }}>{contract.customer.phone}</div>
            </div>
            <div>
              <div className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>{i18n.order}</div>
              <Link to={`/orders/${contract.order.id}`} className="link">{contract.order.orderNumber}</Link>
            </div>
            <div>
              <div className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>{i18n.status}</div>
              <Badge status={contract.status} lang={lang} />
            </div>
          </div>
        </div>

        <div className="card">
          <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-muted)' }}>{i18n.totalAmount}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <div className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>{i18n.totalAmount}</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{formatCurrency(contract.totalAmount)}</div>
            </div>
            <div>
              <div className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>{i18n.downPayment}</div>
              <div style={{ fontWeight: 600, color: '#10b981' }}>{formatCurrency(contract.downPayment)}</div>
            </div>
            <div>
              <div className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>{i18n.financingAmount}</div>
              <div style={{ fontWeight: 600, color: '#3b82f6' }}>{formatCurrency(contract.financingAmount)}</div>
            </div>
            <div>
              <div className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>{i18n.remainingAmount}</div>
              <div style={{ fontWeight: 700, color: remainingBalance > 0 ? '#f59e0b' : '#10b981', fontSize: '1.25rem' }}>
                {formatCurrency(remainingBalance)}
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-muted)' }}>{i18n.numberOfInstallments}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <div className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>{i18n.numberOfInstallments}</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{contract.numberOfInstallments}</div>
            </div>
            <div>
              <div className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>{i18n.interestRate}</div>
              <div style={{ fontWeight: 600 }}>{contract.interestRate}%</div>
            </div>
            <div>
              <div className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>{i18n.startDate}</div>
              <div style={{ fontWeight: 600 }}>{formatDate(contract.startDate)}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>{i18n.installmentSchedule}</h3>
        {contract.installments.length === 0 ? (
          <p className="text-muted" style={{ textAlign: 'center', padding: '2rem' }}>{i18n.noInstallments}</p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>{i18n.installmentNum}</th>
                  <th>{i18n.dueDate}</th>
                  <th style={{ textAlign: isRtl ? 'left' : 'right' }}>{i18n.amount}</th>
                  <th style={{ textAlign: isRtl ? 'left' : 'right' }}>{i18n.paidAmount}</th>
                  <th style={{ textAlign: isRtl ? 'left' : 'right' }}>{i18n.remainingAmount}</th>
                  <th>{i18n.installmentStatus}</th>
                  <th>{i18n.actions}</th>
                </tr>
              </thead>
              <tbody>
                {contract.installments.map((inst) => (
                  <tr key={inst.id}>
                    <td>
                      <span style={{ display: 'inline-block', padding: '0.25rem 0.75rem', background: '#f1f5f9', borderRadius: '9999px', fontSize: '0.875rem', fontWeight: 600 }}>
                        {inst.installmentNumber}
                      </span>
                    </td>
                    <td className="text-muted" style={{ fontSize: '0.875rem' }}>{formatDate(inst.dueDate)}</td>
                    <td style={{ textAlign: isRtl ? 'left' : 'right', fontWeight: 600 }}>{formatCurrency(inst.amount)}</td>
                    <td style={{ textAlign: isRtl ? 'left' : 'right', color: '#10b981', fontWeight: 600 }}>
                      {formatCurrency(inst.paidAmount)}
                    </td>
                    <td style={{ textAlign: isRtl ? 'left' : 'right', color: inst.remainingAmount > 0 ? '#f59e0b' : '#10b981', fontWeight: 600 }}>
                      {formatCurrency(inst.remainingAmount)}
                    </td>
                    <td><Badge status={inst.status} lang={lang} /></td>
                    <td>
                      {inst.status !== 'paid' && contract.status === 'active' && (
                        <button
                          onClick={() => handlePayment(inst.id, inst.remainingAmount)}
                          className="btn btn-primary"
                          style={{ padding: '0.375rem 0.75rem', fontSize: '0.875rem' }}
                        >
                          <DollarSign size={16} />
                          {i18n.recordPayment}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showPaymentModal && (
        <Modal onClose={() => setShowPaymentModal(false)} title={i18n.paymentTitle}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label className="label">{i18n.paymentAmount}</label>
              <input
                type="number"
                className="input"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                step="0.01"
                min="0"
              />
            </div>
            <div>
              <label className="label">{i18n.paymentMethod}</label>
              <select
                className="input"
                value={paymentForm.method}
                onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value as PaymentMethod })}
              >
                {PAYMENT_METHODS.map(({ key, label }) => (
                  <option key={key} value={key}>{label[lang]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">{i18n.reference}</label>
              <input
                type="text"
                className="input"
                value={paymentForm.reference}
                onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
              />
            </div>
            <div>
              <label className="label">{i18n.paymentNotes}</label>
              <textarea
                className="input"
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                rows={3}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowPaymentModal(false)} className="btn btn-secondary">
                {i18n.cancel}
              </button>
              <button onClick={submitPayment} className="btn btn-primary" disabled={paymentMutation.isPending}>
                {paymentMutation.isPending ? i18n.loading : i18n.submit}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {showSettlementModal && (
        <Modal onClose={() => setShowSettlementModal(false)} title={i18n.settlementTitle}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p>{i18n.settlementConfirm}</p>
            <div>
              <div className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>{i18n.settlementAmount}</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#3b82f6' }}>{formatCurrency(remainingBalance)}</div>
            </div>
            <div>
              <label className="label">{i18n.paymentMethod}</label>
              <select
                className="input"
                value={settlementForm.method}
                onChange={(e) => setSettlementForm({ ...settlementForm, method: e.target.value as PaymentMethod })}
              >
                {PAYMENT_METHODS.map(({ key, label }) => (
                  <option key={key} value={key}>{label[lang]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">{i18n.reference}</label>
              <input
                type="text"
                className="input"
                value={settlementForm.reference}
                onChange={(e) => setSettlementForm({ ...settlementForm, reference: e.target.value })}
              />
            </div>
            <div>
              <label className="label">{i18n.paymentNotes}</label>
              <textarea
                className="input"
                value={settlementForm.notes}
                onChange={(e) => setSettlementForm({ ...settlementForm, notes: e.target.value })}
                rows={3}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowSettlementModal(false)} className="btn btn-secondary">
                {i18n.cancel}
              </button>
              <button onClick={submitSettlement} className="btn btn-primary" disabled={settlementMutation.isPending}>
                {settlementMutation.isPending ? i18n.loading : i18n.confirmSettle}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
