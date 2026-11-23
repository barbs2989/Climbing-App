// Which routes still get snow and glacier warnings on a GUESS?
//
// The alpine Conditions card words itself from two reviewed facts per route (migration 0490):
// routes.glacier_travel and routes.snow_in_season, each 'yes' | 'no' | null. Null means nobody has settled it,
// and the card falls back to reading the route's text: a glacier WORD keeps the glacier card ("any snow
// bridges are weak"), and every unreviewed mountaineering route is still read as glacier and snow.
// This lists, per state, the routes that carry the snow logic and have an unsettled answer: the worklist for
// the per-state review (research-data/glacier-travel-2026-11-23/RULE.md is the rule).
//
// Read-only.
//   node scripts/audit-glacier-travel.mjs --state wa            # summary
//   node scripts/audit-glacier-travel.mjs --state wa --list 40  # ...and the first 40 unsettled routes
//   node scripts/audit-glacier-travel.mjs --state or --json out.json   # the worklist, for a review batch
//
// WHAT IT CANNOT SEE: the page's category (catOf) also turns a trad route on a peak into "alpine"; this reads
// the stored discipline plus the 5.x-grade rule, so those trad rows are outside its count. And it cannot tell
// whether a settled answer is RIGHT — only that someone reviewed the route.
import "./lib/load-env.mjs";
import fs from "node:fs";
import { requireServiceKey, anonKey, selectAll, stateIdFilter } from "./lib/supabase-env.mjs";
import { routeTerrain, CORPUS_COLUMNS } from "../lib/terrain.js";
import { condKind, hasSnowLegs, bridgeWord, ALPINE_COND_DISCIPLINES } from "../lib/alpineConditions.js";

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? (argv[i + 1] ?? true) : d; };
const STATE = arg("--state", null), LIST = +arg("--list", 0), JSON_OUT = arg("--json", null);
if (!STATE) { console.error("audit:glacier-travel needs --state <slug> (wa, or, ca…): a whole-catalog scan of the prose columns is not a read this database should serve in one go."); process.exit(2); }
const key = (() => { try { return requireServiceKey(); } catch { return anonKey(); } })();

// routes has no style / route_ft / gain_m column; the rest of the corpus is selected as lib/terrain.js names it.
const cols = [...new Set(["id", "name", "area_id", "discipline", "grade", "pitches", "seasonal_hazards", "approach_variants", "glacier_travel", "snow_in_season", ...CORPUS_COLUMNS])];
const rows = await selectAll("routes", cols.join(","), stateIdFilter(STATE) + `&discipline=in.(${ALPINE_COND_DISCIPLINES.join(",")})`, { key, pageSize: 300 });
const fifth = (g) => /(^|[^\d.])5\.\d/.test(String(g || ""));

const out = rows.map((r) => {
  const cat = (r.discipline === "mountaineering" || r.discipline === "scrambling") && fifth(r.grade) ? "alpine" : r.discipline;
  const t = routeTerrain(r), kind = condKind(r, t, cat), legs = hasSnowLegs(kind, t);
  return { id: r.id, name: r.name, discipline: r.discipline, grade: r.grade, kind, legs, bridges: legs ? bridgeWord(kind, t) : false,
    glacier: r.glacier_travel || null, snow: r.snow_in_season || null, textGlacier: t.evidence.glacierSeen };
});
const tally = (rs, f) => rs.reduce((m, r) => { const k = f(r); m[k] = (m[k] || 0) + 1; return m; }, {});
const flagged = out.filter((r) => r.legs);
const open = flagged.filter((r) => r.glacier == null || r.snow == null);
const reviewedDry = out.filter((r) => !r.legs && r.snow === "no");

console.log(`audit:glacier-travel — ${STATE}: ${out.length} routes on an alpine Conditions card`);
console.log("  by kind:", JSON.stringify(tally(out, (r) => r.kind)));
console.log(`  carry the snow logic (freeze, freezing level, snow start): ${flagged.length}`);
console.log(`    glacier travel reviewed: yes ${flagged.filter((r) => r.glacier === "yes").length}, no ${flagged.filter((r) => r.glacier === "no").length}, NOT SETTLED ${flagged.filter((r) => r.glacier == null).length}`);
console.log(`    snow in season reviewed: yes ${flagged.filter((r) => r.snow === "yes").length}, no ${flagged.filter((r) => r.snow === "no").length}, NOT SETTLED ${flagged.filter((r) => r.snow == null).length}`);
console.log(`    bridges: stated on ${flagged.filter((r) => r.bridges === "yes").length} (reviewed glacier travel), "any snow bridges" on ${flagged.filter((r) => r.bridges === "maybe").length} (not settled), not mentioned on ${flagged.filter((r) => !r.bridges).length}`);
console.log(`  reviewed dry in season, so no snow logic at all: ${reviewedDry.length}`);
console.log(`  WORKLIST — snow logic on an unsettled answer: ${open.length}${open.length ? " (" + open.filter((r) => r.textGlacier).length + " name a glacier in their text)" : ""}`);
if (LIST) open.slice(0, LIST).forEach((r) => console.log(`    ${r.id} | ${r.name} | ${r.discipline} ${r.grade || ""} | ${r.kind} | glacier ${r.glacier || "?"} snow ${r.snow || "?"}`));
if (JSON_OUT && typeof JSON_OUT === "string") { fs.writeFileSync(JSON_OUT, JSON.stringify(open, null, 1)); console.log("  wrote", JSON_OUT); }
