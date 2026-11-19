// "Order wrong?" for a WALL's climb list (owner, 2026-11-19: "we should offer a button to recommend a change in
// the order left to right or right to left of climbs on walls").
//
// The climber puts the wall's climbs in the order they sit on the rock, left to right: move one a place at a
// time, type the place it belongs in, or turn the whole list round when the wall is listed backwards. Nothing
// on the page changes. `onSubmit(order, note)` files one contributions row of kind 'wall_order' (lib/db.js
// submitWallOrderSuggestion); the owner reads it in the review queue and using it writes routes.sort_order
// (0477). The sheet claims "sent" only after that write resolves, and a signed-out climber gets a sign-in
// button, not a send (check:claims).
import { useState } from "react";
import { createPortal } from "react-dom";
import { POP_CLOSE } from "../../lib/popupChrome.js";
import { BTN, INPUT } from "../../lib/buttonStyles.js";
import { rowGrade } from "../../lib/areaBrowserShared.js";
import type { CSSProperties } from "react";
import type { C as Palette } from "../../ClimbMatchCore.jsx";
import type { RouteRowRoute } from "./RouteRow.tsx";

const MAX_NOTE = 400;

/** A climb of the wall, as the area page's list holds it. */
export interface WallOrderRoute extends RouteRowRoute { id: string | number; name: string }
export interface WallOrderSuggestProps {
  area: { id: string | number; name?: string | null };
  /** The wall's roped climbs in the order the page lists them now, left to right; unplaced climbs last. */
  routes: WallOrderRoute[];
  /** Whether the wall has a stored order at all: without one the sheet asks for the order, not a correction. */
  hasOrder: boolean;
  C: typeof Palette;
  onClose: () => void;
  /** Files the suggestion; resolves true once it is stored. Rejects with `code: "signed-out"` for a guest. */
  onSubmit: (order: string[], note: string | null) => Promise<boolean | null>;
  onSignIn?: () => void;
}

