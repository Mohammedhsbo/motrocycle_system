import { createContext, useContext, type ReactNode } from 'react';
import { type Branch } from '../api';

const MAIN_BRANCH_ID = '00000000-0000-0000-0000-000000000001';

interface BranchContextValue {
  branches: Branch[];
  branchId: string | null;
  setBranchId: (branchId: string) => void;
  isLoading: boolean;
  error: Error | null;
}

const BranchContext = createContext<BranchContextValue | null>(null);

export function BranchProvider({ children }: { children: ReactNode }) {
  // Branch concept is hidden from the UI. The ID is hardcoded behind the scenes.
  // GET /branches is NOT called — it requires BRANCH:READ permission and
  // is not needed since branch selection is not exposed in the admin UI.
  return (
    <BranchContext.Provider value={{
      branches: [],          // no branch list fetched; consumers must not rely on this
      branchId: MAIN_BRANCH_ID,
      setBranchId: () => {}, // no-op: branch switching is not exposed in the UI
      isLoading: false,
      error: null,
    }}>
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
  // Pass through directly — branch selection is hardcoded behind the scenes
  return <>{children}</>;
}
