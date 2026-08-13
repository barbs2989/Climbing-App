// How many routes show a RACK box that the "Rack & gear" form cannot change?
//
// routeRackFor(route) reads detailed_rack, then pro_needs, then falls back to the generic
// per-discipline DISC_RACK. It never reads `rack`, and never reads `gear_tiers`. But the
// contribution merge files a "Rack & gear" correction into gearTiers.required. So the box a
// climber was looking at when they hit "suggest a fix" is fed by columns their correction
// does not touch.
//
// This measures the blast radius: every route with detailed_rack or pro_needs is one where
// the RACK box holds a value the form cannot overwrite.
//
// NOTE ON QUERY SHAPE. `Prefer: count=exact` with `id=like.wa_*` times out (UND_ERR_HEADERS_
// TIMEOUT) — a full scan of 205k rows. These columns are sparse enough to just FETCH, so we
// page the ids and count them locally. Same lesson CLAUDE.md records for check:field-renders:
// the cost is in making Postgres walk the table, not in the column being missing.
import { loadEnv } from "../lib/supabase-env.mjs";
import { probeDbLatency } from "../lib/db-preflight.mjs";
const env = loadEnv();
const U = env.VITE_SUPABASE_URL, K = env.VITE_SUPABASE_ANON_KEY;
if (!U || !K) { console.error("no DB configured"); process.exit(1); }
const H = { apikey: K, Authorization: `Bearer ${K}` };

const health = await probeDbLatency();
if (health.state === "error") {
  console.error(`THE DATABASE IS NOT ANSWERING — ${health.err} (after ${health.ms}ms).`);
  console.error("A bare select=id&limit=1 could not complete, so nothing below would have");
  console.error("measured this column. Re-run once the project answers. This is NOT a finding");
  console.error("about the rack columns or about the query shape.");
  process.exit(1);
}
console.log(`db: answered in ${health.ms}ms\n`);

// UNORDERED, deliberately: `order=id.asc` makes Postgres walk the id index and filter row by
// row until the limit fills, so a sparse column traverses most of a 205k-row table. That cost
// is real and is recorded in CLAUDE.md under check:field-renders.
//
// BUT IT IS NOT WHY THE FIRST RUNS OF THIS SCRIPT FAILED, and the distinction is the whole
// point of the guard shipped in #902. Ordered and unordered both timed out on all three
// columns, so the query shape looked guilty. probeDbLatency() then answered the actual
// question: three consecutive 20s timeouts on a bare `select=id&limit=1`. The database was
// down. Attributing that to the query would have sent the next reader optimising a query that
// was never the problem — an absence of evidence reported as evidence about the code.
//
// RUN probeDbLatency() BEFORE CONCLUDING ANYTHING FROM A TIMEOUT HERE.
//
// The cost of dropping the order is that this cannot keyset-page, so a column with more than
// CAP matches reports "at least CAP". That is fine for a blast-radius question and the output
// says so rather than implying an exact count.
const CAP = 10000;
async function ids(label, filter) {
  const q = `${U}/rest/v1/routes?select=id&${filter}&limit=${CAP}`;
  let r;
  try {
    r = await fetch(q, { headers: H, signal: AbortSignal.timeout(25000) });
  } catch (e) {
    console.log(label.padEnd(16), "FETCH FAILED —", String(e.message || e));
    return null;
  }
  if (!r.ok) { console.log(label.padEnd(16), "ERR", r.status, (await r.text()).slice(0, 160)); return null; }
  const rows = await r.json();
  const n = rows.length;
  console.log(label.padEnd(16), String(n).padStart(6), n >= CAP ? " (capped — at least this many)" : "");
  return rows.map((x) => x.id);
}

const dr = await ids("detailed_rack", "detailed_rack=not.is.null");
const pn = await ids("pro_needs", "pro_needs=not.is.null");
const gt = await ids("gear_tiers", "gear_tiers=not.is.null");

if (dr && pn) {
  const union = new Set([...dr, ...pn]);
  console.log("");
  console.log("routes whose RACK box is fed by a column the form cannot write:", union.size);
  const wa = [...union].filter((i) => i.startsWith("wa_")).length;
  console.log("  of which WA-prefixed:", wa);
}
if (gt) console.log("routes carrying gear_tiers (where a correction WOULD land):", gt.length);
