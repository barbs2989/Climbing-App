// Three packing-list entries that are not gear. Each is removed only after checking the row
// itself, because the fact must survive somewhere before the entry can go.
//
// The two Monte Cristo ones are not merely misfiled, they are WRONG: both say the approach is
// "a short roadside walk" while the route's own approach is a FOUR MILE walk of closed
// railroad grade from the Barlow Pass gate. The phrasing matches The Dikes, a southeast-
// Washington basalt area whose approaches genuinely are "very short and roadside" — the
// cross-region duplicate-field-value fingerprint audit:identity describes. Rendered as a
// bullet in WHAT TO BRING, it tells somebody they can walk four miles in rock shoes.
//
// The Cordwood one is a safety instruction sitting in a packing list. It is stated in fuller
// form in `hazards` ("assess in person before attempting"), in `watch_out`, and in `beta`, so
// dropping it from the packing list loses nothing.
//
// Measured scope first: of 1,027 WA routes carrying a packing list, 7 claim a trivial
// approach and only these 2 are contradicted by their own prose — the other 5 are genuinely
// roadside crags (Steeple Rock off Obstruction Point Road, and two Mt Baker Highway cliffs).
// See probe-roadside-gear-contamination.mjs.
//
// --apply to write; dry by default.
import { SUPABASE_URL, anonKey, headers, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");

/* `drop` matches the entry EXACTLY as stored. An exact match cannot silently take a
   neighbouring entry the way a substring or a regex could, and if the row has been edited
   since this was written the match fails and the route is skipped rather than half-repaired. */
const FIXES = [
  {
    id: "wa_moss_out_for_harambe",
    drop: ["Approach/hiking shoes are unnecessary beyond a short roadside walk"],
    why: "false — this route's own approach is a 4-mile walk from the Barlow Pass gate",
  },
  {
    id: "wa_you_moss_be_joking",
    drop: [
      "Approach shoes unnecessary beyond a short roadside walk",
      "Awareness this line is often climbed as an access/link pitch rather than for quality",
    ],
    why: "first is false (4-mile walk-in); second is not gear and is stated verbatim in overview, watch_out and beta",
  },
  {
    id: "wa_cordwood",
    drop: ["Do not climb until you have personally assessed the loose blocks reported on the right side"],
    why: "a safety instruction, not gear — stated in fuller form in hazards, watch_out and beta",
  },
];

const k = anonKey();
const ids = FIXES.map((f) => f.id);
const rows = await (await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,name,what_to_bring&id=in.(${ids.join(",")})`, { headers: headers(k) })).json();
if (rows.length !== ids.length) { console.error(`expected ${ids.length} rows, got ${rows.length} — refusing`); process.exit(1); }

const planned = [];
for (const f of FIXES) {
  const row = rows.find((r) => r.id === f.id);
  const before = Array.isArray(row.what_to_bring) ? row.what_to_bring : [];
  const missing = f.drop.filter((d) => !before.includes(d));
  if (missing.length) { console.log(`SKIP ${f.id}: entry not present as written — already repaired or changed:\n   ${missing.join("\n   ")}`); continue; }
  const after = before.filter((e) => !f.drop.includes(e));
  /* An empty packing list is not an empty ARRAY: 400+ WA routes carry `null` there, which is
     the "no route-specific list" state the reader already handles. Writing [] would invent a
     third state for no reason. */
  const next = after.length ? after : null;
  planned.push({ ...f, before, after: next });
  console.log(`\n### ${f.id} — ${row.name}`);
  console.log(`    ${f.why}`);
  for (const d of f.drop) console.log(`    -  "${d}"`);
  console.log(`    ${before.length} entr${before.length === 1 ? "y" : "ies"} -> ${next ? next.length : "null (no route-specific list)"}`);
}

if (!planned.length) { console.log("\nnothing to do"); process.exit(0); }
if (!APPLY) { console.log(`\ndry run — ${planned.length} route(s) would change. Pass --apply to write.`); process.exit(0); }

for (const p of planned) await patchRow("routes", p.id, { what_to_bring: p.after });

/* Re-read and reconcile: a 200 is not evidence the data changed. */
const back = await (await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,what_to_bring&id=in.(${planned.map((p) => p.id).join(",")})`, { headers: headers(k) })).json();
let bad = 0;
for (const p of planned) {
  const got = back.find((r) => r.id === p.id);
  const g = got ? got.what_to_bring : undefined;
  const okNull = p.after === null && (g == null || (Array.isArray(g) && !g.length));
  const okArr = Array.isArray(p.after) && Array.isArray(g) && JSON.stringify(g) === JSON.stringify(p.after);
  if (!okNull && !okArr) { console.error(`VERIFY FAILED ${p.id}: ${JSON.stringify(g)}`); bad++; continue; }
  for (const d of p.drop) if (Array.isArray(g) && g.includes(d)) { console.error(`VERIFY FAILED ${p.id}: dropped entry is still present`); bad++; }
  console.log(`    verified ${p.id}: ${Array.isArray(g) ? `${g.length} entries` : "null"}`);
}
if (bad) process.exit(1);
console.log(`\n${planned.length} route(s) repaired and verified.`);
