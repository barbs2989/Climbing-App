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
const GENERIC = new Set("buttress buttresses face faces slab slabs tower towers dome domes cave caves arch arches pinnacle pinnacles cove point cliff cliffs ledge ledges bluff bluffs gorge pond ponds fork forks group right left side campus hall central inner outer east west first second third pullout".split(" "));
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
const kids = new Map(); for (const a of areas) { if (!kids.has(a.parent_id)) kids.set(a.parent_id, []); kids.get(a.parent_id).push(a); }
// An enclosing area small enough that its name still means ONE place (a state or a 1,500-route region does not).
const small = (p) => p && p.route_count <= 1500 && !["state", "country"].includes(p.area_type);
// SPREAD: how far apart an area's own crags lie (bbox diagonal, km). Above the parent, an area whose crags span
// more than 4 km is an umbrella ("Yosemite Valley Bouldering", "Anchorage & South Central Alaska"): a lot named
// after it ("Yosemite Falls Day Use Parking", "Anchorage Museum Parking Garage") says nothing about THIS crag.
const box = new Map(); for (const a of areas) { if (a.lat == null || a.lng == null || !crag[a.id]) continue; for (let p = a; p; p = byId.get(p.parent_id)) { const b = box.get(p.id) || [90, 180, -90, -180]; box.set(p.id, [Math.min(b[0], +a.lat), Math.min(b[1], +a.lng), Math.max(b[2], +a.lat), Math.max(b[3], +a.lng)]); } }
const spread = (p) => { const b = box.get(p.id); return b ? km(b[0], b[1], b[2], b[3]) : Infinity; };
// A lot named like a civic building or a numbered city lot is not where climbers park, whatever word it shares.
const CIVIC = /\b(garage|museum|university|college|school|hospital|library|church|mall|hotel|motel|casino|airport|cemetery|apartments?)\b|\blot \d+\b/i;
const VIA = ["own", "parent", "ancestor"];
function match(a) {
  if (a.lat == null || a.lng == null) return { why: "no crag coordinate" };
  const { out, missing } = candidates(a.lat, a.lng); if (missing) return { why: "tile not pulled" };
  // Rank 1 is the parent, rank 2 any smaller enclosing area above it ("Real Hidden Valley Circuit" < "Hidden Valley").
  const own = toks(a.name), anc = []; for (let p = byId.get(a.parent_id), k = 0; k < 4 && small(p); p = byId.get(p.parent_id), k++) if (!k || spread(p) <= 4) anc.push({ p, t: toks(p.name), rank: k ? 2 : 1 });
  let best = null;
  for (const e of out) {
    if (!e.name || e.lat == null || /^(private|no|customers)$/.test(e.access || "")) continue;
    if (e.name.length > 80 || SOURCEY.test(e.name) || CIVIC.test(e.name)) continue; // the app names no source (apply-crag-parking.mjs's rule)
    const d = km(a.lat, a.lng, e.lat, e.lng), et = toks(e.name);
    let rank = null, word = null; const w = shares(own, et, a.name, e.name);
    if (w && d <= 1.5) { rank = 0; word = w; } else if (!w && d <= 1.0) for (const x of anc) { const wp = x.t.size ? shares(x.t, et, x.p.name, e.name) : null; if (wp) { rank = x.rank; word = wp; break; } }
    if (rank == null) continue;
    if (!best || rank < best.rank || (rank === best.rank && (e.kind === "parking") > (best.e.kind === "parking")) || (rank === best.rank && e.kind === best.e.kind && d < best.d)) best = { e, d, rank, word };
  }
  return best ? { lat: +best.e.lat.toFixed(6), lng: +best.e.lng.toFixed(6), name: best.e.name.split(";")[0].trim() /* OSM lists alternates as "a;b" */, osm: best.e.t, km: best.d, via: VIA[best.rank], word: best.word, kind: best.e.kind } : { why: "no named lot matches" };
}
// SIBLING tier, for a crag no lot is named after: the lot its siblings (or its parent) already park at, if the
// crag is within 1 km of it AND no farther from it than those siblings are (+200 m). One pass, from lots assigned
// by name or by research — never from another sibling guess, so a guess cannot chain across a valley.
const lotKey = (L) => L.lat.toFixed(5) + "," + L.lng.toFixed(5);
function sibling(a, park) {
  if (a.lat == null || a.lng == null) return null;
  const par = byId.get(a.parent_id); if (!par || /builder/i.test(par.name)) return null; const lots = new Map(); // campus buildering: a sibling's "lot" was a bar's
  for (const k of [...(kids.get(a.parent_id) || []), par]) { if (k.id === a.id || k.lat == null || k.lng == null) continue; const L = park.get(k.id); if (!L) continue; const g = lots.get(lotKey(L)) || { L, maxD: 0, n: 0 }; g.maxD = Math.max(g.maxD, km(k.lat, k.lng, L.lat, L.lng)); g.n++; lots.set(lotKey(L), g); }
  // ...and never past a CLOSER mapped lot or trailhead: leave-one-out sent Bell Rock to Courthouse Vista with
  // Bell Rock Vista nearer. A closer lot may be the crag's own, so the crag is refused rather than guessed.
  let near = Infinity; for (const e of candidates(a.lat, a.lng).out) if (e.lat != null && !/^(private|no|customers)$/.test(e.access || "")) near = Math.min(near, km(a.lat, a.lng, e.lat, e.lng));
  let best = null;
  for (const g of lots.values()) { const d = km(a.lat, a.lng, g.L.lat, g.L.lng); if (d > 1.0 || d > g.maxD + 0.2 || d > near + 0.15) continue; if (!best || d < best.d || (d === best.d && g.n > best.n)) best = { ...g, d }; }
  return best && { lat: best.L.lat, lng: best.L.lng, name: best.L.name, km: best.d, via: "sibling", word: best.n + " kin", kind: "sibling" };
}
const dbPark = new Map(areas.filter((a) => a.parking_lat != null && a.parking_lng != null).map((a) => [a.id, { lat: +a.parking_lat, lng: +a.parking_lng, name: a.parking_name }]));
const targets = areas.filter((a) => crag[a.id]);
if (arg("--validate")) {
  const rd = arg("--validate"); const truth = fs.readdirSync(rd).filter((f) => f.endsWith(".json") && !f.includes("renamed")).flatMap((f) => JSON.parse(fs.readFileSync(path.join(rd, f), "utf8")));
  let agree = 0, differ = 0, none = 0; const rows = [];
  for (const t of truth) { const a = byId.get(t.area_id); if (!a) continue; const m = match(a); if (m.why) { none++; rows.push(`none   ${a.id}: ${m.why}`); continue; } const d = km(m.lat, m.lng, t.lat, t.lng); if (d <= 0.15) agree++; else differ++; rows.push(`${d <= 0.15 ? "agree " : "DIFFER"} ${a.id}: matched "${m.name}" ${d.toFixed(2)} km from researched "${t.name}"`); }
  console.log(rows.join("\n")); console.log(`validation vs research: ${agree} agree, ${differ} differ, ${none} unmatched`);
  // LEAVE-ONE-OUT for the sibling tier: hide each parked area's own lot, predict it from its kin, compare.
  // Over the research (the 47 lots) it tests the assumption itself; over everything parked it tests consistency.
  // A sibling matched through the SAME parent name shares its lot by construction, so the honest bucket is the
  // areas whose lot names THEM (it shares a distinctive word with their own name): there a sibling guess must find it.
  const ownIds = new Set([...dbPark].filter(([id, L]) => byId.has(id) && L.name && shares(toks(byId.get(id).name), toks(L.name), byId.get(id).name, L.name)).map(([id]) => id));
  const ids = new Set(truth.map((t) => t.area_id)); const loo = { research: [0, 0, 0], own: [0, 0, 0], all: [0, 0, 0] }; const miss = [];
  for (const [id, L] of dbPark) { const a = byId.get(id); if (!a || !crag[id]) continue; const park = new Map(dbPark); park.delete(id); const s = sibling(a, park); const k = ids.has(id) ? "research" : ownIds.has(id) ? "own" : "all", b = loo[k]; if (!s) { b[2]++; continue; } const ok = km(s.lat, s.lng, L.lat, L.lng) <= 0.15; b[ok ? 0 : 1]++; if (!ok && k !== "all") miss.push(`  ${a.name}: own "${L.name}" vs kin "${s.name}" (${km(s.lat, s.lng, L.lat, L.lng).toFixed(2)} km apart)`); }
  const fmt = ([y, d, x]) => `${y} agree, ${d} differ, ${x} no prediction`;
  console.log(`sibling leave-one-out — research: ${fmt(loo.research)} · own-name: ${fmt(loo.own)} · other parked: ${fmt(loo.all)}`); if (process.argv.includes("--misses")) console.log(miss.join("\n"));
  process.exit(0);
}
let n = 0; const why = {}, byVia = {}; const out = [];
for (const a of targets) { if (a.parking_lat != null) { why.already = (why.already || 0) + 1; continue; } const m = match(a); if (m.why) { why[m.why] = (why[m.why] || 0) + 1; continue; } n++; byVia[m.via] = (byVia[m.via] || 0) + 1; out.push({ area_id: a.id, area: a.name, routes: crag[a.id], ...m }); }
if (!process.argv.includes("--no-sibling")) {
  const park = new Map(dbPark); for (const m of out) park.set(m.area_id, m); const got = new Set(out.map((m) => m.area_id)); const sib = [];
  for (const a of targets) { if (a.parking_lat != null || got.has(a.id)) continue; const s = sibling(a, park); if (s) sib.push({ area_id: a.id, area: a.name, routes: crag[a.id], ...s }); }
  byVia.sibling = sib.length; n += sib.length; why["no named lot matches"] -= sib.length; out.push(...sib);
}
console.log(`${targets.length} crag areas: ${n} matched ${JSON.stringify(byVia)}, skipped ${JSON.stringify(why)}; routes covered ${out.reduce((s, x) => s + x.routes, 0)}`);
fs.writeFileSync(path.join(dir, "matches.json"), JSON.stringify(out, null, 0));
const sqlOut = arg("--sql"); if (sqlOut) { const esc = (s) => "'" + String(s).replace(/'/g, "''") + "'"; const st = ["begin;", ...out.map((m) => `update public.areas set parking_lat=${m.lat}, parking_lng=${m.lng}, parking_name=${esc(m.name)} where id=${esc(m.area_id)} and parking_lat is null;`), "commit;"]; fs.writeFileSync(sqlOut, st.join("\n") + "\n"); console.log("wrote " + sqlOut); }
