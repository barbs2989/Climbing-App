// READ-ONLY. Does each route state ONE total trip time? Compares every stored figure for the
// whole outing on one row: timing.totalHrs, the timing legs (approach + summit + descent), the
// sectionBreakdown hours, the trip plan's day hours, and the trip plan's totalNote.
//   node scripts/oneoff/measure-trip-time-agreement.mjs [--out file.json]
import { selectAll, requireServiceKey } from "../lib/supabase-env.mjs";
import { writeFileSync } from "node:fs";

const key = requireServiceKey();
const rows = await selectAll("routes",
  "id,name,discipline,area_id,timing,itinerary,outing_shape",
  "or=(timing.not.is.null,itinerary.not.is.null)", { key, pageSize: 1000 });

const num = (v) => (typeof v === "number" && isFinite(v) ? v : typeof v === "string" && v.trim() && isFinite(+v) ? +v : null);
const sum = (a) => a.reduce((s, x) => s + x, 0);
const close = (a, b) => Math.abs(a - b) <= Math.max(0.5, 0.1 * Math.max(a, b));

const out = [];
const tally = {};
const bump = (k) => (tally[k] = (tally[k] || 0) + 1);
for (const r of rows) {
  const tm = r.timing && typeof r.timing === "object" ? r.timing : {};
  const T = num(tm.totalHrs), A = num(tm.approachTimeHrs), S = num(tm.summitTimeHrs), D = num(tm.descentTimeHrs);
  const legs = [A, S, D].filter((x) => x != null);
  const L = legs.length === 3 ? sum(legs) : null;
  const sb = Array.isArray(tm.sectionBreakdown) ? tm.sectionBreakdown : [];
  const sbH = sb.length && sb.every((s) => num(s && s.hrs) != null) ? sum(sb.map((s) => num(s.hrs))) : null;
  const days = r.itinerary && Array.isArray(r.itinerary.days) ? r.itinerary.days : [];
  const dayH = days.length && days.every((d) => num(d && d.hours) != null) ? sum(days.map((d) => num(d.hours))) : null;
  const note = r.itinerary && typeof r.itinerary.totalNote === "string" ? r.itinerary.totalNote : null;
  const cal = r.itinerary && typeof r.itinerary.cal === "string" ? r.itinerary.cal : null;
  const figs = { T, L, sbH, dayH };
  const present = Object.entries(figs).filter(([, v]) => v != null);
  bump("rows");
  if (present.length < 2) { bump("fewer than 2 figures"); continue; }
  bump("2+ figures");
  const pairs = [];
  for (let i = 0; i < present.length; i++) for (let j = i + 1; j < present.length; j++) {
    const [ka, va] = present[i], [kb, vb] = present[j];
    if (!close(va, vb)) pairs.push(`${ka}=${+va.toFixed(2)} vs ${kb}=${+vb.toFixed(2)}`);
  }
  if (!pairs.length) { bump("agree"); continue; }
  bump("disagree");
  for (const p of pairs) bump("pair " + p.replace(/=[\d.]+/g, ""));
  out.push({ id: r.id, name: r.name, disc: r.discipline, days: days.length, multiDay: days.length > 1, T, A, S, D, L, sbH, dayH, totalNote: note, cal, recommendedStart: tm.recommendedStart || null, pairs });
}
console.log(tally);
console.log("disagreeing, single-day:", out.filter((x) => !x.multiDay).length, " multi-day:", out.filter((x) => x.multiDay).length);
const o = process.argv.indexOf("--out");
if (o > 0) writeFileSync(process.argv[o + 1], JSON.stringify(out, null, 1));

// THE SUMMARY SENTENCE. A single-day plan's totalNote often states the day in words ("a 4-6 hour
// car-to-car day"). Its range must hold the stored total.
const RANGE = /(\d+(?:\.\d+)?)\s*(?:[-–]|to)\s*(\d+(?:\.\d+)?)\s*(?:hours|hrs?|h)\b|(\d+(?:\.\d+)?)\s*(?:hours|hrs?|h)\b/i;
const words = [];
for (const r of rows) {
  const it = r.itinerary; if (!it || typeof it.totalNote !== "string") continue;
  const days = Array.isArray(it.days) ? it.days : [];
  if (days.length > 1) continue;
  const tm = r.timing || {};
  const T = num(tm.totalHrs) ?? (days.length && num(days[0].hours));
  if (T == null) continue;
  const m = it.totalNote.match(RANGE); if (!m) continue;
  const lo = +(m[1] || m[3]), hi = +(m[2] || m[3]);
  if (T >= lo - 0.5 && T <= hi + 0.5) continue;
  words.push({ id: r.id, T, said: m[0], note: it.totalNote.slice(0, 160) });
}
console.log("single-day summary sentence disagrees with the total:", words.length);
for (const w of words) console.log(" ", w.id, "T", w.T, "|", w.said, "|", w.note);
