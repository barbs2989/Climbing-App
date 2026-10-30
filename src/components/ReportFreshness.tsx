import { reportFreshness, HEAD, MUTED } from "../../lib/alpineConditionsShared.js";
import CardHead from "./CardHead.tsx";
import { C, DLOCALE } from "../../ClimbMatchCore.jsx";

export default function ReportFreshness({ activity, unavailable }) {
  const fr = reportFreshness(activity);
  return <div style={{ marginTop: 14 }}><CardHead style={HEAD}>How recent the reports are</CardHead>
    {unavailable && !fr ? <div style={{ fontSize: 12.5, color: C.amber, lineHeight: 1.5 }}>Couldn’t load the trip reports, so how recent they are is not known. This is not a report that there are none.</div>
      : !fr ? <div style={MUTED}>No trip report is on file for this climb, so nothing recent is known about its conditions.</div>
      : <div style={{ fontSize: 12.5, color: C.text, lineHeight: 1.5 }}>{"Newest report: " + new Date(fr.newest).toLocaleDateString(DLOCALE, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }) + " (" + (fr.daysAgo === 0 ? "today" : fr.daysAgo === 1 ? "yesterday" : fr.daysAgo + " days ago") + "). " + fr.last14 + " in the last 14 days, " + fr.total + " on file."}</div>}
  </div>;
}
