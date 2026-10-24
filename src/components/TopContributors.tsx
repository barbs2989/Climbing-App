import { C, DB_UID, ME, pubName, seedAuthor, topContributors } from "../../ClimbMatchCore.jsx";
import { useAreaTopContributors, useProfilesByIds } from "../../lib/db.js";
import { USE_DB } from "../../lib/supabase.js";
import { clickable } from "../../lib/clickable";
import ActionIcon from "./ActionIcon.tsx";
import Av from "./Av.tsx";

/** One row of the `area_top_contributors` rpc: a contributor's uid and their POINTS (`n`, from contribution_points()). */
interface TopRow { contributor: string; n: number; }
/** The slice of a `useAreaTopContributors` result this component reads. */
interface TopQuery { data?: TopRow[] | null; isLoading?: boolean; isError?: boolean; }
/** A `profiles` row as `fetchProfilesByIds` maps it (snake_case kept, `showName` added). */
interface ProfileRow { id: string; name?: string | null; username?: string | null; showName?: boolean; avatar?: string | null; }
interface ProfilesQuery { data?: ProfileRow[] | null; }
/** One board entry: a resolved real profile (`_real`, `count` is points) or a seed name (`count` is a tally). */
interface TopEntry { id?: string; name: string; username?: string; showName?: boolean; avatar?: string; count: number; _real?: boolean; }
/** What `onViewProfile` is handed: the signed-in account (`ME`), a resolved real profile, or a seed climber. */
export interface ViewableClimber { id?: number | string | null; name?: string | null; username?: string; showName?: boolean; avatar?: string; _real?: boolean; }
/** A seed-path contribution: only its route matters here. */
export interface SeedContribution { routeId?: string | number | null; }
/** Seed-path sun reports, keyed by route id. */
export interface SeedSunReport { uid?: number | string | null; name?: string | null; avatar?: string | null; }

export interface TopContributorsProps {
  /** The DB area id (or the seed mountainId) whose board this is; empty renders the seed tally over nothing. */
  areaId?: string | number | null;
  contribs?: SeedContribution[] | null;
  sunReports?: Record<string, SeedSunReport[]> | null;
  /** Bottom margin in px (default 8). */
  mb?: number | null;
  /** Replaces the TOP CONTRIBUTORS heading. */
  title?: string | null;
  onViewProfile?: (climber: ViewableClimber) => void;
  /** The route page's tighter variant: smaller type, no ★ Top Contributor pill. */
  compact?: boolean;
}

/* The area's contributor leaderboard. Two callers, and they want different weights:
   the area page is where this belongs and gets the full card, while the route page shows
   it as the last thing above that tab's Discussion and passes `compact` — the same three
   rows, quieter, with no gold pill. Before #NNN it rendered at the foot of RouteDetail on
   EVERY sub-tab (Partners included, where an area leaderboard reads as "people to climb
   with") and above both Emergency & rescue and Discussion, because ClimbMatch.jsx mounts
   those after RouteDetail. It is now mounted from there, on the four tabs that carry a
   Discussion minus Partners.

   What the number counts, DB path (area_top_contributors, 0148): one point per (route, field)
   a climber corrected — however many times they filed it, since the ledger is append-only and
   refining one value writes several rows about one fact — plus one per photo/report/rating,
   which really are separate artifacts. Anonymous rows score nothing, in BOTH spellings: the
   literal "anon" and the NULL a genuinely anonymous INSERT leaves. Seed fallback: one per
   activity/comment/photo row, undeduplicated; the two paths never mix, so they are not meant
   to agree. Two things it still does NOT weigh, each for a recorded reason in 0148 — whether
   a contribution was ACCEPTED (`status` is 'pending' for every kind by design, so filtering
   on it would empty the board; field consensus is computed here in the client, not in the DB)
   and trip reports (they are `climb_logs`, author-only under RLS, so counting them means
   reading private rows through a definer function — a privacy call, not a ranking tweak).

   The row opens a profile only when there IS one to open. It used to carry cursor:pointer
   and an onClick unconditionally, and the DB path names contributors by auth uid, so a real
   contributor never matched the seed CLIMBERS array and the click did nothing at all — the
   dead-interaction shape. Resolution goes through seedAuthor rather than a bare
   `ME.name===c.name?ME`, so a real account that happens to share a seed climber's display
   name does not open its own profile from someone else's row. */
