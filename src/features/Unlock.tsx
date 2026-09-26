import { useState } from "react";
import { login } from "../lib/api";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";

// Paste and password-manager fill both work (WCAG 3.3.8 accessible authentication).
export function Unlock({ onUnlocked }: { onUnlocked: () => Promise<void> }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = async () => {
    setError("");
    try {
      await login(password);
      setPassword("");
      await onUnlocked();
    } catch (e) {
      const msg = (e as Error).message;
      setError(msg === "wrong password" ? "That password didn’t match. Try again." : msg);
    }
  };

  return (
    <div className="unlock">
      <div className="unlock-mark" aria-hidden="true">&gt;_<span className="caret" /></div>
      {/* Enter in the field "clicks" the submit button, which runs submit() with its spinner. */}
      <form className="unlock-form" onSubmit={(e) => e.preventDefault()}>
        <h1>Unlock your vault</h1>
        <p className="muted">Enter your vault password. Your password manager can fill it in.</p>
        <div className="field">
          <label className="field-label" htmlFor="pw">Password</label>
          <input
            id="pw"
            className="input input-lg"
            type="password"
            name="password"
            autoComplete="current-password"
            autoFocus
            required
            aria-invalid={!!error || undefined}
            aria-describedby={error ? "pw-err" : undefined}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <div id="pw-err" className="field-error" role="alert">{error}</div>}
        </div>
        <Button type="submit" variant="primary" size="xl" block trailing={<Icon name="arrowRight" size={18} />} onClick={submit}>
          Unlock
        </Button>
      </form>
    </div>
  );
}
