import { C, SUB_LABEL, RSL as SL, uImp } from "../../ClimbMatchCore.jsx";
import { planTimes } from "../../lib/planTimes.js";
import { tripProfile, apportion } from "../../lib/tripProfile.js";
import { tripLegGeometry } from "../../lib/tripLegs.js";

/** A waypoint at the end of a leg; its name, else its type, is printed. */
interface TpPin { name?: string | null; type?: string | null }
/** One leg of the profile. A way up carries gainFt and a way down dropFt, and only when a climb was measured. */
interface TpLeg { from?: TpPin | null; to?: TpPin | null; km: number; timeH: number; gainFt?: number | null; dropFt?: number | null }
/** The total of one direction. */
interface TpTotal { km: number; timeH: number; gainFt?: number | null; dropFt?: number | null; floor: boolean }
/** What tripProfile() returns: no legs (and a reason) or the legs with their totals. */
type TripProfile =
  | { legs: null; totals: null; climbBy: null; offTrack: number; reason: string }
  | { legs: { up: TpLeg[]; down: TpLeg[] }; totals: { up: TpTotal; down: TpTotal }; climbBy: string | null; offTrack: number; reason: null };
export interface TripProfileCardProps {
  route: Parameters<typeof tripLegGeometry>[0];
  /** The Full trip time settings (pace, pack, party, departure). */
  calc: Parameters<typeof planTimes>[1];
}

/** THE TRIP PROFILE (owner note, 2026-10-25: each leg of the route in the plan section detailed on timing,
   matching the other sections). One row per leg between the route's own waypoints, with its miles, its
   climb or drop, and its time, up and then down. The legs are a split of the route's own totals (see
   lib/tripProfile.js), so they add up to GETTING THERE and the DESCENT strip exactly, at the same rounding.
   Renders nothing when the route has no profile to give, and says nothing about why: the reason is in
   tripProfile(), and a route with no recorded track simply has no legs to print.
 *
 * Reads `C` at render time. Moved verbatim from RouteDetail.jsx; only the types were added.
 */
export default function TripProfileCard({route,calc}: TripProfileCardProps){
  const pt=planTimes(route,calc);const g=tripLegGeometry(route);
  const tp: TripProfile=tripProfile(route,pt,g,calc);
  if(!tp.legs)return null;
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
    <SL>{"TRIP PROFILE"}</SL>
    <div style={{background:C.surface,borderRadius:10,padding:"4px 12px 11px",border:"1px solid "+C.border,marginBottom:12}}>
      {upLegs}{dnLegs}
      <div style={{fontSize:11.5,color:C.textMuted,lineHeight:1.45,marginTop:6}}>{"Each leg is measured along the recorded track between its own waypoints, and the whole approach and descent are the figures GETTING THERE and DESCENT print. "+(tp.climbBy==="track"?"Distance and climb are split by the track":tp.climbBy==="pins"?"Distance is split by the track, and climb by the height change between the waypoints":"Distance is split by the track; no climb is measured for the legs")+"; time is split by the walk model at the pace, pack and party in Full trip time."+(tp.offTrack?" "+tp.offTrack+(tp.offTrack===1?" waypoint sits":" waypoints sit")+" off the recorded track, so "+(tp.offTrack===1?"it has":"they have")+" no leg of "+(tp.offTrack===1?"its":"their")+" own.":"")}</div>
    </div>
  </div>;
}
