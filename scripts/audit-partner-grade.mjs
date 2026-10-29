// Does a route's PARTNER REQUIREMENTS ask for a lead grade its own GRADE does not justify?
//
// The route page's PARTNER REQUIREMENTS panel (EnrichmentPanels.jsx, PartnerRequirementsPanel)
// renders `partner_requirements.experienceLevel` and `.requiredSkills` beside the grade at the top
// of the page. Reported by the owner (2026-10-28): Liberty Bell's Overexposure, a 5.8, read
// "Strong 5.10-5.11 free climber" — one screen giving two answers to "how hard is this?".
//
// THE STANDARD, researched for this audit (docs/codebase/enrichment-prose.md, "partner_requirements"):
// a leader should lead the route's grade SOLIDLY, in its style (trad/sport), at a crag; ONE step of
// margin is the honest ask for alpine terrain (boots, a pack, commitment) — "Solid 5.8 trad leader;
// 5.9 at the crag gives margin". Guide services set the same bar (an alpine 5.8 asks for 5.8, not
// 5.10), and the common rule of thumb is to lead a grade or so below one's top-rope limit.
// A STEP is a number grade up to 5.9 and a LETTER from 5.10a up, because 5.10a→5.10b is the same
// jump in effort that 5.8→5.9 is.
//
// THREE FINDINGS:
//   ABOVE — the text names a grade MORE than one step above the route's grade. The Overexposure case.
//   BELOW — the text's HIGHEST named grade is below the route's grade: it tells a leader they are
//           ready for a route they are not. Often legitimate (an aid or optional crux), so it is READ.
//   NONE  — the route has no YDS grade (a scramble, ice, a walk-up) but the text asks for a 5.x
//           LEAD harder than 5.6. A scramble that "needs a 5.9 leader" is wrong, or the grade is.
//
// REPORT ONLY, and the finding decides nothing: every row is READ against the route's grade, pitch
// list and description before a word is rewritten (a mechanical fingerprint does not authorise a
// bulk fix). Service key, so a zero is a zero. `--state=wa` narrows, `--json` prints findings for a
// consumer, `--fixture=f.json` reads rows from a file, `--selftest` needs no DB.
// NOT a build gate: a property of the DB, not of the checkout.
import { readFileSync } from "node:fs";
import { requireServiceKey, selectAll } from "./lib/supabase-env.mjs";

const arg = (n, d) => { const a = process.argv.find(x => x.startsWith(`--${n}=`)); return a ? a.split("=").slice(1).join("=") : d; };
const STATE = arg("state", null);
const FIXTURE = arg("fixture", null);
const JSON_OUT = process.argv.includes("--json");

// 5.0 … 5.9 are steps 0 … 9; 5.10a is 10, 5.10b 11 … 5.11a 14. A bare "5.10" is its b/c middle
// (11.5), "5.10-" its a, "5.10+" its d — the way guidebooks and Mountain Project read them.
const YDS = /5\.(\d{1,2})(?:([a-d])(?:\s*\/\s*[a-d])?|([+-]))?(?![\d])/g;
export function steps(m) {
  const n = parseInt(m[1], 10);
  if (n < 10) return n + (m[3] === "+" ? 0.5 : m[3] === "-" ? -0.5 : 0);
  const base = 10 + (n - 10) * 4;
  if (m[2]) return base + "abcd".indexOf(m[2]);
  return base + (m[3] === "-" ? 0 : m[3] === "+" ? 3 : 1.5);
}
export function ydsSteps(s) {
  const out = [];
  if (typeof s !== "string") return out;
  YDS.lastIndex = 0;
  for (let m; (m = YDS.exec(s)); ) if (parseInt(m[1], 10) <= 15) out.push({ v: steps(m), t: m[0] });
  return out;
}
export const label = (v) => v < 10 ? `5.${Math.round(v)}` : `5.${10 + Math.floor((v - 10) / 4)}${"abcd"[Math.round(v - 10) % 4] || ""}`;

// The text that renders as a REQUIREMENT. fitnessSpec and approachTime never name a lead grade.
export function reqText(pr) {
  if (!pr || typeof pr !== "object") return "";
  const parts = [];
  if (typeof pr.experienceLevel === "string") parts.push(pr.experienceLevel);
  if (Array.isArray(pr.requiredSkills)) for (const s of pr.requiredSkills) if (typeof s === "string") parts.push(s);
  return parts.join(" | ");
}

// The route's own grade: rock_grade when it holds a YDS grade, else grade. The HIGHEST 5.x in it is
// the crux, which is what a leader must be able to climb.
export function routeSteps(r) {
  for (const g of [r.rock_grade, r.grade]) { const s = ydsSteps(g); if (s.length) return Math.max(...s.map(x => x.v)); }
  return null;
}

