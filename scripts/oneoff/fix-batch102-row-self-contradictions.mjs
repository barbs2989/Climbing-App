// Two batch-102 defects where the row contradicts itself and the correct value is already in the
// row. Both are a deletion or a copy; nothing is composed.
//
// ------------------------------------------------------------------------------------------------
// 1. wa_big_snow_mountain_east_buttress -- remove the "loose rock" objective hazard
//
//   obj_haz[0]          "loose rock typical of Cascades granite buttresses"
//   overview            "...a rarely repeated, semi-obscure Cascades classic on notably sound rock."
//   beta                "generally solid granite"
//   approach_variants   "Solid granite close to a crest, with overhangs to work beneath, is the
//                        confirmation. Loose scrambling means you are on the ridge route instead."
//
// The row refutes it three times, and externally so do both published sources: the AAJ first-ascent
// report says "the rock was very sound" and Mountain Project calls this "the best granite in the
// Alpine Lakes region".
//
// IT IS NOT MERELY INCONSISTENT -- IT DESTROYS A NAVIGATION SIGNAL. On this route rock quality IS
// the route-identification test, in the row's own words above: loose scrambling means you are on
// the WRONG feature. A party told by the hazard list to expect loose rock has lost the one thing
// that tells them they are off route, which is why this is a safety repair and not a tidy-up.
//
// THE OTHER TWO obj_haz ENTRIES STAY. "remote location / long approach" and "weather exposure on an
// alpine face" are both true and neither is contradicted. Only the refuted entry is removed.
//
// ------------------------------------------------------------------------------------------------
// 2. wa_big_snagtooth_west_ridge -- summit waypoint elevation 8379 -> 8374
//
// The row stores `high_point_ft` 8374 and a Summit waypoint at 8379: two elevations for one summit,
// five feet apart, in one row. The batch's research adds a differential-GPS survey of
// 8,374.3 +/- 0.1 ft, so 8374 is both the row's own other answer and the surveyed one.
//
// A COPY, NOT A CHOICE: the value written is the row's own `high_point_ft`, re-read at apply time.
// The survey corroborates it and is not what supplies it.
//
// ------------------------------------------------------------------------------------------------
// NOT REPAIRED HERE, and recorded so the silence is not read as a pass. Big Snagtooth also stores
// `gain_ft` 4000 against a 4,059 ft rise between its own two pins (impossible, and the approach
// descends to Early Winters Creek first, so the true figure is higher still); `loss_ft` 4500
// against that gain on a row declaring `outing_shape: "outback"`; and an `access.permit` of "Free
// Self-Issue Wilderness Permit" against its own `access.rules` saying "No climbing or wilderness
// permit required for day climbing". Each needs a value WRITTEN rather than copied -- the gain is
// unknown beyond its floor, and the permit needs a phrasing decision -- so they are findings in the
// ledger, not writes here.
//
// Read-only by default. Pass --apply to write.
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
requireServiceKey();

const REFUTED = "loose rock typical of Cascades granite buttresses";

const rows = await selectAll("routes",
  "id,obj_haz,overview,beta,approach_variants,high_point_ft,waypoints",
  "id=in.(wa_big_snow_mountain_east_buttress,wa_big_snagtooth_west_ridge)", { pageSize: 20 });
if (rows.length !== 2) { console.error(`FAIL: expected 2 rows, read ${rows.length}.`); process.exit(1); }
const R = Object.fromEntries(rows.map(r => [r.id, r]));

const plan = [];
let refused = 0, skipped = 0;

