// The CRUX GRADE tile forks the app's grade resolver, and on 117 routes it shows the COMMITMENT
// grade instead of the climbing grade.
//
// `gradeLabelRaw(r)` is the single resolver: rock_grade -> ice_grade -> alpine_grade -> grade ->
// commitment. The header pill goes through it, which is why Mount Stuart's North Ridge reads 5.9
// up top. The tile does `shortGrade(route.cruxGrade || route.grade)` — straight to `grade`, which
// on that route is the compound string "Grade IV, 5.9". shortGrade() cuts at the comma and keeps
// the FIRST part, so the tile reads "Grade IV": a commitment grade, on a tile labelled crux.
//
// `crux` is populated on 0 of 205,543 rows, so the fallback is not an edge case — it is the only
// path the tile has ever taken.
//
// This measures the proposed fix (use the shared resolver) over a broad sample, and reports any
// route where it would make the tile WORSE, because a change that fixes 117 and breaks 30 is not
// a fix.
import { readFileSync, mkdtempSync } from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { build } from "esbuild";
import { shortGrade, gradeDetail } from "../../lib/grade.js";

const root = new URL("../..", import.meta.url).pathname;

// `gradeLabelRaw` is LIFTED FROM THE APP, never copied: a copy would agree with the source the day
// it was written and measure a fossil afterwards, which is the whole question here. Node cannot
// import .jsx, so it goes through esbuild — `--platform=node` because Supabase's subpackages do
// not resolve under `neutral`, and `import.meta.env` defined because lib/supabase.js reads it at
// module scope and would throw before any export is reachable.
const outFile = path.join(mkdtempSync(path.join(os.tmpdir(), "cm-grade-")), "core.cjs");
await build({
  stdin: { contents: `export { gradeLabelRaw } from ${JSON.stringify(root + "ClimbMatchCore.jsx")};`,
           resolveDir: root, loader: "js" },
  bundle: true, format: "cjs", platform: "node", jsx: "automatic",
  loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: outFile, logLevel: "error",
});
const { gradeLabelRaw } = createRequire(import.meta.url)(outFile);
if (typeof gradeLabelRaw !== "function") { console.error("ANCHOR LOST: gradeLabelRaw is not exported"); process.exit(1); }
const env = {};
for (const f of [".env.local", ".env"]) {
  try { for (const l of readFileSync(root + f, "utf8").split("\n")) {
    const m = l.match(/^([A-Z_]+)=(.*)$/); if (m && !(m[1] in env)) env[m[1]] = m[2].trim(); } } catch {}
}
const H = { apikey: env.VITE_SUPABASE_ANON_KEY, Authorization: "Bearer " + env.VITE_SUPABASE_ANON_KEY };
const g = async p => (await fetch(env.VITE_SUPABASE_URL + "/rest/v1/" + p, { headers: H })).json();

// The 117 that lead with a commitment grade, plus a broad sample to catch regressions elsewhere.
const targeted = await g(`routes?select=id,grade,rock_grade,ice_grade,alpine_grade,commitment,crux,discipline&grade=like.Grade %25,%25&limit=200`);
const broad = await g(`routes?select=id,grade,rock_grade,ice_grade,alpine_grade,commitment,crux,discipline&grade=not.is.null&order=id.asc&limit=1000`);
if (!Array.isArray(targeted) || !Array.isArray(broad) || !broad.length) {
  console.error("read failed or empty — failing closed"); process.exit(1);
}

const seen = new Set();
const rows = [...targeted, ...broad].filter(r => !seen.has(r.id) && seen.add(r.id));

// Mirror dbRouteToCamel's spread: the app sees BOTH spellings, so the resolver must be handed the
// same shape it gets at runtime rather than the bare snake_case row.
const camel = r => ({ ...r, rockGrade: r.rock_grade, iceGrade: r.ice_grade, alpineGrade: r.alpine_grade, cruxGrade: r.crux });

// A commitment grade is a Roman numeral (optionally a range) with no climbing grade in it. That
// is the shape the tile must never show, and it is what makes "worse" decidable rather than taste.
const isCommitmentOnly = v => /^(Grade\s+)?[IVX]+(\s*[-\/]\s*[IVX]+)?$/i.test(String(v || "").trim());

const now = r => shortGrade(r.cruxGrade || r.grade);

// FIX A — use the app's shared resolver. MEASURED AND REJECTED, kept here as the record:
// `gradeLabelRaw` prefers rock/ice/alpine_grade over `grade`, and those columns DISAGREE with
// `grade` on many rows. It turns "Grade III, 5.6" into "3rd-4th class" and "Grade III, 5.7" into
// "Class 3-4", and on 4 sampled routes it replaces a perfectly good "5.6" with the alpine grade
// "V" — swapping one wrong value for another.
const fixedA = r => (r.cruxGrade ? shortGrade(r.cruxGrade) : shortGrade(gradeLabelRaw(r)));

// FIX B — take the climbing grade out of THE SAME STRING. `shortGrade` cuts a compound grade at
// its qualifier delimiter and keeps the first half; on these rows the first half is the
// commitment grade and `gradeDetail` holds the remainder. So when the tile would show a
// commitment grade and nothing else, show the remainder instead.
//
// It cannot regress a route that already displays a climbing grade — the branch is only reachable
// when the current value is commitment-only — and it introduces no new data source, so it cannot
// inherit a disagreement between columns.
const fixedB = r => {
  const raw = r.cruxGrade || r.grade;
  const s = shortGrade(raw);
  if (!isCommitmentOnly(s)) return s;
  const d = gradeDetail(raw);
  return d ? shortGrade(d) : s;   // no remainder to show: keep what we had rather than blank it
};
const fixed = fixedB;

let changed = 0, betterN = 0, worseN = 0;
const worse = [], better = [];
for (const raw of rows) {
  const r = camel(raw);
  const a = now(r), b = fixed(r);
  if (a === b) continue;
  changed++;
  const aBad = isCommitmentOnly(a), bBad = isCommitmentOnly(b);
  if (aBad && !bBad) { betterN++; if (better.length < 6) better.push([raw.id, raw.grade, a, b]); }
  else if (!aBad && bBad) { worseN++; worse.push([raw.id, raw.grade, a, b]); }
  else if (better.length < 6 && !aBad && !bBad) better.push([raw.id, raw.grade, a, b]);
}

console.log(`${rows.length} distinct routes sampled (${targeted.length} that lead with a commitment grade)\n`);
console.log(`tile value changes on : ${changed}`);
console.log(`  commitment -> climbing grade (FIXED) : ${betterN}`);
console.log(`  climbing -> commitment grade (WORSE) : ${worseN}`);

console.log(`\nexamples:`);
for (const [id, grade, a, b] of better)
  console.log(`  ${id.padEnd(42)} grade=${JSON.stringify(grade).padEnd(26)} "${a}" -> "${b}"`);

if (worse.length) {
  console.log(`\nREGRESSIONS — do not ship until these are understood:`);
  for (const [id, grade, a, b] of worse)
    console.log(`  ${id.padEnd(42)} grade=${JSON.stringify(grade).padEnd(26)} "${a}" -> "${b}"`);
  process.exit(1);
}
console.log(`\nno route gets a commitment grade where it previously had a climbing grade.`);
