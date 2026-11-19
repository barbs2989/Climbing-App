// verified.json + a FRESH read of each row -> enrich:apply batch (approach_logistics / waypoints + ledger).
import fs from "fs";
const L = "file:///C:/Users/nate_/dev/Climbing-App/.claude/worktrees/map-pins-per-discipline/scripts/lib/supabase-env.mjs";
const { selectAll, requireServiceKey } = await import(L);
const D = "C:/Users/nate_/.claude/jobs/be35cfe5/tmp/research/";
const v = JSON.parse(fs.readFileSync(D + "verified.json"));
const usfs = JSON.parse(fs.readFileSync(D + "usfs-trailheads.json"));
const key = requireServiceKey();
const TODAY = "2026-11-18";
const m = (a, b) => { const r = x => x * Math.PI / 180, h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2; return 12742000 * Math.asin(Math.sqrt(h)); };
const usfsUrl = p => { const hit = usfs.find(u => u.lat != null && m(u, p) < 2); return hit ? `https://apps.fs.usda.gov/arcx/rest/services/EDW/EDW_InfraRecreationSites_01/MapServer/0/query?where=site_cn%3D%27${hit.cn}%27&outFields=site_name&f=json` : "https://apps.fs.usda.gov/arcx/rest/services/EDW/EDW_InfraRecreationSites_01/MapServer/0"; };
const npsUrl = name => `https://mapservices.nps.gov/arcgis/rest/services/NationalDatasets/NPS_Public_POIs_Geographic/FeatureServer/0/query?where=${encodeURIComponent(`POINAME='${String(name).replace(/'/g, "''")}'`)}&outFields=POINAME&f=json`;
const evOf = (pub, url, name, lat, lng) => ({ url: url || (pub === "usfs" ? usfsUrl({ lat, lng }) : pub === "nps" ? npsUrl(name) : ""), fact: `${name} ${(+lat).toFixed(5)},${(+lng).toFixed(5)}`.split(/\s+/).slice(0, 20).join(" "), retrieved_at: TODAY, ...(pub === "usfs" || pub === "nps" ? { official: true } : {}) });

// Pass 5 releases, read by hand: the hold was a filter false-trip, not a doubt (see REPORT.md).
//  Thunder: note says "upgraded FROM inferred" (trip report of this exact line starts at Roads End).
//  Lassen: the park's own trail page; two NPS points 70 m apart.  Giraud: name matcher reduced "South Lake" to "lake"
//  and matched Red Lake / Lake Sabrina; USFS South Lake + a second page within 35 m.  Baldwin: signed USFS
//  "Convict Lake Trailhead" lot.  Colvin Gill Brook: the "conflict" was a page's summit elevation, not the trailhead.
const RELEASE = { ca_thunder_mountain_sierra_thunder_col_and_east_ridge: "nps", ca_lassen_peak_trail: "Lassen Peak Trailhead Parking",
  ca_giraud_peak_standard_route: "usfs", ny_mount_colvin_gill_brook_trail: "agency" };
for (const h of v.hold) { const k = RELEASE[h.id]; if (!k) continue;
  const p = h.placements.find(p => p.pub === k || p.name === k); if (!p) { console.log("release: no point", h.id); continue; }
  const near = h.placements.filter(q => q !== p && q.pub !== p.pub && m(p, q) <= 50).map(q => ({ pub: q.pub, url: q.url, d: Math.round(m(p, q)) }));
  v.write.push({ id: h.id, area: h.area, trailhead: h.trailhead, identifiedBy: h.identifiedBy, chunk: h.chunk + " (released by hand)", notes: h.notes, lat: +p.lat.toFixed(6), lng: +p.lng.toFixed(6), pub: p.pub, url: p.url, corroborated: near, kmFromPeak: null }); }
const ids = [...new Set([...v.write.map(w => w.id), ...v.summit.map(s => s.id)])];
const rows = [];
for (let i = 0; i < ids.length; i += 40) rows.push(...await selectAll("routes", "id,area_id,approach_logistics,waypoints", `id=in.(${ids.slice(i, i + 40).map(x => `"${x}"`).join(",")})`, { key, pageSize: 100 }));
const R = new Map(rows.map(r => [r.id, r]));
const batch = {}, skipped = [];
// Removed by hand: the only placement is the Goodell Creek CAMPGROUND (OSM relation 20164855), not a trailhead lot,
// and Upper vs Lower Goodell Creek was never settled.
const HAND_HOLD = new Set(["wa_himmelhorn_stonehenge", "wa_himmelhorn_wild_hair_crack"]);
// Pass 5: every Goodell Creek start rests on that same campground point; Earl Peak's two points disagree by 2 km.
const HAND_HOLD_RE = /goodell/i, HAND_HOLD_IDS = new Set(["wa_earl_peak_standup_creek_route"]);

