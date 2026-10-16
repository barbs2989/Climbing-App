// Batch 9 follow-up (2026-10-01): The Devil's Club states its FA approach figure TWICE.
//
// fix-waypoint-order-batch9.mjs restated the `approach` sentence — the FA account (NWMJ 2006) has
// 4.5 mi of trail before Perry Creek and never totals the off-trail miles, so "14 hours ... covering
// under two miles from the lake" merged figures the account keeps apart. Its replacement left a
// stray "—," before ", and described". The same claim also renders a second time, in the primary
// approach_variants entry's notes, in that column's voice (no proper names). Both are fixed here.
//
//   node scripts/oneoff/fix-waypoint-order-batch9-prose.mjs          # dry run
//   node scripts/oneoff/fix-waypoint-order-batch9-prose.mjs --apply
import { writeFileSync, existsSync } from "node:fs";
import { SUPABASE_URL, anonKey, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const ID = "wa_the_devils_club";
const A_FROM = "up Perry Creek —, and described";
const A_TO = "up Perry Creek — and described";
const V_FROM = "the first ascent party spent two days and roughly fourteen hours of actual travel in the rain covering under two miles from the lake to the base, and described";
const V_TO = "the first ascent party needed two full days in the rain from the lake to the base - four and a half miles of trail, then roughly fourteen hours of brush and creek travel - and described";

const once = (t, s) => typeof t === "string" && t.split(s).length === 2;
const KEY = APPLY ? requireServiceKey() : anonKey();
const url = `${SUPABASE_URL}/rest/v1/routes?id=eq.${ID}&select=id,approach,approach_variants`;
const [row] = await (await fetch(url, { headers: headers(KEY) })).json();
if (!row) { console.error("row not found — refusing"); process.exit(1); }
const vi = (row.approach_variants || []).findIndex((v) => once(v.notes, V_FROM));
if (!once(row.approach, A_FROM) || vi < 0) { console.error("live text not as recorded — refusing; nothing written"); process.exit(1); }

const approach = row.approach.replace(A_FROM, A_TO);
const approach_variants = row.approach_variants.map((v, i) => i === vi ? { ...v, notes: v.notes.replace(V_FROM, V_TO) } : v);
console.log(`approach:  "${A_FROM}" -> "${A_TO}"\nvariant ${vi}: "${V_FROM}"\n        -> "${V_TO}"`);
const SNAP = new URL("../../audits/waypoint-order-batch9/rollback-before-prose.json", import.meta.url);
if (!existsSync(SNAP)) writeFileSync(SNAP, JSON.stringify({ takenAt: new Date().toISOString(), rows: [row] }, null, 1) + "\n");
if (!APPLY) { console.log("DRY RUN — pass --apply to write."); process.exit(0); }

await patchRow("routes", ID, { approach, approach_variants });
const [v] = await (await fetch(url, { headers: headers(KEY) })).json();
const ok = v.approach === approach && v.approach_variants[vi].notes === approach_variants[vi].notes;
console.log(ok ? "verified: re-read matches." : "VERIFY FAILED");
process.exit(ok ? 0 : 1);
