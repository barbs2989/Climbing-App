import { useRef } from "react";
import { C } from "../ClimbMatchCore.jsx";

/* A TWO-HANDLE RANGE: drag the low end and the high end, so a climber who is happy from cool to warm can
   say so in one control (four exclusive chips could not).

   Values are CANONICAL (deg F, mph) -- the unit the score and the store speak -- and `snap` rounds a raw
   value to one the climber can SEE: in metric a step is a whole degree C, not a whole degree F, so the label
   under the thumb is always the number the score uses. `fmt` draws a value in the climber's units.

   Each handle is a real slider (role="slider", focusable, arrow keys, Home/End, PageUp/PageDown) with its
   own name, so a screen reader hears "Ideal temperature, lowest 45°". Pointer events with capture, and
   touch-action:none on the handles, so dragging on a phone moves the handle and does not scroll the page. */
const THUMB = 28;
export function RangeSlider({ label, min, max, minGap, value, onChange, fmt, snap, step }) {
  const box = useRef(null);
  const [lo, hi] = value;
  const clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  const pos = function (v) { return ((v - min) / (max - min)) * 100; };
  const move = function (which, raw) {
    const v = snap(clamp(raw, min, max));
    if (which === "lo") { const n = Math.min(v, hi - minGap); if (n !== lo) onChange([clamp(n, min, hi - minGap), hi]); }
    else { const n = Math.max(v, lo + minGap); if (n !== hi) onChange([lo, clamp(n, lo + minGap, max)]); }
  };
  const fromPointer = function (e) {
    const r = box.current && box.current.getBoundingClientRect();
    if (!r || !r.width) return null;
    return min + clamp((e.clientX - r.left) / r.width, 0, 1) * (max - min);
  };
  const thumb = function (which, v, name) {
    const key = function (e) {
      const dir = e.key === "ArrowRight" || e.key === "ArrowUp" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowDown" ? -1 : 0;
      if (dir) { e.preventDefault(); move(which, v + dir * step * (e.shiftKey ? 5 : 1)); return; }
      if (e.key === "PageUp" || e.key === "PageDown") { e.preventDefault(); move(which, v + (e.key === "PageUp" ? 1 : -1) * step * 5); return; }
      if (e.key === "Home") { e.preventDefault(); move(which, which === "lo" ? min : lo + minGap); return; }
      if (e.key === "End") { e.preventDefault(); move(which, which === "lo" ? hi - minGap : max); }
    };
    return <div key={which} role="slider" tabIndex={0} aria-label={label + ", " + name} aria-orientation="horizontal"
      aria-valuemin={which === "lo" ? min : lo + minGap} aria-valuemax={which === "lo" ? hi - minGap : max} aria-valuenow={v} aria-valuetext={fmt(v)}
      onKeyDown={key}
      onPointerDown={function (e) { try { e.currentTarget.setPointerCapture(e.pointerId); } catch (x) { /* no capture: the move events still arrive over the thumb */ } e.preventDefault(); e.currentTarget.focus(); }}
      onPointerMove={function (e) { let cap = false; try { cap = e.currentTarget.hasPointerCapture(e.pointerId); } catch (x) { cap = false; } if (!cap) return; const raw = fromPointer(e); if (raw != null) move(which, raw); }}
      style={{ position: "absolute", top: 0, left: "calc(" + pos(v) + "% - " + THUMB / 2 + "px)", width: THUMB, height: THUMB, borderRadius: "50%", background: C.green, border: "3px solid " + C.surface, boxShadow: "0 0 0 1px " + C.green + ", 0 1px 4px rgba(0,0,0,0.4)", cursor: "grab", touchAction: "none", outlineOffset: 3, zIndex: which === "lo" ? 2 : 3 }} />;
  };
  return <div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
      <span style={{ fontSize: 15, fontWeight: 800, color: C.green }}>{fmt(lo)} <span style={{ color: C.textMuted, fontWeight: 600 }}>to</span> {fmt(hi)}</span>
    </div>
    <div style={{ padding: "0 " + THUMB / 2 + "px" }}>
      <div ref={box} style={{ position: "relative", height: THUMB, touchAction: "none" }}
        onPointerDown={function (e) { if (e.target !== e.currentTarget) return; const raw = fromPointer(e); if (raw == null) return; move(Math.abs(raw - lo) <= Math.abs(raw - hi) ? "lo" : "hi", raw); }}>
        <div aria-hidden="true" style={{ position: "absolute", left: 0, right: 0, top: THUMB / 2 - 3, height: 6, borderRadius: 3, background: C.border, pointerEvents: "none" }} />
        <div aria-hidden="true" style={{ position: "absolute", left: pos(lo) + "%", width: (pos(hi) - pos(lo)) + "%", top: THUMB / 2 - 3, height: 6, borderRadius: 3, background: C.green, pointerEvents: "none" }} />
        {thumb("lo", lo, "lowest")}
        {thumb("hi", hi, "highest")}
      </div>
    </div>
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.textMuted, marginTop: 4 }}><span>{fmt(min)}</span><span>{fmt(max)}</span></div>
  </div>;
}
