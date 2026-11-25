import type { C as Palette } from "../../ClimbMatchCore.jsx";
import Chevron from "./Chevron.tsx";

export interface AreaRowArrowProps {
  C: typeof Palette;
}

// THE ARROW AT THE END OF A ROW THAT OPENS AN AREA (owner, 2026-11-25: "let's remove view area button the right
// and just have an arrow to indicate that you can click on it"). It replaced a solid blue "View area" pill
// (2026-11-18), which took ~95px of every row and pushed names onto two lines; a plain right arrow is how
// Mountain Project, theCrag and the phone's own Settings mark a row that leads somewhere, and the same
// muted Chevron already ends the app's other navigation rows (Settings, Calendar).
//
// It is drawn INSIDE the row's own control (a <button> or a clickable() row), so the whole row stays one
// tap target and a screen reader hears one name: the row's. Chevron is aria-hidden.
//
// In the All areas tree the EXPAND control is a different thing: a 44px bordered blue box on the LEFT of the
// row, whose chevron turns down when open. This arrow is unboxed, muted, on the right, and never turns.
export default function AreaRowArrow({ C }: AreaRowArrowProps) {
  return <span aria-hidden="true" style={{ flexShrink: 0, display: "inline-flex", alignItems: "center" }}><Chevron size={18} color={C.textMuted} /></span>;
}
