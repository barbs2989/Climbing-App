// Two rows describe a line that is not theirs. Both are settled BY THE ROWS THEMSELVES, so nothing
// here is researched and nothing is written — every edit is a deletion or an exact excision.
//
// These were carried for weeks as "needs research". They did not: the catalog already held the
// contradiction, and the same discipline the waypoint work used all night — ask what the row's OWN
// records say before going outside — settles both.
//
// ── 1. wa_huckleberry_mountain_west_route carries the EAST RIDGE's beta.
//
// The peak has two lines and the catalog has a row for each. This row is the WEST Route (Beckey's
// west-side gully, Class 4), and its own overview says so. But three of its fields describe the
// East Ridge outright:
//
//   climbing_route  labelled "East Ridge/East Face to the summit block"
//   descent_text    the notch, the 'choss bollard', the class 4 step — the East Ridge descent
//   rappels         "4 raps down the EAST FACE to the base"
//
// THE RAPPEL FIELD IS THE DANGEROUS ONE: a party on the West Route following it rappels down the
// wrong side of the mountain.
//
// wa_huckleberry_mountain_east_ridge is COMPLETE and CORRECT — it carries its own overview,
// approach, descent_text ("downclimb back to the notch and rappel off a large pile of rocks with
// tat on it. A second, lower rappel ... past the 4th-class step"), rappels ("2 raps"), beta,
// watch_out and hazards. So these are a stray DUPLICATE to clear, exactly as wa_true_grit was, and
// clearing destroys no record: the East Ridge row says all of it in its own words.
//
// Note the two rows even DISAGREE on the count — 4 raps here against 2 there — which is the tell
// that one of them is not about this climb.
//
// `approach` is DELIBERATELY LEFT and reported instead. Most of it is the walk-in to Huckleberry
// Flats, which both routes share; only its tail is east-specific. Excising an interior clause and
// leaving the rest true would need to know where the west gully is entered, and that IS research.
//
// ── 2. wa_trapper_mountain_south_slopes walks down the wrong drainage.
//
// Its approach sends a party from Harlequin Campground DOWNSTREAM to the Devore Creek trail and up
// the Devore Creek drainage to Trapper Lake. Three independent records in the same row refuse it:
//
//   its own overview  "Runoff from the peak's basin ... feeds Trapper Lake and tributaries of the
//                     STEHEKIN RIVER" — not Devore Creek
//   its own beta      "Parties leave the CASCADE PASS Trail system at Pelton Basin, cross ... over
//                     the ridge north of Trapper Mountain, drop several hundred feet to the Trapper
//                     Lake basin"
//   its own pins      the first leg MOVES AWAY from the summit (24.3 -> 28.1 km), and the Devore
//                     Creek junction is 27.6 km from Trapper Lake — off-trail, described as "a full
//                     day of travel each way". Pelton Basin to Trapper Lake is 4.1 km.
//
// This is a remote, committing, ferry-access peak with no cell coverage, by the row's own hazards.
// Being sent up the wrong valley there is not a cosmetic defect.
//
// WHAT IS NOT DECIDED HERE, and is left alone rather than guessed: whether the standard access is
// the Stehekin ferry or the Cascade Pass road. The row asserts both and cannot settle it, so the
// ferry framing and the Harlequin trailhead pin STAY, and only the Devore Creek claim goes. Fixing
// the wrong half of a disagreement you have not settled is how a correct record gets destroyed.
//
// Every prose edit is an exact find -> replace asserted to match EXACTLY ONCE in the live value, so
// nothing can be invented and a stale table cannot half-apply.
//
//   node scripts/oneoff/fix-prose-describing-a-different-route.mjs --dry
//   node scripts/oneoff/fix-prose-describing-a-different-route.mjs
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const DRY = process.argv.includes("--dry");
const key = requireServiceKey();

const HUCK = "wa_huckleberry_mountain_west_route";
const HUCK_EAST = "wa_huckleberry_mountain_east_ridge";
const TRAP = "wa_trapper_mountain_south_slopes";

const TRAP_CUT = ", then follow the Stehekin River Trail roughly 3 miles downstream to its junction with the Devore Creek trail. From there it's an off-trail push up the Devore Creek drainage — a fisherman's boot path in the lower section giving way to map-and-compass route-finding — into the Trapper Lake basin.";
const TRAP_HAZ_OLD = "Long off-trail approach with real route-finding/navigation risk (Devore Creek drainage)";
const TRAP_HAZ_NEW = "Long off-trail approach with real route-finding/navigation risk";
const TRAP_PIN = "Devore Creek Trail junction";

const rows = await selectAll("routes", "id,approach,climbing_route,descent_text,rappels,hazards,waypoints",
  `id=in.(${[HUCK, HUCK_EAST, TRAP].join(",")})`, { pageSize: 20, key });
if (rows.length !== 3) { console.error(`asked for 3 routes, read ${rows.length} — refusing`); process.exit(1); }
const R = id => rows.find(x => x.id === id);

const patches = [];

