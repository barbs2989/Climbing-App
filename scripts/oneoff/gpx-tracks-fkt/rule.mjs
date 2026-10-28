// Same rule as scripts/audit-track-completeness.mjs assessTrack, with loops instead of
// Math.min(...spread), which overflows the call stack on tracks of 10k+ points.
const R = 6371000, rad = d => d * Math.PI / 180;
export function haversineM(a, b) {
  const dLat = rad(b[0] - a[0]), dLng = rad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
const minTo = (pts, p) => { let m = Infinity; for (const q of pts) { const d = haversineM(q, p); if (d < m) m = d; } return m; };
export function assessTrack(gpx, waypoints) {
  const pts = gpx.map(p => [p[0], p[1]]);
  const wps = (waypoints || []).filter(w => w.lat != null && w.lng != null);
  const th = wps.filter(w => /trailhead|start|parking/i.test(w.type || "")).map(w => [w.lat, w.lng]);
  const sm = wps.filter(w => /summit/i.test(w.type || "")).map(w => [w.lat, w.lng]);
  const problems = [];
  if (!th.length) problems.push("no trailhead pin");
  else {
    const startM = Math.min(...th.map(t => haversineM(pts[0], t)));
    const endM = Math.min(...th.map(t => haversineM(pts.at(-1), t)));
    if (startM > 300) problems.push(`track starts ${Math.round(startM)} m from the trailhead`);
    if (endM > 300) problems.push(`track ends ${Math.round(endM)} m from the trailhead (one-way)`);
  }
  if (!sm.length) problems.push("no summit pin");
  else {
    const sumM = Math.min(...sm.map(s => minTo(pts, s)));
    if (sumM > 300) problems.push(`track misses the summit by ${Math.round(sumM)} m`);
  }
  return { complete: problems.length === 0, problems };
}
