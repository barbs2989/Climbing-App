// THE CAMP PINS audit:camp-pins FINDS OFF THE RECORDED TRACK — which are WRONG, and which are right?
//
// A Campsite pin more than 500 m from its route's recorded track is one of two things, and they
// need opposite answers:
//   WRONG PIN      the camp is on the walk, and the pin was put somewhere else. An independent
//                  record of the same camp (an NPS/USFS camp point, USGS GNIS, the same camp pinned
//                  on a neighbouring route) sits ON the track and fits the ground at the camp's stated
//                  height. Move the pin there.
//   OTHER WAY IN   the pin is right and the recording took another approach, or the camp is the
//                  DESCENT camp (Camp Schurman on Ptarmigan Ridge). Leave it.
// Anything that is neither is UNRESOLVED and left alone: a pin is never moved on a fingerprint.
//
// PROTECTED: every pin the camp-location session moved (its write log,
// ~/dev/camp-audit-06856cffd7/writes.jsonl) was moved FROM a source; it is not moved back without
// a newer one. Coordinates are never computed here — a move copies an independent record's point.
//
//   node scripts/oneoff/triage-offtrack-camp-pins.mjs            # report only
//   node scripts/oneoff/triage-offtrack-camp-pins.mjs --apply    # move the WRONG PIN rows: re-read
//        each route, refuse unless the pin still sits where the triage saw it, rollback file first
import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");
import fs from "fs";
import os from "os";
import path from "path";
import { SUPABASE_URL, anonKey, headers, requireServiceKey } from "../lib/supabase-env.mjs";
import { elevationAt } from "../lib/terrain.mjs";
import { ident, placeOf } from "../lib/camp-names.mjs";
import { recordedTrackPts, pointOf, metresBetween, coordinateIsComputed } from "../../lib/track.js";
import { nearestOnTrack, trackLine } from "../lib/track-geometry.mjs";

const APPLY = process.argv.includes("--apply");
const RUN = process.env.CAMP_PINS_RUN || path.join(os.homedir(), "dev/camp-pins-run");
const AUDIT = path.join(RUN, "camp-pins-after.json");
const PROTECT_LOG = path.join(os.homedir(), "dev/camp-audit-06856cffd7/writes.jsonl");
const WP_TOL = 500, TOL_FT = 400, NEAR_KM = 15, SAME_SPOT_M = 300;
const H = headers(anonKey());
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function q(p) {
  for (let t = 0; t < 5; t++) {
    try { const r = await fetch(`${SUPABASE_URL}/rest/v1/${p}`, { headers: H, signal: AbortSignal.timeout(30000) }); if (r.ok) return r.json(); } catch { /* backed off */ }
    await sleep(60000 * (t + 1));
  }
  throw new Error(`read failed: ${p.slice(0, 80)}`);
}
const key = (v) => String(v == null ? "" : v).trim().toLowerCase();
const isCampPin = (w) => w && /^camp(site)?$/i.test(String(w.type || "").trim());
const elevFt = (s) => (s == null ? null : s.elev != null && s.elev !== "" ? Number(s.elev) : s.elevM != null && s.elevM !== "" ? Number(s.elevM) * 3.28084 : null);
function variantKey(id) {
  const t = String(id || "").replace(/\bmt\b/g, "mount").split(" ").filter((w) => w && w !== "s");
  if (t.length < 2) return null;
  return t.map((w) => (/[^s]s$/.test(w) && w.length > 3 ? w.slice(0, -1) : w)).join(" ");
}
const same = (a, b) => a && b && (a === b || (variantKey(a) && variantKey(a) === variantKey(b)));

const audit = JSON.parse(fs.readFileSync(AUDIT, "utf8"));
const protectedPins = new Set(fs.existsSync(PROTECT_LOG)
  ? fs.readFileSync(PROTECT_LOG, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)).filter((x) => x.ok !== false).map((x) => `${x.id}|${key(x.name)}`)
  : []);
const official = fs.readdirSync(path.join(RUN, "official")).filter((f) => f.endsWith(".json"))
  .flatMap((f) => JSON.parse(fs.readFileSync(path.join(RUN, "official", f), "utf8"))).map((x) => ({ ...x, id: ident(x.name) }));
const gnis = JSON.parse(fs.readFileSync(path.join(RUN, "gnis", "gnis-wa.json"), "utf8")).map((x) => ({ ...x, id: ident(x.name) }));

const ids = [...new Set(audit.off.map((x) => x.id))];
const rows = new Map();
for (let i = 0; i < ids.length; i += 10) {
  const chunk = ids.slice(i, i + 10).map((x) => `"${x}"`).join(",");
  for (const r of await q(`routes?select=id,name,bivy,waypoints,gpx&id=in.(${encodeURIComponent(chunk)})`)) rows.set(r.id, r);
  await sleep(500);
}
const ground = async (p) => { const v = await elevationAt(p.lat, p.lng, 6); return v == null ? null : Math.round(v); };