// --- 1. the refuted hazard ------------------------------------------------------------------
{
  const r = R.wa_big_snow_mountain_east_buttress;
  const haz = Array.isArray(r.obj_haz) ? r.obj_haz : null;
  if (!haz) { console.error("REFUSED: obj_haz is not an array."); refused++; }
  else if (!haz.includes(REFUTED)) { console.log("\n== big_snow.obj_haz\n   already applied — no-op."); skipped++; }
  else {
    const ov = String(r.overview || ""), bt = String(r.beta || "");
    const av = JSON.stringify(r.approach_variants || []);
    const fail = !/sound rock/i.test(ov) ? "overview no longer says the rock is sound"
      : !/solid granite/i.test(bt) ? "beta no longer says solid granite"
      : !/loose scrambling means you are on the ridge route/i.test(av) ? "approach_variants no longer uses rock quality as the route-identification test — that is what makes this a safety repair rather than a tidy-up"
      : null;
    if (fail) { console.error(`\n== big_snow.obj_haz\n   REFUSED: ${fail}.`); refused++; }
    else {
      const next = haz.filter(x => x !== REFUTED);
      if (next.length !== haz.length - 1) { console.error("\n== big_snow.obj_haz\n   REFUSED: expected to remove exactly one entry."); refused++; }
      else {
        console.log("\n== wa_big_snow_mountain_east_buttress.obj_haz   [gate: EVIDENCE]");
        console.log(`   REMOVING: "${REFUTED}"`);
        console.log(`   KEEPING : ${JSON.stringify(next)}`);
        plan.push({ id: r.id, patch: { obj_haz: next }, check: v => Array.isArray(v.obj_haz) && !v.obj_haz.includes(REFUTED) && v.obj_haz.length === next.length });
      }
    }
  }
}

// --- 2. the second summit elevation ---------------------------------------------------------
{
  const r = R.wa_big_snagtooth_west_ridge;
  const hp = Number(r.high_point_ft);
  const wps = Array.isArray(r.waypoints) ? r.waypoints : [];
  const idx = wps.findIndex(w => /summit/i.test(String(w.type || "") + String(w.name || "")));
  const cur = idx >= 0 ? Number(wps[idx].elev ?? wps[idx].elevFt ?? wps[idx].elev_ft) : NaN;
  if (idx < 0) { console.error("\n== big_snagtooth.waypoints\n   REFUSED: no Summit waypoint."); refused++; }
  else if (cur === hp) { console.log("\n== big_snagtooth.waypoints\n   already applied — no-op."); skipped++; }
  else if (!Number.isFinite(hp) || !Number.isFinite(cur)) { console.error("\n== big_snagtooth.waypoints\n   REFUSED: one of the two elevations is not a number."); refused++; }
  else if (Math.abs(cur - hp) > 50) { console.error(`\n== big_snagtooth.waypoints\n   REFUSED: the two differ by ${Math.abs(cur - hp)} ft, far more than the 5 ft this repair is about. Re-read the row.`); refused++; }
  else {
    const next = wps.map((w, i) => i === idx ? Object.assign({}, w, { elev: hp }) : w);
    console.log("\n== wa_big_snagtooth_west_ridge.waypoints[Summit].elev   [gate: EVIDENCE]");
    console.log(`   BEFORE: ${cur} ft     (high_point_ft on the same row: ${hp} ft)`);
    console.log(`   AFTER : ${hp} ft`);
    plan.push({ id: r.id, patch: { waypoints: next }, check: v => {
      const w = (v.waypoints || []).find(x => /summit/i.test(String(x.type || "") + String(x.name || "")));
      return w && Number(w.elev) === hp;
    } });
  }
}

console.log(`\nplanned ${plan.length}, already-applied ${skipped}, refused ${refused}`);
if (refused) { console.error("one or more entries were refused — nothing will be written."); process.exit(1); }
if (!plan.length) { console.log("nothing to do."); process.exit(0); }
if (!APPLY) { console.log("\ndry run — re-run with --apply to write."); process.exit(0); }

for (const p of plan) await patchRow("routes", p.id, p.patch);

// verify by RE-READ, never by the write's own status
const after = await selectAll("routes", "id,obj_haz,waypoints", `id=in.(${plan.map(p => p.id).join(",")})`, { pageSize: 20 });
let bad = 0;
for (const p of plan) {
  const got = after.find(x => x.id === p.id);
  if (!got || !p.check(got)) { console.error(`FAIL: ${p.id} re-read does not match what was written.`); bad++; }
}
if (bad) process.exit(1);
console.log(`\nverified by re-read: ${plan.length} row(s) corrected.`);
