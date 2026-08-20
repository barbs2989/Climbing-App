// Is wa_south_face_direct alone, or is there a CLASS of routes filed on the wrong area?
//
// MEASUREMENT ONLY — this ships no audit and no repair. The point is to size the class before
// anyone decides whether it is worth a detector, which is the discipline `audit:area-parents`
// records after its first draft shipped at 12 real findings out of 41.
//
// The tell that found the Vasiliki route was that it was the ONLY trad multi-pitch on a crag of
// boulder problems. That is a cheap structural signal needing no prose: a route whose discipline
// is unique on its area, where the area's other routes agree with each other. It will be noisy on
// its own — a genuinely mixed crag has a lone sport line among trad routes and nothing is wrong —
// so this also reports the two things that made the Vasiliki case decisive:
//   - a large dist_km on a route whose siblings are roadside (an approach that cannot be the same)
//   - the DISCIPLINE GAP being a real one (bouldering vs a roped multi-pitch), not sport vs trad
import { selectAll } from "../lib/supabase-env.mjs";

const rows = await selectAll("routes", "id,name,area_id,discipline,dist_km,pitches", "id=like.wa_*", { pageSize: 1000 });
if (!rows.length) { console.error("FAIL — read zero routes; a broken scan, not a clean catalog."); process.exit(1); }

const byArea = {};
for (const r of rows) (byArea[r.area_id] = byArea[r.area_id] || []).push(r);

/* Bouldering vs anything roped is a different KIND of climbing and a different kind of approach;
   sport vs trad is a normal thing to find side by side on one crag. Only the former is a signal. */
const ROPED = new Set(["trad", "sport", "alpine", "mountaineering", "ice", "mixed", "aid", "scrambling"]);
const kind = (d) => (d === "bouldering" ? "boulder" : ROPED.has(d) ? "roped" : "other");

const hits = [];
for (const [aid, list] of Object.entries(byArea)) {
  if (list.length < 3) continue; // no majority to be an outlier against
  const counts = {};
  for (const r of list) counts[kind(r.discipline)] = (counts[kind(r.discipline)] || 0) + 1;
  for (const r of list) {
    const k = kind(r.discipline);
    if (counts[k] !== 1) continue;               // not alone
    const others = Object.entries(counts).filter(([kk]) => kk !== k);
    if (others.length !== 1) continue;           // the rest must AGREE with each other
    const sibs = list.filter((x) => x.id !== r.id);
    const sibMax = Math.max(...sibs.map((x) => (typeof x.dist_km === "number" ? x.dist_km : 0)));
    hits.push({ r, area: aid, n: list.length, otherKind: others[0][0], mineKind: k, sibMax });
  }
}

/* The sharpest sub-case, and the one the Vasiliki row was: a lone ROPED route on a boulder area
   that also carries a real approach its siblings do not. A boulder crag is a place you walk to
   once; a multi-pitch with a 5 km approach on that same area is describing a different place. */
const sharp = hits.filter((h) => h.mineKind === "roped" && h.otherKind === "boulder" && typeof h.r.dist_km === "number" && h.r.dist_km >= 2 && h.sibMax < 1);

console.log(`${rows.length} WA routes across ${Object.keys(byArea).length} areas`);
console.log(`${hits.length} route(s) are the ONLY one of their kind on an area whose other routes agree`);
console.log(`${sharp.length} of those are a ROPED route on a BOULDER area carrying a real approach its siblings lack\n`);

console.log(`--- the sharp sub-case (the shape wa_south_face_direct had) ---`);
for (const h of sharp.sort((a, b) => (b.r.dist_km || 0) - (a.r.dist_km || 0))) {
  console.log(`  ${h.r.id.padEnd(52)} [${String(h.r.discipline).padEnd(9)}] dist_km=${String(h.r.dist_km).padStart(6)}  pitches=${h.r.pitches}  area=${h.area} (${h.n} routes, siblings max dist ${h.sibMax})`);
}
if (!sharp.length) console.log(`  (none — wa_south_face_direct was the only one, and it is fixed)`);

console.log(`\n--- the wider, NOISIER set: lone roped route on a boulder area, any approach (${hits.filter((h) => h.mineKind === "roped" && h.otherKind === "boulder").length}) ---`);
for (const h of hits.filter((h) => h.mineKind === "roped" && h.otherKind === "boulder").slice(0, 25)) {
  console.log(`  ${h.r.id.padEnd(52)} [${String(h.r.discipline).padEnd(9)}] dist_km=${h.r.dist_km}  area=${h.area} (${h.n} routes)`);
}

console.log(`\nNOT A DEFECT LIST. A mixed crag legitimately has one roped line among boulder problems;`);
console.log(`the Vasiliki row was decided on its PROSE naming a place 190 km away and on two`);
console.log(`non-prose columns agreeing with that prose. This only says where to look.`);
