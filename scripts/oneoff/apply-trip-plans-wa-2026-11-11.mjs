// Writes the researched WA trip plans (owner note 2026-11-11: "do full research to fill the missing
// data on routes") into `routes.itinerary`.
//
// Inputs: research-data/trip-plans-wa-2026-11-11/out-*.json — arrays of
//   {id, itinerary:{cal,totalNote,days:[…]}, sources:[…], confidence, notes} or {id, skip:true, reason}.
// Every plan is validated before anything is written:
//   · the id is in this wave's input files (so the peak was resolved through `areas`, route-identity.md)
//   · at least two sources; confidence is not "low"
//   · each day has a title (<= 60 chars) and at least one of hours / miles / gainFt; figures are numbers
//     in a sane range; no road / gate / closure sentence in `cal` (those live in GETTING THERE)
//   · a gap-fill plan keeps its day count and its existing notes
//   · the row's CURRENT itinerary still equals what the input file recorded (nobody edited it since)
// Dry run by default. --apply writes, pacing through patchRow, after saving every current value to
// before-<timestamp>.json beside the inputs (rollback: write those values back). Then re-reads each id.
import fs from "node:fs";
import path from "node:path";
import { SUPABASE_URL, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";
import { itineraryShapeErrors } from "../../lib/itineraryShape.js";

const APPLY = process.argv.includes("--apply");
const DIR = "research-data/trip-plans-wa-2026-11-11";
const key = requireServiceKey();
const read = (f) => JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8"));
const inputs = new Map();
for (const f of fs.readdirSync(path.join(DIR, "inputs")).filter((f) => /^(gap-routes|wave\d+-chunk\d+)\.json$/.test(f))) {
  for (const r of read("inputs/" + f)) inputs.set(r.id, { row: r, gap: f === "gap-routes.json" });
}
const CAL_OVERRIDES = fs.existsSync(path.join(DIR, "cal-overrides.json")) ? read("cal-overrides.json") : {};
const outs = fs.readdirSync(DIR).filter((f) => /^out-.*\.json$/.test(f));
const ROAD = /\b(road|gate|closure|closed|washout|washed out|FR ?\d|forest road|highway|hwy)\b/i;
const num = (v, lo, hi) => v == null || (typeof v === "number" && v >= lo && v <= hi);
// 0 is allowed: a spare / weather day that moves nowhere (East Twin Needle day 3, Olympus day 4).
const hrsOk = (v) => v == null || (typeof v === "number" && v >= 0 && v <= 24) || (typeof v === "string" && /^\d{1,2}(\.\d)?\s*[-–]\s*\d{1,2}(\.\d)?$/.test(v.trim()));

const plan = [], rejected = [], skipped = [];
for (const f of outs) {
  for (const x of read(f)) {
    if (x.skip) { skipped.push({ id: x.id, reason: x.reason, file: f }); continue; }
    // cal-overrides.json: hand edits that only REMOVE road/closure clauses from a researched cal line.
    if (CAL_OVERRIDES[x.id] && x.itinerary) x.itinerary.cal = CAL_OVERRIDES[x.id];
    const why = [];
    const inp = inputs.get(x.id);
    if (!inp) why.push("not in this wave's inputs");
    if (!Array.isArray(x.sources) || new Set(x.sources).size < 2) why.push("fewer than two sources");
    if (String(x.confidence).toLowerCase() === "low") why.push("low confidence");
    const it = x.itinerary;
    why.push(...itineraryShapeErrors(it)); // the app-wide trip-plan rule (lib/itineraryShape.js)
    if (!it || !Array.isArray(it.days) || !it.days.length) why.push("no days");
    else {
      it.days.forEach((d, i) => {
        if (!d.title || String(d.title).length > 60) why.push("day " + (i + 1) + " title missing/long");
        if (![d.hours, d.miles, d.gainFt].some((v) => v != null && v !== "")) why.push("day " + (i + 1) + " has no hours/miles/gain");
        if (!num(d.gainFt, 0, 15000) || !num(d.lossFt, 0, 15000) || !num(d.miles, 0, 40) || !num(d.packLb, 0, 80) || !hrsOk(d.hours)) why.push("day " + (i + 1) + " figure out of range or not a number");
      });
      if (it.cal && ROAD.test(it.cal)) why.push("cal mentions road/gate/closure");
      if (inp && inp.gap) {
        const before = inp.row.itinerary.days;
        if (before.length !== it.days.length) why.push("gap-fill changed the day count");
        before.forEach((d, i) => { if (d.note && it.days[i] && it.days[i].note !== d.note) why.push("gap-fill changed day " + (i + 1) + "'s note"); });
      }
    }
    if (why.length) rejected.push({ id: x.id, file: f, why });
    else {
      const clean = { cal: it.cal || undefined, totalNote: it.totalNote || undefined, days: it.days.map((d, i) => ({ n: i + 1, title: d.title, objective: d.objective || "", note: d.note || "", gainFt: d.gainFt ?? null, lossFt: d.lossFt ?? null, hours: d.hours ?? null, miles: d.miles ?? null, packLb: d.packLb ?? null, schedule: (d.schedule || []).filter((s) => s && s.label).map((s) => ({ time: s.time || "", label: s.label, detail: s.detail || "" })) })) };
      plan.push({ id: x.id, itinerary: clean, expect: inp.row.itinerary ?? null });
    }
  }
}
console.log("plans " + plan.length + ", rejected " + rejected.length + ", skipped by research " + skipped.length);
for (const r of rejected) console.log("  REJECT " + r.id + ": " + r.why.join("; "));
fs.writeFileSync(path.join(DIR, "apply-report.json"), JSON.stringify({ plan: plan.map((p) => p.id), rejected, skipped }, null, 1));
if (!APPLY) { console.log("dry run; --apply to write"); process.exit(0); }

const live = async (ids) => {
  const r = await fetch(SUPABASE_URL + "/rest/v1/routes?select=id,area_id,itinerary&id=in.(" + ids.map(encodeURIComponent).join(",") + ")", { headers: headers(key), signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error("STOPPED: " + r.status);
  return new Map((await r.json()).map((x) => [x.id, x]));
};
const before = {};
const ids = plan.map((p) => p.id);
for (let i = 0; i < ids.length; i += 50) for (const [id, x] of await live(ids.slice(i, i + 50))) before[id] = x;
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
fs.writeFileSync(path.join(DIR, "before-" + stamp + ".json"), JSON.stringify(Object.fromEntries(Object.entries(before).map(([id, x]) => [id, x.itinerary])), null, 1));
let wrote = 0, stale = 0;
for (const p of plan) {
  const cur = before[p.id];
  if (!cur || cur.area_id !== inputs.get(p.id).row.area_id || JSON.stringify(cur.itinerary ?? null) !== JSON.stringify(p.expect)) { console.log("  STALE " + p.id + " (changed since the inputs were read); not written"); stale++; continue; }
  await patchRow("routes", p.id, { itinerary: p.itinerary });
  wrote++;
}
// jsonb keeps object keys in its own order, so compare with keys sorted (a raw byte comparison
// reported 0 of 43 on the first run; verify-trip-plans-wa-2026-11-11.mjs then confirmed 43 of 43).
const canon = (v) => Array.isArray(v) ? v.map(canon) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).filter((k) => v[k] !== undefined).sort().map((k) => [k, canon(v[k])])) : v;
let ok = 0;
for (let i = 0; i < ids.length; i += 50) for (const [id, x] of await live(ids.slice(i, i + 50))) { const p = plan.find((q) => q.id === id); if (JSON.stringify(canon(x.itinerary)) === JSON.stringify(canon(p.itinerary))) ok++; }
console.log("wrote " + wrote + ", stale " + stale + ", re-read matching " + ok + " of " + wrote);
if (ok !== wrote) { console.error("FAIL - a written row does not read back as written"); process.exit(1); }
