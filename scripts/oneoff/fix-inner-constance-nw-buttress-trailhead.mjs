// wa_inner_constance_northwest_buttress: BOTH trailhead records are wrong, together.
//
// This is the case the batch appliers exclude BY CONSTRUCTION. They declare a winner and copy one
// record over the other, which is what makes them safe — nothing can be invented. Here neither
// record is right, so a winner cannot be declared and a third value is needed. That is exactly the
// class those scripts refuse, so this is a separate, single-route script with its own evidence.
//
// WHY audit:trailhead-agreement CANNOT SEE IT: the pin and approach_logistics AGREE to the digit
// (both "Dosewallips Road washout parking (FR-2610)" @47.740259,-123.065764), so there is no
// disagreement to report. Found instead by probe-approach-prose-names-a-different-trailhead.mjs,
// which asks whether the route's own APPROACH names a different trailhead than its fields do.
//
// THE EVIDENCE, and I want the near-miss recorded because it nearly went the other way:
//
//   AGAINST the repair — the peak-distance test, which settled earlier cases, FAVOURS the value
//     being removed. Dosewallips is 6,825 m from Inner Constance; Upper Dungeness is 11,952 m. The
//     record I am overwriting is the CLOSER one. And `trailheadDirection` says "Same access as the
//     Mount Constance routes", which reads like a confession of borrowing but may simply be true:
//     Mount Constance is 1.4 km away and all five of its routes legitimately hold Dosewallips.
//     Distance alone never condemns a trailhead, and a shared approach between neighbouring
//     summits is what "neighbouring" means.
//
//   FOR the repair — the PEER ROUTES ON THIS PEAK, which is the independent witness that settles
//     it. Inner Constance has three routes and they split exactly as the geography predicts:
//       Standard Route (NORTHEAST summit via Crystal Pass)  approach: Dosewallips   log: Dosewallips  — consistent
//       Northwest Buttress            approach: UPPER DUNGENESS   log: Dosewallips  — the defect
//       Sean's Route/Second Wind      approach: UPPER DUNGENESS   log: (none at all)
//     A NORTHWEST buttress is approached from the north-west; the north-east summit from the east.
//     Sean's Route is the load-bearing one: same peak, same side, names Upper Dungeness in its own
//     prose, and carries NO logistics — so it could not have been contaminated and could not have
//     contaminated anything. Two routes' prose against one borrowed blob.
//
// THE COORDINATE IS NOT TYPED BY HAND. It is extracted from this route's own `approach` text,
// which states it as a driving destination, and then corroborated against the NINE other routes
// whose logistics already hold "Upper Dungeness Trailhead (Trail #833.2, FR-2870)" — Mount
// Deception, Mount Fricaba, Honeymoon Route among them — at the identical 47.877572,-123.136927.
// The corroboration is a CHECK, not the source: a cross-route consensus has been wrong four times
// in this catalog and must never be the thing a value is read from.
//
// BOTH RECORDS ARE WRITTEN IN ONE PASS. A one-sided repair creates a disagreement that the next
// trailhead-agreement pass resolves in whichever direction its plan says — which is precisely how
// a correct fix of mine was clobbered earlier today.
//
// Pass --apply to write; default is a dry run.
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const key = requireServiceKey();
const ID = "wa_inner_constance_northwest_buttress";
const NAME = "Upper Dungeness Trailhead (Trail #833.2, FR-2870)";

const R = Math.PI / 180;
const hav = (a, b, c, d) => { const p = (c - a) * R, q = (d - b) * R;
  const s = Math.sin(p / 2) ** 2 + Math.cos(a * R) * Math.cos(c * R) * Math.sin(q / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(s)); };

const [row] = await selectAll("routes", "id,name,approach,waypoints,approach_logistics", `id=eq.${ID}`, { pageSize: 3, key });
if (!row) { console.error(`${ID}: NOT FOUND`); process.exit(1); }

