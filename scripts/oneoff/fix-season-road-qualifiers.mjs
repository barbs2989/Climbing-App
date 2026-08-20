// `season` is a WINDOW, not an explanation — it renders in the route header strap beside
// elevation and pitch count ("8,815 ft · 6p · Jul-Sep"). CLAUDE.md already states the rule;
// this applies it to the road qualifiers that got written into that column.
//
// The removals are narrow ON PURPOSE. A clause only comes out when BOTH hold:
//   1. it matches one of the ROAD_CLAUSE patterns below — a statement about the access road,
//      not about the climb; and
//   2. `road.seasonalGate` / `road.status` already states that fact, so nothing is lost.
// Rule 2 is what makes this safe rather than destructive: the parenthetical is deleted only
// because a fuller version of it survives one column over.
//
// Anything else is REPORTED, never edited. "Apr-Oct (best May-Jun with snow cover; SR-20
// closed Nov-mid Apr)" keeps its snow-cover half; "Often in good condition by May, but the
// Mowich Lake road frequently doesn't open until early July" is not a window at all and
// rewriting it is an editorial judgement, not a mechanical trim.
//
// --apply to write; dry by default.
import { SUPABASE_URL, anonKey, headers, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const k = anonKey();

/* Each pattern matches a clause that is ENTIRELY about the road. Deliberately anchored so a
   clause that also says something about conditions cannot match. */
const ROAD_CLAUSE = [
  /^\s*(?:subject to |while |once |around |shortly after )?[^;()]*\b(?:road|highway|sr[- ]?\d+|hwy|us[- ]?\d+)\b[^;()]*$/i,
];
const isRoadClause = (c) => ROAD_CLAUSE.some((re) => re.test(c.trim())) && !/snow|crevasse|melt|ice|condition|dry|wet|shade|sun/i.test(c);

/* One road has many spellings and they do not compare as strings. `wa_honeymoon_sweet` says
   "SR-20" in its season and "North Cascades Highway (State Route 20)" in road.name, so a raw
   token test reported the fact as UNCOVERED and skipped a route identical in shape to five it
   trimmed. That is the safe direction to fail, but it is still wrong — normalise both sides
   to `sr20` first. */
const normRoads = (s) => String(s || "").toLowerCase()
  .replace(/\bstate route\s*(\d+)/g, "sr$1")
  .replace(/\b(?:highway|hwy)\s*(\d+)/g, "sr$1")
  .replace(/\bsr[\s-]*(\d+)/g, "sr$1")
  .replace(/\bus[\s-]*(\d+)/g, "us$1");

/* Does road/ already say it? Compared on the road token the clause names. */
function roadCovers(road, clause) {
  const blob = normRoads(String(road && road.seasonalGate || "") + " " + String(road && road.status || "") + " " + String(road && road.name || ""));
  if (!blob.trim()) return false;
  /* Proper-noun road names must be lifted from the ORIGINAL clause — normRoads lowercases,
     and a lowercased clause matches no [A-Z] pattern, so computing `named` after it silently
     emptied this check and let "while Obstruction Point Road is open" be satisfied by ANY
     road blob mentioning a gate. Loosening a coverage test is the false-pass direction. */
  const named = (clause.match(/\b([A-Z][a-z]+(?: [A-Z][a-z]+)* (?:Road|Highway))\b/g) || []).map((t) => t.toLowerCase());
  clause = normRoads(clause);
  const toks = (clause.match(/\b(?:sr|us)\d+\b/gi) || []).map((t) => t.toLowerCase());
  const flat = blob.replace(/[\s-]/g, "");
  if (toks.length && !toks.every((t) => flat.includes(t))) return false;
  if (named.length && !named.every((t) => blob.includes(t.toLowerCase()))) return false;
  if (!toks.length && !named.length && !/\broad\b|\bhighway\b/i.test(clause)) return false;
  // A generic "while the road is open" is covered as long as road/ says anything about a gate.
  return /gate|clos|open|season|plow/i.test(blob);
}

const WINDOW = /^\s*((?:late |early |mid[- ])?(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*)\s*[-–]\s*((?:late |early |mid[- ])?(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*)\s*$/i;

function trim(season, road) {
  const m = String(season).match(/^([^(]+?)\s*\((.+)\)\s*$/);
  if (!m) return null;                       // not "<window> (<qualifier>)" — hand review
  const head = m[1].trim();
  if (!WINDOW.test(head)) return null;       // the head is not a month window — hand review
  const parts = m[2].split(/;\s*/);
  const kept = [], dropped = [];
  for (const p of parts) {
    if (isRoadClause(p) && roadCovers(road, p)) dropped.push(p.trim());
    else kept.push(p.trim());
  }
  if (!dropped.length) return null;
  return { next: kept.length ? `${head} (${kept.join("; ")})` : head, dropped };
}

async function readAll() {
  const out = []; let last = "";
  for (;;) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,name,season,road&season=not.is.null&id=gt.${encodeURIComponent(last)}&order=id.asc&limit=1000`, { headers: headers(k) });
    if (!res.ok) throw new Error(`read failed ${res.status}`);
    const rows = await res.json();
    if (!rows.length) break;
    out.push(...rows); last = rows[rows.length - 1].id;
    if (rows.length < 1000) break;
  }
  return out;
}

const rows = await readAll();
if (!rows.length) { console.error("FAIL — read 0 routes"); process.exit(1); }

const plan = [], skipped = [];
for (const r of rows) {
  const s = String(r.season || "");
  if (!/\b(road|highway|sr[- ]?\d+|hwy)\b/i.test(s)) continue;
  const t = trim(s, r.road);
  if (!t) { skipped.push({ id: r.id, season: s }); continue; }
  plan.push({ id: r.id, from: s, to: t.next, dropped: t.dropped });
}

console.log(`${rows.length} routes with a season · ${plan.length + skipped.length} mention a road\n`);
console.log(`--- WILL TRIM (${plan.length}) — the dropped clause survives in road/ ---`);
for (const p of plan) {
  console.log(`  ${p.id}`);
  console.log(`     "${p.from}"`);
  console.log(`  -> "${p.to}"        dropped: ${p.dropped.map((d) => `"${d}"`).join(", ")}`);
}
console.log(`\n--- LEFT FOR HAND REVIEW (${skipped.length}) — not a "<window> (<road note>)" shape ---`);
for (const s of skipped) console.log(`  ${s.id}: "${s.season}"`);

if (!APPLY) { console.log(`\ndry run — pass --apply to write ${plan.length}.`); process.exit(0); }

let n = 0;
for (const p of plan) {
  await patchRow("routes", p.id, { season: p.to });
  const after = (await (await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,season&id=eq.${p.id}`, { headers: headers(k) })).json())[0];
  if (!after || after.season !== p.to) { console.error(`VERIFY FAILED ${p.id}: season is ${JSON.stringify(after && after.season)}`); process.exit(1); }
  n++;
}
console.log(`\n${n} season value(s) trimmed to a window and re-read.`);
