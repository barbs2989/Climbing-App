// FILL A CAMP'S MISSING ELEVATION FROM PUBLIC RECORDS: named place -> OSM coordinate -> USGS DEM.
//
// 1,763 bivy sites carry no elevation, which is 230 distinct names. No agent is involved: each
// site is located from a public gazetteer and gates decide whether the answer is usable.
//
// PROVEN BY CONTROL BEFORE USE. probe-camp-elev-control.mjs runs four places of known height
// through this exact path — one researched independently, three already in this catalog from the
// waypoint store — and reproduces all four within 68 ft. That matters because the expected output
// here is "a plausible elevation", which is also what a broken pipeline emits.
//
// WHAT IT REFUSES, and the refusals are the point:
//   - a DISPERSED ZONE. "Informal snow and rock bivouacs above the basins" has no single height;
//     a number there invents precision the record cannot carry. Same class as a straight line
//     posing as a trail distance.
//   - a MULTI-PLACE entry. "Lyman Lakes and Cloudy Pass" has two heights and picking one silently
//     is worse than leaving it blank.
//   - a namesake. Every search is BOUNDED to a box around the route's own peak, because this
//     catalog has two Lena Lakes, two Horseshoe Basins and three Mount Olympuses, and a name is
//     not an identity.
//   - an answer that contradicts the row: above the route's own high point, or absurd for WA.
//   - AMBIGUITY: several same-named features in the box at materially different heights.
//
// Read-only by default; --apply writes, strict-coalesce (blank cells only), and re-reads.
import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first"); // AAAA records here are unroutable; see the control probe.
import fs from "fs";
import { SUPABASE_URL, anonKey, headers, requireServiceKey } from "../lib/supabase-env.mjs";
import { elevationAt } from "../lib/terrain.mjs";

const APPLY = process.argv.includes("--apply");
const LIMIT = Number((process.argv.find((a) => a.startsWith("--limit=")) || "--limit=9999").split("=")[1]);
const OUT = "camp-elevation-proposals.json";
const UA = "ClimbMatch-camp-elevation/1.0 (climbing route catalog; contact via repo)";
const WA_BOX = { minLat: 45.5, maxLat: 49.05, minLng: -124.9, maxLng: -116.9 };
const ro = headers(anonKey());

