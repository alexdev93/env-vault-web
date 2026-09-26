import type { ReactNode } from "react";

export interface FieldProps {
  label: ReactNode;
  /** id of the control inside, so the label is clickable and announced. */
  htmlFor?: string;
  /** Helper text under the control. */
  hint?: ReactNode;
  /** Error text under the control (role=alert). Set aria-invalid on the control too. */
  error?: ReactNode;
  errorId?: string;
  children: ReactNode;
}

/** Label + control + hint/error stack. Style inputs with the .input class. */
export function Field({ label, htmlFor, hint, error, errorId, children }: FieldProps) {
  return (
    <div className="field">
      <label className="field-label" htmlFor={htmlFor}>{label}</label>
      {children}
      {hint && !error && <div className="field-hint">{hint}</div>}
      {error && <div className="field-error" id={errorId} role="alert">{error}</div>}
    </div>
  );
}
