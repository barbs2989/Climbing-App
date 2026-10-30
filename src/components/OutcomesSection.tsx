import { recentOutcomes, HEAD } from "../../lib/alpineConditionsShared.js";
import { summitedLog, C, DLOCALE } from "../../ClimbMatchCore.jsx";
import CardHead from "./CardHead.tsx";

export default function OutcomesSection({ activity }) {
  const rows = recentOutcomes(activity);
  if (!rows.length) return null;
  const up = rows.filter(function (a) { return summitedLog(a); }).length;
  return <div style={{ marginTop: 14 }}><CardHead style={HEAD}>Recent outcomes</CardHead>
    <div style={{ fontSize: 12.5, color: C.text, marginBottom: 4 }}>{up + " of " + rows.length + " report" + (rows.length === 1 ? "" : "s") + " in the last 60 days summited."}</div>
    {rows.slice(0, 4).map(function (a, i) {
      const back = !summitedLog(a), why = back && Array.isArray(a.outcomeReasons) && a.outcomeReasons.length ? " — " + a.outcomeReasons.join(", ") : "";
      return <div key={(a._dbId || a.id || "") + "-" + i} style={{ fontSize: 12, color: C.textSub, lineHeight: 1.45 }}>{new Date(String(a.date).slice(0, 10) + "T12:00:00Z").toLocaleDateString(DLOCALE, { month: "short", day: "numeric", timeZone: "UTC" }) + " · "}<b style={{ color: back ? C.amber : C.green }}>{back ? a.tickType : "Summited"}</b>{why}{back && a.outcomeNote ? ": " + String(a.outcomeNote).slice(0, 140) : ""}</div>;
    })}
  </div>;
}
