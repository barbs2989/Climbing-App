import fs from "fs";
const base = "https://apps.fs.usda.gov/arcx/rest/services/EDW/EDW_TrailNFSPublish_01/MapServer/0/query";
const Q = JSON.parse(process.argv[2]);
const m = (a, b) => { const r = x => x * Math.PI / 180, h = Math.sin(r(b[1] - a[1]) / 2) ** 2 + Math.cos(r(a[1])) * Math.cos(r(b[1])) * Math.sin(r(b[0] - a[0]) / 2) ** 2; return 12742000 * Math.asin(Math.sqrt(h)); };
const out = {};
for (const [key, like, lat, lng, km] of Q) {
  const d = km / 111, e = km / (111 * Math.cos(lat * Math.PI / 180));
  const u = `${base}?where=${encodeURIComponent(`UPPER(TRAIL_NAME) LIKE '%${like}%'`)}&geometry=${lng - e},${lat - d},${lng + e},${lat + d}&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=TRAIL_NAME,TRAIL_NO,SEGMENT_LENGTH,BMP,EMP&returnGeometry=true&outSR=4326&f=json`;
  try { const j = await (await fetch(u, { signal: AbortSignal.timeout(45000), headers: { "User-Agent": "trailhead-research/1.0" } })).json();
    out[key] = j.features || []; console.log("##", key, (j.features || []).length, j.error ? JSON.stringify(j.error).slice(0, 120) : "");
    for (const f of (j.features || []).slice(0, 12)) { const p = f.geometry.paths.flat(); const a = p[0], b = p[p.length - 1]; console.log("  ", f.attributes.TRAIL_NAME, "#" + f.attributes.TRAIL_NO, "bmp", f.attributes.BMP, "emp", f.attributes.EMP, "| start", a[1].toFixed(6) + "," + a[0].toFixed(6), "end", b[1].toFixed(6) + "," + b[0].toFixed(6), "| to ref", Math.round(m(a, [lng, lat])), Math.round(m(b, [lng, lat]))); }
  } catch (err) { console.log("##", key, "ERR", String(err.message).slice(0, 80)); }
}
fs.writeFileSync(process.argv[3] || "usfstrail.json", JSON.stringify(out));
