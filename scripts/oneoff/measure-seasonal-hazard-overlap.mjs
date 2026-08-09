// seasonal_hazards.exposure / .weather.* reach no screen on ~500 alpine routes. Before giving
// them a home, ask whether they would just restate what the route ALREADY shows: the
// enrichment prose openly cross-references its neighbours ("already flagged in on-file
// hazards/watch_out", "per on-file climate field"), so a new block could read as duplication.
//
// Overlap is measured on CONTENT WORDS, not substrings: two safety paragraphs about the same
// route share vocabulary trivially ("the", "route", "rock"). Reported as the share of the
// candidate's distinctive words that already appear in the rendered fields.
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";

const STOP = new Set(("the a an and or but of to in on at for with from by is are was were be been being this that these those " +
  "it its as if then than so not no nor can could will would should may might must have has had do does did " +
  "you your they their there here up down out over under above below into onto off any all some more most " +
  "very much many few one two three route routes climb climbing climber climbers peak summit rock terrain " +
  "north south east west upper lower first second per already on-file also which where when while during").split(" "));
const words = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9 ]+/g, " ").split(/\s+/)
  .filter((w) => w.length > 3 && !STOP.has(w));

async function page(cursor) {
  const f = cursor ? `&id=gt.${encodeURIComponent(cursor)}` : "";
  for (const limit of [200, 120, 60]) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,seasonal_hazards,watch_out,hazards,obj_haz,climate,season,best_season&seasonal_hazards=not.is.null&order=id.asc&limit=${limit}${f}`, { headers: headers(anonKey()) });
    if (r.ok) return JSON.parse(await r.text());
  }
  throw new Error("no page size worked");
}
const rows = []; let cursor = null;
for (;;) { const p = await page(cursor); if (!p.length) break; rows.push(...p); cursor = p[p.length - 1].id; if (p.length < 60) break; }
if (!rows.length) { console.error("read zero rows — failing closed"); process.exit(1); }
console.log("routes with seasonal_hazards:", rows.length, "\n");

const flat = (v) => v == null ? "" : (typeof v === "string" ? v : JSON.stringify(v));
const CANDIDATES = [
  ["exposure", (sh) => sh.exposure],
  ["weather.typical", (sh) => sh.weather && sh.weather.typical],
  ["weather.probability", (sh) => sh.weather && sh.weather.probability],
  ["crevasses", (sh) => sh.crevasses],
];
for (const [label, get] of CANDIDATES) {
  let n = 0, sumOverlap = 0, novelWords = 0, buckets = [0, 0, 0, 0];
  for (const r of rows) {
    const v = get(r.seasonal_hazards || {});
    if (!v) continue;
    const mine = [...new Set(words(flat(v)))];
    if (mine.length < 5) continue;
    const shown = new Set(words([r.watch_out, r.hazards, r.obj_haz, r.climate, r.season, r.best_season].map(flat).join(" ")));
    const dup = mine.filter((w) => shown.has(w)).length;
    const ratio = dup / mine.length;
    n++; sumOverlap += ratio; novelWords += mine.length - dup;
    buckets[ratio < 0.25 ? 0 : ratio < 0.5 ? 1 : ratio < 0.75 ? 2 : 3]++;
  }
  if (!n) { console.log(`${label}: no usable values`); continue; }
  console.log(`${label.padEnd(20)} ${String(n).padStart(4)} routes | mean overlap with already-shown text: ${((sumOverlap / n) * 100).toFixed(0)}%`);
  console.log(`  ${" ".repeat(20)} distribution  <25%: ${buckets[0]}  25-50%: ${buckets[1]}  50-75%: ${buckets[2]}  >75%: ${buckets[3]}`);
  console.log(`  ${" ".repeat(20)} average NEW content words per route: ${(novelWords / n).toFixed(0)}\n`);
}
console.log(`Low overlap = the field says something the screen does not, and hiding it is a real
loss. High overlap = a new block would mostly restate WATCH OUT, and the honest fix is
upstream dedup, not more UI.`);
