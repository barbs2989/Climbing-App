// For each route whose terrain verdict changed, print the sentence that changed it.
//
// A count of "10 routes now keep their avalanche advice" is worth nothing until somebody has
// read WHY each one does. Some of these will be genuine (a base that holds avalanche snow);
// some will be a proxy firing on a proper noun ("Snow Lake"). Both belong in the writeup, and
// only reading the sentence separates them.
//
//   node scripts/oneoff/probe-terrain-changed-quotes.mjs <id> ...
import { SUPABASE_URL, headers, anonKey, requireServiceKey } from "../lib/supabase-env.mjs";

const key = (() => { try { return requireServiceKey(); } catch { return anonKey(); } })();
const ids = process.argv.slice(2);
if (!ids.length) { console.error("give route ids"); process.exit(1); }

const GLACIER_RE = /\bglacier|glaciat(?:ed|ion)|crevasse|s[eé]racs?|icefall|bergschrund|schrund|snow\s*bridge|rope\s*team|picket\b/i;
const SNOW_RE = /\bsnowfield|\bsnow\s|\bsnowy|n[ée]v[ée]|\bfirn\b|cornice|ice\s*axe|crampon|self[- ]arrest|posthol|glissad|snowpack|\bavalanche|\bavy\b|\bwhippet\b/i;

const res = await fetch(
  `${SUPABASE_URL}/rest/v1/routes?select=id,name,climbing_route,approach_variants&id=in.(${ids.join(",")})`,
  { headers: headers(key) });
if (!res.ok) throw new Error(`routes -> ${res.status}`);
const rows = JSON.parse(await res.text());
if (!rows.length) throw new Error("zero rows read — a clean answer here would be a false pass");

const AV_PROSE_KEYS = ["name", "notes", "hazards", "baseFinding"];
for (const r of rows.sort((a, b) => a.id.localeCompare(b.id))) {
  console.log(`\n=== ${r.id} — ${r.name}`);
  const bits = [];
  for (const v of [].concat(r.climbing_route || [])) {
    if (v && typeof v === "object") bits.push(["climbing_route", [v.label, v.notes].filter(Boolean).join(". ")]);
  }
  for (const v of [].concat(r.approach_variants || [])) {
    if (v && typeof v === "object") for (const k of AV_PROSE_KEYS) if (v[k]) bits.push([`approach_variants.${k}`, String(v[k])]);
  }
  const seen = new Set();
  for (const [where, text] of bits) {
    for (const s of text.split(/(?<=[.;!?])\s+|\n+/)) {
      const g = GLACIER_RE.test(s), n = SNOW_RE.test(s);
      if (!g && !n) continue;
      const t = s.trim();
      if (seen.has(t)) continue;
      seen.add(t);
      console.log(`  [${g ? "G" : " "}${n ? "S" : " "}] ${where}: ${t.slice(0, 210)}`);
      if (seen.size >= 5) break;
    }
    if (seen.size >= 5) break;
  }
  if (!seen.size) console.log("  (nothing matched — verdict changed via a different axis)");
}
