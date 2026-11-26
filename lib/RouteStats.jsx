import { C, DLOCALE, SL, SUB_LABEL, realProfileId, FALLBACK_AV } from "../ClimbMatchCore.jsx";
import { useRouteStats } from "./db.js";
import Chevron from "../src/components/Chevron.tsx";
import Av from "../src/components/Av.tsx";
import { clickable } from "./clickable";

/* ROUTE STATS — the route page's numbers, as Mountain Project's sidebar and Stats page give them
   ("Page Views: N total · N/month", the star breakdown, ticks, "on N to-do lists") and theCrag's
   ascents-by-month season chart. All of it comes from one RPC, route_stats() (0353), as counts with
   no names: private logs count here, as private ticks do on Mountain Project, without saying whose.
   A view is one visitor, one route, one day (recordRouteView, called by RouteDetail), so a reload
   does not inflate it, and "in the last 30 days" is a real window, not a lifetime average.
   The card carries no footnote explaining any of this (owner 2026-11-25: "Remove this text: A view is
   one visitor in one day, counted since Nov 2026. Private logs count here without a name.").
   A failed read says so; it never shows a row of zeros (check:read-failures).
   Since 2026-11-25 (owner note: "Remove social stats from the top of route pages, keep the one that's
   at the bottom of the overview page. What other stats can we add?") this card is the ONLY place a
   route's social numbers live: the header strip is gone, its "viewing now" moved here, and 0535 adds
   how it was climbed, the summit rate, why parties turned back, and typical car-to-car and party size. */
const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const n = (v) => Number(v || 0).toLocaleString(DLOCALE);
const plural = (v, one, many) => n(v) + " " + (Number(v) === 1 ? one : many);
/* How many of those climbers did it in the past 12 months (0371): a lifetime count alone cannot say
   whether a climb is still being done. Trailing 365 days, so October still counts the summer. Left
   off when there is nobody to split, or when the RPC predates 0371 and returns no figure. */
const recent = (all, yr) => (Number(all) > 0 && yr != null ? " · " + n(yr) + " in the past 12 months" : "");
/* Minutes as "9 hr 40 min" / "45 min". */
const hrMin = (m) => { const v = Math.round(Number(m) || 0), h = Math.floor(v / 60), r = v % 60; return h ? h + " hr" + (r ? " " + r + " min" : "") : r + " min"; };
/* An object of counts ({Onsight: 3, Follow: 1}) as rows, biggest first; a missing object (an RPC
   older than 0535) is no rows, so the section is left out rather than drawn empty.
   Keys are merged without regard to case and shown with a capital first letter: some older logs
   store "lead" where the form now writes "Lead", and one style must not read as two rows. */
const countRows = (o) => { const m = {}; Object.entries(o && typeof o === "object" ? o : {}).forEach(([k, v]) => { const key = String(k).trim(); if (!key) return; const lk = key.toLowerCase(); if (!m[lk]) m[lk] = [key.charAt(0).toUpperCase() + key.slice(1), 0]; m[lk][1] += Number(v) || 0; }); return Object.values(m).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]); };

/* One labelled bar: the star breakdown, how it was climbed, why parties turned back. */
function BarRow({ label, value, top, color, labelWidth }) {
  return <div role="img" aria-label={label + ": " + plural(value, "climb", "climbs")} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
    <span style={{ width: labelWidth, fontSize: 12, color: C.textSub, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
    <span style={{ flex: 1, height: 8, background: C.surface, borderRadius: 4, overflow: "hidden" }}><span style={{ display: "block", height: "100%", width: (value / Math.max(1, top) * 100) + "%", background: color, borderRadius: 4 }} /></span>
    <span style={{ width: 28, textAlign: "right", fontSize: 12, color: C.textSub, flexShrink: 0 }}>{n(value)}</span>
  </div>;
}

/* VIEWING NOW — the one live number the header's social strip carried that this card did not. It
   moved here rather than going, because Settings › Privacy's "visible while browsing" switch decides
   whether YOU are named in it; with no screen that switch would promise nothing. `presence` is
   lib/presence.js's presenceSplit: how many OTHERS are on the page, and the ones who chose to be
   named. A signed-in viewer's face opens their own profile, by uid; a signed-out viewer has no
   profile to open. Nothing renders when nobody else is here: no "0 viewing now". */
export function ViewingNow({ presence, noun, onViewProfile }) {
  const others = (presence && presence.others) || 0, viewers = (presence && presence.viewers) || [];
  if (!others && !viewers.length) return null;
  const k = Math.max(others, viewers.length);
  return <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6, marginBottom: 8, fontSize: 12.5, color: C.textSub }}>
    <span className="cm-pulse" style={{ width: 7, height: 7, borderRadius: "50%", background: C.green, flexShrink: 0 }} />
    <span><b style={{ color: C.green }}>{n(k)}</b> {k === 1 ? "climber" : "climbers"} viewing this {noun || "climb"} now</span>
    {viewers.slice(0, 4).map((v, i) => {
      const id = realProfileId(v.id);
      const open = id && onViewProfile ? () => onViewProfile({ id, name: v.name || "Climber", avatar: v.avatar || FALLBACK_AV, _real: true }) : null;
      return open
        ? <span key={"v" + i} {...clickable(open)} aria-label={(v.name || "A climber") + ", view profile"} title={v.name || "A climber"} style={{ display: "inline-flex", cursor: "pointer" }}><Av src={v.avatar} size={20} /></span>
        : <span key={"v" + i} title={v.name || "A climber"} style={{ display: "inline-flex" }}><Av src={v.avatar} size={20} /></span>;
    })}
  </div>;
}

