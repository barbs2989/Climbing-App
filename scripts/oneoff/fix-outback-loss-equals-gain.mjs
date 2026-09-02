// On an out-and-back you return to where you started, so TOTAL ASCENT EQUALS TOTAL DESCENT. Some rows
// store a loss_ft that cannot be true of a party returning to its car.
//
// MEASURED across 8,365 WA routes: 616 out-and-back (or unshaped) rows carry both figures and 420
// (68%) are exactly equal, so the column is mostly sound. Of the rest, 24 store a loss_ft under 20% of
// gain_ft — impossible — and the stored values give the convention away: they cluster on small round
// numbers (400 five times, 600 five times, 300 twice), the height you rappel or downclimb off a summit
// block rather than the descent of the day. wa_mount_olympus_blue_glacier stores gain 7,500 loss 400;
// wa_garfield_mountain_preiss_route stores 3,200 against 20.
//
// ONLY 7 OF THE 24 ARE REPAIRED HERE, and the gate is what makes them mechanical: `outing_shape` must
// be DECLARED as an out-and-back. Where the shape is recorded, gain_ft is the DETERMINED value for
// loss_ft by the invariant — nothing is invented and nothing is chosen between. Where it is absent
// (17 rows), asserting an out-and-back would be ADDING a claim, which is the line this audit does not
// cross; outing_shape is populated on only 170 of 8,365 WA rows, so absence is the normal state.
//
// WHAT THIS ASSERTS AND WHAT IT DOES NOT. It asserts the INVARIANT — that these two figures must
// agree — not that gain_ft is accurate. Checked, and worth stating rather than glossing: on
// wa_argonaut_peak_northeast_couloir gain_ft is EXACTLY the trailhead-to-summit rise, i.e. the
// arithmetic minimum rather than a measurement, and five of the seven have no trailhead/summit pins to
// judge gain against at all. So loss inherits whatever gain is. That is still an improvement in the
// direction that matters: loss_ft feeds the descent side of scarfHrs, and a loss of 400 ft against a
// 7,240 ft gain makes the descent look trivial — the optimistic direction that makes an Est. return
// read green. Making them agree is conservative and correct in kind, and any later correction to gain
// then applies to both instead of leaving the row self-contradictory.
//
// Read-only by default. Pass --apply to write.
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
requireServiceKey();

const rows = await selectAll("routes", "id,gain_ft,loss_ft,outing_shape", "id=like.wa_*", { pageSize: 1000 });
console.log(`WA routes read: ${rows.length}`);
if (rows.length < 5000) { console.error("SHORT READ — refusing to act on a partial read"); process.exit(1); }

const plan = [], skipped = [];
for (const r of rows) {
  if (typeof r.gain_ft !== "number" || typeof r.loss_ft !== "number" || r.gain_ft <= 0) continue;
  if (r.loss_ft / r.gain_ft >= 0.2) continue;              // only the impossible tail
  const shape = String(r.outing_shape || "").toLowerCase();
  if (!/out|back/.test(shape)) { skipped.push(r.id); continue; }
  plan.push({ id: r.id, from: r.loss_ft, to: r.gain_ft, shape: r.outing_shape,
              premise: { gain_ft: r.gain_ft, loss_ft: r.loss_ft, outing_shape: r.outing_shape } });
}
// Fail closed: the tail is a measured population, so finding none of it means the read or the test broke.
const tail = plan.length + skipped.length;
if (tail === 0) { console.error("no near-zero loss_ft rows found at all — the scan is broken, refusing"); process.exit(1); }

console.log(`\nrows whose loss_ft is under 20% of gain_ft: ${tail}`);
console.log(`  ...with outing_shape DECLARED an out-and-back — the invariant determines loss: ${plan.length}`);
console.log(`  ...with no declared shape, LEFT ALONE (asserting one would add a claim): ${skipped.length}\n`);
for (const p of plan)
  console.log(`  ${p.id.padEnd(46)} loss ${String(p.from).padStart(5)} -> ${p.to}   (shape=${p.shape})`);

if (!APPLY) { console.log("\nDRY RUN — pass --apply to write."); process.exit(0); }

let wrote = 0, refused = 0;
const live = new Map((await selectAll("routes", "id,gain_ft,loss_ft,outing_shape", "id=like.wa_*", { pageSize: 1000 })).map(r => [r.id, r]));
for (const p of plan) {
  const r = live.get(p.id);
  const stale = !r || Object.entries(p.premise).find(([k, v]) => r[k] !== v);
  if (stale) { console.log(`  REFUSED ${p.id}: the row has changed since it was read`); refused++; continue; }
  await patchRow("routes", p.id, { loss_ft: p.to });
  wrote++;
}
console.log(`\nwrote ${wrote}, refused ${refused}`);

// A 200 is not evidence the data changed.
const after = new Map((await selectAll("routes", "id,gain_ft,loss_ft", "id=like.wa_*", { pageSize: 1000 })).map(r => [r.id, r]));
let ok = 0;
for (const p of plan) {
  const r = after.get(p.id);
  if (r && r.loss_ft === p.to && r.gain_ft === p.premise.gain_ft) ok++;
  else console.log(`  NOT APPLIED: ${p.id}`);
}
console.log(`verified ${ok} of ${plan.length}`);
