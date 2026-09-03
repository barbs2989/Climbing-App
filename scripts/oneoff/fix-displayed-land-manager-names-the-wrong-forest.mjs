// The ACCESS panel shows the wrong national forest on three routes, and the right answer is in the
// next key of the same object.
//
// `access` carries TWO spellings of one fact, which CLAUDE.md and lib/objKeys.js both record:
// `land_manager` on ~1,400 WA rows and `landManager` on ~330. Both the route page and the area
// browser read `access.land_manager || access.landManager`, so where a row has BOTH, the snake_case
// one WINS and the camelCase one is shadowed. On these rows the winner names a different managing
// agency from the loser, and the loser is the correct one.
//
// MEASURED, AND THE FIRST THREE INSTRUMENTS WERE WRONG. 652 WA rows carry both keys.
//   * a STRING compare reports 538 disagreements -- almost all one fact at two verbosities
//     ("Gifford Pinchot National Forest (Mt. Adams Ranger District)" against "USDA Forest Service,
//     Gifford Pinchot National Forest"). A detector that flags 538 correct rows is one people learn
//     to ignore.
//   * comparing the extracted managing UNIT reports 191 -- still dominated by two non-defects. A
//     SUPERSET is not a contradiction ("MBS (Darrington)" against "jointly administered by MBS and
//     Okanogan-Wenatchee"), and a NEGATION is not a claim ("Okanogan-Wenatchee (outside North
//     Cascades National Park boundary)" names NOCA only to say the route is NOT in it).
//   * requiring the two unit sets to be DISJOINT reports 5, of which one was an abbreviation gap:
//     "North Cascades NP" written short did not match a regex spelling the words out, so a superset
//     read as disjoint.
// The honest number is FOUR.
//
// EVERY REPAIR IS ADJUDICATED BY THE ROW ITSELF, never by the vote of two fields:
//   wa_bears_breast_mountain_se_mega_slab   emergency.county "Kittitas County", rangerStation
//        "Cle Elum Ranger District", road.name "WA-903 / Salmon La Sac Road" -- three records
//        written by other passes, all agreeing with the shadowed Okanogan-Wenatchee / Cle Elum
//        value and none with the displayed Mt. Baker-Snoqualmie / Snoqualmie one.
//   wa_mount_teneriffe_kamikaze_trail       emergency.rangerStation says outright "Managed by WA
//   wa_mount_teneriffe_standard_route       DNR South Puget Sound Region (Natural Areas Program),
//        NOT USFS", and road.name is "SE Mount Si Road". The row states the answer in words.
//
// THE REPAIR IS A COPY OF A VALUE THE ROW ALREADY HOLDS -- the shadowed `landManager` is written
// into `land_manager`, so the canonical key (the one ACCESS_KEYS offers the contribute form) holds
// the correct value and both spellings agree. Nothing is composed and no agency name is typed.
//
// wa_agnes_mountain_west_route IS DELIBERATELY NOT REPAIRED, and it is the interesting one. Its
// adjudicators are just as strong -- emergency.county "Chelan County", ranger "Stehekin (North
// Cascades NP Complex)", area path `usa.washington.wa_centraleast.wa_stehekin` -- and its displayed
// "Mt. Baker-Snoqualmie (Darrington)" is plainly wrong. But its shadowed value is a 300-character
// EXPLANATION ("Most of the route ... lie within the Okanogan-Wenatchee National Forest's Glacier
// Peak Wilderness (USFS) -- only the initial ~2 miles ..."), and `land_manager` renders as a
// labelled "Land manager" value. Copying it would put a paragraph where a name goes, which is the
// prose-into-a-display-field defect this repo records for `season`, `grade` and the bivy chips.
// Neither value is usable as-is, so the repair needs a short correct name WRITTEN -- composition,
// not correction. Recorded as a finding instead.
//
// Read-only by default. Pass --apply to write.
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
requireServiceKey();

