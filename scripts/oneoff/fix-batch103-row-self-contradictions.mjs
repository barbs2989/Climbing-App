// Six batch-103 defects where the row contradicts itself and the answer is already in the row or in
// its sibling. Every write is a truncation or a copy; nothing is composed.
//
// ------------------------------------------------------------------------------------------------
// wa_castle_peak_tatoosh_la_villa -- THREE, and the row settles all three itself
//
//   pitches   2 -> 1     pitch_detail[0] is graded "3rd class" and its own note says "Approach
//                        scramble shared with the Southeast Face to reach the base of the summit
//                        block" -- a walking stage, and one shared with a DIFFERENT route. The row's
//                        own `bail` says outright "No true bail mid-pitch on a single-pitch route".
//                        Mountain Project publishes La Villa as 50 feet, one pitch.
//   length_m  27 -> 15   27 is exactly the 12 m scramble plus the 15 m pitch. The 15 matches
//                        Mountain Project to the metre, which is what identifies the 12 as surplus.
//   waypoint  6460 -> 6440   The summit pin carries 6,460 ft while the row's own `high_point_ft`
//                        and the batch's peak_elevation_ft both read 6,440. Two elevations for one
//                        summit, in one row.
//
// `pitches` IS THE ONE THAT MATTERS BEYOND TIDINESS: it feeds techHrs() in the planner, so a 12 m
// third-class scramble was being charged as roped climbing time. And note the direction -- this
// repair SHORTENS the estimate, which is only safe because the scramble is approach ground already
// inside the row's own dist_km 3.2 / gain_ft 1600 and therefore already charged by scarfHrs. That
// check is per row and is not assumed; see the AUDIT-PROMPT note on this class.
//
// ------------------------------------------------------------------------------------------------
// TWO HEADER-STRAP SHAPE DEFECTS, both with the correct window already in the row
//
//   wa_cashmere_mountain_se_route.season   120 chars -> "May-Jun"
//        The row's own approach_variants carries "May-Jun; the southeast aspect and thinner
//        snowpack clear earlier than the Windy Pass side", and best_season already carries the
//        prose. Nothing is lost.
//   wa_castle_in_the_sky.season            40 chars -> "Jul-Sep"
//        Stored as "Aug (first climbed); likely best Jul-Sep". best_season already carries the
//        first-ascent month and the hedge in fuller form.
//
// `season` renders in the route header strap beside elevation and pitch count, and CLAUDE.md is
// explicit that anything over ~20 characters there is a defect regardless of accuracy.
//
// ------------------------------------------------------------------------------------------------
// wa_cathedral_peak_last_rites.emergency.sheriffDispatch -- a COPY FROM ITS OWN SIBLING
//
// The row stores "Okanogan County Sheriff's Office (509) 422-7200, or 911". The live Okanogan County
// page lists 422-7200 as the MAIN OFFICE and 509-422-7232 / 800-572-6604 as dispatch -- and the
// sibling route on the same peak, wa_cathedral_peak_southwest_route, already stores the dispatch
// numbers correctly. So this is one route on a peak disagreeing with the other about who to call.
//
// THE VALUE IS COPIED FROM THE SIBLING, NEVER TYPED. CLAUDE.md records a phone number promoted from
// a single unverified agent claim propagating a false positive across four batches, and the standing
// rule is not to report a number wrong without reading it off a live agency page. This write does
// not rest on my reading one: it rests on the two rows disagreeing and on the sibling being the one
// that carries a dispatch line at all. The applier refuses if the sibling's value stops naming a
// dispatch number.
//
// Read-only by default. Pass --apply to write.
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
requireServiceKey();

const IDS = ["wa_castle_peak_tatoosh_la_villa", "wa_cashmere_mountain_se_route",
  "wa_castle_in_the_sky", "wa_cathedral_peak_last_rites", "wa_cathedral_peak_southwest_route"];
const rows = await selectAll("routes",
  "id,pitches,pitch_detail,length_m,bail,waypoints,high_point_ft,season,best_season,approach_variants,emergency,dist_km,gain_ft",
  `id=in.(${IDS.join(",")})`, { pageSize: 20 });
