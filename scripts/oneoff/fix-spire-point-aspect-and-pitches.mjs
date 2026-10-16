// Repair wa_spire_point_southwest_face.
//
// A previous pass changed `aspect` E -> SW on four claimed-independent records. Two of them do
// not survive inspection (batch 59):
//   * the GEOMETRY was the approach bearing - four pins bear exactly 240 from the summit because
//     they are interpolated along the trailhead->summit chord (Spire Col sits at exactly
//     0.921052631579 of Itswoot camp -> chimney, its own mileage fraction, to 7e-15);
//   * the BETA was misquoted - the cited sentence says "south", and its next sentence says
//     "southeast face".
// Five records say east/southeast: the row's own beta, its pitch_detail (twice), its overview
// (which places the Dana Glacier EAST), the value stored BEFORE the repair (E), and a first-hand
// trip report fetched 2026-08-27 (onehikeaweek.com/2019/06/30/spire-point/) which says
// "Then I went onto a ledge on the east face" and "return to the southeast ridge", and never
// mentions a southwest face.
//
// Every replacement value comes from the row's own prose. Nothing is researched into this file,
// and each write is gated on the column still holding the value this script says it holds.
import { selectAll, patchRow } from "../lib/supabase-env.mjs";

const ID = "wa_spire_point_southwest_face";
const EXPECT = { aspect: "SW", face: "Southwest Face", name: "Southwest Face", pitches: null };
const WRITE = { aspect: "SE", face: "Southeast Face", name: "Southeast Face", pitches: 5 };
const APPLY = process.argv.includes("--apply");

const [r] = await selectAll("routes", "id,name,area_id,aspect,face,pitches,beta,rope_note,pitch_detail,corrections",
  `id=eq.${ID}`, { pageSize: 5 });
if (!r) throw new Error("route not found - refusing");

// 1. Declared-state gate.
for (const [k, v] of Object.entries(EXPECT)) {
  if (r[k] !== v) throw new Error(`REFUSING: ${k} is ${JSON.stringify(r[k])}, expected ${JSON.stringify(v)} - the row has moved since this script was written.`);
}

// 2. Re-assert the evidence at apply time, so the argument has to still hold now.
const beta = String(r.beta || ""), pd = JSON.stringify(r.pitch_detail || []);
if (!/southeast face/i.test(beta)) throw new Error("REFUSING: beta no longer says 'southeast face'");
if ((pd.match(/southeast face/gi) || []).length < 2) throw new Error("REFUSING: pitch_detail no longer says 'southeast face' twice");
if (!/5-pitch/i.test(String(r.rope_note || ""))) throw new Error("REFUSING: rope_note no longer says '5-pitch' - the pitches=5 write loses its witness");
if (!/pitches corrected from 1 to 5/i.test(String(r.corrections || ""))) throw new Error("REFUSING: the corrections log no longer records the pitches fix");

// 3. A rename must not collide with a sibling on the same area.
const sibs = await selectAll("routes", "id,name", `area_id=eq.${r.area_id}`, { pageSize: 200 });
const clash = sibs.filter(s => s.id !== ID && String(s.name).trim().toLowerCase() === WRITE.name.toLowerCase());
console.log(`siblings on ${r.area_id}: ${sibs.length} -> ${sibs.map(s => s.name).join(" | ")}`);
if (clash.length) throw new Error(`REFUSING: renaming to "${WRITE.name}" collides with ${clash.map(c => c.id).join(", ")}`);

console.log("\ngates passed. planned write:");
for (const k of Object.keys(WRITE)) console.log(`  ${k.padEnd(9)} ${JSON.stringify(r[k])}  ->  ${JSON.stringify(WRITE[k])}`);

if (!APPLY) { console.log("\nDRY RUN - pass --apply to write."); process.exitCode = 0; }
else {
  const note = ` 2026-08-27: aspect SW->SE, face and name corrected to Southeast Face - the E->SW repair rested on a geometry leg that was the approach bearing (four pins interpolated along the trailhead-summit chord all bear 240) and on a misquoted beta; the row's own beta, pitch_detail (x2) and overview, plus a first-hand trip report, all say east/southeast. pitches restored to 5 per rope_note and pitch_detail.`;
  const out = await patchRow("routes", ID, { ...WRITE, corrections: String(r.corrections || "") + note });
  console.log("\nWROTE. re-read:");
  for (const k of Object.keys(WRITE)) console.log(`  ${k.padEnd(9)} ${JSON.stringify(out[k])}`);
  const bad = Object.keys(WRITE).filter(k => out[k] !== WRITE[k]);
  if (bad.length) throw new Error("VERIFY FAILED on " + bad.join(", "));
  console.log("verified: all 4 columns hold the intended value.");
}
