import { useEffect, useState, type ChangeEvent } from 'react';
import { Image, LoaderCircle, Upload, X } from 'lucide-react';
import { upload } from '../api';

interface ImageUploadProps {
  value?: string;
  onUploaded: (url: string) => void;
  onClear?: () => void;
  lang: 'en' | 'ar';
}

export default function ImageUpload({ value, onUploaded, onClear, lang }: ImageUploadProps) {
  const isRtl = lang === 'ar';
  const [preview, setPreview] = useState(value ?? '');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPreview(value ?? '');
  }, [value]);

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setError(null);
    setPreview(URL.createObjectURL(file));
    setIsUploading(true);
    try {
      const result = await upload.uploadFile(file);
      onUploaded(result.url);
      setPreview(result.url);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : (isRtl ? 'فشل رفع الصورة' : 'Image upload failed'));
      setPreview(value ?? '');
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="input-group">
      <label className="input-label">{isRtl ? 'الشعار' : 'Logo'}</label>
      {preview && (
        <div className="flex items-center gap-3" style={{ marginBottom: '0.75rem' }}>
          <img src={preview} alt={isRtl ? 'معاينة الشعار' : 'Logo preview'} style={{ width: 64, height: 64, objectFit: 'contain', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }} />
          {onClear && <button type="button" className="btn btn-outline" onClick={onClear} title={isRtl ? 'إزالة الشعار' : 'Remove logo'}><X size={16} /></button>}
        </div>
      )}
      <label className="btn btn-outline" style={{ display: 'inline-flex', width: 'fit-content', cursor: isUploading ? 'wait' : 'pointer' }}>
        {isUploading ? <LoaderCircle size={16} className="spin" /> : preview ? <Image size={16} /> : <Upload size={16} />}
        {isUploading ? (isRtl ? 'جاري الرفع...' : 'Uploading...') : (isRtl ? 'اختيار صورة' : 'Choose image')}
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleChange} disabled={isUploading} style={{ display: 'none' }} />
      </label>
      {error && <div className="login-error" style={{ marginTop: '0.5rem' }}>{error}</div>}
    </div>
  );
}
