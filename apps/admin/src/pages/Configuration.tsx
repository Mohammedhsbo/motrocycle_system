import { useState, useEffect } from 'react';
import { configuration } from '../api';
import type { SystemConfiguration, CompanyConfiguration } from '../api';

export default function Configuration() {
  const [configs, setConfigs] = useState<(SystemConfiguration | CompanyConfiguration)[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'system' | 'company'>('system');
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [editReason, setEditReason] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfigurations();
  }, [activeTab]);

  const loadConfigurations = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = activeTab === 'system' 
        ? await configuration.getSystemConfig() 
        : await configuration.getCompanyConfig();
      setConfigs(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load configurations');
      console.error('Failed to load configurations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (config: SystemConfiguration | CompanyConfiguration) => {
    setEditingKey(config.configKey);
    setEditValue(typeof config.configValue === 'object' 
      ? JSON.stringify(config.configValue, null, 2) 
      : String(config.configValue));
    setEditReason('');
  };

  const handleSave = async (configKey: string) => {
    if (!editReason.trim()) {
      alert('Please provide a reason for this change');
      return;
    }

    setSaving(true);
    try {
      let parsedValue: any = editValue;
      const config = configs.find(c => c.configKey === configKey);
      
      if (config?.dataType === 'number') {
        parsedValue = parseFloat(editValue);
        if (isNaN(parsedValue)) throw new Error('Invalid number format');
      } else if (config?.dataType === 'boolean') {
        parsedValue = editValue === 'true' || editValue === '1';
      } else if (config?.dataType === 'json') {
        parsedValue = JSON.parse(editValue);
      }

      if (activeTab === 'system') {
        await configuration.updateSystemConfig({
          configurations: [{
            configKey,
            configValue: parsedValue,
            reason: editReason,
          }],
        });
      } else {
        await configuration.updateCompanyConfig({
          configurations: [{
            configKey,
            configValue: parsedValue,
            reason: editReason,
          }],
        });
      }

      setEditingKey(null);
      setEditReason('');
      await loadConfigurations();
      alert('Configuration updated successfully');
    } catch (err: any) {
      console.error('Failed to update configuration:', err);
      alert(`Failed to update configuration: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const groupedConfigs = configs.reduce((acc, config) => {
    const category = config.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(config);
    return acc;
  }, {} as Record<string, (SystemConfiguration | CompanyConfiguration)[]>);

  return (
    <div className="page-container">
      <div className="flex justify-between items-center mb-6">
        <h1 style={{ background: 'linear-gradient(135deg, #f8fafc, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          System Configuration
        </h1>
        <button
          onClick={loadConfigurations}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {(['system', 'company'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium capitalize transition-colors ${
              activeTab === tab
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {tab === 'system' ? 'System Level' : 'Company Level'}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading configurations...</p>
        </div>
      ) : configs.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No configurations found for this level.
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedConfigs).sort(([a], [b]) => a.localeCompare(b)).map(([category, items]) => (
            <div key={category} className="card">
              <h2 className="text-lg font-semibold mb-4 text-gray-800 border-b pb-2">{category}</h2>
              <div className="space-y-4">
                {items.map((config) => (
                  <div
                    key={config.configKey}
                    className="flex items-start justify-between py-3 border-b last:border-0"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900">{config.configKey}</div>
                      {config.description && (
                        <div className="text-sm text-gray-500 mt-1">{config.description}</div>
                      )}
                      <div className="mt-2">
                        {editingKey === config.configKey ? (
                          <div className="space-y-2">
                            <textarea
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="border rounded px-3 py-2 w-full max-w-2xl font-mono text-sm"
                              rows={config.dataType === 'json' ? 4 : 1}
                              autoFocus
                            />
                            <input
                              type="text"
                              value={editReason}
                              onChange={(e) => setEditReason(e.target.value)}
                              placeholder="Reason for change (required)"
                              className="border rounded px-3 py-2 w-full max-w-2xl text-sm"
                            />
                          </div>
                        ) : (
                          <pre className="text-sm font-mono bg-gray-50 px-3 py-2 rounded inline-block max-w-2xl overflow-x-auto">
                            {typeof config.configValue === 'object'
                              ? JSON.stringify(config.configValue, null, 2)
                              : String(config.configValue)}
                          </pre>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 mt-2 flex gap-4">
                        <span>Type: <strong>{config.dataType}</strong></span>
                        <span>Updated: {new Date(config.updatedAt).toLocaleString()}</span>
                        {'version' in config && <span>Version: {config.version}</span>}
                        {'creator' in config && <span>By: {config.creator.name}</span>}
                      </div>
                    </div>
                    <div className="ml-4 flex gap-2 flex-shrink-0">
                      {editingKey === config.configKey ? (
                        <>
                          <button
                            onClick={() => handleSave(config.configKey)}
                            disabled={saving}
                            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                          >
                            {saving ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            onClick={() => {
                              setEditingKey(null);
                              setEditReason('');
                            }}
                            disabled={saving}
                            className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400 disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleEdit(config)}
                          className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
