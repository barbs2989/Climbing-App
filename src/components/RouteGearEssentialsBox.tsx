import { catOf, C, DISC, SUB_LABEL } from "../../ClimbMatchCore.jsx";
import { isMultiDayOuting } from "../../lib/outing.js";
import CardHead from "./CardHead.tsx";
import EditIconButton from "./EditIconButton.tsx";

/** A stored text field that is a string on some routes and a list on others. */
type TextOrList = string | string[] | null;
/** The route fields the packing list reads (its own words are searched for snow and glacier evidence). */
export interface GearEssentialsRoute {
  name?: string | null;
  grade?: string | null;
  overview?: string | null;
  approach?: string | null;
  descentText?: string | null;
  season?: string | null;
  hazards?: TextOrList;
  gear?: TextOrList;
  objHaz?: TextOrList;
}
export interface RouteGearEssentialsBoxProps {
  route: GearEssentialsRoute;
  /** The route's own "what to bring" entries, merged into the standard kit. */
  essentials?: string[] | null;
  /** Opens the essentials editor; the pencil is hidden without it. */
  onEdit?: (() => void) | null;
}

const DISC_ASSUMED: Record<string, string[]>={sport:["Rope","Quickdraws","Harness","Belay / rappel device","Personal anchor / sling","Helmet","Climbing shoes","Chalk"],trad:["Rope","Trad rack","Harness","Belay / rappel device","Helmet","Climbing shoes","Chalk","Nut tool"],bouldering:["Climbing shoes","Crash pads","Chalk","Brush"],aid:["Rope","Trad rack","Harness","Belay / rappel device","Helmet","Aiders / etriers","Daisy chains","Ascenders"],ice:["Harness","Belay / rappel device","Helmet","Ice tools","Crampons","Mountaineering boots","Warm layers"],mixed:["Harness","Belay / rappel device","Helmet","Ice tools","Crampons","Warm layers"],alpine:["Harness","Belay / rappel device","Helmet","Ice axe","Crampons","Mountaineering boots","Glacier / crevasse kit","Warm layers","Navigation"],mountaineering:["Ice axe","Crampons","Mountaineering boots","Harness","Helmet","Glacier / crevasse kit","Navigation","Warm layers"],scrambling:["Approach shoes","Helmet","Navigation (map / GPS)"]};
// Show the snow and glacier items only where the route gives evidence it needs them.
const _GLACIER_RE=/glacier|crevasse|bergschrund|schrund|icefall|serac/i;
const _SNOW_RE=/\bsnow|\bcouloir|\bnev[\u00e9e]|\bice\b|ice axe|crampon|posthol|cornice|glissad|\bfirn\b|\bmoat\b/i;
// season" onto whatever field follows it — which is exactly the hedge that must stay isolated.
const _routeGearText=function(r: GearEssentialsRoute | null | undefined){if(!r)return "";const flat=function(v: unknown){return Array.isArray(v)?v.join("; "):(v==null?"":String(v));};return [r.name,r.grade,r.overview,r.approach,r.descentText,r.season,flat(r.hazards),flat(r.gear),flat(r.objHaz)].filter(Boolean).join("; ");};
/* A route that says you MIGHT need snow gear is not a route that needs it.

   Liberty Bell's Beckey Route — a 5.6 rock climb — stores "ice axe and crampons in early
   season". Mountain Project says climbers "may want an axe and/or crampons depending on snow
   conditions in the gully". North Cascade Mountain Guides lists boots, crampons and axe under
   "TECHNICAL EQUIPMENT – SPRING" and notes that later in the season you "walk to the base in a
   pair of lightweight hiking boots". So the stored data was right, and the RENDERING was
   wrong: _SNOW_RE matched the route's own hedge, dropped the condition, and printed Ice axe,
   Crampons AND Mountaineering boots as kit the climber is assumed to be carrying — boots
   being asserted by no source whatsoever.

   49 alpine/mountaineering routes are in this position, including Cutthroat West Ridge,
   Prusik Peak West Ridge and Liberty Crack (scripts/oneoff/audit-conditional-snow-gear.mjs).
   Hedged evidence now yields a CONDITIONAL tier quoting the route's own sentence, rather than
   a silent promotion to required. */
