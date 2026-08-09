// How many crag-discipline routes does the new content-driven gate hand a Plan / Safety
// tab back to? Mirrors hasPlanContent / hasSafetyContent in RouteDetail.jsx exactly,
// evaluated against the DB column names those camelCase fields map from.
import { selectAll } from "../lib/supabase-env.mjs";
const CRAG = new Set(["trad", "sport", "bouldering"]);
const catOf = (r) => r.discipline === "rock" ? String(r.style || "Trad").toLowerCase() : r.discipline;
const arr = (v) => Array.isArray(v) ? v : (v == null || v === "" ? [] : [v]);
const obj = (v) => v != null && v !== "" && !(typeof v === "object" && !Array.isArray(v) && !Object.keys(v).length);

const plan = (r) => !!(obj(r.road) || r.approach || r.descent || obj(r.approach_logistics) || arr(r.waypoints).length || r.rappels != null);
const safe = (r) => !!(arr(r.obj_haz).length || arr(r.watch_out).length || r.comms || r.bail || arr(r.waypoints).length);
// For comparison: the looser gate that also counted `access` / `hazards`, both of which
// turn out to be crag-level boilerplate replicated verbatim onto every route at Index,
// Skykomish etc. — real text, but identical across siblings and not worth a tab.
const planLoose = (r) => plan(r) || obj(r.access);
const safeLoose = (r) => safe(r) || arr(r.hazards).length > 0;

const rows = await selectAll("routes",
  "id,area_id,name,discipline,grade,source,road,access,approach,descent,approach_logistics,waypoints,rappels,hazards,obj_haz,watch_out,comms,bail",
  null, { pageSize: 1000 });
console.log("routes scanned:", rows.length);
const crag = rows.filter((r) => CRAG.has(catOf(r)));
console.log("crag-discipline routes:", crag.length);

const gp = crag.filter(plan), gs = crag.filter(safe);
const either = crag.filter((r) => plan(r) || safe(r));
console.log("gain a Plan tab:   ", gp.length);
console.log("gain a Safety tab: ", gs.length);
console.log("gain at least one: ", either.length, `(${(either.length / crag.length * 100).toFixed(2)}% of crag routes)`);
console.log("gain BOTH:         ", crag.filter((r) => plan(r) && safe(r)).length);
console.log("[loose gate, for comparison] at least one:", crag.filter((r) => planLoose(r) || safeLoose(r)).length);

// WA subset, the state the product actually scopes to.
const wa = either.filter((r) => /^wa_/.test(r.area_id) || /^wa_/.test(r.id));
console.log("\nof those, WA:", wa.length);
const enriched = either.filter((r) => r.source || (plan(r) && safe(r)));
console.log("with a research `source` or both kinds of content:", enriched.length);
console.log("\n--- 25 examples ---");
for (const r of enriched.slice(0, 25)) {
  console.log([r.id.padEnd(46), r.name.slice(0, 34).padEnd(35), "disc=" + String(r.discipline).padEnd(6),
    "grade=" + String(r.grade).slice(0, 16).padEnd(17), plan(r) ? "PLAN" : "    ", safe(r) ? "SAFETY" : ""].join(" "));
}
