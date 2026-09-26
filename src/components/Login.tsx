import { useState } from "react";
import { login } from "../api";
import { Icon } from "../icons";
import { LoadingButton } from "./LoadingButton";

export function Login({ onLoggedIn }: { onLoggedIn: () => Promise<void> }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = async () => {
    const pw = password;
    setPassword("");
    setError("");
    try {
      await login(pw);
      await onLoggedIn();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div id="loginScreen">
      {/* Enter in the password field "clicks" the submit button, which runs submit(). */}
      <form className="card" onSubmit={(e) => e.preventDefault()}>
        <div className="brand">
          <span className="mark"><Icon name="lock" size={17} /></span> env-vault
        </div>
        <p className="muted">Your personal secrets manager</p>
        <div className="field">
          <label htmlFor="loginPassword">Password</label>
          <input
            type="password"
            id="loginPassword"
            autoComplete="new-password"
            data-lpignore="true"
            data-1p-ignore
            data-bwignore
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <LoadingButton type="submit" style={{ width: "100%" }} onClick={submit}>
          Log in
        </LoadingButton>
        <div className="error">{error}</div>
      </form>
    </div>
  );
}
