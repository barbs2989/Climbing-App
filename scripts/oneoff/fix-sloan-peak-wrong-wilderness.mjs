// Three Sloan Peak routes carry another wilderness's access block.
//
// Sloan Peak is in the HENRY M. JACKSON WILDERNESS, reached from the Mountain Loop Highway. Three of
// its seven routes describe the GLACIER PEAK WILDERNESS and the Suiattle River Road, which serves a
// different massif — and one key is stranger still: `parking_pass` names "Sunrise Mine TH for Vesper
// Peak" inside Sloan Peak's own data, i.e. a verbatim copy from an unrelated route. Two separate
// research agents found this independently on two different rows, on two different days.
//
// WHY IT IS MECHANICAL: the correct text is ALREADY IN THE CATALOG on the same peak. Four of the seven
// Sloan routes are clean and name Henry M. Jackson, and for each contaminated key exactly ONE non-null
// value exists across those clean rows — so there is a unique donor and nothing is composed. The
// donor's text is structurally parallel to the wrong text, which is what identifies it as the same
// sentence written for the right mountain:
//   land_manager  "... — Henry M. Jackson Wilderness"        vs  "... — Glacier Peak Wilderness"
//   parking_pass  "... (e.g. Bedal Creek or Sloan Peak/Cougar Creek trailheads) ..."
//                                                            vs  "... (e.g. Sunrise Mine TH for Vesper Peak) ..."
//   seasonal      "... check current Darrington Ranger District conditions"
//                                                            vs  "... Suiattle River Road (FSR 26), the primary Glacier Peak access ..."
//   rules         "... in Henry M. Jackson Wilderness ..."    vs  "... in Glacier Peak Wilderness ..."
//
// A KEY IS ONLY TOUCHED WHERE THE STORED VALUE ACTUALLY CARRIES THE CONTAMINATION. One of the three
// rows already holds a correct `rules` ("Standard wilderness rules apply within the Henry M. Jackson
// Wilderness..."), phrased differently from the donor — that row keeps its own text, because the
// defect is the wrong wilderness, not a different wording of the right one.
//
// NOTHING IS TYPED: every replacement is copied verbatim from a sibling row on the same peak, so a
// repair needing text the catalog does not already hold cannot be expressed by this script.
//
// Read-only by default. Pass --apply to write.
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
requireServiceKey();

const PEAK = "wa_sloan_peak";
const KEYS = ["land_manager", "parking_pass", "seasonal", "rules"];
// The markers that identify a value as belonging to another mountain.
const FOREIGN = /glacier peak wilderness|suiattle|vesper peak|sunrise mine/i;

const areas = await selectAll("areas", "id,name,path", "path=cd.usa.washington", { pageSize: 1000 });
if (!areas.length) { console.error("no WA areas read — refusing"); process.exit(1); }
const inPeak = new Set(areas.filter(a => a.id === PEAK || String(a.path || "").split(".").includes(PEAK)).map(a => a.id));
if (!inPeak.size) { console.error(`area ${PEAK} not found — refusing`); process.exit(1); }

const all = await selectAll("routes", "id,name,area_id,access", "id=like.wa_*", { pageSize: 1000 });
console.log(`WA routes read: ${all.length}`);
if (all.length < 5000) { console.error("SHORT READ — refusing to act on a partial read"); process.exit(1); }
const rows = all.filter(r => inPeak.has(r.area_id) && r.access && typeof r.access === "object");
console.log(`routes on Sloan Peak with an access object: ${rows.length}`);
if (rows.length < 4) { console.error("too few Sloan rows to establish a donor — refusing"); process.exit(1); }

const dirty = rows.filter(r => KEYS.some(k => typeof r.access[k] === "string" && FOREIGN.test(r.access[k])));
const clean = rows.filter(r => !dirty.includes(r));
console.log(`  contaminated: ${dirty.length}   clean: ${clean.length}`);
if (!dirty.length) { console.log("nothing to do."); process.exit(0); }
if (clean.length < 2) { console.error("fewer than 2 clean siblings — not a consensus donor, refusing"); process.exit(1); }

// One unique non-null clean value per key, or the key is not repairable.
const donor = {};
for (const k of KEYS) {
  const vals = [...new Set(clean.map(r => r.access[k]).filter(v => typeof v === "string" && v.trim()))];
  if (vals.length === 1) donor[k] = vals[0];
  else console.log(`  key "${k}": ${vals.length} distinct clean values — no unique donor, left alone`);
}
console.log(`\ndonor keys available: ${Object.keys(donor).join(", ") || "(none)"}`);
if (!Object.keys(donor).length) { console.error("no donor text available — refusing"); process.exit(1); }

const plan = [];
for (const r of dirty) {
  const changes = {};
  for (const k of Object.keys(donor)) {
    const v = r.access[k];
    if (typeof v === "string" && FOREIGN.test(v) && v !== donor[k]) changes[k] = donor[k];
  }
  if (Object.keys(changes).length) plan.push({ id: r.id, changes, premise: r.access });
}
console.log(`\nrows to repair: ${plan.length}`);
for (const p of plan) {
  console.log(`  ${p.id}`);
  for (const [k, v] of Object.entries(p.changes)) {
    console.log(`      ${k}:`);
    console.log(`        from ${JSON.stringify(String(p.premise[k]).slice(0, 110))}`);
    console.log(`        to   ${JSON.stringify(String(v).slice(0, 110))}`);
  }
}
if (!APPLY) { console.log("\nDRY RUN — pass --apply to write."); process.exit(0); }

let wrote = 0, refused = 0;
const live = new Map((await selectAll("routes", "id,access", "id=like.wa_*", { pageSize: 1000 })).map(r => [r.id, r]));
for (const p of plan) {
  const cur = live.get(p.id)?.access;
  if (!cur || Object.keys(p.changes).some(k => cur[k] !== p.premise[k])) {
    console.log(`  REFUSED ${p.id}: the row has changed since it was read`); refused++; continue;
  }
  await patchRow("routes", p.id, { access: { ...cur, ...p.changes } });
  wrote++;
}
console.log(`\nwrote ${wrote}, refused ${refused}`);

// A 200 is not evidence the data changed.
const after = new Map((await selectAll("routes", "id,access", "id=like.wa_*", { pageSize: 1000 })).map(r => [r.id, r]));
let ok = 0;
for (const p of plan) {
  const a = after.get(p.id)?.access;
  if (a && Object.entries(p.changes).every(([k, v]) => a[k] === v)) ok++;
  else console.log(`  NOT APPLIED: ${p.id}`);
}
console.log(`verified ${ok} of ${plan.length}`);
const left = [...after.values()].filter(r => plan.some(p => p.id === r.id))
  .filter(r => KEYS.some(k => typeof r.access?.[k] === "string" && FOREIGN.test(r.access[k])));
console.log(`repaired rows still naming another wilderness: ${left.length}`);
