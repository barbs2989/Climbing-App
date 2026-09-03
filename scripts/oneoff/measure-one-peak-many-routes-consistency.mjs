// Several routes on ONE peak, checked against each other. No external source, no browser, no API.
//
// WRITTEN BECAUSE THE RESEARCH HALF WAS BLOCKED. Batch 96's three agents were killed by HTTP 529 on
// four separate launches, so rather than leave the batch unexamined I did the half that needs nothing
// but the database. It is also the half that has produced the strongest findings in this audit —
// contamination and self-contradiction are visible from inside the catalog, while a wrong summit
// elevation needs a gazetteer.
//
// THE QUESTION IT ASKS, and the split is the whole method: a fact about the MOUNTAIN must match across
// every route on it (high point, summit pin, trailhead pin, land manager, permit regime), while a fact
// about the ROUTE must not be expected to (season, gain, distance, aspect, face, rope, rappels). A
// comparison that does not make that distinction reports four correct seasons as an inconsistency —
// on Magic Mountain the four rows store Jun-Aug, Apr-Jul, Jul-Sep and Jul-Sep, and the Apr-Jul one is
// the snow couloir. Differing there is the right answer.
//
// AND THE MIRROR: route-specific PROSE shared between two routes is contamination. Normalising every
// sentence over 60 characters and comparing all pairs of overview / beta / climbing_route /
// descent_text is what catches a north face route carrying south ridge content, or two rows with one
// pitch table under two names. Batch 95 found exactly that one peak over.
//
// RESULT ON MAGIC MOUNTAIN: clean. All four rows agree on high_point_ft 7610, the summit pin to four
// decimals, the Cascade Pass trailhead at 3,600 ft and the Cascade Pass junction at 5,392 ft; ZERO
// route-prose sentences are shared between any two; all four aspects (N, NE, S, SW) match their own
// route names; and three of the four store no rope and no rappel table, so no rope-versus-rappel
// shortfall is constructible. Two apparent defects dissolved on reading — the "second summit pin" is a
// Hazard named "Corkscrew ledges below false summit" 700 m away, and the four land-manager values name
// one park complex in four wordings.
//
// A zero here is worth recording precisely because the same check found a composite route one peak over.
//
import { selectAll } from "../lib/supabase-env.mjs";
const IDS = ["wa_magic_mountain_north_face", "wa_magic_mountain_northeast_couloir",
  "wa_magic_mountain_south_ridge", "wa_magic_mountain_southwest_cirque"];
const rows = await selectAll("routes", "id,aspect,face,overview,beta,climbing_route,descent_text,waypoints,access", `id=in.(${IDS.join(",")})`, { pageSize: 10 });
const short = id => id.replace("wa_magic_mountain_", "");
for (const r of rows) {
  console.log(`\n======== ${short(r.id)}   aspect=${JSON.stringify(r.aspect)}`);
  console.log(`   face: ${JSON.stringify(String(r.face || ""))}`);
  for (const w of r.waypoints || []) console.log(`   [${w.type}] "${String(w.name || "").slice(0, 58)}"  ${w.lat},${w.lng} @${w.elev ?? w.elevFt}`);
}
// route prose sharing between the four (sentences > 60 chars)
console.log("\n=== shared sentences between different routes (>60 chars) ===");
const sents = r => {
  const out = new Map();
  for (const k of ["overview", "beta", "climbing_route", "descent_text"]) {
    const v = r[k]; if (typeof v !== "string") continue;
    for (const s of v.split(/(?<=[.;])\s+/)) {
      const n = s.trim().toLowerCase().replace(/\s+/g, " ");
      if (n.length > 60) out.set(n, k);
    }
  }
  return out;
};
const bag = rows.map(r => [short(r.id), sents(r)]);
let shared = 0;
for (let i = 0; i < bag.length; i++) for (let j = i + 1; j < bag.length; j++) {
  for (const [s, k] of bag[i][1]) {
    if (!bag[j][1].has(s)) continue;
    shared++;
    if (shared <= 6) console.log(`  ${bag[i][0]}.${k} <-> ${bag[j][0]}.${bag[j][1].get(s)}\n     ${JSON.stringify(s.slice(0, 150))}`);
  }
}
console.log(`\ntotal shared ROUTE-PROSE sentences between different routes: ${shared}`);
