// Does the warm-up in check-area-counts.mjs actually do anything?
//
// A single green run proves nothing: the UNWARMED script also passes intermittently — it took
// three attempts on 2026-08-13, failing twice with `57014 canceling statement due to statement
// timeout` before succeeding. So measure the MECHANISM, not the outcome.
//
// Each run is a fresh node process and therefore a fresh connection, which is exactly why this
// is not self-correcting: every scheduled run of check:counts pays the cold cost again.
//
// Run it twice — once with --warm and once without — since a single process can only be cold
// once. Comparing two timings inside one process would measure the second request as warm no
// matter which branch produced it.
// Measure ONE request, not selectAll's whole paginated walk. The failure happens on the FIRST
// page — `selectAll` threw from inside its opening fetch — so timing all 48 pages measures
// throughput and hides the thing under test. (First draft did exactly that: 30s vs 35s, a
// difference that is entirely load noise across a 47,590-row read.)
import { loadEnv, anonKey } from "../lib/supabase-env.mjs";

const env = loadEnv();
const url = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const key = anonKey();
const WARM = process.argv.includes("--warm");

async function page(label, path) {
  const t = Date.now();
  const r = await fetch(url + path, { headers: { apikey: key, Authorization: "Bearer " + key } });
  const body = await r.text();
  const ms = Date.now() - t;
  const n = r.ok ? (JSON.parse(body).length ?? "?") : "-";
  console.log(`  ${label.padEnd(26)} ${r.status}  ${String(ms).padStart(6)}ms  rows=${n}` +
    (r.ok ? "" : `  ${body.slice(0, 80)}`));
  return r.ok;
}

if (WARM) await page("warm-up (1 row, no match)", "/rest/v1/areas?select=id&id=eq.__warmup_no_such_area__&limit=1");
const ok = await page(WARM ? "first page (WARMED)" : "first page (COLD)",
  "/rest/v1/areas?select=id,name,area_type,parent_id,route_count&order=id&limit=1000");
if (!ok) process.exitCode = 1;
