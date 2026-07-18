// Canonical "how many WA peaks are there right now" query.
//
// Past ad hoc audit scripts gave a different peak count every run because they either
// (a) paginated with offset/limit but no ORDER BY, which Postgres does not guarantee to be
//     stable across calls once the table is being written to, or
// (b) scanned the areas table without a WA filter and silently hit PostgREST's default
//     1000-row cap, truncating to whichever slice of the 47k-row nationwide table the
//     planner happened to return that day.
// This script paginates with `order=id.asc` and cross-checks the fetched row count against
// an authoritative `Prefer: count=exact` HEAD request, so a future regression of either kind
// fails loudly instead of silently returning a smaller number.
//
//   node scripts/list-wa-peaks.mjs [--list]
//
import { readFileSync } from "node:fs";

let url = process.env.VITE_SUPABASE_URL;
if (!url) { try { url = (readFileSync(".env.local", "utf8").match(/VITE_SUPABASE_URL=(.+)/) || [])[1]?.trim(); } catch {} }
let key = process.env.VITE_SUPABASE_ANON_KEY;
if (!key) { try { key = (readFileSync(".env.local", "utf8").match(/VITE_SUPABASE_ANON_KEY=(.+)/) || [])[1]?.trim(); } catch {} }
if (!url || !key) { console.error("Need VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (.env.local or env vars)."); process.exit(1); }
url = url.replace(/\/$/, "");
const H = { apikey: key, Authorization: `Bearer ${key}` };

const FILTER = "id=like.wa_*&area_type=eq.peak";
const PAGE_SIZE = 1000;

async function fetchPage(offset) {
  const r = await fetch(`${url}/rest/v1/areas?select=id,name&${FILTER}&order=id.asc&limit=${PAGE_SIZE}&offset=${offset}`, { headers: H });
  if (!r.ok) throw new Error(`page at offset ${offset}: ${r.status} ${await r.text()}`);
  return r.json();
}

async function authoritativeCount() {
  const r = await fetch(`${url}/rest/v1/areas?select=id&${FILTER}`, { headers: { ...H, Prefer: "count=exact" }, method: "HEAD" });
  if (!r.ok) throw new Error(`count check: ${r.status} ${await r.text()}`);
  const total = Number((r.headers.get("content-range") || "").split("/")[1]);
  if (!Number.isFinite(total)) throw new Error(`count check: unparseable content-range "${r.headers.get("content-range")}"`);
  return total;
}

const expected = await authoritativeCount();

let peaks = [], offset = 0;
for (;;) {
  const rows = await fetchPage(offset);
  peaks = peaks.concat(rows);
  if (rows.length < PAGE_SIZE) break;
  offset += PAGE_SIZE;
}

const uniqueIds = new Set(peaks.map(p => p.id));
if (uniqueIds.size !== peaks.length) {
  console.error(`FAIL: fetched ${peaks.length} rows but only ${uniqueIds.size} unique ids -- pagination returned duplicates.`);
  process.exit(1);
}
if (peaks.length !== expected) {
  console.error(`FAIL: fetched ${peaks.length} peaks but authoritative count is ${expected} -- pagination missed rows.`);
  process.exit(1);
}

console.log(`WA peaks: ${peaks.length} (verified against Prefer: count=exact)`);
if (process.argv.includes("--list")) {
  peaks.sort((a, b) => a.id.localeCompare(b.id)).forEach(p => console.log(`  ${p.id}\t${p.name}`));
}
process.exit(0);
