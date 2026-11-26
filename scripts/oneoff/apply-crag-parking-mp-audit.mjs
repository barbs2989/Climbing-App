#!/usr/bin/env node
// Applies the crag-parking audit against Mountain Project's Getting There text (owner note 2026-11-25:
// "Parking is wrong for many of the Crags ... Existential Wall, Red Rocks"). Input: a decisions JSON
//   [{ id, old: {lat,lng,name}, new: {lat,lng,name} | null, note?: string, why }]
// `new: null` clears a pin MP's text contradicts when no lot matching MP could be placed: a blank says
// "parking not on file" instead of sending a party to the other side of the hill.
// Each write is guarded on the OLD pin (parking_lat/lng still equal the snapshot), paced by patchRow
// (>= 1 s/write), and the full old rows go to a rollback JSON before the first write.
// Usage: node scripts/oneoff/apply-crag-parking-mp-audit.mjs decisions.json [--dry]
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { patchRow, SUPABASE_URL, requireServiceKey, headers } from "../lib/supabase-env.mjs";

const file = process.argv[2], dry = process.argv.includes("--dry");
if (!file) { console.error("usage: apply-crag-parking-mp-audit.mjs decisions.json [--dry]"); process.exit(2); }
const dec = JSON.parse(fs.readFileSync(file, "utf8"));
const key = requireServiceKey();
const ids = dec.map((d) => d.id);
const live = [];
for (let i = 0; i < ids.length; i += 100) {
  const q = `${SUPABASE_URL}/rest/v1/areas?select=id,name,parking_lat,parking_lng,parking_name,parking_note&id=in.(${ids.slice(i, i + 100).map(encodeURIComponent).join(",")})`;
  const r = await fetch(q, { headers: headers(key) }); if (!r.ok) throw new Error(`read ${r.status}`); live.push(...await r.json());
}
const byId = new Map(live.map((r) => [r.id, r]));
const todo = [], drift = [];
for (const d of dec) { const r = byId.get(d.id); if (r && (d.old.lat == null ? r.parking_lat == null : r.parking_lat === d.old.lat && r.parking_lng === d.old.lng)) todo.push(d); else drift.push(d.id); }
console.log(`${dec.length} decisions: ${todo.length} still match the snapshot, ${drift.length} changed since (skipped)`);
if (dry) { process.exit(0); }
const rb = `scripts/rollback-crag-parking-mp-${Date.now()}.json`;
fs.writeFileSync(rb, JSON.stringify(todo.map((d) => byId.get(d.id)), null, 1));
console.log(`rollback: ${rb}`);
let n = 0;
for (const d of todo) {
  const body = d.new ? { parking_lat: d.new.lat, parking_lng: d.new.lng, parking_name: d.new.name || null } : { parking_lat: null, parking_lng: null, parking_name: null };
  // A note is only ever ADDED where the area has none (a researched note is never overwritten).
  if (d.note && !byId.get(d.id).parking_note) body.parking_note = d.note;
  await patchRow("areas", d.id, body, { filter: d.old.lat == null ? "parking_lat=is.null" : `parking_lat=eq.${d.old.lat}&parking_lng=eq.${d.old.lng}` });
  if (++n % 50 === 0) {
    console.log(`${new Date().toISOString()} ${n}/${todo.length}`);
    try { execFileSync("node", [`${process.env.HOME}/dev/db-throttle/dbslot.mjs`, "check"], { stdio: "inherit" }); }
    catch { console.error("dbslot check failed — STOPPING; re-run resumes (rows already written no longer match the snapshot and are skipped)"); process.exit(3); }
  }
}
// Reconcile: re-read and count rows that now hold the decided value.
let ok = 0;
for (let i = 0; i < todo.length; i += 100) {
  const part = todo.slice(i, i + 100);
  const r = await fetch(`${SUPABASE_URL}/rest/v1/areas?select=id,parking_lat,parking_lng&id=in.(${part.map((d) => encodeURIComponent(d.id)).join(",")})`, { headers: headers(key) });
  for (const row of await r.json()) { const d = part.find((x) => x.id === row.id); if (d.new ? row.parking_lat === d.new.lat && row.parking_lng === d.new.lng : row.parking_lat == null) ok++; }
}
console.log(`reconciled: ${ok}/${todo.length} rows hold the decided pin`);
