// import-mp-grades.mjs — bring Mountain Project's routes into the catalog, from the CSV exports
// scripts/pipeline/fetch-mp-ice-mixed-aid.mjs and fetch-mp-rock-boulder.mjs cached under
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
// The export escapes a few characters as HTML entities; a stored name must read as plain text.
const decode = s => String(s || "").replace(/&#0?39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").trim();
const norm = s => String(s || "").normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/&#0?39;|&apos;/g, "'").replace(/&amp;/g, "&").trim().toLowerCase();
// Area names only: our Adirondack areas carry sorting prefixes ("D: Keene Valley and Chapel Pond",
// "* Adirondack Ice & Mixed") that the export's location path does not.
const areaNorm = s => norm(s).replace(/^(?:[a-z]\s*:\s*|\*\s*)/, "").trim();
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
      if (!out.includes("{")) throw new Error("empty answer from supabase db query: " + JSON.stringify(out.slice(0, 200)));
      const j = JSON.parse(out.slice(out.indexOf("{")));
      if (!Array.isArray(j.rows)) throw new Error("unexpected output: " + out.slice(0, 200));
      return j.rows;
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
  // WE MAY ALREADY HAVE THE AREA, FILED ELSEWHERE. MP files Fireplace Rock as "Cherokee Rock Village
  // (Sand Rock) > Sand Rock Bouldering > Fireplace Rock"; ours is "Sand Rock > Fireplace Rock". Minting
  // a new area for every level below the first mismatch made al_fireplace_rock_2 and added its routes
  // again (168 in Alabama, ~1,069 in Alaska). So before a level is created, an EXISTING area of the
  // same name within NEAR_KM of the route's own MP coordinates is used instead — if exactly one.
  // Names compare by the database's catalog_key (see CK): a child "Flintstone, The" IS MP's "The
  // Flintstone", and refuse_duplicate_area would reject the second one anyway.
  const keyOf = x => x.k ?? ck(x.name);
  const byId = new Map(rows.map(r => [r.id, r])), byName = new Map(), kidsK = new Map(), byFold = new Map(), kidsF = new Map();
  const index = r => {
    const k = keyOf(r); (byName.get(k) || byName.set(k, []).get(k)).push(r); const kk = r.parent_id + "|" + k; (kidsK.get(kk) || kidsK.set(kk, []).get(kk)).push(r);
    const f = fk(r.name); (byFold.get(f) || byFold.set(f, []).get(f)).push(r); const fkk = r.parent_id + "|" + f; (kidsF.get(fkk) || kidsF.set(fkk, []).get(fkk)).push(r);
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
  const placeInner = (chain, create, geo) => {
    let cur = stateId, skips = 0, created = false;
    for (let i = 0; i < chain.length; i++) {
      let c = kids.get(cur + "|" + areaNorm(chain[i])) || [];
      if (!c.length) c = kidsK.get(cur + "|" + ck(chain[i])) || [];
      if (!c.length) c = (kidsF.get(cur + "|" + fk(chain[i])) || []).filter(r => foldTwins(chain[i], r.name));
      if (c.length === 1) { cur = c[0].id; continue; }
      if (c.length > 1) return { why: "two of our areas share this name under one parent", at: chain.slice(0, i + 1).join(" > ") };
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
        splits.set(cur, s);
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
  return null;
}
const PRIMARY = { ice: () => "wi", mixed: tk => tk.yds ? "yds" : "m", aid: tk => tk.yds ? "yds" : "aid", trad: () => "yds", sport: () => "yds", toprope: () => "yds", bouldering: () => "v" };
const TYPE_DISC = { trad: "trad", sport: "sport", tr: "toprope", boulder: "bouldering", ice: "ice", mixed: "mixed", aid: "aid", alpine: "alpine" };

async function runState(st) {
  const files = readdirSync(DIR).filter(f => f.startsWith(st.id + "_") && f.endsWith(".csv"));
  if (!files.length) { console.log(`${st.name}: no export cached — run fetch-mp-ice-mixed-aid.mjs first`); return {}; }
  // Every file of the state — slices, their grade splits, sub-area splits, every type — deduped by
  // the route's URL. A slice that hit the cap is a subset of its splits, so reading it is harmless.
  const byUrl = new Map();
  for (const f of files) {
    if (!/_(ice|mixed|aid|rock|boulder)_\d+_\d+(?:_a\d+)?\.csv$/.test(f)) continue;
    for (const r of parseCsv(readFileSync(DIR + "/" + f, "utf8"))) if (r.URL) byUrl.set(r.URL, r);
  }
  // A state whose rock/boulder crawl is unfinished is REFUSED, not half-imported: every file at the
  // 1,000-row cap must have its splits on disk (both grade halves, or at least one sub-area file).
  const has = new Set(files);
  for (const f of files) {
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
  for (const r of byUrl.values()) { allNames.push(mpName(r)); for (const a of String(r.Location || "").split(" > ")) allNames.push(a.trim()); }
  catalogKeys(allNames);
  const place = resolver(st.id, st.name, planned, splits);
  const refused = {}, matched = [], added = [], whereRefused = [];
  const cand = [];
  // Existing-area placements first, so an area CREATED for one route is never planned as a leaf
  // that an existing-area placement later needs to descend through.
  const rowsIn = [...byUrl.values()].map(r => ({ r, tk: tokens(r.Rating), chain: String(r.Location || "").split(" > ").map(s => s.trim()).reverse() }));
  const deferred = [];
  for (const { r, tk, chain } of rowsIn) {
    if (!tk.wi && !tk.m && !tk.aid && !tk.yds && !tk.v) { refused["no grade we can read"] = (refused["no grade we can read"] || 0) + 1; continue; }
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
    for (let i = 0; i < vals.length; i += 1000) for (const h of sql(`
      with s as materialized (select id, name, area_type, lat, lng, catalog_key(name) k, search_canon(name) sc
                                from areas where path <@ (select path from areas where id = ${q(st.id)})),
           v as materialized (select id, name, lat, lng, catalog_key(name) k, search_canon(name) sc
                                from (values ${vals.slice(i, i + 1000).join(",")}) v(id, name, lat, lng))
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
  for (let i = 0; i < areaIds.length; i += 400) existing.push(...sql(`select id, area_id, name, catalog_key(name) as k, grade, grade_system, ice_grade, aid_grade, ice_grade_num, mixed_grade_num, aid_grade_num from routes where area_id in (${areaIds.slice(i, i + 400).map(q).join(",")})`));
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
  for (const { r, tk, areaId } of cand) {
    const name = mpName(r);
    const e = byKey.get(areaId + "|" + norm(name)) || byCk.get(areaId + "|" + ck(name));
    if (e) {
      const p = {};
      if (tk.wi && e.ice_grade_num == null) { p.ice_grade_num = tk.wi.num; if (!e.ice_grade) p.ice_grade = tk.wi.tok; }
      if (tk.m && e.mixed_grade_num == null) { p.mixed_grade_num = tk.m.num; if (!e.ice_grade && !p.ice_grade) p.ice_grade = tk.m.tok; }
      if (tk.aid && e.aid_grade_num == null) { p.aid_grade_num = tk.aid.num; if (!e.aid_grade) p.aid_grade = tk.aid.tok; }
      if (Object.keys(p).length) patches.push({ id: e.id, p });
      matched.push(e.id);
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
    const pnum = tk[primary].num;
    let id = areaId + "_" + slug(name), n = 2; while (taken.has(id)) id = areaId + "_" + slug(name) + "_" + n++; taken.add(id);
    const types = String(r["Route Type"] || "").toLowerCase().split(",").map(s => s.trim());
    inserts.push({
      id, area_id: areaId, name, discipline: disc, grade: String(r.Rating).trim(), grade_system: primary, grade_num: pnum,
      ice_grade: (tk.wi || tk.m) ? (tk.wi || tk.m).tok : null, aid_grade: tk.aid ? tk.aid.tok : null,
      ice_grade_num: tk.wi ? tk.wi.num : null, mixed_grade_num: tk.m ? tk.m.num : null, aid_grade_num: tk.aid ? tk.aid.num : null,
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
    for (let i = 0; i < vals.length; i += 1000) for (const h of sql(`
      with s as materialized (select id, name, lat, lng, catalog_key(name) k
                                from areas where path <@ (select path from areas where id = ${q(st.id)})),
           v as materialized (select v.id, catalog_key(v.name) rk, catalog_key(coalesce(a.name, nullif(v.aname, ''))) ak,
                                     coalesce(a.lat, v.lat) lat, coalesce(a.lng, v.lng) lng
                                from (values ${vals.slice(i, i + 1000).join(",")}) v(id, name, area_id, aname, lat, lng)
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
  if (!APPLY) return { exported: byUrl.size, matched: matched.length, patched: patches.length, added: inserts.length, areas: newAreas.length, splits: effSplits.length, refused: nRef };

  // Splits first, one transaction each: the _climbs child is created BESIDE the area (the leaf-XOR
  // trigger forbids it under an area holding routes), the routes move into it, it is re-parented
  // under the area, and the area gets back the count the move took off it (the move did -n on the
  // area and nothing net on its ancestors; a re-parent does not re-bump route_count).
  const num = v => v == null ? "null" : String(+v);
  for (const { x, c } of effSplits) {
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
  for (let i = 0; i < inserts.length; i += 25) {
    const batch = inserts.slice(i, i + 25);
    const post = rows => fetchRetry(`${SUPABASE_URL}/rest/v1/routes`, { method: "POST", headers: { ...H, Prefer: "return=representation" }, body: JSON.stringify(rows) });
    const r = await post(batch);
    const txt = await r.text();
    // A statement timeout (57014) rolls the whole batch back — the insert triggers are slow on a
    // big state (California failed here at 11,792 inserts) — so the same rows are re-sent one at a
    // time, each with three tries a minute apart.
    if (!r.ok && /57014/.test(txt)) {
      for (const row of batch) {
        let ok = false, last = "";
        for (let t = 0; t < 3 && !ok; t++) {
          if (t) await new Promise(res => setTimeout(res, 60_000));
          const r1 = await post([row]); last = await r1.text();
          ok = r1.ok && JSON.parse(last).length === 1;
          if (!ok && !/57014/.test(last)) break;
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
