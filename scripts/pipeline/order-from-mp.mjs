// order-from-mp.mjs — fill `routes.sort_order` (left-to-right on the wall) from Mountain Project's area
// pages, and add the sport / trad / top-rope climbs a wall is missing so the order has no gaps. Run under
// the owner's written permission from onX to crawl mountainproject.com (2026-09-24), paced by
// scripts/lib/paced-fetch.mjs.
//
// An MP area page's route table carries each route's left-to-right index as `data-lr` (999999 = not
// placed). The cached tree walk (_tree) kept the table's rows but not that attribute, so each page is
// read again (and cached under _pages, so a re-run asks nothing).
//
//   node scripts/pipeline/order-from-mp.mjs --area ny_a1_the_uberfall_left --mp 107037539 [--state new_york] [--apply]
//   node scripts/pipeline/order-from-mp.mjs --state new_york [--apply] [--limit N]      every wall in the state
//   node scripts/pipeline/order-from-mp.mjs --state new_york --facts [--apply]          the climbs it added: their facts
//
// MP_DIR (default catalog/_mp) holds _tree, _map, _pages, _routes and writes _order/<state>.*.
//
// The plan, per wall and per route:
//   MATCHED   MP's route is ours — by the import's exact MP-id map (_map/<state>.json), else by name on
//             this wall (case, punctuation, "The" and a topo number "(01)" do not count). It takes MP's position.
//   ADD       MP lists a sport / trad / top-rope route this wall lacks: it is added (grade and type from the
//             page), in MP's position. It is NOT added, and goes on the review list instead, when
//               - the MP-id map says it is one of our climbs filed on another wall (ELSEWHERE), or
//               - its name contains, or sits inside, the name of one of our climbs on this wall that no
//                 other MP route matched (REVIEW: "Fancy Idiot" may be our "Fancy I"), or
//               - MP lists the same name twice on the wall, or
//               - the database refuses it as the same climb nearby (refuse_duplicate_route, 0216).
//   ANCHORED  ours, not on MP, but OpenBeta's older copy of MP's order places it: it goes directly right of
//             its nearest left-hand neighbour there that MP still places.
//   UNPLACED  nobody places it: sort_order stays empty, and the app lists it last, by name.
// Positions are then renumbered 1..n along the wall, so "#n in this area" reads as a count.
//
// WHICH OF OUR AREAS IS THE WALL (state mode): every route MP files on the wall votes with the area of
// ours it maps to (by MP id, else by a name unique in the state). The wall is ours when one area holds at
// least 60% of the votes and no other MP wall claims that same area; otherwise it is logged and skipped —
// two MP walls in one list of ours have no single left-to-right order. A wall with no votes at all is
// logged as "no area of ours" (the CSV import already refused those routes, by reason).
//
// --facts reads the route page of every climb this script added (cached under _routes) and stores its
// FACTS where the row is empty: length, pitches, GPS and the star average. Prose (description, protection,
// location, first ascent) is never stored as fetched: extract-route-details.mjs cuts it into batches for
// rewriting, and apply-route-details.mjs refuses any rewrite that repeats four words of the page.
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { SUPABASE_URL, requireServiceKey, headers, patchRow } from "../lib/supabase-env.mjs";
import { mpGet } from "../lib/paced-fetch.mjs";
import { stripRouteTopoLabel } from "../lib/route-topo-label.mjs";
import { gradeNumFrom } from "../../lib/grade.js";

const arg = k => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : null; };
const AREA = arg("area"), MP = arg("mp"), STATE = arg("state"), APPLY = process.argv.includes("--apply"), FACTS = process.argv.includes("--facts");
const LIMIT = arg("limit") ? +arg("limit") : Infinity;
if (!STATE && !(AREA && MP)) { console.error("usage: --area <our area id> --mp <MP area id> [--state <slug>] [--apply]  |  --state <slug> [--facts] [--apply] [--limit N]"); process.exit(1); }
const DIR = process.env.MP_DIR || "catalog/_mp", PAGES = DIR + "/_pages", ROUTES = DIR + "/_routes", ORDER = DIR + "/_order";
for (const d of [PAGES, ROUTES, ORDER]) mkdirSync(d, { recursive: true });

