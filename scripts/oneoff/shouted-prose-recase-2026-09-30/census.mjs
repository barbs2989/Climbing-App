// Census of ALL-CAPS tokens in every rendered string of routes + areas. Writes raw hits to hits.json.
import fs from "fs";
import { selectAll, requireServiceKey } from "../../lib/supabase-env.mjs";
const key = requireServiceKey();
const SKIP = new Set(["id","area_id","name_search","gpx","elev_pts","grade","grade_system","rock_grade","alpine_grade","ice_grade","aid_grade","path","parent_id","region"]);
const hits = [];
const tokFreq = {};
function walk(v, where, out) {
  if (v == null) return;
  if (typeof v === "string") { out.push([where, v]); return; }
  if (Array.isArray(v)) { v.forEach((x, i) => walk(x, where + "[" + i + "]", out)); return; }
  if (typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, where + "." + k, out);
}
const WORD = /\b[A-Z][A-Z'’]*[A-Z]\b/g;
function scan(table, rows) {
  for (const r of rows) {
    for (const [c, v] of Object.entries(r)) {
      if (SKIP.has(c)) continue;
      const strs = []; walk(v, c, strs);
      for (const [where, s] of strs) {
        const ws = s.match(WORD);
        if (!ws) continue;
        for (const w of ws) tokFreq[w] = (tokFreq[w] || 0) + 1;
        hits.push({ table, id: r.id, where, s });
      }
    }
  }
}
const areas = await selectAll("areas", "id,name,blurb", "", { key, pageSize: 1000 });
scan("areas", areas);
console.error("areas", areas.length);
const cols = "id,name,fa,season,gear,hazards,overview,beta,turnaround,rappels,face,comms,descent,obj_haz,waypoints,timing,detailed_rack,what_to_bring,pro_tips,watch_out,pro_needs,best_season,approach,descent_text,bail,pitch_detail,itinerary,access,road,climate,emergency,crowds,partner_requirements,seasonal_guidance,seasonal_hazards,difficulty,approach_logistics,rope_note,rappel_detail,rappel_count_note,features,approach_variants,climbing_route,bivy,description,crux,rock,landing,pads,start_type,data_quality";
const routes = await selectAll("routes", cols, "", { key, pageSize: 1000 });
console.error("routes", routes.length);
scan("routes", routes);
fs.writeFileSync(new URL("./hits.json", import.meta.url), JSON.stringify(hits));
fs.writeFileSync(new URL("./tokfreq.json", import.meta.url), JSON.stringify(Object.entries(tokFreq).sort((a, b) => b[1] - a[1])));
console.error("strings with caps tokens", hits.length);
