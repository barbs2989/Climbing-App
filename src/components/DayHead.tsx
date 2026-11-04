import { C } from "../../ClimbMatchCore.jsx";
import CardHead from "./CardHead.tsx";

/* A day section's heading with its own ‹ › (see `nav` in ForecastBox): steps the one selected day, so every
   section moves together and the strip at the top agrees. A missing neighbour is a disabled button, not a gap,
   so the heading never shifts. */
export interface DayHeadStep { go: () => void; name: string }
export interface DayHeadNav { prev: DayHeadStep | null; next: DayHeadStep | null }
export interface DayHeadProps {
  title: string;
  /** The selected day's name ("Today", "Tue"). */
  dayLabel: string;
  /** Steps the one selected day; absent or a null side is a disabled button. */
  nav?: DayHeadNav | null;
}
export default function DayHead({ title, dayLabel, nav }: DayHeadProps) {
  const btn = function (n: DayHeadStep | null | undefined, glyph: string, dir: string) {
    return <button onClick={n ? n.go : undefined} disabled={!n} aria-label={n ? dir + " day: " + n.name : "No " + dir.toLowerCase() + " day in the forecast"} style={{ minWidth: 44, minHeight: 44, boxSizing: "border-box", padding: 0, borderRadius: 8, border: "1px solid " + C.border, background: "transparent", color: n ? C.blue : C.textMuted, opacity: n ? 1 : 0.45, fontSize: 18, fontWeight: 700, lineHeight: 1, cursor: n ? "pointer" : "default" }}>{glyph}</button>;
  };
  return <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
    <CardHead style={{ margin: 0 }}>{title + " · " + dayLabel.toUpperCase()}</CardHead>
    <div role="group" aria-label={"Change day for every section, now " + dayLabel} style={{ display: "flex", gap: 6, flexShrink: 0 }}>{btn(nav && nav.prev, "‹", "Previous")}{btn(nav && nav.next, "›", "Next")}</div>
  </div>;
}