const unent = s => s.replace(/&amp;/g, "&").replace(/&#0?39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();
// The route table, in left-to-right order. Each row: data-lr, the route link, its type tags, its YDS grade.
export function mpRows(html) {
  const table = html.split('id="left-nav-route-table"')[1]?.split("</table>")[0] || "";
  return table.split("<tr ").slice(1).map(row => {
    const lr = row.match(/data-lr="(-?\d+)"/), a = row.match(/route\/(\d+)\/[^"]*">([^<]*)<\/a>\s*<span class="route-type ([^"]*)">/);
    const yds = row.match(/class='rateYDS'>([^<]+)</);
    return lr && a ? { lr: +lr[1], mpId: a[1], name: unent(a[2]).replace(/\s*\|\s*\d+$/, ""), tags: a[3].trim().split(/\s+/), yds: yds ? unent(yds[1]) : null } : null;
  }).filter(Boolean).sort((x, y) => x.lr - y.lr);
}
// A name as a key: case, accents, punctuation, a topo number and a leading/trailing "The" do not count
// ("Brat, The" = "The Brat" = "(12) The Brat").
const key = s => String(stripRouteTopoLabel(s || "")).normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[’`]/g, "'").replace(/[^a-z0-9']+/g, " ").split(" ").filter(w => w && w !== "the").join(" ").replace(/'/g, "");
const loose = s => key(s).replace(/\([^)]*\)/g, "").replace(/[^a-z0-9]/g, "");
const slug = s => ((s || "x").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 55) || "x");
const PLACED = r => r.lr < 999999;
const ROPED = t => t.includes("Trad") || t.includes("Sport") || t.includes("TR") || t.includes("Toprope");
// A ROCK route: roped, and not one of MP's ice / mixed / snow lines (which it also tags Trad). MP keeps a
// parallel "Adirondack Ice & Mixed" tree whose walls carry the same names as the rock ones.
const ROCK = t => ROPED(t) && !t.includes("Ice") && !t.includes("Mixed") && !t.includes("Snow");
// A climb is added only on a 5.x grade: MP files slides and scrambles (3rd, 4th, Easy 5th) as Trad too.
const FIFTH = g => /^5\.\d/.test(g || "");

const k = requireServiceKey();
const rest = async (p, init) => { const r = await fetch(SUPABASE_URL + "/rest/v1/" + p, { ...init, headers: headers(k, { "Content-Type": "application/json", ...init?.headers }) }); const t = await r.text(); if (!r.ok) throw new Error(p + ": HTTP " + r.status + " " + t); return t ? JSON.parse(t) : null; };
// A statement timeout (57014), a gateway error or a dropped connection is asked again, five times, further apart
// each time: Colorado stopped on one timed-out PATCH (2026-10-21) while another session was writing.
const TRANSIENT = /57014|statement timeout|upstream request timeout|HTTP 5\d\d|-> 5\d\d |fetch failed|ECONNRESET|ETIMEDOUT|socket hang up|PGRST303|JWT issued at future/i;
async function retrying(fn) {
  for (let i = 0; ; i++) {
    try { return await fn(i); }
    catch (e) { if (i >= 4 || !TRANSIENT.test(e.message)) throw e; await new Promise(r => setTimeout(r, 20_000 * (i + 1))); }
  }
}
// The state's routes come through the CLI (an ltree subtree, which PostgREST cannot filter on).
// Eight tries, backing off to a minute, as import-route-grades.mjs does: Utah failed on "Connection terminated
// due to connection timeout" (status 544) while the database was busy, and the loop moved on without it.
function sql(text) {
  for (let t = 0; ; t++) {
    try { const out = execFileSync("npx", ["supabase", "db", "query", "--linked", "--output-format", "json", text], { encoding: "utf8", maxBuffer: 1 << 30, stdio: ["ignore", "pipe", "pipe"] }); const at = [out.indexOf("{"), out.indexOf("[")].filter(i => i >= 0); const j = JSON.parse(out.slice(Math.min(...at))); if (j._tag === "Error") throw new Error(JSON.stringify(j.error)); const rows = Array.isArray(j) ? j : j.rows; if (!Array.isArray(rows)) throw new Error("unexpected output " + out.slice(0, 200)); return rows; }
    catch (e) { if (t >= 7) throw e; execFileSync("sleep", [String(Math.min(60, 5 * 2 ** t))]); }
  }
}
const q = s => "'" + String(s).replace(/'/g, "''") + "'";
const loadMap = st => { const m = {}; for (const f of [`${DIR}/_map/${st}.json`, `${DIR}/_map/${st}.snow.json`, `${ORDER}/${st}.adds.json`]) if (existsSync(f)) Object.assign(m, JSON.parse(readFileSync(f, "utf8"))); return m; };

async function page(kind, id, file) {
  if (existsSync(file)) return readFileSync(file, "utf8");
  const r = await mpGet(`https://www.mountainproject.com/${kind}/${id}`);
  if (r.status !== 200) throw new Error(`MP ${kind} ${id}: HTTP ${r.status}`);
  writeFileSync(file, r.body);
  return r.body;
}

// OpenBeta's older copy of MP's order, for the climbs of ours MP no longer lists.
async function openBetaOrder(areaName, mp) {
  const qy = `{ areas(filter:{area_name:{match:${JSON.stringify(areaName)}}}) { areaName climbs { name metadata{leftRightIndex} } } }`;
  try {
    const j = await (await fetch("https://api.openbeta.io/", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: qy }) })).json();
    const mpKeys = new Set(mp.map(m => key(m.name)));
    const best = (j.data?.areas || []).map(a => ({ a, hit: a.climbs.filter(c => mpKeys.has(key(c.name))).length })).sort((x, y) => y.hit - x.hit)[0];
    return best && best.hit >= 3 ? best.a.climbs.filter(c => c.metadata.leftRightIndex < 999999).sort((x, y) => x.metadata.leftRightIndex - y.metadata.leftRightIndex) : [];
  } catch { return []; }
}

