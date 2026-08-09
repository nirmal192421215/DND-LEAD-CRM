// eslint-disable-next-line react/only-export-components -- context files intentionally export hooks
import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'info';
interface Toast { id: string; message: string; type: ToastType; }

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

const ICONS = { success: '✓', error: '✕', info: 'ℹ' };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {toasts.length > 0 && (
        <div className="toast-container">
          {toasts.map((t) => (
            <div key={t.id} className={`toast ${t.type}`}>
              <span style={{ fontSize: 14 }}>{ICONS[t.type]}</span>
              {t.message}
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
