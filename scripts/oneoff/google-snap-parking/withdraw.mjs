#!/usr/bin/env node
// Takes back a pin this pass wrote when a later second opinion (recheck-out/) no longer supports it: every area in
// the record whose id is NOT among the current decisions is cleared, guarded on the pin still being exactly the one
// this pass wrote (anything changed since is left alone). Rollback JSON first, paced, reconciled.
// Usage: node withdraw.mjs <recordFile> <currentDecisions.json> [--dry]
import fs from 'node:fs';
import { patchRow, SUPABASE_URL, requireServiceKey, headers } from '../../lib/supabase-env.mjs';
const [REC, CUR] = process.argv.slice(2); const dry = process.argv.includes('--dry');
const rec = JSON.parse(fs.readFileSync(REC)); const cur = new Set(JSON.parse(fs.readFileSync(CUR)).map((d) => d.id));
const gone = rec.filter((d) => !cur.has(d.id));
console.log('record', rec.length, 'withdrawn by a second opinion', gone.length, gone.map((d) => d.id).slice(0, 20));
if (dry || !gone.length) process.exit(0);
const key = requireServiceKey();
const r = await fetch(`${SUPABASE_URL}/rest/v1/areas?select=id,name,parking_lat,parking_lng,parking_name,parking_note&id=in.(${gone.map((d) => encodeURIComponent(d.id)).join(',')})`, { headers: headers(key) });
const live = await r.json();
fs.writeFileSync(`scripts/rollback-google-snap-withdraw-${Date.now()}.json`, JSON.stringify(live, null, 1));
let n = 0;
for (const d of gone) {
  const x = live.find((y) => y.id === d.id); if (!x || x.parking_lat !== d.lat || x.parking_lng !== d.lng) continue;
  await patchRow('areas', d.id, { parking_lat: null, parking_lng: null, parking_name: null }, { filter: `parking_lat=eq.${d.lat}&parking_lng=eq.${d.lng}` }); n++;
  await new Promise((res) => setTimeout(res, 1000));
}
fs.writeFileSync(REC, JSON.stringify(rec.filter((d) => cur.has(d.id)), null, 0).replace(/\},\{/g, '},\n{'));
console.log('cleared', n);
