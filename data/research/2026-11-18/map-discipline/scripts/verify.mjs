// Merge agent findings with official + OSM points; decide write / hold per route. Read-only.
import fs from "fs";
const D = "C:/Users/nate_/.claude/jobs/be35cfe5/tmp/research/";
const items = new Map(JSON.parse(fs.readFileSync(D + "items.json")).map(i => [i.id, i]));
const osmCells = fs.existsSync(D + "osm-trailheads.json") ? JSON.parse(fs.readFileSync(D + "osm-trailheads.json")) : {};
const gnis = JSON.parse(fs.readFileSync(D + "gnis.json"));
const osmNames = fs.existsSync(D + "osm-names.json") ? JSON.parse(fs.readFileSync(D + "osm-names.json")) : {};
const osm = []; const seen = new Set();
for (const els of Object.values(osmCells)) for (const e of els) { const k = e.type + e.id; if (!seen.has(k) && e.lat != null && e.name) { seen.add(k); osm.push(e); } }
const m = (a, b) => { const r = x => x * Math.PI / 180, h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2; return 12742000 * Math.asin(Math.sqrt(h)); };
const GENERIC = new Set("trailhead trail head th parking lot area the of at and a to road rd lower upper main north south east west usfs fs fr forest service national park nps lot day use overflow access".split(" "));
const toks = s => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter(t => t && !GENERIC.has(t) && !/^\d+$/.test(t));
// Our name's MAIN part only: "The Garden Trailhead (Keene Valley)" -> "The Garden Trailhead",
// "Silver Creek/Grizzly Gulch Trailhead" -> "Silver Creek". Every one of its words must be in the other name.
const mainName = s => String(s || "").replace(/\(.*?\)/g, " ").split(/\s*[\/,;]\s*/)[0];
const nameMatch = (a, b) => { const A = toks(mainName(a)), B = new Set(toks(b)); return A.length > 0 && A.every(t => B.has(t)); };
const PUB = s => { s = String(s || "").toLowerCase(); if (s.includes("usfs")) return "usfs"; if (s.includes("nps")) return "nps"; if (s.includes("osm")) return "osm"; if (/nysdec|dec\b|state|recreation\.gov|ridb/.test(s)) return "agency"; if (s.includes("wta")) return "wta"; return "other"; };
const ANCHOR = new Set(["usfs", "nps", "agency", "osm"]);
const WEAK = /conflict|contradict|infer|assum|moderate|weak|not confirmed|unconfirmed|verify|guess|may not|uncertain|thin|lower confidence|low confidence|by name only|nearest named/i;