// ── HUCKLEBERRY. Gate: the East Ridge row must still carry the descent this clears, or clearing
// would destroy the only copy — the wa_true_grit rule.
{
  const w = R(HUCK), e = R(HUCK_EAST);
  const eastDesc = String(e.descent_text || ""), eastRaps = String(e.rappels || "");
  if (!/notch/i.test(eastDesc) || !/rappel/i.test(eastDesc)) { console.error(`REFUSED ${HUCK}: the East Ridge row no longer describes the notch rappel, so clearing this row would destroy the only copy`); process.exit(1); }
  if (!/rap/i.test(eastRaps)) { console.error(`REFUSED ${HUCK}: the East Ridge row no longer states a rappel count`); process.exit(1); }
  // Gate: this row's fields must still be the EAST ones this repair was measured against.
  const cr = JSON.stringify(w.climbing_route || "");
  if (!/east ridge/i.test(cr)) { console.log(`  skip  ${HUCK}: climbing_route no longer names the East Ridge — already repaired, or the row has moved`); }
  else if (!/east face/i.test(String(w.rappels || ""))) { console.error(`REFUSED ${HUCK}: rappels no longer names the east face; re-read the row before clearing anything`); process.exit(1); }
  else {
    patches.push({ id: HUCK, body: { climbing_route: null, descent_text: null, rappels: null },
      why: `clears three East Ridge fields (climbing_route "${JSON.parse(cr)[0]?.label || "?"}", descent_text, rappels "${w.rappels}") — all covered by ${HUCK_EAST}` });
  }
}

// ── TRAPPER. Exact excisions, each asserted to match exactly once.
{
  const t = R(TRAP);
  const ap = String(t.approach || "");
  const hz = Array.isArray(t.hazards) ? t.hazards : [];
  const wps = Array.isArray(t.waypoints) ? t.waypoints : [];
  const body = {};

  const n = ap.split(TRAP_CUT).length - 1;
  if (n === 0) console.log(`  skip  ${TRAP} approach: the Devore Creek routing is already gone`);
  else if (n > 1) { console.error(`REFUSED ${TRAP}: the excision matches ${n} times, not once — refusing rather than guessing which`); process.exit(1); }
  else {
    const next = ap.replace(TRAP_CUT, ".");
    if (/devore/i.test(next)) { console.error(`REFUSED ${TRAP}: "Devore" still present after the excision — the value is not the shape this was measured against`); process.exit(1); }
    body.approach = next;
  }

  const hi = hz.indexOf(TRAP_HAZ_OLD);
  if (hi < 0) console.log(`  skip  ${TRAP} hazards: the Devore Creek parenthetical is already gone`);
  else body.hazards = hz.map((x, i) => i === hi ? TRAP_HAZ_NEW : x);

  const pi = wps.findIndex(x => String(x.name || "").trim() === TRAP_PIN);
  if (pi < 0) console.log(`  skip  ${TRAP} waypoints: the Devore Creek pin is already gone`);
  else body.waypoints = wps.filter((_, i) => i !== pi);

  if (Object.keys(body).length) patches.push({ id: TRAP, body, why: `drops the Devore Creek routing from approach, its hazards parenthetical, and the pin 27.6 km from Trapper Lake` });
}

if (!patches.length) { console.log("\nnothing to do — both rows are already repaired."); process.exit(0); }
for (const p of patches) {
  console.log(`  ${DRY ? "would patch" : "patching  "} ${p.id}`);
  console.log(`      ${p.why}`);
  for (const [k, v] of Object.entries(p.body)) {
    const s = v == null ? "null" : (typeof v === "string" ? JSON.stringify(v.slice(0, 150)) : JSON.stringify(v).slice(0, 150));
    console.log(`      ${k} := ${s}${String(s).length >= 150 ? "..." : ""}`);
  }
}
if (DRY) { console.log(`\n--dry: ${patches.length} row(s) would be patched, nothing written.`); process.exit(0); }

for (const p of patches) await patchRow("routes", p.id, p.body);

const after = await selectAll("routes", "id,approach,climbing_route,descent_text,rappels,hazards,waypoints",
  `id=in.(${patches.map(p => p.id).join(",")})`, { pageSize: 20, key });
let bad = 0;
const w2 = after.find(x => x.id === HUCK), t2 = after.find(x => x.id === TRAP);
if (patches.some(p => p.id === HUCK)) {
  if (w2.climbing_route != null || w2.descent_text != null || w2.rappels != null) { console.error(`  VERIFY FAILED ${HUCK}: an East Ridge field survived`); bad++; }
  if (!w2.approach) { console.error(`  VERIFY FAILED ${HUCK}: approach was cleared and must not have been`); bad++; }
}
if (patches.some(p => p.id === TRAP)) {
  const blob = JSON.stringify([t2.approach, t2.hazards, t2.waypoints]);
  if (/devore/i.test(blob)) { console.error(`  VERIFY FAILED ${TRAP}: "Devore" still present`); bad++; }
  if (!t2.approach || !/Harlequin/.test(t2.approach)) { console.error(`  VERIFY FAILED ${TRAP}: the approach lost content it should have kept`); bad++; }
  if ((t2.waypoints || []).length !== 5) { console.error(`  VERIFY FAILED ${TRAP}: expected 5 waypoints, found ${(t2.waypoints || []).length}`); bad++; }
}
console.log(`\n${patches.length} row(s) patched, ${patches.length - (bad ? 1 : 0)} verified${bad ? ` — ${bad} problem(s)` : ""}.`);
process.exit(bad ? 1 : 0);
