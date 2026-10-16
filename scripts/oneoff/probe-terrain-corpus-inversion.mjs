// Should corpus() be an ALLOW-list of columns or a DENY-list?
//
// The defect being repaired is that two prose columns were added to `routes` and corpus() was
// never told, so the classifier stopped seeing evidence the screen still showed. Naming a
// third column fixes today and leaves the trap armed for the fourth. The by-construction
// answer is to invert it: read every value on the route EXCEPT a short deny-list, so a new
// prose column is picked up the day it appears.
//
// That is only correct if the inversion is quiet. It drags in ~35 columns nobody considered —
// `fa`, `permit`, `access`, `data_quality.gaps` (one boilerplate sentence repeated 8,021
// times), `notes`, `source`. If any of those carries a snow or glacier word, EVERY route
// carrying that column flips at once, and the classifier stops discriminating at all. Which
// is worse than the bug.
//
// So: measure, do not argue. This runs both corpus shapes over the real catalog and reports
// how many verdicts differ and which columns caused it.
//
//   node scripts/oneoff/probe-terrain-corpus-inversion.mjs [--state wa]
import { SUPABASE_URL, headers, anonKey, requireServiceKey } from "../lib/supabase-env.mjs";

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? (argv[i + 1] ?? true) : d; };
const STATE = arg("--state", "wa");
const key = (() => { try { return requireServiceKey(); } catch { return anonKey(); } })();

const GLACIER_RE = /\bglacier|glaciat(?:ed|ion)|crevasse|s[eé]racs?|icefall|bergschrund|schrund|snow\s*bridge|rope\s*team|picket\b/i;
const SNOW_RE = /\bsnowfield|\bsnow\s|\bsnowy|n[ée]v[ée]|\bfirn\b|cornice|ice\s*axe|crampon|self[- ]arrest|posthol|glissad|snowpack|\bavalanche|\bavy\b|\bwhippet\b/i;

// What corpus() reads today, after this branch's fix.
const ALLOW = new Set(["name", "description", "overview", "beta", "hazards", "obj_haz",
  "watch_out", "gear", "rack", "detailed_rack", "what_to_bring", "pro_needs", "assumed_gear",
  "approach", "descent", "descent_text", "bail", "turnaround", "pitch_detail",
  "seasonal_guidance", "pro_tips", "features", "difficulty", "climbing_route",
  "approach_variants"]);

// What an inverted corpus() would refuse: the calendar and access columns the file already
// excludes by name, plus ids and anything numeric (which cannot carry a snow word).
const DENY = new Set(["id", "area_id", "timing", "itinerary", "road", "climate", "season",
  "best_season", "grade", "grade_num", "rock_grade", "aspect_grade", "ice_grade", "discipline",
  "source", "url", "permit_url", "auto_generated", "grade_system"]);

const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=*&discipline=eq.alpine&id=like.wa_*&order=id.asc&limit=400`,
  { headers: headers(key) });
if (!res.ok) throw new Error(`routes -> ${res.status} ${(await res.text()).slice(0, 200)}`);
let rows = JSON.parse(await res.text());
if (!rows.length) throw new Error("zero rows read — a clean answer here would be a false pass");
if (rows.length < 50) throw new Error(`only ${rows.length} rows in scope — too few to judge an inversion on`);
console.log(`scanned ${rows.length} alpine routes with every column selected`);

const str = v => v == null ? "" :
  typeof v === "string" ? v :
  Array.isArray(v) ? v.map(str).join("  ") :
  typeof v === "object" ? Object.values(v).map(str).join("  ") : String(v);

// Which columns OUTSIDE the allow-list would contribute a snow or glacier word, and how often?
const blame = new Map();
let diff = 0;
for (const r of rows) {
  const allowText = Object.keys(r).filter(k => ALLOW.has(k)).map(k => str(r[k])).join("  ");
  const aG = GLACIER_RE.test(allowText), aS = SNOW_RE.test(allowText);
  let extraG = false, extraS = false;
  for (const k of Object.keys(r)) {
    if (ALLOW.has(k) || DENY.has(k)) continue;
    const t = str(r[k]);
    if (!t) continue;
    const g = GLACIER_RE.test(t), s = SNOW_RE.test(t);
    if (!g && !s) continue;
    if ((g && !aG) || (s && !aS)) {
      blame.set(k, (blame.get(k) || 0) + 1);
      if (g && !aG) extraG = true;
      if (s && !aS) extraS = true;
    }
  }
  if (extraG || extraS) diff++;
}

console.log(`\n${diff} of ${rows.length} routes would gain a NEW glacier/snow signal from a column outside the allow-list`);
if (!blame.size) console.log("  (none — the inversion would be silent on this sample)");
for (const [k, n] of [...blame].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(4)}  ${k}`);
}
const cols = rows.length ? Object.keys(rows[0]).length : 0;
console.log(`\n${cols} columns present; ${[...ALLOW].length} allowed, ${[...DENY].length} denied, ` +
  `${cols - [...ALLOW].filter(k => rows[0] && k in rows[0]).length - [...DENY].filter(k => rows[0] && k in rows[0]).length} unclassified`);
