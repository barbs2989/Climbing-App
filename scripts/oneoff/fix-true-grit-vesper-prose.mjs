// wa_true_grit is a Postal Wall route at Frenchman Coulee — a Vantage basalt sport crag, sport
// 5.10c, 0 pitches. Five of its text fields describe a different climb: Darin Berdinka's 5.8 trad
// line on VESPER PEAK's north face, 150 km away in the Cascades. 29 rows in the catalog are named
// "True Grit"; this is the "a name is not an identity" root cause reaching a prose column.
//
// The target row is IDENTIFIED, not guessed: wa_true_grit_2 (Vesper Peak, alpine 5.8, 5 pitches,
// beside Ragged Edge 5.7) is that route, and it already carries the same facts in far fuller form
// — a five-entry pitch_detail, its own rack, and a 1,400-character approach. So this is a stray
// DUPLICATE to clear, not prose to move: nothing is lost by deleting it here.
//
// THE ROW IS A MIX, which is why this clears named fields rather than blanking the row. Its
// `hazards` is genuinely about Frenchman Coulee — "Basalt columns fracture in dinner-plate style
// … rattlesnakes are present roughly May-September, and raptor nesting closures" — and is correct
// where it sits. Its `season` carries no Vesper-specific token, so it is left alone rather than
// cleared on a hunch; "Jun-Sep" is a poor fit for a desert crag that bakes in midsummer, but that
// is a judgement about climbing rather than something this row proves, and replacing it would be
// inventing a value.
//
// Two gates, both enforced before any write:
//   1. every field being cleared must NAME something only Vesper has, and
//   2. the Vesper row must already say it, so the deletion cannot destroy the only copy.
//
// --apply to write; dry by default.
import { SUPABASE_URL, anonKey, headers, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const BAD = "wa_true_grit";        // Postal Wall, Frenchman Coulee
const GOOD = "wa_true_grit_2";     // Vesper Peak
const CLEAR = ["overview", "beta", "approach", "best_season", "watch_out"];

/* Tokens that exist on Vesper and cannot belong to a Frenchman Coulee sport route. Deliberately
   place names and the first ascensionist rather than climbing vocabulary — "north face" and
   "ledge" would match plenty of correct prose elsewhere. */
const VESPER = /\b(vesper|ragged edge|sunrise mine|headlee|stillaguamish|sperry|wolf peak|berdinka|mountain loop)\b/i;

const k = anonKey();
const SEL = "id,name,area_id,discipline,grade,pitches,overview,beta,approach,best_season,watch_out,season,hazards";
const rows = await (await fetch(`${SUPABASE_URL}/rest/v1/routes?select=${SEL}&id=in.(${BAD},${GOOD})`, { headers: headers(k) })).json();
const bad = rows.find((r) => r.id === BAD), good = rows.find((r) => r.id === GOOD);
if (!bad || !good) { console.error(`expected both rows, got ${rows.map((r) => r.id).join(",")} — refusing`); process.exit(1); }

function leaves(v, out = []) {
  if (typeof v === "string") { if (v.trim()) out.push(v); return out; }
  if (Array.isArray(v)) { for (const x of v) leaves(x, out); return out; }
  if (v && typeof v === "object") { for (const x of Object.values(v)) leaves(x, out); return out; }
  return out;
}
/* Everything the Vesper row says, in one blob — gate 2 asks whether the FACTS survive there, not
   whether the same column does. The Vesper approach lives in `approach`, but its watch-out
   content is spread across watch_out and hazards, so a column-for-column test would wrongly
   refuse a safe deletion. */
const goodText = [good.overview, good.beta, good.approach, good.best_season, ...leaves(good.watch_out), ...leaves(good.hazards)].filter(Boolean).join("  ").toLowerCase();

console.log(`\n### ${BAD} — ${bad.name}  [${bad.discipline} ${bad.grade} ${bad.pitches ?? "-"}p, Postal Wall / Frenchman Coulee]`);
console.log(`### target: ${GOOD} — ${good.name}  [${good.discipline} ${good.grade} ${good.pitches ?? "-"}p, Vesper Peak]\n`);

/* GATE B, for the fields that carry no Vesper place name.
   `best_season` ("the peak's other north-face lines … lingering early-season snow/ice on the
   shared approach") and `watch_out` ("several unbridged creek crossings on the approach trail")
   describe terrain a Vantage basalt crag does not have, but they name nothing only Vesper has,
   so Gate A cannot touch them — correctly, on that evidence alone.
   The evidence that settles it comes from the CRAG, not the row: measured over the 110 routes in
   the Frenchman Coulee subtree, wa_true_grit is the ONLY one that records a season, the ONLY one
   with an approach, and the ONLY one whose text mentions alpine terrain. Its whole enrichment
   block is anomalous where it sits, and three of its fields are already proven foreign by Gate A.
   That is a cluster argument, the same shape audit:trailhead-road uses, and it is stated here
   rather than folded into Gate A so the two kinds of evidence stay distinguishable.
   It is deliberately gated on Gate A having ALREADY fired at least twice: "this field is unlike
   its siblings" is far too weak on its own, and would let a thinly-enriched crag condemn its one
   well-documented route. */
const ALPINE_TERRAIN = /\b(snow|ice|glacier|creek crossing|unbridged|north face|couloir|axe|crampons|basin|the peak's)\b/i;
const GATE_B = ["best_season", "watch_out"];

const patch = {};
let refuse = 0, gateA = 0;
const deferred = [];
for (const c of CLEAR) {
  const v = bad[c];
  const txt = leaves(v).join("  ");
  if (!txt.trim()) { console.log(`  skip  ${c}: already empty`); continue; }
  const m = txt.match(VESPER);
  if (!m) { deferred.push({ c, txt }); continue; }
  /* Gate A part 2: a distinctive phrase from the doomed text must already appear on the Vesper
     row, so clearing cannot destroy the only copy. */
  const covered = VESPER.test(goodText) && goodText.includes(m[0].toLowerCase());
  if (!covered) { console.log(`  REFUSE ${c}: the Vesper row does not carry "${m[0]}" — clearing would destroy the only copy`); refuse++; continue; }
  patch[c] = null; gateA++;
  console.log(`  clear ${c}  [gate A]  (names "${m[0]}"; the Vesper row says it too)\n         "${txt.slice(0, 130)}…"`);
}
for (const { c, txt } of deferred) {
  if (gateA < 2) { console.log(`  REFUSE ${c}: names nothing Vesper-specific, and gate A fired only ${gateA}x — not enough to call the row's enrichment foreign`); refuse++; continue; }
  if (!GATE_B.includes(c)) { console.log(`  REFUSE ${c}: names nothing Vesper-specific and is not declared under gate B`); refuse++; continue; }
  const t = txt.match(ALPINE_TERRAIN);
  if (!t) { console.log(`  REFUSE ${c}: describes no alpine terrain, so nothing marks it as foreign here\n         "${txt.slice(0, 130)}…"`); refuse++; continue; }
  patch[c] = null;
  console.log(`  clear ${c}  [gate B]  (says "${t[0]}" on a Vantage basalt crag; ${gateA} fields already proven foreign)\n         "${txt.slice(0, 130)}…"`);
}

console.log(`\n  keeping season = ${JSON.stringify(bad.season)} — UNRESOLVED, and flagged rather than fixed.`);
console.log(`        It is the ONLY season recorded on any of the 110 routes in the Frenchman Coulee subtree, and`);
console.log(`        Jun-Sep is a poor fit for a desert crag that bakes in midsummer — but that last part is`);
console.log(`        knowledge about climbing, not something this row proves, and replacing it would invent a value.`);
console.log(`  keeping hazards — genuinely Frenchman Coulee: ${JSON.stringify(leaves(bad.hazards).join(" ").slice(0, 110))}…`);

if (refuse) { console.error(`\nREFUSING — ${refuse} field(s) failed a gate.`); process.exit(1); }
const keys = Object.keys(patch);
if (!keys.length) { console.log("\nnothing to do"); process.exit(0); }
if (!APPLY) { console.log(`\ndry run — would clear ${keys.length} field(s) on ${BAD}: ${keys.join(", ")}. Pass --apply to write.`); process.exit(0); }

await patchRow("routes", BAD, patch);

const back = (await (await fetch(`${SUPABASE_URL}/rest/v1/routes?select=${SEL}&id=eq.${BAD}`, { headers: headers(k) })).json())[0];
let bad2 = 0;
for (const c of keys) if (leaves(back[c]).join("").trim()) { console.error(`VERIFY FAILED: ${c} still populated`); bad2++; }
if (JSON.stringify(back.season) !== JSON.stringify(bad.season)) { console.error(`VERIFY FAILED: season changed`); bad2++; }
if (JSON.stringify(back.hazards) !== JSON.stringify(bad.hazards)) { console.error(`VERIFY FAILED: hazards changed`); bad2++; }
/* And the Vesper row must be untouched — this script never writes to it, so a difference here
   means something else did. */
const g2 = (await (await fetch(`${SUPABASE_URL}/rest/v1/routes?select=${SEL}&id=eq.${GOOD}`, { headers: headers(k) })).json())[0];
if (JSON.stringify(g2) !== JSON.stringify(good)) { console.error(`VERIFY FAILED: the Vesper row changed`); bad2++; }
if (bad2) process.exit(1);
console.log(`\nverified: ${keys.length} field(s) cleared on ${BAD}; season and hazards unchanged; ${GOOD} untouched.`);