const q = async (p) => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${p}`, { headers: ro });
  if (!r.ok) { console.log(`FAIL: read failed (${r.status})`); process.exit(1); }
  return r.json();
};
const rows = await q("routes?select=id,area_id,high_point_ft,bivy&bivy=not.is.null&limit=1000");
if (!rows.length) { console.log("FAIL: read nothing — an empty run proves nothing"); process.exit(1); }
const areaIds = [...new Set(rows.map((x) => x.area_id).filter(Boolean))];
const areaOf = new Map();
for (let i = 0; i < areaIds.length; i += 150) {
  const chunk = areaIds.slice(i, i + 150).map((x) => `"${x}"`).join(",");
  for (const a of await q(`areas?select=id,lat,lng,path&id=in.(${chunk})`)) areaOf.set(a.id, a);
}
if (!areaOf.size) { console.log("FAIL: no area coordinates — every search would be unbounded"); process.exit(1); }

// THE WAYPOINT STORE IS AN INDEPENDENT SECOND RECORD, and it is used as a GATE rather than as a
// source. Where a campsite waypoint of the same name exists, it was placed by a different method
// entirely (an earlier OSM-by-id pass, or enrichment), so:
//   agreement    -> two independent methods concur; write with confidence
//   disagreement -> one of them is wrong, and picking silently is exactly the failure this whole
//                   script exists to avoid. REFUSE and report it for a human.
// That is the audit:trailhead-agreement discipline: a route storing one fact twice is a free
// consistency check, and a disagreement is evidence, not noise.
const wpRows = await q("routes?select=id,area_id,waypoints&waypoints=not.is.null&limit=1000");
const arr = (v) => (Array.isArray(v) ? v : []);
const has = (v) => v != null && String(v).trim() !== "";
const ftOf = (b) => (has(b.elev) ? Number(b.elev) : has(b.elevM) ? Number(b.elevM) * 3.28084 : null);
const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();

// A dispersed zone has no point to look up. These words say "somewhere around here", not "here".
const ZONE = /\b(dispersed|informal|improvised|bivies|bivouacs|pullouts|cross-country|anywhere|various|scattered|numerous|several|wherever|on-wall|ledges|benches|meadows|camps|sites)\b/i;
// Two places joined. " and " between two capitalised names, or a slash.
// "Apex Pass and the high ground west of Wolframite" names two places and the second one is not
// capitalised, so requiring a capital after "and" let it through. Erring toward refusal is right
// here: a wrong single number is worse than a blank.
const MULTI = /\b\w+\s+and\s+([A-Z]|the\s+\w+)|\//;

// The searchable place is the FIRST clause: "Shield Lake, north of Prusik Pass" -> "Shield Lake".
// Everything after a comma or dash in these entries is a locator, not part of the name.
const placeOf = (name) => String(name || "").split(/[,—–(]|\s-\s/)[0].trim();
// Landform, direction and camp words describe a place without NAMING one. A name built only from
// these ("basin below the east peak") identifies nothing.
const RELATIVE = new Set(["basin", "below", "above", "east", "west", "north", "south", "middle",
  "upper", "lower", "the", "peak", "camp", "camps", "campsite", "bivy", "bivouac", "ridge", "creek",
  "lake", "lakes", "col", "pass", "saddle", "glacier", "high", "low", "under", "near", "beside",
  "valley", "meadow", "meadows", "side", "face", "summit", "top", "base", "and", "of", "at", "on"]);
const distinctiveTokens = (x) => new Set(norm(x).split(" ").filter((t) => t.length > 2 && !RELATIVE.has(t)));
const pickType = (withElev) => String((withElev[0] && withElev[0].h && withElev[0].h.type) || "");
/* THE PLACE IS OFTEN A LEADING PROPER NOUN WITH A DESCRIPTION TRAILING IT, and searching the
   whole string finds nothing: "Reflection Lakes area winter snow camp" is Reflection Lakes,
   "Paradise designated winter group camping area" is Paradise, "Luna Cirque floor" is Luna
   Cirque. Take the run of Capitalised words at the front (allowing lowercase joiners like "of"
   and "the"), which is what a gazetteer actually holds. */
const leadingProper = (name) => {
  const toks = String(name || "").trim().split(/\s+/);
  const out = [];
  for (const t of toks) {
    if (/^[A-Z][A-Za-z'’.-]*$/.test(t)) out.push(t);
    else if (out.length && /^(of|the|and|de|la)$/i.test(t)) out.push(t);
    else break;
  }
  while (out.length && /^(of|the|and|de|la)$/i.test(out[out.length - 1])) out.pop();
  return out.join(" ");
};
/* A SUMMIT'S HEIGHT IS NOT ITS BASIN'S. Once the leading-proper-noun search is allowed, a name
   like "Amphitheater Mountain upper basin" can match the MOUNTAIN — and writing the summit
   elevation for a camp in the basin below it is a wrong number that looks like a right one.
   So: if the entry names a sub-feature, a `peak` match is refused. */
/* THE TRAILING DESCRIPTION IS NOT NOISE — IT SAYS WHICH PART OF THE FEATURE YOU MEAN, and that
   is precisely what leadingProper() throws away. Measured on the first run that used it, 5 of 11
   results were wrong in exactly this way:
     "Iron Peak saddle dry camp"  -> Iron Peak's SUMMIT, 6,504 ft
     "Liberty Cap saddle"         -> Liberty Cap's SUMMIT, 14,118 ft
     "Goode Glacier moraine"      -> the GLACIER, which spans thousands of feet
     "Curtis Ridge camp"          -> Curtis Ridge, an arete running ~7,000-12,000 ft on Rainier
   The first draft guarded only the `peak` TYPE against a word list that omitted `saddle`, and the
   linear set omitted `arete` and `glacier`. A deny-list beaten by one more adjective, twice in
   one change — so the rule is now structural rather than type-specific: if anything follows the
   leading proper noun that names a PART of it, the leading-noun search is not offered at all.
   Camp words are exempt, because "X camp" is the camp at X rather than a different part of X. */
const SUBFEATURE = /\b(basin|floor|tarns?|cirque|meadows?|valley|bench(es)?|lakes?|creek|below|under|beneath|saddle|col|notch|shoulder|spur|moraine|shelf|gully|couloir|face|buttress|slopes?|flank|headwall|bowl|glacier|ridge|arete|crest|summit|toe|snout)\b/i;

async function nominatim(name, box) {
  const u = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=10&viewbox=${box.minLng},${box.maxLat},${box.maxLng},${box.minLat}&bounded=1&q=${encodeURIComponent(name)}`;
  for (let t = 0; t < 3; t++) {
    try {
      const r = await fetch(u, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: AbortSignal.timeout(25000) });
      if (r.ok) return await r.json();
    } catch { /* retried */ }
    await new Promise((s) => setTimeout(s, 1200 * (t + 1)));
  }
  return null;
}

