// One-off, second pass of fix-partner-grade.mjs (2026-10-30): the three rows audit:partner-grade
// still flagged once it counted a route's own PITCH grades as its crux. Each edit swaps one exact
// string inside partner_requirements; a row whose string is not there is skipped (compare-and-set).
// Rollback written beside the other rollbacks. `--dry` prints without writing.
import { writeFileSync } from "node:fs";
import { requireServiceKey, selectAll, patchRow } from "../lib/supabase-env.mjs";

const EDITS = {
  // Crux pitch is 5.11+/5.12-; "up to 5.11" told a 5.11a leader they were ready.
  // (first run, applied: "Confident trad leading up to 5.11" → "...through 5.11+ for a short, well-protected crux; the rest goes at 5.10 to 5.11a")
  // Second run: the crux pitch reads 5.11+/5.12-, so name the slash grade (keep the higher).
  wa_colchuck_balanced_rock_west_face: [["Confident trad leading through 5.11+ for a short", "Confident trad leading through 5.11+/5.12- for a short"]],
  // The A0 option was in a separate clause; say on the same line how the 5.11 sections are passed.
  wa_south_early_winter_spire_direct_east_buttress: [["trad leading 5.9+ crack and face terrain (or 5.11 free if avoiding A0)", "trad leading 5.9+ crack and face terrain with the short 5.11 sections aided at A0 (or led free at 5.11)"]],
  // Rated 5.0 almost everywhere, with a couple of 5.4 moves: say that, not a flat 5.4.
  wa_sharkfin_tower_southeast_ridge: [["Roped/simul-climbing on moderate (5.4) exposed alpine rock", "Roped/simul-climbing on exposed 5.0 alpine rock, with a couple of harder moves near 5.4"]],
};

const DRY = process.argv.includes("--dry");
const key = requireServiceKey();
const live = await selectAll("routes", "id,partner_requirements", `id=in.(${Object.keys(EDITS).join(",")})`, { key, pageSize: 100 });
const rollback = [];
let n = 0;
for (const [id, pairs] of Object.entries(EDITS)) {
  const was = live.find(r => r.id === id)?.partner_requirements;
  if (!was) { console.log("SKIP missing", id); continue; }
  let s = JSON.stringify(was), ok = true;
  for (const [from, to] of pairs) {
    const f = JSON.stringify(from).slice(1, -1);
    if (s.split(f).length !== 2) { ok = false; break; }
    s = s.replace(f, JSON.stringify(to).slice(1, -1));
  }
  if (!ok) { console.log("SKIP text not found once:", id); continue; }
  const next = JSON.parse(s);
  rollback.push({ id, partner_requirements: was });
  if (DRY) { console.log("DRY", id); continue; }
  const out = await patchRow("routes", id, { partner_requirements: next });
  if (JSON.stringify(out.partner_requirements) !== JSON.stringify(next)) throw new Error("read-back mismatch " + id);
  n++; console.log("wrote", id);
}
if (!DRY && rollback.length) writeFileSync(new URL(`../rollback-partner-grade-2-${Date.now()}.json`, import.meta.url), JSON.stringify(rollback, null, 1));
console.log(DRY ? `dry: ${rollback.length} to write` : `wrote ${n}`);
