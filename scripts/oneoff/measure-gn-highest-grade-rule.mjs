#!/usr/bin/env node
/* What would "the grade is the highest grade" cost if applied to gn(), the CLIMBING-TIME parser?
 *
 * gn() is NOT a fifth dialect of grade_num. It maps every system onto one axis for techHrs()
 * (WI -> 6+n, M -> 7+0.6n, aid -> 8+n) — a different question from sorting. But it reads the same
 * range strings and takes the FIRST match, i.e. the EASIER end. In techHrs a higher grade means a
 * SLOWER speed, so the low end produces a SHORTER climbing leg: Est. summit and Est. return come
 * out optimistic and the "After dark" warning fires less often. That is the #641 direction.
 *
 * MEASURED, NOT CHANGED. This writes nothing and edits nothing.
 *
 * FOUR THINGS THAT MAKE A NAIVE VERSION OF THIS WRONG, each handled here:
 *   1. The app does not see routes.grade. dbRouteToCamel maps `grade: usableGrade(r)`, which NULLS
 *      a bare class grade on crag disciplines. Measuring the raw column measures a different input.
 *   2. gn() only decides techH when the route has NO published and NO derived summit time —
 *      route.timing.summitTimeHrs and .totalHrs both take precedence. Counting every pitched route
 *      would overstate the blast radius.
 *   3. techH is not the number on screen. With pitches, retH = depart + hikeH + techH + techH*0.7,
 *      so a change of D in techH moves the RETURN by 1.7*D. The techH delta alone understates it.
 *   4. `routes` has no pitch-length column, so avgPitchLength is seed-only and `||35` always fires.
 *
 * The helpers are LIFTED and EXECUTED, never retyped — a retyped reference agrees with itself
 * whatever the app does, which is the whole question.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const argv = process.argv.slice(2);
const STATE = argv.includes("--state") ? argv[argv.indexOf("--state") + 1] : null;

/* ---- 1. the real helpers, out of the app, via one esbuild bundle ---------------------------- */
const outdir = path.join(ROOT, `.gn-measure-${process.pid}`);
fs.mkdirSync(outdir, { recursive: true });
const entry = path.join(outdir, "entry.js");
fs.writeFileSync(entry, `export { gn, techHrs, pitchedFraction, scarfHrs } from ${JSON.stringify(path.join(ROOT, "ClimbMatchCore.jsx"))};\n`);
const bundle = path.join(outdir, "core.mjs");
try {
  execFileSync("npx", ["esbuild", entry, "--bundle", "--format=esm", "--platform=node",
    "--jsx=automatic", "--loader:.jsx=jsx", "--external:react", "--external:react-dom",
    "--external:@tanstack/react-query", "--define:import.meta.env={}", `--outfile=${bundle}`],
    { cwd: ROOT, stdio: ["ignore", "ignore", "pipe"] });
} catch (e) {
  console.error("FAIL — could not bundle ClimbMatchCore.jsx. Nothing was measured.");
  console.error(String(e.stderr || e).slice(0, 800));
  fs.rmSync(outdir, { recursive: true, force: true });
  process.exit(1);
}
const core = await import(`file://${bundle}`);
fs.rmSync(outdir, { recursive: true, force: true });
for (const k of ["gn", "techHrs", "pitchedFraction", "scarfHrs"]) {
  if (typeof core[k] !== "function") { console.error(`FAIL — ${k} is not exported from ClimbMatchCore.jsx. ANCHOR LOST.`); process.exit(1); }
}
const { gn, techHrs, scarfHrs } = core;

