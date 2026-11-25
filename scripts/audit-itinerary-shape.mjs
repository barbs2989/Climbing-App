#!/usr/bin/env node
// audit:itinerary-shape — does every LIVE trip plan follow the rule? (owner 2026-11-11: "text only
// plans convert day by day, make that a rule in the app when we do other routes and states")
//
// Reads every routes row whose `itinerary` is set (ids first, then the column by id=in.(…) in chunks
// of 100, per docs/codebase/supabase-scripts.md) and puts each plan through lib/itineraryShape.js.
// FAILS on any prose or malformed plan. Also REPORTS, without failing, the days a stored plan has
// with no hours, miles or gain — the gaps the Trip plan shows as "No gain, time or distance on file".
//
// Needs the service key (it reads the routes table in bulk). Run it after any batch that writes
// `itinerary`, and before applying migration 0409, which makes the database refuse a non-object plan:
// the constraint cannot be added while a single prose row remains.
import { SUPABASE_URL, headers, requireServiceKey, selectAll } from "./lib/supabase-env.mjs";
import { itineraryShapeErrors } from "../lib/itineraryShape.js";

const key = requireServiceKey();
const ids = (await selectAll("routes", "id", "itinerary=not.is.null", { pageSize: 1000, key })).map((r) => r.id);
if (!ids.length) { console.error("audit:itinerary-shape FAILED — read zero plans; a short read would report a clean catalog."); process.exit(1); }
const bad = [], gaps = [];
let checked = 0;
for (let i = 0; i < ids.length; i += 100) {
  const q = SUPABASE_URL + "/rest/v1/routes?select=id,itinerary&id=in.(" + ids.slice(i, i + 100).map(encodeURIComponent).join(",") + ")";
  const r = await fetch(q, { headers: headers(key), signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error("STOPPED at chunk " + i + ": " + r.status + " - the database is not answering; do not retry fast");
  for (const row of await r.json()) {
    checked++;
    const errs = itineraryShapeErrors(row.itinerary);
    if (errs.length) { bad.push({ id: row.id, errs }); continue; }
    const g = (row.itinerary.days || []).filter((d) => ![d.hours, d.miles, d.gainFt].some((v) => v != null && v !== "")).length;
    if (g) gaps.push({ id: row.id, days: g });
  }
  await new Promise((s) => setTimeout(s, 200));
}
const prose = bad.filter((b) => b.errs.some((e) => e.startsWith("text-only")));
console.log("audit:itinerary-shape — " + checked + " trip plan(s) read");
console.log("  prose (text-only)      : " + prose.length);
console.log("  malformed otherwise    : " + (bad.length - prose.length));
console.log("  plans with gap days    : " + gaps.length + " (" + gaps.reduce((a, g) => a + g.days, 0) + " days with no hours, miles or gain; reported, not failed)");
for (const b of bad.slice(0, 40)) console.log("  FAIL  " + b.id + ": " + b.errs.slice(0, 3).join("; "));
if (bad.length > 40) console.log("  ... +" + (bad.length - 40) + " more");
const outArg = process.argv.find((a) => a.startsWith("--out="));
if (outArg) (await import("node:fs")).writeFileSync(outArg.slice(6), JSON.stringify({ bad, gaps }, null, 1));
if (checked !== ids.length) { console.error("audit:itinerary-shape FAILED — listed " + ids.length + " plans but read " + checked + "."); process.exit(1); }
if (bad.length) { console.error("\naudit:itinerary-shape FAILED — " + bad.length + " plan(s) break the trip-plan rule (lib/itineraryShape.js)."); process.exit(1); }
console.log("\naudit:itinerary-shape: ok — every live trip plan is day by day.");
