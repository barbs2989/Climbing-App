// Phase 2 — login / signup modal over Supabase Auth (lib/auth.js).
// Self-contained (own styles, no dependency on the C palette) so it can't regress the app.
// Email pre-fills from the last sign-in; the session persists, so this appears only when signed
// out -- with one exception: `recovery` opens it over a signed-in session, because a reset link
// authenticates you before you have chosen the new password. Password is never stored.
import { useState } from "react";
import { signIn, signUp, rememberEmail, recallEmail, requestPasswordReset, updatePassword, useOAuthProviders, signInWithGoogle } from "./auth";

const c = { bg: "#0d1117", card: "#161b22", border: "#30363d", text: "#e6edf3", sub: "#8b949e", blue: "#2f81f7", red: "#f85149", green: "#3fb950" };
const field = { width: "100%", boxSizing: "border-box", background: "#0d1117", border: "1px solid " + c.border, borderRadius: 10, padding: "11px 13px", color: c.text, fontSize: 15, marginBottom: 10, outline: "none" };

const TITLE = { in: "Welcome back", up: "Create your account", forgot: "Reset your password", reset: "Choose a new password" };
const BLURB = {
  in: "Sign in — you'll stay logged in on this device.",
  up: "Set up an account to log climbs and contribute beta.",
  forgot: "We'll email you a link that opens ClimbMatch and lets you set a new password.",
  reset: "You opened a reset link, so you're signed in — pick a new password now and it will be the one that works next time.",
};
const ACTION = { in: "Sign in", up: "Create account", forgot: "Email me a reset link", reset: "Save new password" };

