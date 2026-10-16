// Remove the source attributions from routes.pro_needs — 22 values, re-voiced not deleted.
//
// `pro_needs` feeds the RACK box through routeRackFor(), so every one of these is on screen.
// #1422 is what made audit:prose-citations able to see the column.
//
// HARDER THAN sling_rack, and the shapes are why this was done by reading. There the publisher was
// always a trailing tag. Here it is often the SUBJECT of the sentence -- "Mountain Project lists no
// protection beta", "Mountain Project rates the route PG13" -- so deleting the tag leaves no
// sentence. Two are direct QUOTES with attribution, which the standing rule on third-party beta
// says to rewrite rather than credit. And several are safety-bearing:
//
//   - wa_project_crack's "do not count on bolts DESPITE OLDER GUIDEBOOK REFERENCES" -- the clause
//     is why a climber might expect bolts, so dropping it weakens the warning.
//   - wa_remmel_mountain_nw_ridge records a genuine DISAGREEMENT about rope length. Losing that
//     would make one answer look settled on a question about whether your rope reaches.
//   - the four "no protection beta on record" values are telling a climber the route is
//     undocumented, which is exactly the documented-negative this repo declines to overwrite.
//
// "(field marked N/A)" is a second defect riding along in four of them: a FIELD in our own record,
// narrated to a climber. Same class as the rope_note batch.
//
// THE ACCEPTANCE TEST IS THE AUDIT'S OWN NEEDLES, lifted from audit-prose-citations.mjs. A repair
// counts only if the thing that reports the backlog agrees the citation is gone -- checking against
// a pattern of my own would let the two drift, and the drift would read as a column going clean.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { requireServiceKey, patchRow, selectAll } from "../lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const DRY = process.argv.includes("--dry");
const dead = (w) => { console.error(`\nREFUSED — ${w}. Nothing was written.\n`); process.exit(1); };
requireServiceKey();

const audit = fs.readFileSync(path.join(ROOT, "scripts/audit-prose-citations.mjs"), "utf8");
const liftRe = (name) => {
  const m = new RegExp("^const " + name + "\\s*=\\s*(/.*/[gimsuy]*);$", "m").exec(audit);
  if (!m) dead(`ANCHOR LOST: const ${name} in audit-prose-citations.mjs`);
  return new Function("return " + m[1])();
};
const NAMED = liftRe("NAMED"), ACT = liftRe("ACT");
if (!NAMED.test("per Mountain Project")) dead("the lifted NAMED pattern is wrong");
if (!ACT.test("sources disagree on it")) dead("the lifted ACT pattern is wrong");

const EDITS = [
  // --- the publisher is a trailing tag ---------------------------------------------------------
  { id: "wa_sheep_gap_mountain_scramble", find: " per trip reports", replace: "" },
  { id: "wa_preacher_mountain_scramble", find: " reported by any source", replace: " on record" },
  { id: "wa_mount_mathias_scramble", find: ", per Mountaineers/Peakbagger route notes", replace: "" },
  { id: "wa_mcmillan_spire_west_southwest_ridge", find: " (per the Mountain Project route page)", replace: "" },
  { id: "wa_gilbert_peak_west_route", find: " and described as runout (R) on Mountain Project", replace: " and rated runout (R)" },
  { id: "wa_whistler_mountain_scramble", find: " for the class 4 variations some sources describe", replace: " for the class 4 variations" },

  // --- the publisher is the SUBJECT: the sentence has to be re-voiced --------------------------
  { id: "wa_cashmere_mountain_northeast_ridge",
    find: "No protection is described as placed on this route by the Mountain Project source; it",
    replace: "No protection is recorded on this route; it" },
  { id: "wa_mount_daniel_lynch_glacier",
    find: "Mountain Project lists no fixed rock protection for this route",
    replace: "no fixed rock protection is recorded for this route" },
  { id: "wa_e_se_face",
    find: "Mountain Project notes the main gear requirement is simply sturdy boots",
    replace: "The main gear requirement is simply sturdy boots" },
  { id: "wa_luna_glacier",
    find: "Mountain Project describes protection simply as 'runners and a few pieces of gear' for the rock",
    replace: "Protection for the rock is simply runners and a few pieces of gear" },
  { id: "wa_inner_constance_northwest_buttress",
    find: "Mountain Project reports suitable placements only every 20 to 100 feet",
    replace: "Suitable placements come only every 20 to 100 feet" },
  { id: "wa_cathedral_rock_northeast_ridge_2003_variation",
    find: "Mountain Project rates the route PG13.",
    replace: "The route is rated PG13." },

  // --- "(field marked N/A)" is OUR OWN field, narrated to a climber ---------------------------
  { id: "wa_direct_finish",
    find: "Mountain Project lists no protection beta for this route (field marked N/A). It's",
    replace: "No protection beta is on record for this route. It is" },
  { id: "wa_east_ridge",
    find: "Mountain Project lists no protection beta for this route (field marked N/A) despite it being classified Trad",
    replace: "No protection beta is on record for this route despite it being classified Trad" },
  { id: "wa_wings",
    find: "Mountain Project lists no protection beta for this route (field marked N/A) despite classifying it Trad",
    replace: "No protection beta is on record for this route despite it being classified Trad" },

  // --- quotes: rewrite rather than credit ------------------------------------------------------
  { id: "wa_chimney_rock_east_face_direct",
    find: "\"Single rack, nuts, tat and webbing for rappelling, knife to remove old tat and trash it at home\" (Mountain Project).",
    replace: "Single rack, nuts, tat and webbing for the rappels, and a knife to cut away old tat and pack it out." },
  { id: "wa_three_fingers_r1",
    find: "'warrants a rope' per trip reports even though",
    replace: "warrants a rope even though" },
  { id: "wa_south_ridge_6",
    find: "Mountain Project explicitly flags 'an abundance of loose, lichen-y rock,' and warns belayers on pitch 2 to stay out",
    replace: "There is an abundance of loose, lichen-y rock, and belayers on pitch 2 should stay out" },
  // The sentence already states the fact; the quote only restated it with a credit attached.
  { id: "wa_south_face_12",
    find: " (\"you basically climb anywhere on this face, so feel free to make your own way up\" — Mountain Project)",
    replace: "" },

  // --- safety-bearing: the clause survives, the attribution does not --------------------------
  { id: "wa_project_crack",
    find: "despite older guidebook references",
    replace: "even though older descriptions mention them" },
  { id: "wa_remmel_mountain_nw_ridge",
    find: "Sources disagree on rope: one describes a single 50-60 m rope as sufficient for the rappels, another recommends two 60 m ropes.",
    replace: "Rope requirements are not settled: some descriptions call a single 50-60 m rope sufficient for the rappels, others recommend two 60 m ropes." },
  { id: "wa_andersons_thumb_standard",
    find: "No source confirms rock quality; treat",
    replace: "Rock quality is unconfirmed; treat" },
];

