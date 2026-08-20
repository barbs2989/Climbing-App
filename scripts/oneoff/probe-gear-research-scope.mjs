// What would "do online research" on gear actually cost, and what would it buy?
//
// The RACK box falls back to DISC_RACK when a route has no rack of its own, labelled "Typical …
// rack — not this route's own", so the honest-display half is already handled. The open question
// is how many routes would gain a REAL rack from research, and on how many of those the answer
// would even be knowable.
//
// Split by whether the route is technical enough for a rack to be a meaningful fact: a walk-up
// scramble has no rack, so an empty `gear` there is correct rather than missing. Read-only.
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";
const k = anonKey();

function leaves(v, out = []) {
  if (typeof v === "string") { if (v.trim()) out.push(v); return out; }
  if (Array.isArray(v)) { for (const x of v) leaves(x, out); return out; }
  if (v && typeof v === "object") { for (const x of Object.values(v)) leaves(x, out); return out; }
  return out;
}
async function readAll() {
  const out = []; let last = "";
  for (;;) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,discipline,pitches,gear,detailed_rack,pro_needs,what_to_bring&id=like.wa_*&id=gt.${encodeURIComponent(last)}&order=id.asc&limit=1000`, { headers: headers(k) });
    if (!res.ok) throw new Error(`read failed ${res.status}`);
    const rows = await res.json();
    if (!rows.length) break;
    out.push(...rows); last = rows[rows.length - 1].id;
    if (rows.length < 1000) break;
  }
  return out;
}
const rows = await readAll();
if (!rows.length) { console.error("FAIL — read 0 routes"); process.exit(1); }

/* A rack is a meaningful fact on a roped discipline. On a scramble or a walk-up an empty gear
   column is the CORRECT answer, so counting those as a gap would manufacture a backlog. */
const ROPED = new Set(["trad", "sport", "alpine", "ice", "mixed", "aid", "rock"]);
let roped = 0, ropedNoRack = 0, unroped = 0, unropedNoRack = 0, anyRack = 0;
for (const r of rows) {
  const rack = leaves(r.gear).length || leaves(r.detailed_rack).length || leaves(r.pro_needs).length;
  if (rack) anyRack++;
  if (ROPED.has(String(r.discipline || "").toLowerCase())) { roped++; if (!rack) ropedNoRack++; }
  else { unroped++; if (!rack) unropedNoRack++; }
}
console.log(`\n=== how big is the gear-research job? ===`);
console.log(`${rows.length} WA routes · ${anyRack} carry a rack of their own\n`);
console.log(`  ROPED disciplines (a rack is a real fact):   ${roped}`);
console.log(`     ... with NO rack recorded:               ${ropedNoRack}   <- the only genuine research target`);
console.log(`  unroped (scramble/walk-up/bouldering):       ${unroped}`);
console.log(`     ... with no rack, which is CORRECT:      ${unropedNoRack}`);
