// Waypoint batch 9 (2026-10-01): the three routes batch 8 left for the owner, researched.
//
// Each was a pin that belongs to a DIFFERENT walk than the one the route describes. Researched
// against outside records, not just the row:
//
//   * Mount Ballard (South): the Harts Pass pin sat second-to-last, between the Mill Creek pins
//     and the summit, and drew a 7.5 km jump. No published account walks over Harts Pass to
//     Ballard: the alternative the row's own approach_variants describe starts at the Slate Creek
//     road GATE, which you DRIVE over Harts Pass to reach (trail report 2010; county-highpoint
//     survey 2023). The pin is on none of the route's legs — removed.
//
//   * The Devil's Club (SE Mox, East Face): pins 0-2 — Depot Creek Falls, Ouzel Lake, Redoubt
//     Glacier Camp — are the DEPOT CREEK approach to the north side of the Mox massif (Ouzel Lake
//     is the standard Depot Creek camp for Redoubt/Spickard/Mox). Both parties on record came up
//     PERRY CREEK from Ross Lake: the FA party's own account (NWMJ 2006, "Tamed by the Beast") and
//     the 2008 party (AAJ 2009). So does the row's own approach prose, and the Ross Dam pin's note
//     names Depot Creek as the OTHER side. Removed; the trailhead now leads. "Base of East Face
//     Headwall" is KEPT: its 2-dp box admits its 6,800 ft on the ground (lo 6,610).
//     The approach prose said the FA spent "14 hours ... covering under two miles from the lake";
//     the account has 4.5 mi of trail first and never totals the off-trail miles. Restated with
//     only the figures the account gives.
//
//   * Pinto Rock (3 routes, identical pins): the "Pinto Rock Pullout" trailhead pin is the crag's
//     own map pin, copied verbatim from the crag page — 35 m from the summit, ground 5,109 ft
//     (summit 5,113). Not a pullout. The row's approach_logistics stored 46.32448,-121.92476 as
//     the PEAK: 239 m from the summit and 500 ft lower (ground 4,615), but 13 m from where the
//     mapped 468 m climber's trail leaves NF-77 — the "0.3 mi north from the pullout" the
//     approach describes. That record is the pullout under the wrong label. Both swap into place:
//     the trailhead pin and logistics trailhead take the row's own pullout coordinate; logistics
//     peak takes the row's own summit pin (which matches the USGS/OSM summit node exactly).
//     No coordinate here is new — each is copied from a record the row already holds.
//
// Snapshot: audits/waypoint-order-batch9/rollback-before-batch9.json (written on the dry run).
// Refuses unless every live value is exactly as recorded below; re-reads after writing.
//
//   node scripts/oneoff/fix-waypoint-order-batch9.mjs          # dry run
//   node scripts/oneoff/fix-waypoint-order-batch9.mjs --apply
import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SUPABASE_URL, anonKey, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SNAP = join(ROOT, "audits", "waypoint-order-batch9", "rollback-before-batch9.json");
const sig = (w) => `${(w && w.type) || "?"}|${((w && w.name) || "").trim()}`;
const near = (a, b) => a != null && b != null && Math.abs(Number(a) - b) < 1e-6;

const PINTO = ["wa_clast_from_the_past", "wa_sidewinder_4", "wa_top_gun"];
const SIBS = ["wa_bowling_alley_aka_regular_route", "wa_cobbles_101"];
const PULLOUT ={ lat: 46.32448, lng: -121.92476 };
const SUMMIT = { lat: 46.3265018, lng: -121.9237007 };

const OLD_FA = "spent a full two days and roughly 14 hours of actual travel time in the rain covering under two miles from the lake to the base";
const NEW_FA = "needed two full days in the rain from the lake to the base — 4.5 miles of trail, then roughly 14 hours of brush and creek travel up Perry Creek —";

