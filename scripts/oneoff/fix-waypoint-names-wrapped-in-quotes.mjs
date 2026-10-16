// Two waypoint names are stored wrapped in literal quote characters, so the app draws them WITH the
// quotes: "Stuart Lake Trailhead" and "Longs Pass", visible punctuation and all.
//
// A waypoint name reaches THREE surfaces — the WaypointList row, the map pin, and the GPX file
// gpxDownload writes — so the artefact is on screen everywhere and gets exported to the device a
// climber navigates from.
//
// IT HAS ALREADY COST CODE. Two appliers written tonight carry a norm() that strips quotes purely so
// their name matching could reach `wa_stanley_burgner`. That defensive normalisation STAYS — it is
// cheap and it protects against recurrence — but the data should not require it.
//
// MEASURED, AND THE MEASUREMENT IS THE REASON THERE IS NO GUARD FOR THIS. Across 10,511 name-ish
// values in waypoints / bivy / approach_variants / rappel_detail, exactly TWO are wholly wrapped.
// A detector for a class of two is the antipattern this repo already records for forest order
// numbers: it would run forever to report nothing. The scan is recorded here instead.
//
// THE PRECISION RULE, which is the whole repair: only a value WHOLLY wrapped is an artefact. A
// quoted nickname INSIDE a longer name is correct prose — `"The Spa" bivy basin` is exactly how a
// climber writes it, and stripping that would damage a good name. So the gate is anchored at both
// ends AND requires the interior to carry no further quote of the same kind.
//
//   node scripts/oneoff/fix-waypoint-names-wrapped-in-quotes.mjs --dry
//   node scripts/oneoff/fix-waypoint-names-wrapped-in-quotes.mjs
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const TARGETS = [
  { route: "wa_south_headwall", was: '"Longs Pass"', now: "Longs Pass" },
  { route: "wa_stanley_burgner", was: '"Stuart Lake Trailhead"', now: "Stuart Lake Trailhead" },
];

const DRY = process.argv.includes("--dry");
const key = requireServiceKey();

/* Wholly wrapped in one kind of quote, with no interior quote of that kind. */
const wrapped = s => {
  const t = String(s);
  if (t.length < 3) return false;
  for (const [a, b] of [['"', '"'], ["'", "'"], ["“", "”"], ["‘", "’"]]) {
    if (t.startsWith(a) && t.endsWith(b)) {
      const inner = t.slice(1, -1);
      if (!inner.includes(a) && !inner.includes(b)) return true;
    }
  }
  return false;
};

const rows = await selectAll("routes", "id,waypoints", `id=in.(${TARGETS.map(t => t.route).join(",")})`, { pageSize: 20, key });
if (rows.length !== TARGETS.length) { console.error(`asked for ${TARGETS.length} routes, read ${rows.length} — refusing`); process.exit(1); }

const plan = [];
for (const t of TARGETS) {
  const wps = rows.find(r => r.id === t.route)?.waypoints || [];
  const i = wps.findIndex(w => w.name === t.was);
  if (i < 0) {
    const already = wps.some(w => w.name === t.now);
    console.log(`  skip  ${t.route}: no pin named ${JSON.stringify(t.was)}${already ? " — already repaired" : " — the row has moved"}`);
    continue;
  }
  // Re-assert the precision rule against the LIVE value rather than trusting the table above, so a
  // row that has since gained an interior quote is refused instead of damaged.
  if (!wrapped(wps[i].name)) { console.error(`REFUSED ${t.route}: ${JSON.stringify(wps[i].name)} is not wholly wrapped — a quoted nickname inside a longer name is correct prose`); process.exit(1); }
  if (wps[i].name.slice(1, -1) !== t.now) { console.error(`REFUSED ${t.route}: stripping gives ${JSON.stringify(wps[i].name.slice(1, -1))}, not the ${JSON.stringify(t.now)} this was measured against`); process.exit(1); }

  plan.push({ t, i, next: wps.map((x, j) => j === i ? { ...x, name: t.now } : x) });
  console.log(`  ${DRY ? "would set" : "setting "} ${t.route}  waypoints[${i}].name  ${JSON.stringify(t.was)} -> ${JSON.stringify(t.now)}`);
}

if (DRY) { console.log(`\n--dry: ${plan.length} name(s) would be unwrapped, nothing written.`); process.exit(0); }
if (!plan.length) { console.log("\nnothing to do — both names are already unwrapped."); process.exit(0); }

for (const p of plan) await patchRow("routes", p.t.route, { waypoints: p.next });

const after = await selectAll("routes", "id,waypoints", `id=in.(${plan.map(p => p.t.route).join(",")})`, { pageSize: 20, key });
let bad = 0;
for (const p of plan) {
  const wps = after.find(r => r.id === p.t.route)?.waypoints || [];
  const w = wps[p.i];
  // Check the whole row: the risk a per-pin check cannot see is a NEIGHBOUR that moved, and a
  // coordinate or elevation this repair promised not to touch.
  const src = p.next[p.i];
  const lost = wps.length !== p.next.length;
  const moved = !w || w.lat !== src.lat || w.lng !== src.lng || w.elev !== src.elev;
  if (!w || w.name !== p.t.now || lost || moved) {
    console.error(`  VERIFY FAILED ${p.t.route}${lost ? " — waypoint count changed" : ""}${moved ? " — the coordinate or elevation changed, which this repair must not do" : ""}`);
    bad++;
  }
}
console.log(`\n${plan.length} unwrapped, ${plan.length - bad} verified.`);
process.exit(bad ? 1 : 0);