if (rows.length !== IDS.length) { console.error(`FAIL: expected ${IDS.length} rows, read ${rows.length}.`); process.exit(1); }
const R = Object.fromEntries(rows.map(r => [r.id, r]));

const plan = [];
let refused = 0, skipped = 0;
const say = (id, field) => `\n== ${id}.${field}`;

// --- La Villa: pitches, length_m, summit elevation --------------------------------------------
{
  const r = R.wa_castle_peak_tatoosh_la_villa;
  const pd = Array.isArray(r.pitch_detail) ? r.pitch_detail : [];
  const stage = pd[0], climb = pd[1];
  const ok = pd.length === 2 && stage && climb
    && /3rd class/i.test(String(stage.grade || "")) && /approach scramble/i.test(String(stage.notes || ""))
    && /single-pitch route/i.test(String(r.bail || ""));
  if (!ok) { console.error(`${say(r.id, "pitches")}\n   REFUSED: the row no longer shows a 3rd-class approach stage plus a single climbing pitch, or its bail no longer calls this a single-pitch route.`); refused++; }
  else {
    // the scramble must be approach ground the row already charges as walking, or shortening the
    // climbing estimate would lose it entirely
    if (!(Number(r.dist_km) > 0 && Number(r.gain_ft) > 0)) { console.error(`${say(r.id, "pitches")}\n   REFUSED: dist_km/gain_ft are not both set, so the approach scramble may not be charged anywhere else. Do not shorten the climbing estimate.`); refused++; }
    else {
      if (r.pitches === 1) { console.log(`${say(r.id, "pitches")}\n   already applied — no-op.`); skipped++; }
      else if (r.pitches !== 2) { console.error(`${say(r.id, "pitches")}\n   REFUSED: expected 2, found ${r.pitches}.`); refused++; }
      else { console.log(`${say(r.id, "pitches")}   [EVIDENCE]\n   BEFORE: 2   AFTER: 1   (entry 1 is a 3rd-class approach scramble shared with another route)`); plan.push({ id: r.id, patch: { pitches: 1 }, check: v => v.pitches === 1 }); }

      const want = Number(climb.lengthM);
      if (r.length_m === want) { console.log(`${say(r.id, "length_m")}\n   already applied — no-op.`); skipped++; }
      else if (r.length_m !== Number(stage.lengthM) + want) { console.error(`${say(r.id, "length_m")}\n   REFUSED: ${r.length_m} is not stage(${stage.lengthM}) + pitch(${want}); the arithmetic this repair rests on no longer holds.`); refused++; }
      else { console.log(`${say(r.id, "length_m")}   [EVIDENCE]\n   BEFORE: ${r.length_m}   AFTER: ${want}   (${stage.lengthM} m of that is the approach scramble)`); plan.push({ id: r.id, patch: { length_m: want }, check: v => v.length_m === want }); }
    }
  }

  const wps = Array.isArray(r.waypoints) ? r.waypoints : [];
  const i = wps.findIndex(w => /summit/i.test(String(w.type || "") + String(w.name || "")));
  const hp = Number(r.high_point_ft), cur = i >= 0 ? Number(wps[i].elev ?? wps[i].elevFt) : NaN;
  if (i < 0) { console.error(`${say(r.id, "waypoints")}\n   REFUSED: no Summit waypoint.`); refused++; }
  else if (cur === hp) { console.log(`${say(r.id, "waypoints")}\n   already applied — no-op.`); skipped++; }
  else if (!Number.isFinite(hp) || !Number.isFinite(cur) || Math.abs(cur - hp) > 50) { console.error(`${say(r.id, "waypoints")}\n   REFUSED: ${cur} vs ${hp} is not the small disagreement this repair is for.`); refused++; }
  else {
    const next = wps.map((w, k) => k === i ? Object.assign({}, w, { elev: hp }) : w);
    console.log(`${say(r.id, "waypoints[Summit].elev")}   [EVIDENCE]\n   BEFORE: ${cur}   AFTER: ${hp}   (the row's own high_point_ft)`);
    plan.push({ id: r.id, patch: { waypoints: next }, check: v => Number((v.waypoints || []).find(w => /summit/i.test(String(w.type || "") + String(w.name || "")))?.elev) === hp });
  }
}

