// SPEC-014 TASK-014: Integration Management Dashboard

import { useState, useEffect } from 'react';
import { Settings, Activity, AlertTriangle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { apiFetch } from '../api';

interface Integration {
  id: string;
  integrationName: string;
  isEnabled: boolean;
  healthStatus: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  lastHealthCheck: string;
  provider: {
    providerKey: string;
    providerName: string;
    category: string;
  };
  branch?: {
    nameEn: string;
  };
}

export default function Integrations() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);

  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    setLoading(true);
    try {
      setIntegrations(await apiFetch<Integration[]>('/admin/integrations'));
    } catch (error) {
      console.error('Failed to load integrations:', error);
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

  const getStatusBadge = (status: string) => {
    const colors = {
      healthy: 'bg-green-100 text-green-800',
      degraded: 'bg-yellow-100 text-yellow-800',
      unhealthy: 'bg-red-100 text-red-800',
      unknown: 'bg-gray-100 text-gray-800',
    };
    return colors[status as keyof typeof colors] || colors.unknown;
  };

  const getCategoryBadge = (category: string) => {
    const colors = {
      payment: 'bg-blue-100 text-blue-800',
      email: 'bg-purple-100 text-purple-800',
      sms: 'bg-pink-100 text-pink-800',
      whatsapp: 'bg-green-100 text-green-800',
      storage: 'bg-indigo-100 text-indigo-800',
      other: 'bg-gray-100 text-gray-800',
    };
    return colors[category as keyof typeof colors] || colors.other;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-600">Loading integrations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
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
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total</p>
                <p className="text-2xl font-bold">{integrations.length}</p>
              </div>
              <Settings className="w-8 h-8 text-gray-400" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Healthy</p>
                <p className="text-2xl font-bold text-green-600">
                  {integrations.filter((i) => i.healthStatus === 'healthy').length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Degraded</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {integrations.filter((i) => i.healthStatus === 'degraded').length}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-yellow-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Unhealthy</p>
                <p className="text-2xl font-bold text-red-600">
                  {integrations.filter((i) => i.healthStatus === 'unhealthy').length}
                </p>
              </div>
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
          </div>
        </div>

        {/* Integrations List */}
        <div className="bg-white rounded-lg shadow">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Integration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Provider
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Health
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Branch
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {integrations.map((integration) => (
                  <tr key={integration.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">
                        {integration.integrationName}
                      </div>
                      <div className="text-xs text-gray-500">{integration.id.substring(0, 8)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{integration.provider.providerName}</div>
                      <div className="text-xs text-gray-500">{integration.provider.providerKey}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${getCategoryBadge(integration.provider.category)}`}>
                        {integration.provider.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(integration.healthStatus)}
                        <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusBadge(integration.healthStatus)}`}>
                          {integration.healthStatus}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={integration.isEnabled}
                          onChange={() => toggleIntegration(integration.id, integration.isEnabled)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {integration.branch?.nameEn || 'System-wide'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => testIntegration(integration.id)}
                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm"
                      >
                        Test
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {integrations.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No integrations configured</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
