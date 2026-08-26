import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileImage, MessageCircle, Plus, Search, UserRound } from 'lucide-react';
import { customerInquiries, customers, type CustomerInquiryInput, type CustomerSearchResult } from '../api';
import { DataList, DataTableState } from '../components/DataTable';
import { buildWhatsAppUrl } from '../../../../packages/shared-types/src/whatsapp';

type Lang = 'en' | 'ar';

export default function CustomerInquiries({ lang }: { lang: Lang }) {
  const isRtl = lang === 'ar';
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [customerQuery, setCustomerQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSearchResult | null>(null);
  const [form, setForm] = useState({ address: '', phone: '', occupation: '', occupationAddress: '' });
  const [front, setFront] = useState<File | null>(null);
  const [back, setBack] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inquiries = useQuery({ queryKey: ['customer-inquiries'], queryFn: customerInquiries.list });
  const search = useQuery({ queryKey: ['inquiry-customer-search', customerQuery], queryFn: () => customers.search({ q: customerQuery }), enabled: customerQuery.length >= 2 && !selectedCustomer });
  const create = useMutation({
    mutationFn: (input: CustomerInquiryInput) => customerInquiries.create(input),
    onSuccess: () => { setShowForm(false); setSelectedCustomer(null); setCustomerQuery(''); setFront(null); setBack(null); setForm({ address: '', phone: '', occupation: '', occupationAddress: '' }); void queryClient.invalidateQueries({ queryKey: ['customer-inquiries'] }); },
    onError: (err: Error) => setError(err.message),
  });
  const send = useMutation({ mutationFn: customerInquiries.sendWhatsApp, onSuccess: ({ phone, message }) => window.open(buildWhatsAppUrl(phone, message), '_blank') });

  function submit(event: FormEvent) {
    event.preventDefault(); setError(null);
    if (!selectedCustomer || !front || !back) { setError(isRtl ? 'اختر عميلاً وأرفق صورتي الهوية.' : 'Select a customer and attach both ID images.'); return; }
    create.mutate({ ...form, customerId: selectedCustomer.id, idCardFrontImage: front, idCardBackImage: back });
  }

  return <section className="desktop-page" dir={isRtl ? 'rtl' : 'ltr'}>
    <div className="page-heading"><div><span className="eyebrow">{isRtl ? 'تحقق العملاء' : 'Customer verification'}</span><h1>{isRtl ? 'استعلامات' : 'Inquiries'}</h1><p>{isRtl ? 'سجل بيانات التحقق واربطها بالعميل.' : 'Capture verification details and link them to a customer.'}</p></div><button className="primary-action" onClick={() => setShowForm(true)}><Plus size={17} /> {isRtl ? 'استعلام جديد' : 'New inquiry'}</button></div>
    {showForm && <form className="surface-panel" onSubmit={submit} style={{ marginBottom: '1.5rem', display: 'grid', gap: '1rem' }}>
      <div className="panel-heading"><h2>{isRtl ? 'بيانات الاستعلام' : 'Inquiry details'}</h2><button type="button" className="secondary-action" onClick={() => setShowForm(false)}>{isRtl ? 'إلغاء' : 'Cancel'}</button></div>
      {error && <div className="state-panel" role="alert">{error}</div>}
      {!selectedCustomer ? <><div className="search-box"><Search size={17} /><input autoFocus value={customerQuery} onChange={event => setCustomerQuery(event.target.value)} placeholder={isRtl ? 'ابحث عن العميل بالاسم أو الهاتف...' : 'Search customer by name or phone...'} /></div>{search.data?.map(customer => <button type="button" className="customer-row" key={customer.id} onClick={() => { setSelectedCustomer(customer); setForm(current => ({ ...current, phone: customer.phone })); }}><UserRound size={18} /><strong>{customer.name}</strong><span>{customer.phone}</span></button>)}</> : <div className="customer-row"><UserRound size={18} /><strong>{selectedCustomer.name}</strong><span>{selectedCustomer.phone}</span><button type="button" className="secondary-action" onClick={() => setSelectedCustomer(null)}>{isRtl ? 'تغيير' : 'Change'}</button></div>}
      <div className="form-grid">{([['address', isRtl ? 'العنوان' : 'Address'], ['phone', isRtl ? 'رقم الهاتف' : 'Phone'], ['occupation', isRtl ? 'المهنة' : 'Occupation'], ['occupationAddress', isRtl ? 'عنوان المهنة' : 'Occupation address']] as const).map(([key, label]) => <label key={key}>{label}<input required value={form[key]} onChange={event => setForm({ ...form, [key]: event.target.value })} /></label>)}</div>
      <div className="form-grid"><label><FileImage size={16} /> {isRtl ? 'صورة الهوية الأمامية' : 'ID card front'}<input required type="file" accept="image/jpeg,image/png,image/webp" onChange={event => setFront(event.target.files?.[0] ?? null)} /></label><label><FileImage size={16} /> {isRtl ? 'صورة الهوية الخلفية' : 'ID card back'}<input required type="file" accept="image/jpeg,image/png,image/webp" onChange={event => setBack(event.target.files?.[0] ?? null)} /></label></div>
      <button className="primary-action" disabled={create.isPending}>{create.isPending ? (isRtl ? 'جاري الحفظ...' : 'Saving...') : (isRtl ? 'حفظ الاستعلام' : 'Save inquiry')}</button>
    </form>}
    {inquiries.isLoading && <DataTableState kind="loading" lang={lang} />}
    {!inquiries.isLoading && inquiries.data?.length === 0 && <DataTableState kind="empty" lang={lang} />}
    {!inquiries.isLoading && inquiries.data && inquiries.data.length > 0 && <DataList className="inquiry-list">{inquiries.data.map(inquiry => <article className="surface-panel" key={inquiry.id} style={{ marginBottom: '1rem' }}><div className="panel-heading"><div><h2>{inquiry.customer.name}</h2><span>{inquiry.phone} · {inquiry.occupation}</span></div><button className="secondary-action" disabled={send.isPending} onClick={() => send.mutate(inquiry.id)}><MessageCircle size={16} /> {isRtl ? 'فتح واتساب' : 'Open WhatsApp'}</button></div><div className="inquiry-details"><span>{inquiry.address}</span><span>{inquiry.occupationAddress}</span><small>{new Date(inquiry.createdAt).toLocaleString(isRtl ? 'ar-EG' : 'en-GB')}</small></div></article>)}</DataList>}
  </section>;
}