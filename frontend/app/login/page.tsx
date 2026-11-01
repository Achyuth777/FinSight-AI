"use client";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import { Brand } from "@/components/brand";
import { Notice } from "@/components/ui/notice";
import "./login.css";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [returnTo, setReturnTo] = useState("");
  // A redirect from an ended session carries ?next=; only same-site workspace paths are honoured.
  useEffect(() => {
    const next = new URLSearchParams(window.location.search).get("next") || "";
    if (/^\/app\/[a-z]+$/.test(next)) setReturnTo(next);
  }, []);
  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const result = await response.json().catch(() => ({}));
      if (response.status === 503) throw new Error("Sign-in is not configured on this server. The owner must set FINSIGHT_OWNER_PASSWORD and FINSIGHT_SESSION_SECRET for the web app, then restart it.");
      if (!response.ok) throw new Error(result.error || "Unable to sign in.");
      window.location.assign(returnTo || "/app/overview");
    } catch (cause) {
      setError(cause instanceof TypeError ? "Could not reach the server. Check your connection and try again." : cause instanceof Error ? cause.message : "Unable to sign in.");
      setBusy(false);
    }
  }
  return (
    <main className="login-shell">
      <div className="login-card">
        <Link href="/" className="login-brand" aria-label="FinSight home"><Brand /></Link>
        <h1>Sign in</h1>
        <p>Single-analyst workspace for reviewing flagged transactions. Enter the workspace password set by the owner.</p>
        {returnTo && <Notice>Your session ended. Sign in to return to {returnTo}.</Notice>}
        <form onSubmit={signIn}>
          <div className="field">
            <label htmlFor="workspace-password">Workspace password</label>
            <div className="login-password-field">
              <input id="workspace-password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} required minLength={16} autoComplete="current-password" aria-describedby="password-hint" aria-invalid={error ? true : undefined} />
              <button type="button" className="login-password-toggle" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} aria-controls="workspace-password" onClick={() => setShowPassword((visible) => !visible)}>
                {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
              </button>
            </div>
            <p className="field-hint" id="password-hint">At least 16 characters.</p>
          </div>
          {error && <Notice kind="error">{error}</Notice>}
          <button type="submit" className="button primary login-submit" disabled={busy}>
            {busy ? <><Loader2 className="spin" size={17} aria-hidden="true" /> Checking…</> : <>Continue <ArrowRight size={17} aria-hidden="true" /></>}
          </button>
        </form>
        <p className="login-footer">Sessions last 12 hours. The workspace never makes or blocks payments.</p>
      </div>
      <Link href="/" className="login-back">← Back to the FinSight AI website</Link>
    </main>
  );
}