// One wall: match, decide adds, anchor, renumber. `elsewhere(mpId)` names one of our climbs on ANOTHER
// wall that the MP-id map says this route is; `usedIds` keeps new ids unique across the run.
async function planWall({ html, area, ours, idMap, elsewhere, usedIds, wallName }) {
  const mp = mpRows(html);
  if (!mp.length) return { error: "no route table on the page" };
  const byId = new Map(ours.map(r => [r.id, r])), byKey = new Map();
  for (const r of ours) { const kk = key(r.name); if (!byKey.has(kk)) byKey.set(kk, []); byKey.get(kk).push(r); }
  const taken = new Set(), plan = [];
  for (const m of mp) {
    let r = idMap[m.mpId] && byId.get(idMap[m.mpId]);
    let how = r ? "id" : null;
    if (!r) { const c = (byKey.get(key(m.name)) || []).filter(x => !taken.has(x.id)); if (c.length === 1) { r = c[0]; how = "name"; } }
    if (r && !taken.has(r.id)) { taken.add(r.id); plan.push({ ...m, kind: "MATCHED", how, ours: r }); }
    else plan.push({ ...m, kind: "MISSING" });
  }
  const seenNew = new Set();
  for (const p of plan.filter(p => p.kind === "MISSING")) {
    if (!ROCK(p.tags) || !FIFTH(p.yds)) { p.kind = "SKIP"; p.why = !ROCK(p.tags) ? "not a sport, trad or top-rope rock climb" : "no 5.x grade (a slide or a scramble)"; continue; }
    const other = elsewhere(p.mpId, area.id);
    if (other) { p.kind = "ELSEWHERE"; p.why = `ours on another wall: ${other.id} (${other.area_id})`; continue; }
    const nn = loose(p.name);
    const near = ours.find(r => !taken.has(r.id) && nn.length >= 4 && loose(r.name).length >= 4 && (loose(r.name).includes(nn) || nn.includes(loose(r.name))));
    if (near) { p.kind = "REVIEW"; p.why = "may be our " + JSON.stringify(near.name) + " (" + near.id + ")"; continue; }
    if (seenNew.has(key(p.name))) { p.kind = "REVIEW"; p.why = "MP lists this name twice on the wall"; continue; }
    if (wallName && key(p.name).includes(key(wallName))) { p.kind = "REVIEW"; p.why = "named for the wall itself, not a climb"; continue; }
    seenNew.add(key(p.name));
    const name = stripRouteTopoLabel(p.name).replace(/^(.+), (The|A|An)$/i, "$2 $1");
    const disc = p.tags.includes("Trad") ? "trad" : p.tags.includes("Sport") ? "sport" : "toprope";
    let id = area.id + "_" + slug(name), n = 2; while (usedIds.has(id)) id = area.id + "_" + slug(name) + "_" + n++; usedIds.add(id);
    const disciplines = [...new Set([disc, ...(p.tags.includes("Trad") ? ["trad"] : []), ...(p.tags.includes("Sport") ? ["sport"] : []), ...(p.tags.includes("TR") || p.tags.includes("Toprope") ? ["toprope"] : [])])];
    p.kind = "ADD"; p.row = { id, area_id: area.id, name, discipline: disc, grade: p.yds, grade_system: "yds", grade_num: gradeNumFrom(p.yds, "yds"), pitches: 0, disciplines, auto_generated: false };
  }
  const extra = ours.filter(r => !taken.has(r.id));
  const ob = extra.length ? await openBetaOrder(area.name, mp) : [];
  const seq = plan.filter(p => PLACED(p) && (p.kind === "MATCHED" || p.kind === "ADD"));
  const anchored = [], unplaced = [];
  for (const r of extra) {
    const i = ob.findIndex(c => key(c.name) === key(r.name));
    let at = -1;
    for (let j = i - 1; i >= 0 && j >= 0 && at < 0; j--) at = seq.findIndex(s => key(s.name) === key(ob[j].name));
    if (i >= 0 && (at >= 0 || i === 0)) { anchored.push({ r, after: at >= 0 ? seq[at].name : "(left end)" }); seq.splice(at + 1, 0, { kind: "ANCHORED", name: r.name, ours: r }); }
    else unplaced.push(r);
  }
  const pos = new Map(); seq.forEach((s, i) => pos.set(s.ours ? s.ours.id : s.row.id, i + 1));
  const writes = ours.filter(r => (pos.get(r.id) ?? null) !== r.sort_order);
  const adds = plan.filter(p => p.kind === "ADD").map(p => ({ mpId: p.mpId, row: { ...p.row, sort_order: pos.get(p.row.id) ?? null } }));
  return { mp, plan, seq, pos, anchored, unplaced, writes, adds };
}

