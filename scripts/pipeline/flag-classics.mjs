// flag-classics.mjs — set `routes.classic` from the classics lists, every state, every wall.
//
// Two inputs, both read from disk (nothing is fetched here):
//   1. CLASSICS_DIR/classics.jsonl — one line per Mountain Project wall, the rows of its "Classic Climbs" page
//      (read under the owner's licence by ~/dev/classics-run/crawl-classics.mjs): {id, root, status, rows:[{mp,
//      name, stars, votes}]}. A row is a classic when MP_MIN_STARS+ of 4 from MP_MIN_VOTES+ votes.
//   2. CLASSICS_DIR/research/<state>.json — routes that guidebooks and other independent lists call classics,
//      {state, routes:[{route, wall, area, grade, discipline, agree, sources}]}. Matched by name inside the state
//      (via the wall/peak when it resolves), never by a name alone that two of our routes share.
// Only the flag is written; no name, text or rating from either source is stored, and nothing in the app says
// where a classic came from (no sources anywhere in the app).
//
// Matching an MP row to our route: the import's exact MP-id maps (MP_DIR/_map/*.json and the wall-order run's
// _order/*.adds.json), else by name on our area for that MP wall (_order/<state>.jsonl names it). A row that
// matches nothing is written to OUT/<state>.gaps.json for the importer — it is a climb this catalog lacks.
//
//   node scripts/pipeline/flag-classics.mjs --state washington            # dry: counts + gaps file
//   node scripts/pipeline/flag-classics.mjs --state washington --apply    # write (paced, patchRow), rollback file
//   node scripts/pipeline/flag-classics.mjs --all [--apply]
//   node scripts/pipeline/flag-classics.mjs --guidebook [--apply]           # the guidebooks' 3- and 4-star climbs
// research/<state>.json lists must be built from FETCHED pages: a 2026-10-29 pass written from a model's memory
// was quarantined (classics-run/research-unverified-DO-NOT-USE) and must never be fed to this script.
//
// THROTTLE: every write goes through patchRow (1 s apart, 30 s timeout, one back-off, then STOP); reads of an
// area's routes are paced the same way. A STOPPED error is not caught: re-run once the database answers.
import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { SUPABASE_URL, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";
import { stripRouteTopoLabel } from "../lib/route-topo-label.mjs";

const arg = k => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : null; };
const APPLY = process.argv.includes("--apply"), ALL = process.argv.includes("--all"), STATE = arg("state");
const MP_DIR = process.env.MP_DIR || "/Users/nathanbarber/dev/mp-data/_mp";
const CL_DIR = process.env.CLASSICS_DIR || "/Users/nathanbarber/dev/classics-run";
const OUT = CL_DIR + "/out";
const MP_MIN_STARS = 3, MP_MIN_VOTES = 5;
if (!ALL && !STATE && !process.argv.includes("--guidebook")) { console.error("usage: --state <slug> | --all  [--apply]"); process.exit(1); }
mkdirSync(OUT, { recursive: true });
const KEY = requireServiceKey();
const sleep = ms => new Promise(r => setTimeout(r, ms));

