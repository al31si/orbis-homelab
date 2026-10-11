import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { t } from '@/i18n';
import type { UiTone } from '@/lib/tone';
import { Icon, type IconName } from './icons';
import { IconButton } from './IconButton';
import styles from './Toast.module.css';

export interface ToastOptions {
  /** Showing a toast with an id already on screen replaces it instead of stacking. */
  id?: string;
  message: string;
  tone?: UiTone;
  action?: { label: string; onClick: () => void };
  /** Milliseconds before it disappears (default 5000); 0 keeps it until dismissed. */
  duration?: number;
}

interface ToastItem extends ToastOptions {
  id: string;
}

export interface ToastApi {
  /** Returns the toast id. */
  show: (options: ToastOptions) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const ICONS: Record<UiTone, IconName> = {
  ok: 'check-circle',
  warn: 'alert',
  crit: 'alert-circle',
  info: 'info',
  neutral: 'info',
};

const DEFAULT_DURATION_MS = 5_000;
const MAX_VISIBLE = 3;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef(new Map<string, number>());
  const counter = useRef(0);

  const dismiss = useCallback((id: string) => {
    window.clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback(
    (options: ToastOptions) => {
      counter.current += 1;
      const id = options.id ?? `toast-${counter.current}`;
      window.clearTimeout(timers.current.get(id));
      setToasts((current) =>
        [...current.filter((toast) => toast.id !== id), { ...options, id }].slice(-MAX_VISIBLE),
      );
      const duration = options.duration ?? DEFAULT_DURATION_MS;
      if (duration > 0)
        timers.current.set(
          id,
          window.setTimeout(() => dismiss(id), duration),
        );
      return id;
    },
    [dismiss],
  );

  useEffect(() => {
    const active = timers.current;
    return () => {
      for (const timer of active.values()) window.clearTimeout(timer);
    };
  }, []);

  const api = useMemo(() => ({ show, dismiss }), [show, dismiss]);

  return (
    <ToastContext value={api}>
      {children}
      {createPortal(
        <div className={styles.host}>
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={styles.toast}
              data-tone={toast.tone ?? 'neutral'}
              role={toast.tone === 'crit' ? 'alert' : 'status'}
            >
              <Icon name={ICONS[toast.tone ?? 'neutral']} size={20} className={styles.icon} />
              <span className={styles.message}>{toast.message}</span>
              {toast.action && (
                <button
                  type="button"
                  className={styles.action}
                  onClick={() => {
                    toast.action?.onClick();
                    dismiss(toast.id);
                  }}
                >
                  {toast.action.label}
                </button>
              )}
              <IconButton
                icon="close"
                label={t('ui.toast.dismiss')}
                iconSize={18}
                onClick={() => dismiss(toast.id)}
              />
            </div>
          ))}
        </div>,
        document.body,
      )}
    </ToastContext>
  );
}

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error('useToast must be used inside <ToastProvider>');
  return api;
}