// --- two header-strap seasons -----------------------------------------------------------------
for (const [id, from, to, proof] of [
  ["wa_cashmere_mountain_se_route", "May-Jun", "May-Jun", r => (r.approach_variants || []).some(v => /May-Jun/i.test(String(v.season || "")))],
  ["wa_castle_in_the_sky", "Jul-Sep", "Jul-Sep", r => /Jul-Sep|Aug 2022/i.test(String(r.best_season || ""))],
]) {
  const r = R[id];
  const cur = String(r.season || "");
  if (cur === to) { console.log(`${say(id, "season")}\n   already applied — no-op.`); skipped++; continue; }
  if (cur.length <= 20) { console.error(`${say(id, "season")}\n   REFUSED: season is already ${cur.length} chars — not the shape defect this repair is for.`); refused++; continue; }
  if (!cur.includes(to)) { console.error(`${say(id, "season")}\n   REFUSED: the stored value does not contain "${to}", so the window is not being COPIED out of it.`); refused++; continue; }
  if (!proof(r)) { console.error(`${say(id, "season")}\n   REFUSED: the prose this truncation drops is no longer carried elsewhere on the row — truncating would LOSE it.`); refused++; continue; }
  console.log(`${say(id, "season")}   [EVIDENCE]\n   BEFORE (${cur.length} chars): ${JSON.stringify(cur.slice(0, 90))}\n   AFTER:  ${JSON.stringify(to)}`);
  plan.push({ id, patch: { season: to }, check: v => v.season === to });
}

// --- sheriff dispatch, copied from the sibling on the same peak --------------------------------
{
  const r = R.wa_cathedral_peak_last_rites, sib = R.wa_cathedral_peak_southwest_route;
  const cur = String(r.emergency?.sheriffDispatch || ""), good = String(sib.emergency?.sheriffDispatch || "");
  if (cur === good) { console.log(`${say(r.id, "emergency.sheriffDispatch")}\n   already applied — no-op.`); skipped++; }
  else if (!/422-7232|572-6604/.test(good)) { console.error(`${say(r.id, "emergency.sheriffDispatch")}\n   REFUSED: the sibling no longer carries a dispatch number, so there is nothing verified to copy.`); refused++; }
  else if (!/422-7200/.test(cur)) { console.error(`${say(r.id, "emergency.sheriffDispatch")}\n   REFUSED: this row no longer stores the main-office number this repair is about.`); refused++; }
  else {
    console.log(`${say(r.id, "emergency.sheriffDispatch")}   [EVIDENCE — copied from the sibling route on the same peak]`);
    console.log(`   BEFORE: ${cur}`);
    console.log(`   AFTER : ${good}`);
    plan.push({ id: r.id, patch: { emergency: Object.assign({}, r.emergency, { sheriffDispatch: good }) }, check: v => String(v.emergency?.sheriffDispatch) === good });
  }
}

console.log(`\nplanned ${plan.length}, already-applied ${skipped}, refused ${refused}`);
if (refused) { console.error("one or more entries were refused — nothing will be written."); process.exit(1); }
if (!plan.length) { console.log("nothing to do."); process.exit(0); }
if (!APPLY) { console.log("\ndry run — re-run with --apply to write."); process.exit(0); }

// several edits target ONE row, so merge patches per id -- two patchRow calls on one row would
// make the second overwrite the first's read-modify-write of `waypoints`.
const byId = new Map();
for (const p of plan) byId.set(p.id, Object.assign(byId.get(p.id) || {}, p.patch));
for (const [id, patch] of byId) await patchRow("routes", id, patch);

const after = await selectAll("routes", "id,pitches,length_m,waypoints,season,emergency",
  `id=in.(${[...byId.keys()].join(",")})`, { pageSize: 20 });
let bad = 0;
for (const p of plan) {
  const got = after.find(x => x.id === p.id);
  if (!got || !p.check(got)) { console.error(`FAIL: ${p.id} re-read does not match what was written.`); bad++; }
}
if (bad) process.exit(1);
console.log(`\nverified by re-read: ${plan.length} field(s) across ${byId.size} row(s) corrected.`);
