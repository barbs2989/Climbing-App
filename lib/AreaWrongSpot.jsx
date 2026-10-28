// "Wrong place?" for an AREA (owner, 2026-10-25): a climber says where an area belongs.
//
// Nothing on the page changes. `onSubmit(note, suggested)` files one contributions row of kind
// 'area_placement' (lib/db.js submitAreaPlacementClaim); the owner reads it in the proposals queue,
// moves the area by hand and resolves the claim. The sheet claims "sent" only after that write
// resolves, and a signed-out climber gets a sign-in button, not a send (check:claims).
import { useState } from "react";
import { createPortal } from "react-dom";
import { POP_CLOSE } from "./popupChrome.js";
import { BTN, INPUT } from "./buttonStyles.js";

const MIN = 10, MAX = 400, MAX_PLACE = 120;

export default function AreaWrongSpot({ area, C, onClose, onSubmit, onSignIn }) {
  const [note, setNote] = useState("");
  const [place, setPlace] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState(null);
  const [needSignIn, setNeedSignIn] = useState(false);
  const name = (area && area.name) || "this area";
  const n = note.trim().length;
  const canSend = !!area && n >= MIN && n <= MAX && !busy;
  const lbl = { fontSize: 11, fontWeight: 700, color: C.textMuted, letterSpacing: 0.3, textTransform: "uppercase", marginBottom: 4 };

  const send = async () => {
    if (!canSend || !onSubmit) return;
    setBusy(true); setErr(null); setNeedSignIn(false);
    try {
      const ok = await onSubmit(note.trim(), place.trim() || null);
      if (ok) setSent(true);
    } catch (e) {
      if (e && e.code === "signed-out") setNeedSignIn(true);
      else setErr((e && e.message) || "Could not send that — check your connection and retry.");
    }
    setBusy(false);
  };

  return createPortal(<div role="dialog" aria-modal="true" aria-label={"Wrong place? " + name} style={{ position: "fixed", inset: 0, background: C.scrimStrong, zIndex: 100000, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "72px 12px 32px", overflowY: "auto", overscrollBehavior: "contain" }}>
    <div style={{ background: C.surface, borderRadius: 18, width: "100%", maxWidth: 460, border: "1px solid " + C.border, maxHeight: "92vh", display: "flex", flexDirection: "column", overflowY: "auto", overscrollBehavior: "contain" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderBottom: "1px solid " + C.border, flexShrink: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{sent ? "Thanks — sent" : "Wrong place?"}</div>
        <button onClick={onClose} aria-label="Close" style={POP_CLOSE}>{"✕"}</button>
      </div>
      {sent ? <div style={{ padding: 16 }}>
        <div style={{ textAlign: "center", fontWeight: 700, fontSize: 15, color: C.text, marginBottom: 12 }}>{"Sent to the owner for review"}</div>
        <div style={{ fontSize: 12.5, color: C.textSub, lineHeight: 1.55, marginBottom: 12 }}>{"Nothing on the page has changed. The owner checks each claim and moves the area if it is in the wrong place."}</div>
        <button onClick={onClose} style={{ ...BTN, width: "100%", background: C.blueSolid, color: C.onSolid, border: "none" }}>Done</button>
      </div> : <div style={{ padding: 16 }}>
        <div style={{ fontSize: 12.5, color: C.textSub, lineHeight: 1.55, background: C.card, border: "1px solid " + C.border, borderRadius: 12, padding: "10px 12px", marginBottom: 12 }}>
          {"Tell us where "}<b>{name}</b>{" belongs. Nothing on the page changes: the owner checks every claim and moves the area."}
        </div>
        <div style={{ marginBottom: 14 }}>
          <div style={lbl}>Where should it be?</div>
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} maxLength={MAX} aria-label="Where should this area be?" placeholder="e.g. These walls are in the Quincy Basin, not under Bellingham." style={{ ...INPUT(C), resize: "vertical", minHeight: 76 }} />
          <div style={{ fontSize: 11, color: n > MAX ? C.red : C.textMuted, marginTop: 4 }}>{n < MIN ? "At least " + MIN + " characters." : n + " of " + MAX}</div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <div style={lbl}>Which place is it in? (optional)</div>
          <input value={place} onChange={e => setPlace(e.target.value)} maxLength={MAX_PLACE} aria-label="Which place is it in, optional" placeholder="The town, range or park it sits in" style={INPUT(C)} />
        </div>
        {needSignIn ? <div style={{ background: C.amberBg, border: "1px solid " + C.amber + "55", borderRadius: 11, padding: "10px 12px", fontSize: 12.5, color: C.text, lineHeight: 1.5, marginBottom: 12 }}>
          {"Sign in to send this. Nothing was sent."}
          {onSignIn ? <button onClick={onSignIn} style={{ ...BTN, width: "100%", marginTop: 8, background: C.blueSolid, color: C.onSolid, border: "none" }}>Sign in</button> : null}
        </div> : null}
        {err ? <div role="alert" style={{ fontSize: 12.5, color: C.red, lineHeight: 1.45, marginBottom: 10 }}>{err}</div> : null}
        <button onClick={send} disabled={!canSend} style={{ ...BTN, width: "100%", background: canSend ? C.blueSolid : C.card, color: canSend ? C.onSolid : C.textMuted, border: "1px solid " + (canSend ? C.blueSolid : C.border), cursor: canSend ? "pointer" : "default" }}>{busy ? "Sending…" : "Send to the owner"}</button>
      </div>}
    </div>
  </div>, document.body);
}
