#!/usr/bin/env node
// Stage 2 of the all-states crag PARKING pass (0255): matches each crag area to a NAMED OpenStreetMap
// lot / trailhead from the stage-1 cache. A lot is taken only when its NAME shares a distinctive word
// with the crag (≤1.5 km) or with the crag's parent (≤1.0 km) — OSM naming the lot after the crag is
// the "which lot" statement; a nearest-lot guess is never taken. Private lots are skipped.
// Usage: node scripts/oneoff/crag-parking-match.mjs <cacheDir> [--validate <researchDir>] [--sql out.sql]
import fs from "node:fs";
import path from "node:path";

const dir = process.argv[2]; const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const areas = JSON.parse(fs.readFileSync(path.join(dir, "areas.json"), "utf8")), crag = JSON.parse(fs.readFileSync(path.join(dir, "crag-area-ids.json"), "utf8"));
const byId = new Map(areas.map((a) => [a.id, a]));
const T = 0.25, tileCache = new Map();
const tile = (k) => { if (!tileCache.has(k)) { const f = path.join(dir, "tiles", k + ".json"); tileCache.set(k, fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : null); } return tileCache.get(k); };
const km = (a, b, c, d) => { const R = 6371, x = (c - a) * Math.PI / 180, y = (d - b) * Math.PI / 180; const h = Math.sin(x / 2) ** 2 + Math.cos(a * Math.PI / 180) * Math.cos(c * Math.PI / 180) * Math.sin(y / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
const STOP = new Set("parking park lot lots area areas trailhead trailheads trail trails th the wall walls rock rocks crag crags boulder boulders bouldering creek canyon canyons state national forest recreation north south east west upper lower middle main overflow day use access point lake mountain mount mt county road rd hill hills peak falls river sno of and at a an de del el la las los climbing climbers climb site sites public visitor center centre gate loop lookout ridge valley spring springs city regional preserve wilderness campground camp picnic county usfs blm nps dnr wma highway hwy route street st avenue ave drive dr new old big little red black white green blue grey gray".split(" "));
// A GENERIC word ("Coal Pit Buttress" vs "Gate Buttress Parking", "Group Campsite 8" vs "Group 4 Parking") or a
// number names no particular place, so it can carry a match only when it is the lot's WHOLE name ("Lower Gorge Parking").
const GENERIC = new Set("buttress buttresses face faces slab slabs tower towers dome domes cave caves arch arches pinnacle pinnacles cove point cliff cliffs ledge ledges bluff bluffs gorge group right left side campus hall central inner outer east west first second third pullout".split(" "));
const toks = (s) => new Set(String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/['\u2019]/g, "").replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter((w) => (/^\d+$/.test(w) || w.length >= 3) && !STOP.has(w)));
const SOURCEY = /mountain ?project|\bMP\b|guide ?book|coalition|access fund|openstreetmap|\bOSM\b|according|per |source|website/i;
const generic = (w) => GENERIC.has(w) || /^\d+$/.test(w);
// The whole-name test reads the names with only the PARKING words taken out: STOP drops "gate", so under it
// "Gate Buttress Parking Lot" would read as just "buttress" and fit "Coal Pit Buttress".
const LIGHT = new Set("parking park lot lots area trailhead trailheads trail th the of and at a an climbing climbers access".split(" "));
const lightMemo = new Map(), light = (s) => lightMemo.get(s) || (lightMemo.set(s, lightRaw(s)), lightMemo.get(s));
const lightRaw = (s) => new Set(String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/['’]/g, "").replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter((w) => w && !LIGHT.has(w)));
const shares = (a, b, aName, bName) => { for (const w of a) if (b.has(w) && !generic(w)) return w; const la = light(aName), lb = light(bName); if (b.size && lb.size && [...lb].every((w) => la.has(w))) return [...lb].join(" "); return null; };
function candidates(lat, lng) { const out = [], i0 = Math.floor(lat / T), j0 = Math.floor(lng / T); let missing = false; for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) { const t = tile((i0 + di) + "_" + (j0 + dj)); if (t === null && di === 0 && dj === 0) missing = true; if (t) out.push(...t); } return { out, missing }; }
function match(a) {
  if (a.lat == null || a.lng == null) return { why: "no crag coordinate" };
  const { out, missing } = candidates(a.lat, a.lng); if (missing) return { why: "tile not pulled" };
  const own = toks(a.name), par = byId.get(a.parent_id), parT = par && par.route_count <= 1500 && !["state", "country"].includes(par.area_type) ? toks(par.name) : new Set();
  let best = null;
  for (const e of out) {
    if (!e.name || e.lat == null || /^(private|no|customers)$/.test(e.access || "")) continue;
    if (e.name.length > 80 || SOURCEY.test(e.name)) continue; // the app names no source (apply-crag-parking.mjs's rule)
    const d = km(a.lat, a.lng, e.lat, e.lng), et = toks(e.name);
    const w = shares(own, et, a.name, e.name), wp = w || !parT.size ? null : shares(parT, et, par.name, e.name);
    const rank = w && d <= 1.5 ? 0 : wp && d <= 1.0 ? 1 : null; if (rank == null) continue;
    if (!best || rank < best.rank || (rank === best.rank && (e.kind === "parking") > (best.e.kind === "parking")) || (rank === best.rank && e.kind === best.e.kind && d < best.d)) best = { e, d, rank, word: w || wp };
  }
  return best ? { lat: +best.e.lat.toFixed(6), lng: +best.e.lng.toFixed(6), name: best.e.name.split(";")[0].trim() /* OSM lists alternates as "a;b" */, osm: best.e.t, km: best.d, via: best.rank ? "parent" : "own", word: best.word, kind: best.e.kind } : { why: "no named lot matches" };
}
const targets = areas.filter((a) => crag[a.id]);
if (arg("--validate")) {
  const rd = arg("--validate"); const truth = fs.readdirSync(rd).filter((f) => f.endsWith(".json") && !f.includes("renamed")).flatMap((f) => JSON.parse(fs.readFileSync(path.join(rd, f), "utf8")));
  let agree = 0, differ = 0, none = 0; const rows = [];
  for (const t of truth) { const a = byId.get(t.area_id); if (!a) continue; const m = match(a); if (m.why) { none++; rows.push(`none   ${a.id}: ${m.why}`); continue; } const d = km(m.lat, m.lng, t.lat, t.lng); if (d <= 0.15) agree++; else differ++; rows.push(`${d <= 0.15 ? "agree " : "DIFFER"} ${a.id}: matched "${m.name}" ${d.toFixed(2)} km from researched "${t.name}"`); }
  console.log(rows.join("\n")); console.log(`validation vs research: ${agree} agree, ${differ} differ, ${none} unmatched`); process.exit(0);
}
let n = 0, own = 0; const why = {}; const out = [];
for (const a of targets) { if (a.parking_lat != null) { why.already = (why.already || 0) + 1; continue; } const m = match(a); if (m.why) { why[m.why] = (why[m.why] || 0) + 1; continue; } n++; if (m.via === "own") own++; out.push({ area_id: a.id, area: a.name, routes: crag[a.id], ...m }); }
console.log(`${targets.length} crag areas: ${n} matched (${own} on their own name), skipped ${JSON.stringify(why)}; routes covered ${out.reduce((s, x) => s + x.routes, 0)}`);
fs.writeFileSync(path.join(dir, "matches.json"), JSON.stringify(out, null, 0));
const sqlOut = arg("--sql"); if (sqlOut) { const esc = (s) => "'" + String(s).replace(/'/g, "''") + "'"; const st = ["begin;", ...out.map((m) => `update public.areas set parking_lat=${m.lat}, parking_lng=${m.lng}, parking_name=${esc(m.name)} where id=${esc(m.area_id)} and parking_lat is null;`), "commit;"]; fs.writeFileSync(sqlOut, st.join("\n") + "\n"); console.log("wrote " + sqlOut); }
