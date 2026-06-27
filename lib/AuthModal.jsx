// Phase 2 — login / signup modal over Supabase Auth (lib/auth.js).
// Self-contained (own styles, no dependency on the C palette) so it can't regress the app.
// Email pre-fills from the last sign-in; the session persists, so this only appears
// when signed out. Password is never stored.
import { useState } from "react";
import { signIn, signUp, rememberEmail, recallEmail } from "./auth";

const c = { bg: "#0d1117", card: "#161b22", border: "#30363d", text: "#e6edf3", sub: "#8b949e", blue: "#2f81f7", red: "#f85149", green: "#3fb950" };
const field = { width: "100%", boxSizing: "border-box", background: "#0d1117", border: "1px solid " + c.border, borderRadius: 10, padding: "11px 13px", color: c.text, fontSize: 15, marginBottom: 10, outline: "none" };

export default function LoginScreen({ onClose, onAuthed }) {
  const [mode, setMode] = useState("in");           // "in" | "up"
  const [email, setEmail] = useState(recallEmail());
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password) { setErr("Email and password are required."); return; }
    setErr(""); setInfo(""); setBusy(true);
    const { data, error } = mode === "in"
      ? await signIn(email.trim(), password)
      : await signUp(email.trim(), password, name.trim());
    setBusy(false);
    if (error) { setErr(error.message); return; }
    rememberEmail(email.trim());
    if (mode === "up" && data && data.user && !data.session) {
      setInfo("Account created — check your email to confirm, then sign in.");
      setMode("in"); setPassword(""); return;
    }
    onAuthed && onAuthed(data && data.session);
    onClose && onClose();
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" style={{ width: "100%", maxWidth: 380, background: c.card, border: "1px solid " + c.border, borderRadius: 16, padding: 20, color: c.text }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <div style={{ fontSize: 19, fontWeight: 800 }}>{mode === "in" ? "Welcome back" : "Create your account"}</div>
          <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", color: c.sub, fontSize: 22, cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>
        <div style={{ fontSize: 13, color: c.sub, marginBottom: 16, lineHeight: 1.5 }}>
          {mode === "in" ? "Sign in — you'll stay logged in on this device." : "Set up an account to log climbs and contribute beta."}
        </div>
        {mode === "up" && (
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Display name" autoComplete="name" style={field} />
        )}
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" autoComplete="email" style={field} />
        <input value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="Password" type="password" autoComplete={mode === "in" ? "current-password" : "new-password"} style={field} />
        {err && <div style={{ color: c.red, fontSize: 12.5, marginBottom: 10, lineHeight: 1.45 }}>{err}</div>}
        {info && <div style={{ color: c.green, fontSize: 12.5, marginBottom: 10, lineHeight: 1.45 }}>{info}</div>}
        <button onClick={submit} disabled={busy} style={{ width: "100%", padding: 12, borderRadius: 11, border: "none", background: c.blue, color: "#fff", fontSize: 15, fontWeight: 700, cursor: busy ? "default" : "pointer", opacity: busy ? 0.7 : 1 }}>
          {busy ? "…" : mode === "in" ? "Sign in" : "Create account"}
        </button>
        <div style={{ textAlign: "center", marginTop: 14, fontSize: 13, color: c.sub }}>
          {mode === "in" ? "New here? " : "Already have an account? "}
          <button onClick={() => { setErr(""); setInfo(""); setMode(mode === "in" ? "up" : "in"); }} style={{ background: "none", border: "none", color: c.blue, fontWeight: 700, cursor: "pointer", fontSize: 13, padding: 0 }}>
            {mode === "in" ? "Create an account" : "Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}
