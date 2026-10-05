// fetch-mp-rock-boulder.mjs — pull Mountain Project's route-finder CSV export for ROCK (trad, sport,
// top rope) and BOULDER routes, state by state. The companion of fetch-mp-ice-mixed-aid.mjs and run
// under the same owner's WRITTEN PERMISSION from onX to crawl mountainproject.com (2026-09-24);
// without that permission this must not be run.
//
// POLITENESS IS NOT OPTIONAL: robots.txt asks `Crawl-delay: 60`, so requests are spaced 61 s apart,
// one at a time, and nothing under a disallowed path is requested.
//
// The export stops at 1,000 rows. A query that comes back at the cap is split by SUB-AREA: the area
// page's left-nav lists its children, and each child is asked for the same range, recursing further
// down while a child is still full. Only a bottom-level area still at the cap is split in half by
// grade code. (Grade-first cost California over 1,000 requests: one grade alone is over the cap.)
//
// ONLY FACTS are fetched — name, location path, grade, route type, pitches, length, coordinates. No
// description prose. Every response is cached under catalog/_mp/ (gitignored); a re-run resumes
// from cache, so the crawl may be stopped and restarted at any point.
//
//   node scripts/pipeline/fetch-mp-rock-boulder.mjs            # all states
//   node scripts/pipeline/fetch-mp-rock-boulder.mjs delaware   # one state (our area id)
//   node scripts/pipeline/fetch-mp-rock-boulder.mjs canada --types rock,boulder,ice,mixed,aid
//                                    # every Canadian province (files named by OUR id: ab_, bc_, ...)
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const UA = "ClimbMatch-licensed-importer (barbs2989@gmail.com)";
const DIR = "catalog/_mp";
const DELAY_MS = 61_000;
const BASE = "https://www.mountainproject.com";
// Difficulty code ranges the route finder uses for each type (the site's own min/max defaults).
const ALL_TYPES = { rock: [1000, 12400], boulder: [20000, 21400], ice: [30000, 38500], mixed: [50000, 60000], aid: [70000, 75260] };
const typeArg = process.argv.indexOf("--types");
const TYPES = Object.fromEntries((typeArg > 0 ? process.argv[typeArg + 1].split(",") : ["rock", "boulder"]).map(t => { if (!ALL_TYPES[t]) throw new Error("unknown type " + t); return [t, ALL_TYPES[t]]; }));
mkdirSync(DIR + "/_areas", { recursive: true });

let last = 0, requests = 0;
async function get(url) {
  const wait = last + DELAY_MS - Date.now();
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  last = Date.now(); requests++;
  for (let i = 0; i < 3; i++) {
    try {
      // A request with no deadline hung the crawl for three days (Colorado, 2026-09-27): give up
      // after two minutes and retry.
      const r = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(120_000) });
      const body = await r.text();
      return { status: r.status, type: r.headers.get("content-type") || "", body };
    } catch (e) {
      if (i === 2) throw e;
      await new Promise(r => setTimeout(r, DELAY_MS));
      last = Date.now();
    }
  }
}

async function stateIds() {
  const f = DIR + "/_route-guide.html";
  let html;
  if (existsSync(f)) html = readFileSync(f, "utf8");
  else { const r = await get(BASE + "/route-guide"); if (r.status !== 200) throw new Error("route-guide " + r.status); html = r.body; writeFileSync(f, html); }
  const ids = {};
  for (const m of html.matchAll(/href="https:\/\/www\.mountainproject\.com\/area\/(\d+)\/([a-z-]+)"/g)) {
    const slug = m[2].replace(/-/g, "_");
    if (!ids[slug]) ids[slug] = m[1];
  }
  return ids;
}

// An area's direct children, from its page's left-nav (cached). A leaf area (routes, no children)
// returns [].
async function children(areaId) { return (await namedChildren(areaId)).map(c => c.id); }
async function namedChildren(areaId) {
  const f = `${DIR}/_areas/${areaId}.html`;
  let html;
  if (existsSync(f)) html = readFileSync(f, "utf8");
  else { const r = await get(`${BASE}/area/${areaId}`); if (r.status !== 200) throw new Error(`area ${areaId}: HTTP ${r.status}`); html = r.body; writeFileSync(f, html); }
  return [...html.matchAll(/lef-nav-row">\s*<a href="https:\/\/www\.mountainproject\.com\/area\/(\d+)\/([a-z0-9-]*)/g)].map(m => ({ id: m[1], slug: m[2].replace(/-/g, "_") }));
}

function exportUrl(areaId, type, lo, hi) {
  const q = new URLSearchParams({ selectedIds: areaId, type, diffMinrock: 1000, diffMinboulder: 20000, diffMinaid: 70000, diffMinice: 30000, diffMinmixed: 50000, diffMaxrock: 12400, diffMaxboulder: 21400, diffMaxaid: 75260, diffMaxice: 38500, diffMaxmixed: 60000, is_trad_climb: 1, is_sport_climb: 1, is_top_rope: 1, stars: 0, pitches: 0, sort1: "area", sort2: "rating" });
  q.set("diffMin" + type, lo); q.set("diffMax" + type, hi);
  return BASE + "/route-finder-export?" + q.toString();
}

