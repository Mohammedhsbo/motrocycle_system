import { useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import CustomerSearch from '../components/CustomerSearch';
import { financingContracts, orders, type CreateFinancingContractInput, type InstallmentFrequency, type OrderListItem } from '../api';

interface Props { lang: 'en' | 'ar' }

function addFrequency(date: Date, frequency: InstallmentFrequency, count: number) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + (frequency === 'quarterly' ? count * 3 : count));
  return result;
}

export default function FinancingContractCreate({ lang }: Props) {
  const isRtl = lang === 'ar';
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [customer, setCustomer] = useState<{ id: string; name: string; phone: string } | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<OrderListItem | null>(null);
  const [orderSearch, setOrderSearch] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [downPayment, setDownPayment] = useState('');
  const [count, setCount] = useState('12');
  const [frequency, setFrequency] = useState<InstallmentFrequency>('monthly');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);

  const orderQuery = useQuery({
    queryKey: ['financing-create-orders', customer?.id, orderSearch],
    queryFn: () => orders.list({ customerId: customer!.id, search: orderSearch || undefined, limit: 50 }),
    enabled: !!customer,
  });
  const eligibleOrders = (orderQuery.data?.items ?? []).filter(order => order.status === 'confirmed' || order.status === 'processing');
  const installmentCount = Math.max(1, Number(count) || 0);
  const total = Number(totalAmount) || 0;
  const down = Number(downPayment) || 0;
  const preview = useMemo(() => {
    const financed = Math.max(0, total - down);
    if (!financed || !installmentCount) return [];
    const base = Math.round((financed / installmentCount) * 100) / 100;
    const firstDate = new Date(`${startDate}T00:00:00`);
    return Array.from({ length: installmentCount }, (_, index) => {
      const amount = index === installmentCount - 1 ? Math.round((financed - base * (installmentCount - 1)) * 100) / 100 : base;
      return { number: index + 1, amount, dueDate: addFrequency(firstDate, frequency, index) };
    });
  }, [down, frequency, installmentCount, startDate, total]);

  const createMutation = useMutation({
    mutationFn: (data: CreateFinancingContractInput) => financingContracts.create(data),
    onSuccess: contract => { queryClient.invalidateQueries({ queryKey: ['financing-contracts'] }); navigate(`/financing/${contract.id}`); },
    onError: (reason: Error) => setError(reason.message),
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!customer || !selectedOrder) return setError(isRtl ? 'اختر العميل والطلب.' : 'Select a customer and order.');
    if (total <= 0 || down < 0 || down >= total) return setError(isRtl ? 'تحقق من المبالغ.' : 'Check the total and down payment amounts.');
    if (installmentCount < 1 || installmentCount > 120) return setError(isRtl ? 'عدد الأقساط يجب أن يكون بين 1 و120.' : 'Installments must be between 1 and 120.');
    if (Math.abs(total - selectedOrder.netAmount) > 0.01) return setError(isRtl ? 'الإجمالي يجب أن يساوي صافي الطلب.' : 'Total must match the order net amount.');
    createMutation.mutate({ orderId: selectedOrder.id, customerId: customer.id, totalAmount: total, downPayment: down, numberOfInstallments: installmentCount, startDate, installmentFrequency: frequency });
  }

  return <div className="page-container" style={{ direction: isRtl ? 'rtl' : 'ltr', maxWidth: 900 }}>
    <div className="flex items-center gap-4 mb-6"><button className="btn btn-outline" onClick={() => navigate('/financing')}><ArrowLeft size={18} /></button><h1 style={{ margin: 0 }}>{isRtl ? 'إنشاء خطة تقسيط' : 'Create Financing Plan'}</h1></div>
    <form onSubmit={submit}>
      {error && <div className="login-error" style={{ marginBottom: '1rem' }}>{error}</div>}
      <div className="card mb-4"><h2 style={{ fontSize: '1rem' }}>Customer and Order</h2><div className="flex gap-2" style={{ alignItems: 'center', margin: '1rem 0' }}><CustomerSearch lang={lang} onSelect={value => { setCustomer(value); setSelectedOrder(null); setTotalAmount(''); }} trigger={<button type="button" className="btn btn-outline">{customer?.name ?? 'Select customer'}</button>} />{customer && <span className="text-muted">{customer.phone}</span>}</div>{customer && <><input className="input" placeholder="Search customer orders" value={orderSearch} onChange={event => setOrderSearch(event.target.value)} />{orderQuery.isLoading ? <p className="text-muted">Loading orders...</p> : eligibleOrders.length === 0 ? <p className="text-muted">No eligible confirmed or processing orders.</p> : <div style={{ display: 'grid', gap: '.5rem', marginTop: '.75rem' }}>{eligibleOrders.map(order => <button type="button" key={order.id} className="btn" onClick={() => { setSelectedOrder(order); setTotalAmount(String(order.netAmount)); }} style={{ textAlign: 'left', background: selectedOrder?.id === order.id ? 'var(--accent-primary)' : 'var(--bg-secondary)', color: selectedOrder?.id === order.id ? 'white' : 'var(--text-primary)' }}><strong>{order.orderNumber}</strong> · {order.status} · {Number(order.netAmount).toLocaleString()} EGP</button>)}</div>}</>}</div>
      <div className="card mb-4"><h2 style={{ fontSize: '1rem' }}>Plan Terms</h2><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginTop: '1rem' }}><label className="input-group"><span className="input-label">Total amount</span><input className="input" type="number" min="0.01" step="0.01" value={totalAmount} onChange={event => setTotalAmount(event.target.value)} /></label><label className="input-group"><span className="input-label">Down payment</span><input className="input" type="number" min="0" step="0.01" value={downPayment} onChange={event => setDownPayment(event.target.value)} /></label><label className="input-group"><span className="input-label">Installments</span><input className="input" type="number" min="1" max="120" value={count} onChange={event => setCount(event.target.value)} /></label><label className="input-group"><span className="input-label">Frequency</span><select className="input" value={frequency} onChange={event => setFrequency(event.target.value as InstallmentFrequency)}><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option></select></label><label className="input-group"><span className="input-label">Start date</span><input className="input" type="date" value={startDate} onChange={event => setStartDate(event.target.value)} /></label></div></div>
      <div className="card mb-4"><h2 style={{ fontSize: '1rem' }}>Schedule Preview</h2>{preview.length === 0 ? <p className="text-muted">Enter valid plan terms to preview installments.</p> : <div className="table-container"><table><thead><tr><th>#</th><th>Due date</th><th>Amount</th></tr></thead><tbody>{preview.map(item => <tr key={item.number}><td>{item.number}</td><td>{item.dueDate.toLocaleDateString()}</td><td>{item.amount.toLocaleString(undefined, { style: 'currency', currency: 'EGP' })}</td></tr>)}</tbody></table></div>}</div>
      <button className="btn btn-primary" type="submit" disabled={createMutation.isPending}><Plus size={16} />{createMutation.isPending ? 'Saving...' : 'Create Financing Plan'}</button>
    </form>
  </div>;
}
