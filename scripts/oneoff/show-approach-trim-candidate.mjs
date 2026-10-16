// Print everything needed to JUDGE one proposed approach trim, in one place.
//
// The tail lister says a trim is safe to EXPRESS — contiguous, near-verbatim, leaving finished
// prose. It cannot say the trim is CORRECT, and reading the first batch showed why: many
// structurally-eligible cuts are hazard notes, alternative lines or camping info that the
// enrichment copied indiscriminately, not climbing description that ran past the base. One is
// explicitly about "the upper APPROACH gullies".
//
// So this shows the full cut text against the full climbing_route, and the decision stays with
// a person.
//
//   node scripts/oneoff/show-approach-trim-candidate.mjs <id> [<id> ...]
import { SUPABASE_URL, headers, anonKey, requireServiceKey } from "../lib/supabase-env.mjs";

const key = (() => { try { return requireServiceKey(); } catch { return anonKey(); } })();
const ids = process.argv.slice(2);
if (!ids.length) { console.error("give route ids"); process.exit(1); }

const res = await fetch(
  `${SUPABASE_URL}/rest/v1/routes?select=id,name,discipline,approach,climbing_route&id=in.(${ids.join(",")})`,
  { headers: headers(key) });
if (!res.ok) throw new Error(`routes -> ${res.status}`);
const rows = JSON.parse(await res.text());
if (!rows.length) throw new Error("zero rows read — a clean answer here would be a false pass");

for (const r of rows) {
  console.log(`\n${"=".repeat(78)}\n${r.id} — ${r.name}  [${r.discipline}]`);
  console.log(`\n--- climbing_route sections ---`);
  for (const v of [].concat(r.climbing_route || [])) {
    if (v && typeof v === "object") console.log(`  ${v.n != null ? v.n + ". " : ""}${v.label || "(no label)"}`);
  }
  console.log(`\n--- approach, in full ---\n${r.approach}`);
}
