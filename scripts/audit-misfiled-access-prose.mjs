// Road-access and permit sentences filed in a column that renders somewhere else.
//
// The report that prompted this: a route page showing "Cascade River Road usually doesn't
// open until late May/June depending on snowpack, and the Eldorado/Inspiration Glacier zone
// is a high-occupancy North Cascades NP backcountry zone requiring an advance wilderness
// permit reservation" — under SEASON, not under road/access. Both halves are true. Both are
// about getting to the climb, not about when the climb is in condition, and the route
// already has `road` and `access` jsonb columns that exist for exactly these two facts.
//
// This is the general form of the rule CLAUDE.md already states for `season`, `grade` and
// `rappels`: before writing a researched string into a column, look at where that column
// RENDERS. No coverage check can see this — the column is populated and the prose is
// accurate, so every existing guard reads it as healthy. Only asking what the sentence is
// ABOUT separates them.
//
// Report-only, and it must stay that way. A season field may legitimately mention the road
// (the road IS the season gate on a lot of these), so the output distinguishes:
//   DUPLICATE — road/access already states this fact, so the display column is repeating it
//   MISFILED  — road/access says nothing about it, so moving it would LOSE nothing and gain
//               a correctly-filed fact
// Read both before changing either. Read-only; fails closed on an empty read.
import { SUPABASE_URL, anonKey, headers } from "./lib/supabase-env.mjs";

const argv = process.argv.slice(2);
const arg = (kk, d) => { const i = argv.indexOf(kk); return i >= 0 ? (argv[i + 1] ?? true) : d; };
const LIMIT = Number(arg("--limit", 30));
const ONLY = arg("--col", null);
const JSON_OUT = argv.includes("--json");

const k = anonKey();

/* The columns whose SECTION is not about access, and where a road or permit sentence is
   therefore in the wrong place.

   `approach` is deliberately absent: it describes the walk in and naming the drive at its
   head is correct there. `permit` is absent for the same reason — it IS an access column,
   just a scalar one.

   `climate` and `timing` were in the first draft and came OUT after measuring, which is the
   whole reason this list is short. They are jsonb keyed BY SEASON, and
   `climate.bySeason.winter = "SR-20 closed over Washington Pass"` is not misfiled — it is
   the correct and useful answer to "what is this place like in winter". Between them they
   produced 693 of 1,017 flags, nearly all of that shape. A detector that reports correct
   work teaches people to ignore it, so they are counted as CONTEXT below and never listed as
   findings. Measure a detector's precision on real data before shipping it. */
const COLS = ["season", "best_season", "overview", "beta", "turnaround", "watch_out", "description"];
/* Reported as a count only — a road or permit mention here is defensible. */
const CONTEXT_COLS = ["climate", "timing", "pro_tips"];

/* A sentence is about the ROAD when it names a road AND says something about reaching or
   not reaching it. Naming a road alone is not enough — "follow the road to the basin" is
   route description. */
const ROAD_NOUN = /\b(road|highway|hwy|sr[- ]?\d+|fr[- ]?\d+|forest road|us[- ]?\d+|i-\d+|milepost|mp \d+|trailhead)\b/i;
const ROAD_VERB = /\b(open(s|ed|ing)?|clos(e|es|ed|ure|ing)|gate[sd]?|gated|access(ible)?|plow(ed|ing)?|wash(ed)?[- ]?out|snow[- ]?free|drivable|driveable|impassab|reopen)\b/i;
const PERMIT = /\b(permit|permits|reservation|recreation\.gov|quota|wilderness information center|northwest forest pass|discover pass|sno-?park pass|entrance fee|self[- ]register|bear canister required)\b/i;

const sentences = (t) => String(t || "").split(/(?<=[.;!?])\s+/).map((s) => s.trim()).filter(Boolean);
const isRoad = (s) => ROAD_NOUN.test(s) && ROAD_VERB.test(s);
const isPermit = (s) => PERMIT.test(s);

/* Does road/access already carry this fact? Compared on the distinctive tokens the sentence
   uses — a proper-noun road name, a month, "permit". A loose comparison would call a genuine
   MISFILED a duplicate and quietly recommend deleting the only copy. */
function tokensOf(s) {
  const out = new Set();
  const road = s.match(/\b([A-Z][a-z]+(?: [A-Z][a-z]+)* (?:Road|Highway|Rd))\b/g) || [];
  road.forEach((r) => out.add(r.toLowerCase()));
  (s.match(/\b(?:SR|FR|US)[- ]?\d+\b/gi) || []).forEach((r) => out.add(r.toLowerCase().replace(/[- ]/g, "")));
  (s.match(/\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\b/g) || []).forEach((m) => out.add(m.toLowerCase()));
  if (/permit/i.test(s)) out.add("permit");
  if (/recreation\.gov/i.test(s)) out.add("recreation.gov");
  return [...out];
}
function coveredBy(blobText, toks) {
  if (!toks.length) return false;
  const b = String(blobText || "").toLowerCase().replace(/[- ]/g, (m) => m);
  const bNo = b.replace(/[- ]/g, "");
  return toks.every((t) => b.includes(t) || bNo.includes(t.replace(/[- ]/g, "")));
}