function printWall(area, mpId, w, ours) {
  console.log(`${area.name} (${area.id})  <-  MP area ${mpId}: ${w.mp.length} MP routes (${w.mp.filter(PLACED).length} placed), ${ours.length} ours`);
  for (const s of w.seq) console.log(String(w.pos.get(s.ours ? s.ours.id : s.row.id)).padStart(3), s.kind.padEnd(8), s.name, s.kind === "MATCHED" ? `(by ${s.how})` : s.kind === "ADD" ? `[new ${s.row.discipline} ${s.row.grade}]` : "");
  for (const p of w.plan.filter(p => !PLACED(p) && (p.kind === "MATCHED" || p.kind === "ADD"))) console.log("  -", p.kind.padEnd(8), p.name, "(MP does not place it)");
  for (const a of w.anchored) console.log("  ANCHORED", a.r.name, "-> right of", a.after);
  for (const r of w.unplaced) console.log("  UNPLACED", r.name, "(ours; neither MP nor OpenBeta places it)");
  for (const p of w.plan.filter(p => ["REVIEW", "SKIP", "ELSEWHERE"].includes(p.kind))) console.log("  " + p.kind.padEnd(9), p.name, "—", p.why);
}

// Write one wall: adds one at a time (so a refusal by the duplicate trigger costs one climb, not the
// batch), then sort_order, then read back — a 200 is not evidence the data changed.
async function writeWall(area, w) {
  const added = [], refused = [];
  for (const a of w.adds) {
    // A retry after a timeout first asks whether the timed-out insert landed after all: re-sent, the row would be
    // refused as a duplicate of itself.
    try { const got = await retrying(async i => { if (i && (await rest(`routes?select=id&id=eq.${encodeURIComponent(a.row.id)}`)).length) return [a.row]; return rest("routes", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(a.row) }); }); if (got?.length === 1) added.push(a); else refused.push({ name: a.row.name, why: "insert returned " + (got?.length ?? 0) + " rows" }); }
    catch (e) { if (/duplicate|already|23505|P0001/i.test(e.message)) refused.push({ name: a.row.name, mpId: a.mpId, why: "database: " + e.message.slice(0, 200) }); else throw e; }
  }
  const pos = new Map(w.pos);
  // A refused add leaves a hole in the numbering; renumber what is left so positions stay a count.
  if (refused.length) { const ids = [...pos.entries()].filter(([id]) => !w.adds.some(a => a.row.id === id && !added.includes(a))).sort((x, y) => x[1] - y[1]); pos.clear(); ids.forEach(([id], i) => pos.set(id, i + 1)); }
  const want = new Map();
  for (const r of w.writes.concat(w.seq.filter(s => s.ours).map(s => s.ours))) want.set(r.id, pos.get(r.id) ?? null);
  for (const a of added) want.set(a.row.id, pos.get(a.row.id) ?? null);
  const after = await retrying(() => rest(`routes?select=id,sort_order&area_id=eq.${encodeURIComponent(area.id)}`));
  const cur = new Map(after.map(r => [r.id, r.sort_order]));
  for (const [id, v] of want) if (cur.get(id) !== v) await retrying(() => patchRow("routes", id, { sort_order: v }));
  const back = await retrying(() => rest(`routes?select=id,sort_order&area_id=eq.${encodeURIComponent(area.id)}`));
  const bad = back.filter(r => want.has(r.id) && want.get(r.id) !== r.sort_order);
  return { added, refused, bad, rows: back.length };
}

