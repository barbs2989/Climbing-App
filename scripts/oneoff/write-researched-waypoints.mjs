#!/usr/bin/env node
// Usage: SUPABASE_SERVICE_KEY="<service_role key>" node write-researched-waypoints.mjs <path-to-merged-waypoints.json>
// Batch-patches routes.waypoints for every route id in the given JSON file (id -> waypoint array).
// Writes one route at a time (PATCH by id) since Supabase REST doesn't support per-row bulk upsert of
// distinct jsonb values in one call; logs failures instead of aborting so one bad id doesn't lose the rest.
const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error('Error: Set VITE_SUPABASE_URL and SUPABASE_SERVICE_KEY (service_role secret)'); process.exit(1); }

const file = process.argv[2];
if (!file) { console.error('Usage: node write-researched-waypoints.mjs <path-to-merged-waypoints.json>'); process.exit(1); }

import { readFileSync } from 'fs';
const data = JSON.parse(readFileSync(file, 'utf8'));
const ids = Object.keys(data);

async function patchOne(id, waypoints) {
  const res = await fetch(`${url}/rest/v1/routes?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({ waypoints }),
  });
  if (!res.ok) return { id, ok: false, error: `HTTP ${res.status}: ${await res.text()}` };
  const rows = await res.json();
  if (!rows.length) return { id, ok: false, error: 'no matching row (id not found)' };
  return { id, ok: true };
}

async function main() {
  console.log(`Writing waypoints for ${ids.length} routes...`);
  let ok = 0, fail = 0;
  const failures = [];
  for (const id of ids) {
    const result = await patchOne(id, data[id]);
    if (result.ok) ok++; else { fail++; failures.push(result); }
    if ((ok + fail) % 25 === 0) console.log(`  ${ok + fail}/${ids.length}...`);
  }
  console.log(`\nDone. ${ok} succeeded, ${fail} failed.`);
  if (failures.length) {
    console.log('Failures:');
    failures.forEach(f => console.log(`  ${f.id}: ${f.error}`));
  }
}
main().catch(e => { console.error(e); process.exit(1); });
