// Find a DB route whose area holds several routes, for the sibling-list outage probe.
// Read-only, anon key.
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";

const r = await fetch(
  `${SUPABASE_URL}/rest/v1/areas?select=id,name,route_count&route_count=gte.4&route_count=lte.9&limit=5&order=id`,
  { headers: headers(anonKey()) },
);
if (!r.ok) { console.error(`areas read failed: ${r.status}`); process.exit(1); }
const areas = await r.json();
if (!areas.length) { console.error("no areas matched — a broken read, not an empty catalog"); process.exit(1); }

for (const a of areas) {
  const q = await fetch(
    `${SUPABASE_URL}/rest/v1/routes?select=id,name&area_id=eq.${encodeURIComponent(a.id)}&limit=9`,
    { headers: headers(anonKey()) },
  );
  const rows = q.ok ? await q.json() : [];
  if (rows.length >= 2) {
    console.log(`area ${a.id} (${a.name}) route_count=${a.route_count}, ${rows.length} rows fetched`);
    console.log(`probe route: ${rows[0].id}   ${rows[0].name}`);
    console.log(`siblings   : ${rows.slice(1).map((x) => x.name).join(" | ")}`);
    process.exit(0);
  }
}
console.error("no area returned two routes — a broken read");
process.exit(1);
