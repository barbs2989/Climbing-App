// ROUND 3 of the walk-up audit (round 1: fix-walkup-and-scramble-disciplines.mjs #1849; round 2:
// fix-walkup-disciplines-round-2.mjs #1854). A second, independent online pass over 165 WA peak
// routes: the 149 still filed `scrambling` that round 1's detector trusted as Class 3-4, and the 16
// round 1 left unresolved. It ran in parallel with round 2, so it doubles as a cross-check:
// 26 of its changes had already been applied by round 2 (the two passes agree), and only the
// findings round 2 did NOT reach are applied here. Same rules: mountaineering = Class 1-2 walk-up /
// snowshoe / glacier with no required 5.x; scrambling = ropeless Class 3-4; alpine = a REQUIRED
// roped technical grade. Medium/high confidence only.
//
// Researched and deliberately NOT changed:
//   Round 2 HELD these for split or thin sources, and this pass found the same ones — not new
//   evidence, so the hold stands: Sentinel, Big Craggy, Lawson, Eagle Rock, Noyes.
//   Mutchler (one report, from a high-route traverse) and Pinnacle Mtn Entiat (two trip reports say
//   Class 2, Wikipedia says 3) — split the same way round 2's holds are.
//   Round 2 decided these and this pass disagrees at medium confidence — left as round 2 set them:
//     Buckhorn and Switchback (round 2: Class 2; here: a short Class 3 summit move); Forbidden East
//     Ledges (round 2: alpine for a low-5th gully + 5 rappels; here: glacier + Class 3-4 ledges).
//   Low confidence either way, unchanged: Bonanza, Hopper, Esmeralda, Fricaba, Sefrit, Cameron.
//
// Assert-then-set, read back, then the same peak-label sync as round 2. --dry writes nothing.
import { requireServiceKey, selectAll, patchRow } from "../lib/supabase-env.mjs";

const DRY = process.argv.includes("--dry");

const FIXES = [
  { id: "wa_lake_mountain_pasayten_scramble", from: "scrambling", to: "mountaineering", why: "class 2 from Lake of the Woods, 'no single move required hands'" },
  { id: "wa_wallaby_peak_standard", from: "scrambling", to: "mountaineering", why: "SW ridge/gully Grade I class 2; the hazard is loose rock" },
  { id: "wa_north_star_mountain_east_route", from: "scrambling", to: "mountaineering", why: "talus and scree, class 2, from Lyman Lake" },
  { id: "wa_hagan_mountain_south", from: "scrambling", to: "mountaineering", why: "easiest route is class 3 with glacier travel" },
  { id: "wa_spire_mountain_scramble", from: "scrambling", to: "alpine", why: "normal route class 4-5; a class 5 step parties rope, 100-ft rope recommended" },
];

const key = requireServiceKey();
const ids = FIXES.map(f => f.id);
const read = () => selectAll("routes", "id,name,discipline", `id=in.(${ids.join(",")})`, { key, pageSize: 200 });
const rows = await read();
if (rows.length !== FIXES.length) {
  console.log(`FAIL: expected ${FIXES.length} rows, read ${rows.length} — ${ids.filter(i => !rows.some(r => r.id === i)).join(", ")} missing`);
  process.exit(1);
}
const byId = new Map(rows.map(r => [r.id, r]));

let changed = 0, skipped = 0;
for (const f of FIXES) {
  const r = byId.get(f.id);
  if (r.discipline === f.to) { console.log(`  already ${f.to}: ${f.id}`); skipped++; continue; }
  if (r.discipline !== f.from) { console.log(`  SKIP ${f.id} — is ${JSON.stringify(r.discipline)}, not ${JSON.stringify(f.from)}`); skipped++; continue; }
  console.log(`${DRY ? "would set" : "setting"} ${f.id}  "${r.name}"  ${f.from} -> ${f.to}  (${f.why})`);
  if (!DRY) await patchRow("routes", f.id, { discipline: f.to });
  changed++;
}
console.log(`\n${DRY ? "would change" : "changed"} ${changed}; ${skipped} skipped`);
if (DRY) process.exit(0);

const after = await read();
const wrong = after.filter(r => r.discipline !== FIXES.find(x => x.id === r.id).to);
console.log(wrong.length ? `FAIL: ${wrong.length} row(s) did not take: ${wrong.map(r => `${r.id}=${r.discipline}`).join(", ")}` : `verified — all ${FIXES.length} disciplines stored`);
if (wrong.length) process.exit(1);
await syncAreas();

// Since 0197 a PEAK keeps its dominant_discipline once it is a mountain type — the routes trigger
// no longer moves it. So Ruby Mountain still read `scrambling` with all three of its routes now
// `mountaineering`. Only a label that NONE of the area's own routes holds is replaced (by the
// routes' most common discipline); a label that some route still agrees with is left alone, since
// 0197 treats it as researched. (Round 1 measured 35 of 67 touched areas.)
async function syncAreas() {
  const aids = [...new Set((await selectAll("routes", "id,area_id", `id=in.(${ids.join(",")})`, { key, pageSize: 200 })).map(r => r.area_id))];
  const q = () => selectAll("areas", "id,dominant_discipline", `id=in.(${aids.join(",")})`, { key, pageSize: 200 });
  const routes = await selectAll("routes", "id,area_id,discipline", `area_id=in.(${aids.join(",")})`, { key, pageSize: 1000 });
  const want = new Map();
  for (const a of await q()) {
    const c = {};
    for (const r of routes) if (r.area_id === a.id && r.discipline) c[r.discipline] = (c[r.discipline] || 0) + 1;
    if (!Object.keys(c).length || a.dominant_discipline in c) continue;
    const mode = Object.entries(c).sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]))[0][0];
    console.log(`area ${a.id}: dominant_discipline ${a.dominant_discipline} -> ${mode}  ${JSON.stringify(c)}`);
    await patchRow("areas", a.id, { dominant_discipline: mode });
    want.set(a.id, mode);
  }
  const bad = (await q()).filter(a => want.has(a.id) && a.dominant_discipline !== want.get(a.id));
  console.log(bad.length ? `FAIL: ${bad.length} area(s) did not take` : `verified — ${want.size} area label(s) now agree with their routes`);
  process.exit(bad.length ? 1 : 0);
}
