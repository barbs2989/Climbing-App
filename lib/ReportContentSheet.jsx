// Report a piece of content: a message, crew-chat message, group post or event, comment, trip
// report, group, topo or list (0263's report_content). Opened from anywhere through lib/reportBus.
//
// Shaped on ReportModal (ClimbMatchCore.jsx), which reports a PERSON, and deliberately keeps its two
// rules: the reasons are a closed list the reviewer can sort by, and "Also block" is offered only
// when the report is about the reporter's own safety -- never for a child at risk or a threat to
// somebody else, where cutting contact is not what the reporter is asking for.
import { useState } from "react";
import { C, pubFirst } from "../ClimbMatchCore.jsx";
import { POP_CLOSE } from "./popupChrome.js";

export const CONTENT_REPORT_REASONS = [
  "Harassment or bullying",
  "Hate or discrimination",
  "Threats or violence",
  "Sexual or explicit content",
  "A child may be at risk",
  "Spam or scam",
  "Shares someone’s private information",
  "Dangerous or false safety information",
  "Something else",
];
// Reasons about somebody else's welfare: block is withdrawn, and an emergency note is shown.
const WELFARE = { "A child may be at risk": true, "Threats or violence": true };

export default function ReportContentSheet({ target, alreadyBlocked, onClose, onSubmit, busy }) {
  const [reason, setReason] = useState(null);
  const [detail, setDetail] = useState("");
  const [alsoBlock, setAlsoBlock] = useState(false);
  const author = target && target.author;
  const first = author ? pubFirst(author) : null;
  const welfare = !!(reason && WELFARE[reason]);
  // Read from the SAME expression that submits, so switching to a welfare reason after ticking the
  // box cannot block somebody invisibly -- ReportModal's rule.
  const blockOffered = !!author && !welfare && !alreadyBlocked;
  const willBlock = blockOffered && alsoBlock;
  const what = (target && target.label) || "this";
  return <div onClick={busy ? undefined : onClose} tabIndex={-1} onKeyDown={e => { if (e.key === "Escape" && !busy) onClose(); }} role="dialog" aria-label={"Report " + what} aria-modal="true" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 1150, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "16px 12px", overflowY: "auto", overscrollBehavior: "contain" }}>
    <div onClick={e => e.stopPropagation()} style={{ background: C.surface, borderRadius: 18, width: "100%", maxWidth: 420, border: "1px solid " + C.border, overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "14px 16px", borderBottom: "1px solid " + C.border }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{"Report " + what}</div>
          <div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.45 }}>Confidential — the person is not told who reported it. A copy of what you’re reporting is saved with the report, so it can be reviewed even if it’s deleted.</div>
        </div>
        <button onClick={onClose} aria-label="Close" style={POP_CLOSE}>✕</button>
      </div>
      <div style={{ padding: 16 }}>
        <div style={{ fontSize: 12, color: C.textMuted, fontWeight: 700, marginBottom: 8 }}>WHAT’S WRONG WITH IT?</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 13 }}>{CONTENT_REPORT_REASONS.map(r => <button key={r} onClick={() => setReason(r)} aria-current={reason === r ? "true" : undefined} style={{ textAlign: "left", padding: "10px 12px", borderRadius: 10, border: "1px solid " + (reason === r ? C.red : C.border), background: reason === r ? C.redBg : C.card, color: reason === r ? C.red : C.text, fontSize: 13.5, cursor: "pointer", fontWeight: reason === r ? "700" : "400" }}>{r}</button>)}</div>
        {welfare ? <div style={{ background: C.redBg, border: "1px solid " + C.red, borderRadius: 10, padding: "10px 12px", marginBottom: 12, fontSize: 12.5, color: C.text, lineHeight: 1.5 }}>{reason === "A child may be at risk" ? "If a child is in immediate danger, call 911 (or your local emergency number) first. You can also report child exploitation to the NCMEC CyberTipline at report.cybertip.org. A report here does not reach emergency responders." : "If anyone is in immediate danger, contact local emergency services first. A report here does not reach emergency responders."}</div> : null}
        <div style={{ fontSize: 12, color: C.textMuted, fontWeight: 700, marginBottom: 6 }}>ANYTHING ELSE? (optional)</div>
        <textarea aria-label="Anything else the reviewer should know?" value={detail} onChange={e => setDetail(e.target.value)} placeholder="Context that helps — what happened before, or why it’s a problem." rows={3} maxLength={2000} style={{ width: "100%", padding: "9px 11px", borderRadius: 9, border: "1px solid " + C.border, background: C.card, color: C.text, fontSize: 13, boxSizing: "border-box", resize: "vertical", minHeight: 70, outline: "none", fontFamily: "inherit", lineHeight: 1.5 }} />
        {!author ? null : alreadyBlocked ? <div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.5, marginTop: 11 }}>You’ve already blocked {first}.</div> : welfare ? <div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.5, marginTop: 11 }}>Blocking isn’t offered for this reason. You can still block {first} from their profile.</div> : <button role="checkbox" aria-checked={alsoBlock} aria-label={"Also block " + first} onClick={() => setAlsoBlock(v => !v)} style={{ marginTop: 11, width: "100%", display: "flex", alignItems: "flex-start", gap: 10, textAlign: "left", padding: "11px 12px", borderRadius: 11, border: "1px solid " + (alsoBlock ? C.red : C.border), background: alsoBlock ? C.redBg : C.card, cursor: "pointer", boxSizing: "border-box", fontFamily: "inherit" }}><span aria-hidden="true" style={{ flexShrink: 0, width: 18, height: 18, marginTop: 1, borderRadius: 5, border: "1px solid " + (alsoBlock ? C.red : C.border), background: alsoBlock ? C.redSolid : "transparent", color: "#fff", fontSize: 12, lineHeight: "16px", textAlign: "center", fontWeight: 700 }}>{alsoBlock ? "✓" : ""}</span><span style={{ minWidth: 0 }}><span style={{ display: "block", fontSize: 13.5, fontWeight: 700, color: alsoBlock ? C.red : C.text }}>Also block {first}</span><span style={{ display: "block", fontSize: 12, color: C.textMuted, marginTop: 2, lineHeight: 1.45 }}>They won’t be able to message you, see your profile or send you friend requests. You can undo this in Settings.</span></span></button>}
      </div>
      <div style={{ padding: "12px 16px", borderTop: "1px solid " + C.border }}><button disabled={!reason || busy} onClick={() => onSubmit(reason, detail, willBlock)} style={{ width: "100%", padding: 12, background: reason && !busy ? C.redSolid : C.border, color: reason && !busy ? "#fff" : C.textMuted, border: "1px solid rgba(0,0,0,0.22)", boxSizing: "border-box", borderRadius: 11, fontSize: 15, cursor: reason && !busy ? "pointer" : "default", fontWeight: 700 }}>{busy ? "Sending…" : willBlock ? "Report and block" : "Send report"}</button></div>
    </div>
  </div>;
}
