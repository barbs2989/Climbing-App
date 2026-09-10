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
import { routeTerrain, CORPUS_COLUMNS, AV_PROSE_KEYS } from "../../lib/terrain.js";

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? (argv[i + 1] ?? true) : d; };
const STATE = arg("--state", "wa");
const key = (() => { try { return requireServiceKey(); } catch { return anonKey(); } })();

// Lifted from lib/terrain.js. Kept verbatim so "would terrain.js have seen it" stays the
// question; if these drift, the probe is measuring a fossil.
const GLACIER_RE = /\bglacier|glaciat(?:ed|ion)|crevasse|s[eé]racs?|icefall|bergschrund|schrund|snow\s*bridge|rope\s*team|picket\b/i;
const SNOW_RE = /\bsnowfield|\bsnow\s|\bsnowy|n[ée]v[ée]|\bfirn\b|cornice|ice\s*axe|crampon|self[- ]arrest|posthol|glissad|snowpack|\bavalanche|\bavy\b|\bwhippet\b/i;
const NEG_GLACIER = /\bnon-?\s*glaciat(?:ed|ion)\b|\bno\s+glacier(?:\s+travel)?\b|\bnot\s+glaciat(?:ed)\b|\bglacier[- ]free\b|\bno\s+crevasse/i;


/* THE READ SET IS IMPORTED, NEVER RESTATED, AND THIS PROBE PAID FOR THAT RULE BY BREAKING IT.
   The list was a hand copy of `lib/terrain.js` taken BEFORE the blind-column repair, so once
   that repair added `climbing_route` to `CORPUS_COLUMNS` and taught the classifier to read
   `approach_variants` BY KEY, this went on calling both blind. It then reported 7 routes as
   "LIVE (the classifier is suppressing on that blind spot)" — every one of them quoting a
   SEASON string, "Roughly July through the first snow of October", from `approach_variants.season`,
   the one key the repair deliberately excludes because reading it re-imports the Highway 20
   mistake. Correct behaviour reported as a live defect, and it EXITED 0 the whole time, so a
   sweep judging on status never saw it: *an exit code is not evidence a probe is telling the
   truth*.

   So the blind set is now DERIVED — every prose-ish column on the row that `CORPUS_COLUMNS` does
   not name — and `approach_variants` is read exactly as the app reads it, by `AV_PROSE_KEYS`.
   A column the app starts reading leaves this set by itself. */
const CORPUS_COLS = CORPUS_COLUMNS;
// `variantProse` is not exported, so rebuild it from the exported KEY LIST rather than by copying
// the function: the keys are what decides which half of `approach_variants` is read, and they are
// the half that moved.
const variantProse = v => !Array.isArray(v) ? "" :
  v.map(x => AV_PROSE_KEYS.map(k => (x && x[k] != null ? String(x[k]) : "")).join(" ")).join("  ");
