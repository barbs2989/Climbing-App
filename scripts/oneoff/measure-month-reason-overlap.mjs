// The last column check:field-renders reports as partial: seasonal_guidance's per-month
// `reason` strings reach no screen (the month `status` pill and `optimalWindow` do).
//
// Same question as seasonal_hazards, same method, so the two answers are comparable: does the
// hidden text SAY anything the route does not already show? Compared against what actually
// renders about timing — optimalWindow, season, best_season, climate — plus watch_out and
// hazards, because the prose openly cites them ("per on-file watch_out notes").
//
// Reported on content words with a stopword list. A substring test would score everything
// duplicative; two paragraphs about one route's summer share vocabulary for free.
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";

const STOP = new Set(("the a an and or but of to in on at for with from by is are was were be been being this that these those " +
  "it its as if then than so not no nor can could will would should may might must have has had do does did " +
  "you your they their there here up down out over under above below into onto off any all some more most " +
  "very much many few one two three route routes climb climbing climber climbers peak summit rock terrain " +
  "north south east west upper lower first second per already on-file also which where when while during " +
  "month months early late mid still become becomes get gets make makes").split(" "));
const words = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9 ]+/g, " ").split(/\s+/)
  .filter((w) => w.length > 3 && !STOP.has(w));
const flat = (v) => v == null ? "" : (typeof v === "string" ? v : JSON.stringify(v));

async function page(cursor) {
  const f = cursor ? `&id=gt.${encodeURIComponent(cursor)}` : "";
  for (const limit of [120, 60, 30]) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,seasonal_guidance,season,best_season,climate,watch_out,hazards&seasonal_guidance=not.is.null&order=id.asc&limit=${limit}${f}`, { headers: headers(anonKey()) });
    if (r.ok) return JSON.parse(await r.text());
  }
  throw new Error("no page size worked");
}
const rows = []; let cursor = null;
for (;;) { const p = await page(cursor); if (!p.length) break; rows.push(...p); cursor = p[p.length - 1].id; if (p.length < 30) break; }
if (!rows.length) { console.error("read zero rows — failing closed"); process.exit(1); }
console.log("routes with seasonal_guidance:", rows.length, "\n");

let n = 0, sumOverlap = 0, sumNovel = 0, monthsTotal = 0;
const buckets = [0, 0, 0, 0];
let statusOnly = 0;
const examples = [];
for (const r of rows) {
  const sg = r.seasonal_guidance || {};
  const mb = sg.monthBreakdown || {};
  const months = Object.keys(mb);
  if (!months.length) continue;
  monthsTotal += months.length;
  // Everything the route already puts on a screen about timing, plus the fields the prose cites.
  const shown = new Set(words([sg.optimalWindow, r.season, r.best_season, flat(r.climate),
    flat(r.watch_out), flat(r.hazards), months.map((m) => (mb[m] || {}).status).join(" ")].map(flat).join(" ")));
  const mine = [...new Set(months.flatMap((m) => words((mb[m] || {}).reason)))];
  if (mine.length < 5) { statusOnly++; continue; }
  const dup = mine.filter((w) => shown.has(w)).length;
  const ratio = dup / mine.length;
  n++; sumOverlap += ratio; sumNovel += mine.length - dup;
  buckets[ratio < 0.25 ? 0 : ratio < 0.5 ? 1 : ratio < 0.75 ? 2 : 3]++;
  if (ratio < 0.25 && examples.length < 3) examples.push({ id: r.id, m: months[0], t: (mb[months[0]] || {}).reason });
}
if (!n) { console.error("no usable values"); process.exit(1); }
console.log(`monthBreakdown[*].reason — ${n} routes, ${(monthsTotal / rows.length).toFixed(1)} months each`);
console.log(`  mean overlap with already-shown text: ${((sumOverlap / n) * 100).toFixed(0)}%`);
console.log(`  distribution  <25%: ${buckets[0]}  25-50%: ${buckets[1]}  50-75%: ${buckets[2]}  >75%: ${buckets[3]}`);
console.log(`  average NEW content words per route (across ALL its months): ${(sumNovel / n).toFixed(0)}`);
if (statusOnly) console.log(`  routes whose months carry status but no usable reason: ${statusOnly}`);
if (examples.length) {
  console.log("\nlowest-overlap examples — what a reader is currently not told:");
  for (const e of examples) console.log(`  ${e.id} [${e.m}] ${String(e.t).slice(0, 150)}`);
}
console.log(`
Compare against seasonal_hazards (39-48% overlap, 8-13 new words), which was CLOSED as
upstream dedup rather than missing UI. A materially lower overlap or a materially larger novel
count here would justify a different answer; a similar one should get the same answer.`);