/** The sheet a wall's climb list opens to suggest its left-to-right order. Rendered by AreaPage. */
export default function WallOrderSuggest({ area, routes, hasOrder, C, onClose, onSubmit, onSignIn }: WallOrderSuggestProps) {
  const start = routes.map(r => String(r.id));
  const [order, setOrder] = useState<string[]>(start);
  // The place being typed for one climb, until Enter or leaving the box moves it there.
  const [typing, setTyping] = useState<{ id: string; text: string } | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [needSignIn, setNeedSignIn] = useState(false);
  const name = (area && area.name) || "this wall";
  const byId = new Map(routes.map(r => [String(r.id), r]));
  const changed = order.some((id, i) => id !== start[i]);
  const canSend = changed && note.length <= MAX_NOTE && !busy;
  const lbl: CSSProperties = { fontSize: 11, fontWeight: 700, color: C.label, letterSpacing: 0.3, textTransform: "uppercase", marginBottom: 4 };
  const stepBtn = (on: boolean): CSSProperties => ({ flexShrink: 0, boxSizing: "border-box", width: 44, height: 44, borderRadius: 10, border: "1px solid " + C.border, background: C.surface, color: on ? C.text : C.textMuted, fontSize: 17, fontWeight: 800, lineHeight: 1, padding: 0, cursor: on ? "pointer" : "default", opacity: on ? 1 : 0.45 });

  const moveTo = (id: string, to: number) => setOrder(o => {
    const from = o.indexOf(id);
    const at = Math.max(0, Math.min(o.length - 1, to));
    if (from < 0 || from === at) return o;
    const next = o.slice();
    next.splice(from, 1);
    next.splice(at, 0, id);
    return next;
  });
  const commitTyping = () => {
    if (!typing) return;
    const n = parseInt(typing.text, 10);
    if (isFinite(n)) moveTo(typing.id, n - 1);
    setTyping(null);
  };

  const send = async () => {
    if (!canSend) return;
    setBusy(true); setErr(null); setNeedSignIn(false);
    try {
      const ok = await onSubmit(order, note.trim() || null);
      if (ok) setSent(true);
      else setErr("Could not send that — check your connection and retry.");
    } catch (e) {
      const x = e as { code?: string; message?: string } | null;
      if (x && x.code === "signed-out") setNeedSignIn(true);
      else setErr((x && x.message) || "Could not send that — check your connection and retry.");
    }
    setBusy(false);
  };

  return createPortal(<div role="dialog" aria-modal="true" aria-label={"Order of the climbs on " + name} style={{ position: "fixed", inset: 0, background: C.scrimStrong, zIndex: 100000, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "72px 12px 32px", overflowY: "auto", overscrollBehavior: "contain" }}>
    <div style={{ background: C.surface, borderRadius: 18, width: "100%", maxWidth: 460, border: "1px solid " + C.border, maxHeight: "92vh", display: "flex", flexDirection: "column", overflowY: "auto", overscrollBehavior: "contain" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: "1px solid " + C.border, flexShrink: 0, position: "sticky", top: 0, background: C.surface, zIndex: 1 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{sent ? "Thanks — sent" : hasOrder ? "Suggest a different order" : "Add the wall order"}</div>
        <button onClick={onClose} aria-label="Close" style={POP_CLOSE}>{"✕"}</button>
      </div>
      {sent ? <div style={{ padding: 16 }}>
        <div style={{ textAlign: "center", fontWeight: 700, fontSize: 15, color: C.text, marginBottom: 12 }}>{"Sent to the owner for review"}</div>
        <div style={{ fontSize: 12.5, color: C.textSub, lineHeight: 1.55, marginBottom: 12 }}>{"Nothing on the page has changed. The owner checks each suggested order, and the list is reordered if it is right."}</div>
        <button onClick={onClose} style={{ ...BTN, width: "100%", background: C.blueSolid, color: C.onSolid, border: "none" }}>Done</button>
      </div> : <div style={{ padding: 16 }}>
        <div style={{ fontSize: 12.5, color: C.textSub, lineHeight: 1.55, background: C.card, border: "1px solid " + C.border, borderRadius: 12, padding: "10px 12px", marginBottom: 12 }}>
          {"Put the climbs on "}<b>{name}</b>{" in the order they sit on the wall as you face it: 1 is the climb furthest left. Nothing on the page changes until the owner has checked it."}
        </div>
        <button onClick={() => { setTyping(null); setOrder(o => o.slice().reverse()); }} style={{ ...BTN, width: "100%", minHeight: 44, background: C.surface, color: C.text, border: "1px solid " + C.border, marginBottom: 12 }}>{"Listed backwards? Reverse the whole order"}</button>
        <div style={lbl}>Left to right</div>
        <ol style={{ listStyle: "none", margin: "0 0 14px", padding: 0 }}>{order.map((id, i) => {
          const r = byId.get(id);
          if (!r) return null;
          const grade = rowGrade(r);
          const first = i === 0, last = i === order.length - 1;
          const moved = start[i] !== id;
          return <li key={id} style={{ display: "flex", alignItems: "center", gap: 7, padding: "5px 0", borderTop: i ? "1px solid " + C.border : "none" }}>
            <input inputMode="numeric" value={typing && typing.id === id ? typing.text : String(i + 1)} onFocus={e => { setTyping({ id, text: String(i + 1) }); e.target.select(); }} onChange={e => setTyping({ id, text: e.target.value.replace(/[^0-9]/g, "").slice(0, 4) })} onBlur={commitTyping} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); commitTyping(); } }} aria-label={"Place of " + r.name + ", counted from the left, of " + order.length} style={{ ...INPUT(C), width: 50, flexShrink: 0, height: 44, padding: "0 4px", textAlign: "center", fontWeight: 700, borderColor: moved ? C.blue : C.border }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: C.text, overflowWrap: "anywhere" }}>{r.name}</div>
              {grade && grade !== "—" ? <div style={{ fontSize: 11, color: C.textMuted }}>{grade}</div> : null}
            </div>
            <button onClick={() => moveTo(id, i - 1)} disabled={first} aria-label={"Move " + r.name + " one place left"} style={stepBtn(!first)}>{"↑"}</button>
            <button onClick={() => moveTo(id, i + 1)} disabled={last} aria-label={"Move " + r.name + " one place right"} style={stepBtn(!last)}>{"↓"}</button>
          </li>;
        })}</ol>
        <div style={{ marginBottom: 14 }}>
          <div style={lbl}>Anything we should know? (optional)</div>
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} maxLength={MAX_NOTE} aria-label="A note about this order, optional" placeholder="e.g. The two routes right of the arete were swapped." style={{ ...INPUT(C), resize: "vertical", minHeight: 60 }} />
        </div>
        {needSignIn ? <div style={{ background: C.amberBg, border: "1px solid " + C.amber + "55", borderRadius: 11, padding: "10px 12px", fontSize: 12.5, color: C.text, lineHeight: 1.5, marginBottom: 12 }}>
          {"Sign in to send this. Nothing was sent."}
          {onSignIn ? <button onClick={onSignIn} style={{ ...BTN, width: "100%", marginTop: 8, background: C.blueSolid, color: C.onSolid, border: "none" }}>Sign in</button> : null}
        </div> : null}
        {err ? <div role="alert" style={{ fontSize: 12.5, color: C.red, lineHeight: 1.45, marginBottom: 10 }}>{err}</div> : null}
        {!changed ? <div style={{ fontSize: 11.5, color: C.textMuted, lineHeight: 1.45, marginBottom: 8 }}>{"Move a climb to send a new order."}</div> : null}
        <button onClick={send} disabled={!canSend} style={{ ...BTN, width: "100%", background: canSend ? C.blueSolid : C.card, color: canSend ? C.onSolid : C.textMuted, border: "1px solid " + (canSend ? C.blueSolid : C.border), cursor: canSend ? "pointer" : "default" }}>{busy ? "Sending…" : "Send to the owner"}</button>
      </div>}
    </div>
  </div>, document.body);
}
