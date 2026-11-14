// One-off: rewrite the grade wording of PARTNER REQUIREMENTS on the routes audit:partner-grade
// flagged and the research in audits/partner-grade/proposals{A,B}.json judged wrong (2026-10-30).
// Only experienceLevel / requiredSkills change; any other key differing aborts. Compare-and-set:
// a row whose partner_requirements changed since rows-before.json was read is skipped. Paced by
// patchRow; each write is read back. `--dry` prints without writing.
import { readFileSync, writeFileSync } from "node:fs";
import { requireServiceKey, selectAll, patchRow } from "../lib/supabase-env.mjs";

const D = new URL("../../audits/partner-grade/", import.meta.url);
const read = (f) => JSON.parse(readFileSync(new URL(f, D), "utf8"));
const rows = read("rows-before.json");
const P = [...read("proposalsA.json"), ...read("proposalsB.json")].filter(p => p.verdict === "fix");

// Wording the research proposed that reads badly, or still names two steps of margin.
const TWEAK = {
  wa_sherpa_peak_west_ridge: ["short 5.5 rock leading with gear placement; the crack out of the cave is rated lower but often feels harder", "short 5.5 rock leading with gear placement; the crack out of the cave feels harder than its grade"],
  wa_mount_torment_south_ridge: ["solid 5.5 traditional multi-pitch leading on alpine rock (5.6 at the crag gives margin)", "solid 5.5 traditional multi-pitch leading on alpine rock"],
  wa_south_headwall: ["Modest technical bar: solid 5.8 trad leader, with 5.9 at the crag as margin", "Solid 5.8 trad leader; 5.9 at the crag gives margin"],
};
const swap = (pr, from, to) => {
  const s = JSON.stringify(pr), f = JSON.stringify(from).slice(1, -1);
  if (!s.includes(f)) throw new Error("tweak miss: " + from);
  return JSON.parse(s.replace(f, JSON.stringify(to).slice(1, -1)));
};

const DRY = process.argv.includes("--dry");
const key = requireServiceKey();
const live = await selectAll("routes", "id,partner_requirements", `id=in.(${P.map(p => p.id).join(",")})`, { key, pageSize: 100 });
const rollback = [];
let n = 0;
for (const p of P) {
  const next = TWEAK[p.id] ? swap(p.new_partner_requirements, ...TWEAK[p.id]) : p.new_partner_requirements;
  const was = rows.find(r => r.id === p.id).partner_requirements;
  const now = live.find(r => r.id === p.id)?.partner_requirements;
  if (JSON.stringify(now) === JSON.stringify(next)) { console.log("already", p.id); continue; }
  if (JSON.stringify(now) !== JSON.stringify(was)) { console.log("SKIP changed since read:", p.id); continue; }
  for (const k of new Set([...Object.keys(was), ...Object.keys(next)]))
    if (!["experienceLevel", "requiredSkills"].includes(k) && JSON.stringify(was[k]) !== JSON.stringify(next[k])) throw new Error(`${p.id}: ${k} changed`);
  rollback.push({ id: p.id, partner_requirements: was });
  if (DRY) { console.log("DRY", p.id, "|", next.experienceLevel); continue; }
  const out = await patchRow("routes", p.id, { partner_requirements: next });
  if (JSON.stringify(out.partner_requirements) !== JSON.stringify(next)) throw new Error("read-back mismatch " + p.id);
  n++; console.log("wrote", p.id);
}
if (!DRY && rollback.length) writeFileSync(new URL(`../rollback-partner-grade-${Date.now()}.json`, import.meta.url), JSON.stringify(rollback, null, 1));
console.log(DRY ? `dry: ${rollback.length} to write` : `wrote ${n}`);
