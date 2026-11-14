// One collapsible section header for the Logbook lists: the same look as the Objectives list's
// state headers (lib/ListsManager.jsx) — pin, uppercase label, count pill, chevron — as a real
// <button> so it is reachable and announces whether it is open.
import { C } from "../ClimbMatchCore.jsx";
import ActionIcon from "../src/components/ActionIcon.tsx";
import Chevron from "../src/components/Chevron.tsx";

export default function SectionHeader({ label, count, open, onToggle, icon = "pin", first = false }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-label={label + ", " + count + (count === 1 ? " climb" : " climbs")}
      style={{ width: "100%", minHeight: 44, boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "11px 12px", marginTop: first ? 0 : 6, background: C.surface, borderRadius: 9, border: "1px solid " + C.border, borderLeft: "4px solid " + C.blue, cursor: "pointer", font: "inherit", textAlign: "left", color: C.text }}
    >
      <span style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
        {icon ? <span style={{ flexShrink: 0, display: "inline-flex" }}><ActionIcon name={icon} size={12} color={C.textMuted} /></span> : null}
        <span style={{ fontSize: 11.5, fontWeight: 800, color: C.text, textTransform: "uppercase", letterSpacing: 0.5, overflowWrap: "anywhere" }}>{label}</span>
        <span aria-hidden="true" style={{ flexShrink: 0, fontSize: 10, fontWeight: 800, color: C.textSub, background: C.card, border: "1px solid " + C.border, borderRadius: 20, padding: "1px 7px" }}>{count}</span>
      </span>
      <Chevron open={open} color={C.textMuted} />
    </button>
  );
}
