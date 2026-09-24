// The one source of truth for how a discipline is SPELLED on screen.
//
// It was eleven separate lists, and the same discipline rendered three
// different ways depending on which screen you were on — "Mountaineering" in
// one chip row, "Mtn" in another, "Mtn'ing" in a third; "Bouldering" here,
// "Boulder" there. Nothing linked them, so each new list was written by hand
// and drifted on its own.
//
// This module deliberately holds ONLY labels, and deliberately imports nothing:
// lib/disciplines.jsx carries inline SVG glyphs and is pulled in by the
// lazy-loaded DbAreaBrowser chunk, so importing that into ClimbMatchCore to
// reach its label map would drag the glyphs into the startup bundle that
// #497/#508 just trimmed.
//
// What this does NOT unify is which disciplines each list OFFERS. Those
// memberships are mostly deliberate — the Ranks screen collapses sport+trad
// into one "Sport & Trad" scoring bucket, the signup list offers `aid`, the
// route filters don't. Flattening them would change behaviour, not spelling.
// Screens with a genuinely different meaning (not a shorter spelling) still
// pass their own string; see the "Sport & Trad" bucket in ClimbMatchCore.

// Canonical full labels. There is no "Rock" type (owner decision, 2026-09-24): what the
// catalog stored as `rock` was OpenBeta's top-rope-only climbs, typed `toprope` since 0199,
// as Mountain Project types them. The seed catalog still stores `rock` plus a separate
// `style` internally, but `catOf` resolves that to trad/sport before any label is read.
export const DISC_LABELS = {
  trad: "Trad", sport: "Sport", toprope: "Top rope", scrambling: "Scrambling", alpine: "Alpine",
  mountaineering: "Mountaineering", hiking: "Hiking", bouldering: "Bouldering",
  ice: "Ice", mixed: "Mixed", aid: "Aid",
};

// Abbreviations, for chip rows too narrow for the full word at 390px. Only the
// three that actually need one — anything absent falls back to the full label,
// so adding a discipline never requires touching this map.
export const DISC_SHORT = {
  mountaineering: "Mtn", bouldering: "Boulder", scrambling: "Scramble",
};

// `short` is opt-in per call site, so a screen with room keeps the full word.
export const discLabel = (key, short) => (short && DISC_SHORT[key]) || DISC_LABELS[key] || key;
