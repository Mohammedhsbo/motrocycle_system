import type { ReactNode } from 'react';

type Lang = 'en' | 'ar';

export function DataTable({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`data-table-shell ${className}`}>{children}</div>;
}

export function DataTableState({ kind, lang, onRetry }: { kind: 'loading' | 'error' | 'empty'; lang: Lang; onRetry?: () => void }) {
  const labels = {
    loading: lang === 'ar' ? 'جاري التحميل...' : 'Loading...',
    error: lang === 'ar' ? 'تعذر تحميل البيانات.' : 'Could not load data.',
    empty: lang === 'ar' ? 'لا توجد بيانات.' : 'No data found.',
  };
  return <div className={`data-table-state data-table-state-${kind}`} role={kind === 'error' ? 'alert' : undefined}>
    {kind === 'loading' && <span className="data-table-spinner" aria-hidden="true" />}
    <span>{labels[kind]}</span>
    {kind === 'error' && onRetry && <button className="secondary-action" onClick={onRetry}>{lang === 'ar' ? 'إعادة المحاولة' : 'Retry'}</button>}
  </div>;
}

export function DataList({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`data-list-shell ${className}`}>{children}</div>;
}