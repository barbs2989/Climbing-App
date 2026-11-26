import { C, SUB_LABEL, RSL as SL, uImp, catOf } from "../../ClimbMatchCore.jsx";
import { planTimes } from "../../lib/planTimes.js";
import { tripProfile, apportion } from "../../lib/tripProfile.js";
import { tripLegGeometry } from "../../lib/tripLegs.js";
import EditIconButton from "./EditIconButton.tsx";
import EmptySection from "./EmptySection.tsx";

/** A waypoint at the end of a leg; its name, else its type, is printed. */
interface TpPin { name?: string | null; type?: string | null }
/** One leg of the profile. A way up carries gainFt and a way down dropFt, and only when a climb was measured. */
interface TpLeg { from?: TpPin | null; to?: TpPin | null; km: number; timeH: number; gainFt?: number | null; dropFt?: number | null }
/** The total of one direction. */
interface TpTotal { km: number; timeH: number; gainFt?: number | null; dropFt?: number | null; floor: boolean }
/** What tripProfile() returns: no legs (and a reason) or the legs with their totals. */
type TripProfile =
  | { legs: null; totals: null; climbBy: null; measuredBy: null; offTrack: number; unplaced: number; reason: string }
  | { legs: { up: TpLeg[]; down: TpLeg[] }; totals: { up: TpTotal; down: TpTotal }; climbBy: string | null; measuredBy: string; offTrack: number; unplaced: number; reason: null };
export interface TripProfileCardProps {
  route: Parameters<typeof tripLegGeometry>[0];
  /** The Full trip time settings (pace, pack, party, departure). */
  calc: Parameters<typeof planTimes>[1];
  /** Opens the waypoint editor: the legs are the route's own waypoints, with their distances from the trailhead and heights. */
  onEditWaypoints?: () => void;
  /** Opens the timing editor (a car-to-car time has no split until the time up and down are known). */
  onEditTiming?: () => void;
}

/** WHERE AN EMPTY PROFILE IS SHOWN: a route walked to a summit (alpine, mountaineering, scrambling, a walk-up),
    or any route whose waypoints already name a trailhead. Ice and mixed lines mount the card too, but most are
    roadside falls with no legs to split, so they show it only once it has legs or a trailhead to start from. */
export function tripProfilePertinent(route: Parameters<typeof catOf>[0]): boolean {
  if (["alpine", "mountaineering", "scrambling", "hiking", "walk-up"].includes(String(catOf(route)))) return true;
  const wps: unknown = route && (route as { waypoints?: unknown }).waypoints;
  return Array.isArray(wps) && wps.some(function(w: unknown){return !!w && typeof w === "object" && /trailhead/i.test(String((w as { type?: unknown }).type || ""));});
}

/** WHY A ROUTE HAS NO PROFILE, in a climber's words, and what would give it one (tripProfile()'s `reason`). */
export function tripProfileEmptyCopy(reason: string): { why: string; cta: string; fix: "waypoints" | "timing" } {
  if (reason === "car to car") return { why: "This route's time is known only as one car-to-car figure, so there is nothing to split between legs. A time up and a time down would let each leg carry its share.", cta: "Add the time up and down", fix: "timing" };
  if (reason === "not an out and back") return { why: "This route does not come back the way it goes, so the legs up and the legs down are different walks, and the profile splits only a route walked back the way it came.", cta: "Edit the waypoints", fix: "waypoints" };
  /* Name the missing piece when it is one waypoint (walk-through, 2026-11-26: American Border Peak has six of its seven
     distances and read the same generic advice as a route with none). */
  if (/no summit (pin|waypoint)/.test(reason) && !/no waypoints/.test(reason)) return { why: "The summit waypoint has no distance from the trailhead, so the legs have nowhere to end. Add the summit's distance, and that of any camp, pass or junction on the way that has none.", cta: "Add the missing distances", fix: "waypoints" };
  if (/no trailhead (pin|waypoint)/.test(reason)) return { why: "There is no trailhead waypoint for the legs to start from. Add the trailhead, then each camp, pass or junction on the way and the summit, each with its distance from the trailhead.", cta: "Add the trailhead", fix: "waypoints" };
  return { why: "Each leg runs between two of the route's waypoints: the trailhead, the camps, passes and junctions on the way, and the summit. A leg needs each end's distance from the trailhead, and its height for the climb.", cta: "Add waypoints and distances", fix: "waypoints" };
}

/** THE TRIP PROFILE (owner note, 2026-10-25: each leg of the route in the plan section detailed on timing,
   matching the other sections). One row per leg between the route's own waypoints, with its miles, its
   climb or drop, and its time, up and then down. The legs are a split of the route's own totals (see
   lib/tripProfile.js), so they add up to GETTING THERE and the DESCENT strip exactly, at the same rounding.
   With no profile to give it renders an EmptySection that says why and opens the editor that would give it one.
 *
 * Reads `C` at render time. Moved verbatim from RouteDetail.jsx; only the types were added.
 */
