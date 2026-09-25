// Two researched follow-ups (2026-09-25). Dry by default; --apply writes. Compare-and-set on exact strings.
//  1. Lake Serene basin bivy (6 Mount Index routes): the notes said the buttress-base bivy lies "beyond the
//     quarter-mile ring" as fact. Research: probably just outside, borderline, rule has no published boundary.
//  2. Sitkum Glacier + Sitkum Spire: approach sends climbers up White Chuck River Trail #643, listed
//     inaccessible since the 2003 flood, behind FR 23 closed at MP 3.7. Lead the approach with that and give
//     an accurate closures note (Sitkum Spire's cited an expired order and a wrong 7-mile road walk).
import fs from "node:fs";
import { SUPABASE_URL, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";
const key = requireServiceKey();
const APPLY = process.argv.includes("--apply");
const canon = v => JSON.stringify(v, (k, x) => x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map(q => [q, x[q]])) : x);
const read = async id => (await (await fetch(`${SUPABASE_URL}/rest/v1/routes?id=eq.${encodeURIComponent(id)}&select=id,bivy,approach,access`, { headers: headers(key) })).json())[0];

const SERENE = "Lake Serene basin and the talus under the Norwegian Buttresses";
const S_OLD = "Where a bivy genuinely happens is at the foot of the buttresses, beyond the quarter-mile ring, on slab and talus.";
const S_NEW = "Where a bivy genuinely happens is at the foot of the buttresses, on slab and talus. That spot sits close to the edge of the quarter-mile no-camping ring, probably just outside it but not by a comfortable margin, so sleep as high and as far from the shore as the ground allows and be ready to move if asked.";

const WC_LEAD = "The White Chuck approach described below is effectively gone: White Chuck River Trail #643 has been listed as inaccessible since the 2003 flood, and the White Chuck Road (FR 23) is closed to vehicles at milepost 3.7, about 5 miles of old roadbed short of the old trailhead, beyond which the valley is unmaintained travel with a river ford. Parties now come in from the North Fork Sauk River Trailhead instead, climbing to the Pacific Crest Trail at White Pass and following it north over Red Pass to the Sitkum Creek junction. ";
const WC_CLOSURES = "CLOSED: White Chuck Road (FR 23) is closed to vehicles from milepost 3.7 to its end, and Rat Trap Pass Road (FR 27) from milepost 4, for flood damage, with no reopening date. White Chuck River Trail #643 is listed as inaccessible, with no road or trail access, since the 2003 flood. Use the North Fork Sauk River Trailhead and the Pacific Crest Trail instead. Darrington Ranger District: (360) 436-1155.";
const WC = {
  wa_glacier_peak_sitkum_glacier: { closuresOld: undefined, approachStart: "From the White Chuck River Trailhead (2,350 ft" },
  wa_sitkum_spire_standard: { closuresOld: "As of the 2026 season, FS Road 23 (White Chuck River Road) is closed by Forest Order #06-05-25-02", approachStart: "From the White Chuck River Trailhead (end of FR 23" },
};

const plan = {}, rows = {}, bad = [];
for (const id of ["wa_hourglass_gully_winter", "wa_j_tnar", "wa_mount_index_north_norwegian_buttress", "wa_mount_index_north_peak_traverse", "wa_mount_index_northeast_buttress", "wa_traverse_of_mount_index"]) {
  const r = rows[id] = await read(id); const b = r.bivy.find(x => x.name === SERENE);
  if (!b) { bad.push(id + " no entry"); continue; }
  if (b.notes.includes(S_NEW)) continue;
  if (!b.notes.includes(S_OLD)) { bad.push(id + " sentence drifted"); continue; }
  plan[id] = { bivy: r.bivy.map(x => x.name === SERENE ? { ...x, notes: x.notes.replace(S_OLD, S_NEW) } : x) };
}
for (const [id, w] of Object.entries(WC)) {
  const r = rows[id] = await read(id); const p = {};
  if (!r.approach.startsWith(WC_LEAD)) { if (r.approach.startsWith(w.approachStart)) p.approach = WC_LEAD + r.approach; else bad.push(id + " approach drifted"); }
  const cur = (r.access || {}).closures;
  if (cur !== WC_CLOSURES) { if (w.closuresOld === undefined ? cur == null : String(cur || "").startsWith(w.closuresOld)) p.access = { ...r.access, closures: WC_CLOSURES }; else bad.push(id + " closures drifted"); }
  if (Object.keys(p).length) plan[id] = p;
}
for (const [id, p] of Object.entries(plan)) console.log(id, Object.keys(p).join(","));
if (bad.length) console.log("NOT WRITTEN:", bad);
if (!APPLY) { console.log({ mode: "DRY", rows: Object.keys(plan).length }); process.exit(0); }
const rollback = [];
for (const [id, p] of Object.entries(plan)) {
  rollback.push({ id, ...Object.fromEntries(Object.keys(p).map(k => [k, rows[id][k]])) });
  fs.writeFileSync("enrichment-wip/camping-roles/serene-whitechuck-rollback-" + process.pid + ".json", JSON.stringify(rollback));
  await patchRow("routes", id, p);
  const after = await read(id);
  for (const k of Object.keys(p)) if (canon(after[k]) !== canon(p[k])) throw new Error("RECONCILE FAILED " + id + "." + k);
}
console.log({ mode: "APPLY", rows: Object.keys(plan).length });