export default function LoginScreen({ onClose, onAuthed, recovery, onRecovered }) {
  const [mode, setMode] = useState(recovery ? "reset" : "in"); // "in" | "up" | "forgot" | "reset"
  const [email, setEmail] = useState(recallEmail());
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  // Asked, not assumed -- see useOAuthProviders. Until the project has Google enabled this is
  // false and the button never renders, so nobody is offered a sign-in that cannot complete.
  const providers = useOAuthProviders();
  const googleOn = !!providers && providers.indexOf("google") >= 0;

  // Deliberately the same message whether or not the address has an account. Saying "no account
  // for that email" turns this box into a membership oracle for anyone who wants to know which
  // climbers are here, and Supabase returns success either way for the same reason.
  const sendReset = async () => {
    if (!email.trim()) { setErr("Enter the email you signed up with."); return; }
    setErr(""); setInfo(""); setBusy(true);
    const { error } = await requestPasswordReset(email.trim());
    setBusy(false);
    if (error) { setErr(error.message); return; }
    rememberEmail(email.trim());
    setInfo("If that email has an account, a reset link is on its way. The link opens ClimbMatch and asks for a new password.");
  };

  const saveNewPassword = async () => {
    if (password.length < 6) { setErr("Use at least 6 characters."); return; }
    setErr(""); setInfo(""); setBusy(true);
    const { error } = await updatePassword(password);
    setBusy(false);
    if (error) { setErr(error.message); return; }
    // The reset link already signed them in, so there is nothing left to do -- but dropping
    // straight into the app reads as "did that work?". Confirm it, then let them dismiss.
    setPassword(""); setDone(true);
    setInfo("Password updated. This is the one to use next time you sign in.");
  };

  const submit = async () => {
    if (!email.trim() || !password) { setErr("Email and password are required."); return; }
    setErr(""); setInfo(""); setBusy(true);
    const { data, error } = mode === "in"
      ? await signIn(email.trim(), password)
      : await signUp(email.trim(), password, name.trim());
    setBusy(false);
    if (error) { setErr(error.message); return; }
    // Signing up with an address that already has an account is NOT an error:
    // to avoid leaking which emails are registered, Supabase returns a decoy user
    // with an empty `identities` array, no session, and error === null. That fell
    // through to the "check your email" branch below, so the user waited for a
    // confirmation mail that was never coming, for an account already theirs.
    if (mode === "up" && data && data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      setInfo("That email already has an account — sign in instead.");
      setMode("in"); setPassword(""); return;
    }
    rememberEmail(email.trim());
    if (mode === "up" && data && data.user && !data.session) {
      setInfo("Account created — check your email to confirm, then sign in.");
      setMode("in"); setPassword(""); return;
    }
    onAuthed && onAuthed(data && data.session);
    onClose && onClose();
  };

  const go = () => (mode === "forgot" ? sendReset() : mode === "reset" ? saveNewPassword() : submit());

  // A successful call navigates to Google and never comes back to this line, so reaching the
  // error branch means the redirect did not happen at all -- surface it rather than leaving the
  // button looking dead. Coming back, the tokens are in the URL hash and detectSessionInUrl
  // (on by default) turns them into a session, which useSession picks up and the gate closes.
  const goGoogle = async () => {
    setErr(""); setInfo(""); setBusy(true);
    const { error } = await signInWithGoogle();
    setBusy(false);
    if (error) setErr(error.message);
  };

  // role/aria-modal live on the BACKDROP, not the inner panel — the other 39 dialogs in this
  // app do the same, and useDialogA11y (lib/dialogA11y.js) depends on it: Escape closes by
  // calling dlg.click() on the element carrying role="dialog", expecting that element's own
  // handler to dismiss. With the role on the panel, that click hit
  // onClick={e=>e.stopPropagation()} and was swallowed, so Escape silently did nothing on the
  // sign-in modal — the one a keyboard user meets first.
  return (
    <div onClick={onClose} role="dialog" aria-modal="true" aria-label={TITLE[mode]} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 380, background: c.card, border: "1px solid " + c.border, borderRadius: 16, padding: 20, color: c.text }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <div style={{ fontSize: 19, fontWeight: 800 }}>{TITLE[mode]}</div>
          {/* Only offer a way out when there is one. Since #584 this component is also the
              production sign-in GATE (ClimbMatch.jsx renders <AuthModal onAuthed={...}/> with
              no onClose when realAuthGate is on), and React drops onClick={undefined} silently
              -- so the close button rendered, invited a click, and did nothing. Verified against
              the live site: Escape and × both left the modal up, with no page error to show for
              it. Worse for a screen reader, which announced an actionable "Close" that wasn't.
              The reset screen below is the same shape: also no onClose, also no ×. */}
          {onClose && <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", color: c.sub, fontSize: 22, cursor: "pointer", lineHeight: 1 }}>×</button>}
        </div>
        <div style={{ fontSize: 13, color: c.sub, marginBottom: 16, lineHeight: 1.5 }}>{BLURB[mode]}</div>
        {/* Sign-in and sign-up only: on "forgot" there is no account to federate yet, and on
            "reset" the climber is already signed in and owes us a password.
            aria-label so the decorative "G" does not become part of the announced name -- the
            same reason the demo screen's Facebook button carries one. */}
        {googleOn && (mode === "in" || mode === "up") && (
          <div>
            <button onClick={goGoogle} disabled={busy} aria-label="Continue with Google" style={{ width: "100%", boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: 12, borderRadius: 11, border: "1px solid " + c.border, background: "#fff", color: "#1f2328", fontSize: 15, fontWeight: 600, cursor: busy ? "default" : "pointer", opacity: busy ? 0.7 : 1 }}>
              <span style={{ fontWeight: 800, color: "#4285F4" }}>G</span> Continue with Google
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "14px 0" }}>
              <div style={{ flex: 1, height: 1, background: c.border }} />
              <span style={{ fontSize: 12, color: c.sub }}>or use email</span>
              <div style={{ flex: 1, height: 1, background: c.border }} />
            </div>
          </div>
        )}
        {/* aria-label on all three: their only visible naming is the placeholder, which is not
            an accessible name -- it is a hint, and it disappears the moment the field has text.
            A screen reader announced these as bare "edit text". This is the sign-in GATE, so
            since #584 made accounts mandatory it is the first screen every user meets.
            Each label repeats the placeholder verbatim, including the reset-mode wording, so
            the announced name and the visible words never diverge -- which is why #588 left
            placeholder-only fields alone in general and why these three are safe to name. */}
        {mode === "up" && (
          <input value={name} onChange={(e) => setName(e.target.value)} aria-label="Display name" placeholder="Display name" autoComplete="name" style={field} />
        )}
        {mode !== "reset" && (
          <input value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && go()} aria-label="Email" placeholder="Email" type="email" autoComplete="email" style={field} />
        )}
        {mode !== "forgot" && !done && (
          <input value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && go()} aria-label={mode === "reset" ? "New password" : "Password"} placeholder={mode === "reset" ? "New password" : "Password"} type="password" autoComplete={mode === "in" ? "current-password" : "new-password"} style={field} />
        )}
        {mode === "in" && (
          <div style={{ textAlign: "right", marginTop: -4, marginBottom: 12 }}>
            <button onClick={() => { setErr(""); setInfo(""); setPassword(""); setMode("forgot"); }} style={{ background: "none", border: "none", color: c.blue, fontSize: 12.5, fontWeight: 700, cursor: "pointer", padding: 0 }}>Forgot password?</button>
          </div>
        )}
        {err && <div style={{ color: c.red, fontSize: 12.5, marginBottom: 10, lineHeight: 1.45 }}>{err}</div>}
        {info && <div style={{ color: c.green, fontSize: 12.5, marginBottom: 10, lineHeight: 1.45 }}>{info}</div>}
        <button onClick={done ? () => onRecovered && onRecovered() : go} disabled={busy} style={{ width: "100%", padding: 12, borderRadius: 11, border: "none", background: c.blue, color: "#fff", fontSize: 15, fontWeight: 700, cursor: busy ? "default" : "pointer", opacity: busy ? 0.7 : 1 }}>
          {busy ? "…" : done ? "Continue to ClimbMatch" : ACTION[mode]}
        </button>
        {mode === "forgot" ? (
          <div style={{ textAlign: "center", marginTop: 14, fontSize: 13, color: c.sub }}>
            <button onClick={() => { setErr(""); setInfo(""); setMode("in"); }} style={{ background: "none", border: "none", color: c.blue, fontWeight: 700, cursor: "pointer", fontSize: 13, padding: 0 }}>Back to sign in</button>
          </div>
        ) : mode === "reset" ? null : (
          <div style={{ textAlign: "center", marginTop: 14, fontSize: 13, color: c.sub }}>
            {mode === "in" ? "New here? " : "Already have an account? "}
            <button onClick={() => { setErr(""); setInfo(""); setMode(mode === "in" ? "up" : "in"); }} style={{ background: "none", border: "none", color: c.blue, fontWeight: 700, cursor: "pointer", fontSize: 13, padding: 0 }}>
              {mode === "in" ? "Create an account" : "Sign in"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
