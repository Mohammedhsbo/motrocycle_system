import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, UserRound, RefreshCw } from 'lucide-react';
import { pos } from '../api';
import CustomerFormPOS from '../components/CustomerFormPOS';
import { DataList, DataTableState } from '../components/DataTable';
import type { CustomerDetail } from '../api';

type Lang = 'en' | 'ar';

export default function Customers({ lang }: { lang: Lang }) {
  const [query, setQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const isRtl = lang === 'ar';
  const { data = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['desktop-customers', query],
    queryFn: () => pos.searchCustomers(query),
    enabled: query.length >= 2,
  });

  return <section className="desktop-page" dir={isRtl ? 'rtl' : 'ltr'}>
    <div className="page-heading"><div><span className="eyebrow">{isRtl ? 'دليل العملاء' : 'Customer directory'}</span><h1>{isRtl ? 'العملاء' : 'Customers'}</h1><p>{isRtl ? 'ابحث عن العميل قبل بدء البيع أو الحجز.' : 'Find a customer before starting a sale or reservation.'}</p></div><div className="report-controls"><button className="secondary-action" onClick={() => refetch()}><RefreshCw size={16} /> {isRtl ? 'تحديث' : 'Refresh'}</button><button className="primary-action" onClick={() => setShowCreate(true)}>{isRtl ? 'عميل جديد' : 'New customer'}</button></div></div>
    <div className="toolbar"><div className="search-box"><Search size={17} /><input autoFocus value={query} onChange={event => setQuery(event.target.value)} placeholder={isRtl ? 'الاسم أو الهاتف...' : 'Name or phone...'} /></div></div>
    {query.length < 2 && <div className="state-panel">{isRtl ? 'اكتب حرفين على الأقل لبدء البحث.' : 'Enter at least two characters to search.'}</div>}
    {isLoading && <DataTableState kind="loading" lang={lang} />}
    {isError && <DataTableState kind="error" lang={lang} onRetry={() => refetch()} />}
    {!isLoading && !isError && query.length >= 2 && data.length === 0 && <DataTableState kind="empty" lang={lang} />}
    {!isLoading && !isError && data.length > 0 && <DataList className="customer-list">{data.map(customer => <article className="customer-row" key={customer.id}><div className="customer-avatar"><UserRound size={18} /></div><div className="customer-main"><strong>{customer.name}</strong><span>{customer.phone}{customer.email ? ` · ${customer.email}` : ''}</span></div><div className="customer-stats"><span>{customer.recentOrderCount ?? 0} {isRtl ? 'طلبات حديثة' : 'recent orders'}</span><span>{customer.activeReservationCount ?? 0} {isRtl ? 'حجوزات نشطة' : 'active reservations'}</span></div></article>)}</DataList>}
    {showCreate && <CustomerFormPOS lang={lang} onClose={() => setShowCreate(false)} onSuccess={(_customer: CustomerDetail) => { setShowCreate(false); void refetch(); }} />}
  </section>;
}
