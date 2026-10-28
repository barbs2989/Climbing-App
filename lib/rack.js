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
/* The same sentence as _rackEdited, for the rope. `ropeLen` is the contributed spelling
   ("60 m"); `rope_length_m` -> `ropeLengthM` is the enrichment column. The form offers ropeLen
   and SS whitelists it, but NOTHING mirrors it onto ropeLengthM — unlike `rack`, which the
   writer writes to both sides — so on a route carrying the enrichment number the two really can
   disagree, and the RACK box preferred the enrichment unconditionally. Three climbers could
   agree the rope is 70 m and keep reading 60 m, with no way to report it.
   295 of 8,365 WA routes carry rope_length_m, so that is the affected set; on the other 8,070 the
   contribution already displayed, which is why this never looked broken. */
export function _ropeEdited(r){return !!(r&&(r._contribFields||[]).indexOf("ropeLen")>=0);}
/* A contributed rope length can name TWO lengths ("60 m / 70 m" — the climb works on either), so
   it reads "60m or 70m". A single length reads as it always did ("60m"). */
export function fmtRopeLen(v){return String(v).split(/\s*\/\s*/).map(function(s){return s.replace(/\s+/g,"");}).filter(Boolean).join(" or ");}
/* The rope length the RACK bullet, the ROPEWORK card and the crag Overview all print: an agreed
   correction wins (_ropeEdited), else the enrichment number, else the contributed spelling. One
   function, so the cards cannot disagree. */
export function ropeLenText(route){var _ropeContrib=route.ropeLen?fmtRopeLen(route.ropeLen):"";return (_ropeEdited(route)&&_ropeContrib)?_ropeContrib:(route.ropeLengthM?(route.ropeLengthM+"m"):_ropeContrib);}
/* `rack` is the LAST resort before giving up, and it was missing entirely — which is why this
   exists. The chain reads contribRack -> detailedRack -> proNeeds -> rack -> null; before
   this it stopped at proNeeds and returned null, so a route whose rack lived in `rack` fell
   through to the generic per-discipline table and was shown a stock list while its own rack
   sat in the row.

   Found on `wa_west_face` (West Face, South Peak, Gunsight Range), which stores
   ["Cams, single set 0.4-3\"", "Nuts, small-to-mid set", "8 alpine quickdraws",
   "Double 60m x 9mm ropes"] in `rack` and nothing in the two columns the reader looked at.
   Measured: exactly ONE route in the WA alpine scope is in that shape today (595 of 610 carry
   rack data; 594 were already readable). So this fixes one route now — the reason to fix the
   READER rather than that row is that `rack` is populated on 419 WA routes overall and is a
   column the app otherwise uses, so "populated but unreadable" would keep recurring as
   enrichment fills it. Same shape as descent_text: populated on 1,021 rows and rendered on
   none.

   Placed AFTER proNeeds, not before, so no existing route changes what it displays: this can
   only turn a generic fallback into the route's own rack, never the reverse. The climber's
   agreed correction still wins first — contribRack is untouched. */
/* WHAT COUNTS AS RACK. The RACK card is the protection and ropework hardware a party carries:
   cams, nuts, hexes, tricams, slings, cord, draws, carabiners, pickets, flukes, screws, pitons,
   v-thread tool, ropes. An ice axe is not rack; neither are crampons, boots, a helmet, a harness,
   layers, poles, navigation or a crevasse-rescue kit — those are the packing list (GEAR &
   ESSENTIALS). Measured 2026-10-15 across 14,200 WA routes: 1,275 rendered a rack of their own and
   386 of those put non-rack items under RACK — 158 whole sentences of `detailed_rack` ("Carry an ice
   axe if snow lingers."), 226 sentences mixing both ("A 60m rope and a medium alpine rack; light
   crampons and a light ice axe are recommended into early summer."), 95 `gear` entries ("Helmet",
   "Sturdy boots that edge well") reached through db.js's rack->gear fallback, and 42 `rack` entries.
   The data was rewritten (scripts/oneoff/fix-rack-non-rack-items.mjs) and this filter is the reader's
   half: a rack source is split, the rack-shaped entries render under RACK and the rest under GEAR &
   ESSENTIALS (rackLeftovers), so a future import that files a helmet under rack cannot put it back.
   A sentence that says NO rack is needed ("No rope or rack needed for the standard scramble.") is
   rack information and stays. `audit:rack-items` reports what this filter would hide, so the data
   can be fixed rather than merely masked. */
