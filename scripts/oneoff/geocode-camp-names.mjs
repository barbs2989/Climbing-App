// CAN A CAMP BE JUDGED AGAINST ITS ROUTE WITHOUT NAMING A PEAK?
//
// audit:camp-route-fit under-reports its own class: it can only judge a camp whose name carries a
// distinctive UNIQUE peak, so on Mount Pilchuck it catches "Three Fingers Lookout" and is blind to
// "Tin Can Gap", "Goat Flats" and "Saddle Lake" — seven foreign camps, one finding.
//
// A camp's own COORDINATE would need no peak name at all. This measures whether one can be
// obtained honestly. It writes nothing; it produces the distance x elevation grid so the precision
// can be judged before anything is promoted — the audit:area-parents standard (41 findings, 12
// real), which this repo pays for whenever it is skipped.
//
// FOUR GATES, and the geocode is only usable when all four hold:
//   1. the NAME resolves at all (camp-names.mjs: not a dispersed zone, not multi-place)
//   2. EXACTLY ONE feature of that name exists in Washington. The solver bounds its search to a
//      box around the route's own peak precisely because a name is not an identity — but that box
//      is the wrong instrument here, since a genuinely FOREIGN camp lies outside it and would
//      simply not be found. Statewide search reopens the namesake risk, and uniqueness is what
//      closes it: one match cannot be the wrong one of several.
//   3. NOT a linear/sprawling feature. A label node on a ridge hangs at an arbitrary point along
//      it, so a distance to it carries the length of the ridge as error.
//   4. the DEM under that coordinate AGREES with the elevation the row already stores. This is the
//      load-bearing one: it is an independent record neither the name nor the gazetteer produced,
//      and a namesake elsewhere in the state would have to coincidentally match the height too.
import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first"); // AAAA records here are unroutable.
import fs from "fs";
const ROOT = "/Users/nathanbarber/dev/Climbing-App/.claude/worktrees/camping-section-and-nearby-peaks";
const { SUPABASE_URL, anonKey, headers } = await import(`${ROOT}/scripts/lib/supabase-env.mjs`);
const { unresolvable, searchCandidates, LINEAR } = await import(`${ROOT}/scripts/lib/camp-names.mjs`);
const { elevationAt } = await import(`${ROOT}/scripts/lib/terrain.mjs`);

const CACHE = new URL("../../.camp-geocode-cache.json", import.meta.url).pathname; // gitignored
const UA = "ClimbMatch-camp-fit/1.0 (climbing route catalog; contact via repo)";
const WA_BOX = { minLat: 45.5, maxLat: 49.05, minLng: -124.9, maxLng: -116.9 };
const CROSS_FT = 400; // the solver's own figure: far wider than the controls' worst miss (68 ft).

const H = headers(anonKey());
const q = async (p) => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${p}`, { headers: H });
  if (!r.ok) { console.log(`FAIL: read failed (${r.status})`); process.exit(1); }
  return r.json();
};

const rows = await q("routes?select=id,name,area_id,high_point_ft,bivy&bivy=not.is.null&id=like.wa_*&limit=2000");
if (!rows.length) { console.log("FAIL: read nothing — an empty run proves nothing"); process.exit(1); }
const areaIds = [...new Set(rows.map((x) => x.area_id).filter(Boolean))];
const areaOf = new Map();
for (let i = 0; i < areaIds.length; i += 150) {
  const chunk = areaIds.slice(i, i + 150).map((x) => `"${x}"`).join(",");
  for (const a of await q(`areas?select=id,name,lat,lng&id=in.(${chunk})`)) areaOf.set(a.id, a);
}
if (!areaOf.size) { console.log("FAIL: no area coordinates — nothing to measure a distance against"); process.exit(1); }

const arr = (v) => (Array.isArray(v) ? v : []);
const cache = fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, "utf8")) : {};
const save = () => fs.writeFileSync(CACHE, JSON.stringify(cache, null, 1));

async function nominatim(name) {
  const u = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=20&viewbox=${WA_BOX.minLng},${WA_BOX.maxLat},${WA_BOX.maxLng},${WA_BOX.minLat}&bounded=1&q=${encodeURIComponent(name)}`;
  for (let t = 0; t < 3; t++) {
    try {
      const r = await fetch(u, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: AbortSignal.timeout(25000) });
      if (r.ok) return await r.json();
    } catch { /* retried */ }
    await new Promise((s) => setTimeout(s, 1200 * (t + 1)));
  }
  return null;
}

// Collect distinct names and the pairs each covers.
const byName = new Map();
for (const r of rows) for (const b of arr(r.bivy)) {
  if (!b || !b.name) continue;
  if (!byName.has(b.name)) byName.set(b.name, []);
  byName.get(b.name).push({ route: r.id, routeName: r.name, area: r.area_id, high: r.high_point_ft, elev: b.elev });
}

const names = [...byName.keys()].filter((n) => !unresolvable(n));
console.log(`geocoding ${names.length} distinct names (statewide, uniqueness-gated)...`);

let done = 0;
for (const name of names) {
  if (cache[name]) { done++; continue; }
  const cands = searchCandidates(name);
  let rec = { ok: false, why: "no candidate produced a unique match" };
  for (const cand of cands) {
    const hits = await nominatim(cand);
    await new Promise((s) => setTimeout(s, 1100)); // nominatim asks for <=1 req/sec.
    if (!hits) { rec = { ok: false, why: "gazetteer unreachable" }; break; }
    if (!hits.length) continue;
    // UNIQUENESS: collapse hits that are the same place (within 500 m) before counting, or a
    // feature mapped as both a node and a way reads as two places and is refused for no reason.
    const uniq = [];
    for (const h of hits) {
      const la = Number(h.lat), ln = Number(h.lon);
      if (!isFinite(la) || !isFinite(ln)) continue;
      if (!uniq.some((u) => Math.hypot((u.lat - la) * 111, (u.lng - ln) * 74) < 0.5)) uniq.push({ lat: la, lng: ln, type: h.type, cls: h.class, name: h.display_name });
    }
    if (uniq.length !== 1) { rec = { ok: false, why: `${uniq.length} distinct features of that name in WA` }; continue; }
    const one = uniq[0];
    if (LINEAR.has(String(one.type))) { rec = { ok: false, why: `linear/sprawling feature (${one.type}) — its label point is arbitrary` }; continue; }
    rec = { ok: true, lat: one.lat, lng: one.lng, type: one.type, cls: one.cls, via: cand, display: one.name };
    break;
  }
  cache[name] = rec;
  done++;
  if (done % 25 === 0) { save(); console.log(`   ${done}/${names.length}`); }
}
save();

// DEM cross-check for the resolved ones, once per name.
const need = names.filter((n) => cache[n].ok && cache[n].dem === undefined);
console.log(`\nreading the DEM under ${need.length} resolved coordinates...`);
for (const n of need) {
  try { cache[n].dem = await elevationAt(cache[n].lat, cache[n].lng); }
  catch { cache[n].dem = null; }
  await new Promise((s) => setTimeout(s, 120));
}
save();

const resolved = names.filter((n) => cache[n].ok);
console.log(`\nresolved to a unique WA feature : ${resolved.length} / ${names.length}`);
const whys = new Map();
for (const n of names) if (!cache[n].ok) whys.set(cache[n].why, (whys.get(cache[n].why) || 0) + 1);
for (const [w, c] of [...whys].sort((a, b) => b[1] - a[1]).slice(0, 8)) console.log(`   ${String(c).padStart(4)}  ${w}`);
console.log(`\nwrote ${CACHE}`);
