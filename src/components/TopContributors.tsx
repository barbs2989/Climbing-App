import { C, DB_UID, ME, pubName, seedAuthor, topContributors } from "../../ClimbMatchCore.jsx";
import { useAreaTopContributors, useProfilesByIds } from "../../lib/db.js";
import { USE_DB } from "../../lib/supabase.js";
import { clickable } from "../../lib/clickable";
import ActionIcon from "./ActionIcon.tsx";
import Av from "./Av.tsx";

/** One row of `area_top_contributors` (0148): a contributor's auth uid and their points. */
interface DbTopRow { contributor: string; n: number; }
/** The slice of the `useAreaTopContributors` result this component reads. */
interface TopQuery { data?: DbTopRow[]; isLoading?: boolean; isError?: boolean; }
/** The profile columns a row reads (`useProfilesByIds`). */
interface DbProfile { id: string; name?: string; username?: string; showName?: boolean; avatar?: string; }
/** One line of the board. A DB row carries the uid and `_real`; a seed row is name, avatar and count only. */
interface BoardRow { id?: string; name: string; username?: string; showName?: boolean; avatar: string; count: number; _real?: boolean; }
/** A real contributor, opened by uid. */
interface RealContributor { id?: string; name: string; username?: string; showName?: boolean; avatar: string; _real: true; }
/** Who a row opens: you, a seed climber, or a real contributor. */
export type ProfileTarget = NonNullable<ReturnType<typeof seedAuthor>> | RealContributor;

export interface TopContributorsProps {
  /** The area whose board this is (a DB area id, or a seed `MOUNTAINS` id). */
  areaId: string;
  /** Seed path: your session's contributions, each scored when its route lies in the area. */
  contribs?: { routeId?: string | number }[];
  /** Seed path: sun-on-route reports by route id. */
  sunReports?: Record<string, { uid?: number; name?: string; avatar?: string }[]>;
  /** Bottom margin; 8 when unset. */
  mb?: number;
  title?: string;
  /** Opens a profile; a row with nobody to open is not clickable. */
  onViewProfile?: (climber: ProfileTarget) => void;
  /** The route page's quieter card: same three rows, no gold pill. */
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
export default function TopContributors({areaId,contribs,sunReports,mb,title,onViewProfile,compact}: TopContributorsProps){
  const dbTop: TopQuery = useAreaTopContributors(USE_DB?areaId:null,3);
  const dbIds = (USE_DB&&dbTop.data)?dbTop.data.map(function(r){return r.contributor;}):[];
  const dbProfiles: { data?: DbProfile[] } = useProfilesByIds(dbIds);
  const top: BoardRow[] = (USE_DB&&dbTop.data&&dbTop.data.length)?dbTop.data.map(function(r){const p=(dbProfiles.data||[]).find(function(pp){return pp.id===r.contributor;});return {id:r.contributor,name:p?(pubName(p)||"Climber"):"Climber",username:(p&&p.username)||"",showName:!!(p&&p.showName),avatar:(p&&p.avatar)||"",count:r.n,_real:!!p};}):topContributors(areaId,contribs,sunReports,3);
  /* The board used to return null when empty — and the live contributions ledger IS empty, so it had vanished from every area in every state. It now always renders once the read settles: an empty board says so and invites the first contribution, a failed read says it failed (never "nobody yet"), and only an in-flight read renders nothing. */
  if(USE_DB&&areaId&&dbTop.isLoading)return null;
  const contribsUnavailable=USE_DB&&!!areaId&&dbTop.isError&&!top.length;
  const medal=["#d4af37","#c0c0c0","#cd7f32"];
  return <div style={{background:compact?C.surface:C.card,borderRadius:12,padding:compact?"10px 12px":"12px 14px",border:"1px solid "+C.border,marginBottom:mb!=null?mb:8}}><div style={{fontSize:compact?11:12,fontWeight:700,letterSpacing:compact?0.4:0,color:compact?C.textMuted:C.blue,marginBottom:compact?8:10}}>{title||"TOP CONTRIBUTORS"}</div>{contribsUnavailable?<div style={{fontSize:12.5,color:C.textMuted,lineHeight:1.5}}>Couldn't load contributors just now — check your connection and try again.</div>:!top.length?<div style={{display:"flex",alignItems:"center",gap:9}}><span style={{width:18,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}><ActionIcon name="award" size={15} color={C.textMuted}/></span><div style={{fontSize:compact?12:12.5,color:C.textSub,lineHeight:1.5}}>No contributors here yet. Add a photo or a correction to a climb in this area and you'll be first on this board.</div></div>:null}{top.map(function(c: BoardRow,i: number){/* A real contributor opens THEIR profile by uid (a resolved row only); your own row opens yours. */const cl: ProfileTarget | null = c._real?(c.id===DB_UID?ME:{id:c.id,name:c.name,username:c.username,showName:c.showName,avatar:c.avatar,_real:true}):seedAuthor(c.name);const open=(onViewProfile&&cl)?function(){onViewProfile(cl);}:undefined;return <div key={c.id||c.name} {...clickable(open)} style={{display:"flex",alignItems:"center",gap:9,marginTop:i?9:0,cursor:open?"pointer":"default"}}><span style={{width:18,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}><ActionIcon name="award" size={15} color={medal[i]}/></span><Av src={c.avatar} size={compact?22:26}/><div style={{flex:1,minWidth:0}}><div style={{fontSize:compact?12.5:13.5,fontWeight:700,color:C.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{c.name}</div>{(i===0&&!compact)?<span style={{display:"inline-block",fontSize:12,fontWeight:700,color:C.amber,background:C.amberBg,padding:"1px 7px",borderRadius:9,letterSpacing:0.3,marginTop:2}}>★ Top Contributor</span>:null}</div><span style={{fontSize:12,fontWeight:700,color:C.textMuted,flexShrink:0}}>{c._real?c.count+" pts":c.count}</span></div>;})}</div>;
}