const EDITS = [
  { route: "wa_mount_ballard_south", op: "remove", pin: "Pass|Harts Pass", lat: 48.7206918, lng: -120.6701073,
    why: "on none of the route's legs; the Slate Creek alternative starts at a road gate driven to over the pass" },
  { route: "wa_the_devils_club", op: "remove", pin: "Water|Depot Creek Falls", lat: 49.01, lng: -121.36, why: "Depot Creek approach" },
  { route: "wa_the_devils_club", op: "remove", pin: "Water|Ouzel Lake", lat: 48.9623, lng: -121.2633, why: "Depot Creek approach" },
  { route: "wa_the_devils_club", op: "remove", pin: "Campsite|Redoubt Glacier Camp", lat: 48.96, lng: -121.28, why: "Depot Creek approach" },
  { route: "wa_the_devils_club", op: "move", pin: "Trailhead|Ross Dam Trailhead (SR-20 milepost 134)", to: 0, why: "the route's trailhead leads" },
  { route: "wa_the_devils_club", op: "prose", col: "approach", from: OLD_FA, to: NEW_FA, why: "only the FA account's own figures" },
  ...PINTO.map((route) => ({ route, op: "recoord", pin: "Trailhead|Pinto Rock Pullout (North Side)", lat: 46.3268, lng: -121.92379,
    to: PULLOUT, why: "was the crag's map pin on the summit; now the row's own pullout record" })),
  ...PINTO.map((route) => ({ route, op: "logistics", expect: { peakLat: PULLOUT.lat, peakLng: PULLOUT.lng },
    set: { trailheadLat: PULLOUT.lat, trailheadLng: PULLOUT.lng, peakLat: SUMMIT.lat, peakLng: SUMMIT.lng },
    why: "the stored 'peak' is the pullout; the peak is the row's own summit pin" })),
  // Same rock, found by the sibling scan: Bowling Alley and Cobbles 101 store "Pinto Rock base
  // (end of NF-77)" at EXACTLY their summit coordinate while claiming 4,700 ft against the
  // summit's 5,118 — the trailhead and the top cannot be one point. The pullout is copied from
  // the three rows above (their own record), and the route start moves ahead of the summit.
  ...SIBS.flatMap((route) => [
    { route, op: "recoord", pin: "Trailhead|Pinto Rock base (end of NF-77)", lat: 46.326559, lng: -121.923912,
      to: PULLOUT, why: "was the summit coordinate; now the pullout the sibling Pinto rows record" },
    { route, op: "move", pin: "Base|South Face / route start", to: 1, why: "the route start precedes the summit" },
  ]),
];

const ids = [...new Set(EDITS.map((e) => e.route))];
const KEY = APPLY ? requireServiceKey() : anonKey();
const url = `${SUPABASE_URL}/rest/v1/routes?id=in.(${ids.join(",")})&select=id,waypoints,approach,approach_logistics`;
const res = await fetch(url, { headers: headers(KEY) });
if (!res.ok) { console.error(`read failed: ${res.status}`); process.exit(1); }
const rows = await res.json();
if (rows.length !== ids.length) { console.error(`read ${rows.length} of ${ids.length} rows — refusing`); process.exit(1); }
const before = new Map(rows.map((r) => [r.id, r]));
const live = new Map(rows.map((r) => [r.id, { waypoints: r.waypoints.map((w) => ({ ...w })), approach: r.approach, approach_logistics: r.approach_logistics ? { ...r.approach_logistics } : null }]));
const cols = new Map(ids.map((id) => [id, new Set()]));

// Every Pinto pin must be the ONE expected: the summit pin the logistics peak is copied from.
for (const id of PINTO) {
  const s = live.get(id).waypoints.filter((p) => p.type === "Summit");
  if (s.length !== 1 || !near(s[0].lat, SUMMIT.lat) || !near(s[0].lng, SUMMIT.lng)) { console.error(`${id}: summit pin not as recorded — refusing`); process.exit(1); }
}

