import { useMemo } from "react";
import { useAreaLatestReports, useAreaLatestReportRows, useProfilesByIds, useRoutesByIds } from "../../lib/db";
import { tripRowToActivity } from "../../lib/tripReportRow.js";
import { isHazardTag, normTag, RECENT_DAYS } from "../../ClimbMatchCore.jsx";
import { clickable } from "../../lib/clickable";
import { BTN } from "../../lib/buttonStyles.js";
import Av from "./Av.tsx";
import ActionIcon from "./ActionIcon.tsx";
import LoadingRows from "./LoadingRows.tsx";
import type { RouteRowRoute } from "./RouteRow.tsx";
import type { C as Palette } from "../../ClimbMatchCore.jsx";

export interface AreaLatestReportsProps {
  area: { id: string; name?: string };
  /** Opens the climb a report is about. */
  onOpenRoute: (r: RouteRowRoute) => void;
  C: typeof Palette;
}

interface LatestRow { id: string; route_id: string; user_id?: string | null; [k: string]: unknown }
interface LatestRoute { id: string; name?: string; [k: string]: unknown }
interface LatestRef { id: string; route_id?: string | null; user_id?: string | null }
interface LatestActivity { user: string; avatar: string; date?: string | null; condTags: string[]; tickType?: string; summited?: boolean; text: string }

// The notes come from the rich editor: a preview line shows their words, not their markup.
const plain = (s: string) => String(s || "").replace(/<[^>]*>/g, " ").replace(/[*_#>`]+/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
const MN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fmtDate = (d?: string | null) => { if (!d) return ""; const q = String(d).split("-"); const m = MN[parseInt(q[1], 10) - 1]; return m ? m + " " + parseInt(q[2] || "1", 10) + (q[0] !== String(new Date().getFullYear()) ? ", " + q[0] : "") : ""; };

/* LATEST FROM THIS AREA (seed-vs-real audit, 2026-11-11): the seed area page's four newest reports and
   red "N hazard reports · last N days" badge, on real data. The reports are the newest PUBLIC ones
   under the area's whole subtree (area_latest_reports, 0414), read through the route page's own
   trip-report path; the hazard count covers every visible log of the last RECENT_DAYS days, anonymously,
   with the app's own isHazardTag rule. A row opens its climb. Renders nothing while an area has neither. */
export default function AreaLatestReports({ area, onOpenRoute, C }: AreaLatestReportsProps) {
  const q = useAreaLatestReports(area.id, 4);
  // The report rows, and (from 0428's `refs`) the climbs and authors, are read together once the ids
  // are in: two round trips. Without refs (a database before 0428) climbs and authors wait for the rows.
  const ids = useMemo(() => ((q.data && q.data.ids) || []) as string[], [q.data]);
  const refs = (q.data && q.data.refs) as LatestRef[] | null | undefined;
  const rowsQ = useAreaLatestReportRows(ids);
  const rows = useMemo(() => (rowsQ.data || []) as unknown as LatestRow[], [rowsQ.data]);
  const recentTags = ((q.data && q.data.recentTags) || []) as string[][];
  const refSource = useMemo((): { user_id?: string | null; route_id?: string | null }[] => refs || rows, [refs, rows]);
  const userIds = useMemo(() => [...new Set(refSource.map(r => r.user_id).filter((x): x is string => !!x))], [refSource]);
  const routeIds = useMemo(() => [...new Set(refSource.map(r => r.route_id).filter((x): x is string => !!x))], [refSource]);
  const profQ = useProfilesByIds(userIds);
  const routesQ = useRoutesByIds(routeIds);
  const profById = useMemo(() => { const m: Record<string, unknown> = {}; ((profQ.data || []) as { id: string }[]).forEach(p => { m[p.id] = p; }); return m; }, [profQ.data]);
  const routeById = useMemo(() => { const m: Record<string, LatestRoute> = {}; ((routesQ.data || []) as LatestRoute[]).forEach(r => { m[r.id] = r; }); return m; }, [routesQ.data]);
  const hazardCount = recentTags.filter(tags => tags.some(t => isHazardTag(normTag(t)))).length;

  if (q.isLoading || (ids.length > 0 && rowsQ.isLoading)) return <div style={{ marginTop: 14 }}><LoadingRows C={C} label="Loading the latest reports…" rows={2} /></div>;
  if (q.isError || rowsQ.isError) return <div role="alert" style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "10px 12px", borderRadius: 12, border: "1px solid " + C.border, background: C.card, fontSize: 12.5, color: C.text }}>
    <span style={{ flex: "1 1 200px", minWidth: 0 }}>Couldn’t load the latest reports for this area.</span>
    <button onClick={() => { if (q.isError) q.refetch(); else rowsQ.refetch(); }} style={{ ...BTN, border: "1px solid " + C.border, background: C.surface, color: C.blue }}>Retry</button>
  </div>;
  if (!rows.length && !hazardCount) return null;

  return (
    <section aria-label={"Latest from " + (area.name || "this area")} style={{ marginTop: 14, background: C.card, borderRadius: 12, border: "1px solid " + (hazardCount ? C.red + "55" : C.border), padding: "12px 13px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginBottom: rows.length ? 8 : 0 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: C.label, textTransform: "uppercase", letterSpacing: 0.4 }}>Latest from this area</div>
        {hazardCount ? <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 700, color: C.red, background: C.redBg, borderRadius: 999, padding: "2px 9px" }}><span aria-hidden="true" style={{ display: "inline-flex" }}><ActionIcon name="alert" size={12} color="currentColor" /></span>{hazardCount + " hazard report" + (hazardCount !== 1 ? "s" : "") + " · last " + RECENT_DAYS + " days"}</span> : null}
      </div>
      {rows.map(r => {
        const a = tripRowToActivity(r, (r.user_id && profById[r.user_id]) || null) as LatestActivity;
        const rt = routeById[r.route_id];
        const haz = (a.condTags || []).some(t => isHazardTag(normTag(t)));
        const outcome = a.summited ? "Summit" : a.tickType || null;
        const open = () => onOpenRoute((rt || { id: r.route_id, name: "", _thin: true }) as unknown as RouteRowRoute);
        return <div key={r.id} {...clickable(open)} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 2px", borderTop: "1px solid " + C.borderLight, cursor: "pointer" }}>
          <Av src={a.avatar} size={30} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.text, overflowWrap: "anywhere" }}>{rt && rt.name ? rt.name : "A climb here"}</span>
              {outcome ? <span style={{ fontSize: 10.5, fontWeight: 800, color: a.summited ? C.green : C.textSub, background: a.summited ? C.greenBg : C.surface, borderRadius: 999, padding: "1px 7px" }}>{outcome}</span> : null}
              {haz ? <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10.5, color: C.red, fontWeight: 800 }}><span aria-hidden="true" style={{ display: "inline-flex" }}><ActionIcon name="alert" size={11} color="currentColor" /></span>Hazard</span> : null}
            </div>
            <div style={{ fontSize: 11.5, color: C.textMuted }}>{[a.user, fmtDate(a.date)].filter(Boolean).join(" · ")}</div>
            {a.text ? <div style={{ fontSize: 12, color: C.textSub, marginTop: 2, lineHeight: 1.45, overflowWrap: "anywhere" }}>{plain(a.text)}</div> : null}
          </div>
        </div>;
      })}
    </section>
  );
}
