// Independent reconcile of the Liberty Bell camping batch — re-read from the DB and compare
// against the batch file, rather than trusting the applier's own report. A 200 is not evidence.
import { SUPABASE_URL, anonKey } from "../lib/supabase-env.mjs";
import fs from "fs";
const U = SUPABASE_URL, K = anonKey(), h = { apikey: K, Authorization: "Bearer " + K };
const get = async q => {
  const r = await fetch(`${U}/rest/v1/${q}`, { headers: h, signal: AbortSignal.timeout(60000) });
  if (!r.ok) throw new Error(r.status + " " + (await r.text()).slice(0, 160));
  return r.json();
};
const batch = JSON.parse(fs.readFileSync(process.argv[2] || "enrichment-wip/camping_liberty_bell_group_2026_08_13.json", "utf8"));
const ids = Object.keys(batch);
let rows = [];
for (let i = 0; i < ids.length; i += 40) rows = rows.concat(await get(`routes?select=id,name,area_id,bivy&id=in.(${ids.slice(i, i + 40).join(",")})&limit=200`));

let bad = 0;
const seen = new Set();
for (const r of rows) {
  seen.add(r.id);
  const want = batch[r.id].bivy;
  if (!Array.isArray(r.bivy)) { console.log(`FAIL ${r.id}: bivy is ${typeof r.bivy}`); bad++; continue; }
  if (r.bivy.length !== want.length) { console.log(`FAIL ${r.id}: ${r.bivy.length} sites, want ${want.length}`); bad++; continue; }
  if (r.area_id !== batch[r.id].area) { console.log(`FAIL ${r.id}: area ${r.area_id} != asserted ${batch[r.id].area}`); bad++; continue; }
  // Deep-compare content, ORDER-INSENSITIVELY on object keys. Postgres jsonb does not preserve
  // key order, so a plain JSON.stringify comparison reports every row as differing while the
  // data is identical — it did exactly that on the first run of this probe.
  const norm = v => Array.isArray(v) ? v.map(norm)
    : (v && typeof v === "object" ? Object.keys(v).sort().reduce((a, k) => (a[k] = norm(v[k]), a), {}) : v);
  if (JSON.stringify(norm(r.bivy)) !== JSON.stringify(norm(want))) {
    console.log(`FAIL ${r.id}: stored content differs from batch`);
    const a = norm(r.bivy), b = norm(want);
    for (let i = 0; i < Math.max(a.length, b.length); i++)
      if (JSON.stringify(a[i]) !== JSON.stringify(b[i])) console.log(`   site ${i}: stored ${JSON.stringify(a[i]).slice(0, 160)}`);
    bad++;
  }
}
const missing = ids.filter(i => !seen.has(i));
console.log(`\nbatch ${ids.length} routes; read back ${rows.length}; missing ${missing.length}; mismatched ${bad}`);
if (missing.length) console.log("MISSING:", missing.join(", "));

// And the panel's own read path: every site must produce a usable elevation or none at all.
const sites = rows.flatMap(r => r.bivy || []);
const withElev = sites.filter(s => s.elev != null).length;
const withElevM = sites.filter(s => s.elev == null && s.elevM != null).length;
console.log(`sites ${sites.length}: elev ${withElev}, elevM-only ${withElevM}, no elevation ${sites.length - withElev - withElevM}`);
console.log("types:", JSON.stringify(sites.reduce((a, s) => (a[s.type || "(none)"] = (a[s.type || "(none)"] || 0) + 1, a), {})));
process.exit(bad || missing.length ? 1 : 0);
