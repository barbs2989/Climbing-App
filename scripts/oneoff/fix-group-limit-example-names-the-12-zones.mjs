// A worked example that names the two zones which are the exception to the rule it illustrates.
//
// Dozens of WA rows carry: "Group size capped at 6 in off-trail cross-country zones (which includes
// Boston Basin/Eldorado approaches; 12 in on-trail corridors)." The number 6 is right for most zones.
// The EXAMPLE is not: Boston Basin and Eldorado are two of the eleven zones that get 12.
//
// READ OFF THE AUTHORITATIVE NPS TABLE THIS SESSION, not from a summary and not from a report.
// nps.gov/noca/planyourvisit/cross-country-zones.htm enumerates every zone with its maximum party
// size, and the rows read verbatim: "Boston Basin 12 6" and "Eldorado 12 6". The page's own
// introduction says "Most zones allow only 6 people per party; however, some of the most easily
// accessible zones allow 12" — so the sentence has picked, as its illustration of the 6, two of the
// most prominent members of the 12.
//
// THIS IS A DIFFERENT REPAIR FROM fix-nps-cross-country-group-limit.mjs, and the distinction is what
// makes it worth doing separately. That script corrected the stored NUMBER on 29 rows that are IN a
// 12-person zone, and deliberately left the boilerplate elsewhere alone on the reasoning that "6 is
// probably right for them; the boilerplate's reach is not the defect's reach". That reasoning was
// about the number and it still holds. The parenthetical is a different claim: "Boston Basin and
// Eldorado are 6-person zones" is false wherever it appears, on a Ragged Ridge row as much as on an
// Eldorado one.
//
// THE REPAIR IS A DELETION, NOT A REWRITE. Only the false example is removed; the rule around it is
// untouched, because the rule is correct. Two variants exist and the second keeps its true half —
// the Picket zones really are 6-person (the same table lists Challenger 6, Crescent Creek 6, Blum 6,
// Despair 6), so "most Picket Range approaches" survives and only "Boston Basin/Eldorado" goes.
//
// Nothing is authored. The script asserts the result is the original with exactly the named span
// removed, so it cannot rewrite the sentence, and it refuses if a substitution would leave malformed
// punctuation.
//
// Read-only by default. Pass --apply to write.
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
requireServiceKey();

// find -> replace. Each removes only the false zone names.
const EDITS = [
  ["(which includes most Picket Range/Boston Basin/Eldorado approaches; ", "(which includes most Picket Range approaches; "],
  ["(which includes Boston Basin/Eldorado approaches; ", "("],
];
const STILL_WRONG = /boston basin\/eldorado/i;

const rows = await selectAll("routes", "id,access", "id=like.wa_*", { pageSize: 1000 });
console.log(`WA routes read: ${rows.length}`);
if (rows.length < 5000) { console.error("SHORT READ — refusing to act on a partial read"); process.exit(1); }

const plan = [];
let carrying = 0;
for (const r of rows) {
  const a = r.access; if (!a || typeof a !== "object") continue;
  for (const [k, v] of Object.entries(a)) {
    if (typeof v !== "string" || !STILL_WRONG.test(v)) continue;
    carrying++;
    const hit = EDITS.find(([find]) => v.includes(find));
    if (!hit) { console.log(`  UNMATCHED SHAPE ${r.id}.${k}: ${JSON.stringify(v.slice(0, 160))}`); continue; }
    const [find, repl] = hit;
    if (v.split(find).length - 1 !== 1) { console.error(`REFUSING ${r.id}.${k}: the clause appears more than once`); process.exit(1); }
    const after = v.replace(find, repl);
    if (after.length >= v.length) { console.error(`REFUSING ${r.id}.${k}: the edit did not shorten the value`); process.exit(1); }
    if (STILL_WRONG.test(after)) { console.error(`REFUSING ${r.id}.${k}: the false names survive the edit`); process.exit(1); }
    if (/\(\s*;|;\s*\)|\(\s*\)/.test(after)) { console.error(`REFUSING ${r.id}.${k}: the edit leaves malformed punctuation`); process.exit(1); }
    plan.push({ id: r.id, k, from: v, to: after });
  }
}
if (!carrying) { console.log("nothing to do — no value names Boston Basin/Eldorado as a 6-person zone."); process.exit(0); }

console.log(`\nvalues naming Boston Basin/Eldorado as 6-person zones: ${carrying}`);
console.log(`  ...matching a known shape and repairable: ${plan.length}\n`);
const shapes = new Map();
for (const p of plan) shapes.set(p.to.slice(0, 120), (shapes.get(p.to.slice(0, 120)) || 0) + 1);
for (const [s, n] of shapes) console.log(`  ${String(n).padStart(3)} x  ${JSON.stringify(s)}`);
console.log(`\nexample:\n  from ${JSON.stringify(plan[0].from.slice(0, 190))}\n  to   ${JSON.stringify(plan[0].to.slice(0, 190))}`);
if (!APPLY) { console.log("\nDRY RUN — pass --apply to write."); process.exit(0); }

let wrote = 0, skipped = 0;
const live = new Map((await selectAll("routes", "id,access", "id=like.wa_*", { pageSize: 1000 })).map(r => [r.id, r]));
for (const p of plan) {
  const cur = live.get(p.id)?.access;
  if (!cur || cur[p.k] !== p.from) { console.log(`  SKIPPED ${p.id}: the row has changed since it was read`); skipped++; continue; }
  await patchRow("routes", p.id, { access: { ...cur, [p.k]: p.to } });
  wrote++;
}
console.log(`\nwrote ${wrote}, skipped ${skipped}`);
const after = await selectAll("routes", "id,access", "id=like.wa_*", { pageSize: 1000 });
let left = 0;
for (const r of after) for (const v of Object.values(r.access || {})) if (typeof v === "string" && STILL_WRONG.test(v)) left++;
console.log(`values still naming Boston Basin/Eldorado as 6-person zones: ${left}`);
