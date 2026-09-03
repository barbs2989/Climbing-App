// REPORT-ONLY. A row that warns of LOOSE ROCK in `obj_haz`/`hazards` while its own prose calls the
// rock SOUND is not just inconsistent -- on some routes it destroys a navigation signal.
//
// wa_big_snow_mountain_east_buttress (batch 102) is the case. Its obj_haz opens "loose rock typical
// of Cascades granite buttresses", while its overview says "notably sound rock", its beta says
// "generally solid granite", the AAJ first-ascent report says "the rock was very sound", and
// Mountain Project calls it "the best granite in the Alpine Lakes region". The reason it matters
// more than a tidy-up: the row's OWN approach_variants makes rock quality the route-identification
// test -- "Solid granite close to a crest, with overhangs to work beneath, is the confirmation.
// Loose scrambling means you are on the ridge route instead." A party told to expect loose rock has
// lost the signal that tells them they are off route.
//
// PRECISION, because the obvious scan is noise. Most alpine rows legitimately warn about loose rock
// SOMEWHERE on a route whose climbing is solid -- a choss gully approach below a clean buttress is
// the norm in this range, not a contradiction. So this requires the row to assert soundness about
// the SAME thing, and it reports the two sentences side by side so a reader judges rather than
// trusting the match.
import { selectAll, requireServiceKey } from "../lib/supabase-env.mjs";
const KEY = requireServiceKey();
const rows = await selectAll("routes", "id,obj_haz,hazards,overview,beta,areas!inner(name,path)",
  "areas.path=cd.usa.washington", { pageSize: 500, key: KEY });
console.log("WA rows:", rows.length);
if (rows.length < 5000) { console.error("SHORT READ"); process.exit(1); }

const arr = v => Array.isArray(v) ? v : (typeof v === "string" ? [v] : []);
// a hazard entry whose SUBJECT is loose rock, not one that merely mentions rockfall
const LOOSE = /\bloose rock\b|\brotten rock\b|\bchoss\w*\b|\bfriable\b|\bcrumbl\w+\b/i;
// prose asserting the ROCK is sound. "solid" alone is too weak -- "solid 5.8" is a grade remark.
const SOUND = /\b(?:notably |generally |remarkably |very |exceptionally )?(?:sound|solid|excellent|clean|good|beautiful|superb)\s+(?:granite|rock|stone|gneiss)\b|\brock (?:is|was) (?:very )?(?:sound|solid|excellent|good)\b/i;
const SENTS = s => String(s || "").split(/(?<=[.;])\s+/);

// TWO STRUCTURAL EXCLUSIONS, both measured rather than guessed. A first run reported 64, and reading
// them showed this header's own warning was right: most are not contradictions at all.
//
// 1. THE HAZARD SCOPES ITSELF TO DIFFERENT GROUND. "Talus and scree field APPROACH -- loose rock",
//    "loose rock lower on the ADJACENT standard line", "especially on the APPROACH GULLY". A choss
//    gully beneath a clean buttress is the norm in this range, and a row saying so is correct.
// 2. THE PROSE ALREADY RECONCILES IT. "Rock is generally solid granite BUT LOOSE IN SPOTS near the
//    summit" is one sentence making both claims and reconciling them; flagging it would tell an
//    author to delete the nuance that is the most useful thing in the field.
const OTHER_GROUND = /\bapproach\b|\bgull(?:y|ies)\b|\badjacent\b|\bneighbo(?:u)?ring\b|\bstandard (?:line|route)\b|\bdescent\b|\btalus\b|\bscree\b|\bmoraine\b|\bledges?\b|\b(?:lower|upper|first|last) pitch(?:es)?\b|\bpitch \d/i;
// "though" is a reconciler and was missing -- wa_gato_negro reads "mostly solid rock, THOUGH loose
// sections". A synonym gap, the same shape as the hyphen that defeated the fees deny-list twice.
const RECONCILED = /\bbut\b|\bthough\b|\bexcept\b|\bapart from\b|\bin spots\b|\bin places\b|\bisolated\b|\bsome sections\b/i;

const hits = [];
let scoped = 0, reconciled = 0;
for (const r of rows) {
  const haz = [...arr(r.obj_haz), ...arr(r.hazards)].filter(x => typeof x === "string" && LOOSE.test(x));
  if (!haz.length) continue;
  const sound = [];
  for (const k of ["overview", "beta"]) {
    for (const s of SENTS(r[k])) if (SOUND.test(s)) sound.push(`${k}: ${s.trim()}`);
  }
  if (!sound.length) continue;
  // THE RECONCILED TEST WAS ASYMMETRIC. It ran on the prose only, so "Loose rock IN PLACES" as a
  // HAZARD entry sailed through while the identical hedge in prose was excused. A row that hedges
  // is a row that hedges, whichever field it does it in.
  const pairs = [];
  for (const h of haz) {
    if (OTHER_GROUND.test(h)) { scoped++; continue; }
    if (RECONCILED.test(h)) { reconciled++; continue; }
    for (const so of sound) {
      if (RECONCILED.test(so)) { reconciled++; continue; }
      pairs.push([h, so]);
    }
  }
  if (!pairs.length) continue;
  hits.push({ id: r.id, peak: r.areas.name, haz: pairs[0][0], sound: pairs[0][1] });
}
console.log(`\nexcluded: ${scoped} hazard entries scoped to other ground, ${reconciled} prose sentences that reconcile`);
console.log(`\nrows warning of LOOSE rock while their own prose calls the rock SOUND: ${hits.length}\n`);
for (const h of hits) {
  console.log(`  !! ${h.id}  [${h.peak}]`);
  console.log(`     hazard : ${h.haz.slice(0, 150)}`);
  console.log(`     prose  : ${h.sound.slice(0, 150)}`);
}
console.log(`\nREPORT-ONLY. Read both sentences before acting: a loose approach gully beneath a clean`);
console.log(`buttress is normal in this range and is NOT a contradiction. Repair only where the two`);
console.log(`sentences are about the same ground.`);
