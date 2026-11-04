#!/usr/bin/env node
// Write researched corrections to an area's PARKING PIN (parking_name + parking_lat/lng, 0378: one
// pin, written together) and to the area's own coordinate (lat/lng), from a settled conflicts
// batch (audits/area-pages/conflicts/). area-page-apply.mjs handles the prose and value fields;
// these columns are not among its seven.
//
//   node scripts/enrich/area-pin-apply.mjs --from audits/area-pages/conflicts/<batch>.json [--dry]
//
// Only entries with verdict "fix" are read. The id is asserted against `_expect` (name, region);
// a pin must come with both coordinates, and every coordinate must be a real lat/lng; an entry
// needs two review.sources. patchRow throws unless exactly one row changed; the row is re-read
// and reconciled; writes are paced (owner's rule) and a rollback file keeps every old value.
import fs from "fs";
import { patchRow, SUPABASE_URL, headers, requireServiceKey } from "../lib/supabase-env.mjs";

const args = process.argv.slice(2);
const DRY = args.includes("--dry");
const from = (() => { const i = args.indexOf("--from"); return i >= 0 ? args[i + 1] : null; })();
if (!from) { console.error("usage: --from <batch.json> [--dry]"); process.exit(2); }
const batch = JSON.parse(fs.readFileSync(from, "utf8"));
const key = requireServiceKey();
const ROLLBACK = `scripts/rollback-area-pin-${Date.now()}.json`;
const rollback = {};
const sleep = ms => new Promise(r => setTimeout(r, ms));
const okLat = v => typeof v === "number" && Math.abs(v) <= 90, okLng = v => typeof v === "number" && Math.abs(v) <= 180;
let wrote = 0, failed = 0;
for (const [id, e] of Object.entries(batch)) {
  if (id.startsWith("_") || e.verdict !== "fix") continue;
  const patch = {};
  if (e.parking_lat != null || e.parking_lng != null || e.parking_name != null) {
    if (!okLat(e.parking_lat) || !okLng(e.parking_lng)) { console.log(`✗ ${id}: a parking pin needs both coordinates`); failed++; continue; }
    Object.assign(patch, { parking_lat: e.parking_lat, parking_lng: e.parking_lng, parking_name: e.parking_name ? String(e.parking_name).trim().slice(0, 120) : null });
  }
  if (e.lat != null || e.lng != null) {
    if (!okLat(e.lat) || !okLng(e.lng)) { console.log(`✗ ${id}: an area coordinate needs both lat and lng`); failed++; continue; }
    Object.assign(patch, { lat: e.lat, lng: e.lng });
  }
  if (!Object.keys(patch).length) continue;
  if (!e._expect?.name) { console.log(`✗ ${id}: _expect.name missing`); failed++; continue; }
  if ((e.review?.sources || []).length < 2) { console.log(`✗ ${id}: needs two review.sources`); failed++; continue; }
  const cols = ["name", "region", ...Object.keys(patch)];
  const rows = await (await fetch(`${SUPABASE_URL}/rest/v1/areas?id=eq.${encodeURIComponent(id)}&select=${cols.join(",")}`, { headers: headers(key) })).json();
  if (!Array.isArray(rows) || rows.length !== 1) { console.log(`✗ ${id}: ${Array.isArray(rows) ? rows.length : "?"} rows`); failed++; continue; }
  const row = rows[0];
  if (row.name !== e._expect.name || (e._expect.region && row.region !== e._expect.region)) { console.log(`✗ ${id}: row is "${row.name}" / ${row.region}`); failed++; continue; }
  console.log(`${DRY ? "would write" : "writing"} ${id}: ${Object.entries(patch).map(([k, v]) => `${k} ${JSON.stringify(row[k])} → ${JSON.stringify(v)}`).join(", ")}`);
  if (DRY) continue;
  rollback[id] = Object.fromEntries(Object.keys(patch).map(k => [k, row[k] ?? null]));
  fs.writeFileSync(ROLLBACK, JSON.stringify(rollback, null, 1));
  await patchRow("areas", id, patch);
  await sleep(1000);
  const back = (await (await fetch(`${SUPABASE_URL}/rest/v1/areas?id=eq.${encodeURIComponent(id)}&select=${Object.keys(patch).join(",")}`, { headers: headers(key) })).json())[0];
  const drift = Object.keys(patch).filter(k => (typeof patch[k] === "number" ? Math.abs(back[k] - patch[k]) > 1e-6 : back[k] !== patch[k]));
  if (drift.length) { console.log(`✗ ${id}: re-read differs on ${drift.join(", ")}`); failed++; } else wrote++;
  await sleep(1100);
}
console.log(`\n${DRY ? "dry run" : "done"}: ${wrote} written, ${failed} refused${wrote ? ` · rollback: ${ROLLBACK}` : ""}`);
process.exit(failed ? 1 : 0);
