import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Ban, CalendarClock, CreditCard, DollarSign, MessageCircle, Plus, Search } from 'lucide-react';
import { customerFinancing, financingContracts, installments, type CreateFinancingContractInput, type InstallmentPaymentInput, type PaymentMethod } from '../api';
import CustomerSearch from '../components/CustomerSearch';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import { buildWhatsAppUrl } from '@motorcycle-system/shared-types';

interface Props {
  lang: 'en' | 'ar';
}

const methods: { key: PaymentMethod; label: { en: string; ar: string } }[] = [
  { key: 'cash', label: { en: 'Cash', ar: 'نقدي' } },
  { key: 'card', label: { en: 'Card', ar: 'بطاقة' } },
  { key: 'bank_transfer', label: { en: 'Bank Transfer', ar: 'تحويل بنكي' } },
  { key: 'cheque', label: { en: 'Cheque', ar: 'شيك' } },
];

const t = {
  en: {
    title: 'Installments', customer: 'Select customer', clear: 'Clear', choose: 'Choose a customer to view financing contracts.',
    contracts: 'Financing contracts', contract: 'Contract', total: 'Total amount', down: 'Down payment', financed: 'Financing amount', count: 'Installments', status: 'Status',
    schedule: 'Installment schedule', number: '#', dueDate: 'Due date', amount: 'Amount', paid: 'Paid amount', state: 'Installment status', action: 'Action', record: 'Record payment',
    dueCases: 'Due installments', remind: 'Remind customer', noContracts: 'No financing contracts found.', loading: 'Loading…', error: 'Failed to load financing data.', create: 'Create contract', orderId: 'Order ID', startDate: 'Start date', createSuccess: 'Contract created successfully.', cancelSuccess: 'Contract cancelled.', cancelContract: 'Cancel contract', cancelConfirm: 'Cancel this contract?', send: 'Send WhatsApp', sendSuccess: 'WhatsApp message sent.',
    paymentTitle: 'Record installment payment', paymentAmount: 'Payment amount', method: 'Payment method', reference: 'Reference', notes: 'Notes', cancel: 'Cancel', submit: 'Submit payment', saving: 'Saving…', success: 'Payment recorded successfully.',
    upcoming: 'Upcoming', due: 'Due', paidStatus: 'Paid', overdue: 'Overdue', reminderTodo: 'WhatsApp reminder is not enabled yet.', invalid: 'Enter a valid amount within the remaining balance.',
  },
  ar: {
    title: 'التقسيط', customer: 'اختيار العميل', clear: 'مسح', choose: 'اختر عميلاً لعرض عقود التمويل.',
    contracts: 'عقود التمويل', contract: 'العقد', total: 'المبلغ الإجمالي', down: 'الدفعة المقدمة', financed: 'المبلغ الممول', count: 'عدد الأقساط', status: 'الحالة',
    schedule: 'جدول الأقساط', number: '#', dueDate: 'تاريخ الاستحقاق', amount: 'المبلغ', paid: 'المدفوع', state: 'حالة القسط', action: 'الإجراء', record: 'تسجيل دفعة',
    dueCases: 'الأقساط المستحقة', remind: 'تذكير العميل', noContracts: 'لا توجد عقود تمويل.', loading: 'جاري التحميل…', error: 'فشل تحميل بيانات التقسيط.', create: 'إنشاء عقد', orderId: 'معرف الطلب', startDate: 'تاريخ البدء', createSuccess: 'تم إنشاء العقد بنجاح.', cancelSuccess: 'تم إلغاء العقد.', cancelContract: 'إلغاء العقد', cancelConfirm: 'هل تريد إلغاء هذا العقد؟', send: 'إرسال واتساب', sendSuccess: 'تم إرسال رسالة واتساب.',
    paymentTitle: 'تسجيل دفعة قسط', paymentAmount: 'مبلغ الدفعة', method: 'طريقة الدفع', reference: 'المرجع', notes: 'ملاحظات', cancel: 'إلغاء', submit: 'إرسال الدفعة', saving: 'جاري الحفظ…', success: 'تم تسجيل الدفعة بنجاح.',
    upcoming: 'قادم', due: 'مستحق', paidStatus: 'مدفوع', overdue: 'متأخر', reminderTodo: 'تذكير واتساب غير مفعل بعد.', invalid: 'أدخل مبلغاً صحيحاً ضمن الرصيد المتبقي.',
  },
};

