// One shape per kind of button on the route page and the area browser.
//
// A census (2026-10-01) found ~150 buttons across RouteDetail and DbAreaBrowser and no shared
// style beyond popupChrome's ✕ / Back: 19 solid-blue buttons in 8 paddings, 6 radii and 7 font
// sizes; 63 outlined ones spread just as wide; toggle chips at radius 14, 15, 16 and 20. Buttons
// sitting in ONE row disagreed — the four "Log an ascent" buttons on Overview were four sizes.
//
// The SHAPE is shared and the colour is not: amber "Saved", green "Logged" and blue "Find partners"
// carry meaning, so each site keeps its own background/colour/border and spreads one geometry:
//   BTN      — a boxed action (full-width or inline)
//   BTN_LG   — a big full-width tap target on a landing screen
//   BTN_SM   — a compact boxed action inside a row or a card header
//   BTN_LINK — an inline text action (no box; blue)
//   CHIP     — a toggle / filter chip; KEEP aria-pressed on the button (check:selected-state)
// BTN_PRIMARY / BTN_SECONDARY / btnChip are BTN / CHIP with the two everyday colourings filled in.
//
// Plain style objects, not a <Button> component, for popupChrome's reason: each call site keeps
// its own <button>, label and aria-label, which check:control-names, check:a11y-names and
// check:dialog-dismiss read from source. Override layout (width, margin, flex), never geometry.
//
// Colourings are functions of the palette because DbAreaBrowser is handed `C` as a prop and does
// not import core.
export const BTN = { boxSizing: "border-box", padding: "9px 14px", borderRadius: 10, fontSize: 13, fontWeight: 700, lineHeight: 1.25, cursor: "pointer" };
// The area browser's landing stack (Route finder, View map, My objectives, All areas, Add a climb):
// a screen of big full-width tap targets, which used four paddings and three font sizes between them.
export const BTN_LG = { boxSizing: "border-box", padding: "13px 10px", borderRadius: 11, fontSize: 14.5, fontWeight: 800, lineHeight: 1.25, cursor: "pointer" };
export const BTN_SM ={ boxSizing: "border-box", padding: "6px 11px", borderRadius: 8, fontSize: 12, fontWeight: 700, lineHeight: 1.25, cursor: "pointer" };
export const CHIP = { boxSizing: "border-box", padding: "7px 12px", borderRadius: 16, fontSize: 12.5, fontWeight: 700, lineHeight: 1.25, cursor: "pointer", whiteSpace: "nowrap" };

export const BTN_PRIMARY = C => ({ ...BTN, border: "1px solid " + C.blueSolid, background: C.blueSolid, color: "#fff" });
export const BTN_SECONDARY = C => ({ ...BTN, border: "1px solid " + C.border, background: C.surface, color: C.blue });
export const BTN_LINK = C => ({ padding: "4px 0", border: "none", background: "none", color: C.blue, fontSize: 12.5, fontWeight: 700, cursor: "pointer" });
export const btnChip = (C, on) => ({ ...CHIP, border: "1px solid " + (on ? C.blueDim : C.border), background: on ? C.blueBg : C.surface, color: on ? C.blue : C.textSub });
