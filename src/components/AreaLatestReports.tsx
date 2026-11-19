import { useMemo, useState } from "react";
import { useAreaLatestReports, useAreaLatestReportRows, useProfilesByIds, useRoutesByIds } from "../../lib/db";
import { tripRowToActivity } from "../../lib/tripReportRow.js";
import { isHazardTag, normTag, RECENT_DAYS } from "../../ClimbMatchCore.jsx";
import { clickable } from "../../lib/clickable";
import { BTN, BTN_SM } from "../../lib/buttonStyles.js";
import { discLabel } from "../../lib/discLabels.js";
import Av from "./Av.tsx";
import ActionIcon from "./ActionIcon.tsx";
import Chevron from "./Chevron.tsx";
import LoadingRows from "./LoadingRows.tsx";
import type { RouteRowRoute } from "./RouteRow.tsx";
import type { C as Palette } from "../../ClimbMatchCore.jsx";

export interface AreaLatestReportsProps {
  area: { id: string; name?: string };
  /** Opens the climb a report is about. */
  onOpenRoute: (r: RouteRowRoute) => void;
  /** Opens the trip report or logged climb itself, over this page. Absent: a row offers only its climb. */
  onOpenReport?: (ascent: Record<string, unknown>, route: RouteRowRoute) => void;
  C: typeof Palette;
}

interface LatestRow { id: string; route_id: string; user_id?: string | null; [k: string]: unknown }
interface LatestRoute { id: string; name?: string; discipline?: string | null; [k: string]: unknown }
interface LatestRef { id: string; route_id?: string | null; user_id?: string | null }
interface LatestActivity { user: string; avatar: string; date?: string | null; condTags: string[]; tickType?: string; summited?: boolean; text: string }

/** How many rows the card shows before the "See more" dropdown, how many each further step adds, and the most it asks for. */
const FIRST = 4, STEP = 10, MOST = 100;
const WHEN: [string, string, number][] = [["", "Any time", 0], ["30", "Last 30 days", 30], ["90", "Last 90 days", 90], ["365", "Last 12 months", 365]];
const sinceOf = (days: number) => (days ? new Date(Date.now() - days * 86400000).toISOString().slice(0, 10) : "");

