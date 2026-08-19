// The two rule-3 candidates triaged in research-data/RAPPEL-ROPE-CONFIG-TRIAGE-2026-08-19.md.
//
// WHAT THIS DOES NOT DO: invent a distance. wa_west_face_2's table says 50/50/50/20 and its own
// descent_text says "approximately 30 meters each"; no source is cited for either, so the repair
// is to NULL the unsupported lengths, not to write 30. Halving, or copying the prose figure,
// both replace one fabricated number with another -- the rule this repo already follows, and the
// reason `null` is the correct value where no source publishes a distance.
//
// It also fixes BOTH surfaces. Nulling rappel_detail while leaving the same numbers in the
// `rappels` summary string would leave the dangerous figure on screen -- the two-surfaces trap
// (#907: the correction landed in one box while the other kept the superseded value).
//
// Every write is asserted against the value this triage actually read. If a row has moved, the
// script refuses rather than overwriting someone else's work.
import { loadEnv, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const env = loadEnv();
const U = env.VITE_SUPABASE_URL;
const K = requireServiceKey();
const H = { apikey: K, Authorization: `Bearer ${K}` };
const COLS = "id,name,rappels,rappel_count_note,rappel_detail,descent_text,gear";

async function read(id) {
  const r = await fetch(`${U}/rest/v1/routes?id=eq.${id}&select=${COLS}`, { headers: H });
  if (!r.ok) throw new Error(`read ${id} -> ${r.status} ${(await r.text()).slice(0, 200)}`);
  const [row] = await r.json();
  if (!row) throw new Error(`read ${id} -> no row`);
  return row;
}
const fails = [];
const expect = (cond, msg) => { if (!cond) fails.push(msg); };

// -- 1. wa_west_face_2: the row states two different lengths for the same four rappels.
const w = await read("wa_west_face_2");
expect(w.rappels === "4 double-rope rappels (~50m, 50m, 50m, 20m)", `west_face_2.rappels moved: ${JSON.stringify(w.rappels)}`);
expect(Array.isArray(w.rappel_detail) && w.rappel_detail.length === 4, "west_face_2.rappel_detail is no longer 4 entries");
expect(Array.isArray(w.rappel_detail) && w.rappel_detail.map((d) => d.lengthM).join(",") === "50,50,50,20",
  `west_face_2 lengths moved: ${Array.isArray(w.rappel_detail) ? w.rappel_detail.map((d) => d.lengthM).join(",") : "?"}`);
expect(/approximately 30 meters each/i.test(w.descent_text || ""), "west_face_2.descent_text no longer states 30 m -- re-triage before writing");

const wPatch = {
  // Derived from the row: keep every entry and every note, drop only the unsupported number.
  rappel_detail: (w.rappel_detail || []).map((d) => ({ ...d, lengthM: null })),
  rappels: "4 double-rope rappels down the West Face; per-station lengths unconfirmed",
  rappel_count_note:
    "Per-station lengths were removed 2026-08-19 as unsupported. The row stated two different "
    + "figures for the same four rappels: rappels/rappel_detail said 50/50/50/20 m, while "
    + "descent_text says \"approximately 30 meters each\" and the gear list specifies a 60 m rope "
    + "by single-rope technique (which reaches 30 m doubled). No source is cited for either "
    + "figure, so both were dropped rather than one being chosen -- writing the prose figure would "
    + "substitute a second unsourced number for the first. RappelTable prints an em dash for a "
    + "null length. Restore a figure only from a source that publishes per-station distances. "
    + "See research-data/RAPPEL-ROPE-CONFIG-TRIAGE-2026-08-19.md.",
};

// -- 2. wa_chimney_rock_west_face: the table is right; the GEAR LIST is wrong.
const c = await read("wa_chimney_rock_west_face");
expect(c.rappels === "Single rope; downclimb ledges between rappels", `chimney.rappels moved: ${JSON.stringify(c.rappels)}`);
expect(Array.isArray(c.gear) && c.gear.some((g) => /single 50m sufficient/i.test(g)), "chimney gear no longer claims a single 50 m rope suffices");
expect(/double-rope \(two-strand\) rappel/i.test(c.descent_text || ""), "chimney descent_text no longer describes a two-strand rappel");
expect(/bring a full second rope/i.test(c.descent_text || ""), "chimney descent_text no longer requires a second rope");

const cPatch = {
  // The winner is descent_text, which states the requirement in as many words. Copied, not invented.
  gear: (c.gear || []).map((g) => /single 50m sufficient/i.test(g)
    ? "two ropes, or a 60m lead rope plus a tag line (the Rappel Chimney rappel is rigged two-strand)"
    : g),
  rappels: "2 rappels: a short single-strand rap off the summit, then a two-strand rap down the Rappel Chimney - a second rope or tag line is required",
  // Its own note says the 30 m is "estimated as a typical double-rope pitch", i.e. not sourced.
  rappel_detail: (c.rappel_detail || []).map((d, i) => i === 1 ? { ...d, lengthM: null } : d),
};

if (fails.length) {
  console.error("REFUSING TO WRITE -- the rows are not what the triage read:");
  for (const f of fails) console.error("  - " + f);
  process.exit(1);
}

for (const [id, before, patch] of [["wa_west_face_2", w, wPatch], ["wa_chimney_rock_west_face", c, cPatch]]) {
  console.log("=".repeat(76));
  console.log(id);
  for (const k of Object.keys(patch)) {
    const b = k === "rappel_detail" ? JSON.stringify((before[k] || []).map((d) => d.lengthM))
      : k === "gear" ? JSON.stringify((before[k] || []).filter((g) => /rope/i.test(g))) : JSON.stringify(before[k]);
    const a = k === "rappel_detail" ? JSON.stringify(patch[k].map((d) => d.lengthM))
      : k === "gear" ? JSON.stringify(patch[k].filter((g) => /rope/i.test(g))) : JSON.stringify(patch[k]);
    console.log(`  ${k}\n    before: ${String(b).slice(0, 220)}\n    after : ${String(a).slice(0, 300)}`);
  }
}

if (!APPLY) { console.log("\nDRY RUN -- pass --apply to write."); process.exit(0); }

for (const [id, patch] of [["wa_west_face_2", wPatch], ["wa_chimney_rock_west_face", cPatch]]) {
  await patchRow("routes", id, patch);
  console.log(`patched ${id}`);
}

// Re-read and reconcile. A 200 is not evidence the data changed.
console.log("\nverifying by re-reading:");
let bad = 0;
for (const [id, patch] of [["wa_west_face_2", wPatch], ["wa_chimney_rock_west_face", cPatch]]) {
  const after = await read(id);
  for (const k of Object.keys(patch)) {
    const want = JSON.stringify(patch[k]), got = JSON.stringify(after[k]);
    if (want !== got) { console.log(`  MISMATCH ${id}.${k}\n    want ${want.slice(0, 160)}\n    got  ${got.slice(0, 160)}`); bad++; }
    else console.log(`  ok ${id}.${k}`);
  }
}
console.log(bad ? `\n${bad} column(s) did not take` : "\nall columns verified");
process.exit(bad ? 1 : 0);
