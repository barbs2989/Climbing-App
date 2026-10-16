#!/usr/bin/env node
// A 4-pitch route cannot be 79 feet long.
//
// `routes.length_m` is the climb's length. Eight WA routes store a value at or below ONE ROPE
// LENGTH while their own `pitches` column says 3 or 4 — an impossibility that needs no research to
// see, because the contradiction is inside the row. It is not cosmetic: `dbRouteToCamel` emits
// `routeFt = round(length_m * 3.28084)` and `RouteDetail` computes
//
//     climbLenRaw = route.routeFt || (sum of pitchDetail lengths)
//
// so a wrong `length_m` is not merely displayed — it SHADOWS the route's own pitch table, which is
// the better record. `wa_liberty_bell_overexposure` renders 200 ft over a table whose four pitches
// sum to 459 ft.
//
// THE JUSTIFICATION IS THE IMPOSSIBILITY, NOT THE FALLBACK. The fallback above is read from the
// source and could not be confirmed by rendering: the TECH STATS tile is a <CountUp/>, so under
// renderToStaticMarkup the two renders are BYTE-IDENTICAL at 17,654 characters whether routeFt is
// 200 or null — see scripts/oneoff/probe-length-fallback-ssr-cannot-see-it.mjs. Nulling is right
// because the stored value cannot be true, whatever the page then does with the absence.
//
// THE REPAIR IS TO NULL IT, NOT TO WRITE THE SUM, and that choice is the point. Four of the eight
// carry a complete pitch table, so a derived length is available — but writing it would put a
// second, drifting copy of a fact the table already holds, which is the very class this came out
// of. Nulling lets the reader's existing fallback consult the table at render time, and it gets the
// units right on its own (`routeFt` is feet and takes `uElev`; the pitch sum is metres and takes
// `uLen`, selected by `usePitchSumForLen`). The other four carry no per-pitch lengths at all, so
// there is nothing in the row to derive from — and `null` is the correct value where no source
// gives a distance. Inventing a plausible substitute is what `check:rappel-lengths` exists to stop.
//
// Every row is declared with the exact value expected to be there, and the script refuses unless
// the live value still matches — nothing is written on a row that has changed underneath. Dry run
// by default; `--apply` writes, then re-reads and reconciles.
import { loadEnv, SUPABASE_URL, requireServiceKey, anonKey, headers, patchRow } from "../lib/supabase-env.mjs";

loadEnv();
const APPLY = process.argv.includes("--apply");

// id, the length_m that must still be there, the stated pitch count, and what the table holds.
const ROWS = [
  ["wa_castle_peak_tatoosh_southeast_face", 24, 4, "no per-pitch lengths — nothing to derive from"],
  ["wa_big_snagtooth_west_ridge",           21, 3, "no per-pitch lengths — nothing to derive from"],
  ["wa_east_wilmans_spire",                 43, 3, "no per-pitch lengths — nothing to derive from"],
  ["wa_japanese_gardens",                   61, 4, "no per-pitch lengths — nothing to derive from"],
  ["wa_austera_peak_southwest_ridge",       55, 3, "table sums 95 m (312 ft); the fallback will use it"],
  ["wa_sharkfin_tower_southeast_ridge",     61, 3, "table sums 95 m (312 ft); the fallback will use it"],
  ["wa_big_kangaroo_west_face",             61, 3, "table sums 150 m (492 ft); the fallback will use it"],
  ["wa_liberty_bell_overexposure",          61, 4, "table sums 140 m (459 ft); the fallback will use it"],
];
const ROPE_M = 65; // one 60 m rope plus slack — anything at or under this is a single pitch

const ids = ROWS.map(r => r[0]);
const url = `${SUPABASE_URL}/rest/v1/routes?select=id,name,pitches,length_m,pitch_detail&id=in.(${ids.join(",")})`;
const res = await fetch(url, { headers: headers(APPLY ? requireServiceKey() : anonKey()) });
if (!res.ok) { console.error(`FAIL — read ${res.status}: ${await res.text()}`); process.exit(1); }
const rows = await res.json();
if (rows.length !== ids.length) { console.error(`FAIL — asked for ${ids.length} routes, got ${rows.length}.`); process.exit(1); }
const byId = new Map(rows.map(r => [r.id, r]));

let bad = 0;
for (const [id, len, pitches, note] of ROWS) {
  const r = byId.get(id);
  if (r.length_m !== len) { console.error(`FAIL  ${id} — length_m is ${r.length_m}, declared ${len}. The row changed; refusing.`); bad++; continue; }
  if (r.pitches !== pitches) { console.error(`FAIL  ${id} — pitches is ${r.pitches}, declared ${pitches}.`); bad++; continue; }
  // Re-assert the impossibility itself rather than trusting the table above.
  if (!(r.length_m <= ROPE_M && r.pitches >= 3)) { console.error(`FAIL  ${id} — no longer impossible (${r.length_m} m over ${r.pitches} pitches).`); bad++; continue; }
  const sum = (r.pitch_detail || []).reduce((a, p) => a + (typeof p.lengthM === "number" ? p.lengthM : 0), 0);
  console.log(`\n${id}\n  ${r.pitches} pitches stated, length_m ${r.length_m} m (${Math.round(r.length_m * 3.28084)} ft) — impossible\n  ${note}\n  -> length_m: null${sum ? `   (page will fall back to the table's ${sum} m)` : "   (page will show no climb length, which is the truth)"}`);
}
if (bad) { console.error(`\n${bad} problem(s). Nothing was written.`); process.exit(1); }

console.log(`\n${ROWS.length} route(s) to null.`);
if (!APPLY) { console.log("DRY RUN — re-run with --apply to write."); process.exit(0); }

for (const [id] of ROWS) await patchRow("routes", id, { length_m: null });
console.log("wrote. Re-reading to reconcile…");
const after = new Map((await (await fetch(url, { headers: headers(requireServiceKey()) })).json()).map(r => [r.id, r]));
let wrong = 0;
for (const [id] of ROWS) {
  const v = after.get(id);
  if (v?.length_m !== null) { console.error(`NOT APPLIED  ${id} — length_m is ${v?.length_m}`); wrong++; }
  else if (typeof v.pitches !== "number") { console.error(`COLLATERAL  ${id} — pitches went missing`); wrong++; }
}
console.log(wrong ? `${wrong} row(s) wrong.` : `verified: all ${ROWS.length} lengths are null and every pitch count survived.`);
process.exitCode = wrong ? 1 : 0;
