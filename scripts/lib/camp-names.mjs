// WHAT COUNTS AS THE SAME PLACE — shared by solve-camp-elevations.mjs (which WRITES a camp's
// elevation) and audit-camp-elevations.mjs (which checks the ones already written).
//
// These two tools must never drift on this. A solver that writes under one definition of
// "same place" and an audit that checks under another will either bless its own mistakes or
// report correct work as broken — and this repo has already paid for exactly that shape twice,
// with four copies of a grade parser and three waypoint audits carrying different tolerances.
//
// EVERY RULE HERE WAS PAID FOR BY A WRONG ANSWER. The comments say which.
export const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();

// A dispersed zone has no point to look up. These words say "somewhere around here", not "here".
// 66 of the 230 camp names are this, and a number for one of them invents precision the record
// cannot carry — the same fabrication class as a straight line posing as a trail distance.
export const ZONE = /\b(dispersed|informal|improvised|bivies|bivouacs|pullouts|cross-country|anywhere|various|scattered|numerous|several|wherever|on-wall|ledges|benches|meadows|camps|sites)\b/i;

// Two places joined. The second one is not always capitalised — "Apex Pass and the high ground
// west of Wolframite" slipped through a version that required a capital after "and".
export const MULTI = /\b\w+\s+and\s+([A-Z]|the\s+\w+)|\//;

