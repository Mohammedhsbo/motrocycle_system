import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Search, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { pos, type OrderStatus } from '../api';
import { DataList, DataTableState, DateRangeFilter } from '../components/DataTable';

export default function TransactionHistory({ lang }: { lang: 'en' | 'ar' }) {
  const isRtl = lang === 'ar';
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<OrderStatus | ''>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const query = useQuery({ queryKey: ['desktop-transactions', search, status, startDate, endDate, page], queryFn: () => pos.listOrders({ search: search || undefined, status: status || 'completed', paymentType: 'CASH', page, limit: 25 }) });
  const result = query.data;
  const totalPages = result?.totalPages ?? (result ? Math.max(1, Math.ceil(result.total / result.limit)) : 1);

  return (
    <div className="space-y-4 history-page">
      <div className="page-heading history-heading"><div><span className="eyebrow">{isRtl ? 'السجل الكامل' : 'Full history'}</span><h1>{isRtl ? 'سجل المعاملات' : 'Transaction history'}</h1><p>{isRtl ? 'بحث في طلبات الفرع الحالي.' : 'Search orders in the signed-in user branch.'}</p></div><button className="secondary-action" onClick={() => query.refetch()}><RefreshCw size={16} /> {isRtl ? 'تحديث' : 'Refresh'}</button></div>

      {/* Filters */}
      <div className="history-filters bg-white border border-gray-200 rounded-lg p-4 space-y-3">
        <div>
          <div className="search-box"><Search size={17} /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder={isRtl ? 'رقم الطلب أو العميل أو الهيكل...' : 'Order, customer, or VIN...'} /></div>
        </div>

        <div className="history-filter-row"><select className="pos-input" value={status} onChange={(event) => { setStatus(event.target.value as OrderStatus | ''); setPage(1); }}><option value="">{isRtl ? 'كل الحالات' : 'All statuses'}</option>{(['draft', 'confirmed', 'processing', 'awaiting_delivery', 'completed', 'cancelled', 'refunded'] as OrderStatus[]).map((value) => <option key={value} value={value}>{value}</option>)}</select><DateRangeFilter startLabel={isRtl ? 'من' : 'From'} endLabel={isRtl ? 'إلى' : 'To'} startValue={startDate} endValue={endDate} onStartChange={(value) => { setStartDate(value); setPage(1); }} onEndChange={(value) => { setEndDate(value); setPage(1); }} /></div>
      </div>

      {query.isLoading && <DataTableState kind="loading" lang={lang} />}
      {query.isError && <DataTableState kind="error" lang={lang} onRetry={() => query.refetch()} />}
      {!query.isLoading && !query.isError && result?.items.length === 0 && <DataTableState kind="empty" lang={lang} />}
      {!query.isLoading && !query.isError && result && result.items.length > 0 && <><DataList className="customer-list history-records history-grid">{result.items.map((order) => <button className="customer-row record-card history-grid-card" key={order.id} onClick={() => navigate(`/transactions/${order.id}`)}><div className="customer-main"><strong>{order.orderNumber}</strong><span>{order.customer.name} · {order.customer.phone}</span><span>{order.itemCount} {isRtl ? 'عناصر' : 'items'} · {new Date(order.createdAt).toLocaleString(isRtl ? 'ar-EG' : 'en-EG')}</span></div><div className="customer-stats"><span className={`status-pill status-${order.status}`}>{order.status}</span><strong>{order.netAmount.toLocaleString()} {isRtl ? 'ج.م' : 'EGP'}</strong></div></button>)}</DataList><div className="panel-heading history-pagination"><span>{result.total} {isRtl ? 'معاملة' : 'transactions'}</span><div><button className="icon-button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} title="Previous">{isRtl ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}</button><span>{page} / {totalPages}</span><button className="icon-button" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)} title="Next">{isRtl ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}</button></div></div></>}
    </div>
  );
}
