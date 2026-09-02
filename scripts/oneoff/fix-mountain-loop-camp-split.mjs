// ONE 8-CAMP LIST ON FOUR MOUNTAINS OF THE MOUNTAIN LOOP HIGHWAY — SPLIT IT BACK.
//
// The same shape as the Goat Rocks / St. Helens split, and it needed DIFFERENT evidence, which is
// the part worth reading. There the ranges were 59-69 km apart and the two-way separation (8x to
// 25x) decided it on its own. Mount Pilchuck, Three Fingers, Big Four Mountain and Whitehorse
// Mountain are 14.9 to 20.5 km apart, so DISTANCE DECIDES NOTHING HERE. Four other records do:
//
//   1. AN INDEPENDENT WITNESS. wa_three_fingers_south_peak_lookout carries its OWN 4-camp list --
//      Saddle Lake, Goat Flats, Tin Can Gap, Three Fingers Lookout -- and nothing else. It names
//      those camps in SHORTER, differently-phrased form than the shared list does, so it is
//      another author rather than another copy. wa_whitehorse_mountain_nw_shoulder likewise
//      carries 3 camps, all Whitehorse places, no foreign ones. Two lists written outside the
//      propagation, and neither reaches for a neighbouring peak.
//   2. FOUR SEPARATE TRAILHEADS: Mount Pilchuck / Pinnacle Lake, Tupso Pass / Goat Flats, Ice
//      Caves, Niederprum. A camp on the Three Fingers trail cannot serve a Big Four climb that
//      starts at the Ice Caves. A camp serves a TRAILHEAD, not a map region.
//   3. EVERY CAMP NAMES ITS OWN PEAK. "Bathtub Lakes basin, EAST OF MOUNT PILCHUCK" was being
//      handed to three other mountains; "Big Four north-side staging" to Pilchuck.
//   4. PROSE SILENCE, and only the base rate makes that evidence: 51.4% of (route, camp) pairs in
//      this catalog ARE named by their own route, so silence is not the norm -- and NONE of the
//      nine routes on these four peaks mentions a neighbouring peak anywhere in its prose.
//
// The list is byte-identical and in identical order on all 7 routes, which is the propagation
// fingerprint rather than seven authors agreeing.
//
// DECLARED-STATE CONTRACT, as the Goat Rocks split: this script names the exact 8 entries it
// expects to find and the exact count each row must be left with, and REFUSES the whole run if any
// row no longer holds them. Nothing is invented -- every write is a filter over the row's own
// entries, so a camp cannot be moved to a peak the catalog does not already file it under. Every
// one of the 8 survives on its home peak; nothing is destroyed.
import { SUPABASE_URL, requireServiceKey, headers, patchRow } from "../lib/supabase-env.mjs";

const THREE_FINGERS = [
  "Three Fingers Lookout, south summit",
  "Tin Can Gap high camp",
  "Goat Flats",
  "Saddle Lake",
];
const WHITEHORSE = [
  "Whitehorse high camp, benches near Lone Tree Pass",
  "Whitehorse Community Park campground, Darrington",
];
const BIG_FOUR = ["Big Four north-side staging and base bivouac"];
const PILCHUCK = ["Bathtub Lakes basin, east of Mount Pilchuck"];

const EXPECTED = [...THREE_FINGERS, ...WHITEHORSE, ...BIG_FOUR, ...PILCHUCK];

const PLAN = [
  { route: "wa_mount_pilchuck_east_ridge",           keep: PILCHUCK },
  { route: "wa_mount_pilchuck_standard_route",       keep: PILCHUCK },
  { route: "wa_three_fingers_r1",                    keep: THREE_FINGERS },
  { route: "wa_three_fingers_r2",                    keep: THREE_FINGERS },
  { route: "wa_big_four_mountain_northwest_ridge",   keep: BIG_FOUR },
  { route: "wa_big_four_mountain_spindrift_couloir", keep: BIG_FOUR },
  { route: "wa_whitehorse_mountain_r1",              keep: WHITEHORSE },
];

const key = requireServiceKey();
const H = headers(key);
const get = async (id) => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,area_id,bivy&id=eq.${id}`, { headers: H });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  const j = await r.json();
  if (j.length !== 1) throw new Error(`${id}: ${j.length} rows`);
  return j[0];
};
const names = (b) => (Array.isArray(b) ? b : []).map((s) => (s && s.name) || "");
const same = (a, b) => a.length === b.length && a.slice().sort().join("|") === b.slice().sort().join("|");

// ---- assert the declared state on EVERY row before writing ANY of them --------------------
const rows = [];
for (const p of PLAN) {
  const row = await get(p.route);
  const have = names(row.bivy);
  if (!same(have, EXPECTED)) {
    console.log(`REFUSED — ${p.route} does not hold the declared 8-camp list.`);
    console.log(`  expected: ${EXPECTED.join(" | ")}`);
    console.log(`  found:    ${have.join(" | ")}`);
    console.log("The catalog has moved since this repair was reasoned about. Re-derive it.");
    process.exit(1);
  }
  rows.push({ ...p, row });
}
console.log(`all ${rows.length} rows hold the declared 8-camp list — proceeding\n`);

// every camp must survive somewhere, or this is a deletion rather than a split
const surviving = new Set(rows.flatMap((r) => r.keep));
const lost = EXPECTED.filter((c) => !surviving.has(c));
if (lost.length) {
  console.log(`REFUSED — these camps would survive on no route: ${lost.join(", ")}`);
  process.exit(1);
}
console.log(`all 8 camps survive on their home peak — this is a split, not a deletion\n`);

let wrote = 0;
for (const { route, keep, row } of rows) {
  const next = (row.bivy || []).filter((s) => keep.includes((s && s.name) || ""));
  if (next.length !== keep.length) {
    console.log(`REFUSED — ${route}: kept ${next.length}, declared ${keep.length}`);
    process.exit(1);
  }
  await patchRow("routes", route, { bivy: next });
  wrote++;
  console.log(`  ${route}: 8 -> ${next.length}`);
}

console.log(`\nwrote ${wrote} row(s); re-reading to reconcile`);
let ok = 0;
for (const { route, keep } of rows) {
  const back = names((await get(route)).bivy);
  if (same(back, keep)) ok++;
  else console.log(`  MISMATCH ${route}: ${back.join(" | ")}`);
}
console.log(`verified ${ok}/${rows.length}`);
process.exitCode = ok === rows.length ? 0 : 1;
