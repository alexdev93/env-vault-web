import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { Icon } from "./icons";

interface Toast {
  id: number;
  message: string;
  isError: boolean;
  leaving: boolean;
}

type ShowToast = (message: string, isError?: boolean) => void;

const ToastContext = createContext<ShowToast>(() => {});

export const useToast = () => useContext(ToastContext);

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback<ShowToast>((message, isError = false) => {
    const id = nextId++;
    setToasts((t) => [...t, { id, message, isError, leaving: false }]);
    setTimeout(() => {
      setToasts((t) => t.map((x) => (x.id === id ? { ...x, leaving: true } : x)));
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 200);
    }, 2400);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div id="toasts">
        {toasts.map((t) => (
          <div key={t.id} className={"toast" + (t.isError ? " err" : "") + (t.leaving ? " leaving" : "")}>
            <Icon name={t.isError ? "alert" : "check"} size={15} />
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// Copies to the clipboard and reports the result. The Clipboard API is
// unavailable outside secure contexts (e.g. plain http on a non-localhost host).
export async function copyText(text: string, successMessage: string, toast: ShowToast) {
  try {
    await navigator.clipboard.writeText(text);
    toast(successMessage);
  } catch {
    toast("Couldn't copy: clipboard not available here", true);
  }
}
