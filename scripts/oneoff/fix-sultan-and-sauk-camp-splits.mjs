// Two more zone files: ONE camp list copied byte-for-byte across peaks in different drainages.
//
// `audit:camp-route-fit` flags a PAIR - this camp on that route - and the standing rule is to
// census the CAMP before removing anything. Doing that turned 3 flagged pairs into two whole
// corridors:
//
//   Sultan / Index      Spire Mountain, Tailgunner, Mount Stickney          6 camps, identical
//   Mountain Loop/Sauk  Bedal, Kololo Peaks, Mount Pugh, Painted Mountain   6 camps, identical
//
// So Mount Stickney (5,307 ft) was offered a camp on Spire Mountain's summit saddle 15.6 km away
// and 613 ft ABOVE its own high point, and Bedal Peak was offered the White Chuck Glacier basin
// 19.2 km off. Same shape as the Mountain Loop split, and found the same way.
//
// FOUR SIGNALS, AND THEY AGREE COMPLETELY. The evidence matrix - which route's own prose names
// which camp - comes out as a near-perfect diagonal:
//
//                                                   Spire     Tailgunner  Stickney
//     Gunn Basin, below Tailgunner Pass             silent    NAMES       silent
//     Barclay Creek roadhead pullouts               silent    NAMES       silent
//     Spire Mountain - the saddle NW of the summit  NAMES     silent      silent
//     One Acre Lake, under Mount Stickney           silent    silent      NAMES
//     Sultan Basin road pullouts / Olney Creek gate (denies)  silent      NAMES
//     trailhead                                     N Fk Sky  Barclay Lk  Olney Ck gate
//
// and in the Sauk corridor every Pugh camp is named only by Pugh, Bedal Basin only by Bedal,
// White Chuck/Kololo only by Kololo, and Sloan Creek by BOTH Kololo and Painted Mountain - which
// is correct, because those two share the North Fork Sauk Trailhead. A camp serves a TRAILHEAD,
// not a map region, and there are three distinct trailheads in one corridor and four in the other.
//
// THE ROWS' OWN CAMPING PROSE CORROBORATES EVERY ASSIGNMENT AND CONTRADICTS NONE. Stickney: One
// Acre Lake is "a common camp" reached "from the road gate/Sultan Basin Road". Tailgunner: "camp
// near the pass ... the upper basin camps on the far side". Painted Mountain: "Park at the Sloan
// Creek Campground / North Fork Sauk trailhead (2,100 ft) at the end of FR 49." Bedal: FR 4096
// past Bedal Campground. Not one of the seven routes describes camping at a foreign peak.
//
// SPIRE'S ROW DENIES ITS OWN CAMP LIST IN WORDS: "It rises directly above the North Fork
// Skykomish River, on the west side of the range, NOT NEAR SULTAN BASIN or the Sauk
// drainage/Monte Cristo group." So its "NAMES it" above is the token test matching a denial, and
// the Sultan Basin camp is foreign to it by the row's own statement.
//
// "San Juan Campground, Index-Galena road" IS NOT MOVED, and that is the load-bearing refusal.
// NO route in the corridor names it, so nothing in the catalog places it, and assigning it from
// the balance of the list is exactly the zone-file reasoning this repair exists to undo. It stays
// on all three - the same call the Goat Rocks split made for "Dana Yelverton Shelter site".
//
// A SPLIT, NOT A DELETION: every one of the twelve camps survives on its home peak, and that is
// asserted after the write rather than assumed. No route is left with an empty list.
//
// Dry run by default. Pass --apply to write.
import { SUPABASE_URL, anonKey, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const DASH = "—";

const SHARED = "San Juan Campground, Index-Galena road";

const CORRIDORS = [
  {
    name: "Sultan / Index",
    list: [
      "Gunn Basin, below Tailgunner Pass",
      "Barclay Creek roadhead pullouts",
      "Spire Mountain " + DASH + " the saddle northwest of the summit",
      SHARED,
      "One Acre Lake, under Mount Stickney",
      "Sultan Basin road pullouts and the Olney Creek gate",
    ],
    keep: {
      wa_spire_mountain_scramble: ["Spire Mountain " + DASH + " the saddle northwest of the summit", SHARED],
      wa_tailgunner_peak_w_route: ["Gunn Basin, below Tailgunner Pass", "Barclay Creek roadhead pullouts", SHARED],
      wa_mount_stickney_scramble: ["One Acre Lake, under Mount Stickney", "Sultan Basin road pullouts and the Olney Creek gate", SHARED],
    },
  },
  {
    name: "Mountain Loop / North Fork Sauk",
    list: [
      "Mount Pugh road end, Forest Road 2095",
      "Lake Metan, Mount Pugh trail",
      "Stujack Pass and the benches just below it",
      "Bedal Basin, below the north side of Bedal Peak",
      "Sloan Creek Campground and the North Fork Sauk road end",
      "White Chuck Glacier basin, under Kololo Peaks",
    ],
    keep: {
      wa_bedal_peak_standard: ["Bedal Basin, below the north side of Bedal Peak"],
      wa_kololo_peaks_standard: ["Sloan Creek Campground and the North Fork Sauk road end", "White Chuck Glacier basin, under Kololo Peaks"],
      wa_mount_pugh_stujack: ["Mount Pugh road end, Forest Road 2095", "Lake Metan, Mount Pugh trail", "Stujack Pass and the benches just below it"],
      wa_painted_mountain_scramble: ["Sloan Creek Campground and the North Fork Sauk road end"],
    },
  },
];

// The catalog talking about its own past state, in the row that settles this whole corridor.
const PROSE = {
  id: "wa_spire_mountain_scramble",
  find: " as this route's description previously stated",
  repl: "",
  note: "the FACT - it is not near Sultan Basin or the Sauk/Monte Cristo group - is what makes Spire's list wrong, and it is untouched. Only the note about what the record used to say goes.",
};

const IDS = CORRIDORS.flatMap((c) => Object.keys(c.keep));
const KEY = APPLY ? requireServiceKey() : anonKey();
const url = `${SUPABASE_URL}/rest/v1/routes?id=in.(${IDS.join(",")})&select=id,bivy,overview,approach,beta`;
const r = await fetch(url, { headers: headers(KEY) });
if (!r.ok) { console.error(`read failed: ${r.status} ${await r.text()}`); process.exit(1); }
const rows = await r.json();
if (rows.length !== IDS.length) { console.error(`read ${rows.length} row(s) for ${IDS.length} id(s) - refusing`); process.exit(1); }
const byId = new Map(rows.map((x) => [x.id, x]));

const same = (a, b) => a.length === b.length && [...a].sort().join(" ") === [...b].sort().join(" ");
const staged = [];
const refusals = [];

for (const c of CORRIDORS) {
  for (const [id, keep] of Object.entries(c.keep)) {
    const cur = byId.get(id).bivy;
    if (!Array.isArray(cur)) { refusals.push(`${id}: bivy is not an array`); continue; }
    const names = cur.map((x) => String((x || {}).name || ""));
    // DECLARED STATE: the row must still hold the exact shared list this was reasoned about.
    if (!same(names, c.list)) {
      refusals.push(`${id}: camp list has moved since this was written\n      have: ${JSON.stringify(names)}\n      want: ${JSON.stringify(c.list)}`);
      continue;
    }
    const missing = keep.filter((k) => !names.includes(k));
    if (missing.length) { refusals.push(`${id}: cannot keep ${JSON.stringify(missing)} - not present`); continue; }
    staged.push({
      id, corridor: c.name,
      next: cur.filter((x) => keep.includes(String((x || {}).name || ""))),
      removed: names.filter((n) => !keep.includes(n)),
    });
  }
  // Nothing may be lost from the corridor: every camp keeps a home.
  const kept = new Set(Object.values(c.keep).flat());
  const orphan = c.list.filter((n) => !kept.has(n));
  if (orphan.length) refusals.push(`${c.name}: ${JSON.stringify(orphan)} would be removed everywhere - a split may not delete a camp`);
}

const p = byId.get(PROSE.id);
const proseField = ["overview", "approach", "beta"].find((f) => typeof p[f] === "string" && p[f].includes(PROSE.find));
if (!proseField) refusals.push(`${PROSE.id}: the catalog-voice clause is not in overview/approach/beta`);
else if (p[proseField].split(PROSE.find).length - 1 !== 1) refusals.push(`${PROSE.id}.${proseField}: clause does not appear exactly once`);

if (refusals.length) {
  console.error(`REFUSED - ${refusals.length} problem(s):\n  ` + refusals.join("\n  "));
  process.exit(1);
}

for (const s of staged) {
  console.log(`\n### ${s.id}   [${s.corridor}]   6 -> ${s.next.length} camp(s)`);
  s.next.forEach((x) => console.log(`   keep   ${x.name}`));
  s.removed.forEach((n) => console.log(`   drop   ${n}`));
}
console.log(`\n### ${PROSE.id}  ${proseField}`);
console.log(`   why: ${PROSE.note}`);
for (const sent of p[proseField].replace(PROSE.find, PROSE.repl).split(/(?<=[.!?])\s+/)) {
  if (sent.includes("Sultan Basin")) console.log(`   => ${sent.trim()}`);
}
console.log(`\n${staged.length} route(s) split across ${CORRIDORS.length} corridors, 1 prose clause cut.`);

if (!APPLY) { console.log("\nDRY RUN - pass --apply to write."); process.exit(0); }

for (const s of staged) await patchRow("routes", s.id, { bivy: s.next });
await patchRow("routes", PROSE.id, { [proseField]: p[proseField].replace(PROSE.find, PROSE.repl) });
console.log(`\nwrote ${staged.length + 1} value(s).`);

const v = await fetch(url, { headers: headers(KEY) });
const after = new Map((await v.json()).map((x) => [x.id, x]));
let bad = 0;
for (const s of staged) {
  const got = (after.get(s.id).bivy || []).map((x) => String((x || {}).name || ""));
  if (!same(got, s.next.map((x) => x.name))) { console.error(`NOT APPLIED: ${s.id} -> ${JSON.stringify(got)}`); bad++; }
  if (!got.length) { console.error(`EMPTIED: ${s.id} has no camps left`); bad++; }
}
// A SPLIT, NOT A DELETION - asserted, not assumed.
for (const c of CORRIDORS) {
  for (const n of c.list) {
    const homes = Object.keys(c.keep).filter((id) => (after.get(id).bivy || []).some((x) => String((x || {}).name || "") === n));
    if (!homes.length) { console.error(`CAMP LOST: "${n}" survives on no route in ${c.name}`); bad++; }
  }
}
if (after.get(PROSE.id)[proseField].includes(PROSE.find)) { console.error("NOT APPLIED: the catalog-voice clause is still there"); bad++; }
if (!after.get(PROSE.id)[proseField].includes("not near Sultan Basin")) { console.error("CONTENT LOST: Spire no longer denies Sultan Basin"); bad++; }
console.log(bad ? `\nVERIFY FAILED: ${bad} problem(s).` : `\nverified: every camp keeps a home, no route emptied, Spire's denial intact.`);
process.exit(bad ? 1 : 0);
