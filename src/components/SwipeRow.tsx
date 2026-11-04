import { tx } from "../../lib/tapWords.js";
import { useRef, useState, type ReactNode, type TouchEvent } from "react";
import { C } from "../../ClimbMatchCore.jsx";
import { useWideScreen } from "../../lib/wideLayout.js";
import { BTN_SM } from "../../lib/buttonStyles.js";

export interface SwipeRowProps {
  /** Fires when the row is released past the threshold; nothing happens without it. */
  onDelete?: () => void;
  /** Corner radius of the clipped row (default 13). */
  radius?: number;
  /** The verb the reveal names: "delete" unless a caller says otherwise (Past crews clears). */
  action?: string;
  /** Swiping RIGHT fires this, when given: the opposite gesture to delete, as Mail and Gmail pair them (notifications archive this way). */
  onArchive?: () => void;
  children?: ReactNode;
}

/**
 * Swipe a row LEFT to act on it, and RIGHT to archive it when the caller passes `onArchive`. The reveal is aria-hidden: it is a picture of the gesture, not a
 * control, and a screen reader cannot swipe. The current offset lives in a ref as well as state, so
 * releasing reads it directly instead of acting from inside a state updater (which React may run
 * twice). touchcancel — the browser taking the gesture for a scroll, a call arriving — springs the row
 * back WITHOUT acting; touchAction pan-y leaves vertical scrolling to the browser and horizontal drags
 * to this. Reads core (`C`) at render time only.
 */
export default function SwipeRow({ onDelete, radius, action, onArchive, children }: SwipeRowProps) {
  const [dx, setDx] = useState(0);
  const sx = useRef(0), sy = useRef(0), act = useRef(false), cur = useRef(0);
  const put = function (v: number) { cur.current = v; setDx(v); };
  const start = function (e: TouchEvent<HTMLDivElement>) { const p = e.touches[0]; sx.current = p.clientX; sy.current = p.clientY; act.current = true; };
  const move = function (e: TouchEvent<HTMLDivElement>) {
    if (!act.current) return;
    const p = e.touches[0];
    const ddx = p.clientX - sx.current, ddy = p.clientY - sy.current;
    if (Math.abs(ddy) > Math.abs(ddx) + 6) { act.current = false; put(0); return; }
    if (ddx > 0 && onArchive) { const effR = ddx - 30; put(effR <= 0 ? 0 : Math.min(effR, 170)); return; }
    const eff = ddx + 30;
    put(eff >= 0 ? 0 : Math.max(eff, -170));
  };
  const end = function () { const go = act.current && cur.current < -140, arch = act.current && cur.current > 140; act.current = false; put(0); if (go && onDelete) onDelete(); if (arch && onArchive) onArchive(); };
  const cancel = function () { act.current = false; put(0); };
  const verb = action || "delete";
  const hot = dx < -140, hotR = dx > 140;
  /* A MOUSE CANNOT SWIPE (owner 2026-11-04, desktop audit): on the website the same two actions are
     buttons at the row's right edge, shown while the row is pointed at or holds keyboard focus
     (wideCss: .cm-swipe / .cm-swipe-acts). Real buttons with names, unlike the swipe's picture. */
  const wide = useWideScreen();
  const Verb = verb.charAt(0).toUpperCase() + verb.slice(1);
  const actBtn = { ...BTN_SM, border: "1px solid " + C.border, background: C.card, color: C.text, boxShadow: "0 4px 14px rgba(0,0,0,0.45)" };
  return (
    <div className={wide ? "cm-swipe" : undefined} style={{ position: "relative", overflow: "hidden", borderRadius: radius || 13, marginBottom: 8 }}>
      <div aria-hidden="true" style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, background: hot ? C.redSolid : C.redBg, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 18, color: hot ? C.onSolid : C.red, fontWeight: 800, fontSize: 13, opacity: dx < -6 ? 1 : 0, transition: "background .12s" }}>
        {hot ? "Release to " + verb : tx("← Swipe further to ") + verb}
      </div>
      {onArchive ? <div aria-hidden="true" style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, background: hotR ? C.blueSolid : C.blueBg, display: "flex", alignItems: "center", justifyContent: "flex-start", paddingLeft: 18, color: hotR ? C.onSolid : "#fff", fontWeight: 800, fontSize: 13, opacity: dx > 6 ? 1 : 0, transition: "background .12s" }}>
        {hotR ? "Release to archive" : tx("Swipe further to archive →")}
      </div> : null}
      <div onTouchStart={start} onTouchMove={move} onTouchEnd={end} onTouchCancel={cancel} style={{ transform: "translateX(" + dx + "px)", transition: dx ? "none" : "transform .2s ease", position: "relative", touchAction: "pan-y" }}>
        {children}
      </div>
      {wide && (onDelete || onArchive) ? <div className="cm-swipe-acts" style={{ position: "absolute", top: 0, bottom: 0, right: 44, display: "flex", alignItems: "center", gap: 6 }}>
        {onArchive ? <button onClick={function () { onArchive(); }} style={actBtn}>Archive</button> : null}
        {onDelete ? <button onClick={function () { onDelete(); }} style={{ ...actBtn, color: C.red }}>{Verb}</button> : null}
      </div> : null}
    </div>
  );
}