for (const w of v.write) {
  if (HAND_HOLD_IDS.has(w.id) || HAND_HOLD_RE.test(w.trailhead)) { skipped.push([w.id, "held by hand: Goodell campground point / points disagree"]); continue; }
  if (HAND_HOLD.has(w.id)) { skipped.push([w.id, "held by hand: placed on a campground, not a trailhead"]); continue; }
  const r = R.get(w.id); if (!r) { skipped.push([w.id, "row not found"]); continue; }
  if (r.area_id !== w.area) { skipped.push([w.id, `area is ${r.area_id}, expected ${w.area}`]); continue; }
  const al = r.approach_logistics && typeof r.approach_logistics === "object" ? { ...r.approach_logistics } : {};
  if (al.trailheadLat != null) { skipped.push([w.id, "already has a trailhead coordinate"]); continue; }
  if ((Array.isArray(r.waypoints) ? r.waypoints : []).some(x => /trailhead/i.test(x && x.type || "") && x.lat != null)) { skipped.push([w.id, "already has a Trailhead pin"]); continue; }
  if (al.trailhead && String(al.trailhead).trim() && !String(al.trailhead).toLowerCase().includes(String(w.trailhead).toLowerCase().split(/[ (/]/)[0])) { skipped.push([w.id, `stored trailhead name "${al.trailhead}" differs from "${w.trailhead}"`]); continue; }
  if (!al.trailhead) al.trailhead = w.trailhead;
  al.trailheadLat = w.lat; al.trailheadLng = w.lng;
  const evidence = [evOf(w.pub, w.url, w.trailhead, w.lat, w.lng), ...w.corroborated.map(c => evOf(c.pub, c.url, w.trailhead + " (within " + c.d + " m)", w.lat, w.lng))].filter(e => e.url);
  const locked = new Set(evidence.map(e => { try { return new URL(e.url).hostname.split(".").slice(-2).join("."); } catch { return ""; } })).size >= 2;
  batch[w.id] = { area: w.area, set: { approach_logistics: al },
    ledger: [{ field: "approach_logistics", value: al, method: locked ? "agree-2" : "single-source", level: locked ? "locked" : "unconfirmed", evidence }],
    review: { identifiedBy: w.identifiedBy, chunk: w.chunk, kmFromPeak: w.kmFromPeak } };
}
// Removed by hand after reading the routes: they top out on a SUB-summit, not the peak the pin marks.
const SUB_SUMMIT = new Set(["wa_silver_star_ne_ridge", "wa_three_queens_middle_peak", "wa_three_queens_west_peak"]);
for (const s of v.summit) {
  if (SUB_SUMMIT.has(s.id)) { skipped.push([s.id, "tops out on a sub-summit (excluded by hand)"]); continue; }
  const r = R.get(s.id); if (!r) { skipped.push([s.id, "row not found"]); continue; }
  if (r.area_id !== s.area) { skipped.push([s.id, `area is ${r.area_id}, expected ${s.area}`]); continue; }
  const wps = Array.isArray(r.waypoints) ? r.waypoints : [];
  if (wps.some(x => /summit|topout/i.test(x && x.type || ""))) { skipped.push([s.id, "already has a Summit pin"]); continue; }
  const pin = { name: s.name, type: "Summit", lat: +s.lat.toFixed(6), lng: +s.lng.toFixed(6), ...(s.elevFt ? { elevFt: s.elevFt } : {}) };
  const e = batch[s.id] || { area: s.area, set: {}, ledger: [], review: {} };
  e.set.waypoints = [...wps, pin];
  e.ledger.push({ field: `waypoints/${s.name}`, value: pin, method: "single-source", level: "unconfirmed",
    evidence: [{ url: `https://carto.nationalmap.gov/arcgis/rest/services/geonames/MapServer/5/query?where=gaz_id%3D${s.gaz_id}&outFields=gaz_name&f=json`, fact: `USGS GNIS ${s.gaz_id} ${s.name} summit`, retrieved_at: TODAY, official: true }] });
  e.review.summit = { evidence: s.evidence };
  batch[s.id] = e;
}
fs.writeFileSync(D + "batch.json", JSON.stringify(batch, null, 1));
fs.writeFileSync(D + "batch-skipped.json", JSON.stringify(skipped, null, 1));
const ent = Object.values(batch);
console.log(`batch entries ${ent.length}: trailheads ${ent.filter(e => e.set.approach_logistics).length} (locked ${ent.filter(e => e.ledger.some(l => l.field === "approach_logistics" && l.level === "locked")).length}), summit pins ${ent.filter(e => e.set.waypoints).length}; skipped ${skipped.length}`);
skipped.forEach(s => console.log("  skip", s[0], "-", s[1]));