const RACK_HARDWARE=/(?:\b(?:cams?|camalots?|mastercams?|totems?|link ?cams?|dragons?|micro ?cams?|c[34]s?|[xz]4s?|wires?|wired|brassies?|rps?|nuts?|stoppers?|hex(?:es|entrics?)?|tricams?|slings?|runners?|cordelettes?|draws?|quickdraws?|carabiners?|lockers?|biners?|pickets?|flukes?|screws?|pitons?|pins?|knifeblades?|offsets?|aliens?|ball ?nuts?|big ?bros?|rack|protection|pro|cord|webbing|v-?threads?|ropes?|anchors?|placements?|bolts?|bolted|screamers?|haul lines?|tag lines?|crash ?pads?|pads?|rappel (?:gear|kit|tat)|unroped|roped|non-technical|solo(?:ed|ing)?|hand-?lines?|(?:technical|rock|no|natural|trad|fixed|light|ice|glacier|snow) (?:rock |ice |or ice |or glacier |climbing )?gear|gear (?:to|up to|is)|doubles?|singles?|triples?|camming|anchoring equipment|chockstones?|simul|simul-?climb(?:ing)?|gear list|light kit|sizes?|pieces?|sets?|rap rings?|tat|trad|sport|runout|takes gear|(?:small|medium|large|big|extra|old|fixed) gear|protects?|protected|unprotect(?:ed|able)?)\b|#\d|\d\s*(?:in|inch|inches|")\b|^\s*(?:none|minimal|very little)\.?\s*$)/i;
export function isRackEntry(s){return typeof s==="string"&&RACK_HARDWARE.test(s);}
/* The gear that is NOT rack: what the packing list owns. An entry is moved out of RACK only when it
   NAMES one of these and nothing rack-shaped — a sentence that is neither ("Terrain includes sections
   of loose boulders.") is left where it is, because GEAR & ESSENTIALS would be the wrong card for it
   too; audit:rack-items lists those separately for a data fix. */
const NON_RACK_GEAR=/\b(ice ?axes?|axes?|ice ?tools?|tools?|crampons?|microspikes?|spikes|boots?|shoes?|footwear|helmets?|harness(?:es)?|belay(?:[ -/]rappel)? devices?|atc|grigri|layers?|jackets?|puffy|shell|gloves?|mittens?|headlamps?|navigation|\bmaps?\b|gps|compass|food|snacks?|water|filter|sun ?screen|sunglasses|glacier glasses|goggles|trekking poles?|\bpoles?\b|snowshoes?|skis?|splitboard|tents?|bivy sacks?|sleeping|stove|bear canister|first[- ]aid|chalk|brush(?:es)?|tape|whistle|beacon|probe|shovel|wands?|inreach|satellite|communicator|avalanche gear|gaiters?|backpack|altimeter|wag bag|blue bag|prusiks?|pulleys?|traxion|tibloc|ascenders?|crevasse[- ]rescue (?:kit|gear|hardware)|portaledge|rescue kit|jumars?|crevasse kit|glacier equipment|mountaineering gear|snow and ice equipment)\b/i;
export function isNonRackGear(s){return typeof s==="string"&&NON_RACK_GEAR.test(s);}
export function splitRackEntries(list){var rack=[],other=[];(Array.isArray(list)?list:[]).forEach(function(x){if(typeof x!=="string"||!x.trim())return;((!isRackEntry(x)&&isNonRackGear(x))?other:rack).push(x);});return {rack:rack,other:other};}
/* The entries routeRackFor READ and set aside, from the same source it answered from, so the
   route page can print them under GEAR & ESSENTIALS. Nothing a route states is dropped; it is
   re-homed. Empty when the rack came from pro_needs (a protection statement, not a list). */
function _rackSource(route){const c=contribRack(route);if(c)return c;if(route&&route.detailedRack)return rackFromText(route.detailedRack);if(route&&route.proNeeds)return null;const r=route&&route.rack;return (Array.isArray(r)&&r.length)?r:((typeof r==="string"&&r.trim())?[r]:null);}
export function rackLeftovers(route){const src=_rackSource(route);return src?splitRackEntries(src).other:[];}
export function routeRackFor(route){const src=_rackSource(route);if(src){const s=splitRackEntries(src);if(s.rack.length)return s.rack;if(route&&route.proNeeds)return [route.proNeeds];return null;}if(route&&route.proNeeds)return [route.proNeeds];return null;}

/* The per-discipline DEFAULT rack, used when a route carries no rack of its own. Measured
   2026-08-14 against 8,366 WA routes: detailed_rack 957, pro_needs 990 — so routeRackFor()
   answers for roughly 12% of the catalog and this table answers for the rest. Anything drawn
   from here is generic and MUST be labelled as such wherever it renders; the route page flags
   it `rackGeneric`, and the crew card names it "typical". Presenting it as the route's own
   rack would be a fabricated claim about a specific climb.

   RACK ONLY (2026-10-15): this table used to carry the whole kit — "Ice axe + crampons", "Warm
   layers", "Navigation", "Day's food/water", boots, helmet — so every alpine, mountaineering, ice,
   mixed and scrambling route without a rack of its own printed an ice axe under RACK. Those items
   are DISC_ASSUMED's and the essentials list's in RouteDetail.jsx, where they already render; here
   only protection and ropes remain. audit:rack-items asserts every entry passes isRackEntry. */
export const DISC_RACK={
 sport:["Quickdraws — count the bolts, +2 spare (typ. 12–18)","2 locking carabiners for the anchor"],
 trad:["Cams — single rack #0.3–#3; double #0.5–#2 if sustained","Nuts — 1 set (#1–#11)","Alpine draws ×6–8","Quickdraws ×4–6","Slings + cordelette","2–3 lockers for anchors"],
 bouldering:["Crash pads — 2–4 (more for high/bad landings)"],
 ice:["Ice screws — 8–12 (add stubbies for thin ice)","Rope — 60 m","Screamers","V-thread tool","5 m cord for rappels"],
 mixed:["Ice screws ×6–10","Small cam/nut set","Rope — 60 m"],
 alpine:["Rope — single 60 m (or twins for raps)","Light rack — cams #0.3–#2, a few nuts, 4–6 slings"],
 mountaineering:["Rope","Picket — 1–2 per rope team where the snow steepens","2 locking carabiners"],
 scrambling:["Light rope + a few slings for exposed steps, if the party wants one"],
 hiking:[],
 aid:["Full trad rack + offset cams/nuts","Lead rope","Haul line"]
};

