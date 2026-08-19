// CAN A CLIMBER REACH A PEAK'S ROUTES BY TYPING THE PEAK'S NAME?
//
// This is the question "Mount Goode is not on the database anymore" actually asked, and the
// one no coverage check can answer: the peak is in `areas`, its routes are in `routes`, both
// rows are perfectly healthy, and the search box still cannot get you there. #786 fixed the
// hook to read area names at all; this measures what is left.
//
// It replays useRouteSearch END TO END for every WA peak that holds routes — all four legs,
// the client-side scorer, and the final slice(0, lim) — and asks one thing of the result:
// does ANY row in the top N belong to that peak (`area_id === peak.id`)? That is exact,
// not a name comparison, so a route at a same-named crag in another state cannot count as a
// hit.
//
// WHY THE MERGED TOP-N AND NOT THE LEGS. A leg returning more rows proves nothing if those
// rows rank below what the other legs supply — the lesson #954 paid for. The failure this
// finds is exactly that shape: typing "the tooth" fetches the Snoqualmie summit's routes
// happily, and then eight routes literally NAMED "The Tooth" at eight unrelated crags score
// 100 against the peak's 90 and take every slot.
//
// THE SCORER IS EXTRACTED FROM lib/db.js, NOT COPIED, for the reason its sibling probe
// records: a pasted replica measures a fossil the moment the real one is edited, and a
// ranking change is precisely what this is watching for.
//
// THE POPULATION IS PEAKS THAT HOLD ROUTES *DIRECTLY*, not peaks with route_count > 0.
// Those differ: route_count is a SUBTREE aggregate, so a peak modelled as a container
// passes the second test while `area_id === peak.id` is false for every route it owns.
// Counting those would inflate the denominator with rows that can never register a hit.
//
// SEL MUST CARRY area_id. The round-robin below keys on it, and without it every row
// shares the key `undefined`, the reservation collapses to a single row, and this probe
// reports success for a fix that is not working. An instrument has to carry the field the
// thing it measures keys on.
//
// Read-only. Anon key. Fails closed on a short read — zero peaks makes every peak look
// reachable, which is the false-pass direction.
//
//   node scripts/oneoff/measure-peak-reachable-by-name.mjs [--lim=8] [--state=wa] [--limit-peaks=N]
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { SUPABASE_URL, anonKey } from "../lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const arg = (n, d) => (process.argv.find(a => a.startsWith(`--${n}=`)) || `--${n}=${d}`).split("=")[1];
const LIM = Number(arg("lim", 8));
const STATE = String(arg("state", "wa")).toLowerCase();
const MAXPEAKS = Number(arg("limit-peaks", 0));
// The home-state hint the app derives from the climber's profile. Namesake peaks repeat
// across the continent and eight slots cannot hold fourteen Chimney Rocks, so ORDER AMONG
// NAMESAKES depends on where the climber is. Default it to the state being measured: the
// question worth asking about a Washington peak is whether a climber IN Washington can reach
// it. Pass --home= (empty) for the signed-out case, which is the pre-#1008 behaviour.
const HOME = process.argv.some(x => x.startsWith("--home=")) ? arg("home", "") : "usa." + ({ wa: "washington" }[STATE] || "");
const PATH_PREFIX = { wa: "usa.washington" }[STATE];
if (!PATH_PREFIX) { console.error(`no path prefix known for --state=${STATE}`); process.exit(1); }

// --- lift routeSearchScore out of lib/db.js -------------------------------------------------
const src = fs.readFileSync(path.join(ROOT, "lib/db.js"), "utf8");
const start = src.indexOf("function routeSearchScore(");
if (start < 0) throw new Error("ANCHOR LOST: `function routeSearchScore(` is not in lib/db.js — it was renamed or moved, and this probe would otherwise measure nothing.");
let depth = 0, end = -1;
for (let i = src.indexOf("{", start); i < src.length; i++) {
  if (src[i] === "{") depth++;
  else if (src[i] === "}" && --depth === 0) { end = i + 1; break; }
}
if (end < 0) throw new Error("could not balance routeSearchScore's braces");
const routeSearchScore = new Function(`${src.slice(start, end)}; return routeSearchScore;`)();
// Prove the lift produced a working function before trusting a single number it returns.
if (routeSearchScore({ name: "North Ridge" }, "north ridge") !== 100
  || routeSearchScore({ name: "x", areas: { name: "Mount Goode" } }, "goode") !== 90
  || routeSearchScore({ name: "x", areas: { name: "y" } }, "z") !== 20) {
  throw new Error("the extracted routeSearchScore does not behave as expected — the lift is wrong, not the app");
}

