// SPEC-014 TASK-014: API Keys Management

import { useEffect, useState } from 'react';
import { Check, Clock3, Copy, Key, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { apiFetch, apiKeys as apiKeysApi, type APIKey } from '../api';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import { useBranch } from '../contexts/BranchContext';

type Expiration = 'never' | '30' | '90' | '365' | 'custom';

const environmentLabels: Record<string, string> = { production: 'Production', test: 'Test' };

function formatDate(value: string | null, lang: 'en' | 'ar') {
  if (!value) return lang === 'ar' ? 'أبداً' : 'Never';
  return new Date(value).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-EG', { month: 'short', day: 'numeric', year: 'numeric' });
}

function relativeDate(value: string | null, lang: 'en' | 'ar', future = false) {
  if (!value) return future ? (lang === 'ar' ? 'بلا انتهاء' : 'No expiration') : (lang === 'ar' ? 'لم يُستخدم' : 'Never used');
  const difference = new Date(value).getTime() - Date.now();
  const days = Math.round(Math.abs(difference) / 86400000);
  if (days === 0) return future ? (difference < 0 ? (lang === 'ar' ? 'انتهى اليوم' : 'Expired today') : (lang === 'ar' ? 'ينتهي اليوم' : 'Expires today')) : (lang === 'ar' ? 'اليوم' : 'Today');
  if (lang === 'ar') return future ? (difference < 0 ? `انتهى منذ ${days} ${days === 1 ? 'يوم' : 'أيام'}` : `ينتهي خلال ${days} ${days === 1 ? 'يوم' : 'أيام'}`) : (difference < 0 ? `منذ ${days} ${days === 1 ? 'يوم' : 'أيام'}` : 'منذ قليل');
  const unit = days === 1 ? 'day' : 'days';
  if (future) return difference < 0 ? `Expired ${days} ${unit} ago` : `Expires in ${days} ${unit}`;
  return difference < 0 ? `${days} ${unit} ago` : 'Just now';
}

function expirationDate(expiration: Expiration, customDate: string) {
  if (expiration === 'never') return undefined;
  if (expiration === 'custom') return customDate ? new Date(`${customDate}T23:59:59`).toISOString() : undefined;
  const date = new Date();
  date.setDate(date.getDate() + Number(expiration));
  return date.toISOString();
}

export default function APIKeys({ lang = 'en' }: { lang?: 'en' | 'ar' }) {
  const isRtl = lang === 'ar';
  const [apiKeys, setAPIKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<APIKey | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [formData, setFormData] = useState({ description: '', environment: 'production', expiration: 'never' as Expiration, customDate: '', branchId: '' });
  const { branches } = useBranch();

  useEffect(() => { void loadAPIKeys(); }, []);

  async function loadAPIKeys() {
    setLoading(true);
    try {
      setAPIKeys((await apiKeysApi.list()) ?? []);
    } catch (error) {
      console.error('Failed to load API keys:', error);
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setFormData({ description: '', environment: 'production', expiration: 'never', customDate: '', branchId: '' });
    setFormError(null);
  }

  function closeCreateModal() {
    if (!isSubmitting) {
      setShowCreateModal(false);
      resetForm();
    }
  }

  async function createAPIKey() {
    setFormError(null);
    if (formData.expiration === 'custom' && !formData.customDate) {
      setFormError(isRtl ? 'اختر تاريخ انتهاء أو حدد أبداً.' : 'Choose an expiration date or select Never.');
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await apiFetch<{ apiKey: string }>('/admin/api-keys', {
        method: 'POST',
        body: JSON.stringify({
          description: formData.description.trim() || undefined,
          environment: formData.environment,
          branchId: formData.branchId || undefined,
          scope: { resources: ['*'], actions: ['*'] },
          expiresAt: expirationDate(formData.expiration, formData.customDate),
        }),
      });
      setShowCreateModal(false);
      setCreatedKey(result.apiKey);
      resetForm();
      await loadAPIKeys();
    } catch (error) {
      console.error('Failed to create API key:', error);
      setFormError(error instanceof Error ? error.message : (isRtl ? 'تعذر إنشاء مفتاح API.' : 'Failed to create API key.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function revokeAPIKey() {
    if (!revokeTarget) return;
    setIsSubmitting(true);
    try {
      await apiFetch(`/admin/api-keys/${revokeTarget.id}`, { method: 'DELETE' });
      setRevokeTarget(null);
      await loadAPIKeys();
    } catch (error) {
      console.error('Failed to revoke API key:', error);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function copyText(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  const inputStyle = { width: '100%', boxSizing: 'border-box' as const };
  const trackedRequests = apiKeys.reduce((total, key) => total + key.usageCount, 0);

  return (
    <div className="page-container" style={{ direction: isRtl ? 'rtl' : 'ltr' }}>
      <div className="flex items-center justify-between mb-6" style={{ gap: '1rem', flexWrap: 'wrap' }}>
        <div className="flex items-center gap-2">
          <div style={{ display: 'grid', placeItems: 'center', width: 42, height: 42, borderRadius: 'var(--radius-md)', background: 'var(--accent-primary)', color: 'white' }}><Key size={22} /></div>
          <div><h1 style={{ margin: 0 }}>{isRtl ? 'مفاتيح API' : 'API Keys'}</h1><p className="text-muted" style={{ margin: '.25rem 0 0' }}>{isRtl ? 'إدارة الوصول الآمن للتكاملات الخارجية' : 'Manage secure access for external integrations'}</p></div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}><Plus size={17} /> {isRtl ? 'إنشاء مفتاح API' : 'Create API Key'}</button>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}><ShieldCheck size={22} style={{ color: 'var(--success)' }} /><div><div className="text-muted" style={{ fontSize: '.75rem' }}>{isRtl ? 'المفاتيح النشطة' : 'Active keys'}</div><strong style={{ fontSize: '1.4rem' }}>{apiKeys.length}</strong></div></div>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}><Clock3 size={22} style={{ color: 'var(--warning)' }} /><div><div className="text-muted" style={{ fontSize: '.75rem' }}>{isRtl ? 'الطلبات المتتبعة' : 'Tracked requests'}</div><strong style={{ fontSize: '1.4rem' }}>{trackedRequests.toLocaleString()}</strong></div></div>
      </div>

      <div className="table-container">
        <table style={{ minWidth: 900 }}>
          <colgroup><col style={{ width: '22%' }} /><col style={{ width: '22%' }} /><col style={{ width: '13%' }} /><col style={{ width: '12%' }} /><col style={{ width: '15%' }} /><col style={{ width: '16%' }} /></colgroup>
          <thead><tr><th>Key</th><th>Description</th><th>Environment</th><th>Usage</th><th>Last used</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
          <tbody>
            {loading ? Array.from({ length: 4 }, (_, index) => <tr key={`skeleton-${index}`} aria-hidden="true">{Array.from({ length: 6 }, (_, cell) => <td key={cell}><div style={{ height: cell === 0 ? '1rem' : '.75rem', width: cell === 5 ? '2rem' : cell === 0 ? '75%' : '60%', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', opacity: .7 }} /></td>)}</tr>) : apiKeys.map((key, index) => (
              <tr key={key.id} style={{ background: index % 2 ? 'rgba(255,255,255,.018)' : undefined }}>
                <td><div className="flex items-center gap-2"><span className="badge badge-draft" style={{ fontFamily: 'monospace', textTransform: 'none' }}>{key.keyPrefix}****</span><button className="btn btn-outline" style={{ padding: '.35rem' }} title="Copy key prefix" aria-label="Copy key prefix" onClick={() => void copyText(key.keyPrefix)}><Copy size={15} /></button></div></td>
                <td><strong>{key.description || 'Untitled key'}</strong><div className="text-muted" style={{ fontSize: '.75rem', marginTop: '.25rem' }}>{key.branchId ? branches.find(branch => branch.id === key.branchId)?.nameEn ?? 'Branch scoped' : 'All branches'}</div></td>
                <td><Badge status={key.environment === 'production' ? 'cancelled' : 'initiated'} label={environmentLabels[key.environment] ?? key.environment} /></td>
                <td><strong>{key.usageCount.toLocaleString()}</strong><div className="text-muted" style={{ fontSize: '.75rem' }}>requests</div></td>
                <td title={key.lastUsedAt ? formatDate(key.lastUsedAt, lang) : undefined}><span>{relativeDate(key.lastUsedAt, lang)}</span><div className="text-muted" style={{ fontSize: '.75rem' }}>{formatDate(key.lastUsedAt, lang)}</div></td>
                <td style={{ textAlign: 'right' }}><button className="btn" style={{ padding: '.35rem', color: 'var(--error)', background: 'var(--error-bg)', border: '1px solid rgba(239,68,68,.2)' }} title="Revoke API key" aria-label={`Revoke ${key.description || 'API key'}`} onClick={() => setRevokeTarget(key)}><Trash2 size={16} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && apiKeys.length === 0 && <div className="center-content" style={{ minHeight: 250, padding: '2rem' }}><Key size={42} style={{ opacity: .35, marginBottom: '.75rem' }} /><strong>No API keys yet</strong><span className="text-muted">Create a key to connect an external service securely.</span><button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => setShowCreateModal(true)}><Plus size={16} /> Create your first key</button></div>}
      </div>

      {showCreateModal && <Modal title="Create API Key" onClose={closeCreateModal} footer={<><button className="btn btn-outline" onClick={closeCreateModal} disabled={isSubmitting}>Cancel</button><button className="btn btn-primary" onClick={() => void createAPIKey()} disabled={isSubmitting}>{isSubmitting && <span className="spinner" style={{ width: 16, height: 16 }} />}Create key</button></>}>
        {formError && <div role="alert" style={{ marginBottom: '1rem', padding: '.75rem', borderRadius: 'var(--radius-md)', background: 'var(--error-bg)', color: 'var(--error)', fontSize: '.875rem' }}>{formError}</div>}
        <div className="input-group"><label className="input-label" htmlFor="api-key-description">Description</label><input id="api-key-description" className="input-field" style={inputStyle} value={formData.description} onChange={event => setFormData(current => ({ ...current, description: event.target.value }))} placeholder="e.g. Mobile app" /></div>
        <div className="input-group"><label className="input-label" htmlFor="api-key-environment">Environment</label><select id="api-key-environment" className="input-field" style={inputStyle} value={formData.environment} onChange={event => setFormData(current => ({ ...current, environment: event.target.value }))}><option value="production">Production</option><option value="test">Test</option></select></div>
        {branches.length > 0 && <div className="input-group"><label className="input-label" htmlFor="api-key-branch">Branch scope</label><select id="api-key-branch" className="input-field" style={inputStyle} value={formData.branchId} onChange={event => setFormData(current => ({ ...current, branchId: event.target.value }))}><option value="">All branches</option>{branches.map(branch => <option key={branch.id} value={branch.id}>{branch.nameEn}</option>)}</select></div>}
        <div className="input-group"><label className="input-label" htmlFor="api-key-expiration">Expiration</label><select id="api-key-expiration" className="input-field" style={inputStyle} value={formData.expiration} onChange={event => setFormData(current => ({ ...current, expiration: event.target.value as Expiration }))}><option value="never">Never</option><option value="30">In 30 days</option><option value="90">In 90 days</option><option value="365">In 1 year</option><option value="custom">Custom date</option></select></div>
        {formData.expiration === 'custom' && <div className="input-group"><label className="input-label" htmlFor="api-key-custom-date">Expiration date</label><input id="api-key-custom-date" type="date" min={new Date().toISOString().slice(0, 10)} className="input-field" style={inputStyle} value={formData.customDate} onChange={event => setFormData(current => ({ ...current, customDate: event.target.value }))} /></div>}
        <p className="text-muted" style={{ margin: 0, fontSize: '.8rem' }}>The secret is shown once after creation. Store it in your password manager.</p>
      </Modal>}

      {createdKey && <Modal title="Save your API key" onClose={() => setCreatedKey(null)} footer={<button className="btn btn-primary" onClick={() => setCreatedKey(null)}>Done</button>}>
        <div style={{ textAlign: 'center' }}><div style={{ display: 'grid', placeItems: 'center', width: 48, height: 48, margin: '0 auto 1rem', borderRadius: '50%', background: 'var(--warning-bg)', color: 'var(--warning)' }}><ShieldCheck size={24} /></div><p style={{ marginTop: 0 }}>This is the only time you will see the full key.</p><div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', padding: '.85rem', textAlign: 'left', wordBreak: 'break-all', borderRadius: 'var(--radius-md)', background: 'var(--bg-primary)', border: '1px solid var(--border)', fontFamily: 'monospace', fontSize: '.8rem' }}><span style={{ flex: 1 }}>{createdKey}</span><button className="btn btn-outline" style={{ padding: '.35rem' }} title="Copy full API key" aria-label="Copy full API key" onClick={() => void copyText(createdKey)}>{copied ? <Check size={16} /> : <Copy size={16} />}</button></div><p className="text-muted" style={{ fontSize: '.8rem', marginBottom: 0 }}>Keep this value private. It cannot be recovered later.</p></div>
      </Modal>}

      {revokeTarget && <Modal title="Revoke API key" onClose={() => setRevokeTarget(null)} footer={<><button className="btn btn-outline" onClick={() => setRevokeTarget(null)} disabled={isSubmitting}>Cancel</button><button className="btn" style={{ background: 'var(--error-bg)', color: 'var(--error)', border: '1px solid rgba(239,68,68,.2)' }} onClick={() => void revokeAPIKey()} disabled={isSubmitting}>{isSubmitting && <span className="spinner" style={{ width: 16, height: 16 }} />}Revoke key</button></>}>
        <p style={{ margin: 0 }}>Revoke <strong>{revokeTarget.description || revokeTarget.keyPrefix}</strong>? Existing clients using this key will stop authenticating.</p>
      </Modal>}
    </div>
  );
}
