// import-route-grades.mjs — bring Mountain Project's routes into the catalog, from the CSV exports
// scripts/pipeline/fetch-ice-mixed-aid.mjs and fetch-rock-boulder.mjs cached under
// catalog/_mp/ (fetched under the owner's licence from onX). ONLY FACTS are used: name, location path, grade, type,
// pitches, length. No description text exists in the export and none is written.
//
// For each exported route:
//   1. Place it: descend OUR area tree from the state row by the export's location path, one name
//      per level — the same rule import-ice-wi.mjs uses, since our areas came from OpenBeta, which
//      came from this site. A level with zero or several same-named children refuses the route.
//   2. MATCHED to an existing route (same area, same name): fill ice_grade / aid_grade and the
//      per-scale numbers (0206) where they are EMPTY. An existing grade is never overwritten, and a
//      matched rock or boulder route is left exactly as it is.
//   3. NOT in our catalog but its area resolves: add it, discipline from the export's type
//      (ice / mixed / aid first, as before; then trad, sport, top rope, boulder).
//   4. Anything else is refused and counted by reason.
// Grade numbers come from lib/grade.js gradeNumFrom — the single parser.
//
//   node scripts/pipeline/import-route-grades.mjs colorado            # dry run
//   node scripts/pipeline/import-route-grades.mjs --all --apply       # write + read back
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { requireServiceKey, SUPABASE_URL } from "../lib/supabase-env.mjs";
import { gradeNumFrom } from "../../lib/grade.js";
import { stripSortPrefix } from "../lib/area-sort-prefix.mjs";
import { genericAreaName } from "../lib/generic-area-name.mjs";
import { stripRouteTopoLabel, letterSeriesAreas } from "../lib/route-topo-label.mjs";

