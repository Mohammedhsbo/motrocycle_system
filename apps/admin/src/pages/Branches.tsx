import { useState, useEffect } from 'react';
import { configuration } from '../api';
import type { BranchConfiguration } from '../api';

export default function Branches() {
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [branchConfigs, setBranchConfigs] = useState<BranchConfiguration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBranches();
  }, []);

  useEffect(() => {
    if (selectedBranch) {
      loadBranchConfig(selectedBranch);
    }
  }, [selectedBranch]);

  const loadBranches = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await configuration.listBranchConfigs();
      setBranches(data);
      if (data.length > 0 && !selectedBranch) {
        setSelectedBranch(data[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load branches');
    } finally {
      setLoading(false);
    }
  };

  const loadBranchConfig = async (branchId: string) => {
    try {
      const data = await configuration.getBranchConfig(branchId);
      setBranchConfigs(data);
    } catch (err: any) {
      console.error('Failed to load branch configuration:', err);
    }
  };

  const selectedBranchData = branches.find(b => b.id === selectedBranch);

  return (
    <div className="page-container">
      <h1 style={{ background: 'linear-gradient(135deg, #f8fafc, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        Branch Configuration
      </h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading branches...</p>
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-6">
          {/* Branch List */}
          <div className="col-span-3">
            <div className="card">
              <h3 className="font-semibold mb-4">Branches</h3>
              <div className="space-y-2">
                {branches.map((branch) => (
                  <button
                    key={branch.id}
                    onClick={() => setSelectedBranch(branch.id)}
                    className={`w-full text-left px-3 py-2 rounded transition-colors ${
                      selectedBranch === branch.id
                        ? 'bg-blue-100 text-blue-900'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    <div className="font-medium">{branch.nameEn}</div>
                    <div className="text-xs text-gray-500">{branch.nameAr}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Branch Configuration */}
          <div className="col-span-9">
            {selectedBranchData ? (
              <div className="space-y-6">
                <div className="card">
                  <h2 className="text-xl font-semibold mb-4">{selectedBranchData.nameEn}</h2>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Arabic Name:</span>
                      <div className="font-medium">{selectedBranchData.nameAr}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Total Configurations:</span>
                      <div className="font-medium">{selectedBranchData.configurations.length}</div>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <h3 className="font-semibold mb-4">Configuration Overrides</h3>
                  {branchConfigs.length === 0 ? (
                    <p className="text-gray-500 text-sm">
                      This branch inherits all configurations from company level.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {branchConfigs.map((config) => (
                        <div
                          key={config.configKey}
                          className="border-b pb-3 last:border-0"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="font-medium">{config.configKey}</div>
                              {config.description && (
                                <div className="text-sm text-gray-500">{config.description}</div>
                              )}
                              <pre className="text-sm font-mono bg-gray-50 px-2 py-1 rounded mt-2 inline-block">
                                {typeof config.configValue === 'object'
                                  ? JSON.stringify(config.configValue, null, 2)
                                  : String(config.configValue)}
                              </pre>
                              <div className="text-xs text-gray-400 mt-1">
                                {config.inheritsFromCompany ? (
                                  <span className="text-blue-600">Inherits from company</span>
                                ) : (
                                  <span className="text-green-600">Branch override</span>
                                )}
                                {' • '}Updated: {new Date(config.updatedAt).toLocaleString()}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="card text-center py-12 text-gray-500">
                Select a branch to view configuration
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
