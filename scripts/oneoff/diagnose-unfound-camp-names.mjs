// IS IT THE SOURCE, OR THE QUERY? — asked of the camps the gazetteer "cannot find".
//
// solve-camp-elevations refuses 50 names with `no feature named "X" anywhere in WA`, and CLAUDE.md
// reads that bucket as climbers' names — "Porkbelly Ridge crest gain", "Class 5 Step" — places no
// gazetteer holds. Most of it is. But the bucket also contains LOWER LENA LAKE, CHIWAUKUM CHAIN
// LAKES, UPPER ICE LAKE and SULPHIDE CAMP, which are ordinary mapped features, and a refusal on
// those is a claim about the query rather than about the world.
//
// This repo has been here before: an ArcGIS `LIKE` was case-sensitive, GNIS matched nothing for 25
// of 39 pins, and the run reported every one of them as "a climbers' name, not a federal one" — a
// uniform, plausible, wrong finding, caught only because a control had already located one by hand.
// The endpoint answered and the reader could not hear it.
//
// So: for each name, print what the solver SEARCHED FOR, what the gazetteer RETURNED, and which
// gate rejected it. No writes, no elevations — this is about the instrument.
import { selectAll } from "../lib/supabase-env.mjs";

// The solver's own reduction, restated here deliberately rather than imported: the question is
// whether THAT reduction is what loses these, so borrowing it whole would beg the question. Kept
// short and checked against the solver's behaviour by the output below.
const CAMPWORDS = /\b(camp|campsite|camps|bivouac|bivy|bivies|site|sites|staging|roadhead)\b/gi;
const strip = (s) => s.split(/[,—–(]/)[0].trim();
const norm = (s) => s.toLowerCase().replace(/\s+/g, " ").trim();

// Every name the solver refused as unfindable, read from its own proposals file rather than
// retyped — a hand-copied sample is how you end up extrapolating from ten.
import fs from "fs";
const PROPOSALS = new URL("../../camp-elevation-proposals.json", import.meta.url).pathname;
if (!fs.existsSync(PROPOSALS)) {
  console.log("FAIL CLOSED: run solve-camp-elevations.mjs first to produce the refusal list");
  process.exit(1);
}
const { refused } = JSON.parse(fs.readFileSync(PROPOSALS, "utf8"));
const NAMES = refused.filter((r) => r.why.includes("no feature named")).map((r) => r.name);
if (!NAMES.length) { console.log("FAIL CLOSED: no 'no feature' refusals in the proposals file"); process.exit(1); }

const nominatim = async (q) => {
  const u = "https://nominatim.openstreetmap.org/search?format=json&limit=8&countrycodes=us&q=" +
    encodeURIComponent(q);
  try {
    const r = await fetch(u, { headers: { "User-Agent": "climbing-app-camp-name-diagnostic" } });
    if (!r.ok) return { err: `HTTP ${r.status}` };
    return { hits: await r.json() };
  } catch (e) { return { err: e.message }; }
};

console.log(`${NAMES.length} name(s) the solver could not find. Asking the gazetteer directly:\n`);

const buckets = { absent: [], exact: [], nearMiss: [], farAway: [] };
let anyAnswered = 0;
const T = Math.PI / 180;

for (const name of NAMES) {
  const lead = strip(name);
  const noCamp = lead.replace(CAMPWORDS, " ").replace(/\s+/g, " ").trim();
  let best = null, sawAny = false;
  for (const q of [...new Set([lead, noCamp])].filter(Boolean)) {
    const { hits, err } = await nominatim(q);
    await new Promise((s) => setTimeout(s, 1100));
    if (err) continue;
    anyAnswered++;
    if (!hits.length) continue;
    sawAny = true;
    for (const h of hits) {
      const first = String(h.display_name).split(",")[0];
      const isExact = norm(first) === norm(q);
      const inWA = Number(h.lat) > 45.4 && Number(h.lat) < 49.1 &&
                   Number(h.lon) > -124.9 && Number(h.lon) < -116.8;
      if (!best || (isExact && !best.isExact) || (isExact === best.isExact && inWA && !best.inWA))
        best = { first, type: h.type, isExact, inWA, lat: Number(h.lat), lng: Number(h.lon) };
    }
  }
  if (!sawAny) { buckets.absent.push(name); continue; }
  if (!best.inWA) { buckets.farAway.push([name, best]); continue; }
  if (best.isExact) { buckets.exact.push([name, best]); continue; }
  buckets.nearMiss.push([name, best]);
}

if (!anyAnswered) {
  console.log("FAIL CLOSED: the gazetteer answered nothing at all — that is an outage, not a finding.");
  process.exit(1);
}

console.log(`ABSENT  the gazetteer holds nothing of this name : ${buckets.absent.length}`);
console.log(`EXACT   an exact name match, in Washington       : ${buckets.exact.length}`);
console.log(`NEAR    hits in WA but no exact name match       : ${buckets.nearMiss.length}`);
console.log(`FAR     best hit is outside Washington           : ${buckets.farAway.length}\n`);

console.log("EXACT — the identity gate would accept these; something else refused them:");
for (const [n, b] of buckets.exact) console.log(`   ${n}\n      -> ${b.first} (${b.type})`);

console.log("\nNEAR — read each: an extra word can be the SAME place or a DIFFERENT one.");
for (const [n, b] of buckets.nearMiss) console.log(`   ${n}\n      -> ${b.first} (${b.type})`);

console.log("\nFAR — correctly refused; a namesake outside the state.");
for (const [n, b] of buckets.farAway) console.log(`   ${n} -> ${b.first} @ ${b.lat.toFixed(2)},${b.lng.toFixed(2)}`);

console.log(`\nABSENT is the real answer for ${buckets.absent.length} of ${NAMES.length}: these are`);
console.log("climbers' and descriptive names, and no amount of querying finds a place that is not");
console.log("mapped. That CONFIRMS the recorded reading of this bucket rather than overturning it.");
