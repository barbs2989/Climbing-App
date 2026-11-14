// Like thin-da-context.mjs, but selects by PRIMARY discipline across every area whose id starts with
// a prefix, for the long tail where each peak has only one or two thin rows. Read-only.
//   node scripts/oneoff/thin-da-context-disc.mjs <out.json> <area-id-prefix> <disc,disc,...>
//   e.g. ... ctx-mtn-ca.json ca_ mountaineering,alpine
import fs from "fs";
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";

const [out, prefix, discs] = process.argv.slice(2);
if (!out || !prefix || !discs) { console.error("usage: thin-da-context-disc.mjs <out.json> <area-id-prefix> <disc,...>"); process.exit(2); }
const get = async q => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${q}`, { headers: headers(anonKey()), signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error(`${q} -> ${r.status} ${await r.text()}`);
  return r.json();
};
const want = new Set(discs.split(","));
const len = s => (s || "").length;
const rows = [];
for (const d of want) {
  rows.push(...await get(`routes?select=id,name,grade,disciplines,area_id,approach,descent,descent_text,approach_variants,pitches,description&area_id=like.${encodeURIComponent(prefix)}*&disciplines->>0=eq.${d}&order=id&limit=2000`));
}
// The item's scope is the alpine catalog: a row must also carry alpine, mountaineering or scrambling in its list.
const ALPINE = ["alpine", "mountaineering", "scrambling"];
const thin = rows.filter(r => (r.disciplines || []).some(d => ALPINE.includes(d))).filter(r => Math.max(len(r.descent), len(r.descent_text)) < 150 || (len(r.approach) < 150 && !r.approach_variants));
const areaIds = [...new Set(thin.map(r => r.area_id))];
const areas = [];
for (let i = 0; i < areaIds.length; i += 80) areas.push(...await get(`areas?select=id,name,parent_id,lat,lng,elevation_ft&id=in.(${areaIds.slice(i, i + 80).map(x => `"${x}"`).join(",")})`));
const pIds = [...new Set(areas.map(a => a.parent_id).filter(Boolean))];
const parents = [];
for (let i = 0; i < pIds.length; i += 80) parents.push(...await get(`areas?select=id,name&id=in.(${pIds.slice(i, i + 80).map(x => `"${x}"`).join(",")})`));
const targets = thin.map(r => {
  const a = areas.find(x => x.id === r.area_id);
  return {
    id: r.id, name: r.name, grade: r.grade, discipline: (r.disciplines || [])[0] || null, area_id: r.area_id,
    peak: a?.name, peak_lat: a?.lat, peak_lng: a?.lng, peak_elev: a?.elevation_ft ?? null,
    parent: parents.find(p => p.id === a?.parent_id)?.name || null, pitches: r.pitches,
    approach: r.approach, descent: r.descent, descent_text: r.descent_text, description: r.description,
    need_descent: Math.max(len(r.descent), len(r.descent_text)) < 150, need_approach: len(r.approach) < 150 && !r.approach_variants,
  };
});
// Split into chunks of about CHUNK targets, never splitting one area across two files.
const CHUNK = Number(process.env.CHUNK || 1e9);
const byArea = {};
for (const t of targets) (byArea[t.area_id] = byArea[t.area_id] || []).push(t);
const chunks = [[]];
for (const g of Object.values(byArea)) { if (chunks.at(-1).length && chunks.at(-1).length + g.length > CHUNK) chunks.push([]); chunks.at(-1).push(...g); }
chunks.forEach((c, i) => {
  const file = chunks.length > 1 ? out.replace(/\.json$/, `-${i + 1}.json`) : out;
  fs.writeFileSync(file, JSON.stringify({ targets: c, richSiblingsOnSamePeak: {} }, null, 1));
  console.log(`${file}: ${c.length} targets`);
});
