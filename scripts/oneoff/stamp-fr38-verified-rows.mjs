// FR 38 was checked once; stamp every row that verification actually covers.
//
// Earlier today the Middle Fork Nooksack road was read against the Mt. Baker-Snoqualmie alert
// posted 27 July 2026: "Middle Fork Nooksack Road (FSR) 38 is closed at Mile Post 7 due to a
// washout. Access to Elbow Lake 697 (Pioneer Camp) and Ridley Creek Trail 696 is blocked."
//
// Four rows were REPAIRED off that reading (three Little Sister rows saying "Open as of mid-2026",
// and wa_cinderella_peak_scramble calling it a good road) and were stamped with it. Four others
// were deliberately left alone as already correct — they say FR 38 is washed out with no announced
// repair timeline, lacking only the milepost, which is an improvement rather than a correction.
//
// THOSE FOUR WERE NEVER STAMPED, AND THAT IS AN INCONSISTENCY IN MY OWN BOOKKEEPING. The column
// records that somebody read this route's road claims against a published source. That happened for
// every FR 38 row in the same reading; only the ones needing an edit got the date. So a correct row
// and an unchecked row are still indistinguishable here, which is precisely what 0172 exists to end.
//
// "Correct, no edit" and "checked" are different facts, and only the second is what the column
// records. A row can be right and unverified, or verified and unchanged — this stamps the latter.
//
// Each row is re-asserted at apply time: it must still describe FR 38 as damaged or closed, or the
// reading no longer covers what the row says.
import { requireServiceKey, selectAll, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const CHECKED = "2026-08-27T12:00:00Z";

// Routes whose road prose describes FR 38 / the Elbow Lake trailhead. Enumerated rather than
// pattern-matched at write time: a stamp is a claim about what was read, and the read was of these.
const IDS = ["wa_south_twin_sister_west_ridge", "wa_south_twin_sister_north_ridge",
             "wa_skookum_peak_twinsisters_scramble", "wa_little_sister_scramble"];

const NAMES_FR38 = /FSR? ?38\b|FR[- ]?38\b|middle fork nooksack|elbow lake/i;
const SAYS_SHUT = /washout|washed out|damaged|closed|gated/i;

if (APPLY) requireServiceKey();

const rows = await selectAll("routes", "id,road,access,access_checked_at", `id=in.(${IDS.join(",")})`);
if (rows.length !== IDS.length) {
  const got = new Set(rows.map(r => r.id));
  console.error(`read ${rows.length} of ${IDS.length}; missing: ${IDS.filter(i => !got.has(i)).join(", ")}`);
  process.exit(1);
}

const textOf = r => {
  const rd = r.road && typeof r.road === "object" ? r.road : {};
  const ac = r.access && typeof r.access === "object" ? r.access : {};
  return [rd.name, rd.status, rd.seasonalGate, rd.driveNote, ac.closures, ac.seasonal]
    .filter(v => typeof v === "string").join(" ");
};

let ok = true, toStamp = [], already = 0;
for (const r of rows) {
  const t = textOf(r);
  if (!NAMES_FR38.test(t)) { console.log(`REFUSE  ${r.id} — no longer describes FR 38; the reading does not cover it`); ok = false; continue; }
  if (!SAYS_SHUT.test(t)) { console.log(`REFUSE  ${r.id} — no longer records the road as damaged or closed`); ok = false; continue; }
  if (r.access_checked_at) { console.log(`already ${r.id} — ${r.access_checked_at}`); already++; continue; }
  console.log(`stamp   ${r.id}`);
  toStamp.push(r.id);
}

console.log(`\n${toStamp.length} to stamp, ${already} already dated, of ${IDS.length}.`);
if (!ok) { console.error("refusing while any row is refused"); process.exit(1); }
if (!toStamp.length) { console.log("nothing to do"); process.exit(0); }
if (!APPLY) { console.log("\ndry run — pass --apply to write"); process.exit(0); }

for (const id of toStamp) await patchRow("routes", id, { access_checked_at: CHECKED });

const after = await selectAll("routes", "id,access_checked_at", `id=in.(${toStamp.join(",")})`);
const bad = after.filter(r => !r.access_checked_at);
console.log(bad.length ? `\n${bad.length} did not land` : `\nverified: ${after.length} FR 38 route(s) now record the reading that already covered them.`);
process.exit(bad.length ? 1 : 0);
