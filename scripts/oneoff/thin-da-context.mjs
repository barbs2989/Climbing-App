// Builds a research context for the thin descent/approach item (audits/thin-descent-approach/BRIEF.md)
// from a list of peak area ids: every route on those peaks whose descent (longer of descent /
// descent_text) or approach (no approach_variants) is under 150 characters, plus the routes on the
// same peaks that already have a good one. Read-only.
//   node scripts/oneoff/thin-da-context.mjs <out.json> <area_id> [area_id...]
import fs from "fs";
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";

const [out, ...areaIds] = process.argv.slice(2);
if (!out || !areaIds.length) { console.error("usage: thin-da-context.mjs <out.json> <area_id>..."); process.exit(2); }
const get = async q => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${q}`, { headers: headers(anonKey()), signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error(`${q} -> ${r.status} ${await r.text()}`);
  return r.json();
};
const inList = ids => `(${ids.map(i => `"${i}"`).join(",")})`;
const areas = await get(`areas?select=id,name,parent_id,lat,lng,elevation_ft&id=in.${inList(areaIds)}`);
const parents = await get(`areas?select=id,name&id=in.${inList([...new Set(areas.map(a => a.parent_id).filter(Boolean))])}`);
const routes = await get(`routes?select=id,name,grade,disciplines,area_id,approach,descent,descent_text,approach_variants,pitches,description&area_id=in.${inList(areaIds)}&order=id`);
const len = s => (s || "").length;
const targets = [], rich = {};
for (const r of routes) {
  const a = areas.find(x => x.id === r.area_id);
  const needD = Math.max(len(r.descent), len(r.descent_text)) < 150;
  const needA = len(r.approach) < 150 && !r.approach_variants;
  if (!needD && !needA) { rich[r.id] = { area_id: r.area_id, name: r.name, grade: r.grade, approach: r.approach, descent_text: r.descent_text || r.descent }; continue; }
  targets.push({
    id: r.id, name: r.name, grade: r.grade, discipline: (r.disciplines || [])[0] || null, area_id: r.area_id,
    peak: a?.name, peak_lat: a?.lat, peak_lng: a?.lng, peak_elev: a?.elevation_ft ?? null,
    parent: parents.find(p => p.id === a?.parent_id)?.name || null, pitches: r.pitches,
    approach: r.approach, descent: r.descent, descent_text: r.descent_text, description: r.description,
    need_descent: needD, need_approach: needA,
    siblings: routes.filter(s => s.area_id === r.area_id && s.id !== r.id).map(s => `${s.id} = ${s.name}`),
  });
}
fs.writeFileSync(out, JSON.stringify({ targets, richSiblingsOnSamePeak: rich }, null, 1));
console.log(`${out}: ${targets.length} targets, ${Object.keys(rich).length} rich siblings`);
