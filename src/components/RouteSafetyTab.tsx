import Capped from "./Capped.tsx";
import SafetyMatrix from "./SafetyMatrix.tsx";
import { rxOf, C } from "../../ClimbMatchCore.jsx";
import CardHead from "./CardHead.tsx";
import EditIconButton from "./EditIconButton.tsx";
import GapNote from "./GapNote.tsx";
import FloatPlanFold from "./FloatPlanFold.tsx";
import type { ReactNode } from "react";
import type { SafetyMatrixProps } from "./SafetyMatrix.tsx";

export interface RouteSafetyTabProps {
  /** The merged trip reports. */
  activity: SafetyMatrixProps["activity"];
  /** The active-fires dropdown, already built. */
  fireEl: ReactNode;
  hzVotes?: SafetyMatrixProps["hzVotes"];
  mtn: SafetyMatrixProps["mountain"];
  /** Opens the float plan; none means the fold has no button. */
  onFloatPlan?: ((route: RouteSafetyTabProps["route"]) => void) | null;
  onVoteHazard?: SafetyMatrixProps["onVote"];
  /** Opens the route editor on a field. */
  openFix: (field: string) => void;
  route: SafetyMatrixProps["route"] & { comms?: string | null; discipline: string; gainFt?: number | null; routeFt?: number | null };
  /** Emergency & rescue and the other panels the app mounts. */
  safetyPanels?: ReactNode;
  /** Prefills the editor (hazards seed), or clears it. */
  setFixPrefill: (v: { haz: string[] } | null) => void;
  /** Draws the forecast. */
  wxEl: () => ReactNode;
}

/* tab==="safety"? — the body of that branch of RouteDetail, lifted verbatim by extract-from-parent.mjs (branch mode);
   every binding it read from RouteDetail is a prop of the same name. Lifted verbatim from RouteDetail.jsx (PR60); only the types were added. */
export default function RouteSafetyTab({activity,fireEl,hzVotes,mtn,onFloatPlan,onVoteHazard,openFix,route,safetyPanels,setFixPrefill,wxEl}: RouteSafetyTabProps){
  return <div>{/* THE ORDER (owner, 2026-10-24: "Forecast should be at the top of safety tab … audit the ordering"): what decides the day first, then what can go wrong, then what you do about it — the order NPS climbing pages and trip-planning guides brief a party in. FORECAST, then ACTIVE FIRES (a dropdown), KNOWN HAZARDS, CELL COVERAGE, EMERGENCY & RESCUE (safetyPanels, mounted by ClimbMatch.jsx), and the FLOAT PLAN last, as a dropdown. The forecast is on Safety for EVERY route now, on top of the Conditions tab that also carries it: a climber who opens Safety to decide whether to go must not have to leave it for the weather. */}{wxEl()}{fireEl}{/* CAMPING & BIVY used to mount HERE, and moved to the Planner tab: where you sleep is a
    planning decision, not a hazard, and on Safety it sat behind a tab nobody opens for
    logistics. Its mount was silently lost once already — it lived on this exact dense line,
    main changed the same line, and the merge kept main's copy, leaving the panel defined and
    rendered NOWHERE. No guard catches that: check:dead-props sees props, not unmounted
    components, and the column was populated so a data check would have looked healthy too.
    The mount is now on the planner line beside <Calculator/>; if you touch either line,
    confirm CAMPING & BIVY still reaches the screen. */}<Capped><SafetyMatrix route={route} activity={activity} mountain={mtn} hzVotes={hzVotes} onVote={onVoteHazard} onEdit={openFix} onOpenHazards={(seed)=>{/* Hazards is a MULTI field, so its prefill is an ARRAY of strings. A bare string crashed the form (filledStr calls .join), and the KNOWN HAZARDS "✎ Suggest a fix" button passed its click EVENT here as the seed — the editor read event.indexOf and the whole route page fell over. Only a string seeds. */setFixPrefill(typeof seed==="string"&&seed.trim()?{haz:[seed.trim()]}:null);openFix("haz");}}/></Capped>{(()=>{const cm=rxOf(route.id).comms;/* Cell coverage is contributable (the `comms` field) and this was the only panel on the Safety tab with no way to correct what it says — every neighbour here has an EditIconButton. Coverage is also the one fact on this screen that changes with a carrier and a new tower rather than with the rock, so it is exactly the kind of thing the last party knows better than the catalog. */
        if(!cm)return route.comms?<div style={{background:C.card,borderRadius:10,padding:"11px 12px",marginTop:14,border:`1px solid ${C.border}`}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,marginBottom:5}}><CardHead>Cell / sat coverage</CardHead><EditIconButton onClick={()=>{openFix("comms");}} title="Edit cell / satellite coverage"/></div><div style={{fontSize:12.5,color:C.textSub,lineHeight:1.5}}>{route.comms}</div></div>:<div style={{background:C.card,borderRadius:10,padding:"11px 12px",marginTop:14,border:`1px solid ${C.border}`}}><CardHead style={{marginBottom:5}}>Cell / sat coverage</CardHead><GapNote what="No coverage report yet" why="Nothing says whether a phone works here or if you need a satellite messenger." cta="Add coverage" onFix={()=>{openFix("comms");}}/></div>;const COV: Record<string, { t: string; c: string; bg: string }>={none:{t:"No service",c:C.red,bg:C.redBg},spotty:{t:"Spotty signal",c:C.amber,bg:C.amberBg},good:{t:"Good signal",c:C.green,bg:C.greenBg}};return <div style={{background:C.card,borderRadius:10,padding:"11px 12px",marginTop:14,border:`1px solid ${C.border}`}}><div style={{display:"flex",alignItems:"center",gap:7,marginBottom:cm.note?5:0}}><CardHead>Cell coverage</CardHead><span style={{fontSize:11.5,fontWeight:700,color:(COV[cm.coverage]||COV.none).c,background:(COV[cm.coverage]||COV.none).bg,padding:"2px 8px",borderRadius:10}}>{(COV[cm.coverage]||COV.none).t}</span></div>{cm.note?<div style={{fontSize:12.5,color:C.textSub,lineHeight:1.5}}>{cm.note}</div>:null}</div>;})()}{safetyPanels}{(["alpine","mountaineering","ice","mixed"].includes(route.discipline)||(route.gainFt||0)>=3000||(route.routeFt||0)>=1000)?<FloatPlanFold coverage={(rxOf(route.id).comms||{}).coverage} onFile={onFloatPlan?function(){onFloatPlan(route);}:null}/>:null}</div>;
}
