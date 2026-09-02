// Repair a pin that names a place the catalog otherwise agrees about, using the catalog's OWN majority
// as the donor. Generalises the Aasgard Pass repair so the feature is a parameter rather than a
// separate script per place.
//
//   node fix-displaced-named-pin-by-consensus.mjs --name "Monte Cristo Townsite" [--apply]
//
// THE METHOD, and why it is safe:
//   * Pins are matched on the feature NAME, and a compound name is a DIFFERENT feature — "Monte Cristo
//     Peak summit" is not the townsite, "Aasgard Pass Gully Break" is not the pass. The match is
//     therefore anchored, not a substring sweep.
//   * Pins are clustered by position; the largest cluster is the donor, and it must hold at least 3
//     pins on at least 3 routes or there is no consensus and the run refuses. IT MUST ALSO BEAT THE
//     RUNNER-UP BY 2 — a tie is not a majority, and "Lake Ingalls" is exactly that shape (3 pins on
//     3 routes at each of two points), where the sort would otherwise pick a winner arbitrarily.
//   * ELEVATION IS THE DISCRIMINATOR. A pin that is genuinely a different point on a broad feature
//     carries a different height; one that claims the majority's height at a different coordinate is a
//     coordinate error. Only the latter is repaired, and only lat/lng is written — a pin's own
//     elevation is left alone.
//   * Nothing is typed. The replacement comes from a donor row read at run time, so a repair needing a
//     coordinate the catalog does not hold cannot be expressed.
//   * A row that ALREADY holds the feature at the consensus is left alone. Some rows store one place
//     twice, once in the consensus and once displaced; moving the outlier onto the donor would replace
//     a displacement with a duplication. Those rows want reading, not a coordinate copied.
//
// MEASURED for "Monte Cristo Townsite" (batch 84): 7 pins name Monte Cristo across the catalog. The
// majority is 3 pins at 47.98556,-121.39389 @ ~2,762 ft — which matches the published townsite
// coordinate exactly. wa_foggy_peak_scramble's pin sits 5,869 m away and 127 m from BARLOW PASS, i.e.
// it holds the trailhead's coordinate under the townsite's name. That is what produced this row's
// impossible geometry: 6.44 km of trail claimed across a 0.13 km straight line (sinuosity 50.6),
// because the row's Barlow Pass pin and its Monte Cristo pin were stacked on the same place.
//
// Read-only by default. Pass --apply to write.
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const nameArg = (process.argv.find(a => a.startsWith("--name=")) || "").slice(7)
  || process.argv[process.argv.indexOf("--name") + 1];
if (!nameArg || nameArg.startsWith("--")) {
  console.error('usage: node fix-displaced-named-pin-by-consensus.mjs --name "Monte Cristo Townsite" [--apply]');
  process.exit(1);
}
requireServiceKey();

const CLUSTER_M = 400;   // pins within this of each other are one place
const WRONG_M = 1000;    // ...and this far from the majority is a displaced pin, not scatter
const hav = (a, b) => {
  const R = 6371008.8, r = Math.PI / 180;
  const dLa = (b[0]-a[0])*r, dLo = (b[1]-a[1])*r;
  const h = Math.sin(dLa/2)**2 + Math.cos(a[0]*r)*Math.cos(b[0]*r)*Math.sin(dLo/2)**2;
  return 2*R*Math.asin(Math.sqrt(h));
};
// The stored name must BE the feature, allowing only a trailing qualifier after a separator — so
// "Monte Cristo Townsite / Glacier Basin Trail" matches and "Monte Cristo Peak summit" does not.
const esc = nameArg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
const NAME = new RegExp(`^\\s*${esc}\\s*(?:[/(,–—-].*)?$`, "i");

const rows = await selectAll("routes", "id,waypoints", "id=like.wa_*", { pageSize: 1000 });
console.log(`WA routes read: ${rows.length}`);
if (rows.length < 5000) { console.error("SHORT READ — refusing to act on a partial read"); process.exit(1); }

const pins = [];
for (const r of rows)
  for (const [i, p] of (Array.isArray(r.waypoints) ? r.waypoints : []).entries()) {
    if (typeof p?.lat !== "number" || typeof p?.lng !== "number") continue;
    if (NAME.test(String(p.name || "").trim())) pins.push({ id: r.id, i, p });
  }
console.log(`pins matching "${nameArg}": ${pins.length}`);
if (!pins.length) { console.error("no matching pins — refusing"); process.exit(1); }

