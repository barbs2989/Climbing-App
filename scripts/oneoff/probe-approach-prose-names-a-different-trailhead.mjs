// Does a route's APPROACH PROSE narrate a different trailhead than the one its fields name?
//
// The two-record audit (`audit:trailhead-agreement`) compares the pin against approach_logistics.
// Both can agree perfectly and still disagree with the paragraph the climber actually reads. That
// is not hypothetical — #931 created one deliberately: wa_glacier_peak_sitkum_glacier's trailhead
// was moved to North Fork Sauk (its road is reliable; the blob's White Chuck road is "reported
// blocked ... with large boulders placed at the turnoff"), while its `approach` column still
// narrates the White Chuck River Trail step by step. Trailhead and prose now name different valleys.
//
// So this asks the third question: given the trailhead the fields name, does the approach text
// mention it at all?
//
// REPORT ONLY, AND DELIBERATELY SO. Matching a place name inside free prose is fuzzy in both
// directions -- a route can legitimately name its trailhead once, in a road-drive note stored in a
// different column, and a route can mention a trailhead it does NOT use ("rather than via Thunder
// Creek"). Precision is printed at the end rather than assumed, because this repo has shipped
// detectors that flagged correct work and taught people to ignore them.
//
//   node scripts/oneoff/probe-approach-prose-names-a-different-trailhead.mjs [--state=wa] [--limit=N]
import { selectAll, requireServiceKey } from "../lib/supabase-env.mjs";

const arg = (n, d) => (process.argv.find(a => a.startsWith(`--${n}=`)) || `--${n}=${d}`).split("=")[1];
const STATE = arg("state", "wa");
const LIMIT = Number(arg("limit", 40));
const key = requireServiceKey();

/* Tokens that identify a PLACE, not the words every trailhead name contains. Dropping the generic
   half is what stops "Trailhead" matching every approach paragraph ever written. */
const GENERIC = new Set(["trailhead", "th", "trail", "trails", "parking", "lot", "pullout", "road",
  "rd", "creek", "river", "lake", "lakes", "the", "and", "or", "of", "at", "on", "off", "to", "from",
  "end", "spur", "fork", "north", "south", "east", "west", "upper", "lower", "via", "near", "mile",
  "post", "milepost", "campground", "camp", "station", "ranger", "gate", "washout", "area", "access"]);

/* THE FIRST DRAFT SCORED 0 REAL OUT OF 6 and every miss was self-inflicted, so the fixes are
   recorded rather than just applied:
     - it STRIPPED PARENTHESES, which is where the real place name often lives. The field
       "Rattlesnake Trailhead (West Fork Methow Trail #480)" against an approach opening "From the
       West Fork Methow River Trailhead" is a match, and stripping made it a finding.
     - it dropped tokens of 2 characters and anything numeric, which deletes ROAD CODES. The field
       "NF-77 roadside pullout" against "From the NF-77 pullout" is a match, and the filters left
       only the word "roadside" to look for.
   Parentheses are now kept, and road codes (nf77, fr2870, sr20) are joined into one token on both
   sides so they compare equal however they are punctuated. */
