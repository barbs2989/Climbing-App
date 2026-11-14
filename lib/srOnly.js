// Text a screen reader announces and the page does not show: the clip pattern, which every
// screen reader reads and no layout notices. Use it to say a control's PURPOSE when the visible
// row only shows content ("Henry's Fork TH · 0 mi · 9,400 ft" — and tapping it shows it on the map).
//
// Prefer this to an aria-label on a row that shows text. An aria-label REPLACES the row's name, and
// WCAG 2.5.3 (Label in Name) then requires every visible word to appear in it, in order: axe-core
// 4.14 gates on that, and a summary label over a rich row cannot meet it. Content plus a hidden
// purpose suffix can, by construction.
/** @type {import("react").CSSProperties} */
export const SR_ONLY = { position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap", border: 0 };
