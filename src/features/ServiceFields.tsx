import { useId } from "react";
import type { ServiceInput } from "../lib/api";
import { SERVICE_KINDS, SERVICE_PROVIDERS } from "../lib/format";

export const EMPTY_SERVICE: ServiceInput = { kind: "", provider: "", url: "", account: "", notes: "" };

/** The fields of one service: kind + provider (with suggestions), link, account, notes. */
export function ServiceFields({ value, onChange, autoFocus }: { value: ServiceInput; onChange: (v: ServiceInput) => void; autoFocus?: boolean }) {
  const id = useId();
  const set = (field: keyof ServiceInput) => (e: { target: { value: string } }) => onChange({ ...value, [field]: e.target.value });
  return (
    <div className="service-fields">
      <div className="field-pair">
        <div className="field">
          <label className="field-label" htmlFor={`${id}-kind`}>What is it</label>
          <input id={`${id}-kind`} className="input" list={`${id}-kinds`} placeholder="database" autoComplete="off" autoFocus={autoFocus} value={value.kind} onChange={set("kind")} />
          <datalist id={`${id}-kinds`}>{SERVICE_KINDS.map((k) => <option key={k} value={k} />)}</datalist>
        </div>
        <div className="field">
          <label className="field-label" htmlFor={`${id}-provider`}>Provider</label>
          <input id={`${id}-provider`} className="input" list={`${id}-providers`} placeholder="neon" autoComplete="off" value={value.provider} onChange={set("provider")} />
          <datalist id={`${id}-providers`}>{SERVICE_PROVIDERS.map((p) => <option key={p} value={p} />)}</datalist>
        </div>
      </div>
      <div className="field-pair">
        <div className="field">
          <label className="field-label" htmlFor={`${id}-url`}>Link</label>
          <input id={`${id}-url`} className="input mono" placeholder="https://console.neon.tech" autoComplete="off" spellCheck={false} value={value.url} onChange={set("url")} />
        </div>
        <div className="field">
          <label className="field-label" htmlFor={`${id}-account`}>Signed in as</label>
          <input id={`${id}-account`} className="input" placeholder="you@gmail.com" autoComplete="off" spellCheck={false} value={value.account} onChange={set("account")} />
        </div>
      </div>
      <div className="field">
        <label className="field-label" htmlFor={`${id}-notes`}>Notes</label>
        <textarea id={`${id}-notes`} className="input" rows={2} placeholder="Free tier · project “my-api” · region eu-central" value={value.notes} onChange={set("notes")} />
      </div>
    </div>
  );
}
