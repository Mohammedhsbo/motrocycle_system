import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle, Edit3, ExternalLink, MessageCircle, Save, Trash2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { buildWhatsAppUrl } from '@motorcycle-system/shared-types';
import { customerFinancing, type InstallmentRequest } from '../api';

export default function InstallmentRequestDetail({ lang }: { lang: 'en' | 'ar' }) {
  const isRtl = lang === 'ar';
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ buyerName: '', buyerPhone: '', financingCompanyId: '', downPayment: '' });
  const query = useQuery<InstallmentRequest>({ queryKey: ['installment-request', id], queryFn: () => customerFinancing.getRequest(id!), enabled: Boolean(id) });
  const request = query.data;
  const edit = useMutation({ mutationFn: () => customerFinancing.updateRequest(id!, { buyerName: form.buyerName, buyerPhone: form.buyerPhone, financingCompanyId: form.financingCompanyId, downPayment: Number(form.downPayment) }), onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['installment-request', id] }); setEditing(false); } });
  const approve = useMutation({ mutationFn: () => customerFinancing.reviewRequest(id!, { status: 'approved' }), onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['installment-request', id] }); } });
  const remove = useMutation({ mutationFn: () => customerFinancing.deleteRequest(id!), onSuccess: () => navigate('/installment-requests') });
  const whatsapp = useMutation({ mutationFn: () => customerFinancing.getWhatsAppMessage(id!), onSuccess: ({ phone, message }) => window.open(buildWhatsAppUrl(phone, message), '_blank') });

  if (query.isLoading) return <div className="page-container">Loading...</div>;
  if (query.isError || !request) return <div className="page-container"><button className="btn btn-outline" onClick={() => navigate('/installment-requests')}><ArrowLeft size={16} /> {isRtl ? 'العودة' : 'Back'}</button><p>Failed to load request.</p></div>;

  const imageItems: Array<[string, string | null | undefined]> = [
    [isRtl ? 'بطاقة العميل - أمامي' : 'Buyer ID front', request.buyerNationalIdImage],
    [isRtl ? 'بطاقة العميل - خلفي' : 'Buyer ID back', request.buyerNationalIdBackImage],
    [isRtl ? 'المستند الداعم' : 'Supporting document', request.salarySlipImage],
    [isRtl ? 'بطاقة الضامن - أمامي' : 'Guarantor ID front', request.guarantorNationalIdImage],
    [isRtl ? 'بطاقة الضامن - خلفي' : 'Guarantor ID back', request.guarantorNationalIdBackImage],
    [isRtl ? 'توقيع الضامن' : 'Guarantor signature', request.guarantorSignatureImage],
  ];
  const startEdit = () => { setForm({ buyerName: request.buyerName, buyerPhone: request.buyerPhone, financingCompanyId: request.financingCompanyId, downPayment: String(request.downPayment) }); setEditing(true); };
  return <div className="page-container" style={{ direction: isRtl ? 'rtl' : 'ltr' }}>
    <button className="btn btn-outline" onClick={() => navigate('/installment-requests')}><ArrowLeft size={16} /> {isRtl ? 'العودة لطلبات التقسيط' : 'Back to requests'}</button>
    <div className="flex items-center justify-between mb-6" style={{ marginTop: '1rem' }}><div><h1>{isRtl ? 'تفاصيل طلب التقسيط' : 'Installment request details'}</h1><p className="text-muted">{request.id}</p></div><span className="badge">{request.status}</span></div>
    <div className="flex gap-2 mb-6" style={{ flexWrap: 'wrap' }}>
      <button className="btn btn-outline" onClick={() => whatsapp.mutate()} disabled={whatsapp.isPending}><MessageCircle size={16} /> {isRtl ? 'إرسال عبر واتساب' : 'Send via WhatsApp'}</button>
      {request.status !== 'approved' && <button className="btn btn-outline" onClick={() => approve.mutate()} disabled={approve.isPending}><CheckCircle size={16} /> {isRtl ? 'موافقة' : 'Approve'}</button>}
      <button className="btn btn-outline" onClick={startEdit}><Edit3 size={16} /> {isRtl ? 'تعديل' : 'Edit'}</button>
      <button className="btn" style={{ color: 'var(--error)' }} onClick={() => { if (window.confirm(isRtl ? 'حذف الطلب؟' : 'Delete this request?')) remove.mutate(); }} disabled={remove.isPending}><Trash2 size={16} /> {isRtl ? 'حذف' : 'Delete'}</button>
    </div>
    {editing && <form className="card mb-6" style={{ padding: '1rem' }} onSubmit={event => { event.preventDefault(); edit.mutate(); }}><div className="grid md:grid-cols-2 gap-4"><label className="input-group"><span className="input-label">{isRtl ? 'اسم العميل' : 'Customer name'}</span><input className="input-field" value={form.buyerName} onChange={event => setForm({ ...form, buyerName: event.target.value })} /></label><label className="input-group"><span className="input-label">{isRtl ? 'الهاتف' : 'Phone'}</span><input className="input-field" value={form.buyerPhone} onChange={event => setForm({ ...form, buyerPhone: event.target.value })} /></label><label className="input-group"><span className="input-label">{isRtl ? 'شركة التمويل' : 'Financing company ID'}</span><input className="input-field" value={form.financingCompanyId} onChange={event => setForm({ ...form, financingCompanyId: event.target.value })} /></label><label className="input-group"><span className="input-label">{isRtl ? 'الدفعة المقدمة' : 'Down payment'}</span><input className="input-field" type="number" min="0" value={form.downPayment} onChange={event => setForm({ ...form, downPayment: event.target.value })} /></label></div><button className="btn btn-primary" type="submit" disabled={edit.isPending}><Save size={16} /> {isRtl ? 'حفظ التعديل' : 'Save changes'}</button></form>}
    <div className="grid md:grid-cols-2 gap-6"><div className="card" style={{ padding: '1rem' }}><h2>{isRtl ? 'بيانات العميل' : 'Customer'}</h2><p><strong>{request.buyerName}</strong></p><p>{request.buyerPhone}</p><p>{request.buyerEmail || '-'}</p><p>{request.buyerAddress || '-'}</p><p>{request.buyerOccupation || '-'}</p></div><div className="card" style={{ padding: '1rem' }}><h2>{isRtl ? 'بيانات الطلب' : 'Request'}</h2><p>{request.motorcycle?.brand?.nameEn} {request.motorcycle?.model}</p><p>{request.financingCompany?.name || '-'}</p><p>{isRtl ? 'الدفعة: ' : 'Down payment: '}{request.downPayment}</p><p>{isRtl ? 'القسط الشهري: ' : 'Monthly: '}{request.monthlyInstallment}</p><p>{isRtl ? 'المدة: ' : 'Duration: '}{request.duration?.months || '-'} {isRtl ? 'شهر' : 'months'}</p></div></div>
    <div className="card" style={{ padding: '1rem', marginTop: '1.5rem' }}><h2>{isRtl ? 'المستندات' : 'Documents'}</h2><div className="grid grid-cols-2 md:grid-cols-4 gap-4">{imageItems.map(([label, image]) => image && <a key={label} href={image} target="_blank" rel="noreferrer"><span className="text-xs text-muted block mb-2">{label}</span><img src={image} alt={label} style={{ width: '100%', height: 140, objectFit: 'cover', border: '1px solid var(--border-color)', borderRadius: 8 }} /><ExternalLink size={14} /></a>)}</div></div>
  </div>;
}