// Emit the WA top-100 peak roster as a JS literal for lib/lists.js.
//
// Generated rather than hand-typed: 100 peak ids transcribed by hand is 100 chances to write an
// id that resolves to nothing, and a roster entry that matches no area is invisible — it just
// silently never becomes an objective. Every id here came out of the live `areas` table, so it
// resolves by construction.
import { anonKey, requireServiceKey, selectAll } from "../lib/supabase-env.mjs";

const KEY = (() => { try { return requireServiceKey(); } catch { return anonKey(); } })();
const peaks = await selectAll("areas", "id,name,elevation_ft,prominence_ft,route_count", "area_type=eq.peak", { pageSize: 1000, key: KEY });
if (!peaks.length) { console.error("FAIL: empty read."); process.exit(1); }

peaks.sort((a, b) => (b.elevation_ft ?? -1) - (a.elevation_ft ?? -1));
// 400 ft of clean prominence is the Bulger qualifier. A peak with NO prominence value is kept
// (a null is missing data, not a disqualification) but flagged, so the boundary stays honest.
const ranked = peaks.filter(p => (p.prominence_ft ?? 400) >= 400).slice(0, 100);

const unknownProm = ranked.filter(p => p.prominence_ft == null);
const noRoutes = ranked.filter(p => !(p.route_count || 0));
console.error(`# ${ranked.length} peaks, ${ranked[0].elevation_ft} down to ${ranked[99].elevation_ft} ft`);
console.error(`# ${unknownProm.length} carry no prominence value; ${noRoutes.length} hold no route`);

const esc = s => String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
console.log("export const BULGER_PEAKS = [");
for (const p of ranked) console.log(`  { id: "${esc(p.id)}", name: "${esc(p.name)}", ft: ${p.elevation_ft} },`);
console.log("];");
