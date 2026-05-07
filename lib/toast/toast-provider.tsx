import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import type { ToastLevel, ToastMessage } from '../types';
import { ToastList } from './toast';

interface ToastContextValue {
  show: (msg: Omit<ToastMessage, 'id'>) => string;
  hide: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const MAX_VISIBLE = 3;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastMessage[]>([]);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const hide = useCallback((id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
    const handle = timers.current[id];
    if (handle) {
      clearTimeout(handle);
      delete timers.current[id];
    }
  }, []);

  const show = useCallback(
    (msg: Omit<ToastMessage, 'id'>) => {
      const id = `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
      const next: ToastMessage = { id, ...msg };
      setItems((prev) => [...prev, next].slice(-MAX_VISIBLE));
      const duration = msg.durationMs ?? defaultDuration(msg.level);
      timers.current[id] = setTimeout(() => hide(id), duration);
      return id;
    },
    [hide],
  );

  useEffect(() => {
    const t = timers.current;
    return () => {
      Object.values(t).forEach(clearTimeout);
    };
  }, []);

  const value = useMemo<ToastContextValue>(() => ({ show, hide }), [show, hide]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastList items={items} onDismiss={hide} />
    </ToastContext.Provider>
  );
}

function defaultDuration(level: ToastLevel): number {
  switch (level) {
    case 'error':
      return 6000;
    case 'warning':
      return 5000;
    case 'success':
      return 3500;
    case 'info':
    default:
      return 4000;
  }
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider />');
  return ctx;
}
