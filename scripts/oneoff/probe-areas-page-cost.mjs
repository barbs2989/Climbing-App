// Is the areas read timing out because of the two extra columns, or because the database is
// busy? Guessing at a page size without measuring is how a flaky guard gets shipped.
// Read-only. node scripts/oneoff/probe-areas-page-cost.mjs
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";

const key = anonKey();
async function timed(select, limit) {
  const q = `${SUPABASE_URL}/rest/v1/areas?select=${select}&order=id.asc&limit=${limit}`;
  const t = Date.now();
  const res = await fetch(q, { headers: headers(key) });
  const body = await res.text();
  const ms = Date.now() - t;
  const n = res.ok ? JSON.parse(body).length : 0;
  return { ok: res.ok, ms, n, err: res.ok ? "" : JSON.parse(body).code || body.slice(0, 60) };
}

for (const select of ["id,name,path,area_type", "id,name,path,area_type,lat,lng", "id,lat,lng"]) {
  for (const limit of [200, 400, 1000]) {
    const r = await timed(select, limit);
    console.log(`${r.ok ? "ok  " : "FAIL"} ${String(r.ms).padStart(6)} ms  rows=${String(r.n).padStart(4)}  limit=${String(limit).padStart(4)}  ${select}  ${r.err}`);
  }
}
