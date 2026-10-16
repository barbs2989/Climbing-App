// Second pass: re-read the LIVE catalog, find strings the detector still flags, and extract each
// maximal caps run containing a flagged token into chunks/in-2x.json, rewriting uniq/targets for apply.mjs.
import fs from "fs";
import { selectAll, requireServiceKey } from "../../lib/supabase-env.mjs";
import { shoutedFragments, shoutedStrings } from "../../lib/shouted-prose.mjs";
const dir = new URL("./", import.meta.url);
const key = requireServiceKey();
const COLS = "id,season,gear,hazards,overview,beta,turnaround,rappels,face,comms,descent,obj_haz,waypoints,timing,detailed_rack,what_to_bring,pro_tips,watch_out,pro_needs,best_season,approach,descent_text,bail,pitch_detail,itinerary,access,road,climate,emergency,crowds,partner_requirements,seasonal_guidance,seasonal_hazards,difficulty,approach_logistics,rope_note,rappel_detail,rappel_count_note,features,approach_variants,climbing_route,bivy,description,crux,rock,landing,pads,start_type";
const routes = await selectAll("routes", COLS, "", { key, pageSize: 1000 });
const areas = await selectAll("areas", "id,blurb", "", { key, pageSize: 1000 });
const get = (v, path) => path.split(/\.|\[(\d+)\]/).filter(x => x !== undefined && x !== "").reduce((o, k) => o?.[k], v);
const targets = [];
for (const r of routes) { const { id, ...rest } = r; for (const f of shoutedStrings(rest)) targets.push({ table: "routes", id, where: f.path, s: get(rest, f.path) }); }
for (const a of areas) for (const f of shoutedStrings(a.blurb, "blurb")) targets.push({ table: "areas", id: a.id, where: "blurb", s: a.blurb });
const uniq = [...new Set(targets.map(t => t.s))];
const RUN = /\b[A-Z][A-Z'’]*[A-Z](?:['’]s)?\b(?:(?:[\s,;:\-–—/&().0-9"“”%~+]|\b[a-z]{1,2}\b(?=[\s.,]))*\b(?:[A-Z][A-Z'’]*[A-Z]|A|I)(?:['’]s)?\b)*/g;
const runs = [];
uniq.forEach((s, si) => {
  for (const m of s.matchAll(RUN)) {
    if (!shoutedFragments(m[0]).length && !(m[0].includes(" ") && shoutedFragments(m[0]).length)) continue;
    runs.push({ k: `${si}:${m.index}`, before: s.slice(Math.max(0, m.index - 90), m.index), run: m[0], after: s.slice(m.index + m[0].length, m.index + m[0].length + 60) });
  }
});
console.log("strings", targets.length, "unique", uniq.length, "runs", runs.length);
fs.writeFileSync(new URL("uniq.json", dir), JSON.stringify(uniq));
fs.writeFileSync(new URL("targets.json", dir), JSON.stringify(targets));
fs.mkdirSync(new URL("chunks2/", dir), { recursive: true });
fs.writeFileSync(new URL("chunks2/in-0.json", dir), JSON.stringify(runs).replace(/\},\{/g, "},\n{"));
