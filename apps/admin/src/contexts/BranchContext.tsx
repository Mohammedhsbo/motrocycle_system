import { createContext, useContext, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { branches, type Branch } from '../api';

const STORAGE_KEY = 'admin_branch_id';

interface BranchContextValue {
  branches: Branch[];
  branchId: string | null;
  setBranchId: (branchId: string) => void;
  isLoading: boolean;
  error: Error | null;
}

const BranchContext = createContext<BranchContextValue | null>(null);

export function BranchProvider({ children }: { children: ReactNode }) {
  const [branchId, setBranchIdState] = useState<string | null>(() => localStorage.getItem(STORAGE_KEY));
  const { data: branchList = [], isLoading, error } = useQuery<Branch[]>({
    queryKey: ['admin-branches'],
    queryFn: async (): Promise<Branch[]> => {
      const response = await branches.list({ page: 1, limit: 100 });
      return response.items ?? [];
    },
  });

  const branchListResolved: Branch[] = branchList;

  function setBranchId(nextBranchId: string) {
    setBranchIdState(nextBranchId);
    localStorage.setItem(STORAGE_KEY, nextBranchId);
  }

  const activeBranchId = branchListResolved.some((branch: Branch) => branch.id === branchId) ? branchId : null;

  return (
    <BranchContext.Provider value={{ branches: branchListResolved, branchId: activeBranchId, setBranchId, isLoading, error: error as Error | null }}>
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch() {
  const context = useContext(BranchContext);
  if (!context) throw new Error('useBranch must be used within BranchProvider');
  return context;
}

export function BranchGate({ lang, children }: { lang: 'en' | 'ar'; children: ReactNode }) {
  const { branches, branchId, setBranchId, isLoading, error } = useBranch();
  const isRtl = lang === 'ar';

  if (isLoading) {
    return <main className="login-screen"><div className="login-card"><p>{isRtl ? 'جاري تحميل الفروع...' : 'Loading branches...'}</p></div></main>;
  }

  if (error) {
    return <main className="login-screen"><div className="login-card"><p>{error.message}</p></div></main>;
  }

  if (!branchId) {
    return (
      <main className="login-screen" style={{ direction: isRtl ? 'rtl' : 'ltr' }}>
        <div className="login-card">
          <h1>{isRtl ? 'اختر الفرع' : 'Select Branch'}</h1>
          <p className="text-muted">{isRtl ? 'اختر الفرع الذي ستعمل عليه.' : 'Choose the branch for this session.'}</p>
          <select className="input" defaultValue="" onChange={event => event.target.value && setBranchId(event.target.value)}>
            <option value="">{isRtl ? 'اختر فرعا' : 'Select a branch'}</option>
            {branches.map(branch => <option key={branch.id} value={branch.id}>{isRtl ? branch.nameAr : branch.nameEn}</option>)}
          </select>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
