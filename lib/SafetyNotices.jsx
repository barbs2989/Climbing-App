// What a climber is TOLD when ClimbMatch Safety acts on them (0264), and how they answer back.
//
//   AccountStandingNotice -- shown on every tab while their account is suspended (or, for the hour a
//                            banned climber's last access token survives, banned): what happened,
//                            until when, and an Appeal button. The database already refuses their
//                            writes; this is the "statement of reasons" so the refusals make sense.
//   AppealSheet           -- one appeal form for an account or a piece of their content.
//
// The reason shown is the one the reviewer typed into set_account_standing(); the climber can read
// only their own row (RLS), so nothing here can show anybody else's standing.
import { useState } from "react";
import { C, DLOCALE } from "../ClimbMatchCore.jsx";
import { POP_CLOSE } from "./popupChrome.js";

export function AccountStandingNotice({ standing, onAppeal }) {
  if (!standing) return null;
  const banned = standing.status === "banned";
  let untilTxt = "";
  if (!banned && standing.until) {
    try { untilTxt = new Date(standing.until).toLocaleDateString(DLOCALE, { month: "short", day: "numeric", year: "numeric" }); } catch (_e) { untilTxt = String(standing.until).slice(0, 10); }
  }
  return <div role="status" style={{ margin: "0 0 12px", padding: "12px 14px", borderRadius: 12, border: "1px solid " + C.red, background: C.redBg, color: C.text }}>
    <div style={{ fontSize: 14, fontWeight: 800, color: C.red }}>{banned ? "Your account has been banned by ClimbMatch Safety" : "Your account is suspended" + (untilTxt ? " until " + untilTxt : "")}</div>
    <div style={{ fontSize: 12.5, color: C.textSub, marginTop: 4, lineHeight: 1.5 }}>
      {"Reason: " + (standing.reason || "breaking the Community Guidelines") + ". "}
      {banned ? "You can’t post, message or sign in again." : "Until then you can read, but you can’t post, message, comment, send friend requests or edit your profile."}
    </div>
    <button onClick={onAppeal} style={{ marginTop: 9, padding: "8px 13px", borderRadius: 9, border: "1px solid " + C.red, background: "transparent", color: C.red, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Appeal this decision</button>
  </div>;
}

export function AppealSheet({ target, busy, onClose, onSubmit }) {
  const [text, setText] = useState("");
  const isAccount = target && target.kind === "account";
  const what = isAccount ? "your account’s suspension" : (target && target.label) || "this removal";
  return <div onClick={busy ? undefined : onClose} tabIndex={-1} onKeyDown={e => { if (e.key === "Escape" && !busy) onClose(); }} role="dialog" aria-label={"Appeal " + what} aria-modal="true" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 1150, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "16px 12px", overflowY: "auto", overscrollBehavior: "contain" }}>
    <div onClick={e => e.stopPropagation()} style={{ background: C.surface, borderRadius: 18, width: "100%", maxWidth: 420, border: "1px solid " + C.border, overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "14px 16px", borderBottom: "1px solid " + C.border }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{"Appeal " + what}</div>
          <div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.45 }}>A person at ClimbMatch Safety reads every appeal and decides whether to reverse it.</div>
        </div>
        <button onClick={onClose} aria-label="Close" style={POP_CLOSE}>✕</button>
      </div>
      <div style={{ padding: 16 }}>
        <div style={{ fontSize: 12, color: C.textMuted, fontWeight: 700, marginBottom: 6 }}>WHY SHOULD WE LOOK AGAIN?</div>
        <textarea aria-label="Why should ClimbMatch Safety look again?" value={text} onChange={e => setText(e.target.value)} maxLength={2000} rows={5} placeholder="What we got wrong, or context we didn’t have." style={{ width: "100%", padding: "9px 11px", borderRadius: 9, border: "1px solid " + C.border, background: C.card, color: C.text, fontSize: 13, boxSizing: "border-box", resize: "vertical", minHeight: 100, outline: "none", fontFamily: "inherit", lineHeight: 1.5 }} />
      </div>
      <div style={{ padding: "12px 16px", borderTop: "1px solid " + C.border }}><button disabled={!text.trim() || busy} onClick={() => onSubmit(text.trim())} style={{ width: "100%", padding: 12, background: text.trim() && !busy ? C.blueSolid : C.border, color: text.trim() && !busy ? "#fff" : C.textMuted, border: "none", borderRadius: 11, fontSize: 15, cursor: text.trim() && !busy ? "pointer" : "default", fontWeight: 700 }}>{busy ? "Sending…" : "Send appeal"}</button></div>
    </div>
  </div>;
}
