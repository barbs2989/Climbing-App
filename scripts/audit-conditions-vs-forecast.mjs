#!/usr/bin/env node
// audit:conditions-forecast — does the crag CONDITIONS SCORE agree with the FORECAST beside it, and with
// the outside forecasts, about RAIN?
//
// Owner note (2026-11-26): "Audit the condition score versus the forecast per route and use external
// sources to make sure it all lines up ... so that person is receiving a proper score based on the
// actual conditions, for example rain."
//
// For every crag in the sample it runs the app's OWN code, not a copy of it:
//   * the score: fetchCragForecastMeasured() + scoreForecast() from lib/, default "Your conditions";
//   * the forecast panel beside it: fetchForecastRaw() at the same point, bucketed into days the way
//     WeatherPanel does (hour-stamp date, the day's label from labelCodeOf());
// and fetches two outside forecasts at the same coordinate: the NWS gridpoint (QPF, PoP) and MET
// Norway's locationforecast. Then, per crag-day (today + 6):
//   C1  the score card and the forecast panel disagree on the day's rain (> 0.10" and > 1.5x);
//   C2  the panel's day LABEL reads dry (clear/cloudy/fog) on a day it prints 0.10"+ of rain;
//   C3  the score says Good (4+) for a window in which NWS AND MET both forecast rain (>= 0.05");
//   C4  the score is capped by rain on a day NWS AND MET both call dry (< 0.02" that day and the day before);
//   and it reports the wet-day agreement (>= 0.04") of ours against each outside source.
// A finding is a LEAD to read, not a verdict: forecast models disagree, and C3/C4 are only rows where
// the two outside sources agree with EACH OTHER against us.
//
// No database: the sample is the crag/region list in audits/season/systems-v2.json (coordinates only;
// rock and aspect unknown, so drying uses DRY_HOURS_UNKNOWN and sun is left out — neither moves a rain cap).
// Network: Open-Meteo, api.weather.gov, api.met.no, the measured-rain services. Paced at --pace ms per crag.
//
//   node scripts/audit-conditions-vs-forecast.mjs [--n 150] [--per-state 3] [--pace 1500] [--out file.json] [--seed 1]
//   node scripts/audit-conditions-vs-forecast.mjs --selftest   (no network)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fetchCragForecastMeasured, fetchForecastRaw } from "../lib/forecast.js";
import { scoreForecast } from "../lib/conditionsScore.js";
import { labelCodeOf, DRY_CODES } from "../lib/wxDayLabel.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const N = +arg("n", 150), PER = +arg("per-state", 3), PACE = +arg("pace", 1500), OUT = arg("out", null), SEED = +arg("seed", 1);
const UA = { "User-Agent": "ClimbMatch-conditions-audit/1.0" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MM = 1 / 25.4;

// ---- outside sources, bucketed by LOCAL date of the hour each value covers ----
function addHourly(map, startMs, hours, inch, off) {
  for (let k = 0; k < hours; k++) {
    const d = new Date(startMs + k * 3600e3 + off).toISOString().slice(0, 13); // local YYYY-MM-DDTHH
    map[d] = (map[d] || 0) + inch / hours;
  }
}
function isoDur(s) { const m = /P(?:(\d+)D)?T?(?:(\d+)H)?/.exec(s); return m ? (+(m[1] || 0)) * 24 + (+(m[2] || 0)) : 1; }
async function nwsHourly(lat, lng, off) {
  const p = await fetch("https://api.weather.gov/points/" + lat.toFixed(4) + "," + lng.toFixed(4), { headers: UA }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  if (!p) return null;
  const g = await fetch(p.properties.forecastGridData, { headers: UA }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  const q = g && g.properties && g.properties.quantitativePrecipitation;
  if (!q || !q.values) return null;
  const out = {};
  for (const v of q.values) { const [t, d] = v.validTime.split("/"); if (typeof v.value === "number") addHourly(out, Date.parse(t), isoDur(d), v.value * MM, off); }
  return out;
}
async function metHourly(lat, lng, off) {
  const j = await fetch("https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=" + lat.toFixed(4) + "&lon=" + lng.toFixed(4), { headers: UA }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  const ts = j && j.properties && j.properties.timeseries;
  if (!ts) return null;
  const out = {};
  for (let i = 0; i < ts.length; i++) {
    const x = ts[i], t = Date.parse(x.time), d = x.data || {};
    if (d.next_1_hours) addHourly(out, t, 1, d.next_1_hours.details.precipitation_amount * MM, off);
    else if (d.next_6_hours) {
      // 6-hour blocks after the hourly part; skip one that overlaps the next block's start
      const nx = ts[i + 1] ? Date.parse(ts[i + 1].time) : Infinity;
      const hrs = Math.min(6, Math.round((nx - t) / 3600e3));
      addHourly(out, t, hrs, d.next_6_hours.details.precipitation_amount * MM * hrs / 6, off);
    }
  }
  return out;
}
const dayOf = (hmap, date) => { if (!hmap) return null; let s = 0, n = 0; for (const k in hmap) if (k.slice(0, 10) === date) { s += hmap[k]; n++; } return n >= 18 ? s : null; };
const prevDate = (d) => new Date(Date.parse(d + "T12:00:00Z") - 864e5).toISOString().slice(0, 10);

// ---- the forecast panel's days, exactly as WeatherPanel buckets them ----
function panelDays(om) {
  // WeatherPanel: the label from the hours STAMPED on the date; the rain from the hours that BEGAN on it.
  const h = om.hourly, by = {};
  const prev = (d) => new Date(Date.parse(d + "T00:00:00Z") - 864e5).toISOString().slice(0, 10);
  h.time.forEach((t, i) => {
    const d = t.slice(0, 10), hr = +t.slice(11, 13);
    const b = (by[d] = by[d] || { codes: [], codeRain: [], precips: [] });
    b.codes.push(h.weather_code[i]); b.codeRain.push(h.precipitation[i]);
    const began = hr === 0 ? by[prev(d)] : b;
    if (began) began.precips.push(h.precipitation[i]);
  });
  const out = {};
  for (const d in by) { const b = by[d]; out[d] = { rain: b.precips.reduce((a, v) => a + (v || 0), 0), code: labelCodeOf(b.codes, b.codeRain) }; }
  return out;
}

function sample() {
  const all = JSON.parse(fs.readFileSync(path.join(ROOT, "audits/season/systems-v2.json"), "utf8"));
  let s = SEED; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const ok = all.filter((x) => isFinite(x.lat) && isFinite(x.lng) && (x.routes || 0) >= 20 && (x.type === "crag" || x.type === "region"));
  const byState = {};
  for (const x of ok) (byState[x.region] = byState[x.region] || []).push(x);
  const pick = [];
  for (const st of Object.keys(byState).sort()) {
    const xs = byState[st].map((x) => [rnd(), x]).sort((a, b) => a[0] - b[0]).map((p) => p[1]);
    pick.push(...xs.slice(0, PER));
  }
  return pick.slice(0, N);
}

async function auditOne(c) {
  const lat = +c.lat, lng = +c.lng;
  const wx = await fetchCragForecastMeasured(lat, lng);
  const sc = scoreForecast(wx, { lat, lng, aspect: null, family: null, discipline: "sport" }, null, Date.now(), null);
  const off = (wx.utc_offset_seconds || 0) * 1000;
  const raw = await fetchForecastRaw({ lat, lng, elev: null });
  const pd = panelDays(raw.om);
  const [nws, met] = await Promise.all([nwsHourly(lat, lng, off), metHourly(lat, lng, off)]);
  // OUR hourly rain keyed like the outside sources: by the local hour each value COVERS (precipitation[T] is the hour before T).
  const ours = {}, H = wx.hourly, now = Date.now();
  H.time.forEach((t, i) => { const u = t * 1000; if (H.precipitation[i] != null) ours[new Date(u - 3600e3 + off).toISOString().slice(0, 13)] = H.precipitation[i]; });
  const key = (u) => new Date(u + off).toISOString().slice(0, 13);
  const sum24 = (m, endU) => { if (!m) return null; let s = 0; for (let k = 0; k < 24; k++) s += m[key(endU - k * 3600e3)] || 0; return s; };
  const rows = [];
  for (const d of sc.days) {
    const p = pd[d.date];
    const win = d.best ? d.hours.slice(d.best.i, d.best.i + 3) : [];
    const winKey = (x) => new Date(x.utc - 3600e3 + off).toISOString().slice(0, 13); // the hour that ENDS at x
    const extWin = (m) => (m && win.length ? win.reduce((a, x) => a + (m[winKey(x)] || 0), 0) : null);
    const nD = dayOf(nws, d.date), mD = dayOf(met, d.date), nP = dayOf(nws, prevDate(d.date)), mP = dayOf(met, prevDate(d.date));
    const rainCapped = d.capWhy.some((w) => /rain|wet|drying|damp from rain/i.test(w));
    // The rain that CAUSED a wet-rock cap: the latest hour of our rain before the window opens.
    let cause = null;
    if (rainCapped && win.length) {
      for (let u = win[0].utc - 3600e3; u > win[0].utc - 96 * 3600e3; u -= 3600e3) if ((ours[key(u)] || 0) > 0) { cause = { at: new Date(u + off).toISOString().slice(0, 13), past: u < now, ours: sum24(ours, u), nws: sum24(nws, u), met: sum24(met, u) }; break; }
    }
    rows.push({ cause, date: d.date, stars: d.stars, best: d.best ? [d.best.start, d.best.end] : null, capWhy: d.capWhy, ours: d.rain, panel: p ? p.rain : null, panelCode: p ? p.code : null,
      nws: nD, met: mD, nwsPrev: nP, metPrev: mP, nwsWin: extWin(nws), metWin: extWin(met), rainCapped });
  }
  return { id: c.id, name: c.name, state: c.region, lat, lng, tz: wx.timezone, measured: sc.rainMeasured ? sc.rainMeasured.kind : null, rows };
}

function judge(r) {
  const f = [];
  const big = (a, b) => a != null && b != null && Math.abs(a - b) > 0.1 && Math.max(a, b) > 1.5 * Math.min(a, b);
  if (big(r.ours, r.panel)) f.push("C1");
  if (r.panel != null && r.panel >= 0.1 && DRY_CODES.includes(r.panelCode)) f.push("C2");
  if (r.stars != null && r.stars >= 4 && r.nwsWin != null && r.metWin != null && r.nwsWin >= 0.05 && r.metWin >= 0.05) f.push("C3");
  const c = r.cause;
  if (r.rainCapped && c && !c.past && c.ours >= 0.05 && c.nws != null && c.met != null && c.nws < 0.01 && c.met < 0.01) f.push("C4");
  return f;
}

function selftest() {
  const r0 = { ours: 0.5, panel: 0.1, panelCode: 3, stars: 4.2, nwsWin: 0.1, metWin: 0.2, rainCapped: false };
  const f = judge(r0);
  const want = ["C1", "C2", "C3"];
  if (JSON.stringify(f) !== JSON.stringify(want)) { console.error("selftest FAIL", f); process.exit(1); }
  if (judge({ ours: 0, panel: 0, panelCode: 0, stars: 1, rainCapped: true, cause: { past: false, ours: 0.2, nws: 0, met: 0.005 } }).join() !== "C4") { console.error("selftest FAIL C4"); process.exit(1); }
  console.log("selftest ok");
}

async function main() {
  if (process.argv.includes("--selftest")) return selftest();
  const crags = sample();
  console.log("auditing " + crags.length + " crags/regions across " + new Set(crags.map((c) => c.region)).size + " states/provinces");
  const res = [];
  for (const c of crags) {
    try { const a = await auditOne(c); for (const r of a.rows) r.flags = judge(r); res.push(a); process.stdout.write("."); }
    catch (e) { res.push({ id: c.id, name: c.name, state: c.region, error: String(e && e.message || e) }); process.stdout.write("x"); }
    await sleep(PACE);
  }
  console.log("");
  const rows = res.flatMap((a) => (a.rows || []).map((r) => Object.assign({ crag: a.name, state: a.state }, r)));
  const cnt = {}; for (const r of rows) for (const f of r.flags) cnt[f] = (cnt[f] || 0) + 1;
  const agree = (k) => { const xs = rows.filter((r) => r.ours != null && r[k] != null); const a = xs.filter((r) => (r.ours >= 0.04) === (r[k] >= 0.04)).length; return { n: xs.length, agree: xs.length ? Math.round(1000 * a / xs.length) / 10 : null }; };
  const summary = { crags: res.length, errors: res.filter((a) => a.error).length, rows: rows.length, flags: cnt, wetDayAgreement: { nws: agree("nws"), met: agree("met") }, starsHist: rows.reduce((h, r) => { const k = r.stars == null ? "none" : r.stars >= 4 ? "good" : r.stars >= 2.5 ? "fair" : "poor"; h[k] = (h[k] || 0) + 1; return h; }, {}) };
  console.log(JSON.stringify(summary, null, 2));
  for (const k of Object.keys(cnt).sort()) {
    console.log("\n== " + k + " (" + cnt[k] + ")");
    for (const r of rows.filter((x) => x.flags.includes(k)).slice(0, 12)) console.log("  " + r.state + " · " + r.crag + " " + r.date + " stars=" + (r.stars == null ? "-" : r.stars.toFixed(1)) + " win=" + JSON.stringify(r.best) + " ours=" + (r.ours ?? "-").toString().slice(0, 5) + " panel=" + (r.panel ?? "-").toString().slice(0, 5) + " code=" + r.panelCode + " nws=" + (r.nws == null ? "-" : r.nws.toFixed(2)) + " met=" + (r.met == null ? "-" : r.met.toFixed(2)) + " nwsWin=" + (r.nwsWin == null ? "-" : r.nwsWin.toFixed(2)) + " metWin=" + (r.metWin == null ? "-" : r.metWin.toFixed(2)) + " caps=" + r.capWhy.join("|") + (r.cause ? " cause=" + JSON.stringify(r.cause) : ""));
  }
  if (OUT) fs.writeFileSync(OUT, JSON.stringify({ summary, res }, null, 1));
}
main();