const args = process.argv.slice(2);
const APPLY = args.includes("--apply"), ALL = args.includes("--all"), SAMPLE = args.includes("--sample"), CREATE = args.includes("--create-areas");
// --snow: import ONLY the snow-only routes (tagged Snow, no roped type), which no export carries —
// read from the area tree (fetch-area-tree.mjs) and each route's page (fetch-snow-routes.mjs).
const SNOW = args.includes("--snow");
// --map: also write catalog/_mp/_map/<state>[.snow].json, {export route id: our route id}, which the
// route-page details pass reads to know which of our rows a fetched page describes.
const MAP = args.includes("--map");
const KEY = requireServiceKey();
const H = { apikey: KEY, Authorization: "Bearer " + KEY, "Content-Type": "application/json" };
const DIR = "catalog/_mp";
// The export escapes a few characters as HTML entities; a stored name must read as plain text.
const decode = s => String(s || "").replace(/&#0?39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").trim();
const norm = s => String(s || "").normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/&#0?39;|&apos;/g, "'").replace(/&amp;/g, "&").trim().toLowerCase();
// Area names only: our Adirondack areas carry sorting prefixes ("D: Keene Valley and Chapel Pond",
// "* Adirondack Ice & Mixed") that the export's location path does not.
// Since 2026-10-07 the export's own sort labels too ("a1. The Uberfall - left", "(3) Snake Wall"):
// our areas were renamed without them, the export's path still carries them. stripSortPrefix is
// the one rule both use.
const areaNorm = s => norm(stripSortPrefix(s)).replace(/^(?:[a-z]\s*:\s*|\*\s*)/, "").trim();
// The DATABASE's own name key (catalog_key: "Flintstone, The" = "The Flintstone"), which its
// refuse_duplicate_area / refuse_duplicate_route triggers compare by. Asked of the database rather
// than re-implemented, so the importer and the triggers cannot disagree about what is a duplicate.
const CK = new Map();
function catalogKeys(names) {
  const todo = [...new Set(names.filter(n => n && !CK.has(n)))];
  for (let i = 0; i < todo.length; i += 800) for (const x of sql(`select t, catalog_key(t) as k from unnest(array[${todo.slice(i, i + 800).map(q).join(",")}]::text[]) t`)) CK.set(x.t, x.k);
}
const ck = s => CK.get(s) ?? areaNorm(s);
// THE FOLD KEY (migration 0221, the area-consolidation session; owner: "fold into 1 area … i don't
// want duplicates"). MP files a crag's problems under a parallel "<X> Bouldering" / "<X> Boulders"
// tree beside "<X>"; 0221 folds each such pair into one area. So when no area matches by name or
// catalog_key, the name is compared again with bouldering/boulders/mixed/problems ignored ("Hidden
// Valley Area Bouldering" -> our "Hidden Valley Area"), except that an ICE name and a BOULDERING
// name are never twins (catalog_key already drops "ice").
const FOLD_WORDS = /\b(?:bouldering|boulders|mixed|problems)\b/g;
const fk = s => { const k = ck(s); const f = String(k).replace(FOLD_WORDS, " ").replace(/\s+/g, " ").trim(); return f || k; };
const foldKind = s => /\bice\b/i.test(s) ? "ice" : /\b(?:bouldering|boulders|problems)\b/i.test(s) ? "boulder" : "";
const foldTwins = (a, b) => { const x = foldKind(a), y = foldKind(b); return !(x && y && x !== y); };
// The suffix a _climbs split child takes after its area's name, decided in SQL by the routes the
// area holds: all bouldering -> " Bouldering", all ice/mixed -> " Ice Climbs", else " Routes".
const SPLIT_SUFFIX = areaId => `(select case when bool_and(discipline = 'bouldering') then ' Bouldering' when bool_and(discipline in ('ice', 'mixed')) then ' Ice Climbs' else ' Routes' end from routes where area_id = ${q(areaId)})`;
// A state's area id prefix, for a state that has no area yet to read it from.
const POSTAL = { alabama: "al", alaska: "ak", arizona: "az", arkansas: "ar", california: "ca", colorado: "co", connecticut: "ct", delaware: "de", florida: "fl", georgia: "ga", hawaii: "hi", idaho: "id", illinois: "il", indiana: "in", iowa: "ia", kansas: "ks", kentucky: "ky", louisiana: "la", maine: "me", maryland: "md", massachusetts: "ma", michigan: "mi", minnesota: "mn", mississippi: "ms", missouri: "mo", montana: "mt", nebraska: "ne", nevada: "nv", new_hampshire: "nh", new_jersey: "nj", new_mexico: "nm", new_york: "ny", north_carolina: "nc", north_dakota: "nd", ohio: "oh", oklahoma: "ok", oregon: "or", pennsylvania: "pa", rhode_island: "ri", south_carolina: "sc", south_dakota: "sd", tennessee: "tn", texas: "tx", utah: "ut", vermont: "vt", virginia: "va", washington: "wa", west_virginia: "wv", wisconsin: "wi", wyoming: "wy" };
const slug = s => ((s || "x").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 55) || "x");
const q = s => "'" + String(s).replace(/'/g, "''") + "'";

// Eight tries, backing off to a minute: four tries over 30 s were all answered with EMPTY output
// once (California, 2026-09-30), and "Unexpected end of JSON input" said nothing about why.
function sql(text, tries = 8) {
  for (let i = 0; ; i++) {
    try {
      // --output-format json is explicit: run from a plain Terminal the CLI answers with a TEXT
      // table by default (the "empty answers" that stopped California from run-all.sh).
      const out = execFileSync("npx", ["supabase", "db", "query", "--linked", "--output-format", "json", text], { encoding: "utf8", maxBuffer: 1024 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] });
      // Two shapes: inside an agent session {"boundary", "rows": [...], "warning"}; from a plain
      // Terminal a BARE array of rows. Parse from whichever bracket comes first.
      const at = [out.indexOf("{"), out.indexOf("[")].filter(i => i >= 0);
      if (!at.length) throw new Error("empty answer from supabase db query: " + JSON.stringify(out.slice(0, 200)));
      const j = JSON.parse(out.slice(Math.min(...at)));
      const rows = Array.isArray(j) ? j : j.rows;
      if (!Array.isArray(rows)) throw new Error("unexpected output: " + out.slice(0, 200));
      return rows;
    } catch (e) {
      if (i >= tries - 1) { if (e.stderr) e.message += " | stderr: " + String(e.stderr).slice(-400); throw e; }
      execFileSync("sleep", [String(Math.min(60, 5 * 2 ** i))]);
    }
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
// "3rd" / "4th" / "Easy 5th" count as YDS only at the start of a rating, as the export writes them.
// The V token takes "V0+", "V3-4", "VB" and "V-easy"; each is numbered by gradeNumFrom exactly as
// the boulders already in the catalog are.
// The RANGE alternative comes first: with "[+-]" first, "V3-4" matched as "V3-" and "WI3-4" as "WI3-",
// numbering the low end where the catalog numbers the high one (V0-1 = 1 on 1,134 rows).
const TOK = { wi: /\b(?:WI|AI)\d(?:-\d|[+-])?/, m: /\bM\d+(?:-\d+|[+-])?/, aid: /\b[AC]\d(?:-\d|[+-])?/, yds: /\b5\.\d+[abcd]?(?:\/[abcd])?[+-]?|^(?:Easy 5th|3rd|4th)\b/, v: /\bV(?:\d+|B|-easy)(?:-\d+|[+-])?(?![a-z])/ };
function tokens(rating) {
  const out = {};
  for (const [s, rx] of Object.entries(TOK)) { const m = String(rating || "").trim().match(rx); if (m) { const n = gradeNumFrom(m[0], s); if (n != null) out[s] = { tok: m[0], num: n }; } }
  // Snow, on MP's three steps — the same ones 0246's snow_grade_step reads (1 / 2 / 3).
  const sm = String(rating || "").match(/\b(Easy|Mod\.?|Moderate|Steep)\s+Snow\b/i);
  if (sm) out.snow = { tok: sm[0], num: /^steep/i.test(sm[1]) ? 3 : /^mod/i.test(sm[1]) ? 2 : 1 };
  return out;
}

// With CREATE (--create-areas), a level still missing after the skip rule is CREATED, with every
// level below it, under the deepest area we have — Mountain Project's own structure, by name.
// An area holds routes OR sub-areas, never both (trg_areas_leaf_xor). When Mountain Project hangs a
// sub-area under an area of ours that already holds routes, that area is SPLIT the way etl-state
// files a crag with both: its routes move to a same-named "<id>_climbs" child, and MP's sub-area is
// created beside it. The split is PLANNED here (splits: area id -> planned _climbs area) and applied
// by runState only if a route actually lands under a new sub-area. Created areas are PLANNED here and reused by the
// next route that names them; runState inserts them, parents first, before any route.
function resolver(stateId, stateName, planned, splits) {
  const rows = sql(`select a.id, a.name, a.parent_id, a.lat, a.lng, a.path::text as path, catalog_key(a.name) as k from areas a where a.path <@ (select path from areas where id = ${q(stateId)})`);
  const direct = new Set(sql(`select distinct r.area_id from routes r join areas a on a.id = r.area_id where a.path <@ (select path from areas where id = ${q(stateId)})`).map(r => r.area_id));
  const kids = new Map(), hasKids = new Set(rows.map(r => r.parent_id)), ids = new Set(rows.map(r => r.id));
  for (const r of rows) { const k = r.parent_id + "|" + areaNorm(r.name); (kids.get(k) || kids.set(k, []).get(k)).push(r); }
  // The EXACT spelling, asked first: 274 areas kept their label because stripping it would name
  // them the same as a sibling ("(a) Hook" beside "Hook" — duplicates awaiting a fold). Under the
  // stripped key alone, that parent has two "hook"s and every route for either would be refused.
  const exact = new Map();
  for (const r of rows) { const k = r.parent_id + "|" + norm(r.name); (exact.get(k) || exact.set(k, []).get(k)).push(r); }
  // The id prefix is the one the state's areas already use (its postal code: "mo_", "nh_"). A state
  // with no area yet (Mississippi, 2026-10-01) has nothing to read it from, so the postal code is used.
  const pre = (() => { const c = {}; for (const r of rows) { const p = r.id.split("_")[0]; if (p !== r.id) c[p] = (c[p] || 0) + 1; } const top = Object.entries(c).sort((a, b) => b[1] - a[1])[0]; if (top) return top[0]; if (POSTAL[stateId]) return POSTAL[stateId]; if (/^[a-z]{2}$/.test(stateId)) return stateId; /* a Canadian province id IS its postal code */ throw new Error(`${stateName}: no area id prefix to follow`); })();
  const mint = name => { let id = pre + "_" + slug(name), n = 2; while (ids.has(id)) id = pre + "_" + slug(name) + "_" + n++; ids.add(id); return id; };
  // A level missing from OUR tree (Montana's "Bozeman Area" — its canyons hang straight off the
  // region here) may be skipped, at most twice per route, but only when the NEXT name then matches
  // exactly one child. The final area can never be skipped: the route must land in the area named.
  const place = (chain, create, geo) => {
    const got = placeInner(chain, create, geo);
    if (got.areaId) direct.add(got.areaId); // a placed route makes its area a leaf for the rest of the run
    return got;
  };
  // WE MAY ALREADY HAVE THE AREA, FILED ELSEWHERE. MP files Fireplace Rock as "Cherokee Rock Village
  // (Sand Rock) > Sand Rock Bouldering > Fireplace Rock"; ours is "Sand Rock > Fireplace Rock". Minting
  // a new area for every level below the first mismatch made al_fireplace_rock_2 and added its routes
  // again (168 in Alabama, ~1,069 in Alaska). So before a level is created, an EXISTING area of the
  // same name within NEAR_KM of the route's own MP coordinates is used instead — if exactly one.
  // Names compare by the database's catalog_key (see CK): a child "Flintstone, The" IS MP's "The
  // Flintstone", and refuse_duplicate_area would reject the second one anyway.
  const keyOf = x => x.k ?? ck(x.name);
  const byId = new Map(rows.map(r => [r.id, r])), byName = new Map(), kidsK = new Map(), byFold = new Map(), kidsF = new Map();
  // An area still carrying its sort label (held for a fold) is indexed under its STRIPPED key too:
  // placeInner asks with the stripped chain, so "a. Beginning of cliff to Gelsa", found only by the
  // same-name-nearby rule (MP files it under "The Near Trapps", ours under "Near Trapps, The"), was
  // missed and a second copy planned — measured on New York, 2026-10-07.
  catalogKeys(rows.map(r => stripSortPrefix(r.name)));
  const index = r => {
    const s = stripSortPrefix(r.name);
    for (const k of new Set([keyOf(r), ck(s)])) { (byName.get(k) || byName.set(k, []).get(k)).push(r); const kk = r.parent_id + "|" + k; (kidsK.get(kk) || kidsK.set(kk, []).get(kk)).push(r); }
    for (const f of new Set([fk(r.name), fk(s)])) { (byFold.get(f) || byFold.set(f, []).get(f)).push(r); const fkk = r.parent_id + "|" + f; (kidsF.get(fkk) || kidsF.set(fkk, []).get(fkk)).push(r); }
  };
  for (const r of rows) index(r);
  const coordOf = id => { for (let x = byId.get(id); x; x = byId.get(x.parent_id)) if (x.lat != null && x.lng != null) return x; return null; };
  const near5 = (list, geo) => list.filter(r => r.path && r.lat != null && r.lng != null && km(r, geo) <= NEAR_KM);
  const sameNear = (name, geo) => {
    if (!geo || geo.lat == null) return [];
    const exact = near5(byName.get(ck(name)) || [], geo);
    if (exact.length) return exact;
    return near5((byFold.get(fk(name)) || []).filter(r => foldTwins(name, r.name)), geo);
  };
  // The same test refuse_duplicate_route runs on insert, against the state's routes (existing, and
  // added earlier in this run): same key in the same area, in a same-named area within 5 km, or in
  // any area within 0.3 km — plus ours: the same name within ROUTE_NEAR_KM in any other area.
  const routeClash = (list, areaId) => {
    const t = byId.get(areaId), tk = keyOf(t), tc = coordOf(areaId);
    for (const o of list || []) {
      const a = byId.get(o.area_id); if (!a) continue;
      if (a.id === t.id) return o;
      if (keyOf(a) === tk && (t.lat == null || a.lat == null || km(t, a) <= 5)) return o;
      if (t.lat != null && a.lat != null && km(t, a) <= 0.3) return o;
      const ac = coordOf(a.id);
      if (tc && ac && km(tc, ac) <= ROUTE_NEAR_KM) return o;
    }
    return null;
  };
  const placeInner = (rawChain, create, geo) => {
    const chain = rawChain.map(stripSortPrefix);   // so a CREATED level is named without its label too
    let cur = stateId, skips = 0, created = false;
    for (let i = 0; i < chain.length; i++) {
      let c = exact.get(cur + "|" + norm(rawChain[i])) || [];
      if (c.length !== 1) c = kids.get(cur + "|" + areaNorm(chain[i])) || [];
      if (!c.length) c = kidsK.get(cur + "|" + ck(chain[i])) || [];
      if (!c.length) c = (kidsF.get(cur + "|" + fk(chain[i])) || []).filter(r => foldTwins(chain[i], r.name));
      if (c.length === 1) { cur = c[0].id; continue; }
      if (c.length > 1) return { why: "two of our areas share this name under one parent", at: chain.slice(0, i + 1).join(" > ") };
      // A level named only by DISCIPLINE ("Bouldering", "Other Climbs", "CO Ice & Mixed") is a bucket
      // the generic-area fold removed (owner, 2026-10-07: areas are places). Step THROUGH it rather than
      // create it again: its sub-areas now hang off the place above, and a climb filed on the bucket
      // itself lands on that place — or, if the place has sub-areas, is refused for a person to place.
      if (genericAreaName(chain[i], [stateName, ...chain.slice(0, i)])) continue;
      const nxt = i + 1 < chain.length ? (kids.get(cur + "|" + areaNorm(chain[i + 1])) || []) : [];
      if (nxt.length === 1 && skips < 2) { skips++; continue; }
      if (!create) return { why: "area not in our catalog" };
      let near = sameNear(chain[i], geo);
      // Several of ours nearby (MP files Purinton Creek three times: rock, bouldering, ice, under
      // different parents): take the one whose ANCESTORS carry the most of MP's path above it, then
      // the exact spelling — only if that leaves exactly one.
      if (near.length > 1) {
        const above = new Set(chain.slice(0, i).map(ck));
        const score = x => { let s = 0; for (let y = byId.get(x.parent_id); y; y = byId.get(y.parent_id)) if (above.has(keyOf(y))) s++; return [s, areaNorm(x.name) === areaNorm(chain[i]) ? 1 : 0]; };
        const scored = near.map(x => ({ x, s: score(x) })).sort((a, b) => b.s[0] - a.s[0] || b.s[1] - a.s[1]);
        const [a, b] = scored;
        if (a.s[0] + a.s[1] > 0 && (a.s[0] !== b.s[0] || a.s[1] !== b.s[1])) near = [a.x];
      }
      if (near.length === 1) { cur = near[0].id; continue; }
      if (near.length > 1) return { why: "two same-named areas of ours nearby", at: chain.slice(0, i + 1).join(" > ") + " : " + near.map(x => x.id).join(",") };
      // Create THIS level only, in MP's order; the next level gets its own chance to match.
      if (direct.has(cur)) {
        if (ids.has(cur + "_climbs")) return { why: "would nest areas under an area that holds routes" };
        const x = byId.get(cur);
        const s = { id: cur + "_climbs", name: x.name, parent_id: cur, area_type: "crag", region: stateName, lat: x.lat ?? null, lng: x.lng ?? null };
        ids.add(s.id); rows.push(s); byId.set(s.id, s); hasKids.add(cur); direct.delete(cur); direct.add(s.id);
        const k = cur + "|" + areaNorm(s.name); (kids.get(k) || kids.set(k, []).get(k)).push(s);
        // runState names the child "<X> Routes" / "<X> Bouldering" / "<X> Ice Climbs" (SPLIT_SUFFIX).
        // MP can file a sub-area of that very name — Massachusetts's "Roadside Crag > Roadside Crag
        // Routes" (2026-10-01): planned as a second area, the database refused it and the state
        // failed. So the child is found under the name it will carry, too.
        const full = x.name + sql(`select ${SPLIT_SUFFIX(cur)} as s`)[0].s;
        const kf = cur + "|" + areaNorm(full), kfk = cur + "|" + ck(full);
        if (kf !== k) (kids.get(kf) || kids.set(kf, []).get(kf)).push(s);
        (kidsK.get(kfk) || kidsK.set(kfk, []).get(kfk)).push(s);
        splits.set(cur, s);
        if (ck(chain[i]) === ck(full)) { cur = s.id; continue; }
      }
      const leaf = i === chain.length - 1;
      // refuse_duplicate_area: a same-key area within 1.5 km under another parent. An existing one was
      // matched above; this catches two NEW areas MP files apart that the database would call one.
      if (leaf && geo.lat != null && (byName.get(ck(chain[i])) || []).some(x => x.parent_id !== cur && x.lat != null && km(x, geo) <= 1.5)) return { why: "a same-named area within 1.5 km is filed elsewhere" };
      const a = { id: mint(chain[i]), name: chain[i], parent_id: cur, area_type: leaf ? "crag" : "region", region: stateName, lat: leaf ? geo.lat : null, lng: leaf ? geo.lng : null };
      planned.push(a); rows.push(a); byId.set(a.id, a); hasKids.add(cur); index(a);
      const k = cur + "|" + areaNorm(a.name); (kids.get(k) || kids.set(k, []).get(k)).push(a);
      cur = a.id; created = true;
    }
    if (created && planned.some(a => a.id === cur)) return { areaId: cur, created: true };
    if (hasKids.has(cur)) {
      // Found by ID, not name: a split child is named "<X> Routes" / "<X> Bouldering" / "<X> Ice Climbs".
      const c = [byId.get(cur + "_climbs")].filter(r => r && r.parent_id === cur);
      if (c.length !== 1) return { why: "area has sub-areas and no _climbs child" };
      cur = c[0].id;
      if (hasKids.has(cur)) return { why: "_climbs child is not a leaf" };
    }
    return { areaId: cur };
  };
  return Object.assign(place, { coordOf, routeClash });
}

// Great-circle km between two {lat, lng}.
const km = (a, b) => { const R = 6371, r = x => x * Math.PI / 180, dLat = r(b.lat - a.lat), dLng = r(b.lng - a.lng); const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLng / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
// An existing area this close, with the same name, IS the area MP names. A route this close, with the
// same name, in another area, is refused as a possible duplicate.
const NEAR_KM = 5, ROUTE_NEAR_KM = 1;

// A route TYPED ice / mixed / aid keeps the first import's precedence. An aid grade on a route not
// typed Aid ("5.10 A0" on a trad line — a pendulum or a pulled bolt) no longer outranks its free
// grade. A roped type then outranks Boulder ("TR, Boulder" is a top rope).
function disciplineOf(type, tk) {
  const t = String(type || "");
  if (/\bIce\b/.test(t) && tk.wi) return "ice";
  if (/\bMixed\b/.test(t) && tk.m) return "mixed";
  if (/\bAid\b/.test(t) && tk.aid) return "aid";
  if (tk.wi) return "ice"; if (tk.m) return "mixed"; if (tk.aid && !tk.yds) return "aid";
  if (tk.yds) { if (/\bTrad\b/.test(t)) return "trad"; if (/\bSport\b/.test(t)) return "sport"; if (/\bTR\b/.test(t)) return "toprope"; }
  if (tk.aid) return "aid";
  if (/\bBoulder\b/.test(t) && tk.v) return "bouldering";
  // A route MP types Snow with no roped grade is a snow climb: mountaineering, as the owner asked
  // (2026-10-04), graded by its snow rating, with any Class it already has left alone.
  if (/\bSnow\b/.test(t) && tk.snow) return "mountaineering";
  return null;
}
const PRIMARY = { ice: () => "wi", mixed: tk => tk.yds ? "yds" : "m", aid: tk => tk.yds ? "yds" : "aid", trad: () => "yds", sport: () => "yds", toprope: () => "yds", bouldering: () => "v", mountaineering: () => "snow" };
const TYPE_DISC = { trad: "trad", sport: "sport", tr: "toprope", boulder: "bouldering", ice: "ice", mixed: "mixed", aid: "aid", alpine: "alpine", snow: "mountaineering" };
const ROPED_TAG = new Set(["Rock", "Trad", "Sport", "TR", "Toprope", "Ice", "Mixed", "Aid", "Boulder"]);
const snowOnly = r => r.tags.includes("Snow") && !r.tags.some(t => ROPED_TAG.has(t));

// A Canadian location path ends "... > Alberta > Canada > North America > International": MP files
// Canada under its International tree. Dropped, so the chain starts at the province as a US one
// starts at its state.
const ABOVE_PROVINCE = new Set(["international", "north america", "canada"]);
// MP's name for a state or province where ours is shorter: all 447 Yukon climbs were refused as
// "location outside the state" because MP files them under "Yukon Territory" (2026-10-02).
const MP_STATE_ALIAS = new Map([["yukon territory", "Yukon"]]);
function provinceChain(chain) { let i = 0; while (i < chain.length - 1 && ABOVE_PROVINCE.has(norm(chain[i]))) i++; const out = chain.slice(i); if (out.length && MP_STATE_ALIAS.has(norm(out[0]))) out[0] = MP_STATE_ALIAS.get(norm(out[0])); return out; }

async function runState(st) {
  const files = readdirSync(DIR).filter(f => f.startsWith(st.id + "_") && f.endsWith(".csv"));
  if (!files.length) { console.log(`${st.name}: no export cached — run fetch-ice-mixed-aid.mjs first`); return {}; }
  // Every file of the state — slices, their grade splits, sub-area splits, every type — deduped by
  // the route's URL. A slice that hit the cap is a subset of its splits, so reading it is harmless.
  const byUrl = new Map();
  for (const f of files) {
    if (!/_(ice|mixed|aid|rock|boulder)_\d+_\d+(?:_a\d+)?\.csv$/.test(f)) continue;
    for (const r of parseCsv(readFileSync(DIR + "/" + f, "utf8"))) if (r.URL) byUrl.set(r.URL, r);
  }
  // --snow: the exports are replaced by the state's snow-only routes, each shaped as an export row —
  // name, area chain and coordinates from the tree, grade from the route page's grade header.
  if (SNOW) {
    byUrl.clear();
    const tf = `${DIR}/_tree/${st.id}.routes.json`;
    if (!existsSync(tf)) { console.log(`${st.name}: area tree not crawled yet — skipped`); return {}; }
    let noPage = 0;
    for (const t of JSON.parse(readFileSync(tf, "utf8")).filter(snowOnly)) {
      const pf = `${DIR}/_routes/${t.id}.html`;
      if (!existsSync(pf)) { noPage++; continue; }
      const h2 = readFileSync(pf, "utf8").match(/<h2 class="inline-block mr-2">([\s\S]*?)<\/h2>/);
      const rating = h2 ? decode(h2[1].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim() : "";
      const url = `https://www.mountainproject.com/route/${t.id}`;
      byUrl.set(url, { URL: url, Route: t.name, Location: t.chain.join(" > "), Rating: rating, "Route Type": t.tags.join(", "),
        Pitches: "", Length: "", "Area Latitude": t.lat ?? "", "Area Longitude": t.lng ?? "" });
    }
    if (noPage) console.log(`${st.name}: ${noPage} snow-only route page(s) not fetched yet — run fetch-snow-routes.mjs; importing the rest`);
  }
  // A state whose rock/boulder crawl is unfinished is REFUSED, not half-imported: every file at the
  // 1,000-row cap must have its splits on disk (both grade halves, or at least one sub-area file).
  const has = new Set(SNOW ? [] : files);
  for (const f of SNOW ? [] : files) {
    const m = f.match(/^(.+)_(rock|boulder)_(\d+)_(\d+)((?:_a\d+)?)\.csv$/);
    if (!m) continue;
    if (readFileSync(DIR + "/" + f, "utf8").split("\n").filter(l => l.trim()).length - 1 < 1000) continue;
    const [, s, t, lo, hi, sub] = m, L = +lo, Hh = +hi, mid = Math.floor((L + Hh) / 2);
    const done = (Hh - L > 1 && has.has(`${s}_${t}_${L}_${mid}${sub}.csv`) && has.has(`${s}_${t}_${mid + 1}_${Hh}${sub}.csv`)) || files.some(g => g.startsWith(`${s}_${t}_${L}_${Hh}_a`) && g !== f);
    if (!done) { console.log(`${st.name}: crawl not finished (${f} is at the cap and not yet split) — skipped`); return {}; }
  }
  const planned = [], splits = new Map();
  const mpName = r => decode(r.Route).replace(/\s*\|\s*\d+$/, ""); // " | 8010" is MP's disambiguation suffix
  const allNames = [];
  for (const r of byUrl.values()) { allNames.push(mpName(r)); for (const a of String(r.Location || "").split(" > ")) allNames.push(a.trim(), stripSortPrefix(a)); }
  catalogKeys(allNames);
  const place = resolver(st.id, st.name, planned, splits);
  const refused = {}, matched = [], added = [], whereRefused = [], mapRows = [];
  const cand = [];
  // Existing-area placements first, so an area CREATED for one route is never planned as a leaf
  // that an existing-area placement later needs to descend through.
  const rowsIn = [...byUrl.values()].map(r => ({ r, tk: tokens(r.Rating), chain: provinceChain(String(r.Location || "").split(" > ").map(s => s.trim()).reverse()) }));
  const deferred = [];
  for (const { r, tk, chain } of rowsIn) {
    if (!tk.wi && !tk.m && !tk.aid && !tk.yds && !tk.v && !tk.snow) { refused["no grade we can read"] = (refused["no grade we can read"] || 0) + 1; continue; }
    if (norm(chain[0]) !== norm(st.name)) { refused["location outside the state"] = (refused["location outside the state"] || 0) + 1; continue; }
    const p = place(chain.slice(1), false);
    if (!p.areaId && CREATE && p.why === "area not in our catalog") { deferred.push({ r, tk, chain }); continue; }
    if (!p.areaId) { refused[p.why] = (refused[p.why] || 0) + 1; if (SAMPLE && p.at) whereRefused.push(p.why + ": " + p.at); continue; }
    cand.push({ r, tk, areaId: p.areaId });
  }
  // Deepest paths first, so a region created for a short path is not already a leaf holding a route
  // when a longer path needs to hang a crag beneath it.
  deferred.sort((a, b) => b.chain.length - a.chain.length);
  for (const { r, tk, chain } of deferred) {
    const lat = +r["Area Latitude"], lng = +r["Area Longitude"];
    const p = place(chain.slice(1), true, { lat: Number.isFinite(lat) && lat !== 0 ? lat : null, lng: Number.isFinite(lng) && lng !== 0 ? lng : null });
    if (!p.areaId) { refused[p.why] = (refused[p.why] || 0) + 1; if (SAMPLE && p.at) whereRefused.push(p.why + ": " + p.at); continue; }
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
    // Each name's key is computed ONCE (materialized), not once per pairing: calling catalog_key
    // inside the correlated subquery timed out on California (300 planned x every state area).
    for (let i = 0; i < vals.length; i += 250) for (const h of sql(`
      with s as materialized (select id, name, area_type, lat, lng, catalog_key(name) k, search_canon(name) sc
                                from areas where path <@ (select path from areas where id = ${q(st.id)})),
           v as materialized (select id, name, lat, lng, catalog_key(name) k, search_canon(name) sc
                                from (values ${vals.slice(i, i + 250).join(",")}) v(id, name, lat, lng))
      select v.id, (select s.id || ' (' || s.name || ')' from s
                     where case when v.lat is not null
                           then s.k = v.k and s.lat between v.lat - 0.02 and v.lat + 0.02
                                and catalog_km(v.lat, v.lng, s.lat, s.lng) <= 1.5
                           else s.area_type = 'peak' and s.sc = v.sc end
                     order by catalog_km(v.lat, v.lng, s.lat, s.lng) nulls last limit 1) hit,
             (select s.id || ' (' || s.name || ', ' || round(catalog_km(v.lat, v.lng, s.lat, s.lng)::numeric, 1) || ' km)' from s
                     where v.lat is not null and s.k = v.k and s.lat between v.lat - 0.14 and v.lat + 0.14
                       and catalog_km(v.lat, v.lng, s.lat, s.lng) <= 15
                     order by catalog_km(v.lat, v.lng, s.lat, s.lng) limit 1) near, v.k
        from v`)) {
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
  for (let i = 0; i < areaIds.length; i += 400) existing.push(...sql(`select id, area_id, name, catalog_key(name) as k, grade, grade_system, ice_grade, aid_grade, ice_grade_num, mixed_grade_num, aid_grade_num, snow_grade_num from routes where area_id in (${areaIds.slice(i, i + 400).map(q).join(",")})`));
  const byKey = new Map(existing.map(e => [e.area_id + "|" + norm(e.name), e]));
  // ...and by catalog_key, so "Drip, The" on the same area is a MATCH, not a refusal.
  const byCk = new Map(); for (const e of existing) { const k = e.area_id + "|" + e.k; byCk.set(k, byCk.has(k) ? null : e); }
  const taken = new Set(existing.map(e => e.id)), seenNew = new Set();
  const patches = [], inserts = [], nearDup = [];
  // The near-duplicate test compares against one area's routes, never the state's (California's
  // rock export is tens of thousands of rows).
  const loose = s => norm(s).replace(/['’`]/g, "").replace(/\([^)]*\)/g, " ").replace(/[^a-z0-9]+/g, " ").trim();
  const looseByArea = new Map();
  for (const x of existing) (looseByArea.get(x.area_id) || looseByArea.set(x.area_id, []).get(x.area_id)).push({ xn: loose(x.name), name: x.name });
  const stateNames = new Map();
  for (const x of sql(`select r.name, catalog_key(r.name) as k, r.area_id from routes r join areas a on a.id = r.area_id where a.path <@ (select path from areas where id = ${q(st.id)}) and not route_name_is_placeholder(r.name)`)) (stateNames.get(x.k) || stateNames.set(x.k, []).get(x.k)).push(x);
  // The export still carries the guidebook TOPO NUMBER ("(01) Chicken Crack"); our climbs were renamed
  // without it (2026-10-07). Match the export's own name FIRST — a climb that kept its number because
  // the number is all that tells it from a same-named neighbour ("4. Slab" / "5. Slab") — then the
  // stripped one; a NEW climb is added without the label unless that would repeat a name in its area.
  const letterSeries = letterSeriesAreas(cand.map(c => ({ name: mpName(c.r), area_id: c.areaId })));
  for (const { r, tk, areaId } of cand) {
    const raw = mpName(r), bare = stripRouteTopoLabel(raw, { letterSeries: letterSeries.has(areaId) });
    const find = n => byKey.get(areaId + "|" + norm(n)) || byCk.get(areaId + "|" + ck(n));
    const e = find(raw) || (bare !== raw ? find(bare) : null);
    const name = bare !== raw && !find(bare) && !seenNew.has(areaId + "|" + norm(bare)) ? bare : raw;
    if (e) {
      const p = {};
      if (tk.wi && e.ice_grade_num == null) { p.ice_grade_num = tk.wi.num; if (!e.ice_grade) p.ice_grade = tk.wi.tok; }
      if (tk.m && e.mixed_grade_num == null) { p.mixed_grade_num = tk.m.num; if (!e.ice_grade && !p.ice_grade) p.ice_grade = tk.m.tok; }
      if (tk.aid && e.aid_grade_num == null) { p.aid_grade_num = tk.aid.num; if (!e.aid_grade) p.aid_grade = tk.aid.tok; }
      // A route we already have (often a Class-graded mountaineering one) GAINS the snow rating; its
      // grade text, and so its Class, is left as it is.
      if (tk.snow && e.snow_grade_num == null) p.snow_grade_num = tk.snow.num;
      if (Object.keys(p).length) patches.push({ id: e.id, p });
      matched.push(e.id);
      mapRows.push([String(r.URL).split("/route/")[1]?.split("/")[0], e.id]);
      continue;
    }
    const k = areaId + "|" + norm(name);
    if (seenNew.has(k)) { refused["second MP route with the same name in the area"] = (refused["second MP route with the same name in the area"] || 0) + 1; continue; }
    seenNew.add(k);
    // A POSSIBLE DUPLICATE IS REFUSED, NOT ADDED. Some routes in our catalog were named by hand
    // (the 14ers, the WA alpine batches), so "North Couloir" here may be our "North Couloir (Holy
    // Cross)". A name contained in, or containing, a route already on this area is left for a person.
    const nn = loose(name);
    const near = nn.length >= 4 && (looseByArea.get(areaId) || []).find(({ xn }) => xn.length >= 4 && (xn.includes(nn) || nn.includes(xn)));
    if (near) { refused["possible duplicate of an existing route"] = (refused["possible duplicate of an existing route"] || 0) + 1; if (SAMPLE) nearDup.push(name + "  ~  " + near.name + "  (" + areaId + ")"); continue; }
    // ...and the same name within ROUTE_NEAR_KM in ANOTHER area of the state is refused too: our tree
    // may file that crag under a different parent than MP does.
    const twin = place.routeClash(stateNames.get(ck(name)), areaId);
    if (twin) { refused["same name nearby in another area"] = (refused["same name nearby in another area"] || 0) + 1; if (SAMPLE) nearDup.push(name + "  ==  " + twin.name + "  (" + twin.area_id + ")"); continue; }
    const disc = disciplineOf(r["Route Type"], tk);
    if (!disc) { refused["type and grade do not agree"] = (refused["type and grade do not agree"] || 0) + 1; continue; }
    const primary = PRIMARY[disc](tk);
    // A snow climb's rating lives in snow_grade_num; grade_num stays empty rather than put 1-3 on
    // the Class number line the other mountaineering routes sort by.
    const pnum = primary === "snow" ? null : tk[primary].num;
    let id = areaId + "_" + slug(name), n = 2; while (taken.has(id)) id = areaId + "_" + slug(name) + "_" + n++; taken.add(id);
    const types = String(r["Route Type"] || "").toLowerCase().split(",").map(s => s.trim());
    mapRows.push([String(r.URL).split("/route/")[1]?.split("/")[0], id]);
    inserts.push({
      id, area_id: areaId, name, discipline: disc, grade: String(r.Rating).trim(), grade_system: primary, grade_num: pnum,
      ice_grade: (tk.wi || tk.m) ? (tk.wi || tk.m).tok : null, aid_grade: tk.aid ? tk.aid.tok : null,
      ice_grade_num: tk.wi ? tk.wi.num : null, mixed_grade_num: tk.m ? tk.m.num : null, aid_grade_num: tk.aid ? tk.aid.num : null,
      snow_grade_num: tk.snow ? tk.snow.num : null,
      pitches: +r.Pitches > 0 ? +r.Pitches : 0, length_m: +r.Length > 0 ? Math.round(+r.Length / 3.28084) : null,
      disciplines: [...new Set([disc, ...types.map(t => TYPE_DISC[t]).filter(Boolean)])], auto_generated: false,
    });
    const nk = ck(name); (stateNames.get(nk) || stateNames.set(nk, []).get(nk)).push({ name, area_id: areaId });
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
    // Keys computed once per name (materialized), and route names keyed only in the candidate areas
    // — the correlated form re-keyed the whole state per insert and timed out on California.
    for (let i = 0; i < vals.length; i += 250) for (const h of sql(`
      with s as materialized (select id, name, lat, lng, catalog_key(name) k
                                from areas where path <@ (select path from areas where id = ${q(st.id)})),
           v as materialized (select v.id, catalog_key(v.name) rk, catalog_key(coalesce(a.name, nullif(v.aname, ''))) ak,
                                     coalesce(a.lat, v.lat) lat, coalesce(a.lng, v.lng) lng
                                from (values ${vals.slice(i, i + 250).join(",")}) v(id, name, area_id, aname, lat, lng)
                                left join areas a on a.id = v.area_id
                               where not route_name_is_placeholder(v.name)),
           c as materialized (select v.id vid, v.rk, s.id nid, s.name nname from v join s
                                on (s.k = v.ak and (v.lat is null or s.lat is null or catalog_km(v.lat, v.lng, s.lat, s.lng) <= 5))
                                or (v.lat is not null and s.lat between v.lat - 0.005 and v.lat + 0.005 and catalog_km(v.lat, v.lng, s.lat, s.lng) <= 0.3)),
           rk as materialized (select r.id, r.name, r.area_id, catalog_key(r.name) k from routes r
                                where r.area_id in (select nid from c) and not route_name_is_placeholder(r.name))
      select distinct on (c.vid) c.vid as id, rk.id || ' (' || rk.name || ' on ' || c.nname || ')' hit
        from c join rk on rk.area_id = c.nid and rk.k = c.rk`)) if (h.hit) dupRoute.set(h.id, h.hit);
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
  // A split takes effect only when a kept new area hangs under the split area; its routes then move
  // to the _climbs child, and so does every route this run adds to the split area itself.
  const effSplits = [...splits.entries()].filter(([x]) => planned.some(a => keep.has(a.id) && a.parent_id === x)).map(([x, c]) => ({ x, c }));
  const splitTo = new Map(effSplits.map(({ x, c }) => [x, c.id]));
  for (const ins of inserts) if (splitTo.has(ins.area_id)) ins.area_id = splitTo.get(ins.area_id);
  // ...and a split that does NOT take effect (every sub-area planned under it was refused) is never
  // made, so a route planning already pointed at its _climbs child goes back to the area itself —
  // California failed three times inserting into a ca_k_rock_climbs that was never created.
  const unsplit = new Map([...splits.entries()].filter(([x]) => !splitTo.has(x)).map(([x, c]) => [c.id, x]));
  for (const ins of inserts) if (unsplit.has(ins.area_id)) ins.area_id = unsplit.get(ins.area_id);
  const newAreas = planned.filter(a => keep.has(a.id));
  // A split of an area this SAME run creates (Washington's "Main Area Bouldering", 2026-10-04: a route
  // placed in it, then a later one filed a sub-area under it) has nothing in the database to move —
  // the split transaction failed six times on an area that did not exist yet. Its _climbs child is
  // just one more new area, inserted right after its parent and named for the routes it receives.
  for (const { x, c } of effSplits.filter(({ x }) => plannedById.has(x))) {
    const ds = inserts.filter(i => i.area_id === c.id).map(i => i.discipline);
    const suffix = ds.length && ds.every(d => d === "bouldering") ? " Bouldering" : ds.length && ds.every(d => d === "ice" || d === "mixed") ? " Ice Climbs" : " Routes";
    newAreas.splice(newAreas.findIndex(a => a.id === x) + 1, 0, { id: c.id, name: c.name + suffix, parent_id: x, area_type: "crag", region: c.region, lat: c.lat ?? null, lng: c.lng ?? null });
  }
  if (SAMPLE && newAreas.length) {
    console.log("  sample NEW AREAS:");
    const nameOf = id => (plannedById.get(id) || {}).name || id;
    for (const a of newAreas.filter(a => a.area_type === "crag").slice(0, 10)) console.log("    " + a.name + "  <-  " + nameOf(a.parent_id) + "  (" + a.id + ")");
  }
  if (SAMPLE && whereRefused.length) {
    const c = {}; for (const w of whereRefused) c[w] = (c[w] || 0) + 1;
    console.log("  refused at:"); for (const [w, n] of Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 15)) console.log(`    ${n}  ${w}`);
  }
  if (SAMPLE) {
    console.log("  sample NEW:"); for (const x of inserts.slice(0, 12)) console.log("    " + x.name + " | " + x.grade + " | " + x.discipline + " | " + x.area_id);
    console.log("  sample GAIN A GRADE:"); for (const x of patches.slice(0, 8)) console.log("    " + x.id + " " + JSON.stringify(x.p));
    console.log("  possible duplicates refused:"); for (const x of nearDup.slice(0, 12)) console.log("    " + x);
  }
  console.log(`${st.name}: ${byUrl.size} exported | matched ${matched.length} (${patches.length} gain a grade) | new ${inserts.length}` + (CREATE ? ` (${newAreas.length} new areas)` : "") + (effSplits.length ? ` (${effSplits.length} areas split into _climbs + sub-areas)` : "") + ` | refused ${nRef}` + (nRef ? " " + JSON.stringify(refused) : ""));
  if (SAMPLE) for (const { x, c } of effSplits.slice(0, 8)) console.log("  split " + x + " -> routes to " + c.id + ", new beside it: " + planned.filter(a => keep.has(a.id) && a.parent_id === x && a.id !== c.id).map(a => a.name).join(", "));
  if (MAP) {
    mkdirSync(DIR + "/_map", { recursive: true });
    writeFileSync(`${DIR}/_map/${st.id}${SNOW ? ".snow" : ""}.json`, JSON.stringify(Object.fromEntries(mapRows.filter(([m]) => m))));
    console.log(`  map: ${mapRows.length} routes -> ${DIR}/_map/${st.id}${SNOW ? ".snow" : ""}.json`);
  }
  if (!APPLY) return { exported: byUrl.size, matched: matched.length, patched: patches.length, added: inserts.length, areas: newAreas.length, splits: effSplits.length, refused: nRef };

  // Splits first, one transaction each: the _climbs child is created BESIDE the area (the leaf-XOR
  // trigger forbids it under an area holding routes), the routes move into it, it is re-parented
  // under the area, and the area gets back the count the move took off it (the move did -n on the
  // area and nothing net on its ancestors; a re-parent does not re-bump route_count).
  const num = v => v == null ? "null" : String(+v);
  for (const { x, c } of effSplits.filter(({ x }) => !plannedById.has(x))) {
    const n = sql(`select count(*)::int n from routes where area_id = ${q(x)}`)[0].n;
    // The _climbs child is the area itself, not a new place, so refuse_duplicate_area (which fired
    // on Arizona's two Rappel Rocks 0.35 km apart) is told so — `set local` lasts for this
    // transaction only. It is NAMED for what it holds, as 0221 names a folded area ("<X> Routes" /
    // "<X> Bouldering" / "<X> Ice Climbs"): a same-named child read "AFPA Rock › AFPA Rock" in the
    // breadcrumb, a duplicate to a climber.
    sql(`begin;
      set local catalog.allow_duplicate = 'on';
      insert into areas (id, name, parent_id, area_type, region, lat, lng) values (${q(c.id)}, ${q(c.name)} || ${SPLIT_SUFFIX(x)}, (select parent_id from areas where id = ${q(x)}), 'crag', ${q(c.region)}, ${num(c.lat)}, ${num(c.lng)});
      update routes set area_id = ${q(c.id)} where area_id = ${q(x)};
      update areas set parent_id = ${q(x)} where id = ${q(c.id)};
      update areas set route_count = route_count + ${n} where id = ${q(x)};
      select 1 as ok;
      commit;`, 1);
    const b = sql(`select (select count(*)::int from routes where area_id = ${q(x)}) as rest, (select count(*)::int from routes where area_id = ${q(c.id)}) as moved, (select parent_id from areas where id = ${q(c.id)}) as par, (select route_count from areas where id = ${q(c.id)}) as cc`)[0];
    if (b.rest !== 0 || b.moved !== n || b.par !== x || +b.cc !== n) throw new Error(`${st.name}: split ${x} did not land ${JSON.stringify(b)} (expected ${n} moved)`);
  }

  // Then new areas (skipping the _climbs children the splits already made), parents before children (planned order already is), one at a time so the path
  // trigger sees each parent; each read back before a route is pointed at it.
  // A statement or gateway timeout (Vermont, 2026-10-02, with two other sessions writing) is asked
  // again up to four times a minute apart; a duplicate key on a retry means the timed-out insert
  // landed after all, and is checked rather than assumed.
  for (const a of newAreas) {
    let ok = false, last = "", st0 = 0;
    for (let t = 0; t < 5 && !ok; t++) {
      if (t) await new Promise(res => setTimeout(res, 60_000));
      const r = await fetchRetry(`${SUPABASE_URL}/rest/v1/areas`, { method: "POST", headers: { ...H, Prefer: "return=representation" }, body: JSON.stringify(a) });
      last = await r.text(); st0 = r.status;
      ok = r.ok && JSON.parse(last).length === 1;
      if (!ok && t && /23505/.test(last)) { const g = await fetchRetry(`${SUPABASE_URL}/rest/v1/areas?select=id&id=eq.${encodeURIComponent(a.id)}`, { headers: H }); ok = g.ok && JSON.parse(await g.text()).length === 1; }
      if (!ok && !(/57014|upstream request timeout/i.test(last) || r.status >= 500)) break;
    }
    if (!ok) throw new Error(`${st.name}: area ${a.id} insert failed ${st0} ${last.slice(0, 200)}`);
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
  for (let i = 0; i < inserts.length; i += 25) {
    const batch = inserts.slice(i, i + 25);
    const post = rows => fetchRetry(`${SUPABASE_URL}/rest/v1/routes`, { method: "POST", headers: { ...H, Prefer: "return=representation" }, body: JSON.stringify(rows) });
    const r = await post(batch);
    const txt = await r.text();
    // A statement timeout (57014) rolls the whole batch back — the insert triggers are slow on a
    // big state (California failed here at 11,792 inserts) — so the same rows are re-sent one at a
    // time, each with three tries a minute apart. The GATEWAY can time out too ("upstream request
    // timeout", Utah 2026-10-02) — and the row may have landed behind it, so a retry answered with
    // a duplicate key (23505) asks whether that row is now there; the count read-back below still
    // verifies every insert.
    const slow = (status, t) => /57014|upstream request timeout/i.test(t) || status >= 500;
    const landed = async id => { const g = await fetchRetry(`${SUPABASE_URL}/rest/v1/routes?select=id&id=eq.${encodeURIComponent(id)}`, { headers: H }); return g.ok && JSON.parse(await g.text()).length === 1; };
    if (!r.ok && slow(r.status, txt)) {
      for (const row of batch) {
        let ok = false, last = "";
        for (let t = 0; t < 3 && !ok; t++) {
          if (t) await new Promise(res => setTimeout(res, 60_000));
          const r1 = await post([row]); last = await r1.text();
          ok = r1.ok && JSON.parse(last).length === 1;
          if (!ok && /23505/.test(last)) ok = await landed(row.id);
          if (!ok && !slow(r1.status, last)) break;
        }
        if (!ok) throw new Error(`${st.name}: insert of ${row.id} failed ${last.slice(0, 300)}`);
      }
      continue;
    }
    if (!r.ok) throw new Error(`${st.name}: insert failed ${r.status} ${txt.slice(0, 300)}`);
    if (JSON.parse(txt).length !== batch.length) throw new Error(`${st.name}: insert count mismatch`);
  }
  // Each patch was read back above (return=representation, exactly one row); each insert must now
  // exist. (A rock route has no per-scale column, so the old per-scale read-back cannot apply.)
  let back = 0;
  for (let i = 0; i < inserts.length; i += 400) back += sql(`select count(*)::int n from routes where id in (${inserts.slice(i, i + 400).map(x => q(x.id)).join(",")})`)[0].n;
  if (back !== inserts.length) throw new Error(`${st.name}: read back ${back} of ${inserts.length} added`);
  console.log(`  wrote and verified ${patches.length} updated + ${inserts.length} added`);
  return { exported: byUrl.size, matched: matched.length, patched: patches.length, added: inserts.length, areas: newAreas.length, refused: nRef };
}

// Canada's provinces are filed as states under 'canada', their ids the postal code (ab, bc).
const states = sql(`select id, name from areas where parent_id in ('usa', 'canada') and area_type = 'state' order by name`);
const pick = ALL ? states : states.filter(s => args.includes(s.id));
if (!pick.length) { console.error("Name a state id or pass --all"); process.exit(1); }
if (!existsSync(DIR)) { console.error("no " + DIR + " — run fetch-ice-mixed-aid.mjs first"); process.exit(1); }
console.log((APPLY ? "APPLY" : "DRY RUN") + " — " + pick.length + " state(s)");
const tot = {};
for (const st of pick) {
  try { const r = await runState(st); for (const k in r) tot[k] = (tot[k] || 0) + r[k]; }
  catch (e) { console.error(`${st.name}: FAILED — ${e.message}`); process.exitCode = 1; }
}
console.log("TOTAL " + JSON.stringify(tot));
