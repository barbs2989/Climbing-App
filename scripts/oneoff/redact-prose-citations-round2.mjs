#!/usr/bin/env node
// Round 2 of the source-attribution sweep, and it exists to make one point: THE FIRST PASS'S
// PATTERN WAS THE LIMIT, NOT THE DATA.
//
// Round 1 (`redact-road-access-citations.mjs`) declared 33 flagged values and repaired 32. Widening
// the sourcing-act pattern afterwards — adding a counted/qualified plural ("multiple sources") and
// sources doing something ("sources describe"), neither of which round 1 matched — immediately
// surfaced FIVE MORE on four routes, one of them a waypoint note. A deny-list of publisher names is
// beaten by one more phrasing, exactly as `a-deny-list-detector-is-defeated-by-one-more-adjective`
// records. Treat `audit:prose-citations`' count as a floor.
//
// The word "source" on its own is useless here, which is why round 1 could not simply have been
// broader: waypoint notes say "reliable water source" and "Source Lake" — a real place in the
// Alpental valley — so a bare /source/i returns 45 WA notes of which 44 are water and place names.
//
// Same contract as round 1: every edit is an exact (find -> replace) pair, refused unless `find`
// occurs EXACTLY ONCE in the live value. Dry run by default; `--apply` writes, then re-reads and
// reconciles. Land-manager references and phone numbers are never touched.
import { loadEnv, SUPABASE_URL, requireServiceKey, anonKey, headers, patchRow } from "../lib/supabase-env.mjs";

loadEnv();
const APPLY = process.argv.includes("--apply");

// id, column, sub-key (or a waypoint index), find, replace, why.
const EDITS = [
  ["wa_flora_mountain_southwest_slope", "road", "driveNote", "($5 fare per trip reports)", "($5 fare)", "the fare is the fact; who reported it is not"],
  ["wa_flora_mountain_southwest_slope", "access", "fees", "costs $5 one-way per trip reports,", "costs $5 one-way,", "both fares and the separate ferry charge stay"],
  ["wa_windy_peak_trail", "road", "status", " (described by multiple sources as good gravel/dirt road)", "", "the parenthetical only restates 'generally well-maintained'; the washboard warning stays"],
  ["wa_wolframite_mountain_scramble", "road", "status", " per recent trip reports", "", "leaves: no 4WD required"],
];
// A waypoint note lives in an array, so the whole array is written back with one element's note
// replaced. Index AND find must both match, so a reordered array cannot silently edit the wrong pin.
const WP_EDITS = [
  ["wa_bryant_peak_southeast_slopes", 0,
   "multiple sources describe the Denny Creek Trail -> Hemlock Pass -> ridge -> SE talus field approach used specifically for this Southeast Slopes route.",
   "The Denny Creek Trail -> Hemlock Pass -> ridge -> SE talus field approach is the one used for this Southeast Slopes route.",
   "the approach sequence is the content and survives verbatim"],
];

const ids = [...new Set([...EDITS.map(e => e[0]), ...WP_EDITS.map(e => e[0])])];
const url = `${SUPABASE_URL}/rest/v1/routes?select=id,road,access,waypoints&id=in.(${ids.join(",")})`;
const res = await fetch(url, { headers: headers(APPLY ? requireServiceKey() : anonKey()) });
if (!res.ok) { console.error(`FAIL — read ${res.status}: ${await res.text()}`); process.exit(1); }
const rows = await res.json();
if (rows.length !== ids.length) { console.error(`FAIL — asked for ${ids.length} routes, got ${rows.length}.`); process.exit(1); }
const byId = new Map(rows.map(r => [r.id, r]));

const planned = new Map();
let bad = 0;
const plan = (id, col, obj) => { const k = id + "\0" + col; if (!planned.has(k)) planned.set(k, { id, col, obj }); return planned.get(k).obj; };

for (const [id, col, key, find, repl, why] of EDITS) {
  const row = byId.get(id);
  const cur = row[col] && typeof row[col] === "object" ? row[col][key] : null;
  if (typeof cur !== "string") { console.error(`FAIL  ${id} ${col}.${key} — not a string`); bad++; continue; }
  const n = cur.split(find).length - 1;
  if (n !== 1) { console.error(`FAIL  ${id} ${col}.${key} — find matched ${n} time(s), must be exactly 1`); bad++; continue; }
  const next = cur.replace(find, repl).replace(/\s{2,}/g, " ").trim();
  plan(id, col, { ...row[col] })[key] = next;
  console.log(`\n${id}  ${col}.${key}\n  why: ${why}\n  -   ${cur}\n  +   ${next}`);
}
for (const [id, idx, find, repl, why] of WP_EDITS) {
  const row = byId.get(id);
  const wps = row.waypoints;
  if (!Array.isArray(wps) || !wps[idx] || typeof wps[idx].note !== "string") { console.error(`FAIL  ${id} waypoints[${idx}].note — missing`); bad++; continue; }
  if (wps[idx].note !== find) { console.error(`FAIL  ${id} waypoints[${idx}].note — does not match the declared text exactly`); bad++; continue; }
  const copy = wps.map((w, i) => i === idx ? { ...w, note: repl } : w);
  plan(id, "waypoints", copy);
  console.log(`\n${id}  waypoints[${idx}].note\n  why: ${why}\n  -   ${find}\n  +   ${repl}`);
}
if (bad) { console.error(`\n${bad} problem(s). Nothing was written.`); process.exit(1); }

console.log(`\n${EDITS.length + WP_EDITS.length} edit(s) across ${planned.size} column(s) on ${ids.length} route(s).`);
if (!APPLY) { console.log("DRY RUN — re-run with --apply to write."); process.exit(0); }

for (const { id, col, obj } of planned.values()) await patchRow("routes", id, { [col]: obj });
console.log(`wrote ${planned.size} column(s). Re-reading to reconcile…`);
const after = new Map((await (await fetch(url, { headers: headers(requireServiceKey()) })).json()).map(r => [r.id, r]));
let wrong = 0;
for (const [id, col, key, find] of EDITS) { const v = after.get(id)?.[col]?.[key]; if (typeof v !== "string" || v.includes(find)) { console.error(`NOT APPLIED  ${id} ${col}.${key}`); wrong++; } }
for (const [id, idx, find] of WP_EDITS) { const v = after.get(id)?.waypoints?.[idx]?.note; if (typeof v !== "string" || v === find) { console.error(`NOT APPLIED  ${id} waypoints[${idx}].note`); wrong++; } }
console.log(wrong ? `${wrong} edit(s) did not land.` : `verified: all ${EDITS.length + WP_EDITS.length} edits are live.`);
process.exitCode = wrong ? 1 : 0;
