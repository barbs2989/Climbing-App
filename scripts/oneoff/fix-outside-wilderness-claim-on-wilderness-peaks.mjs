// Three Alpine Lakes peaks told they sit outside designated wilderness, by a sentence about three
// other peaks forty kilometres away.
//
// access.notes on wa_iron_cap_mountain_south_route, wa_la_bohn_peak_southwest_slopes and
// wa_slippery_slab_tower_ne_face reads, in full:
//
//   "Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated
//    wilderness — administratively unrestricted despite serious technical terrain."
//
// All three are inside the ALPINE LAKES WILDERNESS, and each row's own permit field says so: "Free
// self-issue Alpine Lakes Wilderness permit at the trailhead". Persis, Gunn and Baring are in the
// Skykomish valley. "Many of THESE peaks" is what makes it a false claim rather than a stray note —
// the same applicability clause as the Cascade River Road sentence cleared from 40 rows this session,
// which said "(the access road for these trailheads)". A statement that a peak is administratively
// unrestricted is permit-relevant: it says no wilderness permit is needed, on a row that requires one.
//
// THE NINE WILD SKY ROWS ARE DELIBERATELY LEFT, and reading all twelve is what separated them.
// Baring, Gunn, Gunnshy, Eagle Rock, Grotto, Jotunheim, Merchant, Spinnaker and Wing ARE the cluster
// the sentence is about, and whether each sits inside the Wild Sky Wilderness boundary is a question
// about a boundary map I do not have. On those rows the sentence may be right, or may be a real
// finding — but it is not settleable from the row, and clearing it would be picking.
//
// THE MEASUREMENT IS MOST OF THE VALUE, and the first two versions of it were both wrong:
//   * 1,147 WA rows carry this sentence. Nearly all are boulder problems and crags (Yin Yang Boulder,
//     Wrestler Boulder, Cereal Boulder) where it is meaningless filler rather than a falsehood. A
//     sweep on the sentence alone would have emptied a thousand fields to fix three.
//   * A first contradiction test asked whether any field on the row mentioned a wilderness permit —
//     and matched "NO wilderness permit required (outside designated wilderness)", a sentence that
//     AGREES with it. That reported 64. It is the third time this session a negation has been read as
//     a claim, after the no-permit detector and audit:trailhead-road's own recorded "Not plowed in
//     winter". Requiring an ASSERTION in a sentence that is not itself a denial gives 12; grouping
//     those by which wilderness they name gives 9 + 3.
//
// The sentence is the ENTIRE value of access.notes on all three, so the field is cleared rather than
// trimmed — the same call as the Cascade River Road repair, for the same reason: what would be left is
// a statement about somewhere else, in a field that answers "what applies to THIS route".
//
// Read-only by default. Pass --apply to write.
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
requireServiceKey();

const SENT = "Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness";
// the row must ASSERT a wilderness permit, in a sentence that is not itself a denial...
const SENTS = s => String(s || "").split(/(?<=[.;])\s+/);
const DENY = /\bno\b[^.;]{0,40}\bpermit\b|not\s+(?:required|needed)|outside\s+(?:of\s+)?(?:any\s+)?designated\s+wilderness/i;
const ASSERT = /(?:wilderness|self[- ]issue[d]?)\s+permits?[^.;]{0,60}\b(?:required|needed|must)|\brequires?\s+a\s+(?:free\s+)?(?:self[- ]issue[d]?\s+)?wilderness\s+permit/i;
// ...and it must name a wilderness that is NOT the cluster the sentence is about.
const NAMED = /(alpine lakes|henry m\.? jackson|glacier peak|olympic|pasayten|mount baker|boulder river|lake chelan[- ]sawtooth)\s+wilderness/i;
const CLUSTER = /wild sky wilderness/i;

const rows = await selectAll("routes", "id,permit,access", "id=like.wa_*", { pageSize: 1000 });
console.log(`WA routes read: ${rows.length}`);
if (rows.length < 5000) { console.error("SHORT READ — refusing to act on a partial read"); process.exit(1); }

const plan = [], held = [];
let carrying = 0;
for (const r of rows) {
  const a = r.access || {};
  const notes = String(a.notes ?? "").trim();
  if (!notes.includes(SENT)) continue;
  carrying++;
  const own = [r.permit, a.permit, a.rules, a.land_manager, a.landManager, a.passRequired].map(x => String(x || "")).join(" | ");
  const claim = SENTS(own).find(x => ASSERT.test(x) && !DENY.test(x));
  if (!claim) continue;
  const named = own.match(NAMED);
  if (!named || CLUSTER.test(own)) { held.push({ id: r.id, why: named ? "names the Wild Sky Wilderness — this row IS the cluster the sentence is about" : "asserts a permit but names no wilderness" }); continue; }
  // the sentence must be the whole value, or clearing would drop something else with it
  if (!notes.startsWith(SENT)) { held.push({ id: r.id, why: "the sentence is not the start of the value" }); continue; }
  if (notes.length > SENT.length + 90) { held.push({ id: r.id, why: "access.notes carries more than this sentence — clearing would lose it" }); continue; }
  console.log(`\n  ${r.id}`);
  console.log(`     access.notes : ${JSON.stringify(notes.slice(0, 175))}`);
  console.log(`     row asserts  : ${JSON.stringify(claim.trim().slice(0, 140))}`);
  console.log(`     wilderness   : ${named[0]}`);
  plan.push({ id: r.id, access: a });
}

console.log(`\nrows carrying the sentence: ${carrying}`);
console.log(`  to clear: ${plan.length}`);
console.log(`  held back: ${held.length}`);
for (const h of held) console.log(`     HELD ${h.id} — ${h.why}`);
if (!plan.length) { console.log("\nnothing to do."); process.exit(0); }
if (!APPLY) { console.log("\nDRY RUN — pass --apply to write."); process.exit(0); }

for (const p of plan) await patchRow("routes", p.id, { access: { ...p.access, notes: "" } });
const after = await selectAll("routes", "id,access", `id=in.(${plan.map(p => p.id).join(",")})`, { pageSize: 20 });
const left = after.filter(r => String(r.access?.notes ?? "").includes(SENT)).length;
console.log(`\ncleared ${plan.length}; rows in that set still carrying it: ${left}  (expected 0)`);
