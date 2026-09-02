// HOW BIG IS THE PROPAGATED-CAMP-LIST CLASS, AND CAN IT BE DETECTED? — 65 and NO.
//
// KEPT SO NOBODY REBUILDS IT. Two propagated camp lists have been split by hand (Goat Rocks /
// St. Helens; the Mountain Loop corridor) and this repo's rule is that an instance fixed by hand
// is not a class closed. So: measure the class, and try to rank it.
//
// THE MEASUREMENT IS REAL. 800 routes carry a bivy list across 149 distinct lists, and 65 of those
// lists appear on MORE THAN ONE area. That is the fingerprint both repairs had.
//
// THE RANKING IS NOT. Three signals were tried and ALL THREE flag known-correct data, each caught
// by a CONTROL rather than by reading the code:
//
//   1. DISTINCT TRAILHEADS PER GROUP. Wrong measure: trailheads are per-ROUTE, so ONE mountain
//      with many approaches scores highest — Mount Rainier / Liberty Cap topped it at 2.50.
//   2. TRAILHEAD DISJOINTNESS BETWEEN AREAS ("no two peaks here start from the same place"). This
//      is the signal that actually settled the Mountain Loop repair, and it puts the REPAIRED
//      Goat Rocks group — Gilbert / Ives / Old Snowy, three peaks 4.4 km apart correctly sharing
//      one basin's camps — at 100% and inside the top ten. Trailhead wording varies per route even
//      where peaks genuinely share a basin.
//   3. UNION-OF-PER-PEAK-CAMPS ("does the list name the group's own peaks?"). Defeated by
//      namesake features: "Boston Basin" matches Boston Peak, "Burgundy Col" matches Burgundy
//      Spire, "Agnes Creek" matches Agnes Mountain — a basin, a col and a creek sharing a proper
//      noun with the peak beside them. CLAUDE.md already records this exact failure one level up:
//      Whatcom Pass and Whatcom Camp are two places sharing a proper noun.
//
// THE CONTROLS ARE THE POINT. The two repairs left behind groups that are now CORRECT, and any
// detector ranking them high is wrong. Without checking against them, signal 2 would have shipped
// as a worklist with known-good data near the top.
//
// SO THIS IS A PROBE, NOT AN AUDIT, and the count is NOT a backlog. Most shared lists are genuine
// zone files: the Picket group shares one 15-area list off TWO trailheads (all Goodell Creek),
// Boston Basin serves Forbidden / Torment / Sharkfin / Boston / Sahale, the Enchantments share
// Colchuck Lake, and the Holden peaks share Holden Village. Flagging those would be a detector
// arguing with correct work.
//
// WHAT DOES WORK IS MANUAL AND IS PRINTED HERE: look for the route on one of these areas that does
// NOT carry the shared list. That author was not the propagation, so their list is an independent
// witness — it is how the Mountain Loop repair became decidable, and the tell was two camps
// appearing on Three Fingers x3 while the rest appeared x2.
//
// Signals are printed as CONTEXT. The sort is by area count, deliberately not by any of them.
import { selectAll } from "../lib/supabase-env.mjs";

const km = (a, b) => {
  const R = 6371, t = Math.PI / 180;
  const dLat = (b.lat - a.lat) * t, dLng = (b.lng - a.lng) * t;
  const s = Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * t) * Math.cos(b.lat * t) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
};

const areas = await selectAll("areas", "id,name,lat,lng,area_type", "", { pageSize: 1000 });
if (!areas.length) { console.log("FAIL CLOSED: zero areas read"); process.exit(1); }
const areaById = new Map(areas.map((a) => [a.id, a]));

const rows = await selectAll("routes", "id,name,area_id,bivy,approach_logistics",
  "bivy=not.is.null", { pageSize: 1000 });
if (!rows.length) { console.log("FAIL CLOSED: zero routes with a bivy list"); process.exit(1); }

const names = (r) => (Array.isArray(r.bivy) ? r.bivy : [])
  .map((s) => (s && s.name) || "").filter(Boolean);