async function readAll() {
  const out = []; let last = "";
  const sel = ["id", "name", "area_id", "road", "access", "permit"].concat(COLS).concat(CONTEXT_COLS).join(",");
  for (;;) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=${sel}&id=gt.${encodeURIComponent(last)}&or=(${COLS.map((c) => `${c}.not.is.null`).join(",")})&order=id.asc&limit=1000`, { headers: headers(k) });
    if (!res.ok) throw new Error(`read failed ${res.status} ${(await res.text()).slice(0, 200)}`);
    const rows = await res.json();
    if (!rows.length) break;
    out.push(...rows); last = rows[rows.length - 1].id;
    if (rows.length < 1000) break;
  }
  return out;
}

const rows = await readAll();
if (!rows.length) { console.error("FAIL — read 0 routes. A clean answer here would be vacuous."); process.exit(1); }

/* Walk a jsonb value's STRING LEAVES rather than stringifying it. The first draft split
   JSON.stringify() output into "sentences" and produced fragments like
   `road normally gated until May.","summer":"Warm and dry;` — half a value welded to the next
   key. That is not a sentence anyone wrote, so neither the road test nor the duplicate test
   was measuring what it claimed to. */
function leaves(v, out) {
  out = out || [];
  if (v == null) return out;
  if (typeof v === "string") { out.push(v); return out; }
  if (Array.isArray(v)) { v.forEach((x) => leaves(x, out)); return out; }
  if (typeof v === "object") { Object.values(v).forEach((x) => leaves(x, out)); return out; }
  return out;
}

let contextCount = 0;
const findings = [];
for (const r of rows) {
  const blob = JSON.stringify(r.road || {}) + " " + JSON.stringify(r.access || {}) + " " + String(r.permit || "");
  for (const c of CONTEXT_COLS) {
    for (const leaf of leaves(r[c])) for (const s of sentences(leaf)) if (isRoad(s) || isPermit(s)) contextCount++;
  }
  for (const c of COLS) {
    if (ONLY && c !== ONLY) continue;
    const v = r[c];
    if (v == null) continue;
    for (const leaf of leaves(v)) for (const s of sentences(leaf)) {
      const road = isRoad(s), permit = isPermit(s);
      if (!road && !permit) continue;
      const toks = tokensOf(s);
      findings.push({ id: r.id, name: r.name, col: c, kind: road && permit ? "road+permit" : road ? "road" : "permit", dup: coveredBy(blob, toks), s, toks });
    }
  }
}

if (JSON_OUT) { console.log(JSON.stringify({ routes: rows.length, findings }, null, 2)); process.exit(0); }

const dup = findings.filter((f) => f.dup), mis = findings.filter((f) => !f.dup);
console.log(`\n=== access prose filed outside road/access ===`);
console.log(`${rows.length} routes read · ${findings.length} sentence(s) flagged across ${new Set(findings.map((f) => f.id)).size} route(s)`);
console.log(`  DUPLICATE (road/access already says it): ${dup.length}`);
console.log(`  MISFILED  (road/access says nothing):    ${mis.length}`);
console.log(`\n  ${contextCount} further road/permit mention(s) in ${CONTEXT_COLS.join(", ")} are NOT counted as findings.`);
console.log(`  Those columns are keyed by season or are advice, so "SR-20 closed over Washington Pass"`);
console.log(`  under climate.bySeason.winter is the correct answer to that field's own question.`);

const byCol = {};
for (const f of findings) { byCol[f.col] = byCol[f.col] || { n: 0, dup: 0 }; byCol[f.col].n++; if (f.dup) byCol[f.col].dup++; }
console.log(`\nby column:`);
for (const [c, v] of Object.entries(byCol).sort((a, b) => b[1].n - a[1].n)) console.log(`  ${c.padEnd(14)} ${String(v.n).padStart(4)}  (${v.dup} already duplicated in road/access)`);

for (const [label, list] of [["DUPLICATE — safe to drop from the display column, the fact survives in road/access", dup], ["MISFILED — moving it would lose nothing and file it where it belongs", mis]]) {
  console.log(`\n--- ${label}: ${list.length} ---`);
  for (const f of list.slice(0, LIMIT)) {
    console.log(`  ${f.id}  [${f.col}] (${f.kind})`);
    console.log(`     "${f.s.slice(0, 260)}"`);
  }
  if (list.length > LIMIT) console.log(`  … ${list.length - LIMIT} more (raise --limit)`);
}
console.log(`\nReport only — nothing was changed.`);
