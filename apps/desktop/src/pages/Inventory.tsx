import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bike, Search, RefreshCw } from 'lucide-react';
import { pos } from '../api';

type Lang = 'en' | 'ar';

export default function Inventory({ lang }: { lang: Lang }) {
  const [query, setQuery] = useState('');
  const isRtl = lang === 'ar';
  const { data = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['desktop-inventory', query],
    queryFn: () => pos.searchMotorcycles(query, undefined, 50),
    enabled: query.length === 0 || query.length >= 2,
  });
  const money = (value: number) => `${value.toLocaleString(isRtl ? 'ar-EG' : 'en-EG', { maximumFractionDigits: 0 })} ${isRtl ? 'ج.م' : 'EGP'}`;

  return <section className="desktop-page" dir={isRtl ? 'rtl' : 'ltr'}>
    <div className="page-heading"><div><span className="eyebrow">{isRtl ? 'المخزون الحي' : 'Live inventory'}</span><h1>{isRtl ? 'المخزون' : 'Inventory'}</h1><p>{isRtl ? 'الوحدات المتاحة في نطاق الفرع الحالي.' : 'Available units within the current branch scope.'}</p></div><button className="secondary-action" onClick={() => refetch()}><RefreshCw size={16} /> {isRtl ? 'تحديث' : 'Refresh'}</button></div>
    <div className="toolbar"><div className="search-box"><Search size={17} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder={isRtl ? 'ابحث بالموديل أو رقم الهيكل...' : 'Search model or VIN...'} /></div><span className="result-count">{data.length} {isRtl ? 'وحدة' : 'units'}</span></div>
    {isLoading && <div className="inventory-grid">{[1, 2, 3, 4].map(item => <div className="inventory-card skeleton" key={item} />)}</div>}
    {isError && <div className="state-panel">{isRtl ? 'تعذر تحميل المخزون.' : 'Could not load inventory.'}</div>}
    {!isLoading && !isError && data.length === 0 && <div className="state-panel">{isRtl ? 'لا توجد وحدات متاحة.' : 'No available units found.'}</div>}
    {!isLoading && !isError && <div className="inventory-grid">{data.map(motorcycle => <article className="inventory-card" key={motorcycle.id}><div className="inventory-image">{motorcycle.images?.[0] ? <img src={motorcycle.images[0]} alt="" /> : <Bike size={38} />}</div><div className="inventory-info"><span className="inventory-brand">{isRtl ? motorcycle.brand.nameAr : motorcycle.brand.nameEn}</span><h2>{motorcycle.model}</h2><p>{motorcycle.year} · {motorcycle.color || (isRtl ? 'بدون لون' : 'No color')}</p><code>{motorcycle.vin}</code><div className="inventory-footer"><strong>{money(motorcycle.price)}</strong><span className="status-pill">{isRtl ? 'متاح' : 'Available'}</span></div></div></article>)}</div>}
  </section>;
}
