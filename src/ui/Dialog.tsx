import { useEffect, useId, useRef, type ReactNode } from "react";

export interface DialogProps {
  /** Heading text; also labels the dialog for screen readers. */
  title: ReactNode;
  /** Small uppercase label above the title ("Step 2 of 2", "Variable"). */
  eyebrow?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  /** Pinned footer, usually the actions: primary first, flush left. */
  footer?: ReactNode;
  /** Max width in px for the centered dialog (default 520). */
  width?: number;
  /** "dialog" is centered (a bottom sheet under 768px); "drawer" slides from the left. */
  variant?: "dialog" | "drawer";
  /** No visible header or close button (the title still labels the dialog); Esc and the backdrop still close it. */
  bare?: boolean;
  className?: string;
}

/** Native <dialog> with showModal(): focus trap, Esc and backdrop click close it. */
export function Dialog({ title, eyebrow, onClose, children, footer, width = 520, variant = "dialog", bare, className }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      className={`dialog dialog-${variant}${className ? ` ${className}` : ""}`}
      style={{ ["--dialog-w" as string]: `${width}px` }}
      aria-labelledby={titleId}
      // Esc fires "cancel": let React unmount the dialog instead of the browser closing it.
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      // The dialog element itself is only hit outside .dialog-inner, i.e. on the backdrop.
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="dialog-inner">
        {variant === "dialog" && !bare && <span className="sheet-handle" aria-hidden="true" />}
        {bare ? (
          <h2 id={titleId} className="visually-hidden">{title}</h2>
        ) : (
          <header className="dialog-head">
            <div className="dialog-titles">
              {eyebrow && <div className="eyebrow">{eyebrow}</div>}
              <h2 id={titleId} className="dialog-title">{title}</h2>
            </div>
            <button type="button" className="btn btn-secondary btn-icon btn-lg" aria-label="Close" onClick={onClose}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          </header>
        )}
        <div className="dialog-body">{children}</div>
        {footer && <footer className="dialog-foot">{footer}</footer>}
      </div>
    </dialog>
  );
}
