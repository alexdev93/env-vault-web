import { useId } from "react";
import type { ServiceInput } from "../lib/api";
import { findKind, findProvider, SERVICE_KINDS } from "../lib/format";

export const EMPTY_SERVICE: ServiceInput = { kind: "", provider: "", name: "", url: "", account: "", region: "", plan: "", notes: "", var_keys: [] };

interface Props {
  value: ServiceInput;
  onChange: (v: ServiceInput) => void;
  /** The project's variable keys, to link the ones this service provides. Omit to hide linking. */
  keys?: string[];
}

/**
 * A guided service form: pick what it is, then who provides it (known providers
 * fill in their console link), then the optional details and the variables it provides.
 */
export function ServiceFields({ value, onChange, keys }: Props) {
  const id = useId();
  const set = (patch: Partial<ServiceInput>) => onChange({ ...value, ...patch });
  const text = (field: keyof ServiceInput) => (e: { target: { value: string } }) => set({ [field]: e.target.value });

  const kind = findKind(value.kind);
  const customKind = !!value.kind && !kind;
  const preset = findProvider(value.kind, value.provider);

  const pickKind = (k: string) => set({ kind: value.kind === k ? "" : k });
  const pickProvider = (pid: string, url: string) => {
    const previous = findProvider(value.kind, value.provider);
    // Fill the link unless the user typed their own.
    const keepUrl = value.url && value.url !== previous?.url;
    set({ provider: pid, url: keepUrl ? value.url : url });
  };
  const toggleKey = (k: string) =>
    set({ var_keys: value.var_keys.includes(k) ? value.var_keys.filter((x) => x !== k) : [...value.var_keys, k] });

  const suggested = new Set(preset?.vars ?? []);
  const linkable = keys ? [...keys].sort((a, b) => Number(suggested.has(b)) - Number(suggested.has(a)) || a.localeCompare(b)) : [];

  return (
    <div className="service-fields">
      <fieldset className="field">
        <legend className="field-label">1 · What is it?</legend>
        <div className="chips" role="group" aria-label="Kind of service">
          {SERVICE_KINDS.map((k) => (
            <button key={k.id} type="button" className="chip" aria-pressed={value.kind === k.id || (k.id === "other" && customKind)} onClick={() => pickKind(k.id)}>
              {k.label}
            </button>
          ))}
        </div>
        {(value.kind === "other" || customKind) && (
          <input className="input" aria-label="Kind" placeholder="What kind: queue, cache, analytics…" autoComplete="off" value={value.kind === "other" ? "" : value.kind}
            onChange={(e) => set({ kind: e.target.value || "other" })} />
        )}
        {kind && kind.id !== "other" && <div className="field-hint">{kind.hint}</div>}
      </fieldset>

      <fieldset className="field">
        <legend className="field-label">2 · Who provides it?</legend>
        {kind && kind.providers.length > 0 && (
          <div className="chips" role="group" aria-label="Provider">
            {kind.providers.map((p) => (
              <button key={p.id} type="button" className="chip" aria-pressed={value.provider.toLowerCase() === p.id} onClick={() => pickProvider(p.id, p.url)}>
                {p.label}
              </button>
            ))}
          </div>
        )}
        <input className="input" aria-label="Provider" placeholder={kind?.providers.length ? "…or type another provider" : "neon, cloudflare, stripe…"} autoComplete="off"
          value={value.provider} onChange={text("provider")} />
      </fieldset>

      <fieldset className="field">
        <legend className="field-label">3 · Details <span className="muted">(all optional)</span></legend>
        <div className="field-pair">
          <div className="field">
            <label className="field-label small" htmlFor={`${id}-name`}>Name there</label>
            <input id={`${id}-name`} className="input" placeholder={preset?.resource ? `The ${preset.resource}` : "What it’s called at the provider"} autoComplete="off" value={value.name} onChange={text("name")} />
          </div>
          <div className="field">
            <label className="field-label small" htmlFor={`${id}-account`}>Signed in as</label>
            <input id={`${id}-account`} className="input" placeholder="you@gmail.com" autoComplete="off" spellCheck={false} value={value.account} onChange={text("account")} />
          </div>
        </div>
        <div className="field">
          <label className="field-label small" htmlFor={`${id}-url`}>Console link</label>
          <input id={`${id}-url`} className="input mono" placeholder={preset?.url ?? "https://…"} autoComplete="off" spellCheck={false} value={value.url} onChange={text("url")} />
        </div>
        <div className="field-pair">
          <div className="field">
            <label className="field-label small" htmlFor={`${id}-region`}>Region</label>
            <input id={`${id}-region`} className="input" placeholder="eu-central-1" autoComplete="off" value={value.region} onChange={text("region")} />
          </div>
          <div className="field">
            <label className="field-label small" htmlFor={`${id}-plan`}>Plan</label>
            <input id={`${id}-plan`} className="input" placeholder="Free · Pro · $5/mo" autoComplete="off" value={value.plan} onChange={text("plan")} />
          </div>
        </div>
      </fieldset>

      {keys && (
        <fieldset className="field">
          <legend className="field-label">4 · Which variables come from it?</legend>
          {linkable.length ? (
            <div className="checks">
              {linkable.map((k) => (
                <label key={k} className="check">
                  <input type="checkbox" checked={value.var_keys.includes(k)} onChange={() => toggleKey(k)} />
                  <span className="mono">{k}</span>
                  {suggested.has(k) && !value.var_keys.includes(k) && <span className="muted small">suggested</span>}
                </label>
              ))}
            </div>
          ) : (
            <p className="field-hint">This project has no variables yet. Add them, then link the ones this service gives you.</p>
          )}
          {preset?.vars && preset.vars.some((v) => !keys.includes(v)) && (
            <p className="field-hint">
              {preset.label} usually provides <span className="mono">{preset.vars.filter((v) => !keys.includes(v)).join(", ")}</span>. Add them as variables to link them.
            </p>
          )}
        </fieldset>
      )}

      <div className="field">
        <label className="field-label" htmlFor={`${id}-notes`}>Notes</label>
        <textarea id={`${id}-notes`} className="input" rows={2} placeholder="Branching per preview deploy · usage alerts at 80%" value={value.notes} onChange={text("notes")} />
      </div>
    </div>
  );
}

/** The service's form value, from a stored service. */
export function serviceInput(s: ServiceInput): ServiceInput {
  const { kind, provider, name, url, account, region, plan, notes, var_keys } = s;
  return { kind, provider, name, url, account, region, plan, notes, var_keys: [...var_keys] };
}