// ── one wall ──
if (AREA) {
  const html = await page("area", MP, `${PAGES}/${MP}.html`);
  const [area] = await rest(`areas?select=id,name,lat,lng&id=eq.${encodeURIComponent(AREA)}`);
  if (!area) throw new Error("no area " + AREA);
  const ours = await rest(`routes?select=id,name,area_id,discipline,grade,sort_order&area_id=eq.${encodeURIComponent(AREA)}`);
  const idMap = STATE ? loadMap(STATE) : {};
  const otherIds = Object.values(idMap).filter(id => !ours.some(r => r.id === id));
  const elsewhereRows = new Map();
  for (let i = 0; i < otherIds.length; i += 200) for (const r of await rest(`routes?select=id,area_id&id=in.(${otherIds.slice(i, i + 200).map(encodeURIComponent).join(",")})`)) elsewhereRows.set(r.id, r);
  const w = await planWall({ html, area, ours, idMap, elsewhere: mpId => elsewhereRows.get(idMap[mpId]) || null, usedIds: new Set(ours.map(r => r.id)) });
  if (w.error) throw new Error(`MP area ${MP}: ${w.error}`);
  printWall(area, MP, w, ours);
  console.log(`\nplan: ${w.adds.length} to add, ${w.writes.length} sort_order changes, ${w.plan.filter(p => p.kind === "REVIEW").length} for review`);
  if (!APPLY) { console.log("dry run — nothing written (pass --apply)"); process.exit(0); }
  const r = await writeWall(area, w);
  console.log(`written: ${r.added.length} added, ${r.refused.length} refused by the database; read back ${r.rows} rows, ${r.bad.length} disagree`);
  if (r.bad.length) { console.log(r.bad); process.exit(1); }
  process.exit(0);
}

// ── facts for the climbs this script added ──
if (FACTS) {
  const addsFile = `${ORDER}/${STATE}.adds.json`;
  if (!existsSync(addsFile)) { console.error(`no ${addsFile} — run the state with --apply first`); process.exit(1); }
  const adds = Object.entries(JSON.parse(readFileSync(addsFile, "utf8")));
  const rows = new Map();
  for (let i = 0; i < adds.length; i += 200) for (const r of await retrying(() => rest(`routes?select=id,length_m,pitches,lat,lng,stars&id=in.(${adds.slice(i, i + 200).map(([, id]) => encodeURIComponent(id)).join(",")})`))) rows.set(r.id, r);
  let n = 0, patched = 0;
  for (const [mpId, id] of adds) {
    const r = rows.get(id); if (!r) continue;
    const html = await page("route", mpId, `${ROUTES}/${mpId}.html`); n++;
    const type = unent((html.match(/<td>Type:<\/td>\s*<td>([\s\S]*?)<\/td>/) || [])[1] || "");
    const gps = (html.match(/<td>GPS:<\/td>\s*<td>\s*(-?\d+\.\d+),\s*(-?\d+\.\d+)/) || []);
    const ft = type.match(/(\d[\d,]*) ft/), pitches = type.match(/(\d+) pitches/), avg = html.match(/Avg:\s*([\d.]+)\s+from\s+(\d[\d,]*)\s+votes?/);
    const p = {};
    if (r.length_m == null && ft) p.length_m = Math.round(+ft[1].replace(/,/g, "") / 3.28084);
    if (!(r.pitches > 0)) p.pitches = pitches ? +pitches[1] : 1;
    if (r.lat == null && gps[1]) { p.lat = +gps[1]; p.lng = +gps[2]; }
    if (!(r.stars > 0) && avg && +avg[2].replace(/,/g, "") >= 1) p.stars = +avg[1];
    if (!Object.keys(p).length) continue;
    if (APPLY) await retrying(() => patchRow("routes", id, p));
    patched++;
    if (!APPLY && patched <= 10) console.log(id, JSON.stringify(p));
  }
  console.log(`${STATE}: ${n} route pages read, ${patched} rows ${APPLY ? "given" : "would gain"} facts. Prose next: node scripts/pipeline/extract-route-details.mjs ${STATE}`);
  process.exit(0);
}