export default function TripProfileCard({route,calc,onEditWaypoints,onEditTiming}: TripProfileCardProps){
  const pt=planTimes(route,calc);const g=tripLegGeometry(route);
  const tp: TripProfile=tripProfile(route,pt,g,calc);
  /* EVERY MOUNTAIN ROUTE SHOWS THE SECTION (owner note, 2026-11-26: "Is trip profile on all routes that it
     should be on? Even if there's no data on it?"). It used to render nothing when it had no legs, so a
     climber who knew the camps and their distances had no way to learn that this was where they went. */
  if(!tp.legs){if(!tripProfilePertinent(route))return null;const ec=tripProfileEmptyCopy(tp.reason);const fix=ec.fix==="timing"?onEditTiming:onEditWaypoints;return <EmptySection title="TRIP PROFILE" what="No leg-by-leg profile yet" why={ec.why} cta={fix?ec.cta:undefined} onFix={fix}/>;}
  const imp=uImp();
  const dispKm=function(k: number){return imp?k*0.621371:k;};
  const dispFt=function(f: number){return imp?f:f/3.28084;};
  const fmtD=function(v: number){return v.toFixed(1)+(imp?" mi":" km");};
  const fmtG=function(v: number){return Math.round(v).toLocaleString()+(imp?" ft":" m");};
  const legName=function(w: TpPin | null | undefined){return (w&&(w.name||w.type))||"Waypoint";};
  const cell=function(label: string,value: string){return <div key={label} style={{minWidth:0}}><div style={{fontSize:14,fontWeight:700,color:C.text,fontVariantNumeric:"tabular-nums",whiteSpace:"nowrap"}}>{value}</div><div style={{fontSize:11,color:C.textMuted}}>{label}</div></div>;};
  const section=function(heading: string,legs: TpLeg[],_tot: TpTotal,gainOf: (l: TpLeg)=>number | null | undefined,gainLabel: string,hasGain: boolean,timeFloor: boolean){
    const km=apportion(legs.map(function(l){return dispKm(l.km);}),0.1);
    const gn=hasGain?apportion(legs.map(function(l){return dispFt(gainOf(l)||0);}),1):null;
    const tm=apportion(legs.map(function(l){return l.timeH;}),0.1);
    const sum=function(a: number[]){return a.reduce(function(s: number,x: number){return s+x;},0);};
    const tKm=sum(km), tT=sum(tm), tG=gn?sum(gn):0;
    const rows=legs.map(function(l,i){return {from:l.from,to:l.to,items:[cell("Distance",fmtD(km[i]))].concat(gn?[cell(gainLabel,(gainLabel==="Drop"?"↓ ":"↑ ")+fmtG(gn[i]))]:[]).concat([cell("Time",(timeFloor?"≥":"")+tm[i].toFixed(1)+"hr")])};});
    const totItems=[cell("Distance",fmtD(tKm))].concat(gn?[cell(gainLabel,(gainLabel==="Drop"?"↓ ":"↑ ")+fmtG(tG))]:[]).concat([cell("Time",(timeFloor?"≥":"")+tT.toFixed(1)+"hr")]);
    return <div key={heading} style={{padding:"6px 0 2px"}}>
      <div style={{...SUB_LABEL,marginBottom:2}}>{heading}</div>
      {rows.map(function(r,i){return <div key={i} style={{padding:"7px 0",borderTop:"1px solid "+C.borderLight}}>
        <div style={{fontSize:12.5,color:C.textSub,lineHeight:1.4,marginBottom:4,minWidth:0,overflowWrap:"anywhere"}}>{legName(r.from)+" → "+legName(r.to)}</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:"4px 18px"}}>{r.items}</div>
      </div>;})}
      <div style={{padding:"7px 0",borderTop:"1px solid "+C.border}}>
        <div style={{fontSize:12.5,fontWeight:700,color:C.text,marginBottom:4}}>{heading==="UP"?"Whole approach and climb":"Whole descent"}</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:"4px 18px"}}>{totItems}</div>
      </div>
    </div>;
  };
  const upHas=tp.climbBy!=null&&tp.totals.up.gainFt!=null, dnHas=tp.climbBy!=null&&tp.totals.down.dropFt!=null;
  const upLegs=section("UP",tp.legs.up,tp.totals.up,function(l: TpLeg){return l.gainFt;},"Gain",upHas,tp.totals.up.floor);
  const dnLegs=section("DOWN",tp.legs.down,tp.totals.down,function(l: TpLeg){return l.dropFt;},"Drop",dnHas,tp.totals.down.floor);
  return <div>
    <SL action={onEditWaypoints?<EditIconButton onClick={onEditWaypoints} title="Edit the waypoints that set the legs"/>:null}>{"TRIP PROFILE"}</SL>
    <div style={{background:C.surface,borderRadius:10,padding:"4px 12px 11px",border:"1px solid "+C.border,marginBottom:12}}>
      {upLegs}{dnLegs}
      {tp.unplaced?<div style={{fontSize:11.5,color:C.textMuted,lineHeight:1.45,marginTop:6}}>{tp.unplaced+(tp.unplaced===1?" waypoint has":" waypoints have")+" no distance from the trailhead, so "+(tp.unplaced===1?"it has":"they have")+" no leg of "+(tp.unplaced===1?"its":"their")+" own."}</div>:null}
      {tp.offTrack?<div style={{fontSize:11.5,color:C.textMuted,lineHeight:1.45,marginTop:6}}>{tp.offTrack+(tp.offTrack===1?" waypoint sits":" waypoints sit")+" off the recorded track, so "+(tp.offTrack===1?"it has":"they have")+" no leg of "+(tp.offTrack===1?"its":"their")+" own."}</div>:null}
    </div>
  </div>;
}
