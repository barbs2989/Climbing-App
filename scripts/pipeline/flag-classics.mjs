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
// MP appends " | <digits>" to some names on its pages; order-from-mp's mpRows strips it the same way.
const key = s => String(stripRouteTopoLabel(String(s || "").replace(/\s*\|\s*\d+$/, ""))).normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[’`]/g, "'").replace(/[^a-z0-9']+/g, " ").split(" ").filter(w => w && w !== "the").join(" ").replace(/'/g, "");
const slugOf = name => String(name || "").toLowerCase().replace(/ territory$/, "").replace(/[^a-z]+/g, "_").replace(/^_|_$/g, "");
// Our state slugs where they are not the name's (Canada uses the province code).
const SLUG = { british_columbia: "bc", alberta: "ab", quebec: "qc", ontario: "on", new_brunswick: "nb", nova_scotia: "ns", newfoundland_and_labrador: "nl", yukon: "yt", northwest_territories: "nt", nunavut: "nu", manitoba: "mb", saskatchewan: "sk" };
const stateSlug = name => SLUG[slugOf(name)] || slugOf(name);

// The wall-order re-check (MP_FRESH, run first, state by state) knows boulder walls the 2026-10-25 run never
// touched; its maps and wall→area lines are read after the old ones, so they win.
const MP_FRESH = process.env.MP_FRESH || "/Users/nathanbarber/dev/mp-fresh";
const mp2ours = new Map();
for (const f of readdirSync(MP_DIR + "/_map")) for (const [m, o] of Object.entries(JSON.parse(readFileSync(MP_DIR + "/_map/" + f, "utf8")))) mp2ours.set(m, o);
const wall2area = new Map();
for (const ord of [MP_DIR + "/_order", MP_FRESH + "/_order"].filter(existsSync)) {
  for (const f of readdirSync(ord).filter(f => f.endsWith(".adds.json"))) for (const [m, o] of Object.entries(JSON.parse(readFileSync(ord + "/" + f, "utf8")))) mp2ours.set(m, o);
  for (const f of readdirSync(ord).filter(f => f.endsWith(".jsonl") && !f.includes(".dry"))) for (const l of readFileSync(ord + "/" + f, "utf8").split("\n")) { if (!l.trim()) continue; try { const x = JSON.parse(l); if (x.mp && x.area) wall2area.set(x.mp, x.area); } catch { /* a torn line */ } }
}

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
  // A state is flagged only once the crawl has read every one of its walls (CLASSICS_DIR/leaves.jsonl lists them).
  if (existsSync(CL_DIR + "/leaves.jsonl")) {
    const need = readFileSync(CL_DIR + "/leaves.jsonl", "utf8").split("\n").filter(Boolean).map(l => JSON.parse(l)).filter(w => stateSlug(w.root) === st).length;
    const read = walls.filter(w => stateSlug(w.root) === st).length;
    if (read < need && !process.argv.includes("--partial")) { console.log(`${st}: crawl has read ${read} of ${need} walls — not yet (pass --partial to flag what is read)`); continue; }
  }
  const want = new Map(), gaps = [], why = { mpId: 0, name: 0, research: 0 }, resolved = new Map(), score = new Map();
  // `classic_score` (0393) is the order the classics lists show them in, never shown itself: the climbers' average
  // stars pulled toward 3 by five phantom votes, so 4 stars from 5 votes (3.5) ranks under 4 from 400 (3.99).
  // Without it every route with no stars of ours sorted by NAME under "best first".
  const bayes = r => Math.round(((Number(r.stars) || 0) * (Number(r.votes) || 0) + 3 * 5) / ((Number(r.votes) || 0) + 5) * 100) / 100;
  const keep = (id, r) => { const v = bayes(r); if (!(score.get(id) >= v)) score.set(id, v); };
  // The state's own top list (MP's state-level classics page, crawl-state-classics.mjs): its routes also get the
  // `state_classics` list slug (0390), which the Challenges card and the route page's chip read.
  const stateTop = new Set(((existsSync(CL_DIR + "/state-classics.json") ? JSON.parse(readFileSync(CL_DIR + "/state-classics.json", "utf8")) : {})[(mine[0] || {}).root] || { rows: [] }).rows?.map(r => r.mp) || []);
  for (const w of mine) for (const r of w.rows) {
    if (!(r.stars >= MP_MIN_STARS && r.votes >= MP_MIN_VOTES) && !stateTop.has(r.mp)) continue;
    const ours = mp2ours.get(r.mp);
    if (ours) { want.set(ours, "mp"); resolved.set(r.mp, ours); keep(ours, r); why.mpId++; continue; }
    const area = wall2area.get(w.id);
    const hit = area ? (await routesOf(area)).filter(x => key(x.name) === key(r.name)) : [];
    if (hit.length === 1) { want.set(hit[0].id, "mp-name"); resolved.set(r.mp, hit[0].id); keep(hit[0].id, r); why.name++; }
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
  const topIds = new Set([...stateTop].map(m => resolved.get(m)).filter(Boolean));
  const now = [];
  for (let i = 0; i < ids.length; i += 150) now.push(...await get(`routes?select=id,classic,lists,classic_score&id=in.(${ids.slice(i, i + 150).map(encodeURIComponent).join(",")})`));
  // One write per route: `classic` and, for a state top-100 route, the list slug appended to whatever `lists` holds.
  const todo = now.map(r => {
    const body = {};
    if (!r.classic) body.classic = true;
    if (topIds.has(r.id) && !(r.lists || []).includes("state_classics")) body.lists = [...(r.lists || []), "state_classics"];
    if (score.has(r.id) && Number(r.classic_score) !== score.get(r.id)) body.classic_score = score.get(r.id);
    return Object.keys(body).length ? { id: r.id, body, before: { classic: r.classic, lists: r.lists, classic_score: r.classic_score } } : null;
  }).filter(Boolean);
  writeFileSync(`${OUT}/${st}.gaps.json`, JSON.stringify(gaps, null, 1));
  writeFileSync(`${OUT}/${st}.held.json`, JSON.stringify(held, null, 1));
  console.log(`${st}: ${mine.length} walls read; classics ${ids.length} (by MP id ${why.mpId}, by name ${why.name}, by research ${why.research}); state top ${topIds.size} of ${stateTop.size}; ${todo.length} to write; ${gaps.length} gaps; ${held.length} research held`);
  if (!APPLY || !todo.length) continue;
  writeFileSync(`${OUT}/rollback-${st}-${Date.now()}.json`, JSON.stringify(todo.map(t => ({ id: t.id, before: t.before })), null, 1));
  let n = 0;
  for (const t of todo) { await patchRow("routes", t.id, t.body); if (++n % 100 === 0) console.log(`  ${st}: ${n}/${todo.length}`); }
  const back = [];
  for (let i = 0; i < todo.length; i += 150) back.push(...await get(`routes?select=id,classic,lists,classic_score&id=in.(${todo.slice(i, i + 150).map(t => encodeURIComponent(t.id)).join(",")})`));
  const okRows = back.filter(r => r.classic && (!topIds.has(r.id) || (r.lists || []).includes("state_classics")) && (!score.has(r.id) || Number(r.classic_score) === score.get(r.id))).length;
  console.log(`  ${st}: wrote ${n}; re-read ${okRows}/${todo.length} as intended`);
  if (okRows !== todo.length) { console.error(`  ${st}: re-read MISMATCH — stopping`); process.exit(1); }
}
