import { C, DLOCALE, SL, SUB_LABEL } from "../ClimbMatchCore.jsx";
import { useRouteStats } from "./db.js";

/* ROUTE STATS — the route page's numbers, as Mountain Project's sidebar and Stats page give them
   ("Page Views: N total · N/month", the star breakdown, ticks, "on N to-do lists") and theCrag's
   ascents-by-month season chart. All of it comes from one RPC, route_stats() (0353), as counts with
   no names: private logs count here, as private ticks do on Mountain Project, without saying whose.
   A view is one visitor, one route, one day (recordRouteView, called by RouteDetail), so a reload
   does not inflate it, and "in the last 30 days" is a real window, not a lifetime average.
   A failed read says so; it never shows a row of zeros (check:read-failures). */
const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const n = (v) => Number(v || 0).toLocaleString(DLOCALE);
const plural = (v, one, many) => n(v) + " " + (Number(v) === 1 ? one : many);
/* How many of those climbers did it in the past 12 months (0371): a lifetime count alone cannot say
   whether a climb is still being done. Trailing 365 days, so October still counts the summer. Left
   off when there is nobody to split, or when the RPC predates 0371 and returns no figure. */
const recent = (all, yr) => (Number(all) > 0 && yr != null ? " · " + n(yr) + " in the past 12 months" : "");

function Tile({ label, value, sub }) {
  return <div style={{ background: C.surface, border: "1px solid " + C.border, borderRadius: 10, padding: "9px 11px", minWidth: 0 }}>
    <div style={{ ...SUB_LABEL, marginBottom: 2 }}>{label}</div>
    <div style={{ fontSize: 20, fontWeight: 800, color: C.text, lineHeight: 1.2 }}>{n(value)}</div>
    {sub ? <div style={{ fontSize: 11.5, color: C.textMuted, lineHeight: 1.4, marginTop: 2 }}>{sub}</div> : null}
  </div>;
}

export default function RouteStats({ routeId, cragOnly }) {
  const q = useRouteStats(routeId);
  if (!routeId) return null;
  if (q.isError) return <div style={{ marginBottom: 12 }}><SL>ROUTE STATS</SL><div style={{ fontSize: 12.5, color: C.textMuted, lineHeight: 1.5 }}>Route stats aren’t reachable right now. Try again in a moment.</div></div>;
  const s = q.data;
  if (!s) return null;
  const stars = Array.isArray(s.star_counts) ? s.star_counts.map(Number) : [0, 0, 0, 0, 0];
  const raters = stars.reduce((a, b) => a + b, 0), topStar = Math.max(1, ...stars);
  const months = Array.isArray(s.sends_by_month) ? s.sends_by_month.map(Number) : [];
  const dated = months.reduce((a, b) => a + b, 0), topMonth = Math.max(1, ...months);
  const since = s.views_since ? new Date(s.views_since + "T12:00:00").toLocaleDateString(DLOCALE, { month: "short", year: "numeric" }) : null;
  const last = s.last_climbed ? new Date(s.last_climbed + "T12:00:00").toLocaleDateString(DLOCALE, { month: "short", day: "numeric", year: "numeric" }) : null;
  const sendWord = cragOnly ? "Sends" : "Sends / summits";
  return <div style={{ marginBottom: 12 }}>
    <SL>ROUTE STATS</SL>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
      <Tile label="Page views" value={s.views_total} sub={n(s.views_30d) + " in the last 30 days"} />
      <Tile label={sendWord} value={s.sends} sub={"by " + plural(s.senders, "climber", "climbers") + recent(s.senders, s.senders_12m)} />
      <Tile label="Logged climbs" value={s.climbs} sub={"by " + plural(s.climbers, "climber", "climbers") + recent(s.climbers, s.climbers_12m) + (last ? " · last " + last : "")} />
      <Tile label="On objectives" value={s.objectives} sub={Number(s.objectives) === 1 ? "climber saved it" : "climbers saved it"} />
    </div>
    {raters ? <div style={{ marginTop: 12 }}>
      <div style={{ ...SUB_LABEL, marginBottom: 5 }}>Star ratings · {plural(raters, "climber", "climbers")}</div>
      {[5, 4, 3, 2, 1].map((k) => <div key={k} role="img" aria-label={k + " star" + (k === 1 ? "" : "s") + ": " + plural(stars[k - 1], "climber", "climbers")} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
        <span style={{ width: 26, fontSize: 12, color: C.textSub, flexShrink: 0 }}>{k}★</span>
        <span style={{ flex: 1, height: 8, background: C.surface, borderRadius: 4, overflow: "hidden" }}><span style={{ display: "block", height: "100%", width: (stars[k - 1] / topStar * 100) + "%", background: C.amber, borderRadius: 4 }} /></span>
        <span style={{ width: 28, textAlign: "right", fontSize: 12, color: C.textSub, flexShrink: 0 }}>{n(stars[k - 1])}</span>
      </div>)}
    </div> : null}
    {dated ? <div style={{ marginTop: 12 }}>
      <div style={{ ...SUB_LABEL, marginBottom: 5 }}>{sendWord} by month · {plural(dated, "dated send", "dated sends")}</div>
      <div role="img" aria-label={months.map((v, i) => MONTH_NAMES[i] + " " + v).join(", ")} style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 52 }}>
        {months.map((v, i) => <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, height: "100%", justifyContent: "flex-end" }}>
          <div style={{ width: "100%", height: v ? Math.max(4, v / topMonth * 36) : 2, background: v ? C.green : C.border, borderRadius: 3 }} />
          <div style={{ fontSize: 10, color: C.textMuted }}>{MONTHS[i]}</div>
        </div>)}
      </div>
    </div> : null}
    <div style={{ fontSize: 11.5, color: C.textMuted, lineHeight: 1.5, marginTop: 10 }}>A view is one visitor in one day{since ? ", counted since " + since : ""}. Private logs count here without a name.</div>
  </div>;
}
