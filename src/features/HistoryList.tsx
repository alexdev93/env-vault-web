import { useCallback, useEffect, useRef, useState } from "react";
import { api, UnauthorizedError, type HistoryEntry } from "../lib/api";
import { ago, longDate } from "../lib/format";
import { Button } from "../ui/Button";
import { SecretField } from "../ui/SecretField";
import { useToast } from "../ui/Toast";
import { useCopy } from "./useCopy";

interface Props {
  /** var:KEY, branch:ID:KEY or item:ID (see `owners` in lib/api). */
  owner: string;
  /** Name for screen readers and toasts, e.g. "DATABASE_URL". */
  label: string;
  /** Changes whenever the current value may have changed (e.g. its updated_at), to reload. */
  version?: string;
  /** Called after a restore, so the caller can refresh what it shows. */
  onRestored?: () => Promise<void> | void;
  /** A 401 locks the vault: let the caller handle it. */
  onUnauthorized?: () => void;
}

/**
 * The last 5 values something had before its current one, newest first. Each
 * can be revealed, copied, or put back (which files the current value here in
 * turn, so a restore is never destructive).
 */
export function HistoryList({ owner, label, version, onRestored, onUnauthorized }: Props) {
  const toast = useToast();
  const copy = useCopy();
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null);
  const [error, setError] = useState("");
  // Callers pass inline callbacks; a ref keeps `load` stable so it doesn't refetch every render.
  const unauthorized = useRef(onUnauthorized);
  unauthorized.current = onUnauthorized;

  const load = useCallback(async () => {
    try {
      setEntries(await api.history(owner));
      setError("");
    } catch (e) {
      if (e instanceof UnauthorizedError) return unauthorized.current?.();
      setError((e as Error).message);
      setEntries([]);
    }
  }, [owner]);

  useEffect(() => {
    load();
  }, [load, version]);

  const restore = async (entry: HistoryEntry) => {
    try {
      await api.restoreHistory(entry.id);
      toast(`Restored ${label}’s value replaced ${ago(entry.created_at)}`);
      await onRestored?.();
      await load();
    } catch (e) {
      if (e instanceof UnauthorizedError) return unauthorized.current?.();
      toast((e as Error).message, true);
    }
  };

  return (
    <div className="history">
      <div className="detail-label">Earlier values · {entries?.length ?? 0} of the last 5 kept</div>
      {error && <p className="field-error">{error}</p>}
      {entries === null ? (
        <p className="muted small">Loading…</p>
      ) : entries.length === 0 ? (
        <p className="muted small">No earlier values yet. When the value changes, the old one is kept here (the last 5).</p>
      ) : (
        <ol className="history-list">
          {entries.map((e, i) => (
            <li key={e.id} className="history-entry">
              <div className="history-head">
                <span className="type-code">[-{i + 1}]</span>
                <time className="grow small muted" dateTime={e.created_at} title={longDate(e.created_at)}>
                  replaced {ago(e.created_at)} · {longDate(e.created_at)}
                </time>
                <Button size="sm" variant="ghost" onClick={() => restore(e)}>Restore</Button>
              </div>
              <SecretField
                key={e.id}
                label={`${label}, value ${i + 1} back`}
                fetchValue={() => api.getHistoryValue(e.id)}
                onCopy={(value) => copy(value, `${label} (earlier value)`, true)}
              />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
