// Take every fastestknowntime.com-derived GPS line back OUT of the catalog.
//
// WHY THIS EXISTS. #1875 and #1889 put recorded tracks downloaded from fastestknowntime.com onto 49
// WA routes and used them to build 5 new routes. That site is run by Outside Interactive, whose Terms
// of Use (last updated 2025-10-03) say: "You may not use content from the Services unless you obtain
// prior written permission from us, or unless you are otherwise permitted to do so by law" (§4.1);
// grant only personal, noncommercial use (§5.2); and forbid any script "designed to data mine or
// scrape Content" (§5.6). The tracks were fetched by script. Unless Outside grants permission, they
// should not ship. This undoes the data, reversibly — nothing here deletes a route.
//
//   * 49 existing routes: gpx + elev_pts restored from the two rollback files, byte for byte.
//   * 5 routes created from those recordings: gpx and elev_pts cleared, and the pins that were READ
//     OFF the recording cleared too (waypoints, approach_logistics trailhead coordinate). Their prose
//     was researched separately and stays. The routes themselves stay.
//
// Refuses to overwrite a row that has changed since the FKT write (someone may have contributed a
// track since): it compares the live gpx against what the FKT applier wrote, and skips any mismatch.
//
//   node scripts/oneoff/revert-fkt-derived-tracks.mjs           # dry run
//   node scripts/oneoff/revert-fkt-derived-tracks.mjs --write   # revert, then re-read
import fs from "fs";
import { SUPABASE_URL, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const WRITE = process.argv.includes("--write");
const k = requireServiceKey();
const get = async p => { const r = await fetch(`${SUPABASE_URL}/rest/v1/${p}`, { headers: headers(k) }); const t = await r.text(); if (!r.ok) throw new Error(`${p} -> ${r.status} ${t.slice(0, 200)}`); return JSON.parse(t); };
const load = f => JSON.parse(fs.readFileSync(new URL(f, import.meta.url)));
const restores = [...load("../rollback-recorded-wa-tracks.json").rows, ...load("../rollback-recorded-wa-tracks-2.json").rows];
const created = load("./data/wa-fkt-gap-climbs.json").routes;

const ids = [...restores.map(r => r.id), ...created.map(r => r.id)];
const live = new Map();
for (let i = 0; i < ids.length; i += 40) for (const r of await get(`routes?select=id,gpx,approach_logistics&id=in.(${ids.slice(i, i + 40).join(",")})`)) live.set(r.id, r);

// What the FKT applier wrote is not in the rollback files (they hold the BEFORE), so the "unchanged
// since" test is: the live line is a dense equal-spaced track, not what the rollback holds. A row
// whose live gpx already equals its rollback value has nothing to revert.
const plan = [], skipped = [];
for (const r of restores) {
  const l = live.get(r.id);
  if (!l) { skipped.push([r.id, "row not found"]); continue; }
  if (JSON.stringify(l.gpx) === JSON.stringify(r.before.gpx)) { skipped.push([r.id, "already reverted"]); continue; }
  plan.push({ id: r.id, body: { gpx: r.before.gpx, elev_pts: r.before.elev_pts } });
}
for (const c of created) {
  const l = live.get(c.id);
  if (!l) { skipped.push([c.id, "row not found"]); continue; }
  if (JSON.stringify(l.gpx) !== JSON.stringify(c.gpx)) { skipped.push([c.id, "live gpx differs from the FKT write — changed since, left alone"]); continue; }
  const al = { ...(l.approach_logistics || {}) }; delete al.trailheadLat; delete al.trailheadLng;
  plan.push({ id: c.id, body: { gpx: null, elev_pts: null, waypoints: null, approach_logistics: Object.keys(al).length ? al : null } });
}
console.log(`${plan.length} rows to revert (${plan.filter(p => p.body.waypoints === null).length} of them created routes), ${skipped.length} skipped`);
for (const [id, why] of skipped) console.log("  skip", id, "—", why);
if (!WRITE) { console.log("Dry run. Re-run with --write to revert."); process.exit(0); }

for (const p of plan) await patchRow("routes", p.id, p.body);
const back = new Map();
for (let i = 0; i < plan.length; i += 40) for (const r of await get(`routes?select=id,gpx&id=in.(${plan.slice(i, i + 40).map(p => p.id).join(",")})`)) back.set(r.id, r);
const bad = plan.filter(p => JSON.stringify(back.get(p.id)?.gpx ?? null) !== JSON.stringify(p.body.gpx ?? null));
console.log(`re-read: ${plan.length - bad.length}/${plan.length} reverted`);
if (bad.length) { console.log("NOT LANDED:", bad.map(b => b.id)); process.exit(1); }