const CROSS_FT = 400; // wider than the controls' worst miss (68 ft) by a large margin, so this
                      // fires on a real disagreement rather than on DEM sampling noise.
const region = (id) => String((areaOf.get(id) || {}).path || "").split(".").slice(0, 4).join(".");
const NOISE = /\b(the|a|an|and|at|on|in|of|for|from|to)\b/g;
const core = (x) => norm(x).replace(NOISE, " ").replace(/\s+/g, " ").trim();
/* "X Camp" is the camp AT X, so a trailing generic camp word must not break an identity match:
   "Pelton Basin" was refused while the catalog held "Pelton Basin Camp" at 5,400 ft.
   This strips only CAMP words, never a FEATURE TYPE — which is the whole distinction the loose
   token gate got wrong. Checked against the known-bad pairs: "Whatcom Camp" -> "whatcom" still
   does not equal "Whatcom Pass" -> "whatcom pass"; "Luna Camp" -> "luna" still does not equal
   "Luna Cirque floor"; "Whitehorse Ridge Camp" -> "whitehorse ridge" still does not equal
   "Whitehorse Community Park campground" -> "whitehorse community park". */
const CAMPWORD = /\s+(camp|camps|campsite|campsites|campground|camp site)$/;
const ident = (x) => { let v = core(x); let prev; do { prev = v; v = v.replace(CAMPWORD, ""); } while (v !== prev); return v; };

