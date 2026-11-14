// ONE LOOK FOR A CARD: the crew card's (owner 2026-11-14, after the Partners consolidation: "the boxes look
// different than they do on crew cards, I would like to make it consistent").
//
// The Partners tab drew its boxes seven ways — radius 12 or 16, padding from 8px to 16px, a shadow on some,
// a 2px border on one and a 4px blue left bar on another — while the crew card, the app's most-used card,
// already had a settled look. This file IS that look, and the crew card reads it too, so the two cannot
// drift apart again.
//   CARD(C, edge?) — the box: card fill, radius 16, padding 14, a 1px edge (a state colour when the card
//                    has a state: green ready / amber waiting on the crew card), the crew card's shadow
//   EYEBROW(color) — the small UPPERCASE label over a card's bold title ("CREW OBJECTIVE", "YOUR LISTING")
//
// Plain style objects, for buttonStyles.js's reason: each call site keeps its own element, role and label,
// which the a11y and control-name guards read from source. Spread CARD first and override only layout
// (margin, display, gap, cursor), never its geometry.

/**
 * @param {{ card: string, border: string }} C the palette
 * @param {string} [edge] the edge colour when the card has a state; the plain border otherwise
 * @returns {import("react").CSSProperties}
 */
export const CARD = (C, edge) => ({ boxSizing: "border-box", background: C.card, borderRadius: 16, padding: 14, border: "1px solid " + (edge || C.border), boxShadow: "0 1px 3px rgba(0,0,0,0.25)" });

/**
 * @param {string} color
 * @returns {import("react").CSSProperties}
 */
export const EYEBROW = (color) => ({ fontSize: 11.5, fontWeight: 800, color, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 3 });
