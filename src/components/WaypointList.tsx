import { C, wpPlaced, wpType, wpColor, wpIs, wpGlyph, legMi, ROUTE_GAP, uDistMi, uElev, cumMi } from "../../ClimbMatchCore.jsx";
import ActionIcon from "./ActionIcon.tsx";
import { clickable } from "../../lib/clickable";
import Pill from "./Pill.tsx";

/** One waypoint as the list reads it. */
export interface WaypointListItem {
  name?: string | null;
  type?: string | null;
  lat?: number | string | null;
  lng?: number | string | null;
  elev?: number | null;
  note?: string | null;
  directions?: string | null;
}
export interface WaypointListProps {
  /** The route's waypoints, in walking order. */
  waypoints?: WaypointListItem[] | null;
  /** Focuses a placed waypoint on the map by its index; rows are not tappable without it. */
  onFocus?: ((index: number) => void) | null;
  /** What to say when there are no waypoints. */
  emptyCopy?: string;
  /** Opens the waypoint editor from the empty state. */
  onAdd?: () => void;
}

/* Moved verbatim from RouteDetail.jsx; only the types were added.
   The FLOAT PLAN on Safety is a DROPDOWN (owner, 2026-10-24: "Same with digital float plan"),
   and the last section on the tab: it is what you do once the forecast, the fires and the hazards
   have been read. Closed, it is one amber row that still says WHY — a committing objective, and
   whether you will have signal — so the prompt is not lost by folding it. The body is HIDDEN,
   not unmounted, like AccessFold. */
export default function WaypointList({waypoints,onFocus,emptyCopy,onAdd}: WaypointListProps){
  if(!(waypoints&&waypoints.length))return <div style={{background:C.card,borderRadius:12,padding:"14px 13px",border:`1px dashed ${C.border}`,textAlign:"center"}}><div style={{fontSize:12.5,color:C.textSub,lineHeight:1.6,marginBottom:9}}>{emptyCopy}</div><button onClick={onAdd} style={{padding:"8px 14px",borderRadius:9,border:"none",background:C.blueSolid,color:C.onSolid,fontSize:12.5,fontWeight:700,cursor:"pointer"}}>Add waypoints</button></div>;
  /* The affordance is taught ONCE, here, rather than repeated as a "Show on map" line on
     every row. These rows look like content and behave like controls, and on a phone there
     is no hover to reveal that — but eight identical hints is the clutter the row hint was
     trying to avoid. One line above the list says it for all of them. */
  const anyPlaced=waypoints.some(wpPlaced);
  return <>{(onFocus&&anyPlaced)?<div style={{fontSize:11.5,color:C.textMuted,marginBottom:8,lineHeight:1.45}}>Tap a waypoint to find it on the map.</div>:null}{waypoints.map((wp: WaypointListItem,i: number)=>{
    const _wt=wpType(wp),col=wpColor(_wt),ic=wpIs(wp,"Hazard")?<ActionIcon name="alert" size={16} color={col}/>:wpGlyph(_wt);
    const prevWp=i>0?waypoints[i-1]:null;
    const _samePt=!!(prevWp&&prevWp.lat!=null&&prevWp.lng!=null&&wp.lat!=null&&wp.lng!=null&&Number(prevWp.lat)===Number(wp.lat)&&Number(prevWp.lng)===Number(wp.lng));
    const segMi=(!_samePt&&prevWp)?legMi(prevWp,wp):null;
    const segFt=(!_samePt&&prevWp&&wp.elev!=null&&prevWp.elev!=null)?(wp.elev-prevWp.elev):null;
    const placed=wpPlaced(wp);
    const card={background:C.card,borderRadius:11,padding:"10px 12px",marginBottom:ROUTE_GAP,border:`1px solid ${C.border}`,display:"flex",gap:10};
    const act=(placed&&onFocus)?{...clickable(function(){onFocus(i);}),"aria-label":"Show "+(wp.name||_wt||"this waypoint")+" on the map"}:{};
    return <div key={i}>{prevWp&&(segMi!=null||segFt!=null)?<div style={{display:"flex",alignItems:"center",gap:6,padding:"1px 0 6px 17px",fontSize:11,color:C.textMuted}}><span style={{color:C.border}}>│</span><span>{[segMi!=null?uDistMi(Math.abs(segMi))+" from last":null,segFt!=null?((segFt>=0?"+":"−")+uElev(Math.abs(segFt))+(segFt>=0?" gain":" loss")):null].filter(Boolean).join(" · ")}</span></div>:null}<div {...act} style={(placed&&onFocus)?{...card,cursor:"pointer"}:card}><div style={{width:34,height:34,borderRadius:"50%",background:`${col}22`,border:`1.5px solid ${col}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:15}}>{ic}</div><div style={{flex:1,minWidth:0}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:2}}><span style={{fontWeight:700,fontSize:13.5}}>{wp.name}</span><div style={{textAlign:"right"}}><div style={{fontSize:12,fontWeight:700,color:C.blue}}>{uDistMi(cumMi(waypoints,wp))}</div><div style={{fontSize:12,color:C.textMuted}}>{uElev(wp.elev)}</div></div></div><Pill label={_wt} color={col} bg={`${col}22`} sm/>{wp.note?<div style={{fontSize:12,color:C.textSub,marginTop:4,lineHeight:1.5}}>{wp.note}</div>:null}{wp.directions?<div style={{fontSize:12,color:C.textSub,marginTop:6,lineHeight:1.5,paddingLeft:8,borderLeft:"2px solid "+col}}><span style={{fontWeight:700,color:C.text}}>{"Getting here — "}</span>{wp.directions}</div>:null}{placed?null:<div style={{fontSize:11,color:C.textMuted,marginTop:6,lineHeight:1.45}}>No coordinate on file — this point is not on the map above. Know where it is? Add it with the edit pencil.</div>}</div></div></div>;
  })}</>;
}
