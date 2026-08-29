import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { CreditCard, Search, ChevronRight, AlertCircle, Plus } from 'lucide-react';
import { financingContracts, type FinancingContractStatus } from '../api';
import CustomerSearch from '../components/CustomerSearch';
import { useBranch } from '../contexts/BranchContext';
import Badge from '../components/Badge';

interface Props {
  lang: 'en' | 'ar';
}

const t = {
  en: {
    title: 'Financing Contracts',
    subtitle: 'contracts',
    search: 'Search by contract number or customer...',
    contractNumber: 'Contract #',
    customer: 'Customer',
    order: 'Order',
    totalAmount: 'Total Amount',
    financed: 'Financed',
    installments: 'Installments',
    status: 'Status',
    startDate: 'Start Date',
    paid: 'Paid',
    remaining: 'Remaining',
    nextDue: 'Next Due',
    view: 'View',
    all: 'All',
    active: 'Active',
    completed: 'Completed',
    defaulted: 'Defaulted',
    cancelled: 'Cancelled',
    noData: 'No financing contracts found.',
    loading: 'Loading…',
    error: 'Failed to load contracts.',
  },
  ar: {
    title: 'عقود التمويل',
    subtitle: 'عقد',
    search: 'البحث برقم العقد أو العميل...',
    contractNumber: 'رقم العقد',
    customer: 'العميل',
    order: 'الطلب',
    totalAmount: 'المبلغ الإجمالي',
    financed: 'الممول',
    installments: 'الأقساط',
    status: 'الحالة',
    startDate: 'تاريخ البدء',
    paid: 'المدفوع',
    remaining: 'المتبقي',
    nextDue: 'الاستحقاق التالي',
    view: 'عرض',
    all: 'الكل',
    active: 'نشط',
    completed: 'مكتمل',
    defaulted: 'متعثر',
    cancelled: 'ملغى',
    noData: 'لا توجد عقود تمويل.',
    loading: 'جاري التحميل…',
    error: 'فشل التحميل.',
  },
};

const STATUSES: { key: FinancingContractStatus | 'all'; label: { en: string; ar: string } }[] = [
  { key: 'all', label: { en: 'All', ar: 'الكل' } },
  { key: 'active', label: { en: 'Active', ar: 'نشط' } },
  { key: 'completed', label: { en: 'Completed', ar: 'مكتمل' } },
  { key: 'defaulted', label: { en: 'Defaulted', ar: 'متعثر' } },
  { key: 'cancelled', label: { en: 'Cancelled', ar: 'ملغى' } },
];