const clusters = [];
for (const x of pins) {
  const c = clusters.find(c => hav([c.lat, c.lng], [x.p.lat, x.p.lng]) < CLUSTER_M);
  if (c) c.members.push(x); else clusters.push({ lat: x.p.lat, lng: x.p.lng, members: [x] });
}
clusters.sort((a, b) => b.members.length - a.members.length);
const maj = clusters[0];
const majRoutes = new Set(maj.members.map(m => m.id)).size;
if (maj.members.length < 3 || majRoutes < 3) {
  console.error(`majority is ${maj.members.length} pin(s) on ${majRoutes} route(s) — not a consensus, refusing`);
  process.exit(1);
}
// A TIE IS NOT A MAJORITY. "Lake Ingalls" has 3 pins on 3 routes at one point and 3 on 3 at another;
// the sort then picks whichever happened to come first, and the script would confidently "repair" one
// group into the other with nothing to say which is right. Require a strict margin over the runner-up.
const runner = clusters[1];
if (runner && maj.members.length - runner.members.length < 2) {
  console.error(`majority is ${maj.members.length} pin(s) against a runner-up of ${runner.members.length} ` +
    `at ${runner.lat},${runner.lng} — too close to call, refusing.\n` +
    `  Settle it against a published coordinate before repairing either way.`);
  process.exit(1);
}
const majElev = maj.members.map(m => m.p.elev).find(e => typeof e === "number");
const donor = maj.members.find(m => m.p.elev === majElev) || maj.members[0];
console.log(`majority: ${maj.members.length} pins on ${majRoutes} routes at ${donor.p.lat},${donor.p.lng} @ ${majElev} ft\n`);

const plan = [];
for (const c of clusters.slice(1)) {
  const sep = hav([donor.p.lat, donor.p.lng], [c.lat, c.lng]);
  for (const m of c.members) {
    // ELEVATION TOLERANCE IS 25 ft, AND 200 WAS NEARLY A DISASTER. Hozomeen Mountain has TWO summits
    // 68 ft apart — North 8,071 and South 8,003, the South one 1.6 km southeast (Wikipedia). The
    // 3-pin consensus sits exactly on the area record for the North Peak, and
    // wa_hozomeen_mountain_southeast_face's pin is 1,609 m away at 8,003 ft — i.e. CORRECT, on the
    // south summit its own name describes. A 200 ft tolerance called that "the majority's height" and
    // would have moved a right pin onto the wrong peak. A displaced COORDINATE does not change a pin's
    // stored elevation, so a genuine coordinate error matches the consensus height almost exactly;
    // anything further is evidence of a different feature, not noise to absorb.
    const sameish = typeof m.p.elev === "number" && typeof majElev === "number" && Math.abs(m.p.elev - majElev) <= 25;
    const verdict = sep <= WRONG_M ? "within tolerance — scatter, left alone"
      : !sameish ? `LEFT ALONE — elevation ${m.p.elev} is far from the majority's ${majElev}, so it may be a different point`
      : "DISPLACED — claims the majority's height at a different coordinate";
    console.log(`  ${m.id.padEnd(42)} [${m.i}] ${m.p.lat},${m.p.lng} @ ${m.p.elev}  ${sep.toFixed(0)} m out — ${verdict}`);
    // DO NOT CREATE A DUPLICATE. Some rows store the same feature TWICE — one copy in the consensus
    // and one displaced (wa_le_conte_mountain_northern_aspect holds Cascade Pass at both). Moving the
    // outlier onto the donor would put two identical pins on one row, turning a displacement into a
    // duplication. That row needs its pin list read, not a coordinate copied.
    const twin = pins.find(o => o.id === m.id && o.i !== m.i &&
                                hav([donor.p.lat, donor.p.lng], [o.p.lat, o.p.lng]) < CLUSTER_M);
    if (sep > WRONG_M && sameish && twin) {
      console.log(`       ^ LEFT ALONE — this row already holds "${nameArg}" at the consensus (pin ${twin.i}); repairing would duplicate it`);
      continue;
    }
    if (sep > WRONG_M && sameish) plan.push({ ...m, sep });
  }
}
console.log(`\nto repair: ${plan.length}`);
if (!plan.length) { console.log("nothing to do."); process.exit(0); }
if (!APPLY) { console.log("\nDRY RUN — pass --apply to write."); process.exit(0); }

const live = new Map((await selectAll("routes", "id,waypoints", "id=like.wa_*", { pageSize: 1000 })).map(r => [r.id, r]));
let wrote = 0, refused = 0;
for (const m of plan) {
  const cur = live.get(m.id)?.waypoints?.[m.i];
  if (!cur || cur.lat !== m.p.lat || cur.lng !== m.p.lng || String(cur.name).trim() !== String(m.p.name).trim()) {
    console.log(`  REFUSED ${m.id}[${m.i}]: the row has changed since it was read`); refused++; continue;
  }
  const next = live.get(m.id).waypoints.map((p, i) => i === m.i ? { ...p, lat: donor.p.lat, lng: donor.p.lng } : p);
  await patchRow("routes", m.id, { waypoints: next });
  wrote++;
}
console.log(`\nwrote ${wrote}, refused ${refused}`);

const after = new Map((await selectAll("routes", "id,waypoints", "id=like.wa_*", { pageSize: 1000 })).map(r => [r.id, r]));
let ok = 0;
for (const m of plan) {
  const a = after.get(m.id)?.waypoints?.[m.i];
  if (a && a.lat === donor.p.lat && a.lng === donor.p.lng && a.elev === m.p.elev) ok++;
  else console.log(`  NOT APPLIED: ${m.id}[${m.i}]`);
  const before = live.get(m.id).waypoints.length, now = after.get(m.id).waypoints.length;
  if (before !== now) { console.error(`waypoint count changed on ${m.id}`); process.exitCode = 1; }
}
console.log(`verified ${ok} of ${plan.length}`);
