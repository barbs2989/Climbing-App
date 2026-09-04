// Batch 2 of the summit-before-approach reordering: 12 routes, read individually.
//
// Same contract as batch 1 (#1588), and the same reason it has to be per-route: #1583 proved the
// class is not bulk-fixable, because both routes CLAUDE.md names as descent sequences sit inside
// its 83% fingerprint.
//
// WHAT WAS READ AND LEFT ALONE IN THIS PASS, on top of batch 1's six:
//   * wa_flight_of_the_falcon — its "Topout" is named "Waterfall Basin (base of walls)", i.e. the
//     BASE mistyped as a topout, and the pin after it is the same basin again. That is a type and
//     duplication question; reordering would not fix it and would hide it.
//
// ONE PARTIAL, declared as such. wa_enchantment_peak_southwest_scramble trails TWO pins:
// Colchuck Lake, which its own approach certainly passes before Aasgard Pass, and Prusik Pass,
// which leads away from this route's line and whose position would be a guess. Only Colchuck moves.
// The route therefore STAYS in the audit, which is the honest outcome — a partial fix that
// silenced the finding would be worse than none.
//
// Dry run by default. Pass --apply to write.
import { SUPABASE_URL, anonKey, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");

const EDITS = [
  // --- The Dikes: four more sport routes listing the WALL after the topout. Same crag, same
  //     shape, same fix as the three in batch 1.
  { id: "wa_face_farce", order: [0, 2, 1], why: "the wall the route starts on cannot follow the topout",
    expect: ["Trailhead|Middle Point Ridge Trailhead", "Topout|Megadike North", "Junction|Megadike North wall"] },
  { id: "wa_incoming", order: [0, 2, 1], why: "same crag, same shape",
    expect: ["Trailhead|Middle Point Ridge Trailhead", "Topout|Megadike North", "Junction|Megadike North wall"] },
  { id: "wa_just_enough", order: [0, 2, 1], why: "same crag, same shape",
    expect: ["Trailhead|Middle Point Ridge Trailhead", "Topout|Megadike North", "Junction|Megadike North wall"] },
  { id: "wa_henpecked", order: [0, 2, 1], why: "same crag, Minidike wall",
    expect: ["Trailhead|Middle Point Ridge Trailhead", "Topout|Minidike", "Junction|Minidike wall"] },
  { id: "wa_joe_s_route", order: [0, 2, 1], why: "same crag, Minidike wall",
    expect: ["Trailhead|Middle Point Ridge Trailhead", "Topout|Minidike", "Junction|Minidike wall"] },

  // --- two pins, trailhead second ---
  { id: "wa_helmet_butte_standard_route", order: [1, 0], why: "two pins, and the trailhead is listed second",
    expect: ["Summit|Helmet Butte Summit", "Trailhead|Trinity Trailhead"] },

  // --- an approach feature the route's own prose walks through before the top ---
  { id: "wa_glacier_peak_frostbite_ridge", order: [0, 2, 1],
    why: "the Kennedy/Scimitar camp is on the approach — the route's own approach follows Kennedy Ridge to it",
    expect: ["Trailhead|North Fork Sauk River Trailhead", "Summit|Glacier Peak Summit", "Campsite|Kennedy/Scimitar Glacier Camp"] },
  { id: "wa_gothic_peak_standard", order: [0, 2, 1],
    why: "the route is NAMED \"Standard Scramble (from Foggy Lake)\" — the lake is the approach",
    expect: ["Trailhead|Barlow Pass Trailhead", "Summit|Gothic Peak Summit", "Junction|Foggy Lake"] },
  { id: "wa_guye_peak_r2", order: [0, 2, 1],
    why: "the approach leaves Alpental via the Cave Ridge boot path, so the saddle precedes the summit",
    expect: ["Trailhead|Alpental / Snow Lake Trailhead", "Summit|Guye Peak north summit", "Junction|Cave Ridge"] },
  { id: "wa_hibox_mountain_standard", order: [0, 2, 1],
    why: "Rampart Lakes sits above Rachel Lake on the approach trail this route starts on",
    expect: ["Trailhead|Rachel Lake Trailhead", "Summit|Hibox Mountain Summit", "Junction|Rampart Lakes"] },
  { id: "wa_kendall_peak_standard", order: [0, 2, 3, 1],
    why: "the Katwalk is on the PCT approach; the two Katwalk pins are a duplicate the app already collapses at render, so moving both keeps the pair together",
    expect: ["Trailhead|PCT Northbound Trailhead", "Summit|Kendall Peak Summit", "Junction|Kendall Katwalk", "Junction|Kendall Katwalk"] },

  // --- the declared partial ---
  { id: "wa_enchantment_peak_southwest_scramble", order: [0, 5, 1, 2, 3, 4, 6],
    why: "PARTIAL. Colchuck Lake certainly precedes Aasgard Pass on this approach and moves; Prusik Pass leads away from this route and is NOT moved, so the route stays in the audit",
    expect: ["Trailhead|Stuart Lake Trailhead", "Junction|Aasgard Pass", "Campsite|Core Enchantments",
             "Junction|Base of southwest slopes", "Summit|Enchantment Peak summit", "Water|Colchuck Lake", "Junction|Prusik Pass"] },
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

const refusals = [], staged = [];
for (const e of EDITS) {
  const w = Array.isArray((byId.get(e.id) || {}).waypoints) ? byId.get(e.id).waypoints : null;
  if (!w) { refusals.push(`${e.id}: waypoints is not an array`); continue; }
  if (w.length !== e.expect.length) { refusals.push(`${e.id}: ${w.length} pin(s) live, declaration expects ${e.expect.length}`); continue; }
  const bad = e.expect.map((x, i) => (matches(w[i], x) ? null : `#${i} expected ${x}, live ${sig(w[i])}`)).filter(Boolean);
  if (bad.length) { refusals.push(`${e.id}: the row has MOVED - ` + bad.join("; ")); continue; }
  const seen = new Set(e.order);
  if (e.order.length !== w.length || seen.size !== w.length || e.order.some((i) => !(i >= 0 && i < w.length))) {
    refusals.push(`${e.id}: order ${JSON.stringify(e.order)} is not a permutation of ${w.length} index(es)`); continue;
  }
  staged.push({ e, row: byId.get(e.id), before: w, after: e.order.map((i) => w[i]) });
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

const v = await fetch(url, { headers: headers(KEY) });
const after = new Map((await v.json()).map((x) => [x.id, x]));
let bad = 0;
for (const s of staged) {
  const live = (after.get(s.e.id) || {}).waypoints || [];
  if (s.after.map(sig).join("|") !== live.map(sig).join("|")) { console.error(`NOT APPLIED: ${s.e.id}`); bad++; }
  if (live.length !== s.before.length) { console.error(`LOST A PIN: ${s.e.id} — ${s.before.length} -> ${live.length}`); bad++; }
}
console.log(bad ? `\nVERIFY FAILED: ${bad} problem(s).` : `\nverified: all ${staged.length} row(s) re-read in the new order, with every pin still present.`);
process.exit(bad ? 1 : 0);
