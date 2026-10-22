import { C, DB_UID, ME, pubName, seedAuthor, topContributors } from "../../ClimbMatchCore.jsx";
import { useAreaTopContributors, useProfilesByIds } from "../../lib/db.js";
import { USE_DB } from "../../lib/supabase.js";
import { clickable } from "../../lib/clickable";
import ActionIcon from "./ActionIcon.tsx";
import Av from "./Av.tsx";

/** One `area_top_contributors` row: the contributor's auth uid and their POINTS in the area's subtree. */
interface DbTopRow { contributor: string; n: number; }
/** The slice of the `useAreaTopContributors` result this component reads. */
interface TopQuery { data?: DbTopRow[] | null; isLoading?: boolean; isError?: boolean; }
/** The columns of a `fetchProfilesByIds` row this component reads (`showName` is mapped from `show_name`). */
interface ProfileRow { id: string; name?: string | null; username?: string | null; showName?: boolean; avatar?: string | null; }
/** The slice of the `useProfilesByIds` result this component reads. */
interface ProfilesQuery { data?: ProfileRow[] | null; }
/** A DB board row: `count` is points; `_real` is false when the contributor's profile did not resolve. */
interface DbBoardRow { id: string; name: string; username: string; showName: boolean; avatar: string; count: number; _real: boolean; }
/** A seed board row: a tally by display name. */
interface SeedBoardRow { id?: undefined; name: string; avatar: string; count: number; _real?: undefined; }
type BoardRow = DbBoardRow | SeedBoardRow;
/** A real contributor other than you, opened by uid. */
interface RealContributor { id: string; name: string; username: string; showName: boolean; avatar: string; _real: true; }
/** Who a tapped row opens: you, another real climber, or a seed climber. */
export type ContributorProfile = typeof ME | RealContributor | NonNullable<ReturnType<typeof seedAuthor>>;

export interface TopContributorsProps {
  /** The area whose subtree is ranked (a DB area id, or a seed `MOUNTAINS` id on the seed path). */
  areaId?: string | null;
  /** Seed path only: your own contributions this session, each counted to you. */
  contribs?: { routeId?: string | number | null }[];
  /** Seed path only: sun reports by route id. */
  sunReports?: Record<string, { uid?: number | string; name?: string; avatar?: string }[]>;
  /** Bottom margin; 8 when unset. */
  mb?: number;
  /** The heading; "TOP CONTRIBUTORS" when unset. */
  title?: string;
  /** Opens a contributor's profile; rows are not tappable without it. */
  onViewProfile?: (climber: ContributorProfile) => void;
  /** The tighter variant the route page's Overview uses. */
  compact?: boolean;
}

/**
 * TOP CONTRIBUTORS: the three climbers with the most points in an area (the DB `area_top_contributors` rpc with
 * names from `useProfilesByIds`; a tally over the seed routes on the seed path), gold-silver-bronze. Renders
 * nothing while the DB read is in flight, says so when it failed, and invites the first contribution when empty.
 */
export default function TopContributors({ areaId, contribs, sunReports, mb, title, onViewProfile, compact }: TopContributorsProps) {
  const dbTop: TopQuery = useAreaTopContributors(USE_DB ? areaId : null, 3);
  const dbIds: string[] = (USE_DB && dbTop.data) ? dbTop.data.map(function (r) { return r.contributor; }) : [];
  const dbProfiles: ProfilesQuery = useProfilesByIds(dbIds);
  const top: BoardRow[] = (USE_DB && dbTop.data && dbTop.data.length) ? dbTop.data.map(function (r) { const p = (dbProfiles.data || []).find(function (pp) { return pp.id === r.contributor; }); return { id: r.contributor, name: p ? (pubName(p) || "Climber") : "Climber", username: (p && p.username) || "", showName: !!(p && p.showName), avatar: (p && p.avatar) || "", count: r.n, _real: !!p }; }) : topContributors(areaId, contribs, sunReports, 3);
  /* The board used to return null when empty — and the live contributions ledger IS empty, so it had vanished from every area in every state. It now always renders once the read settles: an empty board says so and invites the first contribution, a failed read says it failed (never "nobody yet"), and only an in-flight read renders nothing. */
  if (USE_DB && areaId && dbTop.isLoading) return null;
  const contribsUnavailable = USE_DB && !!areaId && dbTop.isError && !top.length;
  const medal = ["#d4af37", "#c0c0c0", "#cd7f32"];
  return <div style={{background:compact?C.surface:C.card,borderRadius:12,padding:compact?"10px 12px":"12px 14px",border:"1px solid "+C.border,marginBottom:mb!=null?mb:8}}><div style={{fontSize:compact?11:12,fontWeight:700,letterSpacing:compact?0.4:0,color:compact?C.textMuted:C.blue,marginBottom:compact?8:10}}>{title||"TOP CONTRIBUTORS"}</div>{contribsUnavailable?<div style={{fontSize:12.5,color:C.textMuted,lineHeight:1.5}}>Couldn't load contributors just now — check your connection and try again.</div>:!top.length?<div style={{display:"flex",alignItems:"center",gap:9}}><span style={{width:18,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}><ActionIcon name="award" size={15} color={C.textMuted}/></span><div style={{fontSize:compact?12:12.5,color:C.textSub,lineHeight:1.5}}>No contributors here yet. Add a photo or a correction to a climb in this area and you'll be first on this board.</div></div>:null}{top.map(function(c,i){/* A real contributor opens THEIR profile by uid (a resolved row only); your own row opens yours. */const cl:ContributorProfile|null=c._real?(c.id===DB_UID?ME:{id:c.id,name:c.name,username:c.username,showName:c.showName,avatar:c.avatar,_real:true}):seedAuthor(c.name);const open=(onViewProfile&&cl)?function(){onViewProfile(cl);}:undefined;return <div key={c.id||c.name} {...clickable(open)} style={{display:"flex",alignItems:"center",gap:9,marginTop:i?9:0,cursor:open?"pointer":"default"}}><span style={{width:18,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}><ActionIcon name="award" size={15} color={medal[i]}/></span><Av src={c.avatar} size={compact?22:26}/><div style={{flex:1,minWidth:0}}><div style={{fontSize:compact?12.5:13.5,fontWeight:700,color:C.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{c.name}</div>{(i===0&&!compact)?<span style={{display:"inline-block",fontSize:12,fontWeight:700,color:C.amber,background:C.amberBg,padding:"1px 7px",borderRadius:9,letterSpacing:0.3,marginTop:2}}>★ Top Contributor</span>:null}</div><span style={{fontSize:12,fontWeight:700,color:C.textMuted,flexShrink:0}}>{c._real?c.count+" pts":c.count}</span></div>;})}</div>;
}
