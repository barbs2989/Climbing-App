// The 19 road-silent walkers sit on peaks. Do their SIBLINGS already answer the road question?
//
// `audit:trailhead-road` establishes the principle: the unit of truth is the road, not the route.
// These 19 carry no trailhead coordinate, so they cannot be clustered geometrically — but they do
// carry an `area_id`, and every other route on the same peak is a recording of the same access.
//
// TWO REASONS THIS IS WEAKER THAN THE COORDINATE CLUSTER, and both are already on record here:
//   - a peak can have TWO GENUINE APPROACHES (Remmel, Carru, Howard, Stuart's North Ridge are the
//     four this repo names), so siblings differing is correct data rather than a contradiction;
//   - the `road` block is what got LEFT BEHIND when a trailhead moved, so a sibling's block can
//     itself be describing the wrong drainage (`audit:trailhead-road` section 2).
// So this MEASURES the donor pool and prints the claims for reading. It does not copy anything.
//
// Read-only.
import { selectAll } from "../lib/supabase-env.mjs";

function leaves(v, out = []) {
  if (typeof v === "string") { if (v.trim()) out.push(v); return out; }
  if (Array.isArray(v)) { for (const x of v) leaves(x, out); return out; }
  if (v && typeof v === "object") { for (const x of Object.values(v)) leaves(x, out); return out; }
  return out;
}
const has = (v) => leaves(v).length > 0;

const rows = await selectAll("routes",
  "id,name,discipline,road,access,approach_logistics,waypoints,approach,dist_km,gain_ft,area_id",
  "id=like.wa_*", { pageSize: 1000 });
if (!rows.length) { console.error("read 0 routes — broken scan, not a clean catalog"); process.exit(1); }

const trailheadPin = (r) => (Array.isArray(r.waypoints) ? r.waypoints : []).some((w) => w && /trailhead/i.test(String(w.type || "")));
const walks = (r) => has(r.approach) || trailheadPin(r) || r.dist_km != null || r.gain_ft != null;
const roadSilent = (r) => !has(r.road) && !has(r.approach_logistics);
const targets = rows.filter((r) => walks(r) && roadSilent(r));

const byArea = {};
for (const r of rows) (byArea[r.area_id] = byArea[r.area_id] || []).push(r);

/* The claim a road block makes on screen is `status — seasonalGate`; `name` says WHICH road. Two
   siblings wording a driveNote differently are not disagreeing, so the claim is those fields. */
const claimOf = (r) => {
  const d = r.road || {};
  const parts = [d.name, d.status, d.seasonalGate].filter((x) => typeof x === "string" && x.trim());
  return parts.length ? parts.join(" | ") : null;
};
const norm = (s) => s.toLowerCase().replace(/\s+/g, " ").trim();

let withDonors = 0, agreeing = 0, none = 0;
console.log(`\n=== do the road-silent walkers' SIBLINGS answer the road question? ===`);
console.log(`${targets.length} road-silent routes that describe a walk\n`);

for (const t of targets) {
  const sibs = (byArea[t.area_id] || []).filter((s) => s.id !== t.id);
  const donors = sibs.filter((s) => claimOf(s));
  const claims = [...new Set(donors.map((s) => norm(claimOf(s))))];
  if (!donors.length) { none++; console.log(`  ${t.id.padEnd(50)} NO sibling with a road block  (${sibs.length} siblings)`); continue; }
  withDonors++;
  if (claims.length === 1) agreeing++;
  const flag = claims.length === 1 ? "AGREE  " : `DIFFER(${claims.length})`;
  console.log(`  ${t.id.padEnd(50)} ${donors.length}/${sibs.length} siblings have a road block  ${flag}`);
  for (const c of claims.slice(0, 3)) console.log(`        "${c.slice(0, 120)}"`);
}

const pct = (n, d) => (d ? `${(100 * n / d).toFixed(1)}%` : "n/a");
console.log(`\n${withDonors} of ${targets.length} have at least one sibling carrying a road block (${pct(withDonors, targets.length)})`);
console.log(`  ${agreeing} of those have siblings that all say the SAME thing`);
console.log(`  ${withDonors - agreeing} have siblings that differ — a peak with two approaches, or a block left on a moved trailhead`);
console.log(`${none} have no sibling to learn from at all — genuine research`);
console.log(`\nMEASURED, NOT COPIED. Read each claim before moving it: this repo already records four`);
console.log(`peaks whose routes legitimately use different trailheads, and section 2 of`);
console.log(`audit:trailhead-road exists because a road block can survive the trailhead it described.`);
