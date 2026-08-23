import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import { letters, type CreateLetterInput, type LetterType } from '../api';

interface Props { lang: 'en' | 'ar' }

export default function LetterCreate({ lang }: Props) {
  const isRtl = lang === 'ar';
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [type, setType] = useState<LetterType>('receipt');
  const [customerId, setCustomerId] = useState('');
  const [motorcycleId, setMotorcycleId] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: (data: CreateLetterInput) => letters.create(data),
    onSuccess: (letter) => {
      queryClient.invalidateQueries({ queryKey: ['letters'] });
      navigate(`/letters/${letter.id}`);
    },
    onError: (reason: Error) => setError(reason.message),
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!customerId.trim() || !motorcycleId.trim()) {
      setError(isRtl ? 'العميل والدراجة النارية مطلوبان.' : 'Customer and motorcycle IDs are required.');
      return;
    }
    createMutation.mutate({
      type,
      customerId: customerId.trim(),
      motorcycleId: motorcycleId.trim(),
      subject: '',
      content: '',
      expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate).toISOString() : undefined,
      notes: notes.trim() || undefined,
    });
  }

  return <div className="page-container" style={{ direction: isRtl ? 'rtl' : 'ltr', maxWidth: 720 }}>
    <div className="flex items-center gap-4 mb-6">
      <button className="btn btn-outline" onClick={() => navigate('/letters')} title={isRtl ? 'عودة' : 'Back'}><ArrowLeft size={18} /></button>
      <h1 style={{ margin: 0 }}>{isRtl ? 'إنشاء خطاب' : 'Create Letter'}</h1>
    </div>
    <form className="card" onSubmit={submit}>
      {error && <div className="login-error" style={{ marginBottom: '1rem' }}>{error}</div>}
      <div className="input-group"><label className="input-label">{isRtl ? 'النوع' : 'Type'}</label><select className="input" value={type} onChange={event => setType(event.target.value as LetterType)}><option value="receipt">{isRtl ? 'إيصال' : 'Receipt'}</option><option value="delivery">{isRtl ? 'تسليم' : 'Delivery'}</option></select></div>
      <div className="input-group"><label className="input-label">{isRtl ? 'معرف العميل' : 'Customer ID'}</label><input className="input" value={customerId} onChange={event => setCustomerId(event.target.value)} required /></div>
      <div className="input-group"><label className="input-label">{isRtl ? 'معرف الدراجة النارية' : 'Motorcycle ID'}</label><input className="input" value={motorcycleId} onChange={event => setMotorcycleId(event.target.value)} required /></div>
      <div className="input-group"><label className="input-label">{isRtl ? 'تاريخ التسليم المتوقع' : 'Expected delivery date'}</label><input className="input" type="datetime-local" value={expectedDeliveryDate} onChange={event => setExpectedDeliveryDate(event.target.value)} /></div>
      <div className="input-group"><label className="input-label">{isRtl ? 'ملاحظات' : 'Notes'}</label><textarea className="input" rows={4} value={notes} onChange={event => setNotes(event.target.value)} /></div>
      <button className="btn btn-primary" type="submit" disabled={createMutation.isPending}><Plus size={16} />{createMutation.isPending ? (isRtl ? 'جاري الحفظ...' : 'Saving...') : (isRtl ? 'إنشاء الخطاب' : 'Create Letter')}</button>
    </form>
  </div>;
}