// ── every wall in the state ──
const treeFile = `${DIR}/_tree/${STATE}.routes.json`;
if (!existsSync(treeFile)) { console.error(`no ${treeFile}`); process.exit(1); }
const mpRoutes = JSON.parse(readFileSync(treeFile, "utf8"));
const idMap = loadMap(STATE);
// A resumed state whose every rock wall is already logged needs nothing from the database: loading California's
// 40k routes timed out over and over on 2026-10-22 just to skip walls that were all finished.
if (APPLY && existsSync(`${ORDER}/${STATE}.jsonl`)) {
  const finished = new Set(readFileSync(`${ORDER}/${STATE}.jsonl`, "utf8").split("\n").filter(Boolean).map(l => JSON.parse(l)).filter(x => x.status !== "error").map(x => x.mp));
  const rockWalls = new Set(mpRoutes.filter(r => ROCK(r.tags)).map(r => r.area));
  if ([...rockWalls].every(w => finished.has(w))) { console.log(`${STATE}: all ${rockWalls.size} walls already done`); process.exit(0); }
}
const state = sql(`select id, name from areas where id = ${q(STATE)}`)[0];
if (!state) throw new Error("no state area " + STATE);
const all = sql(`select r.id, r.name, r.area_id, r.discipline, r.grade, r.sort_order, a.name as area_name from routes r join areas a on a.id = r.area_id where a.path <@ (select path from areas where id = ${q(STATE)})`);
const routeById = new Map(all.map(r => [r.id, r])), usedIds = new Set(all.map(r => r.id)), keyCount = new Map(), byKeyState = new Map();
for (const r of all) { const kk = key(r.name); keyCount.set(kk, (keyCount.get(kk) || 0) + 1); byKeyState.set(kk, r); }
const oursByArea = new Map(); for (const r of all) (oursByArea.get(r.area_id) || oursByArea.set(r.area_id, []).get(r.area_id)).push(r);
const areaName = new Map(all.map(r => [r.area_id, r.area_name]));

// Each MP wall with a roped route, and the area of ours its routes vote for.
const walls = new Map();
for (const r of mpRoutes) (walls.get(r.area) || walls.set(r.area, []).get(r.area)).push(r);
const votes = [];
for (const [mpArea, rs] of walls) {
  if (!rs.some(r => ROCK(r.tags))) continue;
  const v = new Map();
  for (const r of rs) {
    const ours = routeById.get(idMap[r.id]) || (keyCount.get(key(r.name)) === 1 ? byKeyState.get(key(r.name)) : null);
    if (ours) v.set(ours.area_id, (v.get(ours.area_id) || 0) + 1);
  }
  const tot = [...v.values()].reduce((a, b) => a + b, 0), top = [...v.entries()].sort((a, b) => b[1] - a[1])[0];
  votes.push({ mpArea, name: rs[0].chain[0], n: rs.length, tot, ours: top && top[1] / tot >= 0.6 ? top[0] : null, split: top && top[1] / tot < 0.6 });
}
// Two MP walls voting for one area of ours: the one with at least twice the other's votes keeps it (MP's
// second copy of a crag, e.g. a few climbs filed under a slides region); otherwise neither does.
const claims = new Map(); for (const x of votes) if (x.ours) (claims.get(x.ours) || claims.set(x.ours, []).get(x.ours)).push(x);
for (const xs of claims.values()) { xs.sort((a, b) => b.tot - a.tot); if (xs.length > 1 && xs[0].tot >= 2 * xs[1].tot) for (const x of xs.slice(1)) x.lost = xs[0].mpArea; }

