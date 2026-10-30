import { useContext, useState } from "react";
import { ClimberCtx } from "../../lib/climberCtx.js";
import { useRecentRouteIds } from "../../lib/recent";
import { useScopedWishlistRoutes, useSubtreeRoutes, useRoutesByIds } from "../../lib/db";
import { DISCIPLINES, placeOf } from "../../lib/areaBrowserShared.js";
import Chevron from "./Chevron.tsx";
import RouteRow from "./RouteRow.tsx";

// Suggested Climbs: mirrors the static catalog's SuggestedClimbs (ClimbMatch.jsx)
// — same layout/copy, but sourced from useScopedWishlistRoutes/useSubtreeRoutes
// instead of the in-memory ROUTES array. `profile`/`completedIds`/`rankSuggested`
// are computed once in App (grade/gain scoring lives in ClimbMatch.jsx, which
// this file doesn't import — see its own header comment on why) and read from ClimberCtx.
export default function DbSuggestedClimbs({ area, onOpen, C }) {
  const { profile, completedIds, wishlist, rankSuggested, discSlots } = useContext(ClimberCtx);
  // Collapsed until the climber opens it — the user's call (2026-09-30): the rows are one tap
  // away behind the "Suggested climbs · N" header, never spread across the area page by default.
  const [open, setOpen] = useState(false);
  const recentIds = useRecentRouteIds();
  const { data: objRoutes } = useScopedWishlistRoutes(area, wishlist);
  /* THE POOL IS NO LONGER FILTERED BY DISCIPLINE, and that is the actual fix.
     It used to be `{disc: profile.disc}` — the single most-logged discipline — so every other
     discipline was excluded by the QUERY and no amount of client-side ranking could recover
     it. Now one mixed pool comes back and `rankSuggested` (which already filters on catOf)
     picks per slot. Same one round trip, so the multi-discipline rows cost nothing extra.
     pageSize is up from 30 because the 30 now have to cover every discipline, not one. */
  const { data: pool } = useSubtreeRoutes(area.id, { sortBy: "name", pageSize: 120 });
  /* Recently-opened climbs, twice over, because the two answers are different questions.
     Scoped: which of them are in THIS area — that is the "pick up where you left off" row.
     Unscoped: what has this climber been looking at ANYWHERE — that is the taste that earns a
     discipline a row here even when every climb they browsed was in another range. Both are
     `.in("id", …)` over at most RECENT_MAX primary keys, so neither is an expensive read. */
  const { data: recentScoped } = useScopedWishlistRoutes(area, recentIds);
  const { data: recentAll } = useRoutesByIds(recentIds);
  const objectives = (objRoutes || []).filter(r => !completedIds.has(r.id));
  const objIds = new Set(objectives.map(r => r.id));
  /* Keep the click order the climber actually produced. The query returns rows in whatever
     order Postgres hands back, and "recent" is a claim about sequence — sorting by the stored
     position is the only thing that makes the heading true. */
  const recentPos = {}; (recentIds || []).forEach((id, i) => { recentPos[id] = i; });
  const recent = (recentScoped || [])
    .filter(r => !completedIds.has(r.id) && !objIds.has(r.id))
    .sort((a, b) => (recentPos[a.id] ?? 99) - (recentPos[b.id] ?? 99))
    .slice(0, 5);
  const recentSet = new Set(recent.map(r => r.id));
  const candidates = (pool || []).filter(r => !completedIds.has(r.id) && !(wishlist || []).includes(r.id) && !recentSet.has(r.id));
  /* One climb, one row — two slots can rank the same route and a repeated name reads as a bug. */
  const slots = discSlots ? discSlots(profile, recentAll || []) : [];
  const claimed = {};
  const bands = slots.map(s => {
    const rows = rankSuggested(candidates.filter(r => !claimed[r.id]), s, { limit: 5 });
    rows.forEach(r => { claimed[r.id] = 1; });
    return { slot: s, rows };
  }).filter(b => b.rows.length);
  const popular = (!objectives.length && !recent.length && !bands.length) ? [...candidates].sort((a, b) => (b.stars || 0) - (a.stars || 0)).slice(0, 5) : [];
  const total = objectives.length + recent.length + bands.reduce((n, b) => n + b.rows.length, 0) + popular.length;
  if (!total) return null;
  const lbl = { fontSize: 11.5, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.3, margin: "2px 0 7px" };
  const discLabel = d => (DISCIPLINES.find(x => x[0] === d) || [, d])[1];
  /* Two headings, because they are two different claims and only one of them can be true of a
     climb you have actually done. Never say "you've been climbing X" off a page view. */
  const bandTitle = s => (s.src === "viewed" ? "Because you've been looking at " : "Because you've been climbing ") + discLabel(s.disc);
  return (
    <div style={{ marginTop: 14 }}>
      <button onClick={() => setOpen(o => !o)} aria-expanded={open} style={{minHeight:44, width: "100%", display: "flex", alignItems: "center", gap: 9, background: C.surface, border: "1px solid " + C.border, borderRadius: 12, padding: "11px 13px", cursor: "pointer" }}>
        <span style={{ flex: 1, textAlign: "left", fontSize: 13.5, fontWeight: 700, color: C.text }}>{"Suggested climbs · " + total}</span>
        <Chevron open={open} color={C.blue} />
      </button>
      {open ? (
        <div style={{ marginTop: 9 }}>
          {objectives.length ? <div><div style={lbl}>From your objectives</div>{objectives.map(r => <RouteRow key={r.id} r={r} onOpen={onOpen} C={C} areaName={placeOf(r)} />)}</div> : null}
          {recent.length ? <div><div style={lbl}>Pick up where you left off</div>{recent.map(r => <RouteRow key={r.id} r={r} onOpen={onOpen} C={C} />)}</div> : null}
          {bands.map(b => <div key={b.slot.src + ":" + b.slot.disc}><div style={lbl}>{bandTitle(b.slot)}</div>{b.rows.map(r => <RouteRow key={r.id} r={r} onOpen={onOpen} C={C} />)}</div>)}
          {/* `popular` sorts on (stars || 0), and only 6 routes in the whole 205k catalog carry
              a star rating -- so for essentially every area every candidate ties at 0, the sort
              is a no-op, and a stable sort hands back the pool's own order, which is sortBy:"name".
              Calling five alphabetically-first routes "Popular in this area" invents a signal we
              do not have. Claim popularity only when the rows actually carry it. */}
          {popular.length ? <div><div style={lbl}>{popular.some(r => r.stars) ? "Popular in this area" : "More climbs in this area"}</div>{popular.map(r => <RouteRow key={r.id} r={r} onOpen={onOpen} C={C} />)}</div> : null}
        </div>
      ) : null}
    </div>
  );
}
