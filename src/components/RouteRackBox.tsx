import { catOf, DISC_GEAR, C } from "../../ClimbMatchCore.jsx";
import { fitGear, routeTerrain } from "../../lib/terrain";
import { fmtSlingVal } from "../../lib/slingFormat.js";
import { rackRows, rackItemLine, rackQty, fmtRopeLen, _ropeEdited } from "../../lib/rack";
import CardHead from "./CardHead.tsx";
import EditIconButton from "./EditIconButton.tsx";
import RackBetaList from "./RackBetaList.tsx";
import type { RackBetaReport, RackBeta } from "./RackBetaList.tsx";

/** One stored sling entry ({qty, sizeCm} on the routes that have it). */
export interface SlingEntry {
  qty?: number | string | null;
  sizeCm?: number | string | null;
}
/** The `sling_rack` column: a sling list, or a keyed object of gear types (cams, nuts, pickets...). */
export type SlingRack = SlingEntry[] | Record<string, unknown> | string | null | undefined;
/** One bullet of the rack list: a gear type and what to bring of it. */
export interface RackLine {
  label: string;
  text: string;
}
/** The route fields the rack card reads. */
export interface GearRoute {
  rack?: string[] | null;
  gearTiers?: { required?: string[] | null } | null;
  cams?: string[] | null;
  slingRack?: SlingRack;
  /** The bolt count (0 when none are stored). */
  bolts: number | string;
  ropeLen?: string | null;
  ropeLengthM?: number | null;
  ropeType?: string | null;
  ascender?: string | null;
  gearConfidence?: string | null;
  activity?: RackBetaReport[] | null;
  gearBeta?: RackBeta[] | null;
}
export interface RouteRackBoxProps {
  route: GearRoute;
  /** The merged reports (seed + yours + every other climber's); route.activity alone is only the seed. */
  activity?: RackBetaReport[] | null;
  /** Opens the rack editor, seeded with the text it is given; the pencil is hidden without it. */
  onEditRack?: ((current: string) => void) | null;
  /** The rack to print instead of the discipline's default items. */
  rack?: string[] | null;
  /** Opens the Reports tab from the rack beta. */
  onSeeReports?: (() => void) | null;
  /** The rack shown is the discipline's standard one, not this route's own. */
  rackGeneric?: boolean;
}

function camFmt(z: string){return z.indexOf(".")>=0?z:("#"+z);}
const GEAR_CATS=[
 {label:"Rope",kw:["rope"]},
 {label:"Trad rack / protection",kw:["rack","cam","nut","protection","stopper","hex","piton","big bro"]},
 {label:"Quickdraws",kw:["draw","quickdraw"]},
 {label:"Helmet",kw:["helmet"]},
 {label:"Harness",kw:["harness"]},
 {label:"Belay / rappel device",kw:["belay device","atc","grigri"]},
 {label:"Chalk & brush",kw:["chalk","brush"]},
 {label:"Crampons",kw:["crampon"]},
 {label:"Ice axe / tools",kw:["ice axe","ice tool"]},
 {label:"Ice screws",kw:["ice screw"]},
 {label:"Aiders / ascenders",kw:["aider","etrier","ascender","jumar"]},
 {label:"Trekking poles",kw:["trekking pole","poles"]},
 {label:"Microspikes",kw:["microspike","spike"]},
 {label:"Navigation (map / GPS)",kw:["map","gps","navigation","compass"]},
 {label:"Insulating layers & shell",kw:["layer","shell","insulation","puffy","down jacket"]},
 {label:"Satellite communicator",kw:["communicator","inreach","satellite","plb"]},
 {label:"Footwear (shoes / boots)",kw:["shoe","footwear","boot"]},
 {label:"Crash pad(s)",kw:["crash pad","crashpad"]},
 {label:"Shelter & sleep kit",kw:["shelter","tent","sleep","bivy"]},
 {label:"Water / filter",kw:["water","filter","treatment","hydration"]},
 {label:"Bear canister",kw:["bear","canister"]},
 {label:"Glacier / crevasse kit",kw:["glacier","crevasse","picket","prusik"]}
];
/* Judge each rack entry on its own and drop the negated or conditional ones. A researched rack says things like "ice screws are rarely used here and are not worth carrying" or "protected with rock gear, not screws"; read as a flat word list, those advertise exactly the gear the route says to leave behind. Anything matching a rack against keywords must go through this first. */
const RACK_NEG=/\bnot worth\b|\bnot needed\b|\bnot necessary\b|\bnot required\b|\bno need\b|\bunnecessary\b|\brarely\b|\bseldom\b|\bnever\b|\bdon'?t\b|\bdo not\b|,\s*not\b|\bnot\s+(?:the\s+)?(?:screws|cams|nuts|pickets|pins|bolts)\b/i;
/* Per-OCCURRENCE negation for keyword matching. Dropping a whole entry loses affirmative gear that shares a sentence with a negation — "belays are often pins rather than screws" genuinely calls for pins. A category counts as present if any single mention of it is not negated in its immediate context. */
function rackMentions(rack: unknown,kw: string[]){const a=Array.isArray(rack)?rack:(rack?[String(rack)]:[]);
  for(let i=0;i<a.length;i++){const e=a[i];if(typeof e!=="string")continue;const low=e.toLowerCase();
    for(let k=0;k<kw.length;k++){let p=low.indexOf(kw[k]);while(p>=0){if(!RACK_NEG.test(low.slice(Math.max(0,p-45),p+kw[k].length+30)))return true;p=low.indexOf(kw[k],p+1);}}}
  return false;}
