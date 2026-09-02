// wa_dragontail_peak_backbone_ridge stores Aasgard Pass TWICE, and one of the two is ~620 m from it.
//
// The row carries a `pass`-type pin at 47.4748,-120.819 and a `Junction`-type pin at
// 47.4803,-120.8206, both at 7,841 ft. Research (batch 80) resolved it against the published saddle:
// the Junction pin matches to five decimal places, the `pass` pin does not.
//
// THREE INDEPENDENT RECORDS AGREE ON THE DONOR, which is what makes this mechanical rather than a
// judgement:
//   1. the published Aasgard Pass coordinate, which the Junction pin matches;
//   2. the row's OWN Junction pin — so the correct value is already inside the row;
//   3. wa_dragontail_peak_serpentine_arete, a structurally IDENTICAL pin list (same pairs in the same
//      positions, from the same two sources), whose `pass` pin sits at 47.48028,-120.82056 — about
//      2 m from this row's Junction pin. So the sibling row's copy of the SAME pin is correct and
//      this row's is not; the error is per-row, not systematic.
//
// NOTHING IS TYPED: the replacement lat/lng is COPIED from the row's own Junction pin, so a repair
// needing a coordinate the catalog does not already hold cannot be expressed by this script.
//
// DELIBERATELY NOT DOING: removing the duplicate. Whether a pin list should carry one entry or two for
// a named place is a curation question affecting 23 WA routes, and research rated the comparable
// Colchuck Lake duplicate merely `imprecise` — on a lake that size a campsite 500 m from the surveyed
// point is plausibly a second real place. Correcting a coordinate that is demonstrably wrong does not
// prejudge that; deleting a pin would.
//
// Read-only by default. Pass --apply to write.
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
requireServiceKey();

const TARGET = "wa_dragontail_peak_backbone_ridge";
const SIBLING = "wa_dragontail_peak_serpentine_arete";
const NAME = "Aasgard Pass";

const hav = (a, b) => {
  const R = 6371008.8, r = Math.PI / 180;
  const dLa = (b[0]-a[0])*r, dLo = (b[1]-a[1])*r;
  const h = Math.sin(dLa/2)**2 + Math.cos(a[0]*r)*Math.cos(b[0]*r)*Math.sin(dLo/2)**2;
  return 2*R*Math.asin(Math.sqrt(h));
};

const rows = await selectAll("routes", "id,waypoints", `id=in.(${TARGET},${SIBLING})`, { pageSize: 10 });
const R = new Map(rows.map(r => [r.id, r]));
for (const id of [TARGET, SIBLING]) if (!R.has(id)) { console.error(`missing row ${id}`); process.exit(1); }

const pins = (id) => (Array.isArray(R.get(id).waypoints) ? R.get(id).waypoints : [])
  .map((p, i) => ({ i, p })).filter(x => String(x.p?.name || "").trim() === NAME);

const tgt = pins(TARGET);
if (tgt.length !== 2) { console.error(`expected exactly 2 "${NAME}" pins on ${TARGET}, found ${tgt.length} — refusing`); process.exit(1); }
const wrong = tgt.find(x => String(x.p.type) === "pass");
const donor = tgt.find(x => String(x.p.type) === "Junction");
if (!wrong || !donor) { console.error(`expected one 'pass' and one 'Junction' pin — refusing`); process.exit(1); }

const sep = hav([wrong.p.lat, wrong.p.lng], [donor.p.lat, donor.p.lng]);
if (sep < 100) { console.log(`the two pins are ${sep.toFixed(0)} m apart — already consistent, nothing to do.`); process.exit(0); }

// Corroboration gate: the donor must agree with the SIBLING row's independent copy of this pin.
const sib = pins(SIBLING).find(x => String(x.p.type) === "pass");
if (!sib) { console.error(`no 'pass'-type "${NAME}" pin on ${SIBLING} to corroborate against — refusing`); process.exit(1); }
const corr = hav([donor.p.lat, donor.p.lng], [sib.p.lat, sib.p.lng]);
if (corr > 100) { console.error(`the donor is ${corr.toFixed(0)} m from the sibling row's pin — corroboration failed, refusing`); process.exit(1); }

console.log(`${TARGET}`);
console.log(`  wrong  [${wrong.i}] type=${wrong.p.type}  ${wrong.p.lat},${wrong.p.lng}`);
console.log(`  donor  [${donor.i}] type=${donor.p.type}  ${donor.p.lat},${donor.p.lng}`);
console.log(`  separation: ${sep.toFixed(0)} m`);
console.log(`  corroborated: the donor is ${corr.toFixed(0)} m from ${SIBLING}'s own 'pass' pin`);
console.log(`  -> copy the donor's lat/lng onto pin [${wrong.i}]; nothing else changes`);

if (!APPLY) { console.log("\nDRY RUN — pass --apply to write."); process.exit(0); }

const next = R.get(TARGET).waypoints.map((p, i) =>
  i === wrong.i ? { ...p, lat: donor.p.lat, lng: donor.p.lng } : p);
await patchRow("routes", TARGET, { waypoints: next });

// A 200 is not evidence the data changed.
const [after] = await selectAll("routes", "id,waypoints", `id=eq.${TARGET}`, { pageSize: 5 });
const a = after.waypoints[wrong.i];
const ok = a && a.lat === donor.p.lat && a.lng === donor.p.lng && a.type === wrong.p.type && a.name === NAME;
console.log(`\nverified: ${ok ? "yes" : "NO"} — pin [${wrong.i}] is now ${a?.lat},${a?.lng} (type ${a?.type})`);
console.log(`waypoint count unchanged: ${after.waypoints.length === R.get(TARGET).waypoints.length}`);
if (!ok) process.exitCode = 1;