// Sorted, so a list reordered by a later write still matches. Identity of the SET is the claim.
const key = (r) => names(r).slice().sort().join("  ");

const groups = new Map();
for (const r of rows) {
  const k = key(r);
  if (!k) continue;
  if (!groups.has(k)) groups.set(k, []);
  groups.get(k).push(r);
}
if (!groups.size) { console.log("FAIL CLOSED: no camp lists parsed"); process.exit(1); }

const findings = [];
for (const [k, rs] of groups) {
  const byArea = new Map();
  for (const r of rs) {
    if (!byArea.has(r.area_id)) byArea.set(r.area_id, []);
    byArea.get(r.area_id).push(r);
  }
  // A list confined to ONE area is the correct, ordinary case — several routes on a peak sharing
  // that peak's camps. Not reported.
  if (byArea.size < 2) continue;

  const pts = [...byArea.keys()].map((id) => areaById.get(id)).filter((a) => a && a.lat != null);
  let spread = null;
  for (let i = 0; i < pts.length; i++)
    for (let j = i + 1; j < pts.length; j++) {
      const d = km(pts[i], pts[j]);
      if (spread == null || d > spread) spread = d;
    }

  // Signal 1: an INDEPENDENT WITNESS — a route on one of these areas carrying a DIFFERENT list.
  // That author was not the propagation, which is what made the Mountain Loop repair decidable.
  let witnesses = 0;
  for (const aid of byArea.keys())
    for (const r of rows)
      if (r.area_id === aid && key(r) !== k) witnesses++;

  // Signal 2: do the AREAS share an approach? A camp serves a TRAILHEAD, not a map region, so if
  // no two peaks in the group start from the same place, one camp list cannot be right for all.
  //
  // COUNTING DISTINCT TRAILHEADS PER GROUP IS THE WRONG MEASURE and it put correct data on top:
  // trailheads are per-ROUTE, so ONE mountain with many approaches scores highest (Mount Rainier /
  // Liberty Cap: 5 trailheads, 2 areas). The question is disjointness BETWEEN areas, not variety.
  const thOf = (r) => {
    const t = (r.approach_logistics || {}).trailhead;
    return t ? String(t).toLowerCase().replace(/\s*\(.*$/, "").trim() : null;
  };
  const perArea = new Map();
  for (const r of rs) {
    if (!perArea.has(r.area_id)) perArea.set(r.area_id, new Set());
    const t = thOf(r);
    if (t) perArea.get(r.area_id).add(t);
  }
  const ths = new Set(rs.map(thOf).filter(Boolean));
  // An area is ISOLATED when it shares no trailhead with any other area in the group. An area with
  // NO recorded trailhead is not counted either way — absence is not disjointness.
  const entries = [...perArea.entries()].filter(([, v]) => v.size);
  let isolated = 0;
  for (const [aid, set] of entries) {
    const shares = entries.some(([bid, other]) =>
      bid !== aid && [...set].some((t) => other.has(t)));
    if (!shares) isolated++;
  }

  // Signal 3: is the list a UNION OF PER-PEAK CAMPS? That is what both repairs actually were.
  // The Mountain Loop list carried "Bathtub Lakes basin, EAST OF MOUNT PILCHUCK", "Big Four
  // north-side staging", "Whitehorse high camp" and "Three Fingers Lookout" — camps naming the
  // group's OWN peaks, one peak's camps handed to the next. A genuine BASIN zone does not look
  // like that: the repaired Goat Rocks list is Snowgrass Flat, Goat Lake, Chambers Lake, Conrad
  // Meadows — places, not peaks, and none of them names Gilbert, Ives or Old Snowy.
  //
  // Match on the group's area names with generic words dropped, so "Mountain"/"Peak" cannot match
  // everything. A camp naming a peak OUTSIDE the group is not this signature — that is one foreign
  // camp, which audit:camp-route-fit already asks about.
  const GEN = new Set(["mount","mountain","peak","the","spire","tower","rock","point","ridge"]);
  const marks = [...byArea.keys()]
    .map((id) => (areaById.get(id) || {}).name || "")
    .map((n) => n.toLowerCase().split(/\s+/).filter((w) => w && !GEN.has(w)).join(" "))
    .filter((m) => m.length >= 5);
  const campNames = names(rs[0]);
  const namesOwn = campNames.filter((c) => marks.some((m) => c.toLowerCase().includes(m))).length;

  findings.push({
    namesOwn, campsTotal: campNames.length,
    camps: names(rs[0]).length, routes: rs.length, areas: byArea.size,
    spread, witnesses, trailheads: ths.size, isolated, withTh: entries.length,
    areaNames: [...byArea.keys()].map((id) => (areaById.get(id) || {}).name || id),
    sample: names(rs[0]).slice(0, 3),
  });
}

console.log(`scanned ${rows.length} routes carrying a bivy list across ${groups.size} distinct lists\n`);
console.log(`${findings.length} list(s) appear on MORE THAN ONE area\n`);

// RANK BY TRAILHEADS-PER-AREA, not by size. A big shared list is the NORMAL, CORRECT case here:
// the Picket group shares one 15-area list off TWO trailheads (all Goodell Creek), and Boston Basin
// genuinely serves Forbidden, Torment, Sharkfin, Boston and Sahale — CLAUDE.md names that as the
// case a detector must not flag. What separated the Mountain Loop corridor was that EVERY peak had
// its OWN trailhead: four areas, four trailheads. If no two routes in a group share an approach,
// one camp list cannot be right for all of them.
//
// The ratio is a HYPOTHESIS RANK, never a verdict. A route with no recorded trailhead lowers it,
// and a legitimate zone reached from several roads (a long traverse) raises it.
for (const f of findings) {
  f.ratio = f.withTh ? f.isolated / f.withTh : 0;
  f.unionish = f.campsTotal ? f.namesOwn / f.campsTotal : 0;
}
// Sorted by AREA COUNT. None of the three signals above is usable as a rank — each flags a
// control that is known-correct — so they print as context and the order is neutral.
findings.sort((a, b) => (b.areas - a.areas) || (b.camps - a.camps));
for (const f of findings) {
  console.log(`  ${f.camps} camps on ${f.routes} route(s) across ${f.areas} area(s)` +
    (f.spread == null ? "" : ` — up to ${f.spread.toFixed(1)} km apart`));
  console.log(`     areas: ${f.areaNames.join(", ")}`);
  console.log(`     ${f.namesOwn} of ${f.campsTotal} camps NAME a peak in this group (${(f.unionish * 100).toFixed(0)}%)`);
  console.log(`     ${f.isolated} of ${f.withTh} area(s) share NO trailhead with another here` +
    ` (${(f.ratio * 100).toFixed(0)}%); ${f.trailheads} distinct trailhead(s);` +
    ` ${f.witnesses} route(s) on these areas carry a DIFFERENT list`);
  console.log(`     e.g. ${f.sample.join(" / ")}${f.camps > 3 ? " ..." : ""}`);
}

const own = findings.filter((f) => f.areas >= 3);
console.log(`\n${own.length} of these span THREE OR MORE areas.`);
console.log(`\nTHIS IS NOT A BACKLOG. Most are genuine zone files — the Pickets off Goodell Creek,`);
console.log(`Boston Basin, the Enchantments off Colchuck Lake, the Holden peaks. All three signals`);
console.log(`printed above flag one of those, so none is usable as a rank; see the header.`);
console.log(`\nCONTROL: Gilbert/Ives/Old Snowy is a REPAIRED group and is correct data now. Any`);
console.log(`detector that ranks it high is wrong — signal 2 did exactly that.`);
console.log("REPORT-ONLY. A shared list is a hypothesis: neighbouring peaks off one trailhead");
console.log("legitimately share camps. Read the rows, and look for the route that does NOT carry");
console.log("the list — that author is the witness.");
