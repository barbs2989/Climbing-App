// import-mp-grades.mjs — bring Mountain Project's ice / mixed / aid grades into the catalog, from
// the CSV exports scripts/pipeline/fetch-mp-ice-mixed-aid.mjs cached under catalog/_mp/ (fetched
// under the owner's licence from onX). ONLY FACTS are used: name, location path, grade, type,
// pitches, length. No description text exists in the export and none is written.
//
// For each exported route:
//   1. Place it: descend OUR area tree from the state row by the export's location path, one name
//      per level — the same rule import-ice-wi.mjs uses, since our areas came from OpenBeta, which
//      came from this site. A level with zero or several same-named children refuses the route.
//   2. MATCHED to an existing route (same area, same name): fill ice_grade / aid_grade and the
//      per-scale numbers (0206) where they are EMPTY. An existing grade is never overwritten.
//   3. NOT in our catalog but its area resolves: add it, discipline from the export's type.
//   4. Anything else is refused and counted by reason.
// Grade numbers come from lib/grade.js gradeNumFrom — the single parser.
//
//   node scripts/pipeline/import-mp-grades.mjs colorado            # dry run
//   node scripts/pipeline/import-mp-grades.mjs --all --apply       # write + read back
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { requireServiceKey, SUPABASE_URL } from "../lib/supabase-env.mjs";
import { gradeNumFrom } from "../../lib/grade.js";

const args = process.argv.slice(2);
const APPLY = args.includes("--apply"), ALL = args.includes("--all"), SAMPLE = args.includes("--sample"), CREATE = args.includes("--create-areas");
const KEY = requireServiceKey();
const H = { apikey: KEY, Authorization: "Bearer " + KEY, "Content-Type": "application/json" };
const DIR = "catalog/_mp";
const norm = s => String(s || "").normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/&#0?39;|&apos;/g, "'").replace(/&amp;/g, "&").trim().toLowerCase();
// Area names only: our Adirondack areas carry sorting prefixes ("D: Keene Valley and Chapel Pond",
// "* Adirondack Ice & Mixed") that the export's location path does not.
const areaNorm = s => norm(s).replace(/^(?:[a-z]\s*:\s*|\*\s*)/, "").trim();
const slug = s => ((s || "x").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 55) || "x");
const q = s => "'" + String(s).replace(/'/g, "''") + "'";

function sql(text, tries = 4) {
  for (let i = 0; ; i++) {
    try {
      const out = execFileSync("npx", ["supabase", "db", "query", "--linked", text], { encoding: "utf8", maxBuffer: 1024 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] });
      const j = JSON.parse(out.slice(out.indexOf("{")));
      if (!Array.isArray(j.rows)) throw new Error("unexpected output: " + out.slice(0, 200));
      return j.rows;
    } catch (e) { if (i >= tries - 1) throw e; execFileSync("sleep", [String(5 * (i + 1))]); }
  }
}

// Retries a NETWORK failure ("fetch failed" — seen on three states across two runs) and never an
// HTTP error, which is a real answer. An insert that landed before the connection dropped fails its
// retry on the primary key and the run stops loudly; a re-run then finds the row as existing.
async function fetchRetry(url, opts, tries = 4) {
  for (let i = 0; ; i++) {
    try { return await fetch(url, opts); }
    catch (e) { if (i >= tries - 1) throw e; await new Promise(r => setTimeout(r, 3000 * (i + 1))); }
  }
}

// Minimal RFC-4180 CSV parser (quoted fields, doubled quotes, commas inside quotes).
function parseCsv(text) {
  const rows = []; let row = [], f = "", inq = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inq) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else inq = false; } else f += c; }
    else if (c === '"') inq = true;
    else if (c === ",") { row.push(f); f = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(f); f = ""; if (row.length > 1) rows.push(row); row = []; }
    else f += c;
  }
  if (f || row.length) { row.push(f); if (row.length > 1) rows.push(row); }
  const [head, ...body] = rows;
  return body.map(r => Object.fromEntries(head.map((h, i) => [h, r[i]])));
}

