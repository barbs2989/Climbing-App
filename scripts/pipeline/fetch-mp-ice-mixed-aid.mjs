// fetch-mp-ice-mixed-aid.mjs — pull Mountain Project's route-finder CSV export for ice, mixed and
// aid routes, state by state. Run under the owner's WRITTEN PERMISSION from onX to crawl
// mountainproject.com (2026-09-24); without that permission this must not be run.
//
// POLITENESS IS NOT OPTIONAL: robots.txt asks `Crawl-delay: 60`, so requests are spaced 61 s apart,
// one at a time, and nothing under a disallowed path (/data*, /ajax*, /edit* …) is requested. The
// route-finder export is used because it returns a whole state's routes of one type in ONE request
// — hundreds of routes per request rather than one page per route.
//
// The export stops at 1,000 rows, so a query that comes back with 1,000 is split in half by grade
// code range and each half re-asked, until every slice is under the cap.
//
// ONLY FACTS are fetched — name, location path, grade, route type, pitches, length, coordinates.
// No description prose is requested, so nothing written by Mountain Project's contributors is
// copied. Every response is cached under catalog/_mp/ (gitignored); a re-run resumes from cache.
//
//   node scripts/pipeline/fetch-mp-ice-mixed-aid.mjs            # all states
//   node scripts/pipeline/fetch-mp-ice-mixed-aid.mjs colorado   # one state (our area id)
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from "node:fs";

const UA = "ClimbMatch-licensed-importer (barbs2989@gmail.com)";
const DIR = "catalog/_mp";
const DELAY_MS = 61_000;
const BASE = "https://www.mountainproject.com";
// Difficulty code ranges the route finder uses for each type (the site's own min/max defaults).
const TYPES = { ice: [30000, 38500], mixed: [50000, 60000], aid: [70000, 75260] };
mkdirSync(DIR, { recursive: true });

let last = 0;
async function get(url) {
  const wait = last + DELAY_MS - Date.now();
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  last = Date.now();
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": UA } });
      const body = await r.text();
      return { status: r.status, type: r.headers.get("content-type") || "", body };
    } catch (e) {
      if (i === 2) throw e;
      await new Promise(r => setTimeout(r, DELAY_MS));
      last = Date.now();
    }
  }
}

// State area ids, read from the route guide's own links (cached).
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

function exportUrl(areaId, type, lo, hi) {
  const q = new URLSearchParams({ selectedIds: areaId, type, diffMinrock: 1000, diffMinboulder: 20000, diffMinaid: 70000, diffMinice: 30000, diffMinmixed: 50000, diffMaxrock: 12400, diffMaxboulder: 21400, diffMaxaid: 75260, diffMaxice: 38500, diffMaxmixed: 60000, is_trad_climb: 1, is_sport_climb: 1, is_top_rope: 1, stars: 0, pitches: 0, sort1: "area", sort2: "rating" });
  q.set("diffMin" + type, lo); q.set("diffMax" + type, hi);
  return BASE + "/route-finder-export?" + q.toString();
}

async function slice(state, areaId, type, lo, hi, log) {
  const f = `${DIR}/${state}_${type}_${lo}_${hi}.csv`;
  let body;
  if (existsSync(f)) body = readFileSync(f, "utf8");
  else {
    const r = await get(exportUrl(areaId, type, lo, hi));
    if (r.status !== 200 || !/csv/.test(r.type)) { log.push(`${state} ${type} ${lo}-${hi}: HTTP ${r.status} ${r.type} — skipped`); return 0; }
    body = r.body; writeFileSync(f, body);
  }
  const rows = body.split("\n").filter(l => l.trim()).length - 1;
  if (rows >= 1000 && hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    return (await slice(state, areaId, type, lo, mid, log)) + (await slice(state, areaId, type, mid + 1, hi, log));
  }
  if (rows >= 1000) log.push(`${state} ${type} ${lo}-${hi}: still at the 1,000 cap and cannot split further`);
  return rows;
}

const ids = await stateIds();
const want = process.argv.slice(2);
const OURS = ["alabama","alaska","arizona","arkansas","california","colorado","connecticut","delaware","florida","georgia","idaho","illinois","indiana","iowa","kansas","kentucky","louisiana","maine","maryland","massachusetts","michigan","minnesota","mississippi","missouri","montana","nebraska","nevada","new_hampshire","new_jersey","new_mexico","new_york","north_carolina","north_dakota","ohio","oklahoma","oregon","pennsylvania","rhode_island","south_carolina","south_dakota","tennessee","texas","utah","vermont","virginia","washington","west_virginia","wisconsin","wyoming"];
const states = (want.length ? want : OURS).filter(s => ids[s]);
const missing = (want.length ? want : OURS).filter(s => !ids[s]);
if (missing.length) console.log("no Mountain Project area id found for: " + missing.join(", "));
console.log(`fetching ${states.length} state(s) x ${Object.keys(TYPES).length} types, one request per ${DELAY_MS / 1000}s`);
const log = [];
for (const s of states) {
  const parts = [];
  for (const [t, [lo, hi]] of Object.entries(TYPES)) parts.push(t + " " + (await slice(s, ids[s], t, lo, hi, log)));
  console.log(`${s}: ${parts.join(" | ")}`);
}
for (const l of log) console.log("  NOTE " + l);
console.log("cached files: " + readdirSync(DIR).filter(f => f.endsWith(".csv")).length);
