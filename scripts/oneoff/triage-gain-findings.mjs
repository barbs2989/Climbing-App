#!/usr/bin/env node
/* Triage what audit:gain still reports, BEFORE anyone researches 34 routes one at a time.
 *
 * The audit's own header records three narrowings that were built and rejected, and none of them
 * is what this asks. It asks two questions nothing has:
 *
 *   1. HOW MANY ARE ONE FACT REPEATED? Routes sharing a peak AND a trailhead are making the same
 *      claim about the same walk. Four Hannegan Pass crag routes all store gain_ft 1200 against
 *      the same 3,100 -> 5,000 pins; that is one number to establish, not four.
 *   2. IS THE WRONG COLUMN `gain_ft` AT ALL? A ROPED route storing ZERO pitches gets no climbing
 *      credit, so it can be reported here when the thing actually missing is its pitch count.
 *      CLAUDE.md records that exact defect class — add-a-climb's pitch control stored NOTHING for
 *      multi-pitch routes, and the seed path made every one of them 1 pitch. Repairing the gain of
 *      a route whose pitches are missing is the
 *      "changing which record wins leaves the neighbouring field behind" shape.
 *
 * REPORT ONLY. It picks nothing and writes nothing: which column is wrong is a judgement that
 * needs a source, and this exists to say how many sources are actually needed.
 */
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";
import { execFileSync } from "node:child_process";
import path from "node:path";

const ROOT = path.resolve(new URL("../..", import.meta.url).pathname);
const AUDIT = path.join(ROOT, "scripts", "audit-gain-vs-waypoints.mjs");

/* Run the audit rather than restating its rule. A second copy of the comparison would agree with
   itself whatever the audit did, which is the whole question. */
const findings = JSON.parse(execFileSync("node", [AUDIT, "--json", "--limit", "999"], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 }));
if (!findings.length) { console.error("FAIL — the audit reported nothing. Triage of an empty list proves nothing."); process.exit(1); }

const k = anonKey();
const ids = findings.map((f) => f.id);
const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,area_id,discipline,pitches,gain_ft&id=in.(${ids.join(",")})`, { headers: headers(k) });
if (!res.ok) { console.error(`read failed ${res.status}`); process.exit(1); }
const rows = await res.json();
if (rows.length !== findings.length) console.error(`NOTE: read ${rows.length} rows for ${findings.length} findings`);
const meta = new Map(rows.map((r) => [r.id, r]));

/* A roped discipline is one where pitches are the unit of climbing. Mountaineering and scrambling
   legitimately store zero — that is unroped ground, and the app credits them nothing for time
   either — so a zero there is not evidence of anything. */
const ROPED = new Set(["alpine", "trad", "sport", "aid", "ice", "mixed"]);

/* ALREADY ADJUDICATED, in the audit's OWN header, and reported anyway because the reasons live in
   a comment rather than in the output. These are the top TWO findings by magnitude, so a reader
   opening this list starts on two rows that need no source at all.
   The fix is NOT to widen `--start-tol` past the 541 ft they miss by — that is fitting a
   threshold to the answer it is meant to judge. The correct narrowing is the audit's rejected #3
   (excuse by CUMULATIVE ascent rather than net rise), and it stays rejected: it needs the
   waypoint list to be in ORDER, and `audit:waypoint-order` records that only 483 of 1,015 routes
   carrying waypoints can be sorted at all, so reading the stored sequence as a route would
   produce confident nonsense on the other half.
   A stale entry FAILS, so this cannot rot into a description of findings that are gone. */
const KNOWN = new Map([
  ["wa_austera_peak", "audit header, rejected narrowing #2/#3: gain is measured from the route's own 'Eldorado (East Ridge) camp' — dist_km 4.5 matches 4.51 km from it to ten metres — and the convention test misses it by 541 ft because it compares a CUMULATIVE gain against a NET rise (camp 7,600 -> col 7,900 -> crevasses 7,700 -> summit 8,339 is 939 ft of ascent against a net 739)."],
  ["wa_austera_peak_southwest_ridge", "same peak, same camp, same 1,280 ft — the second half of the pair the audit header describes."],
]);

/* KEY ON THE PEAK ALONE, NEVER ON THE TRAILHEAD NAME. The first version keyed on `area_id` plus
   the trailhead's rendered name and reported 1 cluster of 3 against a true 4 — the two Austera
   routes are one peak from one road and their pins are spelled "Eldorado Creek / Cascade River
   Road TH" and "Eldorado Creek trailhead (Cascade River Road mile 20)", so a name key split them.
   A name is not an identity, and a clustering key decides what a detector can see. Where a peak
   genuinely has two approaches the trailhead elevations differ, and the printout shows them, so
   nothing is hidden by grouping on the peak. */
const clusters = new Map();
for (const f of findings) {
  const m = meta.get(f.id) || {};
  const key = m.area_id || "?";
  if (!clusters.has(key)) clusters.set(key, []);
  clusters.get(key).push({ f, m });
}

/* A PEAK IS NOT AN APPROACH. Three Rainier routes share `wa_mount_rainier` and start at Paradise,
   Mowich Lake and White River — three different walks, so they are three facts, not one. Only a
   cluster whose low pins agree is one number to establish; the rest are context and are printed
   as such. Over-claiming a cluster is how a reader gets sent to sweep unrelated routes. */
const LOW_TOL_FT = 200;
let sharedRows = 0, singles = 0;
const shared = [], spread = [], alone = [];
for (const [key, members] of clusters) {
  if (members.length < 2) { singles++; alone.push(members[0]); continue; }
  const lows = members.map((x) => Number(String(x.f.lo).match(/(-?\d+)ft/)?.[1] ?? NaN));
  const sameStart = lows.every((n) => Number.isFinite(n)) && (Math.max(...lows) - Math.min(...lows) <= LOW_TOL_FT);
  if (sameStart) { shared.push([key, members]); sharedRows += members.length; }
  else { spread.push([key, members]); singles += members.length; for (const m of members) alone.push(m); }
}

console.log(`\n=== triage of audit:gain's ${findings.length} surviving findings ===\n`);

