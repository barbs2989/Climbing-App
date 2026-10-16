// Follow-up to fix-waypoint-order-batch7-pins.mjs. Batch 7 CLEARED four borrowed coordinates,
// and each of those pins carries a note (which renders) still saying it "reuses" a neighbour's
// coordinate — no longer true. The clause is REMOVED; nothing is added in its place.
//
// Smears additionally: distMi 0.2 on its base pin is measured from the CAMP, while every other pin
// on the row counts from the trailhead (camp is 9.3) — audit:waypoint-order read the row as running
// 9.1 mi backwards. Nulled, not recomputed: 9.5 would be a number nobody measured.
//
// Applied 2026-09-30 in two runs (Smears first, then the Pinto Rock three), which is why each
// target refuses unless its pin is EXACTLY the pre-edit text — a spent target is reported, not
// rewritten. Dry run by default; --apply writes, then re-reads.
import { SUPABASE_URL, anonKey, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const SMEARS_OLD = "Approximate — no reliable topout coordinate was found, so this reuses the Viviane Campsite coordinate; the climbing zone is right at the base of Prusik Peak's south face/west ridge near the camp.";
const PINTO_OLD = "Approximate - research confirms a short (~0.3mi) documented climbers trail from the pullout to the formation, but no exact topout coordinate was found; this reuses the pullout coordinate with a disclosed ~0.3mi uncertainty rather than a precise fix.";
const TARGETS = [
  { id: "wa_smears_jugs_and_rock_roll", type: "Base", name: "Base of Prusik Peak south face (approximate)", old: SMEARS_OLD,
    note: "Approximate — no reliable coordinate was found; the climbing zone is right at the base of Prusik Peak's south face/west ridge near the camp.",
    distMi: { from: 0.2, to: null } },
  ...["wa_clast_from_the_past", "wa_sidewinder_4", "wa_top_gun"].map((id) => ({
    id, type: "Topout", name: "Pinto Rock topout (approximate)", old: PINTO_OLD,
    note: "Approximate - research confirms a short (~0.3mi) documented climbers trail from the pullout to the formation, but no exact topout coordinate was found." })),
];

const KEY = APPLY ? requireServiceKey() : anonKey();
const url = `${SUPABASE_URL}/rest/v1/routes?id=in.(${TARGETS.map((t) => t.id).join(",")})&select=id,waypoints`;
const rows = new Map((await (await fetch(url, { headers: headers(KEY) })).json()).map((r) => [r.id, r]));
const todo = [], refused = [];
for (const t of TARGETS) {
  const r = rows.get(t.id);
  if (!r) { refused.push(`${t.id}: row not found`); continue; }
  const wps = r.waypoints.map((w) => ({ ...w }));
  const hits = wps.filter((w) => w.type === t.type && w.name === t.name);
  const p = hits[0];
  if (hits.length === 1 && p.note === t.note && (!t.distMi || p.distMi === t.distMi.to)) { console.log(`${t.id}: already applied`); continue; }
  if (hits.length !== 1 || p.lat != null || p.lng != null || p.note !== t.old || (t.distMi && p.distMi !== t.distMi.from)) {
    refused.push(`${t.id}: live pin is not the batch-7 result`); continue;
  }
  p.note = t.note;
  if (t.distMi) p.distMi = t.distMi.to;
  todo.push({ t, wps });
  console.log(`${t.id}: note clause removed${t.distMi ? `, distMi ${t.distMi.from} -> ${t.distMi.to}` : ""}`);
}
if (refused.length) { console.error("REFUSED:\n  " + refused.join("\n  ") + "\nNothing was written."); process.exit(1); }
if (!APPLY || !todo.length) { console.log(todo.length ? "DRY RUN — pass --apply to write." : "nothing to do."); process.exit(0); }
for (const { t, wps } of todo) await patchRow("routes", t.id, { waypoints: wps });
const v = new Map((await (await fetch(url, { headers: headers(KEY) })).json()).map((r) => [r.id, r]));
let bad = 0;
for (const { t, wps } of todo) {
  const got = v.get(t.id).waypoints;
  if (JSON.stringify(got) !== JSON.stringify(wps)) { console.error(`NOT APPLIED: ${t.id}`); bad++; }
}
console.log(bad ? `VERIFY FAILED: ${bad}` : `verified: ${todo.length} row(s) re-read and match.`);
process.exit(bad ? 1 : 0);
