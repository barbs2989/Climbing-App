// Writes researched waypoint distances (and missing heights) for the TRIP PROFILE pass (owner note,
// 2026-11-26). Input: research JSON files, each an array of
//   { id, waypoints: [{ i, name, distMi, elev?, sources: [url, ...] }], ... }
// Rules, each a refusal rather than a guess:
//   - only a BLANK distMi / elev is filled; a stored value is never overwritten;
//   - the waypoint at index i must still carry the same name (re-read just before the write);
//   - a distance needs at least one source URL, and must not be shorter than the straight line from the
//     route's trailhead pin to this pin (a trail cannot be shorter than the crow flies: audit:waypoint-distances);
// Saves every touched row's full waypoints to a rollback JSON first, paces writes (patchRow's pace plus
// --pace ms), stops on any slow write, and re-reads every row to confirm it landed.
//   node scripts/oneoff/apply-trip-profile-distances.mjs [--dry] [--pace 1000] file.json [...]
import "../lib/load-env.mjs";
import fs from "fs";
import path from "path";
import { selectAll, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const args = process.argv.slice(2);
const dry = args.includes("--dry");
const pi = args.indexOf("--pace");
const PACE = pi >= 0 ? Number(args[pi + 1]) : 1000;
const ri = args.indexOf("--report");
const files = args.filter((a, i) => !a.startsWith("--") && !(pi >= 0 && i === pi + 1) && !(ri >= 0 && i === ri + 1));
const key = requireServiceKey();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const R = 6371000, rad = (d) => (d * Math.PI) / 180;
const metres = (a, b) => { const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng); const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
const pt = (w) => (w && w.lat != null && w.lng != null && Number.isFinite(Number(w.lat)) && Number.isFinite(Number(w.lng)) ? { lat: Number(w.lat), lng: Number(w.lng) } : null);
const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const items = files.flatMap((f) => JSON.parse(fs.readFileSync(f, "utf8")));
const report = { written: [], refused: [], unchanged: [] };
const rollback = [];
const rbFile = path.join("scripts", `rollback-trip-profile-distances-${Date.now()}.json`);
for (const it of items) {
  if (!it || !it.id || !Array.isArray(it.waypoints) || !it.waypoints.length) continue;
  const t0 = Date.now();
  const [row] = await selectAll("routes", "id,waypoints", `id=eq.${it.id}`, { key, pageSize: 10 });
  if (Date.now() - t0 > 10000) { console.error(`read of ${it.id} took ${Date.now() - t0} ms — database slow, stopping`); break; }
  if (!row || !Array.isArray(row.waypoints)) { report.refused.push({ id: it.id, why: "route or waypoints missing" }); continue; }
  const wps = row.waypoints.map((w) => ({ ...w }));
  const th = wps.find((w) => /trailhead/i.test(w.type || ""));
  const thPt = pt(th);
  const changes = [];
  for (const r of it.waypoints) {
    const w = wps[r.i];
    if (!w) { report.refused.push({ id: it.id, i: r.i, why: "no waypoint at that index" }); continue; }
    if (norm(w.name) !== norm(r.name)) { report.refused.push({ id: it.id, i: r.i, why: `name changed: stored "${w.name}" vs research "${r.name}"` }); continue; }
    const srcs = Array.isArray(r.sources) ? r.sources.filter((s) => /^https?:\/\//.test(String(s))) : [];
    if (r.distMi != null && (w.distMi == null || w.distMi === "")) {
      const d = Number(r.distMi);
      if (!Number.isFinite(d) || d < 0 || d > 60) { report.refused.push({ id: it.id, i: r.i, why: `distMi ${r.distMi} not a plausible number` }); }
      else if (!srcs.length) { report.refused.push({ id: it.id, i: r.i, why: "no source URL" }); }
      else if (thPt && pt(w) && d * 1609.344 < metres(thPt, pt(w)) * 0.97 && !/trailhead/i.test(w.type || "")) { report.refused.push({ id: it.id, i: r.i, why: `distMi ${d} is shorter than the straight line from the trailhead (${(metres(thPt, pt(w)) / 1609.344).toFixed(2)} mi)` }); }
      else { w.distMi = Math.round(d * 100) / 100; changes.push(`#${r.i} ${w.name}: distMi ${w.distMi}`); }
    }
    if (r.elev != null && (w.elev == null || w.elev === "")) {
      const e = Number(r.elev);
      if (Number.isFinite(e) && e > 0 && e < 21000 && srcs.length) { w.elev = Math.round(e); changes.push(`#${r.i} ${w.name}: elev ${w.elev}`); }
      else report.refused.push({ id: it.id, i: r.i, why: `elev ${r.elev} refused (number or source)` });
    }
  }
  if (!changes.length) { report.unchanged.push(it.id); continue; }
  rollback.push({ id: it.id, waypoints: row.waypoints });
  if (dry) { report.written.push({ id: it.id, changes, dry: true }); continue; }
  fs.writeFileSync(rbFile, JSON.stringify(rollback, null, 1));
  const tw = Date.now();
  try { await patchRow("routes", it.id, { waypoints: wps }); }
  catch (e) { report.refused.push({ id: it.id, why: "write failed: " + e.message.slice(0, 160) }); console.error(e.message); break; }
  if (Date.now() - tw > 10000) { console.error(`write of ${it.id} took ${Date.now() - tw} ms — database slow, stopping after it`); report.written.push({ id: it.id, changes }); break; }
  const [back] = await selectAll("routes", "id,waypoints", `id=eq.${it.id}`, { key, pageSize: 10 });
  const ok = back && JSON.stringify(back.waypoints) === JSON.stringify(wps);
  report.written.push({ id: it.id, changes, verified: !!ok });
  if (!ok) { console.error(`${it.id}: re-read does not match what was written — stopping`); break; }
  await sleep(PACE);
}
console.log(JSON.stringify({ written: report.written.length, refused: report.refused.length, unchanged: report.unchanged.length, rollback: dry ? null : rbFile }, null, 1));
fs.writeFileSync(ri >= 0 ? args[ri + 1] : path.join(process.env.CLAUDE_JOB_DIR ? path.join(process.env.CLAUDE_JOB_DIR, "tmp") : ".", `apply-report-${Date.now()}.json`), JSON.stringify(report, null, 1));
for (const r of report.refused) console.log("REFUSED", JSON.stringify(r));
