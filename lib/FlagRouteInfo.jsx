// "This looks wrong" without the right value (0307–0309): a note on one detail of a route, or on
// the whole route, that the owner reviews and resolves. Opened from the ⚑ Flag control beside a
// section (ConfChip), from a locked (high-confidence) field's pencil, and from the edit sheet.
//
// The sheet never applies a value: a flag lowers a medium field to low until it is resolved and
// never touches a high one, so it cannot be used to unlock a detail. One open flag per climber per
// detail; sending again replaces the note. Refusals come from the database with a sentence written
// for the climber (not signed in, banned from contributing, five a day).
import { useState } from "react";
import { createPortal } from "react-dom";
import { C } from "../ClimbMatchCore.jsx";
import { POP_CLOSE } from "./popupChrome.js";

const humanize = (k) => String(k || "").replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()).trim();

export default function FlagRouteSheet({ target, busy, onClose, onSubmit }) {
  const [text, setText] = useState("");
  if (!target) return null;
  const what = target.field ? (target.label || humanize(target.field)) : "this route";
  const can = text.trim().length >= 5 && !busy;
  return createPortal(<div onClick={busy ? undefined : onClose} tabIndex={-1} onKeyDown={(e) => { if (e.key === "Escape" && !busy) onClose(); }} role="dialog" aria-modal="true" aria-label={"Flag " + what} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 100001, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "72px 12px 32px", overflowY: "auto", overscrollBehavior: "contain" }}>
    <div onClick={(e) => e.stopPropagation()} style={{ background: C.surface, borderRadius: 18, width: "100%", maxWidth: 460, border: "1px solid " + C.border, overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "14px 16px", borderBottom: "1px solid " + C.border }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{"Flag " + what}</div>
        <button onClick={onClose} aria-label="Close" style={POP_CLOSE}>{"✕"}</button>
      </div>
      <div style={{ padding: 16 }}>
        <div style={{ fontSize: 12.5, color: C.textSub, lineHeight: 1.55, marginBottom: 10 }}>
          {"Something on "}<b>{target.routeName || "this route"}</b>{target.field ? " under " + what.toUpperCase() : ""}{" looks wrong and you don’t have the right value? Say what you saw. ClimbMatch will check it and fix the page, and you’ll be told when it is."}
        </div>
        <textarea aria-label="What looks wrong" value={text} onChange={(e) => setText(e.target.value.slice(0, 1000))} rows={4} placeholder="What looks wrong, and when you were there" style={{ width: "100%", boxSizing: "border-box", background: C.card, color: C.text, border: "1px solid " + C.border, borderRadius: 10, padding: "9px 11px", fontSize: 13.5, fontFamily: "inherit", resize: "vertical", lineHeight: 1.5 }} />
        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4, textAlign: "right" }}>{text.length + " / 1000"}</div>
        <button disabled={!can} onClick={() => onSubmit(text.trim())} style={{ width: "100%", marginTop: 8, padding: 11, borderRadius: 10, border: "none", background: can ? C.blueSolid : C.surface, color: can ? "#fff" : C.textMuted, fontSize: 13.5, fontWeight: 700, cursor: can ? "pointer" : "default" }}>{busy ? "Sending…" : "Send flag"}</button>
        <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.5, marginTop: 8 }}>A flag never changes the page by itself. If you know the right value, use ✎ Edit instead.</div>
      </div>
    </div>
  </div>, document.body);
}