// 1. Read the coordinate out of the route's OWN prose. Never retyped.
const m = String(row.approach || "").match(/\((-?\d{2}\.\d{4,}),\s*(-?\d{2,3}\.\d{4,})\)/);
if (!m) { console.error("no coordinate found in this route's approach text — refusing to invent one"); process.exit(1); }
const lat = Number(m[1]), lng = Number(m[2]);
console.log(`extracted from approach prose: ${lat},${lng}`);

// 2. Corroborate against the routes already holding this trailhead. A CHECK, not the source.
const peers = await selectAll("routes", "id,approach_logistics", `approach_logistics->>trailhead=ilike.*Upper Dungeness*`, { pageSize: 60, key });
const agree = peers.filter(p => {
  const al = p.approach_logistics || {};
  return al.trailheadLat != null && Math.round(hav(lat, lng, +al.trailheadLat, +al.trailheadLng)) <= 50;
});
console.log(`corroboration: ${agree.length} of ${peers.length} existing "Upper Dungeness" routes sit within 50 m of it`);
if (agree.length < 3) { console.error("fewer than 3 corroborating routes — refusing to write a coordinate this weakly supported"); process.exit(1); }

// 3. Refuse if the row no longer looks like the defect this script was written for.
const wps = Array.isArray(row.waypoints) ? row.waypoints : [];
const i = wps.findIndex(w => w && String(w.type || "").toLowerCase() === "trailhead");
const al = row.approach_logistics && typeof row.approach_logistics === "object" ? row.approach_logistics : null;
if (i < 0 || !al) { console.error("expected both a Trailhead pin and approach_logistics — refusing"); process.exit(1); }
const already = Math.round(hav(lat, lng, +wps[i].lat, +wps[i].lng));
if (already <= 500) { console.log(`already repaired (pin is ${already} m from the target) — nothing to do`); process.exit(0); }
console.log(`\ncurrent pin : "${wps[i].name}" @${wps[i].lat},${wps[i].lng}`);
console.log(`current log : "${al.trailhead}" @${al.trailheadLat},${al.trailheadLng}`);
console.log(`->  BOTH become "${NAME}" @${lat},${lng}`);
console.log(`    trailheadDirection dropped — it describes the Dosewallips approach being removed`);
if (!APPLY) { console.log("\n(dry run) pass --apply to write"); process.exit(0); }

const nextAl = { ...al, trailhead: NAME, trailheadLat: lat, trailheadLng: lng };
delete nextAl.trailheadDirection;
await patchRow("routes", ID, {
  waypoints: wps.map((w, n) => n === i ? { ...w, name: NAME, lat, lng } : w),
  approach_logistics: nextAl,
});

const [chk] = await selectAll("routes", "id,waypoints,approach_logistics", `id=eq.${ID}`, { pageSize: 3, key });
const w2 = (chk.waypoints || []).find(w => w && String(w.type || "").toLowerCase() === "trailhead");
const a2 = chk.approach_logistics || {};
if (!w2 || Math.abs(+w2.lat - lat) > 1e-6 || Math.abs(+a2.trailheadLat - lat) > 1e-6) {
  console.error("RECONCILE FAILED — one of the two records did not take"); process.exit(1);
}
if ((chk.waypoints || []).length !== wps.length) { console.error("WAYPOINT COUNT CHANGED"); process.exit(1); }
if (a2.trailheadDirection) { console.error("DIRECTION SURVIVED — it describes the removed trailhead"); process.exit(1); }
console.log(`\nreconciled: both records now read "${a2.trailhead}" and agree to ${Math.round(hav(+w2.lat, +w2.lng, +a2.trailheadLat, +a2.trailheadLng))} m`);

// NOT DONE, deliberately: wa_inner_constance_seans_route carries NO approach_logistics at all.
// Its prose names the same trailhead, so the value is known — but that is filling a GAP rather
// than correcting a wrong answer, and writing a pin there would blind audit:trailhead-agreement
// to the row. Left for whoever owns trailhead coverage.