/* A tile with onOpen is a button: its number leads to the climbers behind it, as Mountain Project's
   Stats page lists who has a route on their to-do list. `go` is the link's own words, in blue. */
function Tile({ label, value, sub, onOpen, go }) {
  const body = <>
    <div style={{ ...SUB_LABEL, marginBottom: 2 }}>{label}</div>
    <div style={{ fontSize: 20, fontWeight: 800, color: C.text, lineHeight: 1.2 }}>{n(value)}</div>
    {sub ? <div style={{ fontSize: 11.5, color: C.textMuted, lineHeight: 1.4, marginTop: 2 }}>{sub}</div> : null}
    {onOpen && go ? <div style={{ display: "flex", alignItems: "center", gap: 2, fontSize: 11.5, fontWeight: 700, color: C.blue, lineHeight: 1.4, marginTop: 3 }}>{go}<Chevron size={13} color={C.blue} /></div> : null}
  </>;
  const box = { background: C.surface, border: "1px solid " + (onOpen ? C.blueDim : C.border), borderRadius: 10, padding: "9px 11px", minWidth: 0 };
  return onOpen ? <button type="button" onClick={onOpen} style={{ ...box, display: "block", width: "100%", textAlign: "left", font: "inherit", color: "inherit", cursor: "pointer" }}>{body}</button> : <div style={box}>{body}</div>;
}

/* onOpenPartners opens the route's Partners tab (owner's note, 2026-10-28: the objectives count leads
   to the climbers looking for the same route). On an alpine route that tab lists the climbers who saved
   it; a crag route's partners are found by the CRAG (0300/0303), so its link says that instead.
   `live` is the <ViewingNow/> line, drawn under the heading. */
