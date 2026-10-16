// `gain_ft` is smaller than `loss_ft` on a route that returns to its own trailhead.
//
// You cannot finish lower than you started. On an out-and-back the total gain and the total loss
// are the same number, and the app already knows it: `gainCoversWholeOuting` is
// |loss - gain| / gain <= 3% and relabels the tile "On foot" when it holds.
//
// It is not cosmetic. `dbRouteToCamel` maps `gain_ft` to `gainM`, `scarfHrs` turns it into the
// approach estimate, and that feeds Est. summit, Est. return and the After dark warning — so an
// understated gain makes the app OPTIMISTIC, the #641 direction.
//
// THE POPULATION, measured before any of this was written: 640 WA routes carry both values, 52
// have loss more than 5% larger than gain, and 45 of those say TRAVERSE / one-way / shuttle in
// their own prose, where finishing lower is exactly right. That leaves 7, and reading them splits
// two ways:
//
//   * FOUR are the undulation convention and are NOT repaired here. `gain_ft` matches the
//     trailhead-to-summit PIN RISE almost exactly while `loss_ft` is larger — i.e. gain is the
//     rise and loss is the total descent including re-gains over intermediate bumps. Two true
//     numbers answering different questions, the shape five of the seven pairs in the
//     facts-stored-twice census turned out to be. wa_spinnaker_peak_s_route (2045 vs a 2054 rise),
//     wa_mount_saul_se_route (4993 vs 4993), wa_mount_lincoln_standard (5070 vs 5043) and
//     wa_buckhorn_marmot_pass (4257 vs a 4388 rise) are those.
//
//   * THREE have `gain_ft` below BOTH `loss_ft` AND the pin rise, so the undulation reading cannot
//     explain them, and each has a third and fourth record agreeing on the larger figure.
//
// THE VALUE IS COPIED FROM `loss_ft`, NEVER TYPED, which is the same contract the trailhead and
// summit-pin repairs use: a fix needing a number the row does not already hold cannot be expressed
// at all. Every corroborating record is re-asserted at apply time, so a re-researched row refuses
// rather than being written over.
import { SUPABASE_URL, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const CASES = [
  { id: "wa_wilmans_peak_scramble", gain: 2300, loss: 4500, rise: 4518,
    why: "one-day car-to-car; descent_text says \"Reverse the scramble back to the basin\", the itinerary totalNote says \"4,500 ft of gain\", and the pin rise is 4,518" },
  { id: "wa_union_peak_se_route", gain: 1096, loss: 1696, rise: 1696,
    why: "one-day; descent_text descends the same ridge back to the trailhead, and loss_ft and the pin rise agree to the FOOT at 1,696" },
  { id: "wa_mount_rainier_curtis_ridge", gain: 7000, loss: 9500, rise: 10006,
    why: "up Curtis, down the Emmons-Winthrop, exiting to White River — the same trailhead; the itinerary totalNote says \"~9,500 ft gain\" and the pin rise is 10,006" },
];
const TRAVERSE = /travers|point[- ]to[- ]point|one[- ]way|shuttle/i;

const apply = process.argv.includes("--apply");
const h = headers(requireServiceKey());
const ef = (w) => { const v = w && w.elev; const n = v == null || v === "" ? NaN : Number(v); return Number.isFinite(n) ? n : null; };
const ty = (w) => String((w && w.type) || "").toLowerCase();
let wrote = 0;

for (const c of CASES) {
  const [r] = await (await fetch(`${SUPABASE_URL}/rest/v1/routes?select=*&id=eq.${c.id}`, { headers: h })).json();
  if (!r) { console.error(`REFUSED - ${c.id} is not in the catalog`); process.exit(1); }
  if (Number(r.gain_ft) !== c.gain || Number(r.loss_ft) !== c.loss) {
    console.error(`REFUSED - ${c.id} is not in the state this was written against: gain ${r.gain_ft}/${c.gain}, loss ${r.loss_ft}/${c.loss}`);
    process.exit(1);
  }
  const wps = Array.isArray(r.waypoints) ? r.waypoints : [];
  const th = wps.filter((w) => ty(w).includes("trailhead")).map(ef).filter((n) => n !== null);
  const su = wps.filter((w) => ty(w).includes("summit")).map(ef).filter((n) => n !== null);
  if (!th.length || !su.length) { console.error(`REFUSED - ${c.id} no longer carries both a trailhead and a summit pin`); process.exit(1); }
  const rise = Math.max(...su) - Math.min(...th);
  if (Math.abs(rise - c.rise) > 50) { console.error(`REFUSED - ${c.id} pin rise moved: ${rise} vs ${c.rise}`); process.exit(1); }
  // The undulation reading must NOT explain it: gain has to be short of the rise as well.
  if (!(c.gain < rise - 300)) { console.error(`REFUSED - ${c.id} gain ${c.gain} is not below the pin rise ${rise}; this is the undulation convention, not a defect`); process.exit(1); }
  // ...and the route must not say it is one-way.
  const prose = ["overview", "beta", "approach", "descent_text"].map((k) => String(r[k] || "")).join("  ")
    + "  " + String((r.itinerary && r.itinerary.totalNote) || "");
  if (TRAVERSE.test(prose)) { console.error(`REFUSED - ${c.id} says traverse/one-way in its own prose; finishing lower is then correct`); process.exit(1); }

  console.log(`${c.id}`);
  console.log(`  ${c.why}`);
  console.log(`  gain_ft ${c.gain} -> ${c.loss}   (loss_ft ${c.loss}, pin rise ${rise})`);
  if (!apply) continue;
  await patchRow("routes", c.id, { gain_ft: c.loss });
  const [back] = await (await fetch(`${SUPABASE_URL}/rest/v1/routes?select=gain_ft,loss_ft&id=eq.${c.id}`, { headers: h })).json();
  if (Number(back.gain_ft) !== c.loss || Number(back.loss_ft) !== c.loss) {
    console.error(`VERIFY FAILED - ${c.id} came back gain ${back.gain_ft} loss ${back.loss_ft}`);
    process.exit(1);
  }
  wrote++;
  console.log(`  verified: gain_ft now equals loss_ft, as an out-and-back requires.`);
}
console.log(apply ? `\n${wrote} of ${CASES.length} written and read back.` : `\ndry run - pass --apply to write`);