function gearReadout(route: GearRoute | null | undefined,owners?: string[][] | null){
  /* The per-discipline defaults assume snow and glacier terrain for everything filed as
     alpine or mountaineering, which put an ice axe and crampons on the packing list for dry
     summer rock routes. Filter them against what the route's own row says it crosses; the
     rack-derived additions below stay unconditional, since a rack naming crampons IS the
     evidence that the route needs them. */
  const disc=catOf(route);const base=fitGear(DISC_GEAR[disc as keyof typeof DISC_GEAR]||[],routeTerrain(route)).items.slice();
  /* Match per occurrence, or a rack saying "ice screws are not worth carrying" adds Ice screws to the packing checklist. */
  const src=((route&&route.rack)||[]).concat(((route&&route.gearTiers&&route.gearTiers.required)||[]));
  GEAR_CATS.forEach(c=>{if(rackMentions(src,c.kw)&&base.indexOf(c.label)<0)base.push(c.label);});
  const owned=(owners||[]).map(g=>(g||[]).join(" ").toLowerCase());
  return base.map(label=>{const c=GEAR_CATS.find(x=>x.label===label)||{kw:[label.toLowerCase()]};return {label:label,have:owned.some(t=>c.kw.some(k=>t.includes(k)))};});
}
function fmtSlingRack(sr: SlingRack): string | null {if(!sr)return null;if(Array.isArray(sr)){if(!sr.length)return null;if(sr[0]&&typeof sr[0]==="object"&&"sizeCm" in sr[0])return sr.map(function(s){return s.qty+"× "+s.sizeCm+"cm";}).join(", ");return sr.map(fmtSlingVal).filter(Boolean).join("; ");}if(typeof sr!=="object")return null;const parts=Object.keys(sr).map(function(k){const v=sr[k];if(v===false||v==null||v==="")return null;const label=k.replace(/_/g," ");if(/^\d+(\.\d+)?(cm|in|mm)$/i.test(k)&&(typeof v==="number"||/^\d+$/.test(v as string)))return v+"× "+k;const sub=fmtSlingVal(v);return sub?(label+": "+sub):null;}).filter(Boolean);return parts.length?parts.join(", "):null;}
/* THE COLUMN IS CALLED `sling_rack` AND 84% OF IT IS NOT SLINGS. Measured over all 242 stored
   values: 162 carry a `cams` key and 154 a `nuts` key, plus pickets, pitons, ice screws and
   tricams — and every one of them rendered under a single bullet reading "Slings — ...". A wrong
   label on a rack is worse than a long one: a climber scanning for what to bring reads the first
   word.

   It was also a paragraph in a bullet (p50 85, p90 172, max 454 characters), which is the
   check:token-boxes question one element over. One bullet per gear type fixes both at once, and
   fixes them from the data rather than by truncating: the keys are already there.

   An ARRAY value keeps the "Slings" label, because there it is genuinely a sling list
   ({qty,sizeCm} on 21 routes -> "5x 60cm, 2x 120cm"). Only the keyed-object shape was mislabelled.
   A plain STRING still yields nothing — that is the recorded blocker on making this column
   contributable, and it is deliberately NOT changed here. */
function rackLines(sr: SlingRack): RackLine[] {
  if(!sr)return[];
  if(Array.isArray(sr)){const _a=fmtSlingRack(sr);return _a?[{label:"Slings",text:_a}]:[];}
  if(typeof sr!=="object")return[];
  return Object.keys(sr).map(function(k){
    const t=fmtSlingVal(sr[k]);
    if(!t)return null;
    const l=k.replace(/_/g," ");
    return {label:l.charAt(0).toUpperCase()+l.slice(1),text:t};
  }).filter(Boolean) as RackLine[];
}
/* Moved verbatim from RouteDetail.jsx; only the types were added.
   RACK BETA: what climbers say they BROUGHT, at the foot of the rack card it describes. ONE list for
   both rack cards: RouteRackBox off CRAG_CATS and CragRack on them, bouldering aside (the log form
   asks for gear beta on a roped climb only). It used to be written twice, here and in a `sport`
   branch of RouteGearCheck that no route could reach, because RouteGearCheck is mounted only OFF
   CRAG_CATS. So when CLIMBER BETA stopped repeating gearBeta (#2363), a trad, sport, toprope or aid
   climber's gear beta reached no screen at all. check:bare renders it on each roped discipline.
   `activity` is the merged list (seed + your reports + every other climber's DB rows); route.activity
   alone is the seed, so a real climber's gear beta never reached the box that read only that. */
