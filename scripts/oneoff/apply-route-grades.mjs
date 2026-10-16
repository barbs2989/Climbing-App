// Apply the researched FINAL GRADE of WA mountain routes (audits/route-grades/research/out/*.json).
//
// One value per route — its crux, top of any range, on one scale — goes into `grade`, with
// `grade_system` and `grade_num` to match (and `ice_grade_num` for an ice crux, which is the column
// the finder's WI range reads). lib/grade.js finalGrade() makes that value the headline on these
// disciplines; the other grade columns stay as the breakdown under COMPOSITE GRADE.
//
// NOTHING ON SCREEN IS DROPPED SILENTLY. The old `grade` string often carried more than a grade
// ("Grade II, Class 3, glacier"), and COMPOSITE GRADE renders its remainder as a note. So before it
// is overwritten: a commitment numeral moves to `commitment` when that column is empty, and the
// difficulty description moves to `rock_grade` when that column is empty and the final grade is a
// rock/class one. Whatever is left is in the rollback file and the report.
//
// The repair value for grade_num is never typed — it is gradeNumFrom(grade, system), the one
// parser check:grade-parser enforces, so audit:grade-num-drift stays at stored == derived.
//
//   node scripts/oneoff/apply-route-grades.mjs --dry            # report only
//   node scripts/oneoff/apply-route-grades.mjs                  # write, with a rollback
//   node scripts/oneoff/apply-route-grades.mjs --only=b01,b02   # restrict to some batches
//   node scripts/oneoff/apply-route-grades.mjs --dir=audits/route-grades/deep/out   # the deep pass
import fs from "fs";
import { SUPABASE_URL, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";
import { gradeNumFrom, displayGrade } from "../../lib/grade.js";

const DRY = process.argv.includes("--dry");
const ONLY = (process.argv.find(a => a.startsWith("--only=")) || "").slice(7).split(",").filter(Boolean);
const key = requireServiceKey();
// --dir=audits/route-grades/deep/out applies the deep pass (g*.json) through the same checks.
const DIR = (process.argv.find(a => a.startsWith("--dir=")) || "--dir=audits/route-grades/research/out").slice(6);
const SCALE = {
  class: /^Class [1-4]$/,
  yds: /^5\.(?:\d|1[0-5])(?:[a-d](?:\/[a-d])?|[+-])?$/,
  wi: /^(?:WI|AI)[1-7][+-]?$/,
};
const FIX_COLS = ["rock_grade", "alpine_grade", "ice_grade", "commitment"];
const SOURCE_NAMES = /mountain ?project|summitpost|beckey|mountaineers|peakbagger|nwhikers|cascadeclimbers|wikipedia|caltopo|\bnps\b|usfs|route brief|according to|guidebook/i;
const ROMAN = /^(?:Grade\s+)?([IVX]+[+-]?(?:\s*[-–/]\s*[IVX]+[+-]?)?)\b[\s,;:–—-]*/i;

const files = fs.readdirSync(DIR).filter(f => /^(?:b\d+|g\d+|zz-[a-z-]+)\.json$/.test(f) && (!ONLY.length || ONLY.includes(f.replace(".json", "")))).sort();
const results = files.flatMap(f => JSON.parse(fs.readFileSync(`${DIR}/${f}`, "utf8")).map(r => ({ ...r, _batch: f })));
const ids = [...new Set(results.map(r => r.id))];
const COLS = "id,discipline,grade,grade_num,grade_system,rock_grade,alpine_grade,ice_grade,commitment,ice_grade_num";
const live = {};
for (let i = 0; i < ids.length; i += 100) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=${COLS}&id=in.(${ids.slice(i, i + 100).join(",")})`, { headers: headers(key) });
  if (!res.ok) throw new Error("fetch " + res.status);
  for (const r of await res.json()) live[r.id] = r;
}

const plan = [], refused = [];
for (const x of results) {
  const r = live[x.id];
  const no = why => refused.push({ id: x.id, batch: x._batch, why, final_grade: x.final_grade });
  if (!r) { no("no such row"); continue; }
  // finalGrade() headlines these three; an ICE row already keeps grade_system 'wi' (0196), so it
  // takes a WI/AI final grade and nothing else. MIXED rows are drytooling crags whose M headline the
  // finder already reads from its own scale — out of scope, never rewritten here.
  if (!["mountaineering", "alpine", "scrambling"].includes(r.discipline) && !(r.discipline === "ice" && x.scale === "wi")) { no(`discipline ${r.discipline} is out of scope`); continue; }
  const fg = String(x.final_grade || "").trim();
  if (!SCALE[x.scale] || !SCALE[x.scale].test(fg)) { no(`"${fg}" is not a ${x.scale} grade`); continue; }
  if (x.confidence === "low" && !x.normalize && r.grade_num != null && displayGrade(r)) { no("low confidence, and the row already has a filterable grade"); continue; }
  const body = { grade: fg, grade_system: x.scale, grade_num: gradeNumFrom(fg, x.scale) };
  if (body.grade_num == null) { no("parser returned null"); continue; }
  if (x.scale === "wi") { body.ice_grade_num = body.grade_num; if (!r.ice_grade) body.ice_grade = fg; }
  // keep what the old `grade` string said
  const old = (r.grade || "").trim();
  if (old && old !== fg) {
    const m = old.match(ROMAN);
    let rest = old;
    if (m && !/^(?:V\d|VB)/i.test(old)) { if (!r.commitment) body.commitment = m[1].toUpperCase(); rest = old.slice(m[0].length).trim(); }
    rest = rest.replace(/^(?:glacier|climb)$/i, "").trim();
    // Kept only when it AGREES with the final grade (its top is the same number) and adds something
    // — a range or a qualifier. A bare restatement ("3rd" beside "Class 3") adds nothing, and a
    // range the research lowered (Carne "Class 1-2" -> Class 1) would contradict the headline.
    if (rest && rest !== fg && !r.rock_grade && x.scale !== "wi" && /class|5\.|\d(?:st|nd|rd|th)|scramble/i.test(rest)
      && gradeNumFrom(rest, x.scale) === body.grade_num && /[-–/(,]|\bwith\b|\band\b/.test(rest)) body.rock_grade = rest;
  }
  for (const [k, v] of Object.entries(x.fix || {})) {
    if (!FIX_COLS.includes(k)) { no(`fix of ${k} is not a grade column — skipped that fix`); continue; }
    if (v != null && (typeof v !== "string" || v.length > 140 || SOURCE_NAMES.test(v))) { no(`fix ${k} "${v}" fails the lint — skipped that fix`); continue; }
    if ((r[k] ?? null) !== v) body[k] = v;
  }
  for (const k of Object.keys(body)) if ((r[k] ?? null) === body[k]) delete body[k];
  if (!Object.keys(body).length) continue;
  const after = { ...r, ...body };
  plan.push({ id: x.id, batch: x._batch, before: Object.fromEntries(Object.keys(body).map(k => [k, r[k] ?? null])), body,
    headline: [displayGrade(r), displayGrade(after)], confidence: x.confidence, evidence: x.evidence, sources: x.sources });
}

const moved = plan.filter(p => p.headline[0] !== p.headline[1]);
console.log(`results ${results.length} | changes ${plan.length} | headline changes ${moved.length} | refused ${refused.length}`);
const tag = Date.now();
fs.writeFileSync(`audits/route-grades/plan-${DRY ? "dry" : tag}.json`, JSON.stringify({ plan, refused }, null, 1));
for (const p of moved.slice(0, +(process.env.SHOW || 25))) console.log(`  ${p.id}: ${JSON.stringify(p.headline[0])} -> ${JSON.stringify(p.headline[1])} (${p.confidence}) ${p.evidence || ""}`.slice(0, 260));
if (DRY) process.exit(0);

fs.writeFileSync(`audits/route-grades/rollback-${tag}.json`, JSON.stringify(Object.fromEntries(plan.map(p => [p.id, p.before])), null, 1));
let ok = 0;
for (const p of plan) { await patchRow("routes", p.id, p.body); ok++; }
// a 200 is not evidence: re-read and reconcile every written column
let bad = 0;
for (let i = 0; i < plan.length; i += 100) {
  const chunk = plan.slice(i, i + 100);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=${COLS}&id=in.(${chunk.map(p => p.id).join(",")})`, { headers: headers(key) });
  const got = Object.fromEntries((await res.json()).map(r => [r.id, r]));
  for (const p of chunk) for (const [k, v] of Object.entries(p.body)) if ((got[p.id][k] ?? null) !== v) { bad++; console.error("MISMATCH", p.id, k, got[p.id][k], v); }
}
console.log(`wrote ${ok}, re-read mismatches ${bad}, rollback audits/route-grades/rollback-${tag}.json`);
if (bad) process.exit(1);
