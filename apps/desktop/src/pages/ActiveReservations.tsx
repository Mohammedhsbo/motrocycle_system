import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Bookmark, RefreshCw } from 'lucide-react';
import { pos } from '../api';
import { DataList, DataTableState } from '../components/DataTable';

export default function ActiveReservations({ lang, branchId }: { lang: 'en' | 'ar'; branchId?: string }) {
  const isRtl = lang === 'ar';
  const navigate = useNavigate();
  const [customerId, setCustomerId] = useState('');
  const [expiringInDays, setExpiringInDays] = useState('');
  const [search, setSearch] = useState('');
  const reservations = useQuery({
    queryKey: ['pos-active-reservations', branchId, customerId, expiringInDays],
    queryFn: () => pos.listActiveReservations({ branchId, customerId: customerId || undefined, expiringInDays: expiringInDays ? Number(expiringInDays) : undefined }),
  });
  const filteredReservations = reservations.data?.filter((reservation) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return [reservation.reservationNumber, reservation.customer.name, reservation.customer.phone, reservation.motorcycle.vin, reservation.motorcycle.model]
      .some((value) => value.toLowerCase().includes(term));
  }) ?? [];

  return <section className="desktop-page" dir={isRtl ? 'rtl' : 'ltr'}>
    <div className="page-heading"><div><span className="eyebrow">{isRtl ? 'الحجوزات النشطة' : 'Active reservations'}</span><h1>{isRtl ? 'حجوزات نقطة البيع' : 'POS reservations'}</h1><p>{isRtl ? 'حجوزات الفرع الحالي الجاهزة للمتابعة.' : 'Active reservations for the signed-in user branch.'}</p></div><button className="secondary-action" onClick={() => reservations.refetch()}><RefreshCw size={16} /> {isRtl ? 'تحديث' : 'Refresh'}</button></div>
    <div className="toolbar"><input className="pos-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={isRtl ? 'ابحث في الحجوزات...' : 'Search reservations...'} /><input className="pos-input" value={customerId} onChange={(event) => setCustomerId(event.target.value)} placeholder={isRtl ? 'معرف العميل (اختياري)' : 'Customer ID (optional)'} /><select className="pos-input" value={expiringInDays} onChange={(event) => setExpiringInDays(event.target.value)}><option value="">{isRtl ? 'كل المواعيد' : 'Any expiry'}</option><option value="3">{isRtl ? 'خلال 3 أيام' : 'Within 3 days'}</option><option value="7">{isRtl ? 'خلال 7 أيام' : 'Within 7 days'}</option><option value="30">{isRtl ? 'خلال 30 يوما' : 'Within 30 days'}</option></select></div>
    {reservations.isLoading && <DataTableState kind="loading" lang={lang} />}
    {reservations.isError && <DataTableState kind="error" lang={lang} onRetry={() => reservations.refetch()} />}
    {!reservations.isLoading && !reservations.isError && filteredReservations.length === 0 && <DataTableState kind="empty" lang={lang} />}
    {!reservations.isLoading && !reservations.isError && <DataList className="customer-list">{filteredReservations.map((reservation) => <button className="customer-row" key={reservation.id} onClick={() => navigate(`/reservations/${reservation.id}`)}><div className="customer-avatar"><Bookmark size={18} /></div><div className="customer-main"><strong>{reservation.reservationNumber}</strong><span>{reservation.customer.name} · {reservation.customer.phone}</span><span>{reservation.motorcycle.vin} · {reservation.motorcycle.model}</span></div><div className="customer-stats"><span>{isRtl ? 'المتبقي' : 'Remaining'}: {reservation.remainingAmount.toLocaleString()}</span><span>{new Date(reservation.expiresAt).toLocaleDateString(isRtl ? 'ar-EG' : 'en-EG')}</span></div></button>)}</DataList>}
  </section>;
}