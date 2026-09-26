import { CLIPBOARD_CLEAR_SECONDS, useSettings, type Theme } from "../lib/settings";
import { Seg } from "../ui/Seg";
import { LANGS } from "./UsageDialog";

const REVEAL_OPTIONS = [10, 20, 30, 60] as const;

export function SettingsPage() {
  const [s, update] = useSettings();
  return (
    <section className="list-pane" aria-labelledby="settings-title">
      <header className="page-head">
        <div className="grow">
          <div className="eyebrow">This browser</div>
          <h1 id="settings-title">Settings</h1>
          <p className="page-sub">Saved on this device only.</p>
        </div>
      </header>
      <div className="settings">
        <div className="setting">
          <div>
            <h3>Theme</h3>
            <p className="muted">System follows your device’s light or dark setting.</p>
          </div>
          <Seg<Theme> label="Theme" value={s.theme} onChange={(theme) => update({ theme })} options={[["system", "System"], ["light", "Light"], ["dark", "Dark"]]} />
        </div>
        <div className="setting">
          <div>
            <h3>Hide revealed values after</h3>
            <p className="muted">A revealed value masks itself again, and always when you switch tabs.</p>
          </div>
          <Seg
            label="Hide revealed values after"
            value={String(s.revealSeconds)}
            onChange={(v) => update({ revealSeconds: Number(v) })}
            options={REVEAL_OPTIONS.map((n) => [String(n), `${n}s`] as const)}
          />
        </div>
        <div className="setting">
          <div>
            <h3>Clear copied values</h3>
            <p className="muted">
              Empties the clipboard {CLIPBOARD_CLEAR_SECONDS}s after you copy a secret, if it still holds that secret. Some browsers
              ask permission first; if they refuse, it’s left as is.
            </p>
          </div>
          <Seg label="Clear copied values" value={s.clipboardClear ? "on" : "off"} onChange={(v) => update({ clipboardClear: v === "on" })} options={[["on", "After 30s"], ["off", "Never"]]} />
        </div>
        <div className="setting">
          <div>
            <h3>Default snippet language</h3>
            <p className="muted">Used first in “Use in your app”.</p>
          </div>
          <Seg label="Default snippet language" value={s.snippetLang} onChange={(snippetLang) => update({ snippetLang })} options={LANGS} />
        </div>
      </div>
    </section>
  );
}