// The notes come from the rich editor: a preview line shows their words, not their markup.
const plain = (s: string) => String(s || "").replace(/<[^>]*>/g, " ").replace(/[*_#>`]+/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
const MN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fmtDate = (d?: string | null) => { if (!d) return ""; const q = String(d).split("-"); const m = MN[parseInt(q[1], 10) - 1]; return m ? m + " " + parseInt(q[2] || "1", 10) + (q[0] !== String(new Date().getFullYear()) ? ", " + q[0] : "") : ""; };

/* LATEST FROM THIS AREA (seed-vs-real audit, 2026-11-11): the seed area page's four newest reports and
   red "N hazard reports · last N days" badge, on real data. The reports are the newest PUBLIC ones
   under the area's whole subtree (area_latest_reports, 0414), read through the route page's own
   trip-report path; the hazard count covers every visible log of the last RECENT_DAYS days, anonymously,
   with the app's own isHazardTag rule. Renders nothing while an area has neither.

   MORE THAN FOUR, SORTED AND FILTERED (owner, 2026-11-19; 0477). An area with more than FIRST reports
   gets four selects (order, discipline, when, trip reports or logged climbs) that the DATABASE applies
   over the whole area, and a "See N more" dropdown under the fourth row that opens the rest STEP at a
   time. A row no longer just opens its climb: it opens the trip report or logged climb itself, and
   carries two buttons, one for that and one for the route page. */
export default function AreaLatestReports({ area, onOpenRoute, onOpenReport, C }: AreaLatestReportsProps) {
  const [sort, setSort] = useState("newest");
  const [disc, setDisc] = useState("");
  const [when, setWhen] = useState("");
  const [since, setSince] = useState("");
  const [kind, setKind] = useState("");
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(FIRST + STEP);
  const filtered = !!(disc || when || kind);
  const q = useAreaLatestReports(area.id, open ? shown : FIRST, { disc, since, sort, kind });
  // The report rows, and (from 0428's `refs`) the climbs and authors, are read together once the ids
  // are in: two round trips. Without refs (a database before 0428) climbs and authors wait for the rows.
  const ids = useMemo(() => ((q.data && q.data.ids) || []) as string[], [q.data]);
  const refs = (q.data && q.data.refs) as LatestRef[] | null | undefined;
  const rowsQ = useAreaLatestReportRows(ids);
  const rows = useMemo(() => (ids.length ? (rowsQ.data || []) as unknown as LatestRow[] : []), [ids, rowsQ.data]);
  const recentTags = ((q.data && q.data.recentTags) || []) as string[][];
  const refSource = useMemo((): { user_id?: string | null; route_id?: string | null }[] => refs || rows, [refs, rows]);
  const userIds = useMemo(() => [...new Set(refSource.map(r => r.user_id).filter((x): x is string => !!x))], [refSource]);
  const routeIds = useMemo(() => [...new Set(refSource.map(r => r.route_id).filter((x): x is string => !!x))], [refSource]);
  const profQ = useProfilesByIds(userIds);
  const routesQ = useRoutesByIds(routeIds);
  const profById = useMemo(() => { const m: Record<string, unknown> = {}; ((profQ.data || []) as { id: string }[]).forEach(p => { m[p.id] = p; }); return m; }, [profQ.data]);
  const routeById = useMemo(() => { const m: Record<string, LatestRoute> = {}; ((routesQ.data || []) as LatestRoute[]).forEach(r => { m[r.id] = r; }); return m; }, [routesQ.data]);
  const hazardCount = recentTags.filter(tags => tags.some(t => isHazardTag(normTag(t)))).length;
  const total = (q.data && q.data.total) || 0;
  const totalAll = (q.data && q.data.totalAll) || 0;
  const discCounts = ((q.data && q.data.discs) || {}) as Record<string, number>;
  const discKeys = Object.keys(discCounts).sort((a, b) => discCounts[b] - discCounts[a] || a.localeCompare(b));
  // A wider page or a new filter is on its way while the last answer is still on screen.
  const settling = q.isPlaceholderData || (ids.length > 0 && rowsQ.isPlaceholderData);
  const reset = () => { setOpen(false); setShown(FIRST + STEP); };
  const clear = () => { setDisc(""); setWhen(""); setSince(""); setKind(""); reset(); };

  if ((q.isLoading && !q.data) || (ids.length > 0 && rowsQ.isLoading && !rowsQ.data)) return <div style={{ marginTop: 14 }}><LoadingRows C={C} label="Loading the latest reports…" rows={2} /></div>;
  if (q.isError || rowsQ.isError) return <div role="alert" style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "10px 12px", borderRadius: 12, border: "1px solid " + C.border, background: C.card, fontSize: 12.5, color: C.text }}>
    <span style={{ flex: "1 1 200px", minWidth: 0 }}>Couldn’t load the latest reports for this area.</span>
    <button onClick={() => { if (q.isError) q.refetch(); else rowsQ.refetch(); }} style={{ ...BTN, border: "1px solid " + C.border, background: C.surface, color: C.blue }}>Retry</button>
  </div>;
  if (!rows.length && !hazardCount && !filtered) return null;

  const sel = { width: "100%", minWidth: 0, minHeight: 40, boxSizing: "border-box" as const, background: C.surface, color: C.text, border: "1px solid " + C.border, borderRadius: 9, padding: "0 8px", fontSize: 13, fontWeight: 600, cursor: "pointer" };
  const selOn = { ...sel, border: "1px solid " + C.blue };
  const more = Math.max(0, total - FIRST);
  const row = (r: LatestRow) => {
    const a = tripRowToActivity(r, (r.user_id && profById[r.user_id]) || null) as LatestActivity;
    const rt = routeById[r.route_id];
    const haz = (a.condTags || []).some(t => isHazardTag(normTag(t)));
    const outcome = a.summited ? "Summit" : a.tickType || null;
    // The same line the database draws for "Trip reports only": a write-up makes it a trip report.
    const isReport = !!String(a.text || "").trim();
    const what = isReport ? "trip report" : "logged climb";
    const climb = rt && rt.name ? rt.name : "A climb here";
    const routeArg = (rt || { id: r.route_id, name: "", _thin: true }) as unknown as RouteRowRoute;
    const openRoute = () => onOpenRoute(routeArg);
    const openReport = onOpenReport ? () => onOpenReport(a as unknown as Record<string, unknown>, routeArg) : openRoute;
    const dl = rt && rt.discipline ? discLabel(rt.discipline) : "";
    return <div key={r.id} style={{ padding: "8px 2px", borderTop: "1px solid " + C.borderLight }}>
      <div {...clickable(openReport)} aria-label={(onOpenReport ? "View " + what + ": " : "Open ") + climb + ", by " + a.user} style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
        <Av src={a.avatar} size={30} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.text, overflowWrap: "anywhere" }}>{climb}</span>
            {outcome ? <span style={{ fontSize: 10.5, fontWeight: 800, color: a.summited ? C.green : C.textSub, background: a.summited ? C.greenBg : C.surface, borderRadius: 999, padding: "1px 7px" }}>{outcome}</span> : null}
            {haz ? <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10.5, color: C.red, fontWeight: 800 }}><span aria-hidden="true" style={{ display: "inline-flex" }}><ActionIcon name="alert" size={11} color="currentColor" /></span>Hazard</span> : null}
          </div>
          <div style={{ fontSize: 11.5, color: C.textMuted }}>{[isReport ? "Trip report" : "Logged climb", a.user, fmtDate(a.date), dl].filter(Boolean).join(" · ")}</div>
          {isReport ? <div style={{ fontSize: 12, color: C.textSub, marginTop: 2, lineHeight: 1.45, overflowWrap: "anywhere", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{plain(a.text)}</div> : null}
        </div>
      </div>
      {onOpenReport ? <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 7, paddingLeft: 40 }}>
        <button onClick={openReport} aria-label={"View " + what + ": " + climb + ", by " + a.user} style={{ ...BTN_SM, minHeight: 34, border: "1px solid " + C.blueDim, background: C.blueBg, color: C.onSolid }}>{"View " + what}</button>
        <button onClick={openRoute} aria-label={"Open the route page for " + climb} style={{ ...BTN_SM, minHeight: 34, border: "1px solid " + C.border, background: C.surface, color: C.text }}>Route page</button>
      </div> : null}
    </div>;
  };

  return (
    <section aria-label={"Latest from " + (area.name || "this area")} style={{ marginTop: 14, background: C.card, borderRadius: 12, border: "1px solid " + (hazardCount ? C.red + "55" : C.border), padding: "12px 13px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginBottom: rows.length || totalAll > FIRST ? 8 : 0 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: C.label, textTransform: "uppercase", letterSpacing: 0.4 }}>Latest from this area</div>
        {hazardCount ? <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 700, color: C.red, background: C.redBg, borderRadius: 999, padding: "2px 9px" }}><span aria-hidden="true" style={{ display: "inline-flex" }}><ActionIcon name="alert" size={12} color="currentColor" /></span>{hazardCount + " hazard report" + (hazardCount !== 1 ? "s" : "") + " · last " + RECENT_DAYS + " days"}</span> : null}
      </div>
      {/* Sorting or filtering four rows or fewer would be controls for nothing. */}
      {totalAll > FIRST ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8, marginBottom: 8 }}>
        <select value={sort} onChange={e => { setSort(e.target.value); reset(); }} aria-label="Sort the latest reports" style={sel}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
        <select value={disc} onChange={e => { setDisc(e.target.value); reset(); }} aria-label="Filter the latest reports by discipline" style={disc ? selOn : sel}>
          <option value="">All disciplines</option>
          {discKeys.map(d => <option key={d} value={d}>{discLabel(d) + " (" + discCounts[d] + ")"}</option>)}
        </select>
        <select value={when} onChange={e => { const w = WHEN.find(x => x[0] === e.target.value) || WHEN[0]; setWhen(w[0]); setSince(sinceOf(w[2])); reset(); }} aria-label="Filter the latest reports by the date climbed" style={when ? selOn : sel}>
          {WHEN.map(w => <option key={w[0]} value={w[0]}>{w[1]}</option>)}
        </select>
        <select value={kind} onChange={e => { setKind(e.target.value); reset(); }} aria-label="Show trip reports, logged climbs or both" style={kind ? selOn : sel}>
          <option value="">Reports and logs</option>
          <option value="report">Trip reports only</option>
          <option value="log">Logged climbs only</option>
        </select>
      </div> : null}
      {filtered ? <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap", fontSize: 12, color: C.textSub, marginBottom: rows.length ? 6 : 0 }}>
        <span aria-live="polite">{settling ? "Updating…" : total ? total + " of " + totalAll + " match" : "Nothing here matches these filters."}</span>
        <button onClick={clear} style={{ ...BTN_SM, border: "1px solid " + C.border, background: C.surface, color: C.blue }}>Clear filters</button>
      </div> : null}
      <div style={{ opacity: settling ? 0.55 : 1 }}>
        {rows.slice(0, FIRST).map(row)}
        {more > 0 ? <button onClick={() => setOpen(o => !o)} aria-expanded={open} style={{ ...BTN, width: "100%", minHeight: 44, marginTop: 4, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, border: "1px solid " + C.border, background: C.surface, color: C.text }}>
          {open ? "Show fewer" : "See " + more + " more"}
          <span aria-hidden="true" style={{ display: "flex", flexShrink: 0 }}><Chevron open={open} size={16} color="currentColor" /></span>
        </button> : null}
        {open && more > 0 ? <div style={{ marginTop: 4 }}>
          {rows.slice(FIRST).map(row)}
          {rows.length < total && shown < MOST ? <button onClick={() => setShown(n => Math.min(MOST, n + STEP))} style={{ ...BTN, width: "100%", minHeight: 44, marginTop: 4, border: "1px solid " + C.border, background: C.surface, color: C.blue }}>{"Show " + Math.min(STEP, total - rows.length, MOST - shown) + " more"}</button> : null}
          {rows.length < total && shown >= MOST ? <div style={{ fontSize: 12, color: C.textSub, padding: "8px 2px 0" }}>{"Showing " + rows.length + " of " + total + ". Use the filters above to find the rest."}</div> : null}
        </div> : null}
      </div>
    </section>
  );
}