const out = { write: [], hold: [], summit: [], summitHold: [], stuck: [] };
// A second-pass answer (out2/) replaces the first-pass one (out/) for the same route.
const latest = new Map();
for (const dir of ["out", "out2", "out3", "out4", "out5"]) {
  if (!fs.existsSync(D + dir)) continue;
  for (const f of fs.readdirSync(D + dir).filter(f => /^([crpq]\d+|pb)\.json$/.test(f)).sort()) {
    let arr; try { arr = JSON.parse(fs.readFileSync(D + dir + "/" + f)); } catch (e) { console.error("bad json", dir, f); continue; }
    for (const r of arr) {
      if (!r || !r.id) continue;
      // The third pass (out4) often carried an earlier answer forward and re-labelled it "found".
      // It replaces the earlier answer only when it cites a page the earlier answer did not.
      if ((dir === "out4" || dir === "out5") && latest.has(r.id)) {
        const prev = latest.get(r.id).r, url = x => (x && x.trailhead && x.trailhead.identifiedBy && x.trailhead.identifiedBy.url) || "";
        const pts = x => ((x && x.trailhead && x.trailhead.placements) || []).filter(p => p && Number.isFinite(+p.lat) && Number.isFinite(+p.lng)).map(p => ({ lat: +p.lat, lng: +p.lng }));
        const newPlacement = pts(r).some(p => !pts(prev).some(q => m(p, q) <= 50));
        const newPage = !!url(r) && url(r) !== url(prev);
        if (r.status === "found" && !newPage && !newPlacement) continue;
      }
      latest.set(r.id, { r, f: dir + "/" + f });
    }
  }
}
{
  for (const { r, f } of latest.values()) {
    const it = items.get(r.id); if (!it) continue;
    const peak = it.peak;
    // ── summit ──
    if (it.verdict === "NO_SUMMIT" && r.reachesSummit !== undefined && r.reachesSummit !== null) {
      const g = (gnis[peak.id] || {}).gnis || [];
      const hit = g.find(x => x.km != null && x.km <= 0.05);
      if (r.reachesSummit === true && hit) out.summit.push({ id: r.id, area: peak.id, name: peak.name, lat: hit.lat, lng: hit.lng, elevFt: peak.elevation_ft, gaz_id: hit.gaz_id, evidence: r.summitEvidence, chunk: f });
      else out.summitHold.push({ id: r.id, reaches: r.reachesSummit, why: r.reachesSummit !== true ? "route does not (or may not) reach the summit" : "no USGS summit point within 50 m of the stored peak", chunk: f });
    }
    // ── trailhead ──
    const needTh = it.verdict === "SUMMIT_ONLY" || (it.verdict === "NO_SUMMIT" && !(it.waypoints || []).some(w => /trailhead/i.test(w.type || "")));
    if (!needTh) continue;
    if (r.status !== "found" || !r.trailhead || !r.trailhead.name) { out.stuck.push({ id: r.id, why: (r.notes || "").slice(0, 160), chunk: f }); continue; }
    const th = r.trailhead;
    const pl = (th.placements || []).filter(p => p && Number.isFinite(+p.lat) && Number.isFinite(+p.lng)).map(p => ({ pub: PUB(p.source), name: p.name || th.name, lat: +p.lat, lng: +p.lng, url: p.url || "" }));
    if (peak.lat != null) for (const e of osm) { if ((e.kind === "trailhead" || e.kind === "parking") && nameMatch(th.name, e.name) && m(peak, e) < 30000) pl.push({ pub: "osm", name: e.name, lat: e.lat, lng: e.lng, url: `https://www.openstreetmap.org/${e.type}/${e.id}` }); }
    // Per-route OSM name lookups (osm-names.mjs): a trailhead/parking node whose name matches this
    // route's named trailhead, within 25 km of the peak.
    const byName = osmNames[r.id];
    if (byName && Array.isArray(byName.hits)) for (const e of byName.hits) if (e.lat != null && nameMatch(th.name, e.name || "")) pl.push({ pub: "osm", name: e.name, lat: e.lat, lng: e.lng, url: `https://www.openstreetmap.org/${e.type}/${e.id}` });
    const anchors = pl.filter(p => ANCHOR.has(p.pub) && (peak.lat == null || m(peak, p) < 30000));
    const reasons = [];
    if (!anchors.length) reasons.push(pl.length ? "only non-land-manager placements (" + [...new Set(pl.map(p => p.pub))].join(",") + ")" : "no placement");
    if (WEAK.test((r.notes || "") + " " + JSON.stringify(th.identifiedBy || {}))) reasons.push("agent flagged the identification as inferred/weak");
    if (!th.identifiedBy || !String(th.identifiedBy.fact || "").trim()) reasons.push("no identification evidence");
    // choose: official first, then OSM; prefer an anchor that another publisher corroborates within 50 m
    const ranked = anchors.map(a => ({ a, agree: pl.filter(p => p.pub !== a.pub && m(a, p) <= 50) })).sort((x, y) => y.agree.length - x.agree.length || (x.a.pub === "osm") - (y.a.pub === "osm"));
    const best = ranked[0];
    // two land-manager/OSM placements that DISAGREE by > 300 m about one named trailhead = conflict
    if (best && anchors.some(p => m(best.a, p) > 300 && nameMatch(th.name, p.name))) reasons.push("placements disagree by > 300 m");
    const rec = { id: r.id, area: peak.id, trailhead: th.name, identifiedBy: th.identifiedBy, chunk: f, notes: (r.notes || "").slice(0, 200) };
    if (reasons.length) { out.hold.push({ ...rec, reasons, placements: pl.slice(0, 4) }); continue; }
    out.write.push({ ...rec, lat: +best.a.lat.toFixed(6), lng: +best.a.lng.toFixed(6), pub: best.a.pub, url: best.a.url, corroborated: best.agree.map(p => ({ pub: p.pub, url: p.url, d: Math.round(m(best.a, p)) })), kmFromPeak: peak.lat != null ? +(m(peak, best.a) / 1000).toFixed(1) : null });
  }
}
fs.writeFileSync(D + "verified.json", JSON.stringify(out, null, 1));
const locked = out.write.filter(w => w.corroborated.length).length;
console.log(`OSM points loaded: ${osm.length} from ${Object.keys(osmCells).length} cells`);
console.log(`trailheads: write ${out.write.length} (locked ${locked}, unconfirmed ${out.write.length - locked}) · hold ${out.hold.length} · stuck ${out.stuck.length}`);
console.log(`summit pins: write ${out.summit.length} · hold ${out.summitHold.length}`);
const hr = {}; for (const h of out.hold) for (const x of h.reasons) hr[x.replace(/\(.*\)/, "()")] = (hr[x.replace(/\(.*\)/, "()")] || 0) + 1; console.log("hold reasons:", hr);
