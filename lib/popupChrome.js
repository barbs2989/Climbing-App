// One look for every popup's way out.
//
// The app's ~65 overlays each drew their own close and back buttons, and it showed: a bare
// muted "×" at 22px with no visible hit area in one sheet, a 36px square "✕" in the next, a
// 32px circle, a 34px square, a bordered card at 16px; and back buttons that were a blue text
// link with zero padding in one place and a bordered pill at 13, 15, 16 or 17px elsewhere,
// spelled "← Back" or "‹ Back". Reported as "sloppy" and "not consistent with popups".
//
// These tokens are that one look. Close and Back share a HEIGHT, border and fill, so a header
// holding either (or both) lines up the same way in every popup. The fill is translucent white
// rather than a palette colour so the control lifts off whichever surface the popup uses
// (C.bg, C.surface or C.card) by the same amount.
//
// Plain style objects, not components, on purpose: each popup keeps its own <button> with its
// own aria-label and its visible "✕" / "← Back" label, which is what check:dialog-dismiss,
// check:a11y-names and check:control-names read. A wrapper component would hide the label from
// all three. No imports, so AuthModal and GpsSubmissionModal — which carry their own palettes
// and do not import core — can use them too.
const EDGE = "1px solid rgba(255,255,255,0.16)";
const FILL = "rgba(255,255,255,0.07)";
const INK = "#e6edf3"; // C.text

// The ✕ in a popup's header.
export const POP_CLOSE = { flexShrink: 0, boxSizing: "border-box", width: 38, height: 38, borderRadius: 19, border: EDGE, background: FILL, color: INK, fontSize: 17, fontWeight: 700, lineHeight: 1, padding: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer" };

// The same ✕ drawn over a photo, where a translucent-white fill would vanish into a bright sky.
export const POP_CLOSE_MEDIA = Object.assign({}, POP_CLOSE, { border: "1px solid rgba(255,255,255,0.35)", background: "rgba(0,0,0,0.6)", color: "#fff" });

// "← Back" in a popup's header — the same height and edge as POP_CLOSE.
export const POP_BACK = { flexShrink: 0, boxSizing: "border-box", height: 38, borderRadius: 19, border: EDGE, background: FILL, color: INK, fontSize: 15, fontWeight: 700, lineHeight: 1, padding: "0 15px 0 12px", display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", whiteSpace: "nowrap" };
