import type { C as Palette } from "../../ClimbMatchCore.jsx";
import { SOLID_FILL } from "../../lib/buttonStyles.js";

export interface ViewAreaPillProps {
  C: typeof Palette;
  /** "View area" by default; a tight row may say just "View". */
  label?: string;
}

// THE "VIEW AREA" BUTTON (owner, 2026-11-18: "We need a view area text and button that is clear when looking
// for areas and climbs"). An area row used to open on a tap of its NAME, with only a grey chevron or a bare
// count at the end to say so -- and in the All areas tree the name sat beside an expand arrow that looked
// just like it and did the opposite. This is the visible target at the end of every row that OPENS an area,
// solid blue so it reads as a button and not as a label.
//
// It is drawn INSIDE the row's own control (a <button> or a clickable() row), so the whole row stays one
// tap target and a screen reader hears one name: the row's. Hence aria-hidden.
export default function ViewAreaPill({ C, label = "View area" }: ViewAreaPillProps) {
  return <span aria-hidden="true" style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 3, minHeight: 32, boxSizing: "border-box", padding: "0 11px", borderRadius: 8, ...SOLID_FILL(C), color: C.onSolid, fontSize: 12.5, fontWeight: 800, whiteSpace: "nowrap", lineHeight: 1 }}>
    {label}
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
  </span>;
}
