import { C, unfinishedRoutes } from "../../ClimbMatchCore.jsx";
import { clickable } from "../../lib/clickable";
import Chevron from "./Chevron.tsx";

/** The route a row opens; `unfinishedRoutes` resolves it from the log's `routeId`. */
export interface RetryRoute {
  id: string | number;
  name: string;
}

/** One row of `unfinishedRoutes()`: the route, whether the current month is one of its best, and those months. */
interface UnfinishedRow {
  r: RetryRoute;
  inSeason: boolean;
  bm: string[];
}

export interface RetryReminderProps {
  /** The climber's logs (each with `routeId` and `tickType`). */
  logs: unknown[] | null | undefined;
  /** Routes by id: a lookup function, or an array `unfinishedRoutes` searches by `id`. */
  routes: ((id: string) => RetryRoute | undefined) | RetryRoute[] | null | undefined;
  onOpen: (route: RetryRoute) => void;
  /** Home's "Back in season" variant: only routes whose best months include now. */
  compact?: boolean;
}

/**
 * UNFINISHED BUSINESS (or, compact, BACK IN SEASON): routes the climber attempted but never topped out, in-season
 * ones first, each row opening the route. Renders nothing when there is nothing to retry.
 */
export default function RetryReminder({ logs, routes, onOpen, compact }: RetryReminderProps) {
  const u: UnfinishedRow[] = unfinishedRoutes(logs, routes);
  if (!u.length) return null;
  u.sort(function (a, b) { return (b.inSeason ? 1 : 0) - (a.inSeason ? 1 : 0); });
  const show = compact ? u.filter(function (x) { return x.inSeason; }) : u;
  if (!show.length) return null;
  return <div>
    <div style={{fontSize:13,fontWeight:800,letterSpacing:0.4,textTransform:"uppercase",color:C.text,borderLeft:"3px solid "+C.blue,paddingLeft:9,margin:"2px 0 9px"}}>{compact?"Back in season":"Unfinished business"}</div>
    <div style={{background:C.card,borderRadius:12,padding:12,marginBottom:14,border:"1px solid "+C.border}}>
    <div style={{fontSize:12,color:C.textMuted,marginBottom:8}}>{compact?"You turned around — it's worth another go now":"Climbs you attempted but haven't topped out"}</div>
    {show.map(function(x,ix){return <div key={x.r.id} {...clickable(function(){onOpen(x.r);})} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"9px 0",cursor:"pointer",borderTop:ix?"1px solid "+C.border:"none"}}>
      <div style={{minWidth:0}}><div style={{fontSize:13.5,fontWeight:700,color:C.text}}>{x.r.name}</div><div style={{fontSize:11,color:C.textMuted,marginTop:2}}>{x.bm.length?"Best: "+x.bm.join(", "):"Give it another go"}</div></div>
      {x.inSeason?<span style={{fontSize:10,fontWeight:800,color:C.green,background:C.greenBg,padding:"3px 8px",borderRadius:8,whiteSpace:"nowrap",marginLeft:8}}>IN SEASON</span>:<span style={{marginLeft:8,display:"flex"}}><Chevron color={C.textMuted}/></span>}
    </div>;})}
    </div>
  </div>;
}
