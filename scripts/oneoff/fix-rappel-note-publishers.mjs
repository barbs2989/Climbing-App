// Twelve rappel notes name a publisher, above the rappel table.
//
// `rappel_count_note` renders directly above the RAPPELS section, so this is the most visible of
// the columns still carrying a citation. These are the WELDED ones #1292 deliberately did not
// touch: the citation is not a trailing clause, it is the sentence that says WHY the count should
// be believed, and several carry a direct quote that is itself the useful content.
//
// So this is a HAND batch, written by reading each note, not a transform. #1292 and #1268 each
// shipped a small defect by pushing a mechanical rule one notch past where it was safe — a
// punctuation seam and a determiner collision — and the class left after them is precisely the
// part that resisted rules.
//
// EVERY REWRITE KEEPS THE CLAIM AND THE QUOTE. Only the publisher's name goes:
//
//   Mountain Project's South Ridge page: "The rappel can be done in four raps with a 60M rope."
//   -> One published South Ridge description: "The rappel can be done in four raps with a 60M rope."
//
// Where the point of the sentence is that TWO INDEPENDENT accounts agree — which is the reason a
// climber should trust the count — that survives as "two independent published descriptions",
// because losing it would remove the evidence and leave a bare assertion.
//
// Each edit is a literal find/replace required to match exactly once, and is idempotent.
import { loadEnv, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const env = loadEnv();
const U = env.VITE_SUPABASE_URL;
const K = APPLY ? requireServiceKey() : env.VITE_SUPABASE_ANON_KEY;
const H = { apikey: K, Authorization: `Bearer ${K}` };

const EDITS = [
  ["wa_forbidden_peak_west_ridge",
    `SummitPost's East Ledges description says`,
    `one published East Ledges description says`],
  ["wa_northwest_arete",
    `Both the Mountaineers route page and Mountain Project describe the same sequence`,
    `Two independent published descriptions give the same sequence`],
  ["wa_complete_south_buttress",
    `from fixed tat that Mountain Project flags as dated`,
    `from fixed tat reported as dated`],
  ["wa_complete_south_buttress",
    `North Cascade Mountain Guides describe the West Ridge as bolted chain anchors where`,
    `the West Ridge is described as bolted chain anchors where`],
  ["wa_mix_up_peak_east_face",
    `Mountain Project: "5 rappels will get you down the route climbed and a 60M rope is long enough."`,
    `One published account: "5 rappels will get you down the route climbed and a 60M rope is long enough."`],
  ["wa_mix_up_peak_east_face",
    `the two-rope sequence the Mountaineers route page describes`,
    `the two-rope sequence described elsewhere`],
  ["wa_pernod_spire_standard",
    `Best-documented account (Mountain Project South Face + AAC 1989 FA note):`,
    `Best-documented account (a South Face description plus the 1989 first-ascent note):`],
  ["wa_liberty_crack",
    `Standard/primary Liberty Crack descent per Mountain Project, SummitPost, and StephAbegg.com:`,
    `Standard/primary Liberty Crack descent, described consistently across published accounts:`],
  ["wa_news_nw_corner",
    `Mountain Project's West Face page:`,
    `One published West Face description:`],
  ["wa_east_face_variation",
    `(confirmed via a Mountaineers.org South Face/Rib trip report describing 4 raps on one rope, or 2 on twin ropes, with sling anchors on trees/boulders)`,
    `(a South Face/Rib trip report describes 4 raps on one rope, or 2 on twin ropes, with sling anchors on trees/boulders)`],
  ["wa_east_ridge_9",
    `Mountain Project's South Ridge page: "The rappel can be done in four raps with a 60M rope."`,
    `One published South Ridge description: "The rappel can be done in four raps with a 60M rope."`],
  ["wa_forbidden_peak_northeast_face",
    `Mountain Project gives 'five or six single rope rappels from here back to the snowfield' for the same line`,
    `one published account gives 'five or six single rope rappels from here back to the snowfield' for the same line`],
  ["wa_liberty_bell_beckey_route",
    `Mountain Project also documents a variant that`,
    `A published account also documents a variant that`],
  ["wa_concerto_in_c_for_drill_and_hammer",
    `Mountain Project's entire descent note is`,
    `the only published descent note is`],
  // Changelog voice in the same note — "previously shown here … have been removed" tells a climber
  // what was done to the record. The climber fact is that neither circulating figure is supported.
  ["wa_concerto_in_c_for_drill_and_hammer",
    `Both figures previously shown here were unsourced, so both have been removed rather than one being chosen.`,
    `Neither figure that circulates is supported, so none is given here.`],
];

// Nothing may still name a publisher, or tell a climber what was done to the record.
const FORBIDDEN = /\bSummitPost\b|\bMountain ?Project\b|\bMountaineers\.org\b|Mountaineers route page|North Cascade Mountain Guides|StephAbegg|\bAllTrails\b|\bWTA\b|\bpreviously shown here\b/i;

const cur = new Map(); const fails = []; const skipped = [];
for (const [id, from, to] of EDITS) {
  if (!cur.has(id)) {
    const [row] = await (await fetch(`${U}/rest/v1/routes?id=eq.${id}&select=id,rappel_count_note`, { headers: H })).json();
    if (!row) { fails.push(`${id}: no row`); continue; }
    cur.set(id, row.rappel_count_note || "");
  }
  const s = cur.get(id);
  if (s.includes(to) && !s.includes(from)) { skipped.push(`${id}: ${from.slice(0, 40)}…`); continue; }
  const n = s.split(from).length - 1;
  if (n !== 1) { fails.push(`${id}: expected ${JSON.stringify(from.slice(0, 56))}… exactly once, found ${n}`); continue; }
  cur.set(id, s.split(from).join(to));
}
if (fails.length) {
  console.error("REFUSING TO WRITE — rows are not what this was written against:");
  for (const f of fails) console.error("  - " + f);
  process.exit(1);
}
for (const s of skipped) console.log(`  (already repaired, skipped) ${s}`);

const ids = [...new Set(EDITS.map((e) => e[0]))];
for (const id of ids) {
  console.log(`\n### ${id}`);
  console.log(cur.get(id).replace(/\s+/g, " "));
  if (FORBIDDEN.test(cur.get(id))) console.log("  !! still names a publisher — this edit set is incomplete for this row");
}
const bad = ids.filter((id) => FORBIDDEN.test(cur.get(id)));
if (bad.length) { console.error(`\nREFUSING — ${bad.length} row(s) still name a publisher after rewriting.`); process.exit(1); }
if (!APPLY) { console.log("\nDRY RUN — pass --apply to write."); process.exit(0); }

let failed = 0;
for (const id of ids) {
  await patchRow("routes", id, { rappel_count_note: cur.get(id) });
  const [after] = await (await fetch(`${U}/rest/v1/routes?id=eq.${id}&select=rappel_count_note`, { headers: H })).json();
  const got = after.rappel_count_note || "";
  if (got !== cur.get(id) || FORBIDDEN.test(got)) { console.log(`  MISMATCH ${id}`); failed++; }
  else console.log(`  ok ${id}`);
}
console.log(failed ? `\n${failed} did not take` : `\nall ${ids.length} verified on re-read`);
process.exit(failed ? 1 : 0);