// The searchable place is the FIRST clause: "Shield Lake, north of Prusik Pass" -> "Shield Lake".
export const placeOf = (name) => String(name || "").split(/[,—–(]|\s-\s/)[0].trim();

// Landform, direction and camp words describe a place without NAMING one. A name built only from
// these ("basin below the east peak") identifies nothing — and it denotes a DIFFERENT place on
// every peak that has an east summit, which the region gate cannot separate.
const RELATIVE = new Set(["basin", "below", "above", "east", "west", "north", "south", "middle",
  "upper", "lower", "the", "peak", "camp", "camps", "campsite", "bivy", "bivouac", "ridge", "creek",
  "lake", "lakes", "col", "pass", "saddle", "glacier", "high", "low", "under", "near", "beside",
  "valley", "meadow", "meadows", "side", "face", "summit", "top", "base", "and", "of", "at", "on"]);
export const distinctiveTokens = (x) => new Set(norm(x).split(" ").filter((t) => t.length > 2 && !RELATIVE.has(t)));

// THE TRAILING DESCRIPTION SAYS WHICH PART OF THE FEATURE YOU MEAN. Searching the leading proper
// noun alone matched Iron Peak's SUMMIT for "Iron Peak saddle dry camp" and Liberty Cap's summit
// (14,118 ft) for "Liberty Cap saddle" — 5 of 11 results wrong, every one with the right name,
// right county and a real DEM reading. If anything after the proper noun names a PART of it, the
// leading-noun search must not be offered at all.
// A STRUCTURE NOUN THE MATCHED FEATURE DOES NOT CARRY MEANS A DIFFERENT PLACE STANDING NEAR IT —
// and systematically at a different height. "Blue Lake trailhead roadside parking" is the pullout
// on SR-20 at ~5,200 ft; the gazetteer matches BLUE LAKE, up the trail at 6,264 ft, and the audit
// then reports a correct stored value as a 1,064 ft error. Two of its first three findings were
// this, not data defects.
// This rule already existed in this repo — the saddle solver records it as "test the OBJECT: if
// the pin name carries a structure noun the matched feature's name does not (crossing, junction,
// contour, bend, trail), the pin is a different kind of thing standing near that feature." It was
// simply never carried across to the camp tools.
export const SUBFEATURE = /\b(basin|floor|tarns?|cirque|meadows?|valley|bench(es)?|lakes?|creek|below|under|beneath|saddle|col|notch|shoulder|spur|moraine|shelf|gully|couloir|face|buttress|slopes?|flank|headwall|bowl|glacier|ridge|arete|crest|summit|toe|snout|trailhead|trail\s?head|parking|pullout|pull[- ]?out|roadhead|road\s?end|junction|crossing|ford|turnoff|turn[- ]?off|approach|outlet|inlet)\b/i;

// A LINEAR OR SPRAWLING FEATURE HAS NO SINGLE HEIGHT — its label node hangs at an arbitrary point
// along it. A LAKE is deliberately absent: a lake surface is flat, which is why the Shield Lake
// control agreed to 7 ft.
export const LINEAR = new Set(["stream", "river", "path", "track", "valley", "ridge", "wood",
  "forest", "cliff", "canal", "arete", "glacier", "moraine", "gully", "couloir", "spur", "crest"]);

// Point-like tails that can be stripped to reach the mapped feature: OSM maps the LAKE, not the
// basin around it, and you camp at the lake. `creek`, `ridge` and `valley` are NOT here — those
// are linear, and stripping to them reintroduces the defect LINEAR exists to stop.
export const TAIL = /\s+(basin|floor|tarns?|area|bench(es)?|shelf|cirque)$/i;

const NOISE = /\b(the|a|an|and|at|on|in|of|for|from|to)\b/g;
export const core = (x) => norm(x).replace(NOISE, " ").replace(/\s+/g, " ").trim();

// "X Camp" is the camp AT X, so a trailing generic camp word must not break an identity match:
// "Pelton Basin" was refused while the catalog held "Pelton Basin Camp" at 5,400 ft.
// This strips only CAMP words, NEVER a feature type — the distinction a token-overlap gate got
// wrong when it gave a town park in Darrington a ridge camp's 4,900 ft. Whatcom Pass and Whatcom
// Camp are two different places sharing a proper noun.
const CAMPWORD = /\s+(camp|camps|campsite|campsites|campground|camp site)$/;
export const ident = (x) => { let v = core(x); let prev; do { prev = v; v = v.replace(CAMPWORD, ""); } while (v !== prev); return v; };

// The run of Capitalised words at the front, which is what a gazetteer actually holds:
// "Reflection Lakes area winter snow camp" -> "Reflection Lakes".
export const leadingProper = (name) => {
  const toks = String(name || "").trim().split(/\s+/);
  const out = [];
  for (const t of toks) {
    if (/^[A-Z][A-Za-z'’.-]*$/.test(t)) out.push(t);
    else if (out.length && /^(of|the|and|de|la)$/i.test(t)) out.push(t);
    else break;
  }
  while (out.length && /^(of|the|and|de|la)$/i.test(out[out.length - 1])) out.pop();
  return out.join(" ");
};

/** The candidate queries for a camp name, in the order they should be tried, with the
    leading-proper form withheld when the remainder names a part of the feature. */
export function searchCandidates(name) {
  const place = placeOf(name);
  const alt = TAIL.test(place) ? place.replace(TAIL, "").trim() : null;
  const lead = leadingProper(place);
  const rest = lead ? String(place).slice(lead.length) : "";
  const leadOk = lead && lead !== place && lead !== alt && distinctiveTokens(lead).size
    && norm(lead).split(" ").length >= 2 && !SUBFEATURE.test(rest);
  // THE TAIL-STRIP CANDIDATE NEEDS THE SAME >=2-WORD RULE THE LEADING-NOUN ONE HAS, and it did
  // not: stripping `basin` from "Bedal Basin, below the north side of Bedal Peak" left the single
  // word "Bedal", which matched a HAMLET on the Mountain Loop Highway 3,796 ft below the basin.
  // A one-word query is not an identity — it is whatever the gazetteer happens to hold under that
  // word, and settlements are named after the landforms beside them.
  const altOk = alt && distinctiveTokens(alt).size && norm(alt).split(" ").length >= 2;
  return [place]
    .concat(altOk ? [alt] : [])
    .concat(leadOk ? [lead] : []);
}

/** Why a name cannot be resolved to a single point at all, or null if it can be tried. */
export function unresolvable(name) {
  const place = placeOf(name);
  if (ZONE.test(name)) return "dispersed zone — no single height exists";
  if (MULTI.test(name)) return "names more than one place";
  if (norm(place).split(" ").length < 2) return "not a distinctive place name";
  if (!distinctiveTokens(place).size) return "purely relative — no proper noun to identify a place";
  return null;
}
