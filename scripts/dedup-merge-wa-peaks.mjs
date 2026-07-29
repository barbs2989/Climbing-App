// Rescue the content worth keeping from four duplicate route rows, before they're deleted.
//
// Unlike Mount Adams — where the loser held 18 fields the keeper lacked — these four losers
// are thin (29-45 populated fields against the keepers' 50-56) and hold almost nothing
// unique. So this is deliberately NOT a blanket field merge. I read every hazard entry on
// all eight rows and am moving only what the keeper genuinely doesn't say:
//
//   stuart_cascadian_couloir     "Avalanche hazard when snow-covered" — the keeper covers
//                                loose rock and steep snow with glissade runout, but never
//                                says avalanche. Also carries alpine_grade II, keeper null.
//   wa_the_tooth_tooth_fairy     "Unprotected scrambling above the last bolted anchor to
//                                reach the true summit" — a specific hazard the keeper's
//                                three entries don't mention.
//   stuart_west_ridge            "Loose rock in sections of the ridge" — the keeper already
//                                says "Loose rock in places; exposure on the crest". Nothing
//                                to move.
//   wa_serpentine_arete          "Loose rock on upper ridge traverse" — the keeper already
//                                says "Rockfall from parties above or from the loose upper
//                                gully". Nothing to move.
//
// `source` is NOT merged, though three losers have one and their keepers don't. It records
// where THAT row's data came from; copying "wa-enrich-batch" onto a row whose content was
// written by different work would misattribute provenance.
//
// The losers' other conflicting fields are ignored by design: the keeper's figures are the
// better ones (that's why it's the keeper), and the losers' distances are the same one-way
// vs round-trip confusion Adams had — 9.6 km against 19.3 on Cascadian Couloir.

import { selectAll, patchRow } from "./lib/supabase-env.mjs";

const MERGES = [
  { keep: "wa_mount_stuart_cascadian_couloir",
    hazards: ["Avalanche hazard when snow-covered"],
    fields: { alpine_grade: "II" } },
  { keep: "wa_the_tooth_fairy",
    hazards: ["Unprotected scrambling above the last bolted anchor to reach the true summit"],
    fields: {} },
];

for (const m of MERGES) {
  const [row] = await selectAll("routes", "id,name,hazards,alpine_grade", `id=eq.${m.keep}`);
  if (!row) throw new Error(`${m.keep} not found`);
  const body = {};
  const add = m.hazards.filter(h => !(row.hazards || []).includes(h));
  if (add.length) body.hazards = [...(row.hazards || []), ...add];
  for (const [k, v] of Object.entries(m.fields)) if (!row[k]) body[k] = v;

  if (!Object.keys(body).length) { console.log(`${m.keep}: nothing to do`); continue; }
  const after = await patchRow("routes", m.keep, body);
  if (body.hazards && (after.hazards || []).length !== body.hazards.length)
    throw new Error(`${m.keep}: hazards did not land`);
  console.log(`${m.keep}: hazards ${(row.hazards || []).length} -> ${(after.hazards || []).length}` +
    (body.alpine_grade ? `, alpine_grade -> ${after.alpine_grade}` : ""));
}
console.log("\ndone — the deletes are in research/dedup-wa-peaks.sql, for a human to run");
process.exit(0);
