import { useContext, useState } from "react";
import { ClimberCtx } from "../../lib/climberCtx.js";
import { useRecentRouteIds } from "../../lib/recent";
import { useScopedWishlistRoutes, useSubtreeRoutes, useRoutesByIds, useAreaClassics, useAreaClimbStats } from "../../lib/db";
import { BTN } from "../../lib/buttonStyles.js";
import LoadingRows from "./LoadingRows.tsx";
import { DISCIPLINES, placeOf } from "../../lib/areaBrowserShared.js";
import { displayGrade, splitProtection } from "../../lib/grade";
import Chevron from "./Chevron.tsx";
import RouteRow from "./RouteRow.tsx";
import type { RouteRowRoute } from "./RouteRow.tsx";
import type { C as Palette } from "../../ClimbMatchCore.jsx";

interface DbSuggestedClimbsRow extends RouteRowRoute { id: string | number }
export interface DbSuggestedClimbsProps {
  /** The area page the suggestions sit on. */
  area: { id: string; name?: string; area_type?: string; disciplines?: string[] | null };
  onOpen: (r: RouteRowRoute) => void;
  C: typeof Palette;
}

// Suggested Climbs: mirrors the static catalog's SuggestedClimbs (ClimbMatch.jsx)
// — same layout/copy, but sourced from useScopedWishlistRoutes/useSubtreeRoutes
// instead of the in-memory ROUTES array. `profile`/`completedIds`/`rankSuggested`/`slotQuery`/`stated`
// are computed once in App (grade/gain scoring lives in ClimbMatch.jsx, which
// this file doesn't import — see its own header comment on why) and read from ClimberCtx.
export default function DbSuggestedClimbs({ area, onOpen, C }: DbSuggestedClimbsProps) {
  const { profile, completedIds, wishlist, rankSuggested, discSlots, slotQuery, stated } = useContext(ClimberCtx);
  // Collapsed until the climber opens it — the user's call (2026-09-30): the rows are one tap
  // away behind the "Suggested climbs · N" header, never spread across the area page by default.
  const [open, setOpen] = useState(false);
  const recentIds = useRecentRouteIds();
  const { data: objRoutes } = useScopedWishlistRoutes(area, wishlist);
  /* THE AREA'S CLASSICS ARE THE QUALITY SIGNAL. area_classics is the ranked list the area page's Classics
     section already reads — same key, so on a page that shows it this is the cached answer, not a
     second read — and it goes FIRST in every slot's candidates, ahead of that slot's own pool. Same gate as
     the area page: never over a whole country or the world. */
  const scoped = !["world", "country"].includes(area.area_type || "");
  const classicsQ = useAreaClassics(area.id, scoped);
  const classics = classicsQ.data;
  /* Recently-opened climbs, twice over, because the two answers are different questions.
     Scoped: which of them are in THIS area — that is the "pick up where you left off" row.
     Unscoped: what has this climber been looking at ANYWHERE — that is the taste that earns a
     discipline a row here even when every climb they browsed was in another range. Both are
     `.in("id", …)` over at most RECENT_MAX primary keys, so neither is an expensive read. */
  const { data: recentScoped } = useScopedWishlistRoutes(area, recentIds);
  const { data: recentAll } = useRoutesByIds(recentIds);
  /* The discipline slots: what the climber has LOGGED, then the grades STATED on their profile, then what
     they have been browsing (suggestDiscSlots). */
  /* WHICH DISCIPLINES THIS AREA HAS, so no slot is spent on one it has no climb of. A crag or peak row lists
     them (`disciplines`); above that the list is empty, and the area page's own climb counts say (the same
     cached read its CLIMBS HERE chart makes). Until that answers there are no slots: firing three reads and
     then swapping them would fetch for rows that are about to be dropped. A failed read means unknown, and
     every slot is kept. */
  const own = Array.isArray(area.disciplines) && area.disciplines.length ? area.disciplines : null;
  const statsQ = useAreaClimbStats(scoped && !own ? area.id : null);
  const byDisc = statsQ.data && Array.isArray(statsQ.data.by_disc) ? (statsQ.data.by_disc as Array<{ disc: string; n: number }>).filter(d => d && Number(d.n) > 0).map(d => d.disc) : null;
  const here = own || byDisc;
  const hereKnown = !!here || !scoped || statsQ.isError;
  const slots = discSlots && hereKnown ? discSlots(profile, recentAll || [], undefined, stated, here) : [];
  /* EVERY SLOT RANKS ITS OWN POOL (2026-11-19). There was one pool for all of them: the area's first 120
     climbs BY NAME. On a region of 8,238 climbs that is the names sorting before "Ai", so "Because you've
     been climbing Sport" was the grade-nearest of whatever happened to start with a quote mark or a digit.
     Each slot now reads its own discipline inside the climber's grade window, best-rated first
     (slotQuery). Three hooks because hooks cannot loop: one per slot SUGGEST_DISC_MAX allows, off when the
     slot is empty. Never over a country or the world, where the read exceeds the statement timeout. */
  const slotOpts = (i: number) => (slots[i] && slotQuery ? slotQuery(slots[i]) : {});
  const slotQ0 = useSubtreeRoutes(scoped && slots[0] && slotQuery ? area.id : null, slotOpts(0));
  const slotQ1 = useSubtreeRoutes(scoped && slots[1] && slotQuery ? area.id : null, slotOpts(1));
  const slotQ2 = useSubtreeRoutes(scoped && slots[2] && slotQuery ? area.id : null, slotOpts(2));
  const slotQs = [slotQ0, slotQ1, slotQ2];
  const objectives = (objRoutes || []).filter(r => !completedIds.has(r.id));
  const objIds = new Set(objectives.map(r => r.id));
  /* Keep the click order the climber actually produced. The query returns rows in whatever
     order Postgres hands back, and "recent" is a claim about sequence — sorting by the stored
     position is the only thing that makes the heading true. */
  const recentPos: Record<string, number> = {}; (recentIds || []).forEach((id, i) => { recentPos[id] = i; });
  const recent = (recentScoped || [])
    .filter((r: DbSuggestedClimbsRow) => !completedIds.has(r.id) && !objIds.has(r.id))
    .sort((a, b) => (recentPos[a.id] ?? 99) - (recentPos[b.id] ?? 99))
    .slice(0, 5);
  const recentSet = new Set(recent.map(r => r.id));
  /* An X or R/X climb is never SUGGESTED, in a ranked row or in the fallback list (suggestTooBold in core says
     why). Your own objectives and the climbs you opened stay: those are your picks, not ours. */
  const tooBold = (r: DbSuggestedClimbsRow) => /X/.test(splitProtection(displayGrade(r)).prot || "");
  const fresh = (r: DbSuggestedClimbsRow) => !completedIds.has(r.id) && !(wishlist || []).includes(r.id) && !recentSet.has(r.id) && !tooBold(r);
  const classicPicks = ((classics || []) as DbSuggestedClimbsRow[]).filter(fresh);
  const classicIds = new Set(classicPicks.map(r => r.id));
  const behindClassics = (rows: unknown) => classicPicks.concat(((rows || []) as DbSuggestedClimbsRow[]).filter(r => fresh(r) && !classicIds.has(r.id)));
  /* One climb, one row — two slots can rank the same route and a repeated name reads as a bug. */
  const claimed: Record<string | number, number> = {};
  const bands = slots.map((s, i) => {
    const rows = rankSuggested(behindClassics(slotQs[i] ? slotQs[i].data : null).filter((r: DbSuggestedClimbsRow) => !claimed[r.id]), s, { limit: 5 });
    rows.forEach(r => { claimed[r.id] = 1; });
    return { slot: s, rows };
  }).filter(b => b.rows.length);
  /* THE UNRANKED POOL, for the "nothing personal to show" row only: every discipline, best-rated first.
     Read only once the slots have answered and ranked nothing (or there are no slots), so a climber
     with personal rows does not pay for a list they will never be shown. */
  const slotsPending = !hereKnown || slotQs.some(q => q.isLoading);
  const poolQ = useSubtreeRoutes(scoped && !slotsPending && !bands.length ? area.id : null, { sortBy: "stars_desc", pageSize: 60 });
  const candidates = behindClassics(poolQ.data);
  const noneYet = !objectives.length && !recent.length && !bands.length && !slotsPending;
  /* The fallback row: the area's classics in their ranked order when it has any, else the pool. */
  const popularFromClassics = noneYet && classicPicks.length > 0;
  const popular = noneYet ? (popularFromClassics ? classicPicks : [...candidates].sort((a, b) => (b.stars || 0) - (a.stars || 0))).slice(0, 5) : [];
  const total = objectives.length + recent.length + bands.reduce((n, b) => n + b.rows.length, 0) + popular.length;
  /* NEVER VANISH ON A FAILED READ. It used to return null whenever nothing ranked, so a pool that
     failed to load hid the whole section with nothing said. Loading and failure now show behind the
     same header; only a loaded, genuinely empty answer renders nothing. */
  const reads = [poolQ, ...slotQs];
  const loading = !total && (!hereKnown || reads.some(q => q.isLoading) || classicsQ.isLoading);
  const failed = !total && !loading && reads.some(q => q.isError) && (!!classicsQ.isError || !classics);
  if (!total && !loading && !failed) return null;
  const retry = () => { reads.forEach(q => { if (q.isError) q.refetch(); }); if (classicsQ.isError) classicsQ.refetch(); };
  const lbl = { fontSize: 11.5, fontWeight: 700, color: C.label, textTransform: "uppercase", letterSpacing: 0.3, margin: "2px 0 7px" };
  // eslint-disable-next-line no-sparse-arrays -- the hole is the fallback pair [, d]: label is d itself
  const discLabel = (d: string) => (DISCIPLINES.find(x => x[0] === d) || [, d])[1];
  /* Three headings, because they are three different claims and only one of them can be true of a
     climb you have actually done. Never say "you've been climbing X" off a page view, or off a grade
     typed into a profile. */
  const bandTitle = (s: { src?: string; disc: string }) => s.src === "stated" ? discLabel(s.disc) + " near the grade on your profile" : (s.src === "viewed" ? "Because you've been looking at " : "Because you've been climbing ") + discLabel(s.disc);
  return (
    <div style={{ margin: "14px 0" }}>
      <button onClick={() => setOpen(o => !o)} aria-expanded={open} style={{minHeight:44, width: "100%", display: "flex", alignItems: "center", gap: 9, background: C.surface, border: "1px solid " + C.border, borderRadius: 12, padding: "11px 13px", cursor: "pointer" }}>
        <span style={{ flex: 1, textAlign: "left", fontSize: 13.5, fontWeight: 700, color: C.text }}>{"Suggested climbs" + (total ? " · " + total : "")}</span>
        <Chevron open={open} color={C.blue} />
      </button>
      {open && loading ? <LoadingRows C={C} label="Finding climbs for you…" rows={3} style={{ padding: "12px 0" }} /> : null}
      {open && failed ? <div role="alert" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 9, padding: "10px 12px", borderRadius: 10, border: "1px solid " + C.border, background: C.card, fontSize: 12.5, color: C.text }}>
        <span style={{ flex: "1 1 200px", minWidth: 0 }}>Couldn’t load suggestions for this area.</span>
        <button onClick={retry} style={{ ...BTN, border: "1px solid " + C.border, background: C.surface, color: C.blue }}>Retry</button>
      </div> : null}
      {open && total ? (
        <div style={{ marginTop: 9 }}>
          {objectives.length ? <div><div style={lbl}>From your objectives</div>{objectives.map(r => <RouteRow key={r.id} r={r} onOpen={onOpen} C={C} areaName={placeOf(r)} />)}</div> : null}
          {recent.length ? <div><div style={lbl}>Pick up where you left off</div>{recent.map(r => <RouteRow key={r.id} r={r} onOpen={onOpen} C={C} />)}</div> : null}
          {bands.map(b => <div key={b.slot.src + ":" + b.slot.disc}><div style={lbl}>{bandTitle(b.slot)}</div>{b.rows.map(r => <RouteRow key={r.id} r={r} onOpen={onOpen} C={C} />)}</div>)}
          {/* `popular` sorts on (stars || 0). Where no candidate carries a star rating the sort is a
              no-op and the rows are simply the pool's own order, so calling them "Popular in this
              area" would invent a signal we do not have. Claim popularity only when the rows carry it. */}
          {popular.length ? <div><div style={lbl}>{popularFromClassics ? "Classics in this area" : popular.some(r => r.stars) ? "Popular in this area" : "More climbs in this area"}</div>{popular.map(r => <RouteRow key={r.id} r={r} onOpen={onOpen} C={C} classicMark={!popularFromClassics} />)}</div> : null}
        </div>
      ) : null}
    </div>
  );
}
