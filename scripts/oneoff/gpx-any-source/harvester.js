// Peakbagger harvester — paste into the owner's Chrome (Claude in Chrome javascript_tool) on ANY
// www.peakbagger.com page, AFTER its Cloudflare check has passed (~5 s). It runs in the page, so it uses
// the owner's own session (licence holder). It never renders other pages: it only fetch()es them.
//
// 1. Set PEAKS below to the compact list from peaks.mjs: [[area_id, name, lat, lng], ...]
//    (node -e "...peaks.json -> [[id,name,lat,lng]]", see README.md).
// 2. Paste this whole file as one javascript_tool call. It starts TWO workers (front + back of the list,
//    meeting in the middle, never fetching a peak twice) and returns at once.
// 3. Poll: ({f:__H.i, b:__W.j, stats:__H.stats}). Files download every 20 peaks as pb-<ST>-NN.json and
//    pb-<ST>-w2-NN.json (Chrome must allow automatic downloads for peakbagger.com — the owner clicks
//    Allow once). When both __H.done and __W.done: run __saveAll() for the all-ascents file.
//
// Fixed traps (2026-11-04, WA): the ascent list shows only the MOST RECENT YEAR unless &y=9999;
// header cells use NBSP ("Ascent&nbsp;Date"); a 1-cell "Summary" row wraps the whole page, so a section
// label longer than 40 chars is not a label; javascript_tool refuses output that contains query
// strings, so never return hrefs — return counts and text.
const ST = "wa";
const PEAKS = [/* [[area_id, name, lat, lng], ...] */];