const rowsOf = body => body.split("\n").filter(l => l.trim()).length - 1;

// File name: <state>_<type>_<lo>_<hi>.csv for the state itself, <state>_<type>_<lo>_<hi>_a<id>.csv
// for a sub-area. The importer reads every file of a state and dedupes by route URL, so an
// over-full parent slice alongside its splits is harmless.
async function slice(state, areaId, sub, type, lo, hi, log) {
  const f = `${DIR}/${state}_${type}_${lo}_${hi}${sub ? "_a" + areaId : ""}.csv`;
  let body;
  if (existsSync(f)) body = readFileSync(f, "utf8");
  else {
    // A refused export (Maine's whole rock export, 2026-10-01) used to be skipped with a NOTE printed
    // only after the last state, so the state imported without it. Ask up to 3 times; a skip is
    // printed AT ONCE, and nothing is cached, so re-running the crawl fetches exactly what is missing.
    let r;
    for (let i = 0; i < 3; i++) { r = await get(exportUrl(areaId, type, lo, hi)); if (r.status === 200 && /csv/.test(r.type)) break; }
    if (r.status !== 200 || !/csv/.test(r.type)) { const m = `${state} ${type} ${lo}-${hi} area ${areaId}: HTTP ${r.status} ${r.type} — SKIPPED, re-run the crawl`; console.log("  NOTE " + m); log.push(m); return 0; }
    body = r.body; writeFileSync(f, body);
  }
  const rows = rowsOf(body);
  if (rows < 1000) return rows;
  // SUB-AREAS FIRST: most of a big state's sub-areas come back whole in one request. Splitting by
  // grade first cost California more than 1,000 requests — a single grade (5.10a) is over the cap
  // there, so EVERY grade was then re-asked of EVERY sub-area.
  const kids = await children(areaId);
  if (kids.length) {
    let n = 0;
    for (const k of kids) n += await slice(state, k, true, type, lo, hi, log);
    return n;
  }
  // A bottom-level area still over the cap: split by grade.
  if (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    return (await slice(state, areaId, sub, type, lo, mid, log)) + (await slice(state, areaId, sub, type, mid + 1, hi, log));
  }
  log.push(`${state} ${type} ${lo}-${hi} area ${areaId}: at the 1,000 cap with no sub-areas`);
  return rows;
}

// Canada sits under MP's International tree; its provinces are filed in our catalog as states
// named by postal code. A province MP spells differently is matched by its first word.
const PROVINCES = { alberta: "ab", british_columbia: "bc", manitoba: "mb", new_brunswick: "nb", newfoundland: "nl", northwest_territories: "nt", nova_scotia: "ns", nunavut: "nu", ontario: "on", prince_edward_island: "pe", quebec: "qc", saskatchewan: "sk", yukon: "yt" };
async function provinceIds() {
  const pick = (kids, slug) => { const k = kids.find(c => c.slug === slug); if (!k) throw new Error("no " + slug + " under MP area"); return k.id; };
  const na = pick(await namedChildren("105907743"), "north_america");
  const ca = pick(await namedChildren(na), "canada");
  const out = {};
  for (const k of await namedChildren(ca)) {
    const key = Object.keys(PROVINCES).find(p => k.slug === p || k.slug.startsWith(p + "_") || k.slug.split("_")[0] === p.split("_")[0] && p.split("_").length === 1);
    if (key) out[PROVINCES[key]] = k.id; else console.log("  NOTE Canadian area " + k.slug + " (" + k.id + ") is not a province we know — skipped");
  }
  return out;
}
const want = process.argv.slice(2).filter((a, i, all) => a !== "--types" && all[i - 1] !== "--types");
const ids = want.includes("canada") ? await provinceIds() : await stateIds();
if (want.includes("canada")) want.splice(0, want.length, ...Object.keys(ids));
const OURS = ["alabama","alaska","arizona","arkansas","california","colorado","connecticut","delaware","florida","georgia","idaho","illinois","indiana","iowa","kansas","kentucky","louisiana","maine","maryland","massachusetts","michigan","minnesota","mississippi","missouri","montana","nebraska","nevada","new_hampshire","new_jersey","new_mexico","new_york","north_carolina","north_dakota","ohio","oklahoma","oregon","pennsylvania","rhode_island","south_carolina","south_dakota","tennessee","texas","utah","vermont","virginia","washington","west_virginia","wisconsin","wyoming"];
const states = (want.length ? want : OURS).filter(s => ids[s]);
const missing = (want.length ? want : OURS).filter(s => !ids[s]);
if (missing.length) console.log("no Mountain Project area id found for: " + missing.join(", "));
console.log(`fetching ${states.length} state(s) x ${Object.keys(TYPES).length} types, one request per ${DELAY_MS / 1000}s`);
const log = [];
for (const s of states) {
  const parts = [], t0 = requests;
  for (const [t, [lo, hi]] of Object.entries(TYPES)) parts.push(t + " " + (await slice(s, ids[s], false, t, lo, hi, log)));
  console.log(`${new Date().toISOString().slice(11, 16)} ${s}: ${parts.join(" | ")}  (${requests - t0} requests)`);
}
for (const l of log) console.log("  NOTE " + l);
console.log(`done — ${requests} requests this run`);