const ids = EDITS.map((e) => e.id).join(",");
const rows = await selectAll("routes", "id,pro_needs", `id=in.(${ids})`, { pageSize: 100 })
  .catch((e) => dead("the read failed: " + (e && e.message)));
if (!rows) dead("the read returned nothing");
if (rows.length !== EDITS.length) dead(`read ${rows.length} row(s) for ${EDITS.length} edit(s) — an id is wrong or a row lost its pro_needs`);
const byId = new Map(rows.map((r) => [r.id, r]));

const planned = [];
for (const e of EDITS) {
  const row = byId.get(e.id);
  if (!row) dead(`${e.id} is not in the catalog`);
  const cur = row.pro_needs;
  if (typeof cur !== "string") dead(`${e.id}: pro_needs is ${typeof cur}, not a string`);
  const n = cur.split(e.find).length - 1;
  if (n !== 1) dead(`${e.id}: the declared text occurs ${n} time(s), expected exactly 1 — the value has changed under this table`);
  const next = cur.replace(e.find, e.replace).replace(/\s{2,}/g, " ").trim();
  if (next === cur) dead(`${e.id}: the replacement is a no-op`);
  if (!next) dead(`${e.id}: the replacement would empty the value`);
  // The audit's own verdict, not mine.
  if (NAMED.test(next) || ACT.test(next)) dead(`${e.id}: the audit still reads a citation in the result:\n  ${next}`);
  // A re-voice must not shrink the value to a stub — that would be a deletion wearing a rewrite.
  if (next.length < cur.length * 0.45) dead(`${e.id}: the result is ${next.length}ch against ${cur.length}ch — too much was removed for a re-voice`);
  planned.push({ e, before: cur, after: next });
}

console.log(`all ${planned.length} edit(s) validated, and the AUDIT's own needles read none of the results as a citation.\n`);
for (const p of planned) {
  console.log(`${p.e.id}  (${p.before.length} -> ${p.after.length}ch)`);
  console.log(`  -  ${p.before}`);
  console.log(`  +  ${p.after}\n`);
}
if (DRY) { console.log("--dry: nothing written."); process.exit(0); }

for (const p of planned) {
  await patchRow("routes", p.e.id, { pro_needs: p.after })
    .catch((err) => dead(`${p.e.id}: the write failed — ${err && err.message}`));
}
console.log(`wrote ${planned.length} row(s). re-reading…`);

const after = await selectAll("routes", "id,pro_needs", `id=in.(${ids})`, { pageSize: 100 })
  .catch((e) => dead("the verification read failed: " + (e && e.message)));
const afterById = new Map(after.map((r) => [r.id, r]));
let bad = 0;
for (const p of planned) {
  const got = afterById.get(p.e.id) && afterById.get(p.e.id).pro_needs;
  if (got !== p.after) { console.error(`  MISMATCH ${p.e.id}: ${JSON.stringify(got)}`); bad++; }
}
console.log(bad ? `\n${bad} row(s) did not reconcile.` : `\nall ${planned.length} row(s) reconciled.`);
process.exit(bad ? 1 : 0);
