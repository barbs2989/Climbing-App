#!/usr/bin/env node
// Does a route's NAME point the same way as its `aspect` column?
//
// REPORT-ONLY, and it must stay that way. wa_little_annapurna_south_slopes is why: it was reported
// as "the aspect is wrong, set it to S", and that repair would have been BACKWARDS. The aspect
// (N/NW) was correct, the `face` column agreed with it, the route's own waypoint sat north of the
// summit, and the peak's genuine south side is a different route in a different valley. What was
// wrong was the NAME. Aspect drives the sun/shade readout, so "fixing" it would have turned a
// correctly-shady north slog into a sunny one.
//
// So this prints a DISAGREEMENT, never a repair. Each hit needs the row read — name, aspect, face,
// waypoints, and the peer rows on the same peak — before anything is written. And the name half is
// an identity change: it goes through hand-written SQL a human runs, not through enrich:apply.
//
//   node scripts/audit-aspect-vs-name.mjs [--state wa] [--limit N]
import path from "path";
import { fileURLToPath } from "url";

const args = process.argv.slice(2);
const arg = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const STATE = arg("--state", "wa");

// Compass bearings, so "how far apart are these two directions" is arithmetic rather than a table of
// special cases. 8-point is as fine as either side of this comparison ever gets.
export const DEG = { n: 0, ne: 45, e: 90, se: 135, s: 180, sw: 225, w: 270, nw: 315 };
export const sep = (a, b) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };

// Longest first, so "northeast" is never matched as "north".
const WORDS = [
  ["northeast", "ne"], ["northwest", "nw"], ["southeast", "se"], ["southwest", "sw"],
  ["north-east", "ne"], ["north-west", "nw"], ["south-east", "se"], ["south-west", "sw"],
  ["north", "n"], ["south", "s"], ["east", "e"], ["west", "w"],
];
export const dirInName = name => {
  const raw = String(name);
  const s = raw.toLowerCase();
  // WORD-BOUNDED, and this is not pedantry: a plain substring test matches "west" inside "Weston
  // Wall" and "north" inside "Northern Lights", manufacturing a disagreement on a route whose name
  // carries no direction at all. A report-only audit that invents findings is one people learn to
  // ignore. Hyphens are word characters for our purposes ("South-West"), so \b handles them.
  //
  // EARLIEST BY POSITION, not first in this list. Route names routinely carry two directions and
  // lead with their own: "South Ridge (North Peak)" is the SOUTH Ridge of the north summit, and
  // "Southwest Slope - Southeast Ridge" is a southwest line. Scanning in list order read both
  // backwards and produced three false disagreements on the first real run. Ties go to the longer
  // word so "northeast" still beats "north" at the same offset.
  // A direction bound to a SUMMIT noun names which top you are going to, not which way the rock
  // faces. "Southeast Peak Standard" is the route up Warrior Peak's southeast summit — the row says
  // so itself, "the higher of Warrior Peak's two summits, versus the lower northwest summit" — and
  // its NW aspect is not a contradiction. Same shape as "South Summit" and "North Peak".
  const SUMMIT_NOUN = /^\s*(?:peak|summit|tower|spire|pinnacle|horn|dome)\b/;
  let best = null;
  for (const [w, k] of WORDS) {
    const m = new RegExp(`\\b${w}\\b`).exec(s);
    if (!m) continue;
    if (SUMMIT_NOUN.test(s.slice(m.index + w.length))) continue;
    if (!best || m.index < best.i || (m.index === best.i && w.length > best.len)) best = { i: m.index, k, len: w.length };
  }
  if (best) return best.k;
  // Bare compass abbreviations appear as words in real route names ("NE Ridge", "SW Couloir"), and
  // this is matched CASE-SENSITIVELY against the original name. Lowercased, `\bs\b` matches the
  // possessive in "Ford's Theatre", "Marvin's Ear" and "Lover's Lane" — three routes whose names
  // carry no direction at all, each reported as a 180-degree contradiction on the first real run.
  // Real route names write the abbreviation capitalised; a lone lowercase "s" never means south.
  const m = /\b(NE|NW|SE|SW|N|S|E|W)\b/.exec(raw);
  return m ? m[1].toLowerCase() : null;
};
export const dirOfAspect = a => {
  const s = String(a || "").trim().toLowerCase().replace(/[^nsew]/g, "");
  return s && DEG[s] !== undefined ? s : null;
};

