import { useState, type ButtonHTMLAttributes, type ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> {
  /** primary: the one main action (accent fill) · secondary: outlined · ghost: text only · danger: outlined, accent-text label */
  variant?: ButtonVariant;
  /** "sm" 32px, "md" 40px (default), "lg" 44px touch target, "xl" 52px */
  size?: "sm" | "md" | "lg" | "xl";
  /** Icon-only square button. Always pass an aria-label. */
  icon?: boolean;
  /** Stretch to the container width. Labels stay flush left. */
  block?: boolean;
  /** Trailing element pushed to the right edge (an arrow, "+", a shortcut). */
  trailing?: ReactNode;
  /** Async handlers show a spinner and disable the button until they settle. */
  onClick?: () => Promise<unknown> | void;
}

/** The one button. Labels sit flush left; async onClick shows a spinner while it runs. */
export function Button({ variant = "secondary", size = "md", icon, block, trailing, onClick, children, disabled, className, type = "button", ...rest }: ButtonProps) {
  const [loading, setLoading] = useState(false);
  const handle = async () => {
    if (!onClick) return;
    const result = onClick();
    if (!(result instanceof Promise)) return;
    setLoading(true);
    try {
      await result;
    } finally {
      setLoading(false);
    }
  };
  const cls = ["btn", `btn-${variant}`, `btn-${size}`, icon && "btn-icon", block && "btn-block", className].filter(Boolean).join(" ");
  return (
    <button {...rest} type={type} className={cls} disabled={disabled || loading} aria-busy={loading || undefined} onClick={handle}>
      {loading ? <span className="spinner" aria-hidden="true" /> : children}
      {trailing !== undefined && !loading && <span className="btn-trailing">{trailing}</span>}
    </button>
  );
}