const K = anonKey(), H = { apikey: K, Authorization: "Bearer " + K };
const E = encodeURIComponent;
async function j(q, tries = 4) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/${q}`, { headers: H, signal: AbortSignal.timeout(30000) });
      if (r.ok) return r.json();
      if (i === tries - 1) throw new Error(`${r.status} ${(await r.text()).slice(0, 140)}`);
    } catch (e) { if (i === tries - 1) throw e; }
    await new Promise(s => setTimeout(s, 400 * 2 ** i));
  }
}
const SEL = "id,name,area_id,areas(name)";

// Replays useRouteSearch's legs verbatim. Keep in step with lib/db.js; the shape changed in
// #954 and a probe that lags it measures the previous app.
async function searchTopN(q) {
  const needle = q.toLowerCase();
  const [byPrefix, byName, matched, exact] = await Promise.all([
    j(`routes?select=${SEL}&name=ilike.${E(q + "%")}&limit=${LIM * 2}`),
    j(`routes?select=${SEL}&name=ilike.${E("%" + q + "%")}&limit=${LIM * 2}`),
    j(`areas?select=id,name,path&name=ilike.${E("%" + q + "%")}&order=route_count.desc&limit=5`),
    j(`areas?select=id,name,path&name=ilike.${E(q)}&order=route_count.desc&limit=25`),
  ]);
  const matchedIds = matched.map(a => a.id);
  const kids = await Promise.all(
    matched.slice(0, 3).filter(a => a.path).map(a =>
      j(`areas?select=id&path=cd.${E(a.path)}&route_count=gt.0&order=route_count.desc&limit=25`)));
  const descIds = [];
  for (const k of kids) for (const a of k) if (!matchedIds.includes(a.id) && !descIds.includes(a.id)) descIds.push(a.id);
  const atHome = a => !!HOME && (a.path === HOME || String(a.path || "").startsWith(HOME + "."));
  const unclaimed = a => !matchedIds.includes(a.id);
  // The home-state namesake gets its OWN query — pooling loses it, measured.
  // NOT filtered by `unclaimed` — matchedIds is pooled and capped too, so it is no protection.
  const homeExactIds = exact.filter(atHome).map(a => a.id).slice(0, 3);
  const exactIds = exact.filter(a => !atHome(a)).filter(unclaimed).map(a => a.id).slice(0, 5);
  const [byMatched, byDesc, byExact, byHomeExact] = await Promise.all([
    matchedIds.length ? j(`routes?select=${SEL}&area_id=in.(${matchedIds.map(E).join(",")})&limit=${LIM * 2}`) : [],
    descIds.length ? j(`routes?select=${SEL}&area_id=in.(${descIds.map(E).join(",")})&limit=${LIM * 2}`) : [],
    exactIds.length ? j(`routes?select=${SEL}&area_id=in.(${exactIds.map(E).join(",")})&limit=${LIM * 2}`) : [],
    homeExactIds.length ? j(`routes?select=${SEL}&area_id=in.(${homeExactIds.map(E).join(",")})&limit=${LIM * 2}`) : [],
  ]);
  const seen = new Set(), merged = [];
  for (const r of [...byPrefix, ...byName, ...byHomeExact, ...byExact, ...byMatched, ...byDesc]) {
    if (seen.has(r.id)) continue;
    seen.add(r.id); merged.push(r);
  }
  merged.sort((a, b) => routeSearchScore(b, needle) - routeSearchScore(a, needle));
  const namedAll = merged.filter(r => {
    const an = String((r.areas && r.areas.name) || "").toLowerCase();
    return an === needle || an.replace(/^(mount|mt\.?|the)\s+/, "") === needle;
  });
  const homeAreaIds = new Set(exact.concat(matched).filter(atHome).map(a => a.id));
  const namedHomeFirst = HOME
    ? namedAll.slice().sort((x, y) => (homeAreaIds.has(y.area_id) ? 1 : 0) - (homeAreaIds.has(x.area_id) ? 1 : 0))
    : namedAll;
  const oncePer = new Set(), firstOfEach = [], extras = [];
  for (const r of namedHomeFirst) {
    if (oncePer.has(r.area_id)) extras.push(r); else { oncePer.add(r.area_id); firstOfEach.push(r); }
  }
  const named = [...firstOfEach, ...extras].slice(0, 3);
  const reserved = new Set(named.map(r => r.id));
  return [...named, ...merged.filter(r => !reserved.has(r.id))].slice(0, LIM)
    .map(r => ({ ...r, _score: routeSearchScore(r, needle) }));
}

// --- the peaks ------------------------------------------------------------------------------
const AREAS = [];
let after = "";
for (;;) {
  const page = await j(`areas?select=id,name,route_count,area_type,path,parent_id&order=id.asc&limit=1000${after ? `&id=gt.${E(after)}` : ""}`);
  AREAS.push(...page);
  if (page.length < 1000) break;
  after = page[page.length - 1].id;
}
if (AREAS.length < 1000) { console.error(`FAIL-CLOSED: read only ${AREAS.length} areas — a short read makes every peak look reachable`); process.exit(1); }
// `route_count` IS A SUBTREE AGGREGATE, so filtering on it alone counts CONTAINERS —
// peaks whose routes all live in child areas. For those, `area_id === peak.id` is false
// for every route they own, so they report unreachable as a MODELLING ARTIFACT and not as
// a defect (Eldorado Peak, Baring Mountain and Mount Index are the three in WA today).
// Quoting a rate over that population would understate the denominator.
//
// `trg_areas_leaf_xor` means an area holds child areas OR direct routes, never both, so a
// peak with no children and route_count > 0 holds them directly. That is exact and costs
// no extra query — parent_id is already in the page above.
const HAS_KIDS = new Set(AREAS.map(a => a.parent_id).filter(Boolean));
const withCount = AREAS.filter(a => String(a.path || "").startsWith(PATH_PREFIX) && a.area_type === "peak" && a.route_count > 0);
let peaks = withCount.filter(a => !HAS_KIDS.has(a.id));
if (!peaks.length) { console.error("FAIL-CLOSED: no peaks matched — the area_type vocabulary or the path prefix moved"); process.exit(1); }
peaks.sort((a, b) => (b.route_count || 0) - (a.route_count || 0));
const DIRECT = peaks.length;
// Report the real denominator BEFORE --limit-peaks narrows it, or a sampled run prints its
// sample size as though it were the population.
if (MAXPEAKS) peaks = peaks.slice(0, MAXPEAKS);
console.log(`home-state hint: ${HOME || "(none - signed-out behaviour)"}`);
console.log(`${withCount.length} ${STATE.toUpperCase()} peaks have route_count > 0; ${DIRECT} of them hold routes DIRECTLY (the rest are containers — route_count is a subtree total). Replaying the search box for ${peaks.length === DIRECT ? "each" : `a sample of ${peaks.length}`}, top ${LIM}.\n`);

const unreachable = [], partial = [];
let done = 0;
const BATCH = 4;
for (let i = 0; i < peaks.length; i += BATCH) {
  await Promise.all(peaks.slice(i, i + BATCH).map(async p => {
    let top;
    try { top = await searchTopN(p.name); }
    catch (e) { console.log(`  ERROR ${p.name}: ${String(e.message).slice(0, 90)}`); return; }
    const mine = top.filter(r => r.area_id === p.id);
    if (!mine.length) unreachable.push({ p, top });
    else if (mine.length < Math.min(p.route_count, LIM)) partial.push({ p, got: mine.length });
  }));
  done += Math.min(BATCH, peaks.length - i);
  if (done % 40 < BATCH) console.log(`  ... ${done}/${peaks.length}`);
}

console.log(`\n=== TYPING THE PEAK'S OWN NAME RETURNS NONE OF ITS ROUTES: ${unreachable.length} of ${peaks.length} ===`);
for (const u of unreachable.sort((a, b) => b.p.route_count - a.p.route_count)) {
  console.log(`\n  ${u.p.name}  (${u.p.route_count} routes, ${u.p.id})`);
  for (const r of u.top.slice(0, 4)) console.log(`      ${String(r._score).padStart(3)}  ${String(r.name).slice(0, 40).padEnd(42)} [${(r.areas && r.areas.name) || "?"}]`);
  if (!u.top.length) console.log("      (the box returns nothing at all)");
}
console.log(`\n${partial.length} more peaks return only some of their routes (not counted as a defect — the box shows ${LIM}).`);
fs.writeFileSync(path.join(ROOT, "scripts/oneoff/peak-reachability.json"),
  JSON.stringify({ measured: peaks.length, unreachable: unreachable.map(u => ({ id: u.p.id, name: u.p.name, rc: u.p.route_count, top: u.top.map(r => ({ n: r.name, a: r.areas && r.areas.name, s: r._score })) })) }, null, 1));
console.log("\nReport only — no writes. Full detail in scripts/oneoff/peak-reachability.json");
