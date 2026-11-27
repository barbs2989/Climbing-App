#!/usr/bin/env node
// Writes the confirmed road-end parking pins (owner note 2026-11-26: "Google Maps is often right to where to park ...
// cross-reference it ... and if it is right add the parking pin"). Input: decisions JSON
//   [{ id, new: {lat,lng,name}, why }]
// FILL-ONLY: each write is guarded on parking_lat IS NULL, so a pin set by anyone since the snapshot is never
// overwritten, and a researched parking NOTE is never touched. Paced by patchRow (>= 1 s/write), full old rows go to
// a rollback JSON before the first write, `dbslot check` every 50 writes, and every row is re-read to reconcile.
// Usage: node apply.mjs decisions.json [--dry]
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { patchRow, SUPABASE_URL, requireServiceKey, headers } from '../../lib/supabase-env.mjs';

const file = process.argv[2], dry = process.argv.includes('--dry');
if (!file) { console.error('usage: apply.mjs decisions.json [--dry]'); process.exit(2); }
const dec = JSON.parse(fs.readFileSync(file, 'utf8'));
for (const d of dec) {
  const n = d.new || {};
  if (!d.id || !isFinite(n.lat) || !isFinite(n.lng) || !n.name || n.name.length > 80) throw new Error('bad decision ' + JSON.stringify(d));
  if (/mountain ?project|guidebook|openstreetmap|\bosm\b|google|supertopo|thecrag|summitpost/i.test(n.name)) throw new Error('source in name: ' + n.name);
}
const key = requireServiceKey();
const live = [];
for (let i = 0; i < dec.length; i += 100) {
  const q = `${SUPABASE_URL}/rest/v1/areas?select=id,name,lat,lng,parking_lat,parking_lng,parking_name,parking_note&id=in.(${dec.slice(i, i + 100).map((d) => encodeURIComponent(d.id)).join(',')})`;
  const r = await fetch(q, { headers: headers(key) }); if (!r.ok) throw new Error(`read ${r.status}`); live.push(...await r.json());
}
const byId = new Map(live.map((r) => [r.id, r]));
const todo = [], skip = [];
for (const d of dec) { const r = byId.get(d.id); if (r && r.parking_lat == null && r.parking_lng == null) todo.push(d); else skip.push(d.id); }
console.log(`${dec.length} decisions: ${todo.length} areas still have no pin, ${skip.length} gone or pinned since (skipped)`);
if (dry) process.exit(0);
const rb = `scripts/rollback-google-snap-parking-${Date.now()}.json`;
fs.writeFileSync(rb, JSON.stringify(todo.map((d) => byId.get(d.id)), null, 1));
console.log(`rollback: ${rb}`);
let n = 0;
for (const d of todo) {
  await patchRow('areas', d.id, { parking_lat: d.new.lat, parking_lng: d.new.lng, parking_name: d.new.name }, { filter: 'parking_lat=is.null' });
  await new Promise((r) => setTimeout(r, 2000)); // 3 s a write in all: 2 s still tripped dbslot's slow probe after 50-300 writes (2026-11-26)
  if (++n % 50 === 0) {
    console.log(`${new Date().toISOString()} ${n}/${todo.length}`);
    try { execFileSync('node', [`${process.env.HOME}/dev/db-throttle/dbslot.mjs`, 'check'], { stdio: 'inherit' }); }
    catch { console.error('dbslot check failed — STOPPING; a re-run resumes (written rows are no longer null and are skipped)'); process.exit(3); }
  }
}
let ok = 0;
for (let i = 0; i < todo.length; i += 100) {
  const part = todo.slice(i, i + 100);
  const r = await fetch(`${SUPABASE_URL}/rest/v1/areas?select=id,parking_lat,parking_lng&id=in.(${part.map((d) => encodeURIComponent(d.id)).join(',')})`, { headers: headers(key) });
  for (const row of await r.json()) { const d = part.find((x) => x.id === row.id); if (row.parking_lat === d.new.lat && row.parking_lng === d.new.lng) ok++; }
}
console.log(`reconciled: ${ok}/${todo.length} rows hold the decided pin`);
