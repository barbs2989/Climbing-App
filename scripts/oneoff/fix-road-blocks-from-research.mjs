// The two road-silent routes that no copy can reach: NO block anywhere in the catalog describes
// their drive, so these are written from outside sources rather than copied.
//
// THIS IS A DELIBERATELY SEPARATE SCRIPT FROM `fix-road-blocks-from-a-named-sibling`, and the split
// is the point. That one declares a DONOR ROUTE ID and copies its block verbatim, so a repair
// needing a fact the catalog does not already hold CANNOT BE EXPRESSED — no road name, status, gate
// or mileage is typed in it. Here road prose is typed, so that safety property is gone and a weaker
// one has to be stated honestly rather than blurred into the strong one by sharing a file.
//
// WHAT REPLACES IT:
//   - Each entry carries a `finding` recording what was actually established, so the write can be
//     re-checked later against something better than "someone once looked it up".
//   - It REFUSES if a same-area sibling already carries a block FOR A ROAD THIS ROUTE'S OWN PROSE
//     NAMES: that would mean this should have been a copy, and hand-writing over an available donor
//     is how two rows on one crag end up disagreeing about one road (`audit:trailhead-road`
//     section 1). The qualifier is load-bearing and the first draft omitted it — a bare "a sibling
//     has a block" test refused Little Annapurna, whose only sibling describes Icicle Creek and
//     Stuart Lake, THE OTHER SIDE OF THE RANGE. That is the very case no copy could serve, so the
//     guard would have blocked the repair on the strength of the defect it exists to avoid.
//     "A sibling carries a block" is not "a donor exists" — the assumption this whole sweep
//     disproved, re-made one script later.
//   - It REFUSES a block containing a four-digit year. A dated closure is TRUE WHEN WRITTEN AND A
//     LIE AFTERWARDS, and `road.status`/`seasonalGate` are permanent fields with no expiry — the
//     catalog already carries several ("closed Dec 12, 2025-June 14, 2026") and this must not add
//     more. Write the standing behaviour of the road, never this season's event.
//   - `audit:trailhead-road` is re-run afterwards to confirm neither write contradicts a neighbour.
//
// --apply to write. Dry by default.
import { selectAll, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");

const PLAN = [
  {
    target: "wa_upper_castle_toprope_wall",
    finding:
      "Castle Rock sits directly beside US-2 in Tumwater Canyon a few miles west of Leavenworth, with climbers parking in a large dirt pullout on the north side of the highway; a signed climbers' path leaves the west end of the lot for Logger's Ledge and the upper wall. US-2 is one of Washington's year-round Cascade crossings, but the Tumwater Canyon stretch is a SEPARATE closure point from Stevens Pass and is shut on short notice for avalanche control after storm cycles. Nothing in the catalog describes this road: zero blocks name Tumwater and all 125 US-2 blocks are the Stevens Pass / Skykomish / Baring stretch, 40-80 miles west.",
    road: {
      name: "US-2 through Tumwater Canyon, roadside pullout west of Leavenworth",
      status: "Paved state highway with roadside parking — no forest road driving. The climbers' lot is an oversized dirt pullout on the north side of the highway, with no facilities and no water at the crag.",
      driveNote: "From Leavenworth, head west on US-2 past the Icicle Creek Road junction and continue roughly two and a half miles into Tumwater Canyon. The pullout is on the right, and the climbers' trail starts at its west end and reaches the first routes in five to ten minutes of easy uphill walking.",
      seasonalGate: "No seasonal gate — US-2 is maintained through the winter. The canyon is its own avalanche-control closure point, though, separate from Stevens Pass, and is closed on short notice after heavy snowfall; the pullout and the approach path also hold snow and ice well after the highway is clear.",
    },
  },
  {
    target: "wa_little_annapurna_south_face",
    finding:
      "This route approaches Little Annapurna from Ingalls Creek, not from the Enchantments, and the row's own overview says so. Ingalls Creek Road leaves US-97 a few miles south of the US-2 junction and runs about a mile to a trailhead at roughly 1,900 ft — one of the lowest trailheads in the range. A recreation pass is required and a free wilderness permit is completed at the trailhead. The peak's only sibling block is the Icicle Creek Road / FR 7601 drive to Stuart Lake, which is the other side of the range and is why no copy was possible.",
    road: {
      name: "Ingalls Creek Road, off US-97 south of the US-2 junction",
      status: "A short access road off the highway to a small trailhead lot at about 1,900 ft. A recreation pass is required to park, and a free wilderness permit is filled out at the trailhead.",
      driveNote: "From the US-2/US-97 junction east of Leavenworth, follow US-97 south about seven miles, then turn west onto Ingalls Creek Road and continue roughly a mile to the trailhead. This is the Ingalls Creek side of the peak — a much longer walk in than the Enchantments approach, and a different drive entirely.",
      seasonalGate: "No seasonal gate is documented on the access road. The trailhead is low enough to be reachable well outside the summer months, but the Ingalls Creek trail itself holds snow far into spring and the climb is a summer objective.",
    },
  },
];

function leaves(v, out = []) {
  if (typeof v === "string") { if (v.trim()) out.push(v); return out; }
  if (Array.isArray(v)) { for (const x of v) leaves(x, out); return out; }
  if (v && typeof v === "object") { for (const x of Object.values(v)) leaves(x, out); return out; }
  return out;
}
const has = (v) => leaves(v).length > 0;

/* A coarse local copy of `audit:road-coverage`'s road-identifier test. Deliberately not imported:
   that file is a script that runs on import, and this is only a REFUSAL check — a sibling sharing a
   road identifier means "stop and copy instead", never a verdict about what to write. */
const GENERIC = new Set(["forest", "service", "road", "creek", "river", "county", "national", "park", "trailhead", "access", "main", "north", "south", "east", "west", "upper", "lower", "old", "new"]);
function roadIds(text) {
  const out = new Set();
  if (typeof text !== "string") return out;
  for (const m of text.matchAll(/\b(?:FSR|FS|FR|NF|USFS|SR|US|I|Highway|Hwy|State Route|Interstate)[\s-]?(\d{1,4})\b/gi)) out.add(`#${m[1]}`);
  for (const m of text.matchAll(/\b((?:[A-Z][a-zA-Z]+[\s-]){1,3})(?:Road|Rd|Highway|Hwy)\b/g)) {
    for (const w of m[1].trim().split(/[\s-]+/)) { const k = w.toLowerCase(); if (!GENERIC.has(k)) out.add(k); }
  }
  return out;
}

const ids = PLAN.map((p) => p.target);
const rows = await selectAll("routes", "id,name,area_id,road,approach_logistics,approach,beta,overview", `id=in.(${ids.join(",")})`, { pageSize: 50 });
const by = Object.fromEntries(rows.map((r) => [r.id, r]));
const missing = ids.filter((i) => !by[i]);
if (missing.length) { console.error(`FAIL — these ids returned no row: ${missing.join(", ")}`); process.exit(1); }

let ok = 0;
const writes = [];
for (const p of PLAN) {
  const t = by[p.target];
  const alreadyDone = has(t.road) && JSON.stringify(t.road) === JSON.stringify(p.road);
  if (alreadyDone) { console.log(`\n${p.target}\n   already applied — skipping`); ok++; continue; }

  const sibs = await selectAll("routes", "id,road", `area_id=eq.${t.area_id}`, { pageSize: 200 });
  const withBlock = sibs.filter((s) => s.id !== t.id && has(s.road));
  /* Only a sibling describing a road THIS route names is a donor. A sibling block for a different
     drive on the same peak is what makes a researched write necessary, not what forbids it. */
  const want = roadIds([t.approach, t.beta, t.overview].filter((x) => typeof x === "string").join("\n"));
  const donors = withBlock.filter((s) => { const have = roadIds(leaves(s.road).join(" ")); return [...want].some((x) => have.has(x)); });

  const problems = [];
  if (has(t.road)) problems.push("target ALREADY has a road block — refusing to overwrite hand-written prose");
  if (has(t.approach_logistics)) problems.push("target has approach_logistics — it is not road-silent, re-measure");
  if (donors.length) problems.push(`a same-area sibling carries a block for a road this route NAMES (${donors.map((d) => d.id).join(", ")}) — this should be a COPY, not hand-written prose`);
  if (withBlock.length && !donors.length) console.log(`   note: ${withBlock.length} sibling block(s) on this area describe a DIFFERENT road — that is why no copy was possible`);
  /* A four-digit year in a permanent field is a claim with an expiry date and no way to notice it
     has passed. Refuse it structurally rather than relying on whoever writes the next entry to
     remember. */
  const dated = leaves(p.road).filter((s) => /\b(19|20)\d{2}\b/.test(s));
  if (dated.length) problems.push(`the block names a YEAR, which makes it true today and wrong later: "${dated[0].slice(0, 90)}…"`);
  if (!p.finding || p.finding.length < 80) problems.push("entry carries no substantive `finding` — a researched write must record what was established");

  console.log(`\n${p.target}   area=${t.area_id}`);
  console.log(`   finding: ${p.finding}`);
  for (const [k, v] of Object.entries(p.road)) console.log(`   ${k}: ${v}`);
  if (problems.length) { for (const x of problems) console.log(`   REFUSED: ${x}`); continue; }
  ok++; writes.push({ id: p.target, road: p.road });
}

console.log(`\n${ok} of ${PLAN.length} pass every check.`);
if (!APPLY) { console.log(`Dry run — nothing written. Re-run with --apply.`); process.exit(ok === PLAN.length ? 0 : 1); }
if (ok !== PLAN.length) { console.error(`Refusing to apply a partial plan — fix the refusals first.`); process.exit(1); }

for (const w of writes) { await patchRow("routes", w.id, { road: w.road }); console.log(`wrote ${w.id}`); }

/* Re-read and reconcile: a 200 is not evidence the data changed. */
const after = await selectAll("routes", "id,road", `id=in.(${writes.map((w) => w.id).join(",")})`, { pageSize: 50 });
const ab = Object.fromEntries(after.map((r) => [r.id, r]));
let bad = 0;
for (const w of writes) {
  if (JSON.stringify((ab[w.id] || {}).road) !== JSON.stringify(w.road)) { console.error(`VERIFY FAILED ${w.id}`); bad++; }
  else console.log(`verified ${w.id}`);
}
if (!bad) console.log(`\nNow run: npm run audit:trailhead-road   — to confirm neither write contradicts a neighbour.`);
process.exit(bad ? 1 : 0);
