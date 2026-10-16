// Seven routes render internal working language above their rappel table.
//
// `rappel_count_note` and `rappels` are CLIMBER-FACING. These seven carry column names
// (`descent_text`), provenance verdicts ("not supported by any source"), changelog voice ("has
// been removed", "previously listed"), and one note addressed to a maintainer ("should be
// dropped"). I wrote one of these myself in #1043 and fixed it separately; the other six
// predate me and are the same defect.
//
// EVERY REWRITE IS A RESTATEMENT, NOT A RESEARCH PASS. Each keeps the climber-relevant fact the
// note already carries and drops only the meta. Nothing is added that the row did not say.
// Where the meta WAS the safety point -- Chimney Rock's "the 2001 bolt claim is misattributed"
// -- the safety point is preserved in a climber's terms ("no fixed hardware is confirmed;
// inspect it"), because deleting it would remove a real warning.
//
// Each row is asserted against a distinctive fragment of its current value first, so a row that
// has moved is refused rather than overwritten.
import { loadEnv, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const env = loadEnv();
const U = env.VITE_SUPABASE_URL;
const K = requireServiceKey();
const H = { apikey: K, Authorization: `Bearer ${K}` };

const EDITS = [
  {
    id: "wa_south_face_center", col: "rappel_count_note",
    expect: "On-file summary and descent both state",
    to: "Two single-rope rappels is the standard count. Parties carrying two ropes do it instead as "
      + "one full double-rope rappel. Individual station lengths are not documented.",
  },
  {
    id: "wa_east_face", col: "rappel_count_note",
    expect: "is not supported by any source for this route",
    to: "A first-hand report of the East Face 5.10d describes one double-rope rappel to the notch "
      + "between Middle and South Gunsight, then one more — loose, dirty and cold — into the moat at "
      + "the base of the notch. The figure of about four rappels on a single 60 m rope is arithmetic "
      + "from roughly 100 m of descent rather than a published count.",
  },
  {
    id: "wa_argonaut_peak_east_ridge", col: "rappel_count_note",
    expect: "appears to conflate this with a different line",
    to: "Reported as two 30 m rappels, off a slung rock and a small tree. A count of four rappels "
      + "belongs to a different descent line and does not apply to this one.",
  },
  {
    id: "wa_storm_king_southwest_scramble", col: "rappel_count_note",
    expect: "was not supported by any source and has been removed",
    to: "Most parties downclimb this rather than rappel, though slings near the summit show some do "
      + "rappel it. If you use it, a single rappel off the east side returns you to the ledge on the "
      + "north side, and even with a 60 m rope expect to downclimb some class 3 terrain.",
  },
  {
    id: "wa_chimney_rock_west_face", col: "rappel_count_note",
    expect: "should be dropped",
    to: "Two rappels. This line is sparsely documented, and no fixed hardware at the Rappel Chimney "
      + "anchor is confirmed for this peak — inspect whatever is there and carry webbing, cord and "
      + "rings to back it up or replace it, especially in early season when the anchor may be worn "
      + "or buried.",
  },
  {
    id: "wa_bonanza_peak_mary_green_glacier", col: "rappel_count_note",
    expect: "On-file summary states 4",
    to: "Six to seven fixed natural stations run along the rock band. Parties typically consolidate "
      + "them into about four rappels on a doubled 60 m x 8 mm rope. Station lengths beyond the first "
      + "are not documented.",
  },
  {
    id: "wa_lexington_tower_east_face", col: "rappels",
    expect: "see descent_text",
    to: "0 — the standard descent is a walk-off down a short 3rd-class gully from the notch; no "
      + "rappels required. A ~7-rappel line straight down the face is a documented but non-standard "
      + "alternative some parties use in bad weather.",
  },
];

const rows = new Map();
const fails = [];
for (const e of EDITS) {
  const r = await fetch(`${U}/rest/v1/routes?id=eq.${e.id}&select=id,${e.col}`, { headers: H });
  if (!r.ok) { fails.push(`${e.id}: read ${r.status}`); continue; }
  const [row] = await r.json();
  if (!row) { fails.push(`${e.id}: no row`); continue; }
  const cur = row[e.col] || "";
  if (!cur.includes(e.expect)) { fails.push(`${e.id}.${e.col}: no longer contains ${JSON.stringify(e.expect)} — re-read before writing`); continue; }
  rows.set(e.id, cur);
}
if (fails.length) {
  console.error("REFUSING TO WRITE — rows are not what this was written against:");
  for (const f of fails) console.error("  - " + f);
  process.exit(1);
}

for (const e of EDITS) {
  console.log(`### ${e.id}.${e.col}`);
  console.log(`  before: ${rows.get(e.id).replace(/\s+/g, " ").slice(0, 150)}…`);
  console.log(`  after : ${e.to.slice(0, 150)}…\n`);
}
if (!APPLY) { console.log("DRY RUN — pass --apply to write."); process.exit(0); }

let bad = 0;
for (const e of EDITS) {
  await patchRow("routes", e.id, { [e.col]: e.to });
  const [after] = await (await fetch(`${U}/rest/v1/routes?id=eq.${e.id}&select=${e.col}`, { headers: H })).json();
  if (after[e.col] !== e.to) { console.log(`  MISMATCH ${e.id}.${e.col}`); bad++; }
  else console.log(`  ok ${e.id}.${e.col}`);
}
console.log(bad ? `\n${bad} did not take` : "\nall verified on re-read");
process.exit(bad ? 1 : 0);
