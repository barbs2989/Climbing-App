// A packing list rendered as bullets asserts "carry this". An entry phrased as a NEGATION
// therefore advertises exactly the gear the route says to leave behind — the defect
// CLAUDE.md records for `rack` (RACK_NEG), asked of `what_to_bring`, which nothing has
// checked. Read-only; this is a question, not a fix.
//
// THE ANSWER, measured 2026-08-19 over 1,031 routes and 4,895 entries: 11 flagged, and on
// reading them **the negated-gear defect does not exist in this column**. Nine are ordinary
// carry instructions that happen to contain a negation — "Gaiters and gear you do not mind
// soaking on the bushwhack", "Insulated layers and shell - half the gully never sees sun",
// "headlamp — long days are common even for parties that don't get lost". The two that
// really do say leave-it-behind ("Approach shoes unnecessary beyond a short roadside walk",
// on the two Moss routes) say so IN the bullet, so a climber reads the sentence rather than
// the implication. One more (wa_cordwood, "Do not climb until you have personally assessed
// the loose blocks") is a hazard note filed in the gear list — misplaced, not misleading.
//
// So this is a recorded NEGATIVE RESULT, not a backlog. `rack` needed RACK_NEG because it
// is fed to a keyword matcher that reads a word list; `what_to_bring` is rendered verbatim
// as prose bullets, and prose survives a negation intact. Do not port RACK_NEG here and do
// not "sweep" these 11 — nine of them are correct copy.
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";

const NEG = /\bnot worth\b|\bnot needed\b|\bnot necessary\b|\bnot required\b|\bno need\b|\bunnecessary\b|\brarely\b|\bseldom\b|\bnever\b|\bdon'?t\b|\bdo not\b|\bleave (?:the|your)?\s*\w+\s*(?:at home|behind|in the car)\b|\bskip\b|\bno (?:rope|helmet|rack|screws|crampons|axe)\b/i;

const k = anonKey();
async function readAll() {
  const out = []; let last = "";
  for (;;) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,name,what_to_bring&what_to_bring=not.is.null&id=gt.${encodeURIComponent(last)}&order=id.asc&limit=1000`, { headers: headers(k) });
    if (!res.ok) throw new Error(`read failed ${res.status}`);
    const rows = await res.json();
    if (!rows.length) break;
    out.push(...rows); last = rows[rows.length - 1].id;
    if (rows.length < 1000) break;
  }
  return out;
}
const rows = await readAll();
if (!rows.length) { console.error("FAIL — 0 rows"); process.exit(1); }

let n = 0, items = 0;
for (const r of rows) {
  const wb = Array.isArray(r.what_to_bring) ? r.what_to_bring.filter(Boolean) : [];
  items += wb.length;
  const bad = wb.filter((x) => NEG.test(String(x)));
  if (!bad.length) continue;
  n++;
  console.log(`\n${r.id} — ${r.name}`);
  for (const b of bad) console.log(`   • ${b}`);
}
console.log(`\n${rows.length} routes · ${items} packing-list entries · ${n} route(s) with a negated entry`);
console.log(n ? "Each of these renders as a bullet telling the climber to carry it." : "ok — no packing-list entry tells the climber to carry what the route says to leave.");
