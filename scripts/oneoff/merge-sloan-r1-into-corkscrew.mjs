// Fold the duplicate Sloan Peak row "West Face (Corkscrew route)" (wa_sloan_peak_r1) into the real one,
// wa_sloan_peak_corkscrew, then delete it. The owner approved this explicitly on 2026-09-26 ("ok go").
//
// The research behind it: r1's own beta says it is "the same standard mountaineering line as the Corkscrew Route",
// its approach says "Identical to the Corkscrew Route", and every outside description agrees that Sloan's standard
// South Face / Upper West Face line IS the Corkscrew. It is not the separate West Face rock route (5.7-5.8), which
// the catalog does not hold. But r1 carried two things the real row lacked — the step-by-step `climbing_route`
// and `outing_shape` — so those are MOVED first, and only onto columns that are still empty on the Corkscrew row.
//
// Safety, as delete-fabricated-bonanza-west-ridge.mjs: the full r1 row is backed up FIRST; the delete refuses
// unless r1 still has the name/area recorded here and nothing references it (FK tables cascade, so a reference
// would be destroyed, not orphaned); it must delete exactly one row. --dry checks everything and writes nothing.
import fs from "fs";
import { requireServiceKey, selectAll, patchRow, SUPABASE_URL, headers } from "../lib/supabase-env.mjs";

const DRY = process.argv.includes("--dry");
const ID = "wa_sloan_peak_r1", KEEP = "wa_sloan_peak_corkscrew", AREA = "wa_sloan_peak";
const EXPECT = { name: "West Face (Corkscrew route)", area_id: AREA };
const MOVE = ["climbing_route", "outing_shape"];
const REFS = ["climb_logs", "content_reports", "contributions", "crews", "gps_submissions", "hazard_votes", "objectives", "route_base_checkins", "topo_lines", "user_itineraries"];

const key = requireServiceKey();
const fail = m => { console.log(`FAIL: ${m}`); process.exit(1); };
const count = async q => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${q}`, { headers: headers(key, { Prefer: "count=exact" }) });
  if (!r.ok) fail(`GET ${q} -> ${r.status}`);
  return +(r.headers.get("content-range") || "*/0").split("/")[1];
};

const row = (await selectAll("routes", "*", `id=eq.${ID}`, { key, pageSize: 5 }))[0];
if (!row) { console.log(`already gone: ${ID}`); process.exit(0); }
for (const [k, v] of Object.entries(EXPECT)) if (row[k] !== v) fail(`${ID}.${k} is ${JSON.stringify(row[k])}, not ${JSON.stringify(v)}`);
const keep = (await selectAll("routes", "id,area_id," + MOVE.join(","), `id=eq.${KEEP}`, { key, pageSize: 5 }))[0];
if (!keep || keep.area_id !== AREA) fail(`${KEEP} missing or not on ${AREA}`);
const move = Object.fromEntries(MOVE.filter(c => row[c] != null && keep[c] == null).map(c => [c, row[c]]));
const clash = MOVE.filter(c => row[c] != null && keep[c] != null);
if (clash.length) console.log(`not moved (Corkscrew already has its own): ${clash.join(", ")}`);

let refs = 0;
for (const t of REFS) { const n = await count(`${t}?select=route_id&route_id=eq.${ID}`); if (n) console.log(`  ${t}: ${n}`); refs += n; }
refs += await count(`user_lists?select=id&route_ids=cs.%7B${ID}%7D`);
refs += await count(`comments?select=id&or=(target_id.eq.${ID},target_id.like.${ID}__*)`);
if (refs) fail(`${refs} reference(s) to ${ID} — deleting would cascade or orphan them`);
console.log(`checked: name/area match; 0 references; moving ${Object.keys(move).join(", ") || "nothing"} to ${KEEP}`);

const before = (await selectAll("areas", "id,route_count", `id=eq.${AREA}`, { key, pageSize: 5 }))[0].route_count;
if (DRY) { console.log(`would delete ${ID} (area route_count ${before} -> ${before - 1})`); process.exit(0); }

const backup = `scripts/rollback-delete-${ID}-${Date.now()}.json`;
fs.writeFileSync(backup, JSON.stringify(row, null, 1));
console.log(`backed up full row -> ${backup}`);

if (Object.keys(move).length) {
  const filter = Object.keys(move).map(c => `${c}=is.null`).join("&");
  await patchRow("routes", KEEP, move, { filter });
  const got = (await selectAll("routes", "id," + Object.keys(move).join(","), `id=eq.${KEEP}`, { key, pageSize: 5 }))[0];
  if (Object.keys(move).some(c => JSON.stringify(got[c]) !== JSON.stringify(move[c]))) fail(`${KEEP} did not take the moved fields — r1 NOT deleted`);
  console.log(`moved onto ${KEEP} and re-read: ${Object.keys(move).join(", ")}`);
}

const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?id=eq.${ID}`, { method: "DELETE", headers: headers(key, { Prefer: "return=representation" }) });
const gone = await res.json();
if (!res.ok || !Array.isArray(gone) || gone.length !== 1) fail(`DELETE -> ${res.status}, ${Array.isArray(gone) ? gone.length : "?"} rows (expected 1)`);

const still = await selectAll("routes", "id", `id=eq.${ID}`, { key, pageSize: 5 });
const after = (await selectAll("areas", "id,route_count", `id=eq.${AREA}`, { key, pageSize: 5 }))[0].route_count;
const real = await count(`routes?select=id&area_id=eq.${AREA}`);
console.log(`deleted: ${!still.length}; area route_count ${before} -> ${after}; routes actually on the area: ${real}`);
if (still.length) fail("row still present");
if (after !== real) console.log(`WARN: route_count ${after} disagrees with ${real} — run npm run check:counts`);
console.log("verified — r1 folded into the Corkscrew row and gone");
