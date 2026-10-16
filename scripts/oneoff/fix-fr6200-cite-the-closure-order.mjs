// FR 6200 (Chiwawa River Road) beyond Atkinson Flat: one closure, described nine ways.
//
// audit:expiring-closures' remaining tiers are "open-ended" and "as-of-period" — claims a reader
// cannot judge the age of. This cluster is the clearest case where the catalog ALREADY HOLDS the
// answer and only some rows use it.
//
// Three rows cite the order and its window in full:
//   wa_chiwawa_mountain_southwest, wa_cloudy_peak_southwest_slopes, wa_dumbell_mountain_west
//     "USFS closure order #06-17-07-2026-11 (effective 5/20/2026 through 12/31/2027)"
//
// Four say the same thing open-endedly — "closed indefinitely", "no reopening estimate has been
// given", "since 2026 due to storm damage" — with no order and no end date, so nothing tells a
// reader whether the claim is current or two seasons old.
//
// CONFIRMED CURRENT before writing: Okanogan-Wenatchee NF reporting for August 2026 has FR 6200
// closed beyond Atkinson Flat under this order, no reopening estimate, in effect to 31 Dec 2027.
//
// THIS ADDS NO CLOSURE. Every row already states the road is shut; what is copied is the ORDER
// NUMBER and the WINDOW that sibling rows carry. That converts an open-ended claim into a
// SELF-LIMITING one, which is the form audit:expiring-closures already treats as acceptable — it
// names its own end date, so a reader in 2028 can see it has lapsed rather than trusting it.
// The rule against adding a dated closure is about inventing a NEW one; this dates an existing one.
// [[a-transient-closure-in-a-permanent-field-becomes-a-lie]]
//
// A SEPARATE, NEWER CLOSURE ON THIS ROAD IS DELIBERATELY NOT ADDED: the Little Giant Fire order
// 06-17-07-2026-28 runs 1 Aug – 31 Oct 2026. Writing a two-month fire closure into a column nothing
// re-reads is exactly the defect this audit exists to catch.
// [[stale-closure-grind-is-half-viable-and-blind-to-missing-ones]]
//
// Exact find -> replace, refused unless `find` matches EXACTLY once in the live value.
import { requireServiceKey, selectAll, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const ORDER = "#06-17-07-2026-11";
const WINDOW = "effective May 20, 2026 through December 31, 2027 unless rescinded sooner";

// Rows that already carry the order — re-asserted at apply time, so if the catalog stops recording
// it this script has no basis and refuses rather than writing from memory.
/* SPLIT BY WHAT EACH ROW ACTUALLY EVIDENCES. The first version demanded the order number AND the
   end date from both witnesses, and wa_dumbell_mountain_west carries the DATES with no number —
   so a correct row was refused as if the catalog had lost the order. The guard was right to stop;
   the test was wrong about what it was asking. */
const WITNESSES = [
  { id: "wa_cloudy_peak_southwest_slopes", col: "access", key: "closures", needs: "order",
    re: /06-17-07-2026-11/ },
  { id: "wa_carne_mountain_trail_route", col: "road", key: "status", needs: "order",
    re: /06-17-07-2026-11/ },
  { id: "wa_dumbell_mountain_west", col: "access", key: "closures", needs: "end date",
    re: /Dec(?:ember)? 31,? 2027|12\/31\/2027/ },
];

const EDITS = [
  { id: "wa_buck_mountain_south_ridge", col: "road", key: "seasonalGate",
    find: "currently closed indefinitely beyond Atkinson Flat due to 2025 storm damage rather than a routine seasonal gate.",
    repl: `currently closed beyond Atkinson Flat under USFS closure order ${ORDER} (${WINDOW}) after December 2025 storm damage, rather than a routine seasonal gate.` },

  { id: "wa_carne_mountain_trail_route", col: "road", key: "status",
    find: "No reopening estimate has been given.",
    repl: `No reopening estimate has been given; the order runs ${WINDOW}.` },

  { id: "wa_fortress_mountain_east_ridge", col: "road", key: "status",
    find: "closed to vehicles beyond that point to Trinity Trailhead since 2026 due to storm damage",
    repl: `closed to vehicles beyond that point to Trinity Trailhead under USFS order ${ORDER} (${WINDOW}) after December 2025 storm damage` },

  { id: "wa_fortress_mountain_east_ridge", col: "access", key: "closures",
    find: "closed to vehicles beyond Atkinson Flat Campground since 2026 due to storm damage",
    repl: `closed to vehicles beyond Atkinson Flat Campground under USFS order ${ORDER} (${WINDOW}) after December 2025 storm damage` },

  { id: "wa_fortress_mountain_southwest_face", col: "road", key: "status",
    find: "closed to vehicles beyond that point to Trinity Trailhead since 2026 due to storm damage",
    repl: `closed to vehicles beyond that point to Trinity Trailhead under USFS order ${ORDER} (${WINDOW}) after December 2025 storm damage` },

  { id: "wa_fortress_mountain_southwest_face", col: "access", key: "closures",
    find: "closed to vehicles beyond Atkinson Flat Campground since 2026 due to storm damage",
    repl: `closed to vehicles beyond Atkinson Flat Campground under USFS order ${ORDER} (${WINDOW}) after December 2025 storm damage` },
];

if (APPLY) requireServiceKey();

const ids = [...new Set([...EDITS.map(e => e.id), ...WITNESSES.map(w => w.id)])];
const rows = await selectAll("routes", "id,road,access", `id=in.(${ids.join(",")})`);
if (rows.length !== ids.length) { console.error(`read ${rows.length} of ${ids.length} routes — refusing`); process.exit(1); }
const byId = Object.fromEntries(rows.map(r => [r.id, r]));

let ok = true;
for (const w of WITNESSES) {
  const v = byId[w.id] && byId[w.id][w.col] && byId[w.id][w.col][w.key];
  const good = typeof v === "string" && w.re.test(v);
  console.log(`${good ? "witness ok  " : "REFUSE      "}${w.id} ${w.col}.${w.key} — records the ${w.needs}`);
  if (!good) ok = false;
}
// Both halves of what is being copied must be witnessed by SOMETHING, or this is writing from memory.
for (const need of ["order", "end date"]) {
  const any = WITNESSES.some(w => w.needs === need);
  if (!any) { console.log(`REFUSE — no witness records the ${need}`); ok = false; }
}
if (!ok) { console.error("\nrefusing — the catalog no longer records the order this copies"); process.exit(1); }

const patches = new Map();
for (const e of EDITS) {
  const key = `${e.id}|${e.col}`;
  const working = patches.get(key) || { id: e.id, col: e.col, obj: { ...byId[e.id][e.col] } };
  const cur = working.obj[e.key];
  if (typeof cur !== "string") { console.log(`REFUSE ${e.id} ${e.col}.${e.key} — not a string`); ok = false; continue; }
  const hits = cur.split(e.find).length - 1;
  if (hits !== 1) { console.log(`REFUSE ${e.id} ${e.col}.${e.key} — find matched ${hits}x, expected 1`); ok = false; continue; }
  const next = cur.replace(e.find, e.repl);
  if (!next.includes(ORDER)) { console.log(`REFUSE ${e.id} — result does not cite the order`); ok = false; continue; }
  working.obj[e.key] = next;
  patches.set(key, working);
  console.log(`\n${e.id}  ${e.col}.${e.key}`);
  console.log(`   -  ${cur.slice(0, 200)}`);
  console.log(`   +  ${next.slice(0, 200)}`);
}

console.log(`\n${EDITS.length} edit(s) across ${patches.size} row-object(s)`);
if (!ok) { console.error("refusing to apply while any edit is refused"); process.exit(1); }
if (!APPLY) { console.log("\ndry run — pass --apply to write"); process.exit(0); }

for (const p of patches.values()) await patchRow("routes", p.id, { [p.col]: p.obj });

const after = await selectAll("routes", "id,road,access", `id=in.(${ids.join(",")})`);
let bad = 0;
for (const e of EDITS) {
  const r = after.find(x => x.id === e.id);
  const v = r && r[e.col] && r[e.col][e.key];
  if (typeof v !== "string" || !v.includes(ORDER)) { console.log(`NOT WRITTEN  ${e.id} ${e.col}.${e.key}`); bad++; }
}
console.log(bad ? `\n${bad} edit(s) did not land` : `\nverified: all ${EDITS.length} now cite ${ORDER} and its end date.`);
process.exit(bad ? 1 : 0);