const wpElev = new Map();     // core name -> [elevations]              (the CROSS-CHECK index)
const wpByRegion = new Map(); // core name + "|" + region -> [{elev,from}]  (the DONOR index)
for (const row of arr(wpRows)) {
  const reg = region(row.area_id);
  for (const w of arr(row.waypoints)) {
    if (!/camp|bivy|bivouac/i.test(String((w && w.type) || ""))) continue;
    const e = ftOf(w);
    if (e == null || !has(w.name)) continue;
    const k = ident(String(w.name).split(/[,—–(]/)[0]);
    if (!wpElev.has(k)) wpElev.set(k, []);
    wpElev.get(k).push(e);
    const rk = k + "|" + reg;
    if (!wpByRegion.has(rk)) wpByRegion.set(rk, []);
    wpByRegion.get(rk).push({ elev: e, from: row.id });
  }
}

/* THE SECOND SOURCE, and it answers what OSM cannot. A backcountry basin is often unmapped —
   "Pelton Basin", "Park Lakes Basin", "Cameron Basin" all failed the gazetteer — while a climber
   or an earlier enrichment pass recorded the same place as a campsite WAYPOINT with a height.
   That store is 98% populated, and it was measured and then not used on the first pass.
   The gate is IDENTITY, never token overlap. The loose version of this accepted 855 rows and was
   mostly wrong: it gave a town park in Darrington a ridge camp's 4,900 ft, and "Luna Cirque
   floor" the valley height of "Luna Camp", because it treated `pass`, `camp`, `lake` and `basin`
   as generic noise when they are FEATURE TYPES THAT DISCRIMINATE. Whatcom Pass and Whatcom Camp
   are two places sharing a proper noun. Identity matching takes 855 -> 151. */
function donorFor(w) {
  const reg = w.regions;
  const d = ident(w.place), full = ident(w.display);
  const out = [];
  for (const r of reg) {
    for (const k of [full, d]) {
      const hits = wpByRegion.get(k + "|" + r);
      if (hits) out.push(...hits);
    }
  }
  return out;
}

// Collect the distinct work, and remember every (route, index) each name answers.
const work = new Map();
for (const row of rows) {
  const area = areaOf.get(row.area_id);
  arr(row.bivy).forEach((b, i) => {
    if (ftOf(b) != null || !has(b.name)) return;
    if (!area || !has(area.lat) || !has(area.lng)) return;
    const key = norm(b.name);
    if (!work.has(key)) work.set(key, { display: b.name, place: placeOf(b.name), sites: [], regions: new Set(), lat: Number(area.lat), lng: Number(area.lng) });
    work.get(key).regions.add(region(row.area_id));
    work.get(key).sites.push({ routeId: row.id, idx: i, hp: has(row.high_point_ft) ? Number(row.high_point_ft) : null });
  });
}
console.log(`${work.size} distinct names with no elevation, covering ${[...work.values()].reduce((a, w) => a + w.sites.length, 0)} rows\n`);

const solved = [], refused = [];
let n = 0;
for (const [, w] of [...work.entries()].sort((a, b) => b[1].sites.length - a[1].sites.length)) {
  if (n >= LIMIT) break;
  const rej = (why) => refused.push({ name: w.display, rows: w.sites.length, why });
  if (ZONE.test(w.display)) { rej("dispersed zone — no single height exists"); continue; }
  if (MULTI.test(w.display)) { rej("names more than one place"); continue; }
  if (norm(w.place).split(" ").length < 2) { rej(`"${w.place}" is not a distinctive place name`); continue; }
  // A PURELY RELATIVE NAME IS NOT AN IDENTITY. "Basin below the east peak" has five words and no
  // proper noun, so it denotes a DIFFERENT PLACE on every peak that has an east summit — and the
  // region gate cannot separate them, because one region holds many peaks. A word count passes it;
  // only asking for a distinctive token catches it. Found because the donor path returned exactly
  // this name and the row would have taken another mountain's basin height.
  if (!distinctiveTokens(w.place).size) { rej(`"${w.place}" is purely relative — no proper noun to identify a place`); continue; }
  n++;
  // ~25 km box around the route's own peak. This is the namesake gate and it is structural.
  const d = 0.25;
  const box = { minLat: w.lat - d, maxLat: w.lat + d, minLng: w.lng - d * 1.5, maxLng: w.lng + d * 1.5 };
  let wideUsed = false, wideAmbig = 0;
  /* A NAMED POINT WITH A LANDFORM WORD APPENDED IS STILL THAT POINT. "Cutthroat Lake basin",
     "Scatter Lake basin", "Twin Lakes basin" all failed the gazetteer, because OSM maps the LAKE,
     not the basin around it — and you camp at the lake. A lake surface is flat, so its elevation
     is well defined, which is the same property that made the Shield Lake control agree to 7 ft.
     Only POINT-LIKE tails are stripped. `creek`, `ridge` and `valley` are deliberately absent:
     those are LINEAR, so the parent feature has no single height and stripping to them would
     reintroduce exactly the defect the linear gate exists to stop. */
  const TAIL = /\s+(basin|floor|tarns?|area|bench(es)?|shelf|cirque)$/i;
  const alt = TAIL.test(w.place) ? w.place.replace(TAIL, "").trim() : null;
  const lead = leadingProper(w.place);
  // What is LEFT after the proper noun decides whether the proper noun alone is the right query.
  const rest = lead ? String(w.place).slice(lead.length) : "";
  const leadOk = lead && lead !== w.place && lead !== alt && distinctiveTokens(lead).size
    && norm(lead).split(" ").length >= 2 && !SUBFEATURE.test(rest);
  const candidates = [w.place]
    .concat(alt && distinctiveTokens(alt).size ? [alt] : [])
    .concat(leadOk ? [lead] : []);
  let hits = null, usedPlace = w.place;
  for (const cand of candidates) {
    hits = await nominatim(cand, box);
    await new Promise((s) => setTimeout(s, 1100)); // Nominatim asks for <= 1 req/sec.
    if (hits && hits.some((h) => norm(h.name) === norm(cand))) { usedPlace = cand; break; }
  }
  if (hits == null) { rej("gazetteer unreachable — NOT the same as unmapped"); continue; }
  let exact = hits.filter((h) => norm(h.name) === norm(usedPlace));
  /* SOME CAMPS ARE LEGITIMATELY FAR FROM THE PEAK. "Squire Creek Park & Campground",
     "Whitehorse Community Park campground, Darrington" and "Dailey Prairie road end" are
     drive-to staging in the valley — a 25 km box around the summit can never reach them, and
     that is not a namesake problem, it is the wrong search area.
     Widening the box would reopen the namesake hole the box exists to close, so the statewide
     retry is gated on UNIQUENESS instead: accept only if EXACTLY ONE feature of that name exists
     in Washington. One match cannot be the wrong one of several. Two or more and it refuses,
     which is the same rule the peak box enforces by geometry. */
  if (!exact.length) {
    for (const cand of candidates) {
      const wide = await nominatim(cand, WA_BOX);
      await new Promise((s) => setTimeout(s, 1100));
      if (!wide) continue;
      const ex = wide.filter((h) => norm(h.name) === norm(cand));
      if (ex.length === 1) { exact = ex; usedPlace = cand; wideUsed = true; break; }
      if (ex.length > 1) { wideAmbig = ex.length; }
    }
  }
  if (!exact.length) {
    // Fall back to the catalog's own waypoint record for the same place in the same region.
    const dn = donorFor(w);
    if (dn.length) {
      const spread = Math.max(...dn.map((x) => x.elev)) - Math.min(...dn.map((x) => x.elev));
      if (spread > CROSS_FT) { rej(`waypoint donors disagree by ${Math.round(spread)} ft — ambiguous, not guessed`); continue; }
      const de = Math.round(dn[0].elev);
      const hpD = w.sites.map((x) => x.hp).filter((x) => x != null);
      const worstD = hpD.length ? Math.min(...hpD) : null;
      if (worstD != null && de > worstD + 200) { rej(`donor ${de} ft is above the lowest recipient high point (${worstD} ft)`); continue; }
      solved.push({ name: w.display, place: w.place, elev: de, lat: null, lng: null, osmType: "waypoint",
        osmName: `catalog waypoint on ${dn[0].from}`, corroborated: true, source: "waypoint",
        rows: w.sites.length, sites: w.sites });
      continue;
    }
    rej(wideAmbig ? `${wideAmbig} features named "${w.place}" in WA — ambiguous statewide, not guessed` : `no feature named "${w.place}" anywhere in WA`);
    continue;
  }

  const withElev = [];
  for (const h of exact.slice(0, 4)) {
    const g = await elevationAt(Number(h.lat), Number(h.lon));
    if (g != null) withElev.push({ h, g });
  }
  if (!withElev.length) { rej("no DEM elevation at the located coordinate"); continue; }
  const spread = Math.max(...withElev.map((x) => x.g)) - Math.min(...withElev.map((x) => x.g));
  if (withElev.length > 1 && spread > 500) { rej(`${withElev.length} same-named features ${Math.round(spread)} ft apart — ambiguous, not guessed`); continue; }
  // A LINEAR OR SPRAWLING FEATURE HAS NO SINGLE HEIGHT, and its label node sits at an arbitrary
  // point along it. "West Fork Agnes Creek" matched a `stream`: a creek drops thousands of feet
  // over its length, so the DEM at wherever OSM chose to hang the name says nothing about where a
  // camp beside it is. Same for a path, a valley or a ridge.
  // A LAKE is deliberately NOT in this list — a lake surface is flat, so its centroid elevation
  // IS its elevation, which is why the Shield Lake control agreed to 7 ft.
  // The exception is corroboration: if the catalog's own waypoint independently agrees, the
  // feature type no longer matters, because two methods have converged on the same height.
  if (/^(peak|mountain|volcano)$/i.test(pickType(withElev)) && SUBFEATURE.test(w.display)) {
    rej(`matched the SUMMIT (${pickType(withElev)}) for a name describing ground below it — a peak's height is not its basin's`);
    continue;
  }
  const LINEAR = new Set(["stream", "river", "path", "track", "valley", "ridge", "wood", "forest",
    "cliff", "canal", "arete", "glacier", "moraine", "gully", "couloir", "spur", "crest"]);
  const crossEarly = wpElev.get(norm(w.place)) || [];
  if (LINEAR.has(String(pickType(withElev)) ) && !crossEarly.some((e) => Math.abs(e - Math.round(withElev[0].g)) <= CROSS_FT)) {
    rej(`located only a ${pickType(withElev)} — a linear feature has no single height`);
    continue;
  }
  const pick = withElev[0];
  const elev = Math.round(pick.g);
  if (elev < 100 || elev > 14500) { rej(`${elev} ft is outside any plausible WA range`); continue; }
  const hp = w.sites.map((s) => s.hp).filter((x) => x != null);
  const worst = hp.length ? Math.min(...hp) : null;
  if (worst != null && elev > worst + 200) { rej(`${elev} ft is above the lowest recipient route's high point (${worst} ft)`); continue; }
  // Cross-check against the independent waypoint record, where one exists.
  const cross = wpElev.get(ident(usedPlace)) || wpElev.get(ident(w.place)) || [];
  const near = cross.filter((e) => Math.abs(e - elev) <= CROSS_FT);
  if (cross.length && !near.length) {
    rej(`DISAGREES with the catalog's own waypoint (${cross.map((x) => Math.round(x)).join("/")} ft vs DEM ${elev} ft) — one is wrong, not guessing`);
    continue;
  }
  solved.push({ name: w.display, place: usedPlace, elev, lat: Number(pick.h.lat), lng: Number(pick.h.lon),
    osmType: pick.h.type, osmName: pick.h.display_name, corroborated: near.length > 0, source: wideUsed ? "dem-wide" : "dem",
    rows: w.sites.length, sites: w.sites });
}

solved.sort((a, b) => b.rows - a.rows);
console.log(`SOLVED ${solved.length} name(s), ${solved.reduce((a, x) => a + x.rows, 0)} row(s)\n`);
solved.forEach((s) => console.log(`   ${String(s.rows).padStart(3)} row(s)  ${String(s.elev).padStart(6)} ft  ${(s.source === "waypoint" ? "WAYPT " : s.corroborated ? "CORROB" : "dem   ")}  ${String(s.osmType).padEnd(11)} "${s.name.slice(0, 46)}"`));
console.log(`\n   located as (read these — a right name on the wrong feature is the live risk):`);
solved.slice(0, 20).forEach((s) => console.log(`      ${String(s.elev).padStart(6)} ft  ${String(s.osmName || "").slice(0, 96)}`));

const byWhy = new Map();
for (const r of refused) byWhy.set(r.why.replace(/".*?"/g, "…").replace(/\d+/g, "N"), (byWhy.get(r.why.replace(/".*?"/g, "…").replace(/\d+/g, "N")) || 0) + 1);
console.log(`\nREFUSED ${refused.length} name(s) — grouped:`);
[...byWhy.entries()].sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`   ${String(v).padStart(3)}  ${k}`));

