import { useCallback, useEffect, useState } from "react";
import { useSettings } from "../lib/settings";
import { Icon } from "./Icon";

export interface SecretFieldProps {
  /** Loads the plaintext on demand (reveal or copy). It is never kept after hiding. */
  fetchValue: () => Promise<string>;
  /** Copies the value; the caller writes the clipboard and shows the toast. */
  onCopy: (value: string) => Promise<void> | void;
  /** Accessible name, e.g. the key: "DATABASE_URL". */
  label: string;
  /** Seconds before a revealed value hides itself. Defaults to the user's setting. */
  revealSeconds?: number;
  /** Text under the masked field. */
  note?: string;
}

// A fixed-width mask, so the dots never leak the value's length.
const MASK = "*".repeat(20);

type State = { kind: "masked" } | { kind: "loading" } | { kind: "revealed"; value: string; until: number };

/** Masked secret with reveal + copy. A revealed value shows a countdown bar and hides itself. */
export function SecretField({ fetchValue, onCopy, label, revealSeconds, note }: SecretFieldProps) {
  const [settings] = useSettings();
  const seconds = revealSeconds ?? settings.revealSeconds;
  const [state, setState] = useState<State>({ kind: "masked" });
  const [now, setNow] = useState(() => Date.now());
  const hide = useCallback(() => setState({ kind: "masked" }), []);

  // Tick the countdown while revealed; hide at zero or when the tab is hidden.
  useEffect(() => {
    if (state.kind !== "revealed") return;
    const t = window.setInterval(() => {
      const n = Date.now();
      if (n >= state.until) hide();
      else setNow(n);
    }, 250);
    const onVis = () => document.hidden && hide();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [state, hide]);

  const reveal = async () => {
    if (state.kind === "revealed") return hide();
    setState({ kind: "loading" });
    try {
      const value = await fetchValue();
      setNow(Date.now());
      setState({ kind: "revealed", value, until: Date.now() + seconds * 1000 });
    } catch {
      hide();
    }
  };

  const copy = async () => onCopy(state.kind === "revealed" ? state.value : await fetchValue());

  const revealed = state.kind === "revealed";
  const empty = revealed && state.value === "";
  const remaining = revealed ? Math.max(0, Math.ceil((state.until - now) / 1000)) : 0;

  return (
    <div className="secret">
      <div className="secret-box">
        <div className={"secret-value" + (revealed ? " revealed" : "") + (empty ? " empty" : "")} aria-label={revealed ? undefined : `${label}, hidden`} aria-live="polite">
          {state.kind === "loading" ? <span className="spinner" aria-label="Loading" /> : revealed ? (empty ? "empty — not set yet" : state.value) : MASK}
        </div>
        <button type="button" className="btn btn-icon secret-btn" aria-label={revealed ? `Hide ${label}` : `Reveal ${label}`} aria-pressed={revealed} onClick={reveal}>
          <Icon name={revealed ? "eyeOff" : "eye"} size={16} />
        </button>
        <button type="button" className="btn btn-icon secret-btn" aria-label={`Copy ${label}`} onClick={copy}>
          <Icon name="copy" size={16} />
        </button>
      </div>
      {revealed ? (
        <div className="secret-meta">
          <div className="countdown" aria-hidden="true"><span style={{ width: `${Math.max(0, (state.until - now) / (seconds * 10))}%` }} /></div>
          Hides in {remaining}s
        </div>
      ) : (
        note && <div className="secret-meta">{note}</div>
      )}
    </div>
  );
}