// Each entry names the row and the evidence, and the VALUE comes off the row -- never from here.
const EDITS = [
  {
    id: "wa_bears_breast_mountain_se_mega_slab",
    evidence: r => {
      const e = r.emergency || {};
      if (!/kittitas/i.test(String(e.county || ""))) return "emergency.county no longer names Kittitas County.";
      if (!/cle elum/i.test(String(e.rangerStation || ""))) return "emergency.rangerStation no longer names the Cle Elum Ranger District.";
      if (!/salmon la sac|903/i.test(String(r.road?.name || ""))) return "road.name no longer names Salmon La Sac / WA-903.";
      return null;
    },
    // the displayed value must still be the WRONG one, or this has been repaired already/differently
    wrongUnit: /baker[- ]snoqualmie/i,
    rightUnit: /okanogan[- ]wenatchee/i,
  },
  {
    id: "wa_mount_teneriffe_kamikaze_trail",
    evidence: r => {
      const e = r.emergency || {};
      if (!/dnr|department of natural resources/i.test(String(e.rangerStation || ""))) return "emergency.rangerStation no longer names WA DNR.";
      if (!/not usfs/i.test(String(e.rangerStation || ""))) return "emergency.rangerStation no longer says 'not USFS' — that explicit denial is the adjudicator.";
      return null;
    },
    wrongUnit: /baker[- ]snoqualmie/i,
    rightUnit: /department of natural resources|\bDNR\b/i,
  },
  {
    id: "wa_mount_teneriffe_standard_route",
    evidence: r => {
      const e = r.emergency || {};
      if (!/dnr|department of natural resources/i.test(String(e.rangerStation || ""))) return "emergency.rangerStation no longer names WA DNR.";
      if (!/not usfs/i.test(String(e.rangerStation || ""))) return "emergency.rangerStation no longer says 'not USFS' — that explicit denial is the adjudicator.";
      return null;
    },
    wrongUnit: /baker[- ]snoqualmie/i,
    rightUnit: /department of natural resources|\bDNR\b/i,
  },
];

const ids = EDITS.map(e => e.id);
const rows = await selectAll("routes", "id,access,emergency,road", `id=in.(${ids.join(",")})`, { pageSize: 20 });
if (rows.length !== ids.length) {
  console.error(`FAIL: expected ${ids.length} rows, read ${rows.length}. Refusing to act on a partial read.`);
  process.exit(1);
}

// A LENGTH BOUND, because the whole reason Agnes is excluded is that its correct value is prose.
// `land_manager` renders as a labelled value, so a paragraph there is a defect whatever it says.
const MAX = 140;

let planned = 0, skipped = 0, refused = 0;
const plan = [];
for (const e of EDITS) {
  const r = rows.find(x => x.id === e.id);
  const a = r.access || {};
  const shown = String(a.land_manager || ""), shadow = String(a.landManager || "");

  if (shown && shadow && shown === shadow) { console.log(`\n== ${e.id}\n   already applied — both spellings agree. No-op.`); skipped++; continue; }
  if (!shadow) { console.error(`\n== ${e.id}\n   REFUSED: no shadowed \`landManager\` to copy.`); refused++; continue; }
  if (!e.wrongUnit.test(shown)) { console.error(`\n== ${e.id}\n   REFUSED: the displayed value no longer names the unit this repair is about. Re-read it.`); refused++; continue; }
  if (!e.rightUnit.test(shadow)) { console.error(`\n== ${e.id}\n   REFUSED: the shadowed value no longer names the expected correct unit.`); refused++; continue; }
  if (shadow.length > MAX) { console.error(`\n== ${e.id}\n   REFUSED: the shadowed value is ${shadow.length} chars — prose, not a field value. Copying it would put a paragraph where a name renders.`); refused++; continue; }
  const bad = e.evidence(r);
  if (bad) { console.error(`\n== ${e.id}\n   REFUSED: ${bad}`); refused++; continue; }

  console.log(`\n== ${e.id}   [gate: EVIDENCE — the row's own emergency/road fields adjudicate]`);
  console.log(`   BEFORE (displayed): ${shown}`);
  console.log(`   AFTER  (copied)   : ${shadow}`);
  plan.push({ id: e.id, access: Object.assign({}, a, { land_manager: shadow }), expect: shadow });
  planned++;
}

console.log(`\nplanned ${planned}, already-applied ${skipped}, refused ${refused}`);
if (refused) { console.error("one or more entries were refused — nothing will be written."); process.exit(1); }
if (!planned) { console.log("nothing to do."); process.exit(0); }
if (!APPLY) { console.log("\ndry run — re-run with --apply to write."); process.exit(0); }

for (const p of plan) await patchRow("routes", p.id, { access: p.access });

// verify by RE-READ, never by the write's own status
const after = await selectAll("routes", "id,access", `id=in.(${plan.map(p => p.id).join(",")})`, { pageSize: 20 });
let bad = 0;
for (const p of plan) {
  const a = after.find(x => x.id === p.id)?.access || {};
  if (String(a.land_manager || "") !== p.expect) { console.error(`FAIL: ${p.id} re-read does not match what was written.`); bad++; }
  // the whole point is what the DISPLAY resolves to
  else if ((a.land_manager || a.landManager) !== p.expect) { console.error(`FAIL: ${p.id} display precedence still resolves to the wrong value.`); bad++; }
}
if (bad) process.exit(1);
console.log(`\nverified by re-read: ${plan.length} row(s) now display the manager their own emergency fields name.`);