fs.writeFileSync(OUT, JSON.stringify({ solved, refused }, null, 2));
console.log(`\nwrote ${OUT}`);

if (!APPLY) { console.log("\ndry run — pass --apply to write"); process.exit(0); }

// ---- WRITE. Strict coalesce: only a blank cell is filled, so a climber's contribution or a
// parallel session's enrichment can never be overwritten.
const svc = headers(requireServiceKey());
let patched = 0, skipped = 0;
const byRoute = new Map();
for (const s of solved) for (const site of s.sites) {
  if (!byRoute.has(site.routeId)) byRoute.set(site.routeId, []);
  byRoute.get(site.routeId).push({ idx: site.idx, elev: s.elev });
}
for (const [routeId, edits] of byRoute) {
  const cur = (await q(`routes?select=id,bivy&id=eq.${encodeURIComponent(routeId)}`))[0];
  if (!cur) { console.log(`  MISSING ${routeId}`); continue; }
  const bivy = arr(cur.bivy).map((b) => ({ ...b }));
  let touched = 0;
  for (const e of edits) {
    const b = bivy[e.idx];
    if (!b) continue;
    if (ftOf(b) != null) { skipped++; continue; } // filled since the read — leave it alone
    b.elev = e.elev;
    touched++;
  }
  if (!touched) continue;
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?id=eq.${encodeURIComponent(routeId)}`, {
    method: "PATCH", headers: { ...svc, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({ bivy }),
  });
  const back = r.ok ? await r.json() : null;
  if (!r.ok || !Array.isArray(back) || back.length !== 1) { console.log(`  FAILED ${routeId} (${r.status})`); continue; }
  patched += touched;
}
console.log(`\npatched ${patched} site(s); ${skipped} already filled and left alone`);

// Re-read through the ANON role and count what actually changed. A 200 is not evidence.
let confirmed = 0;
for (const [routeId] of byRoute) {
  const cur = (await q(`routes?select=bivy&id=eq.${encodeURIComponent(routeId)}`))[0];
  for (const b of arr(cur && cur.bivy)) if (ftOf(b) != null) confirmed++;
}
console.log(`re-read: ${confirmed} site(s) on those routes now carry an elevation`);