export default function RouteRackBox({route,activity,onEditRack,rack,onSeeReports,rackGeneric}: RouteRackBoxProps){const items=gearReadout(route,[]);const cams=(route&&route.cams)||[];const _rackLines=rackLines(route.slingRack);const lines=[];/* draws/screws/ropeLen are contributable in SuggestFix and were rendered NOWHERE — a climber could correct the quickdraw count, the screw count or the rope length, watch it pass the 3-agree gate, and never see it on the route. They belong on the same list as the alpine draws and the rope that were already here. ropeLen is the contributed spelling ("60 m"); ropeLengthM is the enrichment column, and they can disagree because NOTHING mirrors one onto the other. An agreed correction wins (_ropeEdited); absent one the enrichment number is the better value, since it is a number rather than free text. Never print two rope lines. *//* The COUNTED rack first (rackRows, lib/rack.js): rack_items' rows with the quickdraw, screw and alpine-draw boxes folded in, one count per item. rack_items reached no off-crag card before, so 11 alpine/mixed/ice routes whose only rack was counted rows printed the generic rack. */rackRows(route).forEach(function(x: Parameters<typeof rackItemLine>[0]){lines.push(rackItemLine(x));});/* The bolt count was carried only by the PROTECTION section that used to sit above this card on Plan, which repeated the rest of this list; it lives here now. */if(+route.bolts>0)lines.push(Math.round(+route.bolts)+" bolts"+(rackQty(route,"quickdraws")?"":" — bring "+Math.round(+route.bolts)+"+ quickdraws"));_rackLines.forEach(function(rl){lines.push(rl.label+" — "+rl.text);});const _ropeContrib=route.ropeLen?fmtRopeLen(route.ropeLen):"";const _ropeLen=(_ropeEdited(route)&&_ropeContrib)?_ropeContrib:(route.ropeLengthM?(route.ropeLengthM+"m"):_ropeContrib);if(route.ropeType||_ropeLen)lines.push("Rope — "+[route.ropeType,_ropeLen].filter(Boolean).join(" "));/* ropeNote used to be appended here in brackets, which meant two things: a note on a route with no ropeType and no length rendered NOWHERE (63 WA routes), and the 381 that did render put a whole paragraph inside a bullet — median 186 chars, max 716. It has its own box below now. *//* No route-level anchor line: `anchorType` was deliberately removed from SS ("anchors are per-pitch
   now"), `routes` has no anchor_type column, and no seed route carries the key — so this read could
   never fire. The live anchor records are `station.anchorType` on a bailout and `wp.anchorType` on a
   waypoint, both of which render elsewhere. */if(route.ascender&&route.ascender!=="Not needed")lines.push("Ascender — "+route.ascender);const specificItems=(rack&&rack.length)?rack:(rackRows(route).length?[]:items.map(x=>x.label));const allRack=lines.concat(cams.map(camFmt)).concat(specificItems);if(!allRack.length&&!onEditRack)return null;return <div style={{background:C.card,borderRadius:12,padding:"12px 14px",border:`1px solid ${C.border}`,marginTop:12}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:3,gap:10}}><CardHead>RACK</CardHead>{onEditRack?<EditIconButton onClick={()=>onEditRack(/* Only what the rack box itself holds. Quickdraws, bolts, screws, alpine draws, rope and ascender each have their own box in the same section, and copying them into the free text made a saved rack print them twice; a GENERIC discipline rack is not this route's, so it is not offered as if it were. */_rackLines.map(function(rl){return rl.label+" — "+rl.text;}).concat(cams.map(camFmt)).concat(rackGeneric?[]:specificItems).join("\n"))} title={allRack.length?"Suggest a rack correction":"Add the rack for this route"}/>:null}</div><div style={{fontSize:12,color:C.textMuted,marginBottom:10,lineHeight:1.45}}>{rackGeneric?"Standard rack for this discipline — nobody has recorded what this route itself takes, so treat it as a starting point and check it in the field":(route&&route.gearConfidence==="inferred"?"Protection and technical gear — inferred from this route's own description, not confirmed against trip reports":"Protection and technical gear")}.</div>{allRack.length?<div style={{display:"flex",flexDirection:"column",gap:5}}>{allRack.map((gi,i)=><div key={i} style={{display:"flex",gap:8,fontSize:12.5,color:C.text,lineHeight:1.45}}><span style={{color:C.blue,flexShrink:0}}>•</span><span>{gi}</span></div>)}</div>:<div style={{fontSize:12.5,color:C.textMuted,lineHeight:1.5}}>No rack listed yet — climbed it? Add what you brought.</div>}<RackBetaList activity={activity} route={route} onSeeReports={onSeeReports}/></div>;}