/* ---- 2. usableGrade, lifted from lib/db.js by text (it is module-local, not exported) -------- */
const dbSrc = fs.readFileSync(path.join(ROOT, "lib", "db.js"), "utf8");
const ug = dbSrc.match(/const CRAG_DISC = new Set\([^;]+;\s*const CLASS_GRADE = [^;]+;\s*function usableGrade\(r\) \{[\s\S]*?\n\}/);
if (!ug) { console.error("FAIL — ANCHOR LOST: could not lift usableGrade from lib/db.js. Refusing to guess at the grade the app actually sees."); process.exit(1); }
const usableGrade = new Function(`${ug[0]}; return usableGrade;`)();
if (usableGrade({ grade: "Class 3", discipline: "trad" }) !== null || usableGrade({ grade: "5.9", discipline: "trad" }) !== "5.9") {
  console.error("FAIL — the lifted usableGrade does not behave as documented. Refusing to report."); process.exit(1);
}

/* ---- 3. the two candidate rules ------------------------------------------------------------
   A: "max instead of first" and NOTHING else — each of gn's four branches keeps its own pattern,
      its own transform and its own precedence; only the choice among that branch's matches moves.
   B: A, plus a range tail on the three SINGLE-TOKEN systems, mirroring exactly what shipped in
      gradeNumFrom. "5.4-5.6" is already two YDS matches and needs nothing; "WI3-4" is ONE match of
      /WI\s*(\d+)/ so a bare max still scores 3.
   Reported separately, because they are different rules with different costs. */
const RX_YDS = /5\.(\d+)([a-d]?)/g;
const RX_WI_A = /(?:WI|AI)\s*(\d+(?:\.\d+)?)/gi;
const RX_M_A = /M\s*(\d+(?:\.\d+)?)/gi;
const RX_AID_A = /[AC]\s*(\d)/gi;
const RX_WI_B = /(?:WI|AI)\s*(\d+(?:\.\d+)?)(?:\s*[-–—]\s*(\d+(?:\.\d+)?))?/gi;
const RX_M_B = /M\s*(\d+(?:\.\d+)?)(?:\s*[-–—]\s*(\d+(?:\.\d+)?))?/gi;
const RX_AID_B = /[AC]\s*(\d)(?:\s*[-–—]\s*(\d))?/gi;

function maxOf(g, rx, val) {
  let m, best = null;
  rx.lastIndex = 0;                                  // module-level /g literals carry lastIndex
  while ((m = rx.exec(g)) !== null) for (const v of val(m)) if (v != null && (best == null || v > best)) best = v;
  return best;
}
const YDS_V = (m) => [parseInt(m[1]) + (m[2] ? ("abcd".indexOf(m[2]) + 1) / 4 : 0.5)];
const ENDS = (base, scale) => (m) => [base + parseFloat(m[1]) * scale, m[2] ? base + parseFloat(m[2]) * scale : null];

function gnMax(g, wide) {
  if (!g) return 7.5;
  let v;
  if ((v = maxOf(g, RX_YDS, YDS_V)) != null) return v;
  if ((v = maxOf(g, wide ? RX_WI_B : RX_WI_A, ENDS(6, 1))) != null) return v;
  if ((v = maxOf(g, wide ? RX_M_B : RX_M_A, ENDS(7, 0.6))) != null) return v;
  if ((v = maxOf(g, wide ? RX_AID_B : RX_AID_A, ENDS(8, 1))) != null) return v;
  return 7.5;
}

/* ---- 4. the catalog ------------------------------------------------------------------------- */
const key = anonKey();
async function readAll() {
  const out = []; let last = "";
  for (;;) {
    const f = STATE ? `&id=like.${STATE}_*` : "";
    const url = `${SUPABASE_URL}/rest/v1/routes?select=id,grade,discipline,pitches,timing,dist_km,gain_ft,loss_ft${f}`
      + `&pitches=gt.0&id=gt.${encodeURIComponent(last)}&order=id.asc&limit=1000`;
    const res = await fetch(url, { headers: headers(key) });
    if (!res.ok) throw new Error(`read failed ${res.status} ${await res.text()}`);
    const rows = await res.json();
    if (!rows.length) break;
    out.push(...rows); last = rows[rows.length - 1].id;
    if (rows.length < 1000) break;
  }
  return out;
}
const rows = await readAll();
if (rows.length < 100) { console.error(`FAIL — read only ${rows.length} pitched routes. A short read reports a small blast radius and looks reassuring.`); process.exit(1); }

/* ---- 5. NON-VACUITY: the variant must reproduce gn() wherever there is nothing to choose ------
   If gnMax drifted from gn's branches, this fires. It is the same discipline the grade_num change
   was held to, and it is what makes an explicit variant safe to write by hand. */
let agree = 0; const disagreeSingle = [];
for (const r of rows) {
  const g = usableGrade(r);
  const a = gn(g), b = gnMax(g, false);
  if (Math.abs(a - b) < 1e-9) { agree++; continue; }
  if (b < a) disagreeSingle.push({ id: r.id, g, a, b });   // a max can never be SMALLER
}
if (disagreeSingle.length) {
  console.error(`FAIL — ${disagreeSingle.length} row(s) where the "max" rule returned a SMALLER number than gn(). The variant has drifted from gn's branches.`);
  for (const d of disagreeSingle.slice(0, 10)) console.error(`    ${JSON.stringify(d.g)}  gn=${d.a}  max=${d.b}   ${d.id}`);
  process.exit(1);
}

/* ---- 6. scope: where gn() actually DECIDES the estimate -------------------------------------- */
const DEF = { fit: "intermediate", pack: 10, party: 2, depart: 6 };
function gates(r) {
  const t = r.timing;
  const hasPublished = !!(t && t.summitTimeHrs != null);
  const derived = (!hasPublished && t && t.totalHrs != null)
    ? Math.max(0, t.totalHrs - (t.approachTimeHrs || 0) - (t.descentTimeHrs || 0)) : null;
  return { hasPublished, hasDerived: derived != null && derived > 0 };
}
function retHours(r, techH) {
  const gainM = r.gain_ft != null ? Math.round(r.gain_ft / 3.28084) : null;
  const lossM = r.loss_ft != null ? Math.round(r.loss_ft / 3.28084) : null;
  const hikeH = scarfHrs(r.dist_km, gainM, lossM, DEF.fit, DEF.pack);
  const sumH = DEF.depart + hikeH + techH;            // party===2 adds nothing
  return sumH + techH * 0.7;                          // pitches>0 on every row here
}

function run(wide) {
  const moved = [];
  const out = { considered: 0, decided: 0, moved: 0, dTech: [], dRet: [], flips: 0, unflips: 0 };
  for (const r of rows) {
    out.considered++;
    const { hasPublished, hasDerived } = gates(r);
    if (hasPublished || hasDerived) continue;         // gn() does not decide this route
    out.decided++;
    const g = usableGrade(r);
    const oldG = gn(g), newG = gnMax(g, wide);
    if (Math.abs(oldG - newG) < 1e-9) continue;
    const tOld = techHrs(r.pitches, 35, oldG), tNew = techHrs(r.pitches, 35, newG);
    const rOld = retHours(r, tOld), rNew = retHours(r, tNew);
    out.moved++; out.dTech.push(tNew - tOld); out.dRet.push(rNew - rOld);
    if (rOld <= 18.5 && rNew > 18.5) out.flips++;
    if (rOld > 18.5 && rNew <= 18.5) out.unflips++;
    moved.push({ id: r.id, g, oldG, newG, dTech: tNew - tOld, dRet: rNew - rOld, p: r.pitches });
  }
  moved.sort((a, b) => b.dRet - a.dRet);
  return { out, moved };
}

const pct = (xs, p) => { if (!xs.length) return 0; const s = xs.slice().sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const h = (x) => (x >= 0 ? "+" : "") + x.toFixed(2) + "h";

console.log(`\n=== gn(): what "the grade is the highest grade" would cost the TIME model ===\n`);
console.log(`  ${rows.length} routes carry pitches${STATE ? ` (state ${STATE})` : " (whole catalog)"}`);
console.log(`  ${agree} of them already agree under "max instead of first" — nothing to choose\n`);

for (const [label, wide] of [["A  max instead of first, and NOTHING else", false], ["B  A + a range tail on WI/M/aid (what shipped in gradeNumFrom)", true]]) {
  const { out, moved } = run(wide);
  console.log(`--- RULE ${label} ---`);
  console.log(`  ${out.decided} routes where gn() actually DECIDES the estimate (no published or derived summit time)`);
  console.log(`  ${out.moved} would move${out.moved ? ":" : "."}`);
  if (out.moved) {
    console.log(`     climbing leg   p50 ${h(pct(out.dTech, 0.5))}   p90 ${h(pct(out.dTech, 0.9))}   max ${h(Math.max(...out.dTech))}`);
    console.log(`     Est. RETURN    p50 ${h(pct(out.dRet, 0.5))}   p90 ${h(pct(out.dRet, 0.9))}   max ${h(Math.max(...out.dRet))}   (1.7x the climbing leg)`);
    console.log(`     every move is LATER: ${out.dRet.every((d) => d > 0) ? "yes" : "NO — investigate"}`);
    console.log(`     "After dark" warnings GAINED ${out.flips}, LOST ${out.unflips}`);
    console.log(`  the ten largest:`);
    for (const m of moved.slice(0, 10)) console.log(`     ${h(m.dRet).padStart(8)}  ${String(m.p).padStart(3)}p  gn ${String(m.oldG).padStart(5)} -> ${String(m.newG).padEnd(5)}  ${JSON.stringify(String(m.g).slice(0, 42))}  ${m.id}`);
  }
  console.log("");
}

/* ---- 7. the blind spot, which is bigger than either rule ------------------------------------- */
let noBranch = 0, classish = 0, noGrade = 0, decided = 0;
for (const r of rows) {
  const { hasPublished, hasDerived } = gates(r);
  if (hasPublished || hasDerived) continue;
  decided++;
  const g = usableGrade(r);
  if (!g) { noGrade++; noBranch++; continue; }
  if (gn(g) === 7.5 && !/5\.\d/.test(g)) { noBranch++; if (/class|^\s*[IVX]+\b|grade\s*[IVX]/i.test(g)) classish++; }
}
/* ---- 7b. the WHOLE differing class, gated or not ---------------------------------------------
   A row whose estimate is currently supplied by route.timing is MASKED rather than immune: drop
   that column and gn() decides it. Printing the masked ones is what separates "this class is
   small" from "this class is small TODAY". */
console.log(`--- EVERY row where the rule changes gn(), gated or not ---`);
let masked = 0;
for (const r of rows) {
  const g = usableGrade(r);
  const a = gn(g), b = gnMax(g, true);
  if (Math.abs(a - b) < 1e-9) continue;
  const { hasPublished, hasDerived } = gates(r);
  const why = hasPublished ? "MASKED by timing.summitTimeHrs" : hasDerived ? "MASKED by timing.totalHrs" : "LIVE — gn decides";
  if (hasPublished || hasDerived) masked++;
  console.log(`   ${String(a).padStart(5)} -> ${String(b).padEnd(5)}  ${String(r.pitches).padStart(3)}p  ${why.padEnd(30)}  ${JSON.stringify(String(g).slice(0, 38))}  ${r.id}`);
}
console.log(`   ${masked} of them are masked today by a published or derived summit time.\n`);

console.log(`--- THE BLIND SPOT, and it dwarfs both rules ---`);
console.log(`  ${noBranch} of the ${decided} decided routes fall through every branch and are timed as the DEFAULT 7.5 (~5.7)`);
console.log(`     ${noGrade} carry no usable grade at all; ${classish} carry a class or roman grade`);
console.log(`  gn() has NO class branch, so "Class 3-4" is not a range it reads the wrong end of —`);
console.log(`  it is a grade it cannot read at all. A highest-wins rule does not touch these.\n`);