const _HEDGE_RE=/\b(early[- ]season|late[- ]season|in spring|spring only|depending on|if (?:there is |the )?snow|if snow|when snow|may want|optional|conditions? (?:dependent|permitting|vary)|as needed|sometimes|seasonal(?:ly)?|lingering|can be|occasionally)\b/i;
function _snowEvidence(route: GearEssentialsRoute){
  const txt=_routeGearText(route);
  if(!_SNOW_RE.test(txt))return {snowy:false,glaciated:false,hedged:false,quote:null};
  const glaciated=_GLACIER_RE.test(txt);
  const hits=String(txt).split(/(?<=[.;])\s+/).filter(function(s: string){return _SNOW_RE.test(s);});
  // A glaciated route is never "conditional" — the glacier does not melt out in August.
  const hedged=!glaciated&&hits.length>0&&hits.every(function(s: string){return _HEDGE_RE.test(s);});
  /* Quote the sentence that tells the climber WHEN to carry it, not merely the first one
     that happened to contain the word "snow". On Prusik Peak's West Ridge the first match is
     an approach line about skirting Colchuck Lake, which explains nothing; the useful one
     names the gear. Prefer a hit that mentions the kit, then fall back. */
  const best=hits.find(function(s: string){return /ice axe|crampon|ice tool/i.test(s);})||hits[0];
  return {snowy:true,glaciated:glaciated,hedged:hedged,quote:hedged?String(best).trim().replace(/^[;\s]+|[;\s]+$/g,""):null};
}
function assumedFor(route: GearEssentialsRoute,disc: string){
  const base=DISC_ASSUMED[disc]||[];
  if(disc!=="alpine"&&disc!=="mountaineering")return base;
  const ev=_snowEvidence(route);
  return base.filter(function(item: string){
    if(/glacier|crevasse/i.test(item))return ev.glaciated;
    if(/ice axe|crampons|mountaineering boots/i.test(item))return ev.snowy&&!ev.hedged;
    return true;
  });
}
function gearKey(s: unknown){
  const head=String(s==null?"":s).toLowerCase().split(/\s*[(—[]|\s+--\s+|\s*[,;:]\s+|\s+–\s+/)[0];
  return head.replace(/[^a-z0-9+/ ]/g," ").replace(/\s+/g," ").trim()
    /* Crude singularisation, applied to BOTH sides, so "ropes"/"Rope" and
       "boots"/"Mountaineering boots" meet. Words of 3 or fewer characters are left alone so
       "gps" survives, and a double-s ending is left alone so "harness" does not become
       "harnes" — which would still have matched itself, but only by accident. */
    .split(" ").map(function(w: string){return (w.length>3&&/s$/.test(w)&&!/ss$/.test(w))?w.slice(0,-1):w;}).join(" ");
}
/* Two keys name the same item when one is the other with more said about it — "rope" inside
   "light 30m rope for the crux slot". Whole-word, so "axe" cannot match inside a longer word,
   and a floor of 3 characters so a stray short token cannot swallow half the list. */
function sameGear(a: string,b: string){
  const s=a.length<=b.length?a:b,l=a.length<=b.length?b:a;
  if(s.length<3)return false;
  return new RegExp("(^|\\s)"+s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"($|\\s)").test(l);
}
/* One list: the standard kit in its existing order, with any route-specific entry naming the
   same item REPLACING the stock wording in place, and genuinely new entries appended. */
function mergeGearList(assumed: string[] | null | undefined,extras: string[] | null | undefined,condItems: string[] | null | undefined){
  const out: string[]=[],keys: string[]=[];
  function push(txt: string){
    const kk=gearKey(txt);if(!kk)return;
    let i=-1;for(let j=0;j<keys.length;j++){if(keys[j]===kk||sameGear(keys[j],kk)){i=j;break;}}
    if(i<0){keys.push(kk);out.push(txt);return;}
    /* Keep the text that tells the climber more, but keep the SHORTER key — it is the one
       that goes on matching further spellings of the same item further down the list. */
    if(String(txt).length>String(out[i]).length)out[i]=txt;
  }
  (assumed||[]).forEach(push);
  const condKeys=(condItems||[]).map(gearKey).filter(Boolean);
  (extras||[]).forEach(function(x: string){
    const kk=gearKey(x);if(!kk)return;
    /* Anything the "only if there is snow" block owns stays there and nowhere else. Printing
       it here as well would have one section assert both that the gear is standard kit and
       that it is conditional — the "one Overview, two different racks" defect. */
    for(let j=0;j<condKeys.length;j++){if(condKeys[j]===kk||sameGear(condKeys[j],kk))return;}
    push(x);
  });
  return out;
}
function conditionalFor(route: GearEssentialsRoute,disc: string){
  if(disc!=="alpine"&&disc!=="mountaineering")return null;
  const ev=_snowEvidence(route);
  if(!ev.snowy||!ev.hedged)return null;
  const items=(DISC_ASSUMED[disc]||[]).filter(function(i: string){return /ice axe|crampons/i.test(i);});
  return items.length?{items:items,quote:ev.quote}:null;
}
/* GEAR & ESSENTIALS is one complete packing list. It used to end in a "Margin" picker
   (Ultralight / Midweight / Extra cautious) whose items only appeared when a climber chose the
   cautious tier, so the default view left out a first aid kit's companions: the headlamp, the
   emergency shelter, the spare food and water. The essentials are now part of the list itself:
   the core set on every climb, and the rest of the Ten Essentials wherever the climb is in the
   backcountry. mergeGearList still dedupes them against the discipline kit ("Warm layers",
   "Navigation") and the route's own entries. */
const GEAR_ESSENTIALS_CORE=["Water","Food / snacks","First aid kit","Headlamp + spare batteries","Sun protection (sunscreen, sunglasses)"];
const GEAR_ESSENTIALS_BACKCOUNTRY=["Rain shell","Warm layers","Navigation (map, compass / GPS)","Emergency bivy / space blanket","Knife / repair kit","Fire starter","Emergency food (beyond what you plan to eat)"];
const GEAR_BACKCOUNTRY_DISCS: Record<string, number>={hiking:1,alpine:1,mountaineering:1,ice:1,mixed:1,aid:1,scrambling:1};
function essentialsFor(disc: string){return GEAR_ESSENTIALS_CORE.concat(GEAR_BACKCOUNTRY_DISCS[disc]?GEAR_ESSENTIALS_BACKCOUNTRY:[]);}
/* Moved verbatim from RouteDetail.jsx; only the types were added.
   WAYPOINTS, rendered once. This markup existed TWICE — byte-identical for 2,300 characters
   under `cragOnly` and under `!cragOnly`, differing only in the empty-state copy — so every
   fix to it had to be made twice or silently applied to half the catalog. That is the shape
   the four-grade-parsers note in CLAUDE.md is about, and the reason it is extracted here
   rather than edited in place twice.

   Two behaviours are new, and they are the two halves of "the waypoints aren't clickable":

   1. A row with a coordinate is now a CONTROL. Tapping it pans the map above to that pin and
      opens its popup. Before this the map's own pins were tappable (a 14px transparent hit
      circle sits under each 6px marker for exactly that reason) but the list below it was
      inert, so the obvious thing to tap — the named row, with the note on it — did nothing.
   2. A row WITHOUT a coordinate says so. `GPXMap` skips `wp.lat == null` silently, so such a
      waypoint is listed here and simply absent from the map above; tapping it could never
      work and the climber had no way to know why. Measured on the live catalog: 44 pins
      across 17 WA alpine routes. An honest line beats a dead control — and note which way
      this points, since the alternative is a row that LOOKS tappable and is not. */
export default function RouteGearEssentialsBox({route,essentials,onEdit}: RouteGearEssentialsBoxProps){const disc=catOf(route) as keyof typeof DISC;const _multiDay=isMultiDayOuting(route);const assumed=assumedFor(route,disc).concat(essentialsFor(disc)).concat(_multiDay?["Tent / shelter","Sleeping bag","Sleeping pad","Stove + fuel","Extra food (overnight)"]:[]);const cond=conditionalFor(route,disc);const _hasOwn=!!(essentials&&essentials.length);const items=mergeGearList(assumed,essentials,cond?cond.items:[]);if(!items.length)return null;return <div style={{background:C.card,borderRadius:12,padding:"12px 14px",border:`1px solid ${C.border}`,marginTop:12}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,marginBottom:3}}><CardHead>GEAR & ESSENTIALS</CardHead>{onEdit?<EditIconButton onClick={function(){onEdit();}} title={_hasOwn?"Suggest a correction to this route's essentials":"Add gear this route needs beyond the standard kit"}/>:null}</div><div style={{fontSize:12,color:C.textMuted,marginBottom:10,lineHeight:1.45}}>{_hasOwn?("Standard kit and essentials for "+(DISC[disc]&&DISC[disc].label?DISC[disc].label.toLowerCase():disc)+", merged with what this route's own notes add. Check it against the notes above, which take precedence."):("Standard kit and essentials for "+(DISC[disc]&&DISC[disc].label?DISC[disc].label.toLowerCase():disc)+" — check it against this route's own notes above, which take precedence.")}</div><div style={{display:"flex",flexDirection:"column",gap:5,marginBottom:11}}>{items.map((gi: string,i: number)=><div key={i} style={{display:"flex",gap:8,fontSize:12.5,color:C.text,lineHeight:1.45}}><span style={{color:C.blue,flexShrink:0}}>•</span><span>{gi}</span></div>)}</div>{(function(){const cond=conditionalFor(route,disc);if(!cond)return null;return <div style={{paddingTop:10,borderTop:`1px solid ${C.borderLight}`,marginBottom:11}}><div style={{...SUB_LABEL,color:C.amber,marginBottom:3}}>Only if there is snow</div><div style={{fontSize:11.5,color:C.textMuted,marginBottom:7,lineHeight:1.45}}>This route mentions snow gear conditionally, not as standard kit — check current conditions before you carry it.</div><div style={{display:"flex",flexDirection:"column",gap:5,marginBottom:cond.quote?8:0}}>{cond.items.map((gi: string,i: number)=><div key={i} style={{display:"flex",gap:8,fontSize:12.5,color:C.text,lineHeight:1.45}}><span style={{color:C.amber,flexShrink:0}}>?</span><span>{gi}</span></div>)}</div>{cond.quote?<div style={{fontSize:11.5,color:C.textSub,lineHeight:1.5,background:C.surface,borderRadius:8,padding:"7px 9px",fontStyle:"italic"}}>{"“"+cond.quote+"”"}</div>:null}</div>;})()}{/* The "Specific to this route" section used to sit here. It is gone deliberately: its
       contents are merged into the single list above by mergeGearList, because measured against
       real data it was mostly a second copy of that list under a heading claiming the opposite.
       Do not reintroduce it — a route-specific entry now REPLACES the stock wording in place, so
       the qualifier ("Crampons (early/mid-season)") survives without the duplicate line. */}</div>;}
