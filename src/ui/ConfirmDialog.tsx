import type { ReactNode } from "react";
import { Button } from "./Button";
import { Dialog } from "./Dialog";

export interface ConfirmDialogProps {
  title: ReactNode;
  children: ReactNode;
  /** Label of the destructive action, e.g. "Delete DATABASE_URL". */
  confirmLabel: string;
  onConfirm: () => Promise<unknown> | void;
  onClose: () => void;
}

/** Accessible replacement for window.confirm(): a small dialog with the destructive action first. */
export function ConfirmDialog({ title, children, confirmLabel, onConfirm, onClose }: ConfirmDialogProps) {
  return (
    <Dialog
      title={title}
      onClose={onClose}
      width={440}
      footer={
        <>
          <Button variant="primary" size="lg" className="grow" onClick={onConfirm}>{confirmLabel}</Button>
          <Button size="lg" onClick={onClose} autoFocus>Cancel</Button>
        </>
      }
    >
      <div className="confirm-text">{children}</div>
    </Dialog>
  );
}
