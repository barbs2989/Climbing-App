// One confirm for every destructive action: askConfirm({...}) -> Promise<boolean>.
//
// Reported 2026-09-30: "When clicking remove the crew, the cancel button and ok are too close
// together." That was window.confirm, whose Cancel/OK pair the BROWSER draws — on a phone, two
// small side-by-side buttons with no gap to speak of — so no style of ours could space them. Seven
// destructive actions went through it (remove/leave a crew, delete a post, cancel an event, delete
// a reply or a comment, take down a photo). They now go through this sheet instead.
//
// The layout is the fix, so keep it: the two choices are STACKED, full width, 48px tall, with a
// 14px gap — never side by side — and the destructive one is red and on top, Cancel below it where
// a thumb resting at the bottom lands. Cancel takes focus, so Enter on a keyboard does the safe
// thing; Escape and a tap on the backdrop cancel too.
//
// Self-mounting (its own React root on document.body) so any component can call it without App
// having to render a host in each of its many screen branches. Carries its own copy of the palette
// for the reason lib/popupChrome.js has no imports: core imports this module.
import { useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";

const P = { surface: "#161b22", card: "#1c2330", border: "#30363d", text: "#e6edf3", textSub: "#99a3ad", redSolid: "#d0443d", blueSolid: "#2a74de" };
// Below the toast (Z_TOAST in ClimbMatch.jsx is 1000000), above every other overlay.
const Z = 999000;

function Sheet({ title, body, confirmLabel, cancelLabel, danger, onDone }) {
  const cancelRef = useRef(null);
  useEffect(() => {
    const prev = document.activeElement;
    if (cancelRef.current) cancelRef.current.focus();
    return () => { if (prev && prev.focus) try { prev.focus(); } catch (_) {} };
  }, []);
  // Focus starts on Cancel inside the sheet, so Escape bubbles up to here.
  const onKey = e => { if (e.key === "Escape") { e.preventDefault(); onDone(false); } };
  const btn = { width: "100%", minHeight: 48, boxSizing: "border-box", padding: "12px 14px", borderRadius: 12, fontSize: 15, fontWeight: 800, cursor: "pointer" };
  return <div onClick={() => onDone(false)} onKeyDown={onKey} tabIndex={-1} role="alertdialog" aria-modal="true" aria-label={title} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.78)", zIndex: Z, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
    <div onClick={e => e.stopPropagation()} style={{ background: P.surface, color: P.text, borderRadius: 18, width: "100%", maxWidth: 380, border: "1px solid " + P.border, padding: "22px 18px 18px", boxSizing: "border-box", fontFamily: "inherit" }}>
      <div style={{ fontSize: 17, fontWeight: 800, textAlign: "center", marginBottom: body ? 8 : 20, lineHeight: 1.35 }}>{title}</div>
      {body ? <div style={{ fontSize: 13.5, color: P.textSub, textAlign: "center", lineHeight: 1.55, marginBottom: 22 }}>{body}</div> : null}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <button type="button" onClick={() => onDone(true)} style={Object.assign({}, btn, { background: danger === false ? P.blueSolid : P.redSolid, color: "#fff", border: "none" })}>{confirmLabel}</button>
        <button type="button" ref={cancelRef} onClick={() => onDone(false)} style={Object.assign({}, btn, { background: P.card, color: P.text, border: "1px solid " + P.border })}>{cancelLabel}</button>
      </div>
    </div>
  </div>;
}

let open = null;
// opts: { title, body?, confirmLabel?, cancelLabel?, danger? (default true) }. Resolves true only on
// the confirm button. A second call while one is showing cancels the first.
export function askConfirm(opts) {
  const o = typeof opts === "string" ? { title: opts } : (opts || {});
  if (typeof document === "undefined") return Promise.resolve(false);
  if (open) open(false);
  return new Promise(resolve => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    // Unmount on the next tick: this runs inside the sheet's own click handler.
    let settled = false;
    const done = v => { if (settled) return; settled = true; if (open === done) open = null; resolve(v); setTimeout(() => { root.unmount(); host.remove(); }, 0); };
    open = done;
    root.render(<Sheet title={o.title || "Are you sure?"} body={o.body} confirmLabel={o.confirmLabel || "Confirm"} cancelLabel={o.cancelLabel || "Cancel"} danger={o.danger} onDone={done} />);
  });
}
