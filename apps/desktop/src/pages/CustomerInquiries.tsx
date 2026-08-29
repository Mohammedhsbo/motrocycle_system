import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileImage, MessageCircle, Plus, PenTool, CheckCircle2 } from 'lucide-react';
import { inquiries, type InquiryInput, type InquiryDocumentType, pos, getUser } from '../api';
import { DataList, DataTableState } from '../components/DataTable';
import { buildWhatsAppUrl } from '../../../../packages/shared-types/src/whatsapp';
import MotorcycleSearchPOS from '../components/MotorcycleSearchPOS';
import { useViewingBranch } from '../contexts/ViewingBranchContext';

type Lang = 'en' | 'ar';

export default function CustomerInquiries({ lang }: { lang: Lang }) {
  const isRtl = lang === 'ar';
  const queryClient = useQueryClient();
  const { viewingBranchId } = useViewingBranch();
  const user = getUser();
  
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<{
    customerName: string;
    customerPhone: string;
    documentType: InquiryDocumentType;
    downPayment: string;
    motorcycleId: string;
  }>({
    customerName: '',
    customerPhone: '',
    documentType: 'PENSION',
    downPayment: '',
    motorcycleId: '',
  });

  const [documentImage, setDocumentImage] = useState<File | null>(null);
  const [idCardFrontImage, setIdCardFrontImage] = useState<File | null>(null);
  const [idCardBackImage, setIdCardBackImage] = useState<File | null>(null);
  const [guarantorIdFrontImage, setGuarantorIdFrontImage] = useState<File | null>(null);
  const [guarantorIdBackImage, setGuarantorIdBackImage] = useState<File | null>(null);
  const [guarantorSignatureImage, setGuarantorSignatureImage] = useState<File | null>(null);
  
  const [error, setError] = useState<string | null>(null);
  const inquiriesQuery = useQuery({ queryKey: ['inquiries'], queryFn: inquiries.list });
  
  const create = useMutation({
    mutationFn: (input: InquiryInput) => inquiries.create(input),
    onSuccess: (data) => { 
      setShowForm(false); 
      resetForm();
      void queryClient.invalidateQueries({ queryKey: ['inquiries'] }); 
      
      // WhatsApp Integration
      const waNumber = user?.whatsappSenderNumber || data.customerPhone;
      let msg = isRtl ? `*استعلام جديد*\n\nالعميل: ${data.customerName}\nالهاتف: ${data.customerPhone}\n` : `*New Inquiry*\n\nCustomer: ${data.customerName}\nPhone: ${data.customerPhone}\n`;
      if (data.motorcycle) {
        const bikeName = isRtl ? data.motorcycle.brand.nameAr : data.motorcycle.brand.nameEn;
        msg += isRtl ? `الدراجة: ${bikeName} ${data.motorcycle.model}\n` : `Motorcycle: ${bikeName} ${data.motorcycle.model}\n`;
      }
      if (data.downPayment) {
        msg += isRtl ? `الدفعة المقدمة: ${data.downPayment}\n` : `Down payment: ${data.downPayment}\n`;
      }
      
      window.open(buildWhatsAppUrl(waNumber, msg), '_blank');
    },
    onError: (err: Error) => setError(err.message),
  });

  function resetForm() {
    setForm({ customerName: '', customerPhone: '', documentType: 'PENSION', downPayment: '', motorcycleId: '' });
    setDocumentImage(null);
    setIdCardFrontImage(null);
    setIdCardBackImage(null);
    setGuarantorIdFrontImage(null);
    setGuarantorIdBackImage(null);
    setGuarantorSignatureImage(null);
  }

  function submit(event: FormEvent) {
    event.preventDefault(); 
    setError(null);
    
    if (form.documentType === 'NEITHER') {
      if (!guarantorIdFrontImage || !guarantorIdBackImage || !guarantorSignatureImage) {
        setError(isRtl ? 'يجب إرفاق صور هوية وتوقيع الضامن.' : 'Guarantor ID images and signature are required.');
        return;
      }
    } else {
      if (!documentImage || !idCardFrontImage || !idCardBackImage) {
        setError(isRtl ? 'يجب إرفاق المستند وصور هوية العميل.' : 'Document and Customer ID images are required.');
        return;
      }
    }

    create.mutate({ 
      ...form, 
      downPayment: form.downPayment ? parseFloat(form.downPayment) : undefined,
      documentImage: documentImage || undefined,
      idCardFrontImage: idCardFrontImage || undefined, 
      idCardBackImage: idCardBackImage || undefined,
      guarantorIdFrontImage: guarantorIdFrontImage || undefined,
      guarantorIdBackImage: guarantorIdBackImage || undefined,
      guarantorSignatureImage: guarantorSignatureImage || undefined,
    });
  }

  const docTypeLabels: Record<InquiryDocumentType, string> = {
    PENSION: isRtl ? 'بيان معاش' : 'Pension statement',
    COMMERCIAL_REGISTRY: isRtl ? 'سجل تجاري' : 'Commercial registry',
    NEITHER: isRtl ? 'لا يوجد (ضامن)' : 'Neither (Guarantor)',
  };

  return (
    <section className="desktop-page" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="page-heading">
        <div>
          <span className="eyebrow">{isRtl ? 'استعلامات التقسيط' : 'Installment Inquiries'}</span>
          <h1>{isRtl ? 'الاستعلامات' : 'Inquiries'}</h1>
          <p>{isRtl ? 'سجل بيانات استعلام التقسيط وأرسلها للمراجعة.' : 'Capture installment inquiry details.'}</p>
        </div>
        <button className="primary-action" onClick={() => { setShowForm(true); resetForm(); }}>
          <Plus size={17} /> {isRtl ? 'استعلام جديد' : 'New inquiry'}
        </button>
      </div>

      {showForm && (
        <form className="inquiry-create-form" onSubmit={submit}>
          <div className="inquiry-form-heading">
            <div>
              <span className="eyebrow">{isRtl ? 'طلب جديد' : 'New request'}</span>
              <h2>{isRtl ? 'بيانات الاستعلام' : 'Inquiry details'}</h2>
              <p>{isRtl ? 'أكمل البيانات والمستندات لإرسال الطلب للمراجعة.' : 'Complete the customer and document details before sending for review.'}</p>
            </div>
            <button type="button" className="secondary-action" onClick={() => setShowForm(false)}>
              {isRtl ? 'إلغاء' : 'Cancel'}
            </button>
          </div>
          
          {error && <div className="inquiry-form-error" role="alert">{error}</div>}
          
          <div className="inquiry-form-section">
            <div className="inquiry-section-heading">
              <span className="inquiry-section-number">01</span>
              <div><h3>{isRtl ? 'بيانات العميل' : 'Customer profile'}</h3><p>{isRtl ? 'من سيتلقى عرض التقسيط؟' : 'Who is receiving the installment offer?'}</p></div>
            </div>
          <div className="form-grid inquiry-customer-fields">
            <label>
              <span>{isRtl ? 'اسم العميل' : 'Customer Name'} *</span>
              <input required value={form.customerName} onChange={e => setForm({ ...form, customerName: e.target.value })} />
            </label>
            <label>
              <span>{isRtl ? 'رقم الهاتف' : 'Phone Number'} *</span>
              <input required value={form.customerPhone} onChange={e => setForm({ ...form, customerPhone: e.target.value })} />
            </label>
            
            <label>
              <span>{isRtl ? 'الدفعة المقدمة (اختياري)' : 'Down Payment (Optional)'}</span>
              <input type="number" min={0} value={form.downPayment} onChange={e => setForm({ ...form, downPayment: e.target.value })} />
            </label>
          </div>
          </div>

          <div className="inquiry-form-section inquiry-document-section">
            <div className="inquiry-section-heading">
              <span className="inquiry-section-number">02</span>
              <div><h3>{isRtl ? 'نوع المستند' : 'Document route'}</h3><p>{isRtl ? 'اختر المستند المتوفر للعميل.' : 'Choose the document route available for this customer.'}</p></div>
            </div>
            <div className="inquiry-document-options">
              {(['PENSION', 'COMMERCIAL_REGISTRY', 'NEITHER'] as const).map(type => (
                <label key={type} className={`inquiry-document-option ${form.documentType === type ? 'is-selected' : ''}`}>
                  <input 
                    type="radio" 
                    name="documentType"
                    checked={form.documentType === type}
                    onChange={() => setForm({ ...form, documentType: type })}
                  />
                  <span><strong>{docTypeLabels[type]}</strong><small>{form.documentType === type ? (isRtl ? 'محدد' : 'Selected') : (isRtl ? 'اضغط للاختيار' : 'Select route')}</small></span>
                </label>
              ))}
            </div>
          </div>

          <div className="inquiry-form-section inquiry-upload-section">
            <div className="inquiry-section-heading">
              <span className="inquiry-section-number">03</span>
              <div><h3>{isRtl ? 'رفع المستندات' : 'Upload documents'}</h3><p>{isRtl ? 'صور واضحة بصيغة JPG أو PNG أو WEBP.' : 'Use clear JPG, PNG, or WEBP images.'}</p></div>
            </div>
          <div className="inquiry-upload-panel">
            {form.documentType !== 'NEITHER' ? (
              <div className="form-grid inquiry-upload-grid">
                <label>
                  <FileImage size={16} /> {isRtl ? 'صورة المستند المتوفر' : 'Available document image'} *
                  <input required type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={event => setDocumentImage(event.target.files?.[0] ?? null)} />
                </label>
                <label>
                  <FileImage size={16} /> {isRtl ? 'صورة الهوية الأمامية' : 'ID card front'} *
                  <input required type="file" accept="image/jpeg,image/png,image/webp" onChange={event => setIdCardFrontImage(event.target.files?.[0] ?? null)} />
                </label>
                <label>
                  <FileImage size={16} /> {isRtl ? 'صورة الهوية الخلفية' : 'ID card back'} *
                  <input required type="file" accept="image/jpeg,image/png,image/webp" onChange={event => setIdCardBackImage(event.target.files?.[0] ?? null)} />
                </label>
              </div>
            ) : (
              <div className="form-grid inquiry-upload-grid">
                <label>
                  <FileImage size={16} /> {isRtl ? 'صورة هوية الضامن الأمامية' : 'Guarantor ID front'} *
                  <input required type="file" accept="image/jpeg,image/png,image/webp" onChange={event => setGuarantorIdFrontImage(event.target.files?.[0] ?? null)} />
                </label>
                <label>
                  <FileImage size={16} /> {isRtl ? 'صورة هوية الضامن الخلفية' : 'Guarantor ID back'} *
                  <input required type="file" accept="image/jpeg,image/png,image/webp" onChange={event => setGuarantorIdBackImage(event.target.files?.[0] ?? null)} />
                </label>
                <label>
                  <PenTool size={16} /> {isRtl ? 'صورة توقيع الضامن' : 'Guarantor signature'} *
                  <input required type="file" accept="image/jpeg,image/png,image/webp" onChange={event => setGuarantorSignatureImage(event.target.files?.[0] ?? null)} />
                </label>
              </div>
            )}
          </div>
          </div>

          <div className="inquiry-form-section inquiry-motorcycle-section">
            <div className="inquiry-section-heading">
              <span className="inquiry-section-number">04</span>
              <div><h3>{isRtl ? 'الدراجة المطلوبة' : 'Requested motorcycle'}</h3><p>{isRtl ? 'اختياري: اربط الاستعلام بدراجة محددة.' : 'Optional: link the inquiry to a specific motorcycle.'}</p></div>
            </div>
            <MotorcycleSearchPOS 
              lang={lang} 
              branchId={viewingBranchId ?? undefined} 
              onSelect={(mc) => setForm({ ...form, motorcycleId: mc.id })}
              selectedMotorcycleId={form.motorcycleId}
            />
          </div>

          <div className="inquiry-form-actions">
            <span>{isRtl ? 'سيتم فتح واتساب بعد الحفظ' : 'WhatsApp will open after saving'}</span>
            <button className="primary-action inquiry-submit" disabled={create.isPending}>
              <MessageCircle size={18} />
              {create.isPending ? (isRtl ? 'جاري الإرسال...' : 'Sending...') : (isRtl ? 'إرسال عبر الواتساب' : 'Send via WhatsApp')}
            </button>
          </div>
        </form>
      )}

      {inquiriesQuery.isLoading && <DataTableState kind="loading" lang={lang} />}
      {!inquiriesQuery.isLoading && inquiriesQuery.data?.length === 0 && <DataTableState kind="empty" lang={lang} />}
      
      {!inquiriesQuery.isLoading && inquiriesQuery.data && inquiriesQuery.data.length > 0 && (
        <DataList className="inquiry-list">
          {inquiriesQuery.data.map(inquiry => (
            <article className="surface-panel" key={inquiry.id} style={{ marginBottom: '1rem' }}>
              <div className="panel-heading">
                <div>
                  <h2>{inquiry.customerName}</h2>
                  <span>{inquiry.customerPhone}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span className="badge" style={{ backgroundColor: 'var(--bg-2)', color: 'var(--text-1)' }}>
                    {docTypeLabels[inquiry.documentType]}
                  </span>
                  <small style={{ color: 'var(--text-3)' }}>
                    {new Date(inquiry.createdAt).toLocaleString(isRtl ? 'ar-EG' : 'en-GB')}
                  </small>
                </div>
              </div>
              <div className="inquiry-details" style={{ display: 'flex', gap: '2rem', marginTop: '1rem', color: 'var(--text-2)', fontSize: '0.875rem' }}>
                {inquiry.motorcycle && (
                  <div>
                    <strong>{isRtl ? 'الدراجة:' : 'Motorcycle:'}</strong>{' '}
                    {isRtl ? inquiry.motorcycle.brand.nameAr : inquiry.motorcycle.brand.nameEn} {inquiry.motorcycle.model}
                  </div>
                )}
                {inquiry.downPayment != null && (
                  <div>
                    <strong>{isRtl ? 'الدفعة المقدمة:' : 'Down payment:'}</strong>{' '}
                    {inquiry.downPayment}
                  </div>
                )}
              </div>
            </article>
          ))}
        </DataList>
      )}
    </section>
  );
}