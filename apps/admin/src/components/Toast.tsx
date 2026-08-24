import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type: ToastType) => void;
}

interface ToastProviderProps {
  children: ReactNode;
  direction?: 'ltr' | 'rtl';
}

const ToastContext = createContext<ToastContextValue | null>(null);

function ToastMessage({ toast, onClose }: { toast: ToastItem; onClose: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, 4000);
    return () => window.clearTimeout(timer);
  }, [onClose]);

  const color = toast.type === 'success' ? 'var(--success)' : toast.type === 'error' ? 'var(--error)' : 'var(--accent-primary)';
  const background = toast.type === 'success' ? 'var(--success-bg)' : toast.type === 'error' ? 'var(--error-bg)' : 'rgba(59, 130, 246, 0.1)';

  return (
    <div
      role={toast.type === 'error' ? 'alert' : 'status'}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
        minWidth: 'min(320px, calc(100vw - 2rem))',
        maxWidth: 420,
        padding: '0.85rem 1rem',
        border: `1px solid ${color}`,
        borderRadius: 'var(--radius-md)',
        color,
        background,
        boxShadow: 'var(--shadow-md)',
        animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <span style={{ flex: 1, overflowWrap: 'anywhere' }}>{toast.message}</span>
      <button
        type="button"
        className="btn btn-outline"
        onClick={onClose}
        aria-label="Close notification"
        title="Close notification"
        style={{ padding: '0.2rem', color, borderColor: 'transparent' }}
      >
        <X size={16} />
      </button>
    </div>
  );
}

export function ToastProvider({ children, direction = 'ltr' }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = (message: string, type: ToastType) => {
    setToasts(current => [...current, { id: Date.now() + Math.random(), message, type }]);
  };

  const dismissToast = (id: number) => {
    setToasts(current => current.filter(toast => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        aria-live="polite"
        style={{
          position: 'fixed',
          top: '1rem',
          ...(direction === 'rtl' ? { left: '1rem' } : { right: '1rem' }),
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          alignItems: direction === 'rtl' ? 'flex-start' : 'flex-end',
          pointerEvents: 'none',
        }}
      >
        {toasts.map(toast => (
          <div key={toast.id} style={{ pointerEvents: 'auto' }}>
            <ToastMessage toast={toast} onClose={() => dismissToast(toast.id)} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}