/**
 * TOP CONTRIBUTORS for an area: the three climbers with the most contribution points (the DB rpc), or on the seed
 * path a tally of seed activity. Always renders once the read settles — an empty board invites the first
 * contribution, a failed read says it failed — and a row opens that climber's profile.
 */
export default function TopContributors({ areaId, contribs, sunReports, mb, title, onViewProfile, compact }: TopContributorsProps) {
  const dbTop: TopQuery = useAreaTopContributors(USE_DB ? areaId : null, 3);
  const dbIds = (USE_DB && dbTop.data) ? dbTop.data.map(function (r) { return r.contributor; }) : [];
  const dbProfiles: ProfilesQuery = useProfilesByIds(dbIds);
  const top: TopEntry[] = (USE_DB && dbTop.data && dbTop.data.length) ? dbTop.data.map(function (r) { const p = (dbProfiles.data || []).find(function (pp) { return pp.id === r.contributor; }); return { id: r.contributor, name: p ? (pubName(p) || "Climber") : "Climber", username: (p && p.username) || "", showName: !!(p && p.showName), avatar: (p && p.avatar) || "", count: r.n, _real: !!p }; }) : topContributors(areaId, contribs, sunReports, 3);
  /* The board used to return null when empty — and the live contributions ledger IS empty, so it had vanished from every area in every state. It now always renders once the read settles: an empty board says so and invites the first contribution, a failed read says it failed (never "nobody yet"), and only an in-flight read renders nothing. */
  if (USE_DB && areaId && dbTop.isLoading) return null;
  const contribsUnavailable = USE_DB && !!areaId && dbTop.isError && !top.length;
  const medal = ["#d4af37", "#c0c0c0", "#cd7f32"];
  return <div style={{background:compact?C.surface:C.card,borderRadius:12,padding:compact?"10px 12px":"12px 14px",border:"1px solid "+C.border,marginBottom:mb!=null?mb:8}}><div style={{fontSize:compact?11:12,fontWeight:700,letterSpacing:compact?0.4:0,color:compact?C.textMuted:C.blue,marginBottom:compact?8:10}}>{title||"TOP CONTRIBUTORS"}</div>{contribsUnavailable?<div style={{fontSize:12.5,color:C.textMuted,lineHeight:1.5}}>Couldn't load contributors just now — check your connection and try again.</div>:!top.length?<div style={{display:"flex",alignItems:"center",gap:9}}><span style={{width:18,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}><ActionIcon name="award" size={15} color={C.textMuted}/></span><div style={{fontSize:compact?12:12.5,color:C.textSub,lineHeight:1.5}}>No contributors here yet. Add a photo or a correction to a climb in this area and you'll be first on this board.</div></div>:null}{top.map(function(c,i){/* A real contributor opens THEIR profile by uid (a resolved row only); your own row opens yours. */const cl: ViewableClimber | null = c._real?(c.id===DB_UID?ME:{id:c.id,name:c.name,username:c.username,showName:c.showName,avatar:c.avatar,_real:true}):seedAuthor(c.name);const open=(onViewProfile&&cl)?function(){onViewProfile(cl);}:undefined;return <div key={c.id||c.name} {...clickable(open)} style={{display:"flex",alignItems:"center",gap:9,marginTop:i?9:0,cursor:open?"pointer":"default"}}><span style={{width:18,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}><ActionIcon name="award" size={15} color={medal[i]}/></span><Av src={c.avatar} size={compact?22:26}/><div style={{flex:1,minWidth:0}}><div style={{fontSize:compact?12.5:13.5,fontWeight:700,color:C.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{c.name}</div>{(i===0&&!compact)?<span style={{display:"inline-block",fontSize:12,fontWeight:700,color:C.amber,background:C.amberBg,padding:"1px 7px",borderRadius:9,letterSpacing:0.3,marginTop:2}}>★ Top Contributor</span>:null}</div><span style={{fontSize:12,fontWeight:700,color:C.textMuted,flexShrink:0}}>{c._real?c.count+" pts":c.count}</span></div>;})}</div>;
}
