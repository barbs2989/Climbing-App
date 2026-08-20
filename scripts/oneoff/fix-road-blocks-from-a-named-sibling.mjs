// Fill the road block on three routes by COPYING A NAMED SIBLING'S — never by writing road prose.
//
// THE STRUCTURE IS THE SAFETY PROPERTY, and it is lifted from `fix-trailhead-disagreements-batch4`:
// this script declares a DONOR ROUTE ID and copies that row's `road` object verbatim. No road
// name, status, gate or mileage is typed anywhere in this file, so a repair that would need a
// fact the catalog does not already hold CANNOT BE EXPRESSED. That is what made unreviewed
// triage safe there and it is what makes this safe here.
//
// WHY THESE THREE, AND WHY ONLY THESE THREE. "1,371 WA routes have no road block" counts routes
// whose only access apparatus is a shared area-level `access` blob (18 distinct blobs across all
// 1,371; 55% bouldering; 1.1% carry any approach prose). A road block describes THE DRIVE TO A
// WALK, and those routes describe no walk. Of the 1,065 routes that DO describe a walk, 19 carry
// no road block, and 3 of those pass a two-source gate:
//   (A) the route's OWN prose names the trailhead or road, and
//   (B) a sibling on the same area carries a researched block for that same road.
// (A) is evidence about THIS route; (B) supplies the block. Neither alone is enough — (A) gives a
// road name and no status, (B) alone is a bare copy.
//
// (A) IS NOT CEREMONY, AND LUNDIN PROVES IT. CLAUDE.md names Lundin Peak as the clean example of a
// peak with TWO genuine trailheads, and its siblings offer both: "I-90 to Snoqualmie Pass, Exit 52"
// (PCT-North / Commonwealth Basin) and "Alpental Road". A bare sibling copy would have been a coin
// flip. The route's own approach says "from the Snoqualmie Pass PCT-North trailhead (I-90 Exit 52)",
// which picks the donor with no judgement required.
//
// ONLY `road` IS WRITTEN — NOT `approach_logistics`. The logistics blob carries trailheadLat/Lng,
// and CLAUDE.md's do-not-create-a-trailhead-pin-from-the-logistics-copy is explicit that
// manufacturing a second coordinate record from a copy produces two records that agree by
// construction, which is one claim counted twice. The road is a shared fact; the pin is not.
//
// --apply to write. Dry by default.
import { selectAll, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");

/* `evidence` is a verbatim substring of the TARGET's own prose that names the trailhead or road.
   It is re-asserted against the live row before any write, so the gate is enforced at apply time
   and not merely at the time somebody read the data. A target whose prose has since changed is
   refused rather than written. */
const PLAN = [
  {
    target: "wa_colchuck_balanced_rock_col_east_lake_side_approch",
    donor: "wa_the_tipping_point",
    evidence: "Stuart Lake Trailhead (FS Road 7601 off Icicle Creek Road)",
    why: "the route's own approach names the Stuart Lake Trailhead off FR 7601; all 10 donor blocks on this area describe that same drive.",
  },
  {
    target: "wa_northwest_face",
    donor: "wa_south_face",
    evidence: "Same approach as the South Face",
    why: "the route's own approach says it shares the South Face's approach and names the SR-20 pullout; the donor IS that South Face route.",
  },
  {
    target: "wa_south_face_2001_variation",
    donor: "wa_lundin_peak_south_face_left",
    evidence: "Snoqualmie Pass PCT-North trailhead (I-90 Exit 52",
    why: "Lundin has two genuine trailheads and this route's own prose names the PCT-North one; the donor's block is for exactly that trailhead.",
  },
  /* Added after widening the gate from a road NAME to a TRAILHEAD name: a route can describe its
     whole approach without ever naming the tarmac, and on a two-trailhead peak the trailhead is
     the sharper evidence anyway. Only one route in the catalog converted, and it converted on the
     strongest form of the evidence — its prose names the DONOR ROUTES, not merely the trailhead. */
  {
    target: "wa_the_balanced_rock",
    donor: "wa_let_it_burn",
    evidence: "Let It Burn, both approached via the Stuart Lake Trailhead",
    why: "a V2 problem on the summit block, reached only by climbing the peak (dist_km 16.74, gain_ft 4850); its own approach names Let It Burn as one of the two routes used to get there, and the donor IS that route.",
  },
  /* Added only after `fix-south-face-direct-area` moved this row off wa_art_building — a University
     of Washington campus crag holding four boulder problems — onto Vasiliki Tower, where its own
     prose has always put it. It could not be reached before because the same-area donor rule was
     looking for a Washington Pass road block among UW campus boulders. THE MISSING BLOCK WAS THE
     SYMPTOM AND THE AREA WAS THE DEFECT; do not re-order these two scripts. */
  {
    target: "wa_south_face_direct",
    donor: "wa_south_face",
    evidence: "SR-20 mile marker 166 to Burgundy Col",
    why: "a 1994 variation of Vasiliki Tower's South Face whose own approach names that route's approach and the SR-20 mile-marker-166 pullout; the donor IS that South Face route, now a genuine area-sibling.",
  },

  /* ── Batch 2 ────────────────────────────────────────────────────────────────────────────────
     These five were sitting in the RESEARCH bucket and should never have been. `audit:road-coverage`
     matched donors on ROAD identifiers, while a route's approach prose overwhelmingly names a
     TRAILHEAD — "the PCT trailhead at Exit 52", "the trail toward Libby Lake", "the Lightning Creek
     trailhead". The gate above had already been widened from a road name to a trailhead name for
     `wa_the_balanced_rock`; that widening was simply never carried into the audit. So this is not
     new evidence, it is the SAME rule applied consistently.
     The two-source gate is unchanged: (A) the target's own prose names the start, (B) a same-area
     sibling carries a researched block for it. */
  {
    target: "wa_east_ridge_7",
    donor: "wa_red_mountain_snoqualmie_standard",
    evidence: "From the PCT trailhead at Exit 52 (Snoqualmie Pass)",
    why: "its own approach names the PCT trailhead at I-90 Exit 52, and the donor's block IS that trailhead's drive.",
  },
  {
    target: "wa_south_face_7",
    donor: "wa_red_mountain_snoqualmie_standard",
    evidence: "From the PCT trailhead at Exit 52",
    why: "same peak, same start named in its own approach; the donor is Red Mountain's standard route from that trailhead.",
  },
  {
    target: "wa_hoodoo_peak_sawtooth_raven_ridge_traverse",
    donor: "wa_hoodoo_peak_sawtooth_scramble",
    evidence: "Hike the trail toward Libby Lake",
    why: "its own approach starts on the Libby Lake trail, and the donor's block is the FR 43/4340 drive to the Libby Lake Trailhead.",
  },
  /* HOZOMEEN HAS FOUR SIBLING BLOCKS DESCRIBING TWO DIFFERENT DRIVES, so "a sibling block exists"
     decides nothing here — the two targets start from opposite ends of the massif and each takes
     the block for ITS OWN start. Verified in `probe-hozomeen-donor-blocks-in-full.mjs` rather than
     from the truncated listing, because the deciding text sits past a 240-char cut. */
  {
    target: "wa_hozomeen_mountain_south_peak_southwest_route",
    donor: "wa_hozomeen_mountain_northeast_buttress",
    evidence: "From the Hozomeen Lake/Willow Lake trailhead at Hozomeen Campground",
    why: "it starts AT Hozomeen Campground, and the donor's block is the Silver-Skagit Road drive from Hope BC that ends there — the only donor naming both the campground and the Hozomeen Lake trailhead.",
  },
  {
    target: "wa_hozomeen_mountain_south_peak_southeast_buttress",
    donor: "wa_hozomeen_mountain_southeast_face",
    evidence: "From the Lightning Creek trailhead on Ross Lake",
    why: "it starts at Lightning Creek on Ross Lake, and the donor is the only block describing that end — SR-20 to Ross Lake Resort plus the water taxi, naming the Hozomeen/Lightning Creek area outright.",
  },

  /* ── DELIBERATELY REFUSED, and recorded here so the next pass does not re-derive them ─────────
     Each of these WOULD pass a mechanical place-name match and must not be copied:

     wa_north_star_mountain_cloudy_peak_traverse — its own approach names TWO ways in (the
       "currently-closed Lucerne/Holden Village/Railroad Creek trail from the east, or ... the open
       Phelps Creek/Spider Gap trail from the west"). The only sibling block is the Holden one,
       i.e. the CLOSED half. Copying it would answer "how do I get there?" with an indefinite
       closure while the row itself says an open alternative exists — worse than saying nothing.

     wa_mount_spickard_silver_glacier — two camps, two drives: a Ross Lake Resort water taxi to
       Silver Creek, or the Depot Creek road from Chilliwack BC. The sibling covers only Depot
       Creek. The row names it explicitly, but a block covering one of two real drives is the
       two-trailhead trap (Lundin, Remmel, Carru, Howard) whatever the row cross-references.

     wa_don_t_climb_that_she_said — its overview puts the boulder in the White Chuck Glacier basin
       on Glacier Peak's SOUTH-side approach (North Fork Sauk / FR 49), while a place-name match on
       "White Chuck" lands on the FR 23 White Chuck Road block, a different valley that is closed.
       A true statement about the wrong leg of the wrong drive.

     wa_mount_despair_northeast_buttress — the row says in as many words that it is "the opposite
       (northeast) side of the peak from the standard Triumph Pass/Despair Lakes approach", which
       is exactly what the sibling's Thornton Lakes block describes.

     wa_little_annapurna_south_face — Ingalls Creek vs the sibling's Icicle Creek/Stuart Lake, the
       other side of the range; the row's own overview says so.

     wa_cashmere_mountain_northeast_ridge, wa_east_mcmillan_spire_northeast_buttress,
     wa_mount_washington_olympic_winter_direct — their own prose names no trailhead a sibling
       describes ("the mountain's north side", "the McMillan Creek glaciers", "Jefferson Pass").
       Genuine research. */
];

function leaves(v, out = []) {
  if (typeof v === "string") { if (v.trim()) out.push(v); return out; }
  if (Array.isArray(v)) { for (const x of v) leaves(x, out); return out; }
  if (v && typeof v === "object") { for (const x of Object.values(v)) leaves(x, out); return out; }
  return out;
}
const has = (v) => leaves(v).length > 0;

const ids = [...new Set(PLAN.flatMap((p) => [p.target, p.donor]))];
const rows = await selectAll("routes", "id,name,area_id,road,approach,beta,overview,approach_logistics", `id=in.(${ids.join(",")})`, { pageSize: 100 });
const by = Object.fromEntries(rows.map((r) => [r.id, r]));

/* Fail closed on a missing row. A name-shaped route id is not an identity in this catalog — the
   five fixes reported applied on 2026-07-28 that matched nothing are the reason this is fatal
   rather than a skip. */
const missing = ids.filter((i) => !by[i]);
if (missing.length) { console.error(`FAIL — these ids returned no row: ${missing.join(", ")}`); process.exit(1); }

let ok = 0;
const writes = [];
for (const p of PLAN) {
  const t = by[p.target], d = by[p.donor];
  const prose = [t.approach, t.beta, t.overview].filter((x) => typeof x === "string").join("\n");
  /* Idempotent: a target already holding EXACTLY this donor's block is a completed entry, not a
     refusal. Anything else in `road` is somebody's work and is never overwritten. */
  const alreadyDone = has(t.road) && JSON.stringify(t.road) === JSON.stringify(d.road);
  if (alreadyDone) { console.log(`\n${p.target}\n   already applied from ${p.donor} — skipping`); ok++; continue; }
  const problems = [];
  if (has(t.road)) problems.push("target ALREADY has a road block that is NOT this donor's — refusing to overwrite");
  if (has(t.approach_logistics)) problems.push("target has approach_logistics — it is not road-silent, re-measure");
  if (!has(d.road)) problems.push(`donor ${p.donor} has no road block to copy`);
  if (!prose.includes(p.evidence)) problems.push(`target prose no longer contains the evidence quote "${p.evidence}"`);
  if (t.area_id !== d.area_id) problems.push(`donor is on a different area (${d.area_id} vs ${t.area_id})`);

  console.log(`\n${p.target}`);
  console.log(`   donor    ${p.donor}   area=${t.area_id}`);
  console.log(`   evidence "${p.evidence}"`);
  console.log(`   why      ${p.why}`);
  if (problems.length) { for (const x of problems) console.log(`   REFUSED: ${x}`); continue; }
  for (const [k, v] of Object.entries(d.road)) if (typeof v === "string" && v.trim()) console.log(`   copy ${k}: ${v.slice(0, 150)}`);
  ok++; writes.push({ id: p.target, road: d.road, donor: p.donor });
}

console.log(`\n${ok} of ${PLAN.length} pass every check.`);
if (!APPLY) { console.log(`Dry run — nothing written. Re-run with --apply.`); process.exit(ok === PLAN.length ? 0 : 1); }
if (ok !== PLAN.length) { console.error(`Refusing to apply a partial plan — fix the refusals first.`); process.exit(1); }

for (const w of writes) { await patchRow("routes", w.id, { road: w.road }); console.log(`wrote ${w.id}`); }

/* Re-read and reconcile. A 200 is not evidence the data changed — the split-credentials trap
   returns 200 with an empty array when RLS rejects every row, and patchRow's single-row assertion
   is necessary but not sufficient: it proves a row was touched, not that it now holds the value. */
const after = await selectAll("routes", "id,road", `id=in.(${writes.map((w) => w.id).join(",")})`, { pageSize: 100 });
const ab = Object.fromEntries(after.map((r) => [r.id, r]));
let bad = 0;
for (const w of writes) {
  const got = JSON.stringify((ab[w.id] || {}).road);
  const want = JSON.stringify(w.road);
  if (got !== want) { console.error(`VERIFY FAILED ${w.id}: stored value does not match the donor's block`); bad++; }
  else console.log(`verified ${w.id} — matches ${w.donor}`);
}
process.exit(bad ? 1 : 0);