const logFile = `${ORDER}/${STATE}${APPLY ? "" : ".dry"}.jsonl`;
if (!APPLY) writeFileSync(logFile, "");
const done = new Set(APPLY && existsSync(logFile) ? readFileSync(logFile, "utf8").split("\n").filter(Boolean).map(l => JSON.parse(l)).filter(x => x.status !== "error").map(x => x.mp) : []);
const addsFile = `${ORDER}/${STATE}.adds.json`, addsMap = existsSync(addsFile) ? JSON.parse(readFileSync(addsFile, "utf8")) : {};
const log = x => appendFileSync(logFile, JSON.stringify(x) + "\n");
const elsewhere = (mpId, areaId) => { const r = routeById.get(idMap[mpId]); return r && r.area_id !== areaId ? r : null; };
const tot = { walls: 0, matched: 0, added: 0, anchored: 0, unplaced: 0, review: 0, elsewhere: 0, skipped: 0, refused: 0 };
let n = 0, failedRun = 0;
for (const x of votes) {
  if (done.has(x.mpArea)) continue;
  if (n >= LIMIT) break;
  if (!x.ours) { log({ mp: x.mpArea, name: x.name, status: x.split ? "split" : "no area of ours", votes: x.tot, mpRoutes: x.n }); tot.skipped++; continue; }
  if (x.lost) { log({ mp: x.mpArea, name: x.name, area: x.ours, status: "shared", why: "MP wall " + x.lost + " holds most of this area's climbs" }); tot.skipped++; continue; }
  if (claims.get(x.ours).length > 1 && !claims.get(x.ours).some(y => y.lost)) { log({ mp: x.mpArea, name: x.name, area: x.ours, status: "shared", why: "another MP wall votes as strongly for the same area of ours" }); tot.skipped++; continue; }
  n++;
  let html;
  try { html = await page("area", x.mpArea, `${PAGES}/${x.mpArea}.html`); }
  catch (e) { log({ mp: x.mpArea, name: x.name, area: x.ours, status: "error", why: e.message }); continue; }
  const area = { id: x.ours, name: areaName.get(x.ours) }, ours = oursByArea.get(x.ours) || [];
  const w = await planWall({ html, area, ours, idMap, elsewhere, usedIds, wallName: x.name });
  if (w.error) { log({ mp: x.mpArea, name: x.name, area: x.ours, status: "error", why: w.error }); continue; }
  const c = kind => w.plan.filter(p => p.kind === kind);
  const entry = { mp: x.mpArea, name: x.name, area: x.ours, matched: c("MATCHED").length, add: w.adds.map(a => `${a.row.name} [${a.row.discipline} ${a.row.grade}] #${a.row.sort_order ?? "-"}`), anchored: w.anchored.length, unplaced: w.unplaced.length,
    review: c("REVIEW").map(p => `${p.name} — ${p.why}`), elsewhere: c("ELSEWHERE").map(p => `${p.name} — ${p.why}`), changes: w.writes.length };
  tot.walls++; tot.matched += entry.matched; tot.added += APPLY ? 0 : w.adds.length; tot.anchored += entry.anchored; tot.unplaced += entry.unplaced; tot.review += entry.review.length; tot.elsewhere += entry.elsewhere.length;
  if (!APPLY) { log({ ...entry, status: "planned" }); continue; }
  // A wall whose write still fails after the retries is logged as an error and the state goes on (a re-run
  // redoes it; an add that landed before the failure is matched by name then). Five failed walls in a row
  // means the database is down: stop the state rather than wait out every wall.
  let r;
  try { r = await writeWall(area, w); failedRun = 0; }
  catch (e) { log({ ...entry, status: "error", why: e.message.slice(0, 300) }); console.error(`${area.id}: ${e.message.slice(0, 200)}`); if (++failedRun >= 5) throw new Error(`${state.name}: 5 walls in a row failed to write — the database looks down; re-run to resume`); continue; }
  for (const a of r.added) { addsMap[a.mpId] = a.row.id; routeById.set(a.row.id, { ...a.row }); }
  writeFileSync(addsFile, JSON.stringify(addsMap));
  tot.refused += r.refused.length; tot.added += r.added.length;
  log({ ...entry, status: r.bad.length ? "error" : "written", added: r.added.length, refused: r.refused, disagree: r.bad.length });
  if (r.bad.length) console.error(`${area.id}: ${r.bad.length} rows disagree after the write`);
}
console.log(`${state.name}: ${JSON.stringify(tot)}\nlog: ${logFile}` + (APPLY && tot.added ? `\nnext: node scripts/pipeline/order-from-mp.mjs --state ${STATE} --facts --apply` : ""));
