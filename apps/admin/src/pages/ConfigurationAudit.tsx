import { useState, useEffect } from 'react';
import { configuration } from '../api';
import type { ConfigurationAuditEntry } from '../api';

export default function ConfigurationAudit() {
  const [audits, setAudits] = useState<ConfigurationAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({
    config_type: '',
    config_key: '',
  });

  useEffect(() => {
    loadAudits();
  }, [page, filters]);

  const loadAudits = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await configuration.getAudit({
        ...filters,
        config_type: filters.config_type || undefined,
        config_key: filters.config_key || undefined,
        page,
        limit: 20,
      });
      setAudits(response.data);
      setTotal(response.meta.total);
    } catch (err: any) {
      setError(err.message || 'Failed to load audit log');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <h1 style={{ background: 'linear-gradient(135deg, #f8fafc, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        Configuration Audit Log
      </h1>

      {/* Filters */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="input-group" style={{ flex: '1 1 220px', marginBottom: 0 }}>
            <label className="input-label">Config Type</label>
            <select
              value={filters.config_type}
              onChange={(e) => {
                setFilters({ ...filters, config_type: e.target.value });
                setPage(1);
              }}
              className="input"
              style={{ width: '100%' }}
            >
              <option value="">All Types</option>
              <option value="system">System</option>
              <option value="company">Company</option>
              <option value="branch">Branch</option>
              <option value="feature_flag">Feature Flag</option>
              <option value="document_numbering">Document Numbering</option>
            </select>
          </div>
          <div className="input-group" style={{ flex: '1 1 280px', marginBottom: 0 }}>
            <label className="input-label">Config Key</label>
            <input
              type="text"
              value={filters.config_key}
              onChange={(e) => {
                setFilters({ ...filters, config_key: e.target.value });
                setPage(1);
              }}
              placeholder="Filter by key..."
              className="input"
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ flex: '0 0 auto' }}>
            <button
              onClick={() => {
                setFilters({ config_type: '', config_key: '' });
                setPage(1);
              }}
              className="btn btn-outline"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading audit log...</p>
        </div>
      ) : (
        <>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Key</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Changed By</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Changes</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {audits.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                        No audit entries found.
                      </td>
                    </tr>
                  ) : (
                    audits.map((audit) => (
                      <tr key={audit.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                          {new Date(audit.changeTimestamp).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                            {audit.configType}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-mono text-gray-900">
                          {audit.configKey}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          <div>{audit.changer.name}</div>
                          <div className="text-xs text-gray-500">{audit.changer.email}</div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <details className="cursor-pointer">
                            <summary className="text-blue-600 hover:text-blue-800">View Changes</summary>
                            <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                              {audit.previousValue && (
                                <div className="mb-2">
                                  <strong>Previous:</strong>
                                  <pre className="mt-1 whitespace-pre-wrap">
                                    {typeof audit.previousValue === 'string' 
                                      ? audit.previousValue 
                                      : JSON.stringify(audit.previousValue, null, 2)}
                                  </pre>
                                </div>
                              )}
                              <div>
                                <strong>New:</strong>
                                <pre className="mt-1 whitespace-pre-wrap">
                                  {typeof audit.newValue === 'string' 
                                    ? audit.newValue 
                                    : JSON.stringify(audit.newValue, null, 2)}
                                </pre>
                              </div>
                            </div>
                          </details>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {audit.changeReason || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, total)} of {total} entries
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 border rounded text-sm hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page * 20 >= total}
                className="px-3 py-1 border rounded text-sm hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
