// Agents only PROPOSE pin coordinates; this decides. For every waypoint lat/lng patch in a research
// output: the new point must be in Washington, the USGS ground elevation there must agree with the
// pin's own `elev` (after the file's patches), and it must not sit within 30 m of another pin on the
// route. A result with any failing pin loses ALL its patches (a half-moved pin is worse than none).
// usage: node verify-pins.mjs F1 F2 ...   (rewrites research/out/<f>.json in place, prints verdicts)
import fs from "node:fs";
const T = new URL("../../../audits/wa-owner-fixes", import.meta.url).pathname;
const R = Object.fromEntries(JSON.parse(fs.readFileSync(`${T}/wa-routes.json`)).map(r => [r.id, r]));
const TOL_FT = 200;
async function ground(lat, lng) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(`https://epqs.nationalmap.gov/v1/json?x=${lng}&y=${lat}&units=Feet&wkid=4326`);
      const v = +(await r.json()).value; if (Number.isFinite(v) && v > -1000) return v;
    } catch {}
    await new Promise(s => setTimeout(s, 1500 * (i + 1)));
  }
  return null;
}
const metres = (a, b) => { const k = Math.PI / 180, x = (b.lng - a.lng) * k * Math.cos((a.lat + b.lat) / 2 * k), y = (b.lat - a.lat) * k; return 6371000 * Math.hypot(x, y); };
for (const f of process.argv.slice(2)) {
  const p = `${T}/research/out/${f}.json`, j = JSON.parse(fs.readFileSync(p));
  for (const r of j.results || []) {
    const pins = {}; // index -> {lat,lng}
    for (const q of r.patches || []) if (q.column === "waypoints" && q.path?.length === 2 && ["lat", "lng"].includes(q.path[1])) (pins[q.path[0]] ||= {})[q.path[1]] = q.value;
    if (!Object.keys(pins).length) continue;
    const wps = structuredClone(R[r.id]?.waypoints || []);
    for (const q of r.patches) if (q.column === "waypoints" && q.op === "set" && q.path?.length === 2) wps[q.path[0]] && (wps[q.path[0]][q.path[1]] = q.value);
    const fails = [];
    for (const [i, c] of Object.entries(pins)) {
      const w = wps[i]; if (c.lat == null || c.lng == null) { fails.push(`pin ${i}: lat and lng must move together`); continue; }
      if (!(c.lat > 45.5 && c.lat < 49.1 && c.lng > -124.9 && c.lng < -116.9)) { fails.push(`pin ${i}: outside Washington`); continue; }
      const g = await ground(c.lat, c.lng);
      if (g == null) fails.push(`pin ${i}: ground elevation unavailable`);
      else if (w?.elev != null && Math.abs(g - w.elev) > TOL_FT) fails.push(`pin ${i} "${w.name}": ground ${Math.round(g)} ft vs claimed ${w.elev} ft`);
      else console.log(`  ok ${r.id} pin ${i} "${w?.name}": ground ${Math.round(g)} ft, claimed ${w?.elev}`);
      wps.forEach((o, k) => { if (String(k) !== i && o?.lat != null && metres(c, o) < 30) fails.push(`pin ${i}: within 30 m of pin ${k} "${o.name}"`); });
    }
    if (fails.length) { console.log(`REFUSED ${r.id} | ${r.fact}\n    ${fails.join("\n    ")}`); r.patches = []; r.verdict = "unresolved"; r.evidence = `[Pin check refused: ${fails.join("; ")}] ` + r.evidence; }
  }
  fs.writeFileSync(p, JSON.stringify(j, null, 1));
}
