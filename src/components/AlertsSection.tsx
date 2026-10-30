import { alertsForDay, normAlerts, alertLevel } from "../../lib/alpineConditions.js";
import { BOX, RETRY, MUTED, windowLabel } from "../../lib/alpineConditionsShared.js";
import DayHead from "./DayHead.tsx";
import LoadingRows from "./LoadingRows.tsx";
import { C } from "../../ClimbMatchCore.jsx";

/* WEATHER ALERTS for the selected day: each alert exactly as issued (its event name, severity and window), and
   its WHAT line verbatim in the units it was issued in -- not paraphrased, because a paraphrase of a wind speed
   is a wrong wind speed. Outside the US nothing is checked, and it says so; a failed read is "not measured";
   a day with no alert says that none is not an all-clear. */
export default function AlertsSection({ day, dayLabel, nav, alerts, fc, onRetry }) {
  const list = alerts && alerts.data && !alerts.data.outside ? alertsForDay(normAlerts(alerts.data), day.date, fc) : [];
  return <div style={BOX}>
    <DayHead title="WEATHER ALERTS" dayLabel={dayLabel} nav={nav} />
    {!alerts ? <LoadingRows C={C} label="Loading weather alerts…"/>
      : alerts.error ? <div><div style={{ fontSize: 12.5, color: C.amber, lineHeight: 1.5 }}>Couldn’t load weather alerts, so they are not measured. This is not a report of none.</div><button onClick={onRetry} style={RETRY}>Try again</button></div>
      : alerts.data.outside ? <div style={MUTED}>Weather alerts are only checked for places in the United States. Nothing was checked for this route.</div>
      : !list.length ? <div style={MUTED}>{"No weather alert is in effect for this area " + (dayLabel === "Today" ? "today" : "on " + dayLabel) + "."}</div>
      : <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{list.map(function (a, i) {
        const col = alertLevel(a) === "warn" ? C.red : C.amber;
        return <div key={a.id + i} style={{ background: C.surface, border: "1px solid " + col + "77", borderRadius: 10, padding: "9px 11px" }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: col }}>{a.event}</div>
          <div style={{ fontSize: 12, color: C.text, marginTop: 2 }}>{windowLabel(fc, a)}</div>
          <div style={{ fontSize: 11.5, color: C.textMuted, marginTop: 2 }}>{[a.severity + " severity", a.urgency, a.certainty].filter(Boolean).join(" · ")}</div>
          {a.what ? <div style={{ fontSize: 12, color: C.textSub, lineHeight: 1.5, marginTop: 5 }}>{"As issued: " + a.what}</div> : null}
        </div>;
      })}</div>}
    <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.5, marginTop: 8 }}>An alert covers a whole forecast zone, which can be much larger than the route and span very different heights, so it may not describe the route itself. Alerts are issued only a day or two ahead: a day with none is not an all-clear.{list.length ? " The wording above is kept in the units it was issued in." : ""}</div>
  </div>;
}
