// Does a route's ONLY glacier/snow evidence live in a column lib/terrain.js does not read?
//
// terrain.js decides what safety advice to withhold, and it withholds a glacier line only
// when GLACIER_RE finds nothing in corpus(). So a wrong suppression cannot come from the
// regex being too narrow on text it HAS — it can only come from evidence in a column corpus()
// never looks at. That makes the blind-column set the whole attack surface, and it is short.
//
// corpus() names 23 columns. Two prose columns exist that it does not name:
//   climbing_route     — migration 0122, created to re-home climbing prose OUT of `approach`
//   approach_variants  — alternative approaches, each with its own description
// Both postdate corpus(). `approach` IS read, so a route whose glacier crossing was moved out
// of it and into climbing_route lost that evidence from the classifier without losing it from
// the screen.
//
// Deliberately compares against terrain.js's OWN regexes rather than a fresh pair, because
// the question is not "is there glacier prose" but "would terrain.js have seen it" — a
// second opinion would answer a question nobody is asking.
//
//   node scripts/oneoff/probe-terrain-corpus-blind-columns.mjs [--state wa]
import { SUPABASE_URL, headers, anonKey, requireServiceKey } from "../lib/supabase-env.mjs";
import { routeTerrain } from "../../lib/terrain.js";

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? (argv[i + 1] ?? true) : d; };
const STATE = arg("--state", "wa");
const key = (() => { try { return requireServiceKey(); } catch { return anonKey(); } })();

// Lifted from lib/terrain.js. Kept verbatim so "would terrain.js have seen it" stays the
// question; if these drift, the probe is measuring a fossil.
const GLACIER_RE = /\bglacier|glaciat(?:ed|ion)|crevasse|s[eé]racs?|icefall|bergschrund|schrund|snow\s*bridge|rope\s*team|picket\b/i;
const SNOW_RE = /\bsnowfield|\bsnow\s|\bsnowy|n[ée]v[ée]|\bfirn\b|cornice|ice\s*axe|crampon|self[- ]arrest|posthol|glissad|snowpack|\bavalanche|\bavy\b|\bwhippet\b/i;
const NEG_GLACIER = /\bnon-?\s*glaciat(?:ed|ion)\b|\bno\s+glacier(?:\s+travel)?\b|\bnot\s+glaciat(?:ed)\b|\bglacier[- ]free\b|\bno\s+crevasse/i;


// Everything terrain.js reads, plus the two it does not, so one read answers both halves.
const CORPUS_COLS = ["name", "description", "overview", "beta", "hazards", "obj_haz",
  "watch_out", "gear", "rack", "detailed_rack", "what_to_bring", "pro_needs", "assumed_gear",
  "approach", "descent", "descent_text", "bail", "turnaround", "pitch_detail",
  "seasonal_guidance", "pro_tips", "features", "difficulty"];
const BLIND_COLS = ["climbing_route", "approach_variants"];
const COLS = ["id", "name", "area_id", "discipline", "grade", "seasonal_hazards",
  ...CORPUS_COLS.filter(c => c !== "name"), ...BLIND_COLS].join(",");

const str = v => v == null ? "" :
  typeof v === "string" ? v :
  Array.isArray(v) ? v.map(str).join("  ") :
  typeof v === "object" ? Object.values(v).map(str).join("  ") : String(v);

async function page(disc, after) {
  const url = `${SUPABASE_URL}/rest/v1/routes?select=${COLS}&discipline=eq.${disc}` +
    (after ? `&id=gt.${encodeURIComponent(after)}` : "") + `&order=id.asc&limit=500`;
  for (let a = 0; a < 4; a++) {
    const res = await fetch(url, { headers: headers(key) });
    const t = await res.text();
    if (res.ok) return JSON.parse(t);
    if (a === 3) throw new Error(`GET routes -> ${res.status} ${t.slice(0, 200)}`);
    await new Promise(r => setTimeout(r, 800 * (a + 1)));
  }
}

const rows = [];
for (const disc of ["alpine", "mountaineering", "ice", "mixed"]) {
  let after = null;
  for (;;) {
    const p = await page(disc, after);
    if (!p.length) break;
    rows.push(...p);
    if (p.length < 500) break;
    after = p[p.length - 1].id;
  }
}
if (!rows.length) throw new Error("zero routes read — a clean answer here would be a false pass");

const scoped = STATE ? rows.filter(r => String(r.id).startsWith(`${STATE}_`)) : rows;
console.log(`scanned ${scoped.length} snow-discipline routes (of ${rows.length} catalog-wide)`);

let populated = 0, blindOnly = 0;
const findings = [];
for (const r of scoped) {
  const blindText = BLIND_COLS.map(c => str(r[c])).join("  ");
  if (!blindText.trim()) continue;
  populated++;

  const corpusText = CORPUS_COLS.map(c => str(r[c])).join("  ").replace(NEG_GLACIER, " ");
  const blindClean = blindText.replace(NEG_GLACIER, " ");

  const gCorpus = GLACIER_RE.test(corpusText), gBlind = GLACIER_RE.test(blindClean);
  const sCorpus = SNOW_RE.test(corpusText), sBlind = SNOW_RE.test(blindClean);

  const newGlacier = gBlind && !gCorpus;
  const newSnow = sBlind && !sCorpus;
  if (!newGlacier && !newSnow) continue;

  // Only a finding if the classifier ACTUALLY suppresses. Evidence in a blind column that
  // changes no verdict is a latent hazard, not a live one, and conflating them would inflate
  // the count with rows nothing is wrong with today.
  const t = routeTerrain(r);
  const suppressing = (newGlacier && t.glacier === "no") || (newSnow && (t.snow === "no" || t.avalanche === "no"));
  blindOnly++;
  const sample = c => {
    const txt = str(r[c]);
    const re = newGlacier ? GLACIER_RE : SNOW_RE;
    for (const s of txt.split(/(?<=[.;!?])\s+|\n+/)) if (re.test(s) && !NEG_GLACIER.test(s)) return s.trim().slice(0, 190);
    return null;
  };
  findings.push({ r, t, newGlacier, newSnow, suppressing,
    quote: BLIND_COLS.map(sample).find(Boolean) || "(no sentence isolated)" });
}

const live = findings.filter(f => f.suppressing);
const latent = findings.filter(f => !f.suppressing);

for (const f of live) {
  console.log(`\nLIVE  ${f.r.id} — ${f.r.name}  [${f.r.discipline}]`);
  console.log(`      terrain says glacier=${f.t.glacier} snow=${f.t.snow} avalanche=${f.t.avalanche}`);
  console.log(`      new ${f.newGlacier ? "GLACIER" : "SNOW"} evidence only in a blind column:`);
  console.log(`      "${f.quote}"`);
}
console.log(`\n${populated} of ${scoped.length} routes have climbing_route / approach_variants populated`);
console.log(`${blindOnly} carry glacier or snow evidence found ONLY there`);
console.log(`  LIVE (the classifier is suppressing on that blind spot): ${live.length}`);
console.log(`  latent (evidence is new, verdict unchanged): ${latent.length}`);
for (const f of latent) console.log(`    latent  ${f.r.id} — glacier=${f.t.glacier} snow=${f.t.snow} avy=${f.t.avalanche}`);
