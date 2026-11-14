// ONE STEP OF A CREW, IN ITS OWN SHEET (2026-11-14, owner: "guided, not gated"). The crew card used to
// expand into one ~3,000px scroll of every control at once; now each step (Crew, Day, Meet-up, Ready,
// Gear & rides, Itinerary, More) opens here on its own. The card keeps every closure and renders this
// from inside itself, so the step bodies are the card's own JSX, moved rather than rewritten.
//
// The shell is CrewInviteModal's bottom sheet: pinned to the bottom on a phone, radius 18 18 0 0,
// 520px wide, centred on a desktop. The element with the dialog role IS the backdrop and carries
// the close handler, which is the shape lib/dialogA11y.js (mounted once by App) relies on for Escape,
// the focus trap and the page scroll lock. Portalled to <body> because the card renders inside
// #appscroll (check:overlays). zIndex 1200 matches StartCrewSheet; ConfirmSheet (Leave crew) sits
// above it at 999000 and the toast above that (check:zindex).
import { createPortal } from "react-dom";
import { C } from "../ClimbMatchCore.jsx";
import { POP_CLOSE } from "./popupChrome.js";
import { BTN_PRIMARY, BTN_SECONDARY } from "./buttonStyles.js";
import { useWideScreen } from "./wideLayout.js";

export default function CrewStepSheet({ title, stepNo, stepOf, sub, onClose, nextLabel, onNext, stepDone, children }) {
  const wide = useWideScreen();
  /* The crew card's solid blue (its "Propose days" / "Remind or invite" buttons), not BTN_GO's green,
     which buttonStyles.js keeps for saying yes to a person or recording a climb. */
  const SOLID = { ...BTN_PRIMARY(C), background: C.blueSolid, border: "1px solid " + C.blueSolid, color: C.onSolid };
  const close = (e) => { if (e) e.stopPropagation(); onClose && onClose(); };
  return createPortal(<div onClick={close} role="dialog" aria-modal="true" aria-label={title} style={{ position: "fixed", inset: 0, zIndex: 1200, background: C.scrim, display: "flex", alignItems: wide ? "center" : "flex-end", justifyContent: "center", padding: wide ? 16 : 0, boxSizing: "border-box" }}>
    <div onClick={(e) => e.stopPropagation()} style={{ background: C.surface, color: C.text, borderRadius: wide ? 18 : "18px 18px 0 0", border: "1px solid " + C.border, width: "100%", maxWidth: 520, boxSizing: "border-box", maxHeight: wide ? "88vh" : "90vh", display: "flex", flexDirection: "column", boxShadow: "0 -10px 40px rgba(0,0,0,0.5)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px 10px", borderBottom: "1px solid " + C.borderLight, flexShrink: 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {stepNo ? <div style={{ fontSize: 11.5, fontWeight: 800, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>{"Step " + stepNo + " of " + (stepOf || 7)}</div> : null}
          <div style={{ fontSize: 17, fontWeight: 800, overflowWrap: "anywhere" }}>{title}</div>
          {sub ? <div style={{ fontSize: 12.5, color: C.textMuted, marginTop: 2, lineHeight: 1.4, overflowWrap: "anywhere" }}>{sub}</div> : null}
        </div>
        <button type="button" onClick={close} aria-label="Close" style={POP_CLOSE}>✕</button>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overscrollBehavior: "contain", padding: "14px 16px" }}>{children}</div>
      <div style={{ display: "flex", gap: 10, padding: "10px 16px calc(12px + env(safe-area-inset-bottom, 0px))", borderTop: "1px solid " + C.borderLight, flexShrink: 0 }}>
        {/* THE FOOTER NEVER REFLOWS (owner 2026-11-14: "the Done needs to be a more clear button"). Next
            used to appear only once the step was done, so Done swapped from full width to a narrow grey
            outline under the pointer -- a tap meant for Done landed on Next. Both now sit in the same
            places whenever there is a next step; the one you most likely want is the solid button:
            Done while the step is still waiting on someone, Next once it is done. */}
        <button type="button" onClick={close} style={{ ...(onNext && stepDone ? BTN_SECONDARY(C) : SOLID), flex: onNext ? "0 0 auto" : 1, minHeight: 44, minWidth: 110, fontWeight: 800 }}>✓ Done</button>
        {onNext ? <button type="button" onClick={(e) => { e.stopPropagation(); onNext(); }} style={{ ...(stepDone ? SOLID : BTN_SECONDARY(C)), flex: 1, minHeight: 44, fontWeight: 800 }}>{"Next: " + nextLabel + " ›"}</button> : null}
      </div>
    </div>
  </div>, document.body);
}
