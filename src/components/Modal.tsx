import { useEffect, type CSSProperties, type ReactNode } from "react";

// Closes on backdrop click or Escape, like the original dashboard.
export function Modal({ onClose, children, style }: { onClose: () => void; children: ReactNode; style?: CSSProperties }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={style}>
        {children}
      </div>
    </div>
  );
}