const out = [];
for (const f of audit.off) {
  const r = rows.get(f.id);
  const pin = r && (r.waypoints || []).find((w) => isCampPin(w) && key(w.name) === key(f.pin) && pointOf(w));
  if (!r || !pin) { out.push({ ...f, verdict: "GONE", why: "the pin is no longer on the live route" }); continue; }
  const track = recordedTrackPts(r.gpx, r.waypoints);
  const line = track && trackLine(track).length >= 2 ? track : null;
  const here = pointOf(pin);
  if (!line) { out.push({ ...f, verdict: "NO TRACK NOW", why: "the route no longer has a recorded track" }); continue; }
  const site = (r.bivy || []).find((b) => key(b && b.name) === key(f.pin));
  const stated = elevFt(site) ?? elevFt(pin);
  const offNow = Math.round(nearestOnTrack(here, line).d);
  const gHere = await ground(here);
  const row = { id: f.id, route: r.name, pin: pin.name, from: here, offM: offNow, stated: stated == null ? null : Math.round(stated), groundHere: gHere };
  if (protectedPins.has(`${f.id}|${key(pin.name)}`)) { out.push({ ...row, verdict: "PROTECTED", why: "moved from a source by the camp-location session" }); continue; }
  const sid = ident(placeOf(pin.name));
  const anchor = (r.waypoints || []).map(pointOf).filter(Boolean);
  const nearRoute = (x) => anchor.some((a) => metresBetween(a, x) / 1000 <= NEAR_KM);
  const cands = [
    ...official.filter((x) => same(x.id, sid) && nearRoute(x)).map((x) => ({ lat: x.lat, lng: x.lng, src: `${x.src}: ${x.name}` })),
    ...gnis.filter((x) => same(x.id, sid) && nearRoute(x) && x.cls !== "Summit").map((x) => ({ lat: x.lat, lng: x.lng, src: `GNIS ${x.cls}: ${x.name}` })),
    ...(audit.pins || []).filter((d) => d.rid !== f.id && key(d.w.name) === key(pin.name) && pointOf(d.w) && !coordinateIsComputed(d.w) && nearRoute(pointOf(d.w)))
      .map((d) => ({ ...pointOf(d.w), src: `pin on ${d.rid}` })),
  ];
  let verdict = "UNRESOLVED", why = cands.length ? "no independent point both on the track and at the stated height" : "no independent record of this camp";
  let to = null;
  for (const c of cands) {
    const g = await ground(c);
    const d = Math.round(nearestOnTrack(c, line).d);
    const fits = g != null && (stated == null || Math.abs(g - stated) <= TOL_FT);
    c.offM = d; c.ground = g;
    if (metresBetween(c, here) <= SAME_SPOT_M && fits) { verdict = "OTHER WAY IN"; why = `an independent record (${c.src}) puts the camp where the pin is; the recording takes another way`; to = null; break; }
    if (d <= WP_TOL && fits && metresBetween(c, here) > SAME_SPOT_M && !to) { verdict = "WRONG PIN"; why = `${c.src} is ${d} m from the track, ground ${g} ft vs stated ${row.stated ?? "—"}`; to = c; }
  }
  out.push({ ...row, verdict, why, to, cands });
}

fs.writeFileSync(path.join(RUN, "offtrack-triage.json"), JSON.stringify(out, null, 1));
const by = {};
for (const x of out) by[x.verdict] = (by[x.verdict] || 0) + 1;
console.log(`off-track pins: ${out.length}`, JSON.stringify(by));
for (const x of out) console.log(`${x.verdict.padEnd(13)} ${x.id.slice(0, 40).padEnd(40)} "${String(x.pin).slice(0, 34)}" ${x.offM ?? ""} m — ${x.why}`);
if (!APPLY) process.exit(0);

// ---- apply: WRONG PIN rows only; refuse unless the live pin is still at the triaged coordinate
const key2 = requireServiceKey();
const rbFile = path.join(RUN, `rollback-offtrack-${Date.now()}.json`);
const rb = {};
let moved = 0;
for (const x of out.filter((o) => o.verdict === "WRONG PIN")) {
  const [live] = await q(`routes?select=id,waypoints&id=eq.${encodeURIComponent(x.id)}`);
  const wps = (live && live.waypoints) || [];
  const i = wps.findIndex((w) => isCampPin(w) && key(w.name) === key(x.pin));
  const p = i >= 0 && pointOf(wps[i]);
  if (!p || Math.abs(p.lat - x.from.lat) > 1e-7 || Math.abs(p.lng - x.from.lng) > 1e-7) { console.error(`refused ${x.id}: the live pin is not where the triage saw it`); continue; }
  rb[x.id] = wps; fs.writeFileSync(rbFile, JSON.stringify(rb));
  const next = wps.slice();
  next[i] = { ...wps[i], lat: Number(x.to.lat.toFixed(6)), lng: Number(x.to.lng.toFixed(6)) };
  const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?id=eq.${encodeURIComponent(x.id)}&select=id`, {
    method: "PATCH", signal: AbortSignal.timeout(60000),
    headers: headers(key2, { "Content-Type": "application/json", Prefer: "return=representation" }), body: JSON.stringify({ waypoints: next }),
  });
  const body = await res.text();
  if (!res.ok || JSON.parse(body).length !== 1) { console.error(`write failed ${x.id}: ${res.status} ${body.slice(0, 120)}`); delete rb[x.id]; fs.writeFileSync(rbFile, JSON.stringify(rb)); await sleep(60000); continue; }
  const [check] = await q(`routes?select=id,waypoints&id=eq.${encodeURIComponent(x.id)}`);
  const now = pointOf((check.waypoints || []).find((w) => isCampPin(w) && key(w.name) === key(x.pin)));
  if (now && Math.abs(now.lat - next[i].lat) < 1e-7 && Math.abs(now.lng - next[i].lng) < 1e-7) moved++; else console.error(`NOT LANDED ${x.id}`);
  await sleep(1100);
}
console.log(`moved ${moved}; rollback ${rbFile}`);
