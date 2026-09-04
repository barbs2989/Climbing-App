// Batch 1 of the summit-before-approach reordering: 9 routes, read individually.
//
// #1583 measured this class at 81 routes and proved it is NOT bulk-fixable — 83% share one of
// three shapes, and BOTH routes CLAUDE.md names as descent sequences sit inside that fingerprint.
// So every entry here is a judgement made by reading the route's own pin names and prose, and the
// script is built so a judgement it cannot express is a judgement it cannot make.
//
// WHY THESE NINE. Each puts a pin that is plainly ON THE APPROACH after the summit:
//   * three Dikes sport routes list the WALL (where the climb starts) after the topout
//   * two routes list only [Summit, Trailhead] — the trailhead cannot come second
//   * Cathedral Rock lists Cathedral Pass, which its own approach trail is named after
//   * Cutthroat's South Buttress lists the buttress BASE after the summit
//   * Beckey-Davis lists the south face BASE after the summit, between two dated pins
//   * Del Campo lists Gothic Basin and Foggy Lake, which its approach text walks through in order
//
// WHAT WAS READ AND LEFT ALONE, because the shape is identical and the reading is not:
//   * wa_chair_peak_north_face / _northeast_buttress — the Hazard tail is the RAPPEL DESCENT,
//     which their descent_text places after the summit. Correct as stored.
//   * wa_davis_peak_nc_north_face — the trailing pin is named "descent exit and shuttle".
//   * wa_cutthroat_west_ridge — the trailing pin is a generic "area reference point" in a
//     9-pin list where every other pin carries a distMi. Its position would be a guess.
//   * both wa_dragontail_* — Colchuck Lake and Aasgard Pass appear TWICE, once each side of the
//     summit. That is a duplication question, not an ordering one, and a reorder would not fix it.
//
// THE CONTRACT IS PERMUTATION-ONLY, which is what makes this safe rather than careful:
//   * `order` is a list of indices into the CURRENT array; the new array is built by moving the
//     existing objects, so no waypoint is added, removed or edited — only the order changes
//   * it is asserted to be a permutation (same length, every index once)
//   * `expect` declares the current type + name prefix of every pin, in order; a row that has
//     moved is REFUSED rather than reordered
//   * all-or-nothing: one refusal aborts before any write
//   * writes go through patchRow, and every row is re-read and re-checked afterwards
//
// Dry run by default. Pass --apply to write.
import { SUPABASE_URL, anonKey, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");

// expect: "Type|name-prefix" per pin, in CURRENT order.   order: new arrangement, by current index.
const EDITS = [
  { id: "wa_a_little_something", order: [0, 2, 1],
    why: "the Junction is the WALL the route starts on; it cannot follow the topout",
    expect: ["Trailhead|Middle Point Ridge Trailhead", "Topout|Megadike North", "Junction|Megadike North wall"] },
  { id: "wa_bachelor_party", order: [0, 2, 1],
    why: "same crag, same shape — the wall precedes the topout",
    expect: ["Trailhead|Middle Point Ridge Trailhead", "Topout|Megadike North", "Junction|Megadike North wall"] },
  { id: "wa_cordwood", order: [0, 2, 1],
    why: "same crag, same shape",
    expect: ["Trailhead|Middle Point Ridge Trailhead", "Topout|Megadike North", "Junction|Megadike North wall"] },
  { id: "wa_beckey_davis", order: [0, 1, 3, 2],
    why: "the south face BASE sits between Gnome Tarn (8 mi) and the summit (9 mi) — the only gap it can occupy",
    expect: ["Trailhead|Stuart Lake Trailhead", "Junction|Gnome Tarn", "Summit|Prusik Peak", "Campsite|Prusik Peak south face base"] },
  { id: "wa_burnt_boot_peak_north_ridge", order: [1, 0],
    why: "two pins, and the trailhead is listed second",
    expect: ["Summit|Burnt Boot Peak", "Trailhead|Dutch Miller Gap Trailhead"] },
  { id: "wa_castle_peak_tatoosh_la_villa", order: [1, 0],
    why: "two pins, and the trailhead is listed second",
    expect: ["Summit|The Castle summit", "Trailhead|Reflection Lakes trailhead area"] },
  { id: "wa_cathedral_rock_standard", order: [0, 2, 1],
    why: "Cathedral Pass is on the approach — the trail the route starts on is named after it",
    expect: ["Trailhead|Cathedral Rock Trailhead", "Summit|Cathedral Rock Summit", "Junction|Cathedral Pass"] },
  { id: "wa_cutthroat_south_buttress", order: [0, 2, 1],
    why: "the buttress BASE is where the climbing starts, so it precedes the summit",
    expect: ["Trailhead|SR 20 pullout", "Summit|Cutthroat Peak summit", "Junction|South Buttress base"] },
  { id: "wa_del_campo_peak_standard", order: [0, 2, 3, 1],
    why: "its own approach walks Barlow Pass -> Gothic Basin -> Foggy Lake -> summit, in that order",
    expect: ["Trailhead|Barlow Pass Trailhead", "Summit|Del Campo Peak Summit", "Junction|Gothic Basin", "Water|Foggy Lake"] },
];

const sig = (w) => `${(w && w.type) || "?"}|${((w && w.name) || "").trim()}`;
const matches = (w, e) => {
  const [t, n] = e.split("|");
  return ((w && w.type) || "") === t && String((w && w.name) || "").trim().startsWith(n);
};

const KEY = APPLY ? requireServiceKey() : anonKey();
const ids = EDITS.map((e) => e.id);
const url = `${SUPABASE_URL}/rest/v1/routes?id=in.(${ids.join(",")})&select=id,name,waypoints`;
const r = await fetch(url, { headers: headers(KEY) });
if (!r.ok) { console.error(`read failed: ${r.status} ${await r.text()}`); process.exit(1); }
const rows = await r.json();
if (rows.length !== ids.length) { console.error(`read returned ${rows.length} row(s) for ${ids.length} id(s) - refusing`); process.exit(1); }
const byId = new Map(rows.map((x) => [x.id, x]));

const refusals = [];
const staged = [];
for (const e of EDITS) {
  const row = byId.get(e.id);
  const w = Array.isArray(row.waypoints) ? row.waypoints : null;
  if (!w) { refusals.push(`${e.id}: waypoints is not an array`); continue; }
  if (w.length !== e.expect.length) { refusals.push(`${e.id}: ${w.length} pin(s) live, declaration expects ${e.expect.length}`); continue; }
  const bad = e.expect.map((x, i) => (matches(w[i], x) ? null : `#${i} expected ${x}, live ${sig(w[i])}`)).filter(Boolean);
  if (bad.length) { refusals.push(`${e.id}: the row has MOVED - ` + bad.join("; ")); continue; }
  // Permutation, asserted rather than assumed: same length, every index exactly once.
  const seen = new Set(e.order);
  if (e.order.length !== w.length || seen.size !== w.length || e.order.some((i) => !(i >= 0 && i < w.length))) {
    refusals.push(`${e.id}: order ${JSON.stringify(e.order)} is not a permutation of ${w.length} index(es)`);
    continue;
  }
  staged.push({ e, row, before: w, after: e.order.map((i) => w[i]) });
}
if (refusals.length) {
  console.error(`REFUSED - ${refusals.length} entr(ies) did not match the live row:\n  ` + refusals.join("\n  "));
  console.error("\nNothing was written. Re-read the row before changing the declaration.");
  process.exit(1);
}

for (const s of staged) {
  console.log(`\n### ${s.e.id}  —  ${s.row.name}`);
  console.log(`   why: ${s.e.why}`);
  console.log(`   was: ${s.before.map(sig).join("  ->  ")}`);
  console.log(`   now: ${s.after.map(sig).join("  ->  ")}`);
}
console.log(`\n${staged.length} route(s) reordered; every new list is a PERMUTATION of the old one — no pin added, removed or edited.`);
if (!APPLY) { console.log("\nDRY RUN - pass --apply to write."); process.exit(0); }

let wrote = 0;
for (const s of staged) { await patchRow("routes", s.e.id, { waypoints: s.after }); wrote++; }
console.log(`\nwrote ${wrote} row(s).`);

// Verify by re-reading: a 200 is not evidence the data changed.
const v = await fetch(url, { headers: headers(KEY) });
const after = new Map((await v.json()).map((x) => [x.id, x]));
let bad = 0;
for (const s of staged) {
  const live = (after.get(s.e.id) || {}).waypoints || [];
  const want = s.after.map(sig).join("|"), got = live.map(sig).join("|");
  if (want !== got) { console.error(`NOT APPLIED: ${s.e.id}\n  want ${want}\n  got  ${got}`); bad++; }
  if (live.length !== s.before.length) { console.error(`LOST A PIN: ${s.e.id} — ${s.before.length} -> ${live.length}`); bad++; }
}
console.log(bad ? `\nVERIFY FAILED: ${bad} problem(s).` : `\nverified: all ${staged.length} row(s) re-read in the new order, with every pin still present.`);
process.exit(bad ? 1 : 0);