const roadCodes = s => (String(s || "").toLowerCase().match(/\b(?:nf|fr|fs|sr|us|hwy|trail)[\s\-#]*\d+\b/g) || [])
  .map(x => x.replace(/[\s\-#]/g, ""));

const tokens = s => {
  const low = String(s || "").toLowerCase();
  const words = low.replace(/[^a-z0-9 ]+/g, " ").split(/\s+/)
    .filter(t => t.length > 2 && !GENERIC.has(t) && !/^\d+$/.test(t));
  return [...new Set([...words, ...roadCodes(low)])];
};

/* An approach that DEFERS to another route names no trailhead by design, and four Amphitheater
   Mountain routes were reported for saying "Backpack to Upper Cathedral Lake as for the West
   Route". That is correct writing, not a missing trailhead. */
const DEFERS = /\bas for the\b|\bapproach exactly as\b|\bsame as (the|for)\b|\bsee (the )?(west route|peak-level|road-drive|approach)\b|\bper the (peak|standard)\b/i;

const rows = await selectAll("routes", `id,name,approach,approach_logistics`, `id=like.${STATE}_*`,
  { pageSize: 150, key });
if (!rows.length) { console.error("read 0 routes — refusing to report"); process.exit(1); }

let considered = 0, deferred = 0;
const findings = [];
for (const r of rows) {
  const al = (r.approach_logistics && typeof r.approach_logistics === "object"
    && !Array.isArray(r.approach_logistics)) ? r.approach_logistics : null;
  const name = al && al.trailhead;
  const prose = String(r.approach || "");
  if (!name || prose.length < 120) continue;      // nothing to compare, or no real paragraph
  if (DEFERS.test(prose)) { deferred++; continue; }
  const t = tokens(name);
  if (!t.length) continue;                        // a name made entirely of generic words
  considered++;
  const hay = prose.toLowerCase();
  const flat = hay.replace(/[\s\-#]/g, "");       // so "NF-77" in prose meets "nf77" from the name
  if (t.some(x => hay.includes(x) || flat.includes(x))) continue;   // the prose names it

  /* "THE PROSE DOES NOT NAME THIS TRAILHEAD" IS THE WRONG QUESTION, and asking it produced six
     false positives for every two real ones. Most approaches simply START PARTWAY -- "From the
     pullout", "From Colchuck Lake's west side trail" -- naming no trailhead at all. That is not a
     contradiction, it is an approach written from the point the route diverges.

     The defect is narrower and is what the title actually claims: the prose names a DIFFERENT
     trailhead. So require the paragraph to contain an explicit "<Name> Trailhead" of its own, and
     report only when that name shares no distinctive word with the field. Two records naming two
     different trailheads on one row is a contradiction; silence is not. */
  const named = [...prose.matchAll(/\b((?:[A-Z][\w'-]*\s+){1,4})(Trailhead|TH)\b/g)]
    .map(m => (m[1] + m[2]).trim())
    .filter(n => { const nt = tokens(n); return nt.length && !nt.some(x => t.includes(x)); });
  if (!named.length) continue;

  findings.push({ id: r.id, name, prosanames: [...new Set(named)], missing: t,
    head: prose.slice(0, 150).replace(/\s+/g, " ") });
}

findings.sort((a, b) => a.id < b.id ? -1 : 1);
console.log(`${STATE}: ${rows.length} routes · ${considered} have both a named trailhead and an approach paragraph`);
console.log(`${deferred} skipped: the approach defers to another route ("as for the West Route"), so it names no trailhead by design`);
console.log(`${findings.length} where the approach names a DIFFERENT trailhead than the fields do\n`);
for (const f of findings.slice(0, LIMIT)) {
  console.log(`${f.id}`);
  console.log(`   fields say : "${f.name}"`);
  console.log(`   prose says : ${f.prosanames.map(n => `"${n}"`).join(", ")}`);
  console.log(`   approach   : ${f.head}…\n`);
}
if (findings.length > LIMIT) console.log(`… and ${findings.length - LIMIT} more (--limit=N)\n`);

console.log("Report only; nothing was written. A hit is a QUESTION, not a defect — a route may name a");
console.log("trailhead it explicitly does NOT use, and a route with two real approaches will name the");
console.log("one its fields do not hold. Read the row before changing anything.");
console.log("");
console.log("WHY THIS IS WORTH RUNNING ALONGSIDE audit:trailhead-agreement, not instead of it: that");
console.log("audit compares the pin against approach_logistics, so it is blind whenever the two AGREE");
console.log("and are wrong TOGETHER. wa_inner_constance_northwest_buttress is exactly that — both");
console.log("records hold 'Dosewallips Road washout parking' to the digit, while the route's own");
console.log("approach says to drive to the Upper Dungeness Trailhead and gives its coordinates. Its");
console.log("trailheadDirection names the source: 'Same access as the Mount Constance routes'.");