// A 5.x in requirement text that is NOT a lead requirement: a pitch or section described ("the 5.10
// crux can be aided", "a 5.9 variation"), which must not count as asked of the leader.
const NOT_ASKED = /\b(aid(?:ed|ing)?|french[- ]?free|pull(?:ing)? on gear|variation|alternative|option(?:al)?|avoid|bypass|instead|harder|direct (?:start|finish)|skip)\b/i;

export function classify(r) {
  const text = reqText(r.partner_requirements);
  if (!text) return null;
  // Only count grades in clauses that do not describe an optional or aidable section.
  const asked = text.split(/[|;,(]|\.\s/).filter(c => !NOT_ASKED.test(c)).flatMap(ydsSteps);
  if (!asked.length) return null;
  const hi = Math.max(...asked.map(x => x.v));
  const route = routeSteps(r);
  const base = { id: r.id, name: r.name, grade: r.rock_grade || r.grade, discipline: r.discipline, asked: label(hi), text };
  if (route == null) return hi > 6 ? { ...base, kind: "NONE" } : null;
  if (hi > route + 1) return { ...base, kind: "ABOVE", by: hi - route };
  if (hi < route) return { ...base, kind: "BELOW", by: route - hi };
  return null;
}

function selftest() {
  const R = (grade, experienceLevel, requiredSkills, extra) => ({ id: "t", name: "t", grade, partner_requirements: { experienceLevel, requiredSkills }, ...extra });
  const cases = [
    [R("5.8", "Strong 5.10-5.11 free climber comfortable with high exposure"), "ABOVE"],
    [R("5.8", "Solid 5.8 trad leader comfortable with high exposure"), null],
    [R("5.8", "Solid 5.8 trad leader; 5.9 at the crag gives margin"), null],
    [R("5.8", "5.10a sport climber"), "ABOVE"],
    [R("III 5.10a", "Solid 5.10a leader", ["5.10b crack technique"]), null],
    [R("III 5.10a", "Solid 5.10c leader"), "ABOVE"],
    [R("5.10b", "Solid 5.8 leader"), "BELOW"],
    [R("5.11a", "Solid 5.10 leader comfortable aiding the 5.11a crux"), null],
    [R("5.11a", "Solid 5.10 leader; the 5.11a crux can be aided"), "BELOW"],
    [R("Class 3", "Confident scrambler"), null],
    [R("Class 4", "5.9 trad leader"), "NONE"],
    [R("Class 4", "Comfortable on 5.4 terrain unroped"), null],
    [R("II 5.6", "Solid 5.6 leader; the 5.9 direct start is optional"), null],
    [R("5.9+", "Solid 5.10a leader"), null],
    [R("5.9", "Solid 5.10+ leader"), "ABOVE"],
    [{ id: "t", grade: "Grade II", rock_grade: "5.7", partner_requirements: { experienceLevel: "5.10 leader" } }, "ABOVE"],
    [{ id: "t", grade: "5.8", partner_requirements: { fitnessSpec: "5.12 fitness" } }, null],
  ];
  let bad = 0;
  for (const [row, want] of cases) { const got = classify(row)?.kind ?? null; if (got !== want) { bad++; console.error(`FAIL ${JSON.stringify(row.partner_requirements)} on ${row.rock_grade || row.grade}: want ${want}, got ${got}`); } }
  if (label(steps(["5.10a", "10", "a"])) !== "5.10a" || label(8) !== "5.8") { bad++; console.error("FAIL label()"); }
  console.log(bad ? `audit:partner-grade --selftest: ${bad} FAILED` : `audit:partner-grade --selftest: ${cases.length} cases pass`);
  process.exit(bad ? 1 : 0);
}
if (process.argv.includes("--selftest")) selftest();

const rows = FIXTURE ? JSON.parse(readFileSync(FIXTURE, "utf8"))
  : await selectAll("routes", "id,name,area_id,discipline,grade,rock_grade,partner_requirements",
      `partner_requirements=not.is.null${STATE ? `&id=like.${STATE}_*` : ""}`, { key: requireServiceKey(), pageSize: 100 });
const found = rows.map(classify).filter(Boolean);
if (JSON_OUT) { console.log(JSON.stringify(found, null, 1)); process.exit(0); }
const by = k => found.filter(f => f.kind === k);
console.log(`audit:partner-grade — ${rows.length} routes with partner requirements${STATE ? ` (${STATE})` : ""}, ${rows.filter(r => reqText(r.partner_requirements) && ydsSteps(reqText(r.partner_requirements)).length).length} name a grade`);
for (const [k, what] of [["ABOVE", "asks for MORE than one step above the route's grade"], ["BELOW", "asks for LESS than the route's crux"], ["NONE", "a route with no 5.x grade asks for a 5.x lead above 5.6"]]) {
  const list = by(k);
  console.log(`\n${k}: ${list.length} — ${what}`);
  for (const f of list) console.log(`  ${f.id} [${f.grade}] asks ${f.asked}: ${f.text.slice(0, 160)}${f.text.length > 160 ? "…" : ""}`);
}
process.exit(0);