// Everything the app reads is CORPUS_COLUMNS plus the variant PROSE keys. The two columns this
// probe was written about are both inside that now — `climbing_route` joined the list and
// `approach_variants` is read by key — so what is left outside is the variant keys the repair
// deliberately excludes, `season` chief among them. Those are reported as DELIBERATE, never LIVE:
// reading `season` is the Highway 20 mistake the exclusion exists to prevent.
// The variant keys the repair deliberately leaves out — `season` above all.
const excludedVariantProse = v => !Array.isArray(v) ? "" :
  v.map(x => Object.keys(x || {}).filter(k => !AV_PROSE_KEYS.includes(k)).map(k => (x[k] != null ? String(x[k]) : "")).join(" ")).join("  ");
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
  /* WHAT THE APP ACTUALLY READS OF THESE TWO COLUMNS, and what is left over.
     `climbing_route` joined `CORPUS_COLUMNS` and `approach_variants` is read BY KEY, so the only
     text still outside the corpus is the variant keys the repair excludes on purpose. Modelling
     that is the whole fix: the earlier version treated both columns as wholly blind and therefore
     counted the app's own reading as a blind spot — 7 routes reported LIVE, every one of them
     quoting "Roughly July through the first snow of October" out of `approach_variants.season`. */
  const seen = BLIND_COLS.map(c => c === "approach_variants" ? variantProse(r[c]) : (CORPUS_COLUMNS.includes(c) ? str(r[c]) : "")).join("  ");
  const unread = BLIND_COLS.map(c => c === "approach_variants" ? excludedVariantProse(r[c]) : (CORPUS_COLUMNS.includes(c) ? "" : str(r[c]))).join("  ");
  // A column that is wholly unread is a real blind spot; an excluded KEY is a decision.
  const whollyUnread = BLIND_COLS.filter(c => c !== "approach_variants" && !CORPUS_COLUMNS.includes(c));
  if (!(seen + unread).trim()) continue;
  populated++;

  const corpusText = (CORPUS_COLS.map(c => str(r[c])).join("  ") + "  " + seen).replace(NEG_GLACIER, " ");
  const blindClean = unread.replace(NEG_GLACIER, " ");

  const gCorpus = GLACIER_RE.test(corpusText), gBlind = GLACIER_RE.test(blindClean);
  const sCorpus = SNOW_RE.test(corpusText), sBlind = SNOW_RE.test(blindClean);

  const newGlacier = gBlind && !gCorpus;
  const newSnow = sBlind && !sCorpus;
  if (!newGlacier && !newSnow) continue;

  const t = routeTerrain(r);
  /* Would the classifier be suppressing? Kept as its own question, because "the text is unread"
     and "the verdict would change" want different reactions and the earlier version merged them. */
  const suppressing = (newGlacier && t.glacier === "no") || (newSnow && (t.snow === "no" || t.avalanche === "no"));
  /* LIVE only when the evidence sits in a column the app reads NOTHING of. Evidence in an excluded
     KEY is the exclusion working: `approach_variants.season` says WHEN the route is in condition,
     not WHAT it crosses, and CLAUDE.md records that reading it re-imports the Highway 20 mistake
     where a winter road closure made every route read as avalanche terrain. */
  const live = suppressing && whollyUnread.length > 0;
  blindOnly++;
  const sample = c => {
    const txt = c === "approach_variants" ? excludedVariantProse(r[c]) : str(r[c]);
    const re = newGlacier ? GLACIER_RE : SNOW_RE;
    for (const s of txt.split(/(?<=[.;!?])\s+|\n+/)) if (re.test(s) && !NEG_GLACIER.test(s)) return s.trim().slice(0, 190);
    return null;
  };
  findings.push({ r, t, newGlacier, newSnow, suppressing, live,
    quote: BLIND_COLS.map(sample).find(Boolean) || "(no sentence isolated)" });
}

const live = findings.filter(f => f.live);
const latent = findings.filter(f => !f.live);

for (const f of live) {
  console.log(`\nLIVE  ${f.r.id} — ${f.r.name}  [${f.r.discipline}]`);
  console.log(`      terrain says glacier=${f.t.glacier} snow=${f.t.snow} avalanche=${f.t.avalanche}`);
  console.log(`      new ${f.newGlacier ? "GLACIER" : "SNOW"} evidence in a column terrain.js reads NOTHING of:`);
  console.log(`      "${f.quote}"`);
}
const wholly = BLIND_COLS.filter(c => c !== "approach_variants" && !CORPUS_COLUMNS.includes(c));
console.log(`\ncolumns terrain.js reads NOTHING of: ${wholly.length ? wholly.join(", ") : "none — CORPUS_COLUMNS covers both"}`);
console.log(`keys it excludes on purpose: approach_variants outside ${JSON.stringify(AV_PROSE_KEYS)}`);
console.log(`${populated} of ${scoped.length} routes carry text in either`);
console.log(`${blindOnly} carry glacier or snow evidence found ONLY in the unread part`);
console.log(`  LIVE (a wholly unread column, and the verdict turns on it): ${live.length}`);
console.log(`  deliberate (the evidence is in an excluded KEY; ${latent.filter(f => f.suppressing).length} would flip a verdict if it were read): ${latent.length}`);
for (const f of latent) console.log(`    deliberate  ${f.r.id} — glacier=${f.t.glacier} snow=${f.t.snow} avy=${f.t.avalanche}${f.suppressing ? "  (would flip)" : ""}`);
