// What rack does a route need? — shared, because TWO screens now answer that question.
//
// These lived in RouteDetail.jsx, which was fine while the route page was the only reader.
// The crew card asks the same question ("what are we bringing?") and lives in
// ClimbMatchCore.jsx, and core cannot import RouteDetail: RouteDetail is lazy-loaded and
// already imports FROM core, so a static import would both create a cycle and drag the whole
// route page into the main bundle. Same reasoning, and the same shape, as lib/rappels.js.
//
// Moved verbatim rather than reimplemented. A second copy of this logic is the four-parsers
// mistake `check:grade-parser` exists to stop, and the correction rule below is one this repo
// has already had to fix twice.

/* Split researched rack prose into sentences, so a paragraph renders as a list. */
export function rackFromText(s){return (s||"").split(/\.\s+(?=[A-Z])/).map(x=>x.trim()).filter(Boolean).map(x=>/[.!?]$/.test(x)?x:x+".");}

/* A climber's agreed rack correction must out-vote the enrichment, exactly as _rapEdited does
   for rappelDetail and _descEdited for descentText. THE SAME RULE, THE THIRD TIME.

   The contribute form's "Rack & gear" field is keyed `rack`, and ClimbMatch's merge files it
   into `gearTiers.required` — it writes neither `detailedRack` nor `rack`. So before this,
   routeRackFor could not see a correction at all: it read detailedRack, then proNeeds, then the
   generic DISC_RACK. The correction was not discarded, which is what made it hard to notice —
   it rendered in the GearTiers panel further down the SAME tab, so the Overview asserted two
   different racks for one route with nothing saying which was current, and the box the climber
   had actually corrected kept showing the value they had replaced. Measured by rendering:
   scripts/oneoff/probe-rack-correction-reaches-the-rack-box.mjs.

   Gating on _rackEdited is load-bearing, not defensive. gearTiers.required is ALSO populated by
   seed data and enrichment (every seed route carries one), so preferring it unconditionally
   would invert the rule for every route nobody has corrected. */
export function _rackEdited(r){return !!(r&&(r._contribFields||[]).indexOf("rack")>=0);}
export function contribRack(r){const req=(r&&r.gearTiers&&r.gearTiers.required)||[];return (_rackEdited(r)&&req.length)?req:null;}
export function routeRackFor(route){const c=contribRack(route);if(c)return c;return (route&&route.detailedRack)?rackFromText(route.detailedRack):((route&&route.proNeeds)?[route.proNeeds]:null);}

/* The per-discipline DEFAULT rack, used when a route carries no rack of its own. Measured
   2026-08-14 against 8,366 WA routes: detailed_rack 957, pro_needs 990 — so routeRackFor()
   answers for roughly 12% of the catalog and this table answers for the rest. Anything drawn
   from here is generic and MUST be labelled as such wherever it renders; the route page flags
   it `rackGeneric`, and the crew card names it "typical". Presenting it as the route's own
   rack would be a fabricated claim about a specific climb. */
export const DISC_RACK={
 sport:["Quickdraws — count the bolts, +2 spare (typ. 12–18)","2 locking carabiners for the anchor"],
 trad:["Cams — single rack #0.3–#3; double #0.5–#2 if sustained","Nuts — 1 set (#1–#11)","Alpine draws ×6–8","Quickdraws ×4–6","Slings + cordelette","2–3 lockers for anchors"],
 bouldering:["Crash pads — 2–4 (more for high/bad landings)","Spotter(s)","Tape for sharp holds"],
 ice:["Ice tools ×2","Crampons (mono/dual point)","Ice screws — 8–12 (add stubbies for thin ice)","Rope — 60 m","Screamers","V-thread tool","5 m cord for rappels"],
 mixed:["Ice tools ×2","Crampons","Ice screws ×6–10","Small cam/nut set","Rope — 60 m"],
 alpine:["Rope — single 60 m (or twins for raps)","Light rack — cams #0.3–#2, a few nuts, 4–6 slings","Ice axe + crampons (if snow/ice on route)","Warm layers","Navigation","Day's food/water"],
 mountaineering:["Ice axe","Crampons","Rope","Harness","2 prusiks","2 locking carabiners","Pulley","Picket","Crevasse-rescue gear","Navigation","Warm layers","Glacier glasses","Food/water"],
 scrambling:["Approach shoes (sticky rubber)","Helmet (rockfall)","Light rope + harness for exposed steps","Navigation","Water","Layers"],
 hiking:["Footwear for the terrain","Navigation — map / GPS / compass","Water + filter","Food","Layers + shell","Sun protection","Headlamp","First-aid"],
 aid:["Full trad rack + offset cams/nuts","Aiders/etriers ×2","Daisy chains","Ascenders","Lead rope","Haul line"]
};

/* The gear a CREW needs to divide up, in the shape GearTiers renders.
   Returns `groups` (neutral, untiered) rather than required/recommended/optional whenever the
   tiers would be invented: the DB carries a rack, not a priority ranking, and painting one
   list red as "REQUIRED" and another amber as "RECOMMENDED" would be a safety-adjacent claim
   nothing in the row supports. A route that HAS real tiers (seed, or a climber's contribution)
   keeps them untouched. */
export function crewGearFor(route, discLabel){
  if(!route) return null;
  if(route.gearTiers) return route.gearTiers;
  const groups=[];
  const own=routeRackFor(route);
  if(own&&own.length) groups.push(["On the rack",own]);
  const ess=(route.whatToBring||[]).filter(Boolean);
  if(ess.length) groups.push(["Essentials",ess]);
  /* Only fall back to the generic table when the route told us nothing at all — a route with
     its own rack must not have a stock list stapled underneath it. */
  if(!groups.length){
    const g=DISC_RACK[discLabel]||[];
    if(g.length) groups.push(["Typical "+discLabel+" rack — not this route's own",g]);
  }
  return groups.length?{groups:groups}:null;
}
