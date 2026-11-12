// SummitPost harvester — paste into the owner's Chrome (javascript_tool), on https://www.summitpost.org/robots.txt
// AFTER one real SummitPost page (a search URL) has cleared Cloudflare in that tab (~8 s). See README "Then SummitPost".
// 1. Set ST and PEAKS (peaks-compact.json: [[area_id, name, lat, lng], ...]) below.
// 2. Paste as one call. ONE worker, 800 ms between fetches (~6 s a peak).
// 3. Poll: ({i:__SP.i, n:PEAKS.length, done:__SP.done, blocked:__SP.blocked, stats:__SP.stats}). At the end __spSave() downloads
//    sp-<ST>.json (ONE file, so Chrome never asks to allow multiple downloads). __spSave(k) saves a partial.
// Per peak: the SummitPost peak page within 2 km of our coordinate (name variants tried), its sections, and
// every route page: info table, sections, and the GPX it offers (download.php?f=<id>.gpx) as [lat,lng,ele]
// points. <time> is DROPPED here — we never store it. Returns counts only (javascript_tool blocks hrefs).
const ST = "wa";
const STATE = "Washington";
const PEAKS = window.__PEAKS || [/* [[area_id, name, lat, lng], ...] */];

// RESUME: re-pasting keeps every peak an earlier run in this tab FOUND and redoes only the rest.
const KEEP = ((window.__SP && window.__SP.out) || []).filter(r => r.found);
window.__SP = { i: 0, done: false, out: KEEP, stats: { found: KEEP.length, notFound: 0, routes: 0, gpx: 0, err: 0 } };
const SP = window.__SP, PR = new DOMParser(), sleep = ms => new Promise(r => setTimeout(r, ms));
// Cloudflare re-challenges SEARCH urls (object_list.php) after ~30 min while plain pages still load: a 403
// "Just a moment" then is NOT a miss. get() waits (SP.blocked = true) and retries every 30 s for up to 20 min;
// clear it by opening any search URL in a SECOND tab of the same window (the cookie is shared) — this tab keeps its state.
async function get(u) { for (let k = 0; k < 40; k++) { try { const r = await fetch(u, { credentials: "include" }); await sleep(800); const t = await r.text(); if (/Just a moment/.test(t.slice(0, 2000))) { SP.blocked = true; await sleep(30000); continue; } SP.blocked = false; if (!r.ok) { SP.stats.err++; return null; } return t; } catch { SP.stats.err++; await sleep(800); return null; } } SP.stats.err++; return null; }
const hav = (a, b, c, d) => { const R = 6371e3, r = Math.PI / 180, x = Math.sin((c - a) * r / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin((d - b) * r / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };
function names(n) { n = n.replace(/ (Routes|Climbs)$/, "").replace(/^(.+), The$/, "The $1").replace(/ \(.*\)$/, ""); const v = new Set([n]); v.add(n.replace(/^Mount /, "Mt. ")); v.add(n.replace(/^Mt.? /, "Mount ")); for (const x of [...v]) v.add(x.replace(/['’]/g, "")); v.add(n.replace(/^Mount /, "")); v.add(n.replace(/ (Peak|Mountain)$/, "")); v.add(n.replace(/^The /, "")); return [...v].filter(Boolean); }
function latlon(html) { const text = html.replace(/<[^>]+>/g, " ").replace(/&deg;/g, "°").replace(/\s+/g, " "); const m = text.match(/Lat\/Lon:\s*([\d.]+)\s*(?:°|&deg;)\s*([NS])\s*\/\s*([\d.]+)\s*(?:°|&deg;)\s*([EW])/); return m ? [(m[2] === "S" ? -1 : 1) * +m[1], (m[4] === "W" ? -1 : 1) * +m[3]] : null; }
const clean = h => h.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<br\s*\/?>|<\/p>|<\/li>/gi, "\n").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&deg;/g, "°").replace(/&amp;/g, "&").replace(/&#0?39;|&rsquo;/g, "'").replace(/&quot;|&ldquo;|&rdquo;/g, '"').replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();
function sections(html) { const out = {}; const parts = html.split(/<h2[^>]*>/i).slice(1); for (const p of parts) { const end = p.indexOf("</h2>"); if (end < 0) continue; const head = clean(p.slice(0, end)); if (!head || head.length > 60 || /^(Images|Children|Parents|Additions|External Links)/.test(head)) continue; out[head] = clean(p.slice(end + 5)).slice(0, 6000); } return out; }
function info(html) { const d = PR.parseFromString(html, "text/html"), o = {}; d.querySelectorAll("table tr").forEach(tr => { const m = tr.textContent.replace(/\s+/g, " ").trim().match(/^(Page Type|Lat\/Lon|Activities|Elevation|Route Type|Time Required|Difficulty|Rock Difficulty|Grade|Season|Number of Pitches|Location|Date Climbed|Object Title)\s*:\s*(.{1,200})$/); if (m && !o[m[1]]) o[m[1]] = m[2]; }); o.title = (d.querySelector("h1")?.textContent || "").trim(); return o; }
async function gpxOf(html) { const ids = [...new Set([...html.matchAll(/download\.php\?f=(\d+)\.gpx/g)].map(m => m[1]))]; const out = []; for (const f of ids) { const t = await get(`/download.php?f=${f}.gpx`); if (!t) continue; const pts = [...t.matchAll(/<(?:trkpt|rtept)\s+lat="([-\d.]+)"\s+lon="([-\d.]+)"[^>]*>(?:[\s\S]*?<ele>([-\d.]+)<\/ele>)?/g)].map(m => [+m[1], +m[2], m[3] != null ? +m[3] : null]); const wpts = [...t.matchAll(/<wpt\s+lat="([-\d.]+)"\s+lon="([-\d.]+)"[^>]*>[\s\S]*?(?:<name>([^<]*)<\/name>)?[\s\S]*?<\/wpt>/g)].map(m => [+m[1], +m[2], m[3] || ""]); out.push({ f, pts, wpts, hadTime: /<time>/.test(t) }); SP.stats.gpx++; } return out; }
// SummitPost's NAME search misses pages with no state field (Chair Peak) and then returns a generic list;
// its NEARBY search (the link behind every page's Lat/Lon) lists pages by distance — try that first.
const words = n => n.toLowerCase().normalize("NFD").replace(/[^a-z0-9 ]/g, "").split(" ").filter(w => w.length > 2 && !/^(mount|peak|mountain|the)$/.test(w));
async function findPeak(name, lat, lng) {
  const seen = new Set();
  if (lat != null) {
    const t = await get(`/object_list.php?object_type=1&distance_lat_1=${lat}&distance_lon_1=${lng}`);
    const hrefs = t ? [...new Set([...PR.parseFromString(t, "text/html").querySelectorAll("a")].map(a => a.getAttribute("href") || "").filter(h => /^\/[a-z0-9-]+\/\d+$/.test(h)))].slice(0, 15) : [];
    for (const n of names(name)) { const want = words(n); if (!want.length) continue; for (const h of hrefs) { if (seen.has(h)) continue; const slugWords = h.split("/")[1].split("-"); if (!want.every(w => slugWords.includes(w))) continue; seen.add(h); const p = await get(h); if (!p) continue; const ll = latlon(p); if (ll && hav(lat, lng, ll[0], ll[1]) <= 2000) return { href: h, html: p, ll, dM: Math.round(hav(lat, lng, ll[0], ll[1])), via: "nearby" }; } }
  }
  for (const n of names(name)) {
    const t = await get(`/object_list.php?object_type=1&object_name_1=${encodeURIComponent(n)}&state_province_1=${encodeURIComponent(STATE)}`); if (!t) continue;
    const hrefs = [...new Set([...PR.parseFromString(t, "text/html").querySelectorAll("a")].map(a => a.getAttribute("href") || "").filter(h => /^\/[a-z0-9-]+\/\d+$/.test(h)))];
    for (const h of hrefs.slice(0, 6)) { if (seen.has(h)) continue; seen.add(h); const slugWords = h.split("/")[1].split("-"); const want = n.toLowerCase().replace(/[^a-z0-9 ]/g, "").split(" ").filter(w => w.length > 2 && !/^(mount|peak|mountain|the)$/.test(w)); if (want.length && !want.every(w => slugWords.includes(w))) continue; const p = await get(h); if (!p) continue; const ll = latlon(p); if (ll && lat != null && hav(lat, lng, ll[0], ll[1]) <= 2000) return { href: h, html: p, ll, dM: Math.round(hav(lat, lng, ll[0], ll[1])) }; }
  }
  return null;
}
async function doPeak([area_id, name, lat, lng]) {
  const pk = await findPeak(name, lat, lng);
  if (!pk) { SP.stats.notFound++; return { area_id, name, found: false }; }
  SP.stats.found++;
  const [, slug, id] = pk.href.split("/");
  const rec = { area_id, name, found: true, sp: { id, slug, ll: pk.ll, dM: pk.dM, info: info(pk.html) }, sections: sections(pk.html), gpx: await gpxOf(pk.html), routes: [] };
  const rl = await get(`/${slug}/routes/p-${id}`);
  const hrefs = rl ? [...new Set([...PR.parseFromString(rl, "text/html").querySelectorAll("a")].map(a => a.getAttribute("href") || "").filter(h => /^\/[a-z0-9-]+\/\d+$/.test(h) && h !== pk.href))] : [];
  for (const h of hrefs.slice(0, 25)) {
    const p = await get(h); if (!p) continue; const inf = info(p);
    if (!/Route/i.test(inf["Page Type"] || "") && !inf["Route Type"]) continue;
    rec.routes.push({ id: h.split("/")[2], slug: h.split("/")[1], info: inf, ll: latlon(p), sections: sections(p), gpx: await gpxOf(p) }); SP.stats.routes++;
  }
  return rec;
}
window.__spSave = (k) => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(SP.out)], { type: "application/json" })); a.download = `sp-${ST}${k ? "-part" + k : ""}.json`; document.body.appendChild(a); a.click(); a.remove(); return SP.out.length; };
(async () => { for (; SP.i < PEAKS.length; SP.i++) { if (KEEP.some(r => r.area_id === PEAKS[SP.i][0])) continue; try { SP.out.push(await doPeak(PEAKS[SP.i])); } catch (e) { SP.stats.err++; SP.out.push({ area_id: PEAKS[SP.i][0], error: String(e).slice(0, 200) }); } } SP.done = true; window.__spSave(); })();
"started " + PEAKS.length;
