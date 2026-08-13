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
  const s = String(name).toLowerCase();
  // WORD-BOUNDED, and this is not pedantry: a plain substring test matches "west" inside "Weston
  // Wall" and "north" inside "Northern Lights", manufacturing a disagreement on a route whose name
  // carries no direction at all. A report-only audit that invents findings is one people learn to
  // ignore. Hyphens are word characters for our purposes ("South-West"), so \b handles them.
  for (const [w, k] of WORDS) if (new RegExp(`\\b${w}\\b`).test(s)) return k;
  // Bare compass abbreviations appear as words in real route names ("NE Ridge", "SW Couloir").
  const m = /\b(ne|nw|se|sw|n|s|e|w)\b/.exec(s);
  return m ? m[1] : null;
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
// FACE is tested first: "Northeast Face Direct off the North Ridge" is a face route. A name carrying
// both words is describing a face reached from a ridge far more often than the reverse.
export const landform = name => FACE.test(name) ? "face" : RIDGE.test(name) ? "ridge" : "other";
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

// Everything below needs the database, so it runs only when this file is EXECUTED. Importing it for
// the assertions above must not open a connection.
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (!isMain) { /* imported for testing */ }
else {
const { selectAll } = await import("./lib/supabase-env.mjs");
const rows = await selectAll("routes", "id,name,area_id,aspect,face,discipline",
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
}
console.log(`\n${hits.length} disagreement(s): ${hits.filter(h => h.kind === "face").length} face (a single plane — a real contradiction), ${hits.filter(h => h.kind !== "face").length} ridge/other (opposed, so worth a look).`);
console.log(`\nEITHER SIDE MAY BE THE WRONG ONE. Read the row before changing anything: aspect drives`);
console.log(`the sun/shade readout, and on wa_little_annapurna_south_slopes the aspect was right and`);
console.log(`the NAME was wrong. Check the row's own \`face\`, its waypoints, and its peers on the peak.`);
// Report-only: things to look at, never "these are bugs".
process.exit(0);
}
