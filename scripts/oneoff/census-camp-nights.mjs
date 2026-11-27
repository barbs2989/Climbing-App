// Census for the night-by-night camp plan (owner note 2026-11-26): which routes are multi-day
// (trip plan of 2+ days) and what camping they carry. Read-only, service key, cached to --out.
import { selectAll, requireServiceKey } from "../lib/supabase-env.mjs";
import { writeFileSync } from "node:fs";
const oi = process.argv.indexOf("--out");
const out = oi > 0 ? process.argv[oi + 1] : "camp-nights-census.json";
const rows = await selectAll("routes", "id,name,area_id,discipline,itinerary,bivy,waypoints,timing", "itinerary=not.is.null", { key: requireServiceKey(), pageSize: 500 });
const multi = rows.filter(r => r.itinerary && Array.isArray(r.itinerary.days) && r.itinerary.days.length >= 2);
writeFileSync(out, JSON.stringify(multi));
const byState = {};
multi.forEach(r => { const s = r.id.split("_")[0]; byState[s] = (byState[s] || 0) + 1; });
console.log("routes with itinerary:", rows.length, "multi-day:", multi.length);
console.log("with bivy:", multi.filter(r => Array.isArray(r.bivy) && r.bivy.filter(b => b && b.role !== "hidden").length).length);
console.log(JSON.stringify(byState));
const dd = {}; multi.forEach(r => { const n = r.itinerary.days.length; dd[n] = (dd[n] || 0) + 1; }); console.log("days:", JSON.stringify(dd));