const refusals = [];
for (const e of EDITS) {
  const L = live.get(e.route);
  if (e.op === "prose") {
    const t = L[e.col] || "";
    if (t.split(e.from).length !== 2) { refusals.push(`${e.route}: ${e.col} does not contain the sentence exactly once`); continue; }
    L[e.col] = t.replace(e.from, e.to); cols.get(e.route).add(e.col); continue;
  }
  if (e.op === "logistics") {
    const a = L.approach_logistics;
    if (!a || Object.entries(e.expect).some(([k, v]) => !near(a[k], v))) { refusals.push(`${e.route}: approach_logistics not as recorded`); continue; }
    Object.assign(a, e.set); cols.get(e.route).add("approach_logistics"); continue;
  }
  const w = L.waypoints, hits = w.filter((p) => sig(p) === e.pin);
  if (hits.length !== 1) { refusals.push(`${e.route}: ${hits.length} live pin(s) match ${e.pin}`); continue; }
  const p = hits[0];
  if ((e.op === "remove" || e.op === "recoord") && (!near(p.lat, e.lat) || !near(p.lng, e.lng))) { refusals.push(`${e.route}: ${e.pin} is at ${p.lat},${p.lng}, expected ${e.lat},${e.lng}`); continue; }
  if (e.op === "remove") w.splice(w.indexOf(p), 1);
  else if (e.op === "move") { w.splice(w.indexOf(p), 1); w.splice(e.to, 0, p); }
  else if (e.op === "recoord") { p.lat = e.to.lat; p.lng = e.to.lng; }
  else { refusals.push(`${e.route}: unknown op ${e.op}`); continue; }
  cols.get(e.route).add("waypoints");
}
if (refusals.length) { console.error(`REFUSED — ${refusals.length}:\n  ` + refusals.join("\n  ") + "\nNothing was written."); process.exit(1); }

const show = (l) => l.map((p) => `${sig(p)}${p.lat == null ? " (no coord)" : ` @${p.lat},${p.lng}`}`).join("\n          ");
for (const id of ids) {
  const b = before.get(id), L = live.get(id);
  console.log(`\n### ${id}  [${[...cols.get(id)].join(", ")}]`);
  if (cols.get(id).has("waypoints")) console.log(`   was: ${show(b.waypoints)}\n   now: ${show(L.waypoints)}`);
  if (cols.get(id).has("approach_logistics")) console.log(`   logistics was: ${JSON.stringify(b.approach_logistics)}\n   logistics now: ${JSON.stringify(L.approach_logistics)}`);
  if (cols.get(id).has("approach")) console.log(`   approach: "${OLD_FA}"\n          -> "${NEW_FA}"`);
}
console.log(`\n${EDITS.length} edit(s) on ${ids.length} route(s).`);

if (!existsSync(SNAP)) {
  mkdirSync(dirname(SNAP), { recursive: true });
  writeFileSync(SNAP, JSON.stringify({ takenAt: new Date().toISOString(), rows: rows.map((r) => ({ id: r.id, waypoints: r.waypoints, approach: r.approach, approach_logistics: r.approach_logistics })) }, null, 1) + "\n");
  console.log(`snapshot written: ${SNAP}`);
}
if (!APPLY) { console.log("DRY RUN — pass --apply to write."); process.exit(0); }

for (const id of ids) {
  const patch = {};
  for (const c of cols.get(id)) patch[c] = live.get(id)[c];
  await patchRow("routes", id, patch);
}
// jsonb returns an object's keys in ITS order, not the order written, so compare key-sorted. The
// applied run compared raw strings and reported all three Pinto approach_logistics as NOT APPLIED;
// a re-read showed every value had landed — only the key order differed.
const canon = (x) => JSON.stringify(x, (k, val) => val && typeof val === "object" && !Array.isArray(val) ? Object.fromEntries(Object.entries(val).sort(([a], [b]) => a < b ? -1 : 1)) : val);
const v = await (await fetch(url, { headers: headers(KEY) })).json();
let bad = 0;
for (const r of v) for (const c of cols.get(r.id)) {
  if (canon(r[c]) !== canon(live.get(r.id)[c])) { console.error(`NOT APPLIED: ${r.id}.${c}`); bad++; }
}
console.log(bad ? `VERIFY FAILED: ${bad}` : `verified: ${ids.length} row(s) re-read and match.`);
process.exit(bad ? 1 : 0);
