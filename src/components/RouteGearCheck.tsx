import { ropeworkFacts } from "../../lib/ropework";
import { C, RSL as SL } from "../../ClimbMatchCore.jsx";
import CardHead from "./CardHead.tsx";
import GapNote from "./GapNote.tsx";
import EditIconButton from "./EditIconButton.tsx";
import type { ReactNode } from "react";
import RouteRackBox from "./RouteRackBox.tsx";
import type { GearRoute, RouteRackBoxProps } from "./RouteRackBox.tsx";
import RouteGearEssentialsBox from "./RouteGearEssentialsBox.tsx";
import type { GearEssentialsRoute } from "./RouteGearEssentialsBox.tsx";
import { rackLeftovers } from "../../lib/rack";

/** The route fields the ropework card reads (ropeworkFacts reads the rest). */
export interface RopeworkRoute {
  discipline?: string | null;
  ropeNote?: string | null;
  beta?: string | null;
  descentText?: string | null;
  pitchDetail?: Array<{ notes?: string | null; note?: string | null; anchor?: string | null; grade?: string | null }> | null;
}
export interface RouteGearCheckProps {
  route: GearRoute & GearEssentialsRoute & RopeworkRoute;
  /** The merged reports, for the rack beta. */
  activity?: RouteRackBoxProps["activity"];
  /** Opens the Reports tab from the rack beta. */
  onSeeReports?: RouteRackBoxProps["onSeeReports"];
  /** The rack to print instead of the discipline's default items. */
  rack?: RouteRackBoxProps["rack"];
  onEditRack?: RouteRackBoxProps["onEditRack"];
  onEditEssentials?: (() => void) | null;
  /** The route's own "what to bring" entries. */
  essentials?: string[] | null;
  /** The rack shown is the discipline's standard one, not this route's own. */
  rackGeneric?: boolean;
  onEditRopeNote?: (() => void) | null;
  /** Rendered between the rack and ropework cards. */
  afterRack?: ReactNode;
}

/* Moved verbatim from RouteDetail.jsx; only the types were added.
   WALK-IN: the crag's own approach (`areas.approach`, 0247) — the walk from the trail to the base,
   written once per crag and shown on every route there. Never roads, parking, permits or closures. */
export default function RouteGearCheck({route,activity,onSeeReports,rack,onEditRack,onEditEssentials,essentials,rackGeneric,onEditRopeNote,afterRack}: RouteGearCheckProps){
  /* Mounted only OFF CRAG_CATS (alpine, mountaineering, ice, mixed, scrambling). It used to open with a
     `bouldering` return and a `sport` branch (a computed quickdraw note plus "Rack beta"), and neither
     could run: a crag route draws CragRack instead. The sport branch was also the second of two copies
     of the rack beta list, which is now RackBetaList, shared with CragRack. */
// `rope_note` is populated on 444 WA routes and had no reader of its own — it was appended
// in brackets to the "Rope — " rack bullet, which only exists when ropeType or a rope length
// is set, so 63 notes reached no screen at all. Same shape as descent_text (#707): the
// column was right, the reader was missing.
//
// The simul line is DERIVED FROM THE ROUTE'S OWN WORDS and says so. 108 WA routes already
// state it — "Most parties simul-climb much of the terrain and rope up only for the low-5th
// sections" (Black Peak NE Ridge) — but it is buried in `beta` (42) or a per-pitch note (80),
// where nothing surfaces it. It is deliberately NOT inferred from grade: "parties commonly
// simul-climb this" is a claim about a specific route, and deriving it from "4th class and
// long" would manufacture that claim on 415 routes at once.
// ROPEWORK holds three facts and no prose: the rope length, whether the pitches link, and whether the
// party simul-climbs (lib/ropework.js). The rope NOTE is not printed in full: its other sentences
// (rappel beta, gear, "no rope needed") have their own cards, and printing the note here repeated them.
function RopeworkBox({route,onEdit}: {route: RopeworkRoute; onEdit?: (() => void) | null}){
  const f=ropeworkFacts(route);
  const any=!!(f.length||f.link||f.simul);
  /* Empty: a placeholder, where a rope is part of the route at all (not a scramble or a hike). */
  if(!any)return (onEdit&&!["scrambling","hiking","scramble","hike","bouldering"].includes(route&&route.discipline as string))?<div style={{background:C.card,borderRadius:12,padding:"12px 14px",border:`1px solid ${C.border}`,marginTop:12}}><CardHead style={{marginBottom:6}}>ROPEWORK</CardHead><GapNote what="No ropework notes yet" why="Nothing says what rope this needs, whether the pitches link, or whether parties simul-climb." cta="Add ropework notes" onFix={onEdit}/></div>:null;
  const row=function(label: string,value?: string | null){return <div style={{display:"flex",gap:10,fontSize:12.5,lineHeight:1.55,marginTop:6}}><div style={{width:112,flexShrink:0,color:C.textMuted}}>{label}</div><div style={{color:C.textSub,wordBreak:"break-word",overflowWrap:"break-word",minWidth:0}}>{value||"Not stated"}</div></div>;};
  return <div style={{background:C.card,borderRadius:12,padding:"12px 14px",border:`1px solid ${C.border}`,marginTop:12}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:3,gap:10}}>
      <CardHead>ROPEWORK</CardHead>
      {onEdit?<EditIconButton onClick={onEdit} title="Edit the ropework note"/>:null}
    </div>
    {row("Rope length",f.length)}
    {row("Pitches link",f.link)}
    {row("Simul-climbing",f.simul)}
  </div>;
}
  /* One SECTION heading over the group: RACK, ROPEWORK and GEAR & ESSENTIALS are card titles, and
     without it the three cards ran on from WAYPOINTS above as if they were part of it. */
  /* rackLeftovers: what the rack sources name that is NOT rack (an ice axe filed in detailed_rack, a
     helmet in gear). routeRackFor keeps it out of RACK; it joins the packing list here so a route
     never loses something it states. mergeGearList dedupes it against the standard kit by item. */
  return <><SL>GEAR</SL><RouteRackBox route={route} activity={activity} onEditRack={onEditRack} rack={rack} onSeeReports={onSeeReports} rackGeneric={rackGeneric}/>{afterRack}<RopeworkBox route={route} onEdit={onEditRopeNote}/><RouteGearEssentialsBox route={route} essentials={(essentials||[]).concat(rackLeftovers(route))} onEdit={onEditEssentials}/></>;
}