// THE PRECISION RULE, and the reason this is worth running at all.
//
// A RIDGE, arete, buttress or spur SEPARATES two faces. The North Ridge of a peak has an east side
// and a west side, and either is a legitimate `aspect` — so a 90-degree disagreement there is normal
// and flagging it would bury the real hits under correct data. Only a ridge whose aspect points the
// OPPOSITE way is saying something contradictory.
//
// A FACE, wall, slab, couloir or gully is a single plane. Its name and its aspect are claims about
// the same thing, so a 90-degree disagreement there IS a contradiction.
const RIDGE = /\b(ridge|arete|arête|buttress|spur|rib|crest)\b/i;
const FACE = /\b(face|wall|slab|slabs|couloir|gully|gulley|chute|slope|slopes|glacier|headwall)\b/i;
// Whichever word comes FIRST, by the same principle as the direction scan: a route name leads with
// what it is. Testing FACE before RIDGE looked right — "Northeast Face Direct off the North Ridge"
// is a face route — but it read "West Ridge / Colonial Glacier" as a face, because `glacier` is in
// the FACE set. That row's aspect of N is CORRECT and its own `face` column says why ("final class 3
// section on the north-facing upper slopes"): a west ridge with north-facing upper slopes is a
// ridge, and only the ridge rule tolerates the perpendicular aspect that follows from it.
export const landform = name => {
  const f = FACE.exec(name), r = RIDGE.exec(name);
  if (f && r) return f.index <= r.index ? "face" : "ridge";
  return f ? "face" : r ? "ridge" : "other";
};
// "other" — a named line with no landform word ("Beckey Route") — is treated as a ridge, the
// conservative side, because nothing in the name says it is a single plane.
//
// Compared with >=, and the boundary is the whole rule rather than a detail. A face is ONE PLANE, so
// a North Face facing east is already a contradiction at exactly 90 degrees — with a strict > that
// exact case, the commonest way for this defect to appear, fell through as clean. A ridge is only
// contradictory when OPPOSED, at exactly 180.
export const limitFor = kind => (kind === "face" ? 90 : 180);

// One route's verdict, extracted so it can be tested without a database. Returns null when the
// route is not comparable at all.
export function judge(r) {
  const nd = dirInName(r.name);
  if (!nd) return { skip: "no direction in the name" };
  const ad = dirOfAspect(r.aspect);
  if (!ad) return { skip: "no usable aspect" };
  const kind = landform(r.name);
  const d = sep(DEG[nd], DEG[ad]);
  return { nd, ad, kind, d, hit: d >= limitFor(kind) };
}

/* THE ROW'S OWN PINS ARE A THIRD RECORD, and neither the name nor the aspect derives from them.
   `face` is deliberately NOT used as evidence: it and `aspect` come from the same enrichment, so
   their agreeing is one claim counted twice. This is how CLAUDE.md records
   wa_little_annapurna_south_slopes being settled — its "base of south slopes" waypoint sat NORTH
   of the summit, and that is what showed the ASPECT was right and the NAME was wrong.

   AND THE DISTANCE DECIDES WHETHER THE GEOMETRY MAY SPEAK AT ALL. A pin at the base of the climb
   says which way the face points. A trailhead 11 km away says which way you WALK IN, and a party
   routinely approaches from one side and climbs another — reading that as an aspect would
   manufacture findings with total confidence, which is the failure this audit's own history
   records from its first run. So only pins within a kilometre are quoted; the rest are counted and
   explicitly refused. */
