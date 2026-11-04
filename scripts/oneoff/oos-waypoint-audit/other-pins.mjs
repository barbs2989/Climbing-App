// Phase 3 of the out-of-state waypoint audit: every pin that is neither the trailhead nor the
// summit, tested against the route's OWN frame. Read-only, local snapshot only.
//   node scripts/oneoff/oos-waypoint-audit/other-pins.mjs ROUTES.json CENSUS.json OUT.json
// A pin is flagged when it lies outside the corridor the route spans: further from BOTH the
// trailhead and the summit than they are from each other plus 3 km (a camp or junction on the way
// cannot be), or, on a route with no trailhead/summit pair, more than 15 km from the peak's own
// coordinate. Distances along the route (distMi) that run backwards are listed too.
import fs from "fs";
const [, , SNAP, CENSUS, OUT] = process.argv;
const routes = JSON.parse(fs.readFileSync(SNAP, "utf8"));
const census = Object.fromEntries(JSON.parse(fs.readFileSync(CENSUS, "utf8")).map(r => [r.id, r]));
const rad = Math.PI / 180;
const km = (a, b) => 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(Math.sin((b[0] - a[0]) * rad / 2) ** 2 + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin((b[1] - a[1]) * rad / 2) ** 2)));
const placed = w => w && w.lat != null && w.lng != null && Number.isFinite(+w.lat) && Number.isFinite(+w.lng);
const out = [];
for (const r of routes) {
  const c = census[r.id], w = r.waypoints;
  const th = w.find(x => placed(x) && /^trailhead$/i.test(x.type || "")), su = w.find(x => placed(x) && /^summit$/i.test(x.type || ""));
  const peak = c.peak && c.peak.lat != null ? [+c.peak.lat, +c.peak.lng] : null;
  const flags = [];
  for (const [i, p] of w.entries()) {
    if (!placed(p) || p === th || p === su) continue;
    const at = [+p.lat, +p.lng];
    if (th && su) {
      const span = km([+th.lat, +th.lng], [+su.lat, +su.lng]), a = km(at, [+th.lat, +th.lng]), b = km(at, [+su.lat, +su.lng]);
      if (Math.min(a, b) > span + 3) flags.push({ i, name: p.name, type: p.type, at, why: `outside corridor: ${a.toFixed(1)} km from trailhead, ${b.toFixed(1)} km from summit, span ${span.toFixed(1)} km` });
    } else if (peak) {
      const d = km(at, peak); if (d > 15) flags.push({ i, name: p.name, type: p.type, at, why: `${d.toFixed(1)} km from the peak` });
    }
  }
  let last = -1; for (const [i, p] of w.entries()) { const d = p && p.distMi != null && p.distMi !== "" ? +p.distMi : null; if (d == null) continue; if (d < last - 0.05 && !/descent|return|exit/i.test(p.name || "")) flags.push({ i, name: p.name, type: p.type, why: `distMi ${d} after ${last}` }); last = Math.max(last, d); }
  if (flags.length) out.push({ id: r.id, name: r.name, state: c.state, pins: w.length, flags });
}
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log(routes.length, "routes;", out.length, "with flagged pins;", out.reduce((a, r) => a + r.flags.length, 0), "flags");
for (const r of out) for (const f of r.flags) console.log(r.state.slice(0, 5), r.id, "#" + f.i, f.type, "|", f.name, "|", f.why);