const reported = new Set(findings.map((f) => f.id));
const staleKnown = [...KNOWN.keys()].filter((id) => !reported.has(id));
const liveKnown = [...KNOWN.keys()].filter((id) => reported.has(id));
console.log(`ALREADY ADJUDICATED — ${liveKnown.length} finding(s) need NO source`);
console.log(`  reported by the audit, and settled in its own header. Do not research these.\n`);
for (const id of liveKnown) console.log(`    ${id}\n      ${KNOWN.get(id)}\n`);
if (staleKnown.length) {
  console.log(`  STALE — declared here and no longer reported. Remove the entry:`);
  for (const id of staleKnown) console.log(`    ${id}`);
  console.log("");
  process.exitCode = 1;
}

console.log(`ONE FACT REPEATED — ${shared.length} cluster(s) covering ${sharedRows} findings`);
console.log(`  same peak AND the same starting elevation: one walk, so one number to establish\n`);
shared.sort((a, b) => b[1].length - a[1].length);
for (const [area, members] of shared) {
  const gains = [...new Set(members.map((x) => x.f.gain))];
  const los = [...new Set(members.map((x) => x.f.lo))];
  console.log(`  ${area}`);
  console.log(`    ${members.length} routes, gain_ft ${gains.join(" / ")}${gains.length === 1 ? "  (identical — ONE number to establish)" : "  (they disagree with EACH OTHER too)"}`);
  for (const lo of los) console.log(`      low pin: ${lo}`);
  for (const x of members) console.log(`      short ${String(x.f.shortBy).padStart(5)}  ${String(x.m.pitches ?? 0).padStart(3)}p  ${x.f.id}  [${x.f.disc}]`);
  console.log("");
}

if (spread.length) {
  console.log(`SAME PEAK, DIFFERENT APPROACHES — ${spread.length} cluster(s), counted as singletons`);
  console.log(`  context only: these share a summit and start from different roads, so they are`);
  console.log(`  separate walks and separate numbers. Do NOT sweep them together.\n`);
  for (const [area, members] of spread) {
    console.log(`  ${area}`);
    for (const x of members) console.log(`      short ${String(x.f.shortBy).padStart(5)}  gain ${String(x.f.gain).padStart(5)}  from ${x.f.lo}   ${x.f.id}`);
    console.log("");
  }
}

const ropedNoPitch = findings.filter((f) => {
  const m = meta.get(f.id) || {};
  return ROPED.has(String(f.disc || "").toLowerCase()) && !(m.pitches > 0);
});
console.log(`WRONG COLUMN? — ${ropedNoPitch.length} finding(s) are a ROPED route storing ZERO pitches`);
console.log(`  these get no climbing credit, so the gain may be fine and the PITCH COUNT missing.`);
console.log(`  do not repair gain_ft here without establishing the pitch count first.\n`);
for (const f of ropedNoPitch) console.log(`    short ${String(f.shortBy).padStart(5)}  ${f.id}  [${f.disc}]  hi = ${f.hi}`);

console.log(`\nSINGLETONS — ${singles} finding(s) with no sibling on the same peak+trailhead`);
console.log(`  each needs its own source. This is the number that is actually per-route research.\n`);
alone.sort((a, b) => b.f.shortBy - a.f.shortBy);
for (const x of alone) console.log(`    short ${String(x.f.shortBy).padStart(5)}  ${String(x.m.pitches ?? 0).padStart(3)}p  ${x.f.id}  [${x.f.disc}]`);

/* THE NUMBER THAT MATTERS IS SOURCES, NOT ROWS. A cluster is one number however many routes carry
   it, an adjudicated row needs none, and a roped route with no pitch count may need a pitch count
   instead of a gain. Reporting "34 findings" as the size of the job overstates it. */
const knownIds = new Set(liveKnown);
const clusterNumbers = shared.filter(([, ms]) => !ms.every((x) => knownIds.has(x.f.id))).length;
const singletonSources = alone.filter((x) => !knownIds.has(x.f.id)).length;
console.log(`\n=== how many SOURCES this actually needs ===`);
console.log(`  ${findings.length} findings`);
console.log(`  - ${liveKnown.length} already adjudicated in the audit's own header`);
console.log(`  = ${clusterNumbers} number(s) from the clusters + ${singletonSources} from the singletons`);
console.log(`  ~ ${clusterNumbers + singletonSources} distinct facts to establish, of which`);
console.log(`    ${ropedNoPitch.length} may be a PITCH COUNT rather than a gain — check that column first.`);
console.log(`\nReport only — nothing was changed, and no column was chosen.`);
