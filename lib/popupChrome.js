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
// 2026-09-25, "make it clear to see and easy to press": 38px -> 44px (the smallest tap target
// iOS and Android both recommend), and the edge and fill roughly doubled so the control reads as a
// button at a glance on every surface rather than a faint ring. The same tokens now style EVERY
// back button in the app, not just popups' — in-page back (route page, area browser, chat,
// onboarding) included — so there is exactly one Back and one ✕ to learn.
const EDGE = "1.5px solid rgba(255,255,255,0.30)";
const FILL = "rgba(255,255,255,0.12)";
const INK = "#ffffff";

// The ✕ in a popup's header.
export const POP_CLOSE = { flexShrink: 0, boxSizing: "border-box", width: 44, height: 44, borderRadius: 22, border: EDGE, background: FILL, color: INK, fontSize: 19, fontWeight: 800, lineHeight: 1, padding: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer" };

// The same ✕ drawn over a photo, where a translucent-white fill would vanish into a bright sky.
export const POP_CLOSE_MEDIA = Object.assign({}, POP_CLOSE, { border: "1.5px solid rgba(255,255,255,0.40)", background: "rgba(0,0,0,0.6)", color: "#fff" });

// "← Back" — in a popup's header and everywhere else in the app — the same height and edge as POP_CLOSE.
export const POP_BACK = { flexShrink: 0, boxSizing: "border-box", height: 44, borderRadius: 22, border: EDGE, background: FILL, color: INK, fontSize: 16, fontWeight: 700, lineHeight: 1, padding: "0 17px 0 14px", display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", whiteSpace: "nowrap" };

// The same Back drawn over a photo (the route page's hero), for the reason POP_CLOSE_MEDIA exists.
export const POP_BACK_MEDIA = Object.assign({}, POP_BACK, { border: "1.5px solid rgba(255,255,255,0.40)", background: "rgba(0,0,0,0.6)" });

// The ✕ that REMOVES one item — a tag, a day, a photo, a saved search, a list entry — as opposed to
// closing something. Asked for 2026-09-25 right after the close/back pass: these had been drawn 21
// ways, 18px to 36px, most a bare muted glyph with no visible edge and a hit area no bigger than the
// glyph. Smaller than POP_CLOSE on purpose, since it sits inside rows and chips, but the same edge
// and fill so it reads as the same family, and 32px so a thumb can land on it.
export const POP_REMOVE = { flexShrink: 0, boxSizing: "border-box", width: 32, height: 32, borderRadius: 16, border: EDGE, background: FILL, color: INK, fontSize: 14, fontWeight: 800, lineHeight: 1, padding: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer" };

// The same remove ✕ on the corner of a photo thumbnail, where a translucent-white fill would vanish.
export const POP_REMOVE_MEDIA = Object.assign({}, POP_REMOVE, { border: "1.5px solid rgba(255,255,255,0.40)", background: "rgba(0,0,0,0.7)" });
