// Builds final/in/g1..g3.json (guidebook lane: route facts a book can settle) and final/in/l1..l3.json
// (land-manager lane: trail distances, gains, times, pins, permits) from the 247 entries the peakbagger pass
// (pb/out/p1-p4) left unresolved. A route goes to ONE lane: the guidebook lane if any of its entries is a
// route fact, so one agent owns every entry on a row. Held items the owner settled separately are skipped.
import fs from "node:fs";
const pb = "audits/route-leftovers/pb";
const SKIP = new Set(["wa_buck_mountain_south_ridge", "wa_project_crack", "wa_glacier_view_temple"]);
// terrain heights (camps, cols, summits) are not access facts, so a book may settle them
const TERRAIN = new Set(["wa_saska_peak_emerald_saska_col", "wa_tenpeak_mountain_southeast", "wa_lemah_mountain_east_route",
  "wa_chimney_rock_west_face", "wa_sherpa_peak_west_ridge", "wa_plan_9_from_outer_space", "wa_crooked_thumb_peak_south_route",
  "wa_trapper_mountain_south_slopes", "wa_cashmere_mountain_west_ridge"]);
const routeFact = (f) => /grade|commitment|pitch|rope|rappel|sling|rack|pro_needs|\bfa\b|first ascent|season|length_m|route length|max_angle|summit block|descent line|tops out|glacier hazard|bergschrund|climbing_route|snow lasts|high camp location|avalanche/i.test(f);
const inputs = new Map();
for (const b of ["p1", "p2", "p3", "p4"]) {
  const inp = JSON.parse(fs.readFileSync(`${pb}/in/${b}.json`, "utf8"));
  for (const x of [...(inp.items || []), ...(inp.fills || [])]) inputs.set(`${x.id}|${x.fact || x.column}`, x);
}
const groups = new Map();
for (const b of ["p1", "p2", "p3", "p4"]) {
  for (const r of JSON.parse(fs.readFileSync(`${pb}/out/${b}.json`, "utf8")).results) {
    if (r.verdict !== "unresolved" || SKIP.has(r.id)) continue;
    const src = inputs.get(`${r.id}|${r.fact}`) || {};
    const entry = { ...src, kind: r.kind, id: r.id, fact: r.fact,
      prior_evidence: `${src.prior_evidence || ""} PEAKBAGGER PASS: ${r.summary} ${r.evidence || ""}`.trim() };
    delete entry.column;
    if (r.kind === "fill") entry.column = r.fact;
    if (!groups.has(r.id)) groups.set(r.id, []);
    groups.get(r.id).push(entry);
  }
}
const lanes = { g: [], l: [] };
for (const [id, list] of groups) lanes[TERRAIN.has(id) || list.some(e => routeFact(e.fact)) ? "g" : "l"].push(list);
fs.mkdirSync("audits/route-leftovers/final/in", { recursive: true });
fs.mkdirSync("audits/route-leftovers/final/out", { recursive: true });
for (const [lane, gs] of Object.entries(lanes)) {
  const out = [[], [], []];
  for (const g of gs.sort((a, b) => b.length - a.length)) out.sort((a, b) => a.length - b.length)[0].push(...g);
  out.forEach((list, i) => fs.writeFileSync(`audits/route-leftovers/final/in/${lane}${i + 1}.json`,
    JSON.stringify({ items: list.filter(x => x.kind === "item"), fills: list.filter(x => x.kind === "fill") }, null, 1)));
  console.log(lane, out.map(l => `${l.length} entries / ${new Set(l.map(e => e.id)).size} routes`).join(", "));
}
