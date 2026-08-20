import { useState, useEffect } from 'react';
import { configuration } from '../api';
import type { FeatureFlag } from '../api';

export default function FeatureFlags() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingFlag, setEditingFlag] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    isEnabled: false,
    rolloutPercentage: 0,
    reason: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadFlags();
  }, []);

  const loadFlags = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await configuration.listFeatureFlags();
      setFlags(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load feature flags');
      console.error('Failed to load feature flags:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (flag: FeatureFlag) => {
    const reason = prompt(`${flag.isEnabled ? 'Disable' : 'Enable'} ${flag.flagName}?\n\nEnter reason:`);
    if (!reason) return;

    try {
      await configuration.updateFeatureFlag(flag.flagKey, {
        isEnabled: !flag.isEnabled,
        reason,
      });
      await loadFlags();
    } catch (err: any) {
      console.error('Failed to update feature flag:', err);
      alert(`Failed to update feature flag: ${err.message}`);
    }
  };

  const handleEdit = (flag: FeatureFlag) => {
    setEditingFlag(flag.flagKey);
    setFormData({
      isEnabled: flag.isEnabled,
      rolloutPercentage: flag.rolloutPercentage,
      reason: '',
    });
  };

  const handleSave = async (flagKey: string) => {
    if (!formData.reason.trim()) {
      alert('Please provide a reason for this change');
      return;
    }

    setSaving(true);
    try {
      await configuration.updateFeatureFlag(flagKey, formData);
      setEditingFlag(null);
      await loadFlags();
      alert('Feature flag updated successfully');
    } catch (err: any) {
      console.error('Failed to update feature flag:', err);
      alert(`Failed to update feature flag: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-container">
      <div className="flex justify-between items-center mb-6">
        <h1 style={{ background: 'linear-gradient(135deg, #f8fafc, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Feature Flags
        </h1>
        <button
          onClick={loadFlags}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading feature flags...</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Flag
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Scope
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rollout %
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {flags.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No feature flags found.
                  </td>
                </tr>
              ) : (
                flags.map((flag) => (
                  <tr key={flag.flagKey} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{flag.flagName}</div>
                      <div className="text-xs text-gray-500 font-mono">{flag.flagKey}</div>
                      {flag.description && (
                        <div className="text-xs text-gray-400 mt-1">{flag.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 capitalize">
                        {flag.scope}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {editingFlag === flag.flagKey ? (
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.isEnabled}
                            onChange={(e) =>
                              setFormData({ ...formData, isEnabled: e.target.checked })
                            }
                            className="rounded"
                          />
                          <span className="ml-2 text-sm">Enabled</span>
                        </label>
                      ) : (
                        <button
                          onClick={() => handleToggle(flag)}
                          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                            flag.isEnabled
                              ? 'bg-green-100 text-green-800 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                          }`}
                        >
                          {flag.isEnabled ? 'Enabled' : 'Disabled'}
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editingFlag === flag.flagKey ? (
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={formData.rolloutPercentage}
                          onChange={(e) =>
                            setFormData({ ...formData, rolloutPercentage: Number(e.target.value) })
                          }
                          className="border rounded px-2 py-1 w-20"
                        />
                      ) : (
                        <span className="text-sm text-gray-900">{flag.rolloutPercentage}%</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      {editingFlag === flag.flagKey ? (
                        <div className="flex justify-end gap-2">
                          <input
                            type="text"
                            value={formData.reason}
                            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                            placeholder="Reason"
                            className="border rounded px-2 py-1 text-sm w-32"
                          />
                          <button
                            onClick={() => handleSave(flag.flagKey)}
                            disabled={saving}
                            className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                          >
                            {saving ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            onClick={() => setEditingFlag(null)}
                            disabled={saving}
                            className="text-gray-600 hover:text-gray-900 disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleEdit(flag)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