export default function RouteStats({ routeId, cragOnly, onOpenPartners, live }) {
  const q = useRouteStats(routeId);
  if (!routeId) return null;
  if (q.isError) return <div style={{ marginBottom: 12 }}><SL>ROUTE STATS</SL>{live}<div style={{ fontSize: 12.5, color: C.textMuted, lineHeight: 1.5 }}>Route stats aren’t reachable right now. Try again in a moment.</div></div>;
  const s = q.data;
  if (!s) return null;
  const stars = Array.isArray(s.star_counts) ? s.star_counts.map(Number) : [0, 0, 0, 0, 0];
  const raters = stars.reduce((a, b) => a + b, 0), topStar = Math.max(1, ...stars);
  const months = Array.isArray(s.sends_by_month) ? s.sends_by_month.map(Number) : [];
  const dated = months.reduce((a, b) => a + b, 0), topMonth = Math.max(1, ...months);
  const last = s.last_climbed ? new Date(s.last_climbed + "T12:00:00").toLocaleDateString(DLOCALE, { month: "short", day: "numeric", year: "numeric" }) : null;
  const sendWord = cragOnly ? "Sends" : "Sends / summits";
  /* 0535. The two medians come back only when three or more logs carry the figure, so neither can
     be one climber's own private time; the summit rate counts only logs that ANSWERED the question. */
  const ticks = countRows(s.tick_counts), topTick = Math.max(1, ...ticks.map((t) => t[1]));
  const reasons = countRows(s.turnback_reasons), topReason = Math.max(1, ...reasons.map((t) => t[1]));
  const sumAns = Number(s.summit_answers) || 0, sums = Number(s.summits) || 0;
  /* 0537: how the shown grade felt to the climbers who answered (UKC's grade-vote spread, theCrag's grade opinion).
     Relative to the grade on the page, so it never reads as a vote that changed it. */
  const gf = s.grade_feel && typeof s.grade_feel === "object" ? s.grade_feel : {};
  const feel = [["Soft", Number(gf.soft) || 0], ["About right", Number(gf.right) || 0], ["Stiff", Number(gf.stiff) || 0]];
  const feelN = feel.reduce((a, t) => a + t[1], 0), topFeel = Math.max(1, ...feel.map((t) => t[1]));
  const typical = [];
  if (sumAns) typical.push(["Reached the summit", n(sums) + " of " + plural(sumAns, "climb", "climbs") + " · " + Math.round(sums / sumAns * 100) + "%"]);
  if (s.c2c_median_min != null) typical.push(["Typical car-to-car", hrMin(s.c2c_median_min) + " · median of " + plural(s.c2c_n, "climb", "climbs")]);
  if (s.party_median != null) typical.push(["Typical party", plural(Math.round(Number(s.party_median) * 2) / 2, "climber", "climbers") + " · median of " + plural(s.party_n, "climb", "climbs")]);
  return <div style={{ marginBottom: 12 }}>
    <SL>ROUTE STATS</SL>
    {live}
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
      <Tile label="Page views" value={s.views_total} sub={n(s.views_30d) + " in the last 30 days"} />
      <Tile label={sendWord} value={s.sends} sub={"by " + plural(s.senders, "climber", "climbers") + recent(s.senders, s.senders_12m)} />
      <Tile label="Logged climbs" value={s.climbs} sub={"by " + plural(s.climbers, "climber", "climbers") + recent(s.climbers, s.climbers_12m) + (last ? " · last " + last : "")} />
      <Tile label="On objectives" value={s.objectives} sub={Number(s.objectives) === 1 ? "climber saved it" : "climbers saved it"} onOpen={onOpenPartners && (cragOnly || Number(s.objectives) > 0) ? onOpenPartners : null} go={cragOnly ? "Partners at this crag" : "See who"} />
    </div>
    {typical.length ? <div style={{ marginTop: 12 }}>
      {typical.map(([k, v]) => <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12.5, lineHeight: 1.5, padding: "4px 0", borderBottom: "1px solid " + C.border }}>
        <span style={{ color: C.textSub }}>{k}</span><span style={{ color: C.text, fontWeight: 700, textAlign: "right" }}>{v}</span>
      </div>)}
    </div> : null}
    {raters ? <div style={{ marginTop: 12 }}>
      <div style={{ ...SUB_LABEL, marginBottom: 5 }}>Climber votes · {plural(raters, "climber", "climbers")}</div>
      {[5, 4, 3, 2, 1].map((k) => <div key={k} role="img" aria-label={k + " star" + (k === 1 ? "" : "s") + ": " + plural(stars[k - 1], "climber", "climbers")} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
        <span style={{ width: 26, fontSize: 12, color: C.textSub, flexShrink: 0 }}>{k}★</span>
        <span style={{ flex: 1, height: 8, background: C.surface, borderRadius: 4, overflow: "hidden" }}><span style={{ display: "block", height: "100%", width: (stars[k - 1] / topStar * 100) + "%", background: C.amber, borderRadius: 4 }} /></span>
        <span style={{ width: 28, textAlign: "right", fontSize: 12, color: C.textSub, flexShrink: 0 }}>{n(stars[k - 1])}</span>
      </div>)}
    </div> : null}
    {feelN ? <div data-grade-feel="" style={{ marginTop: 12 }}>
      <div style={{ ...SUB_LABEL, marginBottom: 5 }}>How the grade felt · {plural(feelN, "answer", "answers")}</div>
      {feel.map(([k, v]) => <BarRow key={k} label={k} value={v} top={topFeel} color={C.amber} labelWidth={96} />)}
    </div> : null}
    {ticks.length ? <div style={{ marginTop: 12 }}>
      <div style={{ ...SUB_LABEL, marginBottom: 5 }}>How it was climbed · {plural(ticks.reduce((a, t) => a + t[1], 0), "climb", "climbs")}</div>
      {ticks.map(([k, v]) => <BarRow key={k} label={k} value={v} top={topTick} color={C.blue} labelWidth={96} />)}
    </div> : null}
    {reasons.length ? <div style={{ marginTop: 12 }}>
      <div style={{ ...SUB_LABEL, marginBottom: 5 }}>Why parties turned back</div>
      {reasons.map(([k, v]) => <BarRow key={k} label={k} value={v} top={topReason} color={C.textMuted} labelWidth={120} />)}
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
  </div>;
}
