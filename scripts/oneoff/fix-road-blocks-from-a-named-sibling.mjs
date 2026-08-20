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
