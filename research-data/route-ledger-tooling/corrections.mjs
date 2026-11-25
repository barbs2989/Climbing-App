// Build the IC3 corrections: two live rack strings that state something their page does not (found by the
// IC3 retro numeric re-check, 2026-11-24). Guarded SQL (old value in WHERE) + a ledger-only enrich:apply batch.
import fs from "node:fs";
const D = (process.env.PREV_BATCH_DIR_IC3 || ".") + "/";
const out = process.argv[2];
const P = JSON.parse(fs.readFileSync(D + "prose.json", "utf8"));
const S = Object.fromEntries(JSON.parse(fs.readFileSync(D + "routes.json", "utf8")).routes.map((r) => [r.id, r]));
const F = JSON.parse(fs.readFileSync(D + "facts-verified.json", "utf8"));
const fixes = [
  { id: "ut_the_schoolmaster", cut: ", and about 12 quickdraws for the last pitch", with: "",
    why: "The page gives no quickdraw count; the retro re-check found '~12 quickdraws for last pitch' nowhere on it." },
  { id: "ut_left_affair", cut: ", a yellow TCU at the roof", with: "",
    why: "The page does not mention a yellow TCU at the roof (retro re-check)." },
];
const q = (s) => "$q$" + s + "$q$";
const sql = ["-- IC3 corrections (2026-11-24): two live racks stated a fact their page does not. Old value in every WHERE.", "begin;", ""];
const rollback = [], batch = {};
for (const f of fixes) {
  const old = P[f.id].detailed_rack;
  if (!old.includes(f.cut)) throw new Error(`${f.id}: cut text not found`);
  const now = old.replace(f.cut, f.with);
  sql.push(`-- ${f.why}`, `update routes set detailed_rack = ${q(now)} where id = '${f.id}' and detailed_rack = ${q(old)};`, "");
  rollback.push({ table: "routes", id: f.id, column: "detailed_rack", restore: old, applied: now });
  batch[f.id] = { area: S[f.id].area_id, ledger: [{ field: "detailed_rack", value: now, method: "single-source", level: "unconfirmed",
    evidence: [{ url: F[f.id].url, fact: "protection section (corrected after retro re-check)", retrieved_at: "2026-11-24" }] }],
    review: { sources: [F[f.id].url] } };
  console.log(f.id, "\n  was:", old, "\n  now:", now);
}
sql.push("commit;");
fs.writeFileSync(`${out}/batch-ic3-corrections.sql`, sql.join("\n") + "\n");
fs.writeFileSync(`${out}/batch-ic3-corrections.json`, JSON.stringify(batch, null, 1) + "\n");
fs.writeFileSync(`${out}/batch-ic3-corrections-rollback.json`, JSON.stringify(rollback, null, 1) + "\n");
