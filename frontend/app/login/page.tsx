"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ArrowRight, LockKeyhole, ShieldCheck } from "lucide-react";
import { Brand } from "@/components/brand";
import "./login.css";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to sign in.");
      window.location.assign("/app/overview");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to sign in.");
    } finally { setBusy(false); }
  }
  return (
    <main className="login-shell">
      <div className="login-background" aria-hidden="true" />
      <div className="login-card">
        <Link href="/" className="login-brand"><Brand /></Link>
        <div className="login-emblem"><LockKeyhole size={23} strokeWidth={1.6}/></div>
        <div className="login-eyebrow">PRIVATE ANALYST WORKSPACE</div>
        <h1>Access your intelligence.</h1>
        <p>FinSight AI is a single-analyst research environment. Sign in to access transactions, investigations and ML experiments.</p>
        <form onSubmit={signIn}>
          <label htmlFor="workspace-password">Workspace password</label>
          <input id="workspace-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={16} autoComplete="current-password" placeholder="Enter your access password" />
          {error && <div className="login-error" role="alert">{error}</div>}
          <button type="submit" className="login-submit" disabled={busy}>{busy ? "Checking access…" : "Continue to workspace"}<ArrowRight size={17}/></button>
        </form>
        <div className="login-footer"><ShieldCheck size={15}/> Protected analyst access · Synthetic demo recommended</div>
      </div>
      <Link href="/" className="login-back">← Back to FinSight AI</Link>
    </main>
  );
}