export default function FinancingContracts({ lang }: Props) {
  const i18n = t[lang];
  const isRtl = lang === 'ar';
  const navigate = useNavigate();
  const { branchId } = useBranch();
  const [statusFilter, setStatusFilter] = useState<FinancingContractStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [customerId, setCustomerId] = useState<string>();
  const [customerName, setCustomerName] = useState('');
  const [startDateFrom, setStartDateFrom] = useState('');
  const [startDateTo, setStartDateTo] = useState('');

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    const timer = setTimeout(() => setDebouncedSearch(value), 500);
    return () => clearTimeout(timer);
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: ['financing-contracts', statusFilter, debouncedSearch, customerId, startDateFrom, startDateTo],
    queryFn: () =>
      financingContracts.list({
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: debouncedSearch || undefined,
        customerId,
        // branchId intentionally omitted — the server scopes by the JWT user's
        // own branchId for non-super_admin users; sending it here is a no-op
        // and matches the site-wide decision to not forward hardcoded branchIds.
        startDateFrom: startDateFrom || undefined,
        startDateTo: startDateTo || undefined,
        limit: 50,
      }),
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(isRtl ? 'ar-EG' : 'en-EG', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(isRtl ? 'ar-EG' : 'en-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="page-container" style={{ direction: isRtl ? 'rtl' : 'ltr' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <CreditCard size={32} />
            {i18n.title}
          </h1>
          <p className="text-muted" style={{ fontSize: '0.875rem' }}>
            {data?.total ?? 0} {i18n.subtitle}
          </p>
        </div>
          <button className="btn btn-primary" onClick={() => navigate('/financing/new')}>
            <Plus size={16} /> Create Plan
          </button>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem', display: 'flex', gap: '.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <CustomerSearch lang={lang} onSelect={customer => { setCustomerId(customer.id); setCustomerName(customer.name); }} trigger={<button type="button" className="btn btn-secondary">{customerName || 'Customer'}</button>} />
        {customerId && <button className="btn btn-outline" onClick={() => { setCustomerId(undefined); setCustomerName(''); }}>Clear customer</button>}
        <select className="input" value={branchId ?? ''} disabled><option value="">Main Branch</option></select>
        <input className="input" type="date" value={startDateFrom} onChange={event => setStartDateFrom(event.target.value)} />
        <input className="input" type="date" value={startDateTo} onChange={event => setStartDateTo(event.target.value)} />
      </div>

      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: '1 1 300px', position: 'relative' }}>
            <Search
              size={18}
              style={{ position: 'absolute', [isRtl ? 'right' : 'left']: '0.75rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }}
            />
            <input
              type="text"
              className="input"
              placeholder={i18n.search}
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              style={{ width: '100%', [isRtl ? 'paddingRight' : 'paddingLeft']: '2.5rem' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {STATUSES.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                className={statusFilter === key ? 'btn btn-primary' : 'btn btn-secondary'}
                style={{ fontSize: '0.875rem' }}
              >
                {label[lang]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
          <p className="text-muted">{i18n.loading}</p>
        </div>
      )}

      {isError && (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', borderLeft: '3px solid #ef4444' }}>
          <AlertCircle size={48} style={{ margin: '0 auto 1rem', color: '#ef4444' }} />
          <p style={{ color: '#ef4444' }}>{i18n.error}</p>
        </div>
      )}

      {!isLoading && !isError && (data?.items ?? []).length === 0 && (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <CreditCard size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
          <p className="text-muted">{i18n.noData}</p>
        </div>
      )}

      {!isLoading && !isError && (data?.items ?? []).length > 0 && (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>{i18n.contractNumber}</th>
                <th>{i18n.customer}</th>
                <th>{i18n.order}</th>
                <th style={{ textAlign: isRtl ? 'left' : 'right' }}>{i18n.totalAmount}</th>
                <th style={{ textAlign: isRtl ? 'left' : 'right' }}>{i18n.financed}</th>
                <th style={{ textAlign: isRtl ? 'left' : 'right' }}>{i18n.paid}</th>
                <th style={{ textAlign: isRtl ? 'left' : 'right' }}>{i18n.remaining}</th>
                <th>{i18n.nextDue}</th>
                <th style={{ textAlign: 'center' }}>{i18n.installments}</th>
                <th>{i18n.startDate}</th>
                <th>{i18n.status}</th>
                <th style={{ width: '80px' }}></th>
              </tr>
            </thead>
            <tbody>
              {(data?.items ?? []).map((contract) => (
                <tr key={contract.id} style={{ background: contract.installments?.some(installment => installment.status === 'overdue') ? 'rgba(239,68,68,0.08)' : undefined }}>
                  {(() => {
                    const schedule = contract.installments ?? [];
                    const paid = schedule.reduce((sum, installment) => sum + installment.paidAmount, 0);
                    const remaining = schedule.reduce((sum, installment) => sum + Math.max(0, installment.amount - installment.paidAmount), 0);
                    const next = schedule.find(installment => installment.status !== 'paid');
                    return <>
                  <td>
                    <code style={{ fontSize: '0.875rem', fontWeight: 600 }}>{contract.contractNumber}</code>
                  </td>
                  <td>
                    <div>
                      <div style={{ fontWeight: 500 }}>{contract.customer.name}</div>
                      <div className="text-muted" style={{ fontSize: '0.75rem' }}>{contract.customer.phone}</div>
                    </div>
                  </td>
                  <td>
                    <Link to={`/orders/${contract.order.id}`} className="link">
                      {contract.order.orderNumber}
                    </Link>
                  </td>
                  <td style={{ textAlign: isRtl ? 'left' : 'right', fontWeight: 600 }}>
                    {formatCurrency(contract.totalAmount)}
                  </td>
                  <td style={{ textAlign: isRtl ? 'left' : 'right', fontWeight: 600, color: '#3b82f6' }}>
                    {formatCurrency(contract.financingAmount)}
                  </td>
                  <td>{formatCurrency(paid)}</td>
                  <td>{formatCurrency(remaining)}</td>
                  <td>{next ? formatDate(next.dueDate) : '—'}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{ display: 'inline-block', padding: '0.25rem 0.75rem', background: '#f1f5f9', borderRadius: '9999px', fontSize: '0.875rem', fontWeight: 600 }}>
                      {contract.numberOfInstallments}
                    </span>
                  </td>
                  <td className="text-muted" style={{ fontSize: '0.875rem' }}>
                    {formatDate(contract.startDate)}
                  </td>
                  <td>
                    <Badge status={contract.status} lang={lang} />
                  </td>
                  <td>
                    <Link to={`/financing/${contract.id}`} className="btn btn-secondary" style={{ padding: '0.375rem 0.75rem', fontSize: '0.875rem' }}>
                      {i18n.view} <ChevronRight size={16} />
                    </Link>
                  </td>
                  </>;
                  })()}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