// The same name key order-from-mp.mjs matches walls by: case, accents, punctuation, a topo number and "The" do not count.
const key = s => String(stripRouteTopoLabel(s || "")).normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[’`]/g, "'").replace(/[^a-z0-9']+/g, " ").split(" ").filter(w => w && w !== "the").join(" ").replace(/'/g, "");
const slugOf = name => String(name || "").toLowerCase().replace(/ territory$/, "").replace(/[^a-z]+/g, "_").replace(/^_|_$/g, "");
// Our state slugs where they are not the name's (Canada uses the province code).
const SLUG = { british_columbia: "bc", alberta: "ab", quebec: "qc", ontario: "on", new_brunswick: "nb", nova_scotia: "ns", newfoundland_and_labrador: "nl", yukon: "yt", northwest_territories: "nt", nunavut: "nu", manitoba: "mb", saskatchewan: "sk" };
const stateSlug = name => SLUG[slugOf(name)] || slugOf(name);

const mp2ours = new Map();
for (const f of readdirSync(MP_DIR + "/_map")) for (const [m, o] of Object.entries(JSON.parse(readFileSync(MP_DIR + "/_map/" + f, "utf8")))) mp2ours.set(m, o);
for (const f of readdirSync(MP_DIR + "/_order").filter(f => f.endsWith(".adds.json"))) for (const [m, o] of Object.entries(JSON.parse(readFileSync(MP_DIR + "/_order/" + f, "utf8")))) mp2ours.set(m, o);
const wall2area = new Map();
for (const f of readdirSync(MP_DIR + "/_order").filter(f => f.endsWith(".jsonl") && !f.includes(".dry"))) for (const l of readFileSync(MP_DIR + "/_order/" + f, "utf8").split("\n")) { if (!l.trim()) continue; try { const x = JSON.parse(l); if (x.mp && x.area) wall2area.set(x.mp, x.area); } catch { /* a torn line */ } }

// --guidebook: flag every route a guidebook rates 3 or 4 of 4 stars (`guide_stars`, written by the guidebook audits
// from the books themselves). `guide_stars` has no index, so the one read goes over a direct connection
// (`supabase db query`, no REST statement timeout) instead of PostgREST, once, and the writes are paced as below.
if (process.argv.includes("--guidebook")) {
  const out = execFileSync("npx", ["supabase", "db", "query", "--linked", "--output-format", "json", "select id from routes where guide_stars >= 3 and not classic order by id"], { encoding: "utf8", maxBuffer: 1 << 30 });
  const j = JSON.parse(out.slice(Math.min(...[out.indexOf("{"), out.indexOf("[")].filter(i => i >= 0))));
  const todo = (Array.isArray(j) ? j : j.rows).map(r => r.id);
  console.log(`guidebook: ${todo.length} routes rated 3+ guidebook stars not yet classic`);
  if (APPLY && todo.length) {
    writeFileSync(`${OUT}/rollback-guidebook-${Date.now()}.json`, JSON.stringify({ set_true: todo }, null, 1));
    for (const id of todo) await patchRow("routes", id, { classic: true });
    console.log(`guidebook: wrote ${todo.length}`);
  }
  process.exit(0);
}

const walls = existsSync(CL_DIR + "/classics.jsonl") ? readFileSync(CL_DIR + "/classics.jsonl", "utf8").split("\n").filter(Boolean).map(l => JSON.parse(l)) : [];
const states = ALL ? [...new Set(walls.map(w => stateSlug(w.root)))] : [STATE];

async function get(path) {
  const t0 = Date.now();
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: headers(KEY), signal: AbortSignal.timeout(30000) }).catch(e => ({ ok: false, status: 0, text: async () => String(e) }));
  const text = await res.text();
  if (!res.ok) { console.error(`GET ${path.slice(0, 80)} -> ${res.status}; backing off 60 s`); await sleep(60000); throw new Error(`STOPPED: GET ${res.status} — re-run once a one-row read answers in under 1.5 s`); }
  if (Date.now() - t0 > 10000) { console.error(`GET took ${Math.round((Date.now() - t0) / 1000)} s — database struggling; backing off 60 s`); await sleep(60000); }
  await sleep(1000);
  return JSON.parse(text);
}
async function rpc(fn, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, { method: "POST", headers: headers(KEY, { "Content-Type": "application/json" }), body: JSON.stringify(body), signal: AbortSignal.timeout(30000) });
  await sleep(1000);
  if (!res.ok) throw new Error(`${fn} -> ${res.status}`);
  return res.json();
}
const areaRoutes = new Map();
async function routesOf(areaId) {
  if (!areaRoutes.has(areaId)) areaRoutes.set(areaId, await get(`routes?select=id,name,classic&area_id=eq.${encodeURIComponent(areaId)}&limit=2000`));
  return areaRoutes.get(areaId);
}

for (const st of states) {
  const mine = walls.filter(w => stateSlug(w.root) === st && Array.isArray(w.rows));
  const want = new Map(), gaps = [], why = { mpId: 0, name: 0, research: 0 };
  for (const w of mine) for (const r of w.rows) {
    if (!(r.stars >= MP_MIN_STARS && r.votes >= MP_MIN_VOTES)) continue;
    const ours = mp2ours.get(r.mp);
    if (ours) { want.set(ours, "mp"); why.mpId++; continue; }
    const area = wall2area.get(w.id);
    const hit = area ? (await routesOf(area)).filter(x => key(x.name) === key(r.name)) : [];
    if (hit.length === 1) { want.set(hit[0].id, "mp-name"); why.name++; }
    else gaps.push({ mpWall: w.id, mpRoute: r.mp, name: r.name, ourArea: area || null, why: hit.length > 1 ? "two of ours share the name" : area ? "not on our wall" : "no area of ours for this wall" });
  }
  // Guidebooks and other lists: matched inside the state by name, narrowed by the wall/peak when that resolves.
  const rf = `${CL_DIR}/research/${st}.json`, held = [];
  // The catalog directory's own lookups (0214): the wall/peak by name inside the state, then the route by name
  // within 3 km of it. A route is flagged only when exactly one same-named route answers; anything else is held.
  if (existsSync(rf)) { const doc = JSON.parse(readFileSync(rf, "utf8")); for (const r of doc.routes || []) {
    const ids = new Set();
    for (const place of [r.wall, r.area].filter(Boolean)) {
      const areas = await rpc("catalog_find_area", { p_name: place, p_state: doc.state }).catch(() => []);
      for (const a of areas.filter(a => a.match === "same name").slice(0, 4)) for (const h of await rpc("catalog_find_route", { p_name: r.route, p_area_id: a.area_id }).catch(() => [])) if (h.match === "same name") ids.add(h.route_id);
      if (ids.size) break;
    }
    if (ids.size === 1) { const id = [...ids][0]; want.set(id, want.get(id) || "research"); why.research++; } else held.push({ ...r, candidates: [...ids] });
  } }
  const ids = [...want.keys()];
  const now = [];
  for (let i = 0; i < ids.length; i += 150) now.push(...await get(`routes?select=id,classic&id=in.(${ids.slice(i, i + 150).map(encodeURIComponent).join(",")})`));
  const todo = now.filter(r => !r.classic).map(r => r.id);
  writeFileSync(`${OUT}/${st}.gaps.json`, JSON.stringify(gaps, null, 1));
  writeFileSync(`${OUT}/${st}.held.json`, JSON.stringify(held, null, 1));
  console.log(`${st}: ${mine.length} walls read; classics ${ids.length} (by MP id ${why.mpId}, by name ${why.name}, by research ${why.research}); ${todo.length} to flag; ${gaps.length} gaps; ${held.length} research held`);
  if (!APPLY || !todo.length) continue;
  writeFileSync(`${OUT}/rollback-${st}-${Date.now()}.json`, JSON.stringify({ set_true: todo }, null, 1));
  let n = 0;
  for (const id of todo) { await patchRow("routes", id, { classic: true }); if (++n % 100 === 0) console.log(`  ${st}: ${n}/${todo.length}`); }
  const back = [];
  for (let i = 0; i < todo.length; i += 150) back.push(...await get(`routes?select=id,classic&id=in.(${todo.slice(i, i + 150).map(encodeURIComponent).join(",")})`));
  console.log(`  ${st}: wrote ${n}; re-read ${back.filter(r => r.classic).length}/${todo.length} classic`);
}
