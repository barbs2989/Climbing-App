// DOES EACH ROUTE'S OWN PROSE PLACE IT NEAR THE CAMPS IT CARRIES?
//
// The Ruth Mountain repair is the precedent this has to clear: wa_ellation's own prose puts it in
// the Ruth Creek valley, so Ruth-AREA camps were defensible on a crag route and only Ruth's
// SUMMIT camp was removed. An over-broad zone assignment is not automatically wrong; it is wrong
// when the route has nothing to do with the place.
//
// Prose corroboration is a real signal here rather than a vacuous one, and only the base rate
// proves that: measured across the catalog, 51.4% of (route, camp) pairs ARE named by their own
// route. Silence is therefore not the norm.
//
// Also prints each route's trailhead, because that is the fact a camp actually serves. Two peaks
// 15 km apart with different trailheads do not share a camp however close they look on a map.
import { SUPABASE_URL, anonKey, headers, selectAll } from "../lib/supabase-env.mjs";

const H = headers(anonKey());
const PEAKS = ["Mount Pilchuck", "Three Fingers", "Big Four Mountain", "Whitehorse Mountain"];
const PROSE = ["overview", "approach", "beta", "descent_text", "watch_out", "climbing_route"];

const areas = await selectAll("areas", "id,name,lat,lng", "", { pageSize: 1000 });
const ids = new Map();
for (const p of PEAKS) {
  const h = areas.filter((a) => a.name.toLowerCase() === p.toLowerCase());
  if (h.length !== 1) { console.log(`FAIL CLOSED: ${h.length} named ${p}`); process.exit(1); }
  ids.set(h[0].id, h[0]);
}

const sel = `id,name,area_id,bivy,approach_logistics,${PROSE.join(",")}`;
const rows = await selectAll("routes", sel, "bivy=not.is.null", { pageSize: 1000 });
const mine = rows.filter((r) => ids.has(r.area_id));
if (!mine.length) { console.log("FAIL CLOSED: no routes"); process.exit(1); }

const corpus = (r) => PROSE.map((c) => {
  const v = r[c];
  if (typeof v === "string") return v;
  if (v && typeof v === "object") return JSON.stringify(v);
  return "";
}).join(" \n ").toLowerCase();

// The distinctive proper noun of each peak, taken from the catalog name rather than typed.
const STOP = new Set(["mount", "mountain", "peak", "the", "four", "big", "three"]);
const marker = (name) => {
  const t = name.toLowerCase().split(/\s+/).filter((w) => !STOP.has(w));
  return t.length ? t.join(" ") : name.toLowerCase();
};

console.log("marker word per peak (from the catalog name, generic words dropped):");
for (const a of ids.values()) console.log(`   ${a.name} -> "${marker(a.name)}"`);
// Big Four's whole name is generic words; keep the pair so it stays distinctive.
console.log("");

for (const [aid, a] of ids) {
  console.log(`=== ${a.name} ===`);
  for (const r of mine.filter((x) => x.area_id === aid)) {
    const text = corpus(r);
    const al = r.approach_logistics || {};
    const th = al.trailhead || "(none recorded)";
    console.log(`  ${r.id}`);
    console.log(`     trailhead: ${th}`);
    const hits = [];
    for (const other of ids.values()) {
      if (other.id === aid) continue;
      const m = marker(other.name);
      const alt = other.name.toLowerCase();
      if (text.includes(m) || text.includes(alt)) hits.push(other.name);
    }
    console.log(`     prose names other peaks: ${hits.length ? hits.join(", ") : "NONE"}`);
    const camps = (Array.isArray(r.bivy) ? r.bivy : []).map((s) => (s && s.name) || "");
    const named = camps.filter((c) => c && text.includes(c.toLowerCase().split(",")[0].trim()));
    console.log(`     names ${named.length} of its ${camps.length} camps in its own prose`);
  }
  console.log("");
}
console.log("A route that never mentions a neighbouring peak has no stated reason to carry its camps.");
console.log("That is corroboration, not a verdict — read the row before removing anything.");
