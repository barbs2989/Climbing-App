/* Which second grade record on a row corroborates its `grade`, and when is a grade commitment-only.
 *
 * SHARED BY A MEASUREMENT AND A SWEEP ON PURPOSE. The precedent is scripts/lib/camp-names.mjs,
 * which CLAUDE.md records being shared between a solver and an audit because "a solver and an
 * audit that disagree about 'the same place' would either bless the solver's mistakes or report
 * correct work as broken". Exactly the same hazard here: if the sweep's refusal rule and the
 * measurement's refusal rule drift, the measurement stops describing the sweep.
 *
 * `alpine_grade` IS DELIBERATELY NOT A CORROBORATOR, and leaving it in was the first wrong
 * instrument this rule had — it reported 11 disagreements and EVERY ONE was correct data, because
 * `"5.7"` against `alpine_grade "IV"` compares a technical grade to a roman COMMITMENT grade: two
 * different quantities. That column holds commitment numerals and French adjectival grades, and
 * neither is a statement about technical difficulty.
 *
 * `class` MAPS TO `rock_grade`, and leaving it out was the SECOND wrong instrument — it silently
 * moved `wa_mount_shuksan_northwest_arete`, the refusal CLAUDE.md records by name, out of REFUSE
 * and into FILL. Class and YDS are one numeric scale here by construction (`gradeNumFrom` maps
 * `class 3` and `5.3` both to 3), which is why that refusal compares those two columns at all.
 * A scale shared for SCORING is shared for CORROBORATION.
 *
 * `v` and `m` are unmapped because no same-system second column exists in this schema — the grade
 * columns are rock/ice/alpine/aid, and there is no `boulder_grade` (checked against
 * scripts/schema-snapshot.json, not assumed).
 */
import { gradeNumFrom } from "../../lib/grade.js";

export const SECOND_FOR = { yds: "rock_grade", class: "rock_grade", wi: "ice_grade", aid: "aid_grade" };

/* One grade apart is not a disagreement: the two records are written by different passes and
   routinely round differently. Three grades apart is the Shuksan case. */
export const AGREE_WITHIN = 1;

const ROMAN = /\b(?:VII|VI|IV|III|II|I|V)\b/g;

/* DERIVED FROM THE SHIPPED PARSER rather than by re-implementing its branch order: a grade is
   commitment-only when it parses, and the same string with roman numerals removed does not.
   `\bV\b` cannot match the V in "V4" (V and 4 are both word characters, so there is no boundary
   between them), so a boulder grade is not mistaken for a commitment numeral. */
export function isCommitmentOnly(grade, sys) {
  return gradeNumFrom(String(grade).replace(ROMAN, " "), sys) == null;
}

/* The second record's value on the same scale, or null when the row carries none this parser can
   read. A PROSE second record corroborates nothing, and treating it as a disagreement would
   refuse rows for the instrument's sake rather than the data's. */
export function secondOpinion(row, sys) {
  const col = SECOND_FOR[sys];
  if (!col) return null;
  const raw = typeof row[col] === "string" ? row[col].trim() : "";
  if (!raw) return null;
  const n = gradeNumFrom(raw, sys);
  return n == null ? null : { col, raw, n };
}

export function disagrees(second, n) {
  return second != null && Math.abs(second.n - n) > AGREE_WITHIN;
}
