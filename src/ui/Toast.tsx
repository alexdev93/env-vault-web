import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { Icon } from "./Icon";

interface ToastItem {
  id: number;
  message: string;
  isError: boolean;
  leaving: boolean;
}

/** Never pass a secret value as the message: name the key instead ("Copied DATABASE_URL"). */
export type ShowToast = (message: string, isError?: boolean) => void;

const ToastContext = createContext<ShowToast>(() => {});

export const useToast = () => useContext(ToastContext);

let nextId = 0;

/** Hosts the toast stack. Wrap the app once; call useToast() anywhere below it. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const show = useCallback<ShowToast>((message, isError = false) => {
    const id = nextId++;
    setToasts((t) => [...t, { id, message, isError, leaving: false }]);
    setTimeout(() => {
      setToasts((t) => t.map((x) => (x.id === id ? { ...x, leaving: true } : x)));
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 200);
    }, isError ? 5000 : 2800);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={"toast" + (t.isError ? " toast-error" : "") + (t.leaving ? " leaving" : "")} role={t.isError ? "alert" : undefined}>
            <Icon name={t.isError ? "alert" : "check"} size={16} />
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