// The ice / mixed / aid / rock tokens inside a rating like "5.8 AI3", "WI4 M5", "5.9 A2", "Easy 5th WI3-4".
const TOK = { wi: /\b(?:WI|AI)\d(?:[+-]|-\d)?/, m: /\bM\d+(?:[+-]|-\d+)?/, aid: /\b[AC]\d(?:[+-]|-\d)?/, yds: /\b5\.\d+[abcd]?(?:\/[abcd])?[+-]?/ };
function tokens(rating) {
  const out = {};
  for (const [s, rx] of Object.entries(TOK)) { const m = String(rating || "").match(rx); if (m) { const n = gradeNumFrom(m[0], s); if (n != null) out[s] = { tok: m[0], num: n }; } }
  return out;
}

// With CREATE (--create-areas), a level still missing after the skip rule is CREATED, with every
// level below it, under the deepest area we have — Mountain Project's own structure, by name.
// Never under an area that already holds routes: an area holds routes OR sub-areas, never both
// (trg_areas_leaf_xor), so such a route is refused. Created areas are PLANNED here and reused by the
// next route that names them; runState inserts them, parents first, before any route.
function resolver(stateId, stateName, planned) {
  const rows = sql(`select a.id, a.name, a.parent_id from areas a where a.path <@ (select path from areas where id = ${q(stateId)})`);
  const direct = new Set(sql(`select distinct r.area_id from routes r join areas a on a.id = r.area_id where a.path <@ (select path from areas where id = ${q(stateId)})`).map(r => r.area_id));
  const kids = new Map(), hasKids = new Set(rows.map(r => r.parent_id)), ids = new Set(rows.map(r => r.id));
  for (const r of rows) { const k = r.parent_id + "|" + areaNorm(r.name); (kids.get(k) || kids.set(k, []).get(k)).push(r); }
  const pre = (() => { const c = {}; for (const r of rows) { const p = r.id.split("_")[0]; if (p !== r.id) c[p] = (c[p] || 0) + 1; } return Object.entries(c).sort((a, b) => b[1] - a[1])[0][0]; })();
  const mint = name => { let id = pre + "_" + slug(name), n = 2; while (ids.has(id)) id = pre + "_" + slug(name) + "_" + n++; ids.add(id); return id; };
  // A level missing from OUR tree (Montana's "Bozeman Area" — its canyons hang straight off the
  // region here) may be skipped, at most twice per route, but only when the NEXT name then matches
  // exactly one child. The final area can never be skipped: the route must land in the area named.
  const place = (chain, create, geo) => {
    const got = placeInner(chain, create, geo);
    if (got.areaId) direct.add(got.areaId); // a placed route makes its area a leaf for the rest of the run
    return got;
  };
  const placeInner = (chain, create, geo) => {
    let cur = stateId, skips = 0;
    for (let i = 0; i < chain.length; i++) {
      const c = kids.get(cur + "|" + areaNorm(chain[i])) || [];
      if (c.length === 1) { cur = c[0].id; continue; }
      if (c.length > 1) return { why: "ambiguous area name" };
      const nxt = i + 1 < chain.length ? (kids.get(cur + "|" + areaNorm(chain[i + 1])) || []) : [];
      if (nxt.length === 1 && skips < 2) { skips++; continue; }
      if (!create) return { why: "area not in our catalog" };
      if (direct.has(cur)) return { why: "would nest areas under an area that holds routes" };
      for (let j = i; j < chain.length; j++) {
        const leaf = j === chain.length - 1;
        const a = { id: mint(chain[j]), name: chain[j], parent_id: cur, area_type: leaf ? "crag" : "region", region: stateName, lat: leaf ? geo.lat : null, lng: leaf ? geo.lng : null };
        planned.push(a); rows.push(a); hasKids.add(cur);
        const k = cur + "|" + areaNorm(a.name); (kids.get(k) || kids.set(k, []).get(k)).push(a);
        cur = a.id;
      }
      return { areaId: cur, created: true };
    }
    if (hasKids.has(cur)) {
      const c = (kids.get(cur + "|" + areaNorm(chain[chain.length - 1])) || []).filter(r => r.id === cur + "_climbs");
      if (c.length !== 1) return { why: "area has sub-areas and no _climbs child" };
      cur = c[0].id;
      if (hasKids.has(cur)) return { why: "_climbs child is not a leaf" };
    }
    return { areaId: cur };
  };
  return place;
}

