import type { ReactNode } from "react";

export interface EmptyStateProps {
  title: ReactNode;
  children?: ReactNode;
  /** Buttons or links, primary first. */
  actions?: ReactNode;
}

/** Centered message for an empty list, no search matches, or a missing page. */
export function EmptyState({ title, children, actions }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <h3 className="empty-title">{title}</h3>
      {children && <p className="empty-body">{children}</p>}
      {actions && <div className="empty-actions">{actions}</div>}
    </div>
  );
}

/** Loading placeholder: static 60px rows (no shimmer). */
export function SkeletonRows({ count = 6 }: { count?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="skeleton-row"><span className="skeleton-bar" style={{ width: `${40 + ((i * 17) % 35)}%` }} /></div>
      ))}
    </div>
  );
}

/** Inline error banner with a retry. Never include a secret value in the message. */
export function ErrorBanner({ children, onRetry }: { children: ReactNode; onRetry?: () => void }) {
  return (
    <div className="error-banner" role="alert">
      <span>{children}</span>
      {onRetry && <button type="button" className="btn btn-ghost btn-sm" onClick={onRetry}>Try again</button>}
    </div>
  );
}
