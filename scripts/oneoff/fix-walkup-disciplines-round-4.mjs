// ROUND 4 of the walk-up audit: the TIE-BREAK (rounds 1-3: #1849, #1854, #1857). Ten routes on which
// two earlier online passes disagreed were researched a third time, given BOTH sides' evidence and
// asked for route-specific beta the earlier passes had not cited (HippoHamster, trailcatjim,
// Country Highpoints, Eric's Basecamp, Mazamas route pages, first-hand WTA reports). A verdict of
// "tie" was allowed; none was returned. Same rules: mountaineering = Class 1-2 walk-up / snowshoe /
// glacier with no REQUIRED 5.x; scrambling = ropeless Class 3-4 (one unavoidable Class 3 move
// counts); alpine = a REQUIRED roped technical grade — rope used only to rappel a descent does not.
//
// Two of these REVERSE round 2, on evidence round 2 did not have:
//   Forbidden East Ledges: every source rates the ledges Class 3-4 and none supports a "low-5th
//     gully" (the gully in the reports is snow); the 5 rappels are the descent; the approach crosses
//     the glacier below the S face -> mountaineering, not alpine.
//   Buckhorn: a first-hand report on the Marmot Pass boot path — "almost entirely a hike with a
//     single third class ish move where you might have to use your hands" -> scrambling.
//
// Tie-broken and deliberately NOT changed:
//   Noyes stays scrambling (a report calls the final wall "Olympics Class 3 ... really Class 4");
//   Switchback stays mountaineering (on THIS row's SE ridge from Cooney Lake the Class 3 is avoidable);
//   Mutchler and Pinnacle Mtn (Entiat) point to mountaineering but at LOW confidence — Mutchler's
//     evidence is not for the stored line, Pinnacle's only rated first-hand account is one report.
//
// Assert-then-set, read back, then the same peak-label sync as rounds 2-3. --dry writes nothing.
import { requireServiceKey, selectAll, patchRow } from "../lib/supabase-env.mjs";

const DRY = process.argv.includes("--dry");

const FIXES = [
  { id: "wa_big_craggy_peak_scramble", from: "scrambling", to: "mountaineering", why: "'an easy class 2 scramble to the summit' via scree and talus; three sources agree" },
  { id: "wa_eagle_rock_scramble", from: "scrambling", to: "mountaineering", why: "easiest line is '600 feet of easy class 2 on the right'; class 2/3 is the optional center" },
  { id: "wa_mount_lawson_standard", from: "scrambling", to: "mountaineering", why: "creek, brushy gully, saddle and 'obvious summit hump'; guide rates it class 2" },
  { id: "wa_sentinel_peak_standard", from: "alpine", to: "mountaineering", why: "roped only for the glacier; class 2/3 ledges 'not enough to warrant a rope'" },
  { id: "wa_forbidden_peak_east_ledges", from: "alpine", to: "mountaineering", why: "class 3-4 ledges, rappels are the descent, glacier on the approach" },
  { id: "wa_buckhorn_marmot_pass", from: "mountaineering", to: "scrambling", why: "'a single third class ish move where you might have to use your hands'" },
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
