// "Verify your email" on the Profile tab: email a code, type it in, get the ✓ (0306).
//
// Why a code: sign-up runs with autoconfirm on, so an account's email is "confirmed" the moment it
// exists and proves nothing. The ✓ other climbers see now needs a session that came from the inbox --
// this code, or the sign-in link in the same email -- and verify_my_email() checks that server-side.
//
// Inline, not an overlay: the open/closed state lives here, so App holds no modal flag. `nudge` is a
// counter App bumps when "Verify" is tapped elsewhere (the Home checklist, the trust card); each bump
// opens the panel and scrolls it into view.
import { useEffect, useRef, useState } from "react";
import { C } from "../ClimbMatchCore.jsx";
import { sendEmailCode, confirmEmailCode } from "./auth";
import { verifyMyEmail } from "./db";
import { CAPTCHA_ON, Turnstile } from "./captcha.jsx";

// What the send call's failure means to the climber. Supabase's built-in mailer delivers only to the
// project's own team until a mail provider (SMTP) is connected, and refuses everyone else -- say that
// plainly rather than "try again", which would never work.
function sendError(error) {
  const msg = String((error && (error.code || error.message)) || "").toLowerCase();
  if ((error && error.status === 429) || msg.includes("rate_limit") || msg.includes("rate limit"))
    return "Too many codes requested. Wait a while, then try again.";
  if (msg.includes("not_authorized") || msg.includes("not authorized") || msg.includes("smtp"))
    return "We can’t email codes to this address yet — email sending is still being set up.";
  return "Couldn’t send the code — try again shortly.";
}

export default function VerifyEmailPanel({ email, nudge, onVerified }) {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [captcha, setCaptcha] = useState("");
  const [captchaRound, setCaptchaRound] = useState(0);
  const box = useRef(null);
  useEffect(() => {
    if (!nudge) return;
    setOpen(true);
    if (box.current && box.current.scrollIntoView) box.current.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [nudge]);
  if (!email) return null;

  const send = async () => {
    if (busy) return;
    if (CAPTCHA_ON && !captcha) { setErr("Complete the security check first."); return; }
    setBusy(true); setErr("");
    const { error } = await sendEmailCode(email, CAPTCHA_ON ? captcha : undefined);
    setBusy(false); setCaptcha(""); setCaptchaRound((n) => n + 1);
    if (error) { setErr(sendError(error)); return; }
    setSent(true); setCode("");
  };
  const confirm = async () => {
    const c = code.replace(/\s+/g, "");
    if (busy || !/^\d{6,10}$/.test(c)) { setErr("Enter the code from the email."); return; }
    setBusy(true); setErr("");
    const { error } = await confirmEmailCode(email, c);
    if (error) { setBusy(false); setErr("That code didn’t work. Check it, or send a new one."); return; }
    try { await verifyMyEmail(); } catch (e) { setBusy(false); setErr("Your code worked, but saving the ✓ failed — tap Verify again."); return; }
    setBusy(false); setOpen(false); setSent(false); setCode("");
    onVerified && onVerified();
  };

  const btn = { padding: "9px 14px", borderRadius: 9, border: "none", background: C.blue, color: "#fff", fontSize: 13, fontWeight: 700, cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1 };
  const link = { background: "transparent", border: "none", color: C.textSub, fontSize: 12, fontWeight: 600, cursor: "pointer", padding: "6px 0", textDecoration: "underline" };
  return (<div ref={box} style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 12, padding: 14, marginBottom: 14 }}>
    {!open ? <button onClick={() => setOpen(true)} aria-label="Verify your email" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", background: "transparent", border: "none", color: C.text, cursor: "pointer", padding: 0, textAlign: "left" }}>
      <span><span style={{ display: "block", fontSize: 14, fontWeight: 700 }}>Verify your email</span><span style={{ display: "block", fontSize: 12, color: C.textMuted, marginTop: 2 }}>Get the ✓ other climbers see — we email you a code.</span></span>
      <span style={{ color: C.textMuted, fontSize: 16 }}>›</span>
    </button> : <div>
      <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4 }}>Verify your email</div>
      {!sent ? <div>
        <div style={{ fontSize: 12.5, color: C.textSub, marginBottom: 10 }}>We’ll email a one-time code to <b>{email}</b>.</div>
        {CAPTCHA_ON && <Turnstile resetKey={"verify:" + captchaRound} onToken={(t) => { setCaptcha(t); if (t) setErr(""); }} onError={setErr} />}
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button onClick={send} disabled={busy} style={btn}>{busy ? "Sending…" : "Email me a code"}</button>
          <button onClick={() => { setOpen(false); setErr(""); }} style={link}>Not now</button>
        </div>
      </div> : <div>
        <div style={{ fontSize: 12.5, color: C.textSub, marginBottom: 10 }}>Enter the code we sent to <b>{email}</b>, or tap the link in that email on this device.</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input aria-label="Code from the email" value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") confirm(); }} inputMode="numeric" autoComplete="one-time-code" maxLength={12} placeholder="123456" style={{ width: 130, padding: "9px 10px", borderRadius: 9, border: "1px solid " + C.border, background: C.bg, color: C.text, fontSize: 16, letterSpacing: 2 }} />
          <button onClick={confirm} disabled={busy} style={btn}>{busy ? "Checking…" : "Verify"}</button>
        </div>
        <div style={{ display: "flex", gap: 14, marginTop: 6 }}>
          <button onClick={() => { setSent(false); setErr(""); }} style={link}>Send a new code</button>
          <button onClick={() => { setOpen(false); setSent(false); setErr(""); }} style={link}>Cancel</button>
        </div>
      </div>}
      {err ? <div role="alert" style={{ fontSize: 12, color: C.amber, marginTop: 8 }}>{err}</div> : null}
    </div>}
  </div>);
}