export default function Installments({ lang }: Props) {
  const i18n = t[lang];
  const isRtl = lang === 'ar';
  const queryClient = useQueryClient();
  const [customer, setCustomer] = useState<{ id: string; name: string; phone: string } | null>(null);
  const [selected, setSelected] = useState<{ id: string; amount: number; paidAmount: number; installmentNumber: number } | null>(null);
  const [form, setForm] = useState({ amount: '', method: 'cash' as PaymentMethod, reference: '', notes: '' });
  const [message, setMessage] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ orderId: '', totalAmount: '', downPayment: '0', numberOfInstallments: '12', interestRate: '0', startDate: new Date().toISOString().slice(0, 10), installmentFrequency: 'monthly' as 'monthly' | 'quarterly' });

  const contractsQuery = useQuery({
    queryKey: ['customer-financing', customer?.id],
    queryFn: () => customerFinancing.getContracts(customer!.id, { limit: 100 }),
    enabled: Boolean(customer?.id),
  });

  const paymentMutation = useMutation({
    mutationFn: (data: { installmentId: string; payment: InstallmentPaymentInput }) => installments.createPayment(data.installmentId, data.payment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-financing', customer?.id] });
      setSelected(null);
      setMessage(i18n.success);
      setForm({ amount: '', method: 'cash', reference: '', notes: '' });
    },
    onError: (error: Error) => setMessage(error.message),
  });
  const createMutation = useMutation({
    mutationFn: (data: CreateFinancingContractInput) => financingContracts.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['customer-financing', customer?.id] }); setShowCreate(false); setMessage(i18n.createSuccess); },
    onError: (error: Error) => setMessage(error.message),
  });
  const cancelMutation = useMutation({
    mutationFn: (id: string) => financingContracts.updateStatus(id, 'cancelled'),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['customer-financing', customer?.id] }); setMessage(i18n.cancelSuccess); },
    onError: (error: Error) => setMessage(error.message),
  });
  const sendMutation = useMutation({
    mutationFn: (id: string) => installments.sendWhatsApp(id),
    onSuccess: ({ phone, message }) => { window.open(buildWhatsAppUrl(phone, message), '_blank'); setMessage(i18n.sendSuccess); },
    onError: (error: Error) => setMessage(error.message),
  });

  const money = (value: number) => new Intl.NumberFormat(isRtl ? 'ar-EG' : 'en-EG', { style: 'currency', currency: 'EGP', minimumFractionDigits: 2 }).format(value);
  const date = (value: string) => new Date(value).toLocaleDateString(isRtl ? 'ar-EG' : 'en-EG', { year: 'numeric', month: 'short', day: 'numeric' });

  const submitPayment = () => {
    if (!selected) return;
    const amount = Number(form.amount);
    const remaining = Math.max(0, selected.amount - selected.paidAmount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > remaining + 0.01) {
      setMessage(i18n.invalid);
      return;
    }
    paymentMutation.mutate({
      installmentId: selected.id,
      payment: { amount, method: form.method, reference: form.reference || undefined, notes: form.notes || undefined, idempotencyKey: crypto.randomUUID() },
    });
  };

  return (
    <div className="page-container" style={{ direction: isRtl ? 'rtl' : 'ltr' }}>
      <div className="flex items-center justify-between mb-6">
        <div><h1 style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}><CalendarClock size={30} />{i18n.title}</h1><p className="text-muted">{customer ? `${customer.name} · ${customer.phone}` : i18n.choose}</p></div>
        <CustomerSearch lang={lang} onSelect={setCustomer} trigger={<button className="btn btn-primary"><Search size={16} /> {customer?.name || i18n.customer}</button>} />
      </div>

      {customer && <div className="flex gap-2 mb-6"><button className="btn btn-outline" onClick={() => setCustomer(null)}>{i18n.clear}</button><button className="btn btn-outline" onClick={() => setShowCreate(true)}><Plus size={16} /> {i18n.create}</button></div>}
      {message && <div className="card mb-4" style={{ padding: '.75rem', color: paymentMutation.isError ? 'var(--error)' : 'var(--success)' }}>{message}</div>}
      {!customer && <div className="card center-content" style={{ padding: '4rem' }}><CreditCard size={42} style={{ opacity: .35 }} /><p>{i18n.choose}</p></div>}
      {customer && contractsQuery.isLoading && <div className="card center-content" style={{ padding: '3rem' }}><div className="spinner" /><p>{i18n.loading}</p></div>}
      {customer && contractsQuery.isError && <div className="card center-content" style={{ padding: '3rem', color: 'var(--error)' }}><AlertCircle size={40} /><p>{i18n.error}</p></div>}
      {customer && !contractsQuery.isLoading && !contractsQuery.isError && (contractsQuery.data?.items ?? []).length === 0 && <div className="card center-content" style={{ padding: '3rem' }}><p>{i18n.noContracts}</p></div>}

      {(contractsQuery.data?.items ?? []).map(contract => {
        const dueCount = (contract.installments ?? []).filter(item => item.status === 'due' || item.status === 'overdue').length;
        return <section className="card mb-6" key={contract.id}>
          <div className="flex items-center justify-between" style={{ gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}><div><h2 style={{ fontSize: '1.05rem' }}>{i18n.contract} {contract.contractNumber}</h2><p className="text-muted">{contract.order.orderNumber}</p></div><div className="flex items-center gap-2"><Badge status={contract.status} lang={lang} />{dueCount > 0 && <span className="badge badge-overdue">{i18n.dueCases}: {dueCount}</span>}{contract.status === 'active' && <button className="btn btn-outline" onClick={() => { if (window.confirm(i18n.cancelConfirm)) cancelMutation.mutate(contract.id); }}><Ban size={15} /> {i18n.cancelContract}</button>}</div></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '.75rem', marginBottom: '1rem' }}>{[[i18n.total, contract.totalAmount], [i18n.down, contract.downPayment], [i18n.financed, contract.financingAmount]].map(([label, value]) => <div key={label as string} style={{ padding: '.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}><div className="text-muted" style={{ fontSize: '.75rem' }}>{label}</div><strong>{money(value as number)}</strong></div>)}<div style={{ padding: '.75rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}><div className="text-muted" style={{ fontSize: '.75rem' }}>{i18n.count}</div><strong>{contract.numberOfInstallments}</strong></div></div>
          <div className="table-container"><table><thead><tr><th>{i18n.number}</th><th>{i18n.dueDate}</th><th>{i18n.amount}</th><th>{i18n.paid}</th><th>{i18n.state}</th><th>{i18n.action}</th></tr></thead><tbody>{(contract.installments ?? []).map(item => { const urgent = item.status === 'due' || item.status === 'overdue'; return <tr key={item.id} style={urgent ? { background: item.status === 'overdue' ? 'var(--error-bg)' : 'rgba(245, 158, 11, .12)' } : undefined}><td>#{item.installmentNumber}</td><td>{date(item.dueDate)}</td><td>{money(item.amount)}</td><td>{money(item.paidAmount)}</td><td><Badge status={item.status} lang={lang} /></td><td><div className="flex gap-2">{item.status !== 'paid' && contract.status === 'active' && <button className="btn btn-primary" style={{ padding: '.375rem .65rem' }} onClick={() => { setSelected(item); setForm({ amount: String(Math.max(0, item.amount - item.paidAmount)), method: 'cash', reference: '', notes: '' }); }}><DollarSign size={15} /> {i18n.record}</button>}<button className="btn btn-secondary" style={{ padding: '.375rem .65rem' }} disabled={sendMutation.isPending} onClick={() => sendMutation.mutate(item.id)}><MessageCircle size={15} /> {i18n.send}</button></div></td></tr>; })}</tbody></table></div>
        </section>;
      })}

      {showCreate && customer && <Modal title={i18n.create} onClose={() => setShowCreate(false)}><div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}><label className="label">{i18n.orderId}<input className="input" value={createForm.orderId} onChange={event => setCreateForm({ ...createForm, orderId: event.target.value })} required /></label><label className="label">{i18n.total}<input className="input" type="number" min="0.01" step="0.01" value={createForm.totalAmount} onChange={event => setCreateForm({ ...createForm, totalAmount: event.target.value })} required /></label><label className="label">{i18n.down}<input className="input" type="number" min="0" step="0.01" value={createForm.downPayment} onChange={event => setCreateForm({ ...createForm, downPayment: event.target.value })} /></label><label className="label">{i18n.count}<input className="input" type="number" min="1" value={createForm.numberOfInstallments} onChange={event => setCreateForm({ ...createForm, numberOfInstallments: event.target.value })} required /></label><label className="label">{i18n.startDate}<input className="input" type="date" value={createForm.startDate} onChange={event => setCreateForm({ ...createForm, startDate: event.target.value })} required /></label><div className="flex gap-2" style={{ justifyContent: 'flex-end' }}><button className="btn btn-secondary" onClick={() => setShowCreate(false)}>{i18n.cancel}</button><button className="btn btn-primary" disabled={createMutation.isPending} onClick={() => createMutation.mutate({ orderId: createForm.orderId, customerId: customer.id, totalAmount: Number(createForm.totalAmount), downPayment: Number(createForm.downPayment), numberOfInstallments: Number(createForm.numberOfInstallments), interestRate: Number(createForm.interestRate), startDate: createForm.startDate, installmentFrequency: createForm.installmentFrequency })}>{createMutation.isPending ? i18n.saving : i18n.create}</button></div></div></Modal>}
      {selected && <Modal title={`${i18n.paymentTitle} #${selected.installmentNumber}`} onClose={() => setSelected(null)}><div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}><label className="label">{i18n.paymentAmount}<input className="input" type="number" min="0.01" step="0.01" value={form.amount} onChange={event => setForm({ ...form, amount: event.target.value })} /></label><label className="label">{i18n.method}<select className="input" value={form.method} onChange={event => setForm({ ...form, method: event.target.value as PaymentMethod })}>{methods.map(item => <option key={item.key} value={item.key}>{item.label[lang]}</option>)}</select></label><label className="label">{i18n.reference}<input className="input" value={form.reference} onChange={event => setForm({ ...form, reference: event.target.value })} /></label><label className="label">{i18n.notes}<textarea className="input" rows={3} value={form.notes} onChange={event => setForm({ ...form, notes: event.target.value })} /></label>{message && <p style={{ color: 'var(--error)' }}>{message}</p>}<div className="flex gap-2" style={{ justifyContent: 'flex-end' }}><button className="btn btn-secondary" onClick={() => setSelected(null)}>{i18n.cancel}</button><button className="btn btn-primary" onClick={submitPayment} disabled={paymentMutation.isPending}>{paymentMutation.isPending ? i18n.saving : i18n.submit}</button></div></div></Modal>}
    </div>
  );
}
