// SPEC-014 TASK-014: Integration Management Dashboard

import { useState, useEffect } from 'react';
import { Settings, Activity, AlertTriangle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { apiFetch, integrations as integrationsApi, type Integration } from '../api';
import Badge from '../components/Badge';

export default function Integrations() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);

  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    setLoading(true);
    setError(null);
    try {
      setIntegrations(await integrationsApi.list());
    } catch (loadError) {
      console.error('Failed to load integrations:', loadError);
      setError('Failed to load integrations.');
    } finally {
      setLoading(false);
    }
  };

  const toggleIntegration = async (id: string, currentStatus: boolean) => {
    try {
      await apiFetch(`/admin/integrations/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isEnabled: !currentStatus }),
      });
      await loadIntegrations();
    } catch (error) {
      console.error('Failed to toggle integration:', error);
    }
  };

  const testIntegration = async (id: string) => {
    try {
      const result = await apiFetch<{ status: string }>(`/admin/integrations/${id}/test`, {
        method: 'POST',
      });
      alert(`Test completed. Status: ${result.status}`);
      await loadIntegrations();
    } catch (error) {
      console.error('Failed to test integration:', error);
      alert('Test failed');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'unhealthy':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Activity className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700" role="alert">
            {error}
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Settings className="w-8 h-8" />
                Integrations
              </h1>
              <p className="text-gray-600 mt-2">
                Manage external service integrations and API connections
              </p>
            </div>
            <button
              onClick={loadIntegrations}
              className="btn btn-primary"
              disabled={loading}
              aria-busy={loading}
            >
              <RefreshCw size={16} style={loading ? { animation: 'spin 1s linear infinite' } : undefined} />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'var(--bg-elevated)', color: 'var(--text-secondary)', flexShrink: 0 }}>
              <Settings size={22} />
            </div>
            <div>
              <p className="text-muted" style={{ fontSize: '0.875rem' }}>Total</p>
              <p style={{ fontSize: '1.75rem', fontWeight: 700, lineHeight: 1.2 }}>{integrations.length}</p>
            </div>
          </div>
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'var(--success-bg)', color: 'var(--success)', flexShrink: 0 }}>
              <CheckCircle size={22} />
            </div>
            <div>
              <p className="text-muted" style={{ fontSize: '0.875rem' }}>Healthy</p>
              <p style={{ fontSize: '1.75rem', fontWeight: 700, lineHeight: 1.2, color: 'var(--success)' }}>
                  {integrations.filter((i) => i.healthStatus === 'healthy').length}
              </p>
            </div>
          </div>
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'var(--warning-bg)', color: 'var(--warning)', flexShrink: 0 }}>
              <AlertTriangle size={22} />
            </div>
            <div>
              <p className="text-muted" style={{ fontSize: '0.875rem' }}>Degraded</p>
              <p style={{ fontSize: '1.75rem', fontWeight: 700, lineHeight: 1.2, color: 'var(--warning)' }}>
                  {integrations.filter((i) => i.healthStatus === 'degraded').length}
              </p>
            </div>
          </div>
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'var(--error-bg)', color: 'var(--error)', flexShrink: 0 }}>
              <XCircle size={22} />
            </div>
            <div>
              <p className="text-muted" style={{ fontSize: '0.875rem' }}>Unhealthy</p>
              <p style={{ fontSize: '1.75rem', fontWeight: 700, lineHeight: 1.2, color: 'var(--error)' }}>
                  {integrations.filter((i) => i.healthStatus === 'unhealthy').length}
              </p>
            </div>
          </div>
        </div>

        {/* Integrations List */}
        <div className="table-container">
          <div className="overflow-x-auto">
            <table>
              <colgroup>
                <col style={{ width: '20%' }} />
                <col style={{ width: '18%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '8%' }} />
              </colgroup>
              <thead>
                <tr>
                  <th>Integration</th>
                  <th>Provider</th>
                  <th>Category</th>
                  <th>Health</th>
                  <th>Status</th>
                  <th>Branch</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? Array.from({ length: 4 }, (_, index) => (
                  <tr key={`skeleton-${index}`} aria-hidden="true">
                    {Array.from({ length: 7 }, (_, cellIndex) => (
                      <td key={cellIndex}>
                        <div style={{ height: cellIndex === 0 ? '1rem' : '0.75rem', width: cellIndex === 0 ? '70%' : '60%', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', opacity: 0.7 }} />
                      </td>
                    ))}
                  </tr>
                )) : integrations.map((integration, index) => (
                  <tr key={integration.id} style={{ background: index % 2 === 1 ? 'rgba(255, 255, 255, 0.015)' : undefined }}>
                    <td>
                      <div style={{ fontWeight: 600 }}>
                        {integration.integrationName}
                      </div>
                      <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>{integration.id.substring(0, 8)}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{integration.provider.providerName}</div>
                      <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>{integration.provider.providerKey}</div>
                    </td>
                    <td>
                      <span className="badge badge-draft">
                        {integration.provider.category}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(integration.healthStatus)}
                        <Badge
                          status={integration.healthStatus === 'healthy' ? 'active' : integration.healthStatus === 'degraded' ? 'pending' : integration.healthStatus === 'unhealthy' ? 'cancelled' : 'inactive'}
                          label={integration.healthStatus}
                        />
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Badge status={integration.isEnabled ? 'active' : 'inactive'} label={integration.isEnabled ? 'Enabled' : 'Disabled'} />
                        <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }} title={integration.isEnabled ? 'Disable integration' : 'Enable integration'}>
                        <input
                          type="checkbox"
                          checked={integration.isEnabled}
                          onChange={() => toggleIntegration(integration.id, integration.isEnabled)}
                        />
                        </label>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-draft">
                        {integration.branch?.nameEn || 'All Branches'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => testIntegration(integration.id)}
                        className="btn btn-outline"
                        style={{ padding: '0.375rem' }}
                        title="Test integration"
                        aria-label={`Test ${integration.integrationName}`}
                      >
                        <Activity size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!loading && integrations.length === 0 && (
            <div className="center-content" style={{ padding: '3rem 1.5rem' }}>
              <Settings size={48} style={{ color: 'var(--text-muted)', opacity: 0.6, marginBottom: '0.75rem' }} />
              <p className="text-muted">No integrations configured</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