const sleep = ms => new Promise(r => setTimeout(r, ms)); const P = new DOMParser();
async function get(u) { for (let t = 0; t < 3; t++) { try { const r = await fetch(u, { credentials: "include" }); if (r.ok) { const x = await r.text(); if (/<title>Just a moment/i.test(x.slice(0, 3000))) { await sleep(6000); continue; } return x; } } catch (e) {} await sleep(2500); } return null; }
const hav = (a, b, c, d) => { const R = 6371000, r = x => x * Math.PI / 180; const h = Math.sin(r(c - a) / 2) ** 2 + Math.cos(r(a)) * Math.cos(r(c)) * Math.sin(r(d - b) / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
function names(n) { const s = new Set([n]); s.add(n.replace(/\s*\(.*\)/, "")); s.add(n.replace(/ (Routes|Climbs)$/, "")); s.add(n.replace(/^(.*), The( Routes)?$/, "The $1")); s.add(n.replace(/^The /, "")); s.add(n.replace(/^Mount /, "Mt. ")); s.add(n.replace(/^Mt\.? /, "Mount ")); for (const v of [...s]) s.add(v.replace(/['’]/g, "")); return [...s].filter(Boolean); }
// 2026-11-05 (OR): Peakbagger's search is literal: "Mt. Washington" and "Pete's Point" return nothing,
// "Mount Washington" and "Petes Point" match. Try Mount for Mt., and every variant without apostrophes.
// STATE_RE: which Peakbagger location strings count (WA also takes BC border peaks)
const STATE_RE = /USA-WA|Canada-BC/;
async function findPid(name, lat, lng) {
  const cands = new Map();
  for (const n of names(name)) { const x = await get("/search.aspx?tid=M&ss=" + encodeURIComponent(n) + "&lat=&lon=&nat=0&sta=0"); await sleep(600); if (!x) continue; const d = P.parseFromString(x, "text/html"); d.querySelectorAll('a[href*="peak.aspx?pid="]').forEach(a => { const tr = a.closest("tr"); if (tr && STATE_RE.test(tr.textContent)) cands.set(a.getAttribute("href").split("pid=")[1].split("&")[0], a.textContent.trim()); }); if (cands.size >= 1 && n === name) break; }
  let best = null;
  for (const [pid, nm] of [...cands].slice(0, 8)) { const x = await get("/peak.aspx?pid=" + pid); await sleep(600); if (!x) continue; const m = x.match(/(-?\d{1,3}\.\d{3,}),\s*(-?\d{1,3}\.\d{3,})\s*\(Dec Deg\)/); if (!m) continue; const dm = hav(lat, lng, +m[1], +m[2]); if (!best || dm < best.dm) best = { pid, nm, lat: +m[1], lng: +m[2], dm: Math.round(dm), html: x }; }
  if (best) { if (best.dm <= 2000) { const e = P.parseFromString(best.html, "text/html"); e.querySelectorAll("script,style").forEach(s => s.remove()); best.info = [...e.querySelectorAll("tr")].filter(r => r.children.length === 2 && /^(Elevation Info|Latitude\/Longitude|Ownership|Name Info|Highest Summit|Subpeaks)/.test(r.children[0].textContent.trim())).map(r => [r.children[0].textContent.trim(), r.children[1].textContent.trim().replace(/\s+/g, " ").slice(0, 400)]); } delete best.html; }
  return best;
}
window.__ALL = window.__ALL || {};
async function ascents(pid) {
  const x = await get("/climber/PeakAscents.aspx?pid=" + pid + "&y=9999"); await sleep(600); if (!x) return null;
  const d = P.parseFromString(x, "text/html");
  const hdr = [...d.querySelectorAll("tr")].find(r => { const t = [...r.children].map(c => c.textContent.trim()); return t.includes("Climber") && t.includes("GPS"); }); if (!hdr) return [];
  const cols = [...hdr.children].map(c => c.textContent.replace(/ /g, " ").trim().split("\n")[0].trim());
  const ix = re => cols.findIndex(c => re.test(c));
  const iD = ix(/^Ascent\s*Date/), iG = ix(/^GPS/), iT = ix(/^TR-Words/), iR = ix(/^Route$/), iGa = ix(/^Gain/), iM = ix(/^Mi$/);
  const list = [...hdr.parentElement.querySelectorAll("tr")].filter(r => r !== hdr && r.children.length === cols.length && /aid=\d+/.test(r.innerHTML)).map(r => { const c = r.children, tx = i => i >= 0 ? c[i].textContent.trim() : ""; const dt = tx(iD); return { aid: (r.innerHTML.match(/aid=(\d+)/) || [])[1], date: dt, ok: !/^\(/.test(dt), gps: iG >= 0 && /GPS\.gif/i.test(c[iG].innerHTML), trw: +((tx(iT).match(/\d+/) || [0])[0]), route: tx(iR), gain: tx(iGa), mi: tx(iM) }; });
  window.__ALL[pid] = list.map(a => [a.date, a.ok ? 1 : 0, a.route, a.gain, a.mi, a.gps ? 1 : 0]);
  return list;
}
// up to 3 GPS ascents per distinct logged route (newest first), 15 in all; plus the 4 longest
// successful trip reports without a track (facts + season)
function pick(list) { const g = list.filter(a => a.gps); const by = {}; for (const a of g.slice().reverse()) { const k = a.route.toLowerCase().replace(/[^a-z]/g, "") || "?"; (by[k] ||= []); if (by[k].length < 3) by[k].push(a); } return [...Object.values(by).flat().slice(0, 15), ...list.filter(a => !a.gps && a.ok && a.trw >= 150).sort((a, b) => b.trw - a.trw).slice(0, 4)]; }
function kv(d) { const out = []; let sec = ""; d.querySelectorAll("tr").forEach(r => { const c = r.children; if (c.length === 1) { const t = c[0].textContent.trim(); if (t.length < 40 && /Statistics|Summary/.test(t)) sec = t; } if (c.length === 2) { const k = c[0].textContent.trim(); if (k && k.length < 45 && k.endsWith(":") && !c[1].querySelector("table")) out.push([sec, k.slice(0, -1), c[1].textContent.trim().replace(/\s+/g, " ").slice(0, 300)]); } }); return out; }
async function track(aid) {
  const x = await get("/climber/ascent.aspx?aid=" + aid); await sleep(600); if (!x) return { aid, err: "page" };
  const m = x.match(/GPXFile\.aspx\?[^"'<>\s]+/); const d = P.parseFromString(x, "text/html"); d.querySelectorAll("script,style").forEach(s => s.remove());
  const stats = kv(d); const text = d.body.textContent.replace(/\s+/g, " ").trim(); const i = text.indexOf("Trip Report"); const tr = i >= 0 ? text.slice(i, i + 6000) : "";
  if (!m) return { aid, stats, tr, err: "nogpx" };
  const g = await get("/climber/" + m[0].replace(/&amp;/g, "&")); await sleep(600); if (!g) return { aid, stats, tr, err: "gpx" };
  const gd = P.parseFromString(g, "text/xml"); let pts = [...gd.querySelectorAll("trkpt")]; if (pts.length < 2) pts = [...gd.querySelectorAll("rtept")];
  const n = pts.length, step = Math.max(1, Math.ceil(n / 1500)), out = [];
  const push = p => { const e = p.querySelector("ele"); out.push([+(+p.getAttribute("lat")).toFixed(5), +(+p.getAttribute("lon")).toFixed(5), e ? Math.round(+e.textContent) : null]); };
  for (let k = 0; k < n; k += step) push(pts[k]); if (n && (n - 1) % step) push(pts[n - 1]);
  const wpts = [...gd.querySelectorAll("wpt")].slice(0, 40).map(w => [+w.getAttribute("lat"), +w.getAttribute("lon"), (w.querySelector("name")?.textContent || "").slice(0, 60)]);
  return { aid, stats, tr, n, pts: out, wpts };
}
function dl(name, data) { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: "application/json" })); a.download = name; document.body.appendChild(a); a.click(); a.remove(); }
window.__saveAll = () => dl(`pb-${ST}-allascents.json`, window.__ALL);
const CLAIM = new Set();
async function doPeak([id, name, lat, lng]) {
  const rec = { area_id: id, name };
  try { const b = await findPid(name, lat, lng); rec.pb = b; if (b && b.dm <= 2000) { const as = await ascents(b.pid) || []; rec.gpsAscents = as.filter(a => a.gps).length; rec.tracks = []; for (const a of pick(as)) rec.tracks.push({ ...a, ...(await track(a.aid)) }); } } catch (e) { rec.err = String(e); }
  return rec;
}
function worker(H, tag, order) {
  (async () => { let saved = 0; for (const k of order) { const p = PEAKS[k]; if (CLAIM.has(k)) break; CLAIM.add(k); H.at = k; H.buf.push(await doPeak(p)); H.n++; if (H.buf.length >= 20) { dl(`pb-${ST}-${tag}${String(++saved).padStart(2, "0")}.json`, H.buf); H.buf = []; } } if (H.buf.length) dl(`pb-${ST}-${tag}${String(++saved).padStart(2, "0")}.json`, H.buf); H.buf = []; H.done = true; })();
}
window.__H = { buf: [], n: 0, done: false }; window.__W = { buf: [], n: 0, done: false };
worker(window.__H, "", PEAKS.map((_, k) => k));
worker(window.__W, "w2-", PEAKS.map((_, k) => PEAKS.length - 1 - k));
"started " + PEAKS.length;
