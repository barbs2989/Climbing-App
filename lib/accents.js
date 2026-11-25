// The app's accents, without the thick line down a box's left side (owner, 2026-11-25: "I don't like the
// thick line on the left side of boxes. Remove all of those and find something more unique").
// Three looks replace the stripe, each built on the app's own motifs rather than a generic bar:
//   knotHead(tone)  — a heading's mark is a KNOT: a small open ring in the rope's colour (the rope look,
//                     docs/features/app-shell-and-layout.md), drawn before the first line of the title.
//   glowCard(tone)  — a callout card is lit from its top-left corner in its tone (the sign-in glow's
//                     language, HERO_BG), with a tinted outline, so the whole card says "this one matters".
//   noteBox(tone)   — an aside (a quote, a gap note, a hint) is a soft tinted panel with rounded corners,
//                     no border: the "one surface" rule keeps a bordered box out of a card.
// Every helper takes its colour from the caller (a 6-digit hex), so this file imports nothing from core
// and can be read at module scope anywhere. `check:no-left-stripes` keeps the stripe from coming back.

/** @typedef {import("react").CSSProperties} CSS */

/** Append a 2-digit alpha to a #rrggbb colour; any other colour is returned unchanged.
 * @param {string} c @param {string} a @returns {string} */
export const tint = (c, a) => (/^#[0-9a-f]{6}$/i.test(c || "") ? c + a : c);

/** A heading's knot: style props for a block or flex-item title (the ring sits at its first line).
 * @param {string} tone @returns {CSS} */
export const knotHead = (tone) => ({
  paddingLeft: 15,
  backgroundImage: "radial-gradient(circle, transparent 0 2.1px, " + tone + " 2.5px 4px, transparent 4.4px)",
  backgroundRepeat: "no-repeat",
  backgroundSize: "9px 9px",
  backgroundPosition: "0 calc(0.6em - 4.5px)",
});

/** The same knot as its own element, for a title row that already lays out a mark beside the text.
 * @param {string} tone @param {number} [size] @returns {CSS} */
export const knotMark = (tone, size = 9) => ({
  width: size, height: size, borderRadius: "50%", border: "2px solid " + tone, boxSizing: "border-box", flexShrink: 0, display: "inline-block",
});

/** A callout card lit from its top-left corner: spread AFTER the card's own background and border.
 * @param {string} tone @param {string} base the card's own fill @returns {CSS} */
export const glowCard = (tone, base) => ({
  border: "1px solid " + tint(tone, "66"),
  background: "radial-gradient(130% 110% at 0% 0%, " + tint(tone, "3a") + ", transparent 62%), " + base,
});

/** An aside panel: a soft tint (or the surface colour) with rounded corners and no border.
 * @param {string|null|undefined} tone @param {string} surface @returns {CSS} */
export const noteBox = (tone, surface) => ({
  background: tone ? tint(tone, "16") : surface,
  borderRadius: 9,
  padding: "6px 10px",
});
