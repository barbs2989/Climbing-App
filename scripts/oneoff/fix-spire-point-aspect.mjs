#!/usr/bin/env node
// wa_spire_point_southwest_face stores aspect "E" on a route its own records place on the
// southwest side. aspect drives the sun/shade readout, so this currently tells a party the line
// catches MORNING sun when it catches afternoon sun.
//
// audit:aspect-name is report-only because name-vs-aspect cannot be decided from those two fields.
// This row is decidable because FOUR independent records agree against one:
//
//   name          "Southwest Face"
//   beta          "The south face is accessed from Spire Col at 7,760 feet"
//   descent_text  "Descend the same southwest face line rather than a separate walk-off"
//   geometry      the "Class 4 summit chimney" pin sits 92 m WSW of the Summit pin, and every
//                 approach pin — Spire Col at 231 m, Itswoot Ridge camp, Cub Lake pass — is WSW
//
// against `aspect` and `face`, which are ONE claim: they come from the same enrichment, so their
// agreeing with each other is not corroboration. The overview's "east" refers to the Dana Glacier
// east of the PEAK, not to this route's face.
//
// `face` is corrected in the same write. Fixing only the aspect would leave FACE / WHERE ON THE
// PEAK rendering "East Face" beside a southwest sun readout — one screen, two answers, which is
// the defect this session spent the day removing elsewhere.
//
// Both replacement values come from the row itself: the route's own name, and descent_text's
// phrase "the same southwest face line". Nothing is researched.
import { selectAll, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const ID = "wa_spire_point_southwest_face";

const [r] = await selectAll("routes", "id,name,aspect,face,waypoints,beta,descent_text",
  `id=eq.${ID}`, { pageSize: 10 });
if (!r) { console.error(`FAIL — ${ID} not found.`); process.exit(1); }

/* Re-assert every leg of the argument against the LIVE row. If a later pass has already repaired
   this, or the evidence has moved, refuse rather than write. */
const problems = [];
if (String(r.aspect || "").toUpperCase() !== "E") problems.push(`aspect is now ${JSON.stringify(r.aspect)}, not "E" — already repaired?`);
if (!/southwest/i.test(String(r.name || ""))) problems.push("the route name no longer says southwest");
if (!/southwest face/i.test(String(r.descent_text || ""))) problems.push("descent_text no longer says 'southwest face'");
if (!/spire col/i.test(String(r.beta || ""))) problems.push("beta no longer names Spire Col as the access");

// The geometry leg, measured here rather than quoted: the climbing feature must sit WEST of the
// summit. If it does not, the whole argument collapses and nothing should be written.
const num = (v) => (v == null || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));
const wps = (r.waypoints || []).map((w) => ({ ...w, lat: num(w && w.lat), lng: num(w && w.lng) })).filter((w) => w.lat != null);
const summit = wps.find((w) => String(w.type || "").toLowerCase() === "summit");
const chimney = wps.find((w) => /chimney/i.test(String(w.name || "")));
if (!summit || !chimney) problems.push("the Summit pin or the summit-chimney pin is gone — the geometry leg cannot be checked");
else {
  const R = Math.PI / 180;
  const y = Math.sin((chimney.lng - summit.lng) * R) * Math.cos(chimney.lat * R);
  const x = Math.cos(summit.lat * R) * Math.sin(chimney.lat * R) - Math.sin(summit.lat * R) * Math.cos(chimney.lat * R) * Math.cos((chimney.lng - summit.lng) * R);
  const deg = (Math.atan2(y, x) / R + 360) % 360;
  if (!(deg > 180 && deg < 315)) problems.push(`the summit chimney bears ${deg.toFixed(0)}° from the summit — not the S/W half, so the geometry does NOT support this`);
  else console.log(`geometry leg holds: the summit chimney bears ${deg.toFixed(0)}° (S/W half) from the Summit pin.`);
}

if (problems.length) { console.error(`REFUSED — ${problems.join("; ")}`); process.exit(1); }

console.log(`\n${ID}  "${r.name}"`);
console.log(`   aspect  ${JSON.stringify(r.aspect)}  ->  "SW"     (the route's own name and descent_text)`);
console.log(`   face    ${JSON.stringify(r.face)}  ->  "Southwest Face"`);
console.log(`\n   sun/shade currently reads as an EAST-facing line: morning sun. It is afternoon sun.\n`);

if (!APPLY) { console.log("(dry run — pass --apply)"); process.exit(0); }
requireServiceKey();
await patchRow("routes", ID, { aspect: "SW", face: "Southwest Face" });
const [after] = await selectAll("routes", "id,aspect,face", `id=eq.${ID}`, { pageSize: 10 });
const ok = after.aspect === "SW" && /southwest/i.test(String(after.face || ""));
console.log(ok ? `written and re-read: aspect=${JSON.stringify(after.aspect)} face=${JSON.stringify(after.face)}`
               : `FAILED — re-read shows aspect=${JSON.stringify(after.aspect)} face=${JSON.stringify(after.face)}`);
process.exitCode = ok ? 0 : 1;
