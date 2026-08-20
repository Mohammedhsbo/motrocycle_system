// SPEC-014 TASK-014: API Keys Management

import { useState, useEffect } from 'react';
import { Key, Plus, Trash2, Copy, Eye, EyeOff, AlertCircle } from 'lucide-react';

interface APIKey {
  id: string;
  keyPrefix: string;
  description: string;
  environment: string;
  scope: any;
  expiresAt: string | null;
  lastUsedAt: string | null;
  usageCount: number;
  createdAt: string;
}

export default function APIKeys() {
  const [apiKeys, setAPIKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewKeyModal, setShowNewKeyModal] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    description: '',
    environment: 'production',
    resources: [] as string[],
    actions: [] as string[],
  });

  useEffect(() => {
    loadAPIKeys();
  }, []);

  const loadAPIKeys = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/api-keys', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const result = await response.json();
      setAPIKeys(result.data || []);
    } catch (error) {
      console.error('Failed to load API keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const createAPIKey = async () => {
    try {
      const response = await fetch('/api/admin/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          description: formData.description,
          environment: formData.environment,
          scope: {
            resources: formData.resources,
            actions: formData.actions,
          },
        }),
      });

      const result = await response.json();
      setNewKey(result.data.apiKey);
      await loadAPIKeys();
    } catch (error) {
      console.error('Failed to create API key:', error);
      alert('Failed to create API key');
    }
  };

  const revokeAPIKey = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
      return;
    }

    try {
      await fetch(`/api/admin/api-keys/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      await loadAPIKeys();
    } catch (error) {
      console.error('Failed to revoke API key:', error);
      alert('Failed to revoke API key');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  if (loading) {
    return <div className="p-8 text-center">Loading API Keys...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Key className="w-8 h-8" />
              API Keys
            </h1>
            <p className="text-gray-600 mt-2">Manage API keys for external access</p>
          </div>
          <button
            onClick={() => setShowNewKeyModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create API Key
          </button>
        </div>

        {/* API Keys List */}
        <div className="bg-white rounded-lg shadow">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Key Prefix
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Environment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Usage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Last Used
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Expires
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {apiKeys.map((key) => (
                <tr key={key.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-mono text-sm">{key.keyPrefix}...</td>
                  <td className="px-6 py-4 text-sm">{key.description || 'No description'}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded ${
                        key.environment === 'production'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {key.environment}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">{key.usageCount} requests</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {key.lastUsedAt
                      ? new Date(key.lastUsedAt).toLocaleDateString()
                      : 'Never'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {key.expiresAt
                      ? new Date(key.expiresAt).toLocaleDateString()
                      : 'Never'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => revokeAPIKey(key.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {apiKeys.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Key className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No API keys created yet</p>
            </div>
          )}
        </div>

        {/* Create API Key Modal */}
        {showNewKeyModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-md w-full">
              {newKey ? (
                <>
                  <div className="mb-4">
                    <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold mb-2 text-center">Save Your API Key</h2>
                    <p className="text-sm text-red-600 mb-4 text-center">
                      This is the only time you'll see this key. Save it now!
                    </p>
                  </div>

                  <div className="bg-gray-100 p-4 rounded-lg mb-4 break-all font-mono text-sm">
                    {newKey}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => copyToClipboard(newKey)}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                    >
                      <Copy className="w-4 h-4" />
                      Copy Key
                    </button>
                    <button
                      onClick={() => {
                        setShowNewKeyModal(false);
                        setNewKey(null);
                        setFormData({ description: '', environment: 'production', resources: [], actions: [] });
                      }}
                      className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                    >
                      Done
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-xl font-bold mb-4">Create New API Key</h2>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <input
                        type="text"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder="e.g., Mobile App API Key"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Environment
                      </label>
                      <select
                        value={formData.environment}
                        onChange={(e) => setFormData({ ...formData, environment: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg"
                      >
                        <option value="test">Test</option>
                        <option value="production">Production</option>
                      </select>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={createAPIKey}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Create Key
                      </button>
                      <button
                        onClick={() => setShowNewKeyModal(false)}
                        className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