function disciplineOf(type, tk) {
  const t = String(type || "");
  if (/\bIce\b/.test(t) && tk.wi) return "ice";
  if (/\bMixed\b/.test(t) && tk.m) return "mixed";
  if (/\bAid\b/.test(t) && tk.aid) return "aid";
  if (tk.wi) return "ice"; if (tk.m) return "mixed"; if (tk.aid) return "aid";
  return null;
}

async function runState(st) {
  const files = readdirSync(DIR).filter(f => f.startsWith(st.id + "_") && f.endsWith(".csv"));
  if (!files.length) { console.log(`${st.name}: no export cached — run fetch-mp-ice-mixed-aid.mjs first`); return {}; }
  // A slice that hit the cap was split; read only the leaves (a file whose range has no split below it).
  const byUrl = new Map();
  for (const f of files) {
    const [, type, lo, hi] = f.replace(/\.csv$/, "").match(/_(ice|mixed|aid)_(\d+)_(\d+)$/) || [];
    const split = files.some(g => g !== f && g.startsWith(st.id + "_" + type + "_") && (() => { const m = g.match(/_(\d+)_(\d+)\.csv$/); return +m[1] >= +lo && +m[2] <= +hi && !(m[1] === lo && m[2] === hi); })());
    if (split) continue;
    for (const r of parseCsv(readFileSync(DIR + "/" + f, "utf8"))) if (r.URL) byUrl.set(r.URL, r);
  }
  const planned = [];
  const place = resolver(st.id, st.name, planned);
  const refused = {}, matched = [], added = [];
  const cand = [];
  // Existing-area placements first, so an area CREATED for one route is never planned as a leaf
  // that an existing-area placement later needs to descend through.
  const rowsIn = [...byUrl.values()].map(r => ({ r, tk: tokens(r.Rating), chain: String(r.Location || "").split(" > ").map(s => s.trim()).reverse() }));
  const deferred = [];
  for (const { r, tk, chain } of rowsIn) {
    if (!tk.wi && !tk.m && !tk.aid) { refused["no ice/mixed/aid grade"] = (refused["no ice/mixed/aid grade"] || 0) + 1; continue; }
    if (norm(chain[0]) !== norm(st.name)) { refused["location outside the state"] = (refused["location outside the state"] || 0) + 1; continue; }
    const p = place(chain.slice(1), false);
    if (!p.areaId && CREATE && p.why === "area not in our catalog") { deferred.push({ r, tk, chain }); continue; }
    if (!p.areaId) { refused[p.why] = (refused[p.why] || 0) + 1; continue; }
    cand.push({ r, tk, areaId: p.areaId });
  }
  // Deepest paths first, so a region created for a short path is not already a leaf holding a route
  // when a longer path needs to hang a crag beneath it.
  deferred.sort((a, b) => b.chain.length - a.chain.length);
  for (const { r, tk, chain } of deferred) {
    const lat = +r["Area Latitude"], lng = +r["Area Longitude"];
    const p = place(chain.slice(1), true, { lat: Number.isFinite(lat) && lat !== 0 ? lat : null, lng: Number.isFinite(lng) && lng !== 0 ? lng : null });
    if (!p.areaId) { refused[p.why] = (refused[p.why] || 0) + 1; continue; }
    cand.push({ r, tk, areaId: p.areaId });
  }
  // AN AREA WE ALREADY HAVE, UNDER ANOTHER PARENT OR SPELLING, IS NOT CREATED AGAIN (0213).
  // `place` only asks "does THIS parent have a child with this exact name?", so MP's
  // `North Cascades > Mt. Baker` was created beside our `Bellingham and Mt Baker Hwy > Mount
  // Baker`, and 224 more copies like it across 27 states. Every planned area is checked against
  // the whole state through catalog_key (0214: "Mt." = "Mount", "Colfax Peak" = "Colfax"):
  //   with a coordinate  -> the same key within 1.5 km, anywhere in the state
  //   without one        -> a PEAK in the state spelled the same (search_canon) — intermediate
  //                         levels arrive with no coordinate, which is how "Mt. Shuksan" did
  //   with a coordinate, 1.5–15 km, and a DISTINCTIVE name -> HELD, not created: MP puts "Table
  //                         Mountain Ice" 9 km from our Table Mountain (0213 folded it in once);
  //                         a generic name ("North Face", "Main Wall") is exempt, since two
  //                         formations 5 km apart legitimately share it. A hold costs one refused
  //                         route a person places by hand; a wrong create costs a duplicate area.
  // A route landing in, or anywhere under, such an area is refused rather than re-homed: which of
  // our areas it belongs in is a judgement (0213 moved one onto Table Mountain, another under the
  // Hwy region), and a refused route is one a person can place; a wrongly placed one is not seen.
  if (planned.length) {
    const vals = planned.map(a => `(${q(a.id)}, ${q(a.name)}, ${a.lat ?? "null"}::float8, ${a.lng ?? "null"}::float8)`);
    const hits = new Map(), holds = new Map();
    const GENERIC = /\b(face|wall|walls|side|boulder|boulders|buttress|slab|slabs|main|north|south|east|west|upper|lower|left|right|center|central|cliff|cliffs|block|sector|gully)\b/;
    for (let i = 0; i < vals.length; i += 300) for (const h of sql(`
      select v.id, (select a.id || ' (' || a.name || ')' from areas a
                     where a.path <@ (select path from areas where id = ${q(st.id)})
                       and case when v.lat is not null
                           then catalog_key(a.name) = catalog_key(v.name) and a.lat between v.lat - 0.02 and v.lat + 0.02
                                and catalog_km(v.lat, v.lng, a.lat, a.lng) <= 1.5
                           else a.area_type = 'peak' and search_canon(a.name) = search_canon(v.name) end
                     order by catalog_km(v.lat, v.lng, a.lat, a.lng) nulls last limit 1) hit,
             (select a.id || ' (' || a.name || ', ' || round(catalog_km(v.lat, v.lng, a.lat, a.lng)::numeric, 1) || ' km)' from areas a
                     where v.lat is not null and a.path <@ (select path from areas where id = ${q(st.id)})
                       and catalog_key(a.name) = catalog_key(v.name) and a.lat between v.lat - 0.14 and v.lat + 0.14
                       and catalog_km(v.lat, v.lng, a.lat, a.lng) <= 15
                     order by catalog_km(v.lat, v.lng, a.lat, a.lng) limit 1) near, catalog_key(v.name) k
        from (values ${vals.slice(i, i + 300).join(",")}) v(id, name, lat, lng)`)) {
      if (h.hit) hits.set(h.id, h.hit);
      else if (h.near && !GENERIC.test(h.k)) { hits.set(h.id, h.near); holds.set(h.id, true); }
    }
    if (hits.size) {
      const plannedBy = new Map(planned.map(a => [a.id, a]));
      const dupOf = id => { for (let x = id; plannedBy.has(x); x = plannedBy.get(x).parent_id) if (hits.has(x)) return x; return null; };
      const why = "area already in our catalog under another parent or spelling";
      const whyHeld = "held: an area of the same name 1.5–15 km away may be this one — place by hand";
      for (let i = cand.length - 1; i >= 0; i--) {
        const d = dupOf(cand[i].areaId);
        if (!d) continue;
        const w = holds.has(d) ? whyHeld : why;
        refused[w] = (refused[w] || 0) + 1;
        if (SAMPLE) console.log(`  refused (existing area): ${cand[i].r.Route}  ->  planned "${plannedBy.get(d).name}" is our ${hits.get(d)}`);
        cand.splice(i, 1);
      }
    }
  }
  const areaIds = [...new Set(cand.map(c => c.areaId))];
  const existing = [];
  for (let i = 0; i < areaIds.length; i += 400) existing.push(...sql(`select id, area_id, name, grade, grade_system, ice_grade, aid_grade, ice_grade_num, mixed_grade_num, aid_grade_num from routes where area_id in (${areaIds.slice(i, i + 400).map(q).join(",")})`));
  const byKey = new Map(existing.map(e => [e.area_id + "|" + norm(e.name), e]));
  const taken = new Set(existing.map(e => e.id)), seenNew = new Set();
  const patches = [], inserts = [], nearDup = [];
  for (const { r, tk, areaId } of cand) {
    const e = byKey.get(areaId + "|" + norm(r.Route));
    if (e) {
      const p = {};
      if (tk.wi && e.ice_grade_num == null) { p.ice_grade_num = tk.wi.num; if (!e.ice_grade) p.ice_grade = tk.wi.tok; }
      if (tk.m && e.mixed_grade_num == null) { p.mixed_grade_num = tk.m.num; if (!e.ice_grade && !p.ice_grade) p.ice_grade = tk.m.tok; }
      if (tk.aid && e.aid_grade_num == null) { p.aid_grade_num = tk.aid.num; if (!e.aid_grade) p.aid_grade = tk.aid.tok; }
      if (Object.keys(p).length) patches.push({ id: e.id, p });
      matched.push(e.id);
      continue;
    }
    const k = areaId + "|" + norm(r.Route);
    if (seenNew.has(k)) continue; seenNew.add(k);
    // A POSSIBLE DUPLICATE IS REFUSED, NOT ADDED. Some routes in our catalog were named by hand
    // (the 14ers, the WA alpine batches), so "North Couloir" here may be our "North Couloir (Holy
    // Cross)". A name contained in, or containing, a route already on this area is left for a person.
    const loose = s => norm(s).replace(/\([^)]*\)/g, " ").replace(/[^a-z0-9]+/g, " ").trim();
    const nn = loose(r.Route);
    const near = nn.length >= 4 && existing.find(x => x.area_id === areaId && (() => { const xn = loose(x.name); return xn.length >= 4 && (xn.includes(nn) || nn.includes(xn)); })());
    if (near) { refused["possible duplicate of an existing route"] = (refused["possible duplicate of an existing route"] || 0) + 1; if (SAMPLE) nearDup.push(r.Route + "  ~  " + near.name + "  (" + areaId + ")"); continue; }
    const disc = disciplineOf(r["Route Type"], tk);
    if (!disc) { refused["type not ice/mixed/aid"] = (refused["type not ice/mixed/aid"] || 0) + 1; continue; }
    const primary = disc === "ice" ? "wi" : disc === "mixed" ? (tk.yds ? "yds" : "m") : (tk.yds ? "yds" : "aid");
    const pnum = primary === "yds" ? tk.yds.num : tk[primary].num;
    let id = areaId + "_" + slug(r.Route), n = 2; while (taken.has(id)) id = areaId + "_" + slug(r.Route) + "_" + n++; taken.add(id);
    const types = String(r["Route Type"] || "").toLowerCase().split(",").map(s => s.trim());
    inserts.push({
      id, area_id: areaId, name: r.Route, discipline: disc, grade: String(r.Rating).trim(), grade_system: primary, grade_num: pnum,
      ice_grade: (tk.wi || tk.m) ? (tk.wi || tk.m).tok : null, aid_grade: tk.aid ? tk.aid.tok : null,
      ice_grade_num: tk.wi ? tk.wi.num : null, mixed_grade_num: tk.m ? tk.m.num : null, aid_grade_num: tk.aid ? tk.aid.num : null,
      pitches: +r.Pitches > 0 ? +r.Pitches : 0, length_m: +r.Length > 0 ? Math.round(+r.Length / 3.28084) : null,
      disciplines: [...new Set([disc, ...types.filter(t => ["trad", "sport", "ice", "mixed", "aid", "alpine"].includes(t))])], auto_generated: false,
    });
  }
  // ...AND A CLIMB WE ALREADY HAVE ON A NEIGHBOURING AREA IS NOT ADDED AGAIN. The near-duplicate
  // check above looks inside the one target area only. This one asks the neighbourhood: any area
  // with the target's catalog_key within 5 km (our "Mount Baker" for MP's "Mt. Baker", whose
  // coordinates disagree), or any area within 0.3 km (a second area on the same spot). Same
  // catalog_key on the route name is the test; placeholder names are never compared.
  if (inserts.length) {
    const plannedBy = new Map(planned.map(a => [a.id, a]));
    const vals = inserts.map(x => { const p = plannedBy.get(x.area_id); return `(${q(x.id)}, ${q(x.name)}, ${q(x.area_id)}, ${q(p ? p.name : "")}, ${p?.lat ?? "null"}::float8, ${p?.lng ?? "null"}::float8)`; });
    const dupRoute = new Map();
    for (let i = 0; i < vals.length; i += 300) for (const h of sql(`
      with v as (select v.id, v.name, coalesce(a.name, nullif(v.aname, '')) aname, coalesce(a.lat, v.lat) lat, coalesce(a.lng, v.lng) lng
                   from (values ${vals.slice(i, i + 300).join(",")}) v(id, name, area_id, aname, lat, lng)
                   left join areas a on a.id = v.area_id)
      select v.id, (select r.id || ' (' || r.name || ' on ' || n.name || ')'
                      from areas n join routes r on r.area_id = n.id
                     where n.path <@ (select path from areas where id = ${q(st.id)})
                       and ((catalog_key(n.name) = catalog_key(v.aname) and (v.lat is null or n.lat is null or catalog_km(v.lat, v.lng, n.lat, n.lng) <= 5))
                            or (v.lat is not null and n.lat between v.lat - 0.005 and v.lat + 0.005 and catalog_km(v.lat, v.lng, n.lat, n.lng) <= 0.3))
                       and catalog_key(r.name) = catalog_key(v.name)
                       and not route_name_is_placeholder(r.name)
                     limit 1) hit
        from v where not route_name_is_placeholder(v.name)`)) if (h.hit) dupRoute.set(h.id, h.hit);
    const why = "climb already in our catalog on a neighbouring area";
    for (let i = inserts.length - 1; i >= 0; i--) {
      if (!dupRoute.has(inserts[i].id)) continue;
      refused[why] = (refused[why] || 0) + 1;
      if (SAMPLE) console.log(`  refused (existing climb): ${inserts[i].name}  ->  our ${dupRoute.get(inserts[i].id)}`);
      inserts.splice(i, 1);
    }
  }
  const nRef = Object.values(refused).reduce((a, b) => a + b, 0);
  // Keep only planned areas an added route actually lands in, plus their planned ancestors — a
  // route refused after its area was planned must not leave an empty area behind.
  const plannedById = new Map(planned.map(a => [a.id, a])), keep = new Set();
  for (const x of inserts) for (let id = x.area_id; plannedById.has(id) && !keep.has(id); id = plannedById.get(id).parent_id) keep.add(id);
  const newAreas = planned.filter(a => keep.has(a.id));
  if (SAMPLE && newAreas.length) {
    console.log("  sample NEW AREAS:");
    const nameOf = id => (plannedById.get(id) || {}).name || id;
    for (const a of newAreas.filter(a => a.area_type === "crag").slice(0, 10)) console.log("    " + a.name + "  <-  " + nameOf(a.parent_id) + "  (" + a.id + ")");
  }
  if (SAMPLE) {
    console.log("  sample NEW:"); for (const x of inserts.slice(0, 12)) console.log("    " + x.name + " | " + x.grade + " | " + x.discipline + " | " + x.area_id);
    console.log("  sample GAIN A GRADE:"); for (const x of patches.slice(0, 8)) console.log("    " + x.id + " " + JSON.stringify(x.p));
    console.log("  possible duplicates refused:"); for (const x of nearDup.slice(0, 12)) console.log("    " + x);
  }
  console.log(`${st.name}: ${byUrl.size} exported | matched ${matched.length} (${patches.length} gain a grade) | new ${inserts.length}` + (CREATE ? ` (${newAreas.length} new areas)` : "") + ` | refused ${nRef}` + (nRef ? " " + JSON.stringify(refused) : ""));
  if (!APPLY) return { exported: byUrl.size, matched: matched.length, patched: patches.length, added: inserts.length, areas: newAreas.length, refused: nRef };

  // Areas first, parents before children (planned order already is), one at a time so the path
  // trigger sees each parent; each read back before a route is pointed at it.
  for (const a of newAreas) {
    const r = await fetchRetry(`${SUPABASE_URL}/rest/v1/areas`, { method: "POST", headers: { ...H, Prefer: "return=representation" }, body: JSON.stringify(a) });
    const txt = await r.text();
    if (!r.ok || JSON.parse(txt).length !== 1) throw new Error(`${st.name}: area ${a.id} insert failed ${r.status} ${txt.slice(0, 200)}`);
  }
  if (newAreas.length) {
    let back = 0;
    for (let i = 0; i < newAreas.length; i += 400) back += sql(`select count(*)::int n from areas where path is not null and id in (${newAreas.slice(i, i + 400).map(a => q(a.id)).join(",")})`)[0].n;
    if (back !== newAreas.length) throw new Error(`${st.name}: read back ${back} of ${newAreas.length} new areas`);
  }

  for (const { id, p } of patches) {
    const r = await fetchRetry(`${SUPABASE_URL}/rest/v1/routes?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", headers: { ...H, Prefer: "return=representation" }, body: JSON.stringify(p) });
    const got = r.ok ? JSON.parse(await r.text()) : null;
    if (!got || got.length !== 1) throw new Error(`${st.name}: patch ${id} did not land (${r.status})`);
  }
  for (let i = 0; i < inserts.length; i += 200) {
    const batch = inserts.slice(i, i + 200);
    const r = await fetchRetry(`${SUPABASE_URL}/rest/v1/routes`, { method: "POST", headers: { ...H, Prefer: "return=representation" }, body: JSON.stringify(batch) });
    const txt = await r.text();
    if (!r.ok) throw new Error(`${st.name}: insert failed ${r.status} ${txt.slice(0, 300)}`);
    if (JSON.parse(txt).length !== batch.length) throw new Error(`${st.name}: insert count mismatch`);
  }
  const ids = [...patches.map(x => x.id), ...inserts.map(x => x.id)];
  let back = 0;
  for (let i = 0; i < ids.length; i += 400) back += sql(`select count(*)::int n from routes where id in (${ids.slice(i, i + 400).map(q).join(",")}) and (ice_grade_num is not null or mixed_grade_num is not null or aid_grade_num is not null)`)[0].n;
  if (back !== ids.length) throw new Error(`${st.name}: read back ${back} of ${ids.length}`);
  console.log(`  wrote and verified ${patches.length} updated + ${inserts.length} added`);
  return { exported: byUrl.size, matched: matched.length, patched: patches.length, added: inserts.length, areas: newAreas.length, refused: nRef };
}

const states = sql(`select id, name from areas where parent_id = 'usa' and area_type = 'state' order by name`);
const pick = ALL ? states : states.filter(s => args.includes(s.id));
if (!pick.length) { console.error("Name a state id or pass --all"); process.exit(1); }
if (!existsSync(DIR)) { console.error("no " + DIR + " — run fetch-mp-ice-mixed-aid.mjs first"); process.exit(1); }
console.log((APPLY ? "APPLY" : "DRY RUN") + " — " + pick.length + " state(s)");
const tot = {};
for (const st of pick) {
  try { const r = await runState(st); for (const k in r) tot[k] = (tot[k] || 0) + r[k]; }
  catch (e) { console.error(`${st.name}: FAILED — ${e.message}`); process.exitCode = 1; }
}
console.log("TOTAL " + JSON.stringify(tot));