const NEAR_KM = 1.0;
function sideOf(r) {
  const num = (v) => (v == null || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));
  const wps = (r.waypoints || []).map(w => ({ ...w, lat: num(w && w.lat), lng: num(w && w.lng) })).filter(w => w.lat != null);
  if (!wps.length) return null;
  const anchor = wps.find(w => /summit|topout/i.test(String(w.type || "") + String(w.name || "")));
  if (!anchor) return null;
  const R = Math.PI / 180;
  const km = (p, q) => 2 * 6371 * Math.asin(Math.sqrt(Math.sin((q.lat - p.lat) * R / 2) ** 2
    + Math.cos(p.lat * R) * Math.cos(q.lat * R) * Math.sin((q.lng - p.lng) * R / 2) ** 2));
  const brg = (p, q) => {
    const y = Math.sin((q.lng - p.lng) * R) * Math.cos(q.lat * R);
    const x = Math.cos(p.lat * R) * Math.sin(q.lat * R) - Math.sin(p.lat * R) * Math.cos(q.lat * R) * Math.cos((q.lng - p.lng) * R);
    return (Math.atan2(y, x) / R + 360) % 360;
  };
  const C16 = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"];
  const others = wps.filter(w => w !== anchor).map(w => ({ w, d: km(anchor, w) })).filter(x => x.d > 0.02);
  if (!others.length) return null;
  const near = others.filter(x => x.d <= NEAR_KM).sort((a, b) => a.d - b.d);
  if (!near.length) {
    const closest = others.sort((a, b) => a.d - b.d)[0];
    return `${others.length} pin(s), closest ${closest.d.toFixed(1)} km away — an APPROACH direction, not a face; the geometry CANNOT speak here`;
  }
  return near.slice(0, 3).map(x => `${C16[Math.round(brg(anchor, x.w) / 22.5) % 16]} at ${Math.round(x.d * 1000)} m (${x.w.name || x.w.type})`).join(", ")
    + " — pins this close describe the FACE";
}

// Everything below needs the database, so it runs only when this file is EXECUTED. Importing it for
// the assertions above must not open a connection.
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (!isMain) { /* imported for testing */ }
else {
const { selectAll } = await import("./lib/supabase-env.mjs");
const rows = await selectAll("routes", "id,name,area_id,aspect,face,discipline,waypoints",
  `id=like.${STATE}\\_*`, { pageSize: 1000 });
if (!rows.length) { console.error(`FAILED — zero routes read for state "${STATE}". A guard that reports absence must not treat an empty read as a clean catalog.`); process.exit(1); }

const hits = [];
let compared = 0, noAspect = 0, noDir = 0;
for (const r of rows) {
  const v = judge(r);
  if (v.skip === "no direction in the name") { noDir++; continue; }
  if (v.skip === "no usable aspect") { noAspect++; continue; }
  compared++;
  if (v.hit) hits.push({ r, ...v });
}

hits.sort((a, b) => b.d - a.d || a.r.id.localeCompare(b.r.id));
console.log(`\naspect vs name — ${STATE.toUpperCase()}: ${rows.length} routes, ${compared} comparable`);
console.log(`(skipped: ${noDir} with no direction in the name, ${noAspect} with no usable aspect)\n`);
for (const h of hits) {
  console.log(`${String(h.d).padStart(3)}°  ${h.r.id}`);
  console.log(`      name "${h.r.name}" says ${h.nd.toUpperCase()}, aspect says ${String(h.r.aspect).toUpperCase()}  [${h.kind}]`);
  if (h.r.face) console.log(`      face: ${String(h.r.face).replace(/\s+/g, " ").slice(0, 120)}`);
  const g = sideOf(h.r);
  if (g) console.log(`      geometry: ${g}`);
}
console.log(`\n${hits.length} disagreement(s): ${hits.filter(h => h.kind === "face").length} face (a single plane — a real contradiction), ${hits.filter(h => h.kind !== "face").length} ridge/other (opposed, so worth a look).`);
console.log(`\nEITHER SIDE MAY BE THE WRONG ONE. Read the row before changing anything: aspect drives`);
console.log(`the sun/shade readout, and on wa_little_annapurna_south_slopes the aspect was right and`);
console.log(`the NAME was wrong. Check the row's own \`face\`, its waypoints, and its peers on the peak.`);
// Report-only: things to look at, never "these are bugs".
process.exit(0);
}
