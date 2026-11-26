// READ-ONLY. The Planner's party size, pack weight and start time, audited across the disciplines that
// mount the Full trip time card (owner note 2026-11-26: "make sure that the math is correct for multiple
// routes and disciplines"). For a sample of timed routes per discipline it runs lib/planTimes.js at the
// defaults and at other settings and checks, route by route:
//   finite   every leg and clock is a finite, non-negative number
//   sum      the Approach, Climbing and Descent tiles add up to the Total (nothing hidden outside them)
//   party    a bigger party is never faster, on any leg, and a party of 1 is timed as a pair
//   pack     a heavier pack is never faster, and every walked leg moves with it
//   night    a multi-day summit day timed from a camp left the evening before has a finite summit clock
//            at the same distance from the start as a 4:00 AM start
// and prints, per discipline, how much party 4 and a 25 kg pack lengthen the car-to-car time.
// Usage: node scripts/oneoff/measure-party-pack-sensitivity.mjs [--per 200] [--out file.json]
import "../lib/load-env.mjs";
import { build } from "esbuild";
import fs from "fs";
import os from "os";
import path from "path";
import { createRequire } from "module";
import { fileURLToPath } from "url";
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const args = process.argv.slice(2);
const flag = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const PER = +(flag("--per") || 200);
const outFile = flag("--out");

const dir = fs.mkdtempSync(path.join(process.env.CLAUDE_JOB_DIR ? path.join(process.env.CLAUDE_JOB_DIR, "tmp") : os.tmpdir(), "pps-"));
const bundle = path.join(dir, "planTimes.cjs");
await build({
  entryPoints: [path.join(ROOT, "lib", "planTimes.js")], bundle: true, format: "cjs", platform: "node",
  outfile: bundle, jsx: "automatic", loader: { ".js": "jsx", ".jsx": "jsx" }, logLevel: "silent",
  define: { "import.meta.env": "{}" },
});
const { planTimes, summitDayPlan } = createRequire(import.meta.url)(bundle);

const SELECT = "id,name,discipline,grade,pitches,length_m,gain_ft,loss_ft,dist_km,timing,itinerary,outing_shape";
// The calculator is not mounted on the crag disciplines (cragOnly), so these are the ones it times.
const DISCS = ["alpine", "mountaineering", "scrambling", "ice", "mixed", "aid"];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function sample(disc) {
  // One keyed page per discipline: the timing filter on a whole-table scan hits the statement timeout.
  const rows = [];
  for (const timed of ["timing=not.is.null", "timing=is.null&gain_ft=not.is.null"]) {
    const q = `${SUPABASE_URL}/rest/v1/routes?select=${SELECT}&discipline=eq.${disc}&${timed}&order=id.asc&limit=${PER / 2}`;
    const t0 = Date.now();
    const res = await fetch(q, { headers: headers(anonKey()) });
    const text = await res.text();
    if (!res.ok) throw new Error(`${disc}: ${res.status} ${text.slice(0, 200)}`);
    if (Date.now() - t0 > 10000) throw new Error(`${disc}: a keyed read took ${Date.now() - t0} ms; stopping (the database is slow)`);
    rows.push(...JSON.parse(text));
    await sleep(1500);
  }
  return rows;
}
const toRoute = (r) => ({
  id: r.id, discipline: r.discipline, grade: r.grade, pitches: r.pitches,
  routeFt: r.length_m != null ? Math.round(r.length_m * 3.28084) : null,
  gainM: r.gain_ft != null ? Math.round(r.gain_ft / 3.28084) : null,
  lossM: r.loss_ft != null ? Math.round(r.loss_ft / 3.28084) : null,
  distKm: r.dist_km, itinerary: r.itinerary, outingShape: r.outing_shape, timing: r.timing,
});
const fin = (x) => typeof x === "number" && Number.isFinite(x) && x >= -1e-9;
const med = (xs) => { const s = xs.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : null; };

const report = {};
const problems = [];
for (const disc of DISCS) {
  const rows = await sample(disc);
  const st = { routes: rows.length, timed: 0, party4Pct: [], party3PitchedH: [], pack25Pct: [], multiDay: 0, nightOk: 0 };
  for (const r of rows) {
    const route = toRoute(r);
    const base = planTimes(route, {});
    if (!base.anyTimed) continue;
    st.timed++;
    const bad = (what) => problems.push({ id: r.id, discipline: disc, what });
    for (const k of ["hikeH", "techH", "downH", "totalH", "tripH", "sumH", "retH"]) if (!fin(base[k])) bad(`default ${k} = ${base[k]}`);
    if (!base.publishedIsWholeDay && Math.abs(base.hikeH + base.climbToStartH + base.techH + base.downH - base.tripH) > 1e-6) bad(`tiles ${(base.hikeH + base.climbToStartH + base.techH + base.downH).toFixed(2)} != total ${base.tripH.toFixed(2)}`);
    const one = planTimes(route, { party: 1 }), three = planTimes(route, { party: 3 }), four = planTimes(route, { party: 4 });
    if (Math.abs(one.tripH - base.tripH) > 1e-9) bad("a party of 1 is not timed as a pair");
    for (const k of ["hikeH", "techH", "downH", "tripH"]) if (three[k] < base[k] - 1e-9 || four[k] < three[k] - 1e-9) bad(`a bigger party is FASTER on ${k}`);
    if (four.tripH <= base.tripH) bad("party 4 does not lengthen the trip");
    if (Math.abs(four.partyH - (four.tripH - base.tripH)) > 1e-6) bad("partyH does not equal what the party added");
    st.party4Pct.push((four.tripH / base.tripH - 1) * 100);
    if (r.pitches > 0 && !/^(mountaineering|scrambling)/.test(disc)) st.party3PitchedH.push(three.techH - base.techH);
    const light = planTimes(route, { pack: 5 }), heavy = planTimes(route, { pack: 25 });
    for (const k of ["hikeH", "downH", "tripH"]) if (heavy[k] < base[k] - 1e-9 || base[k] < light[k] - 1e-9) bad(`a heavier pack is FASTER on ${k}`);
    if (base.walkUpH > 0 && !(heavy.walkUpH > base.walkUpH)) bad("a walked leg does not move with the pack");
    st.pack25Pct.push((heavy.tripH / base.tripH - 1) * 100);
    const sd4 = summitDayPlan(route, base, { depart: 4 }), sdN = summitDayPlan(route, base, { depart: -1 });
    if (sd4) {
      st.multiDay++;
      if (sd4.timed) {
        if (!fin(sdN.summitClock + 5) || Math.abs((sd4.summitClock - 4) - (sdN.summitClock + 1)) > 1e-9) bad(`a camp start the night before shifts the summit clock wrongly (${sdN.summitClock})`);
        else st.nightOk++;
      }
    }
  }
  report[disc] = {
    routes: st.routes, timed: st.timed, multiDay: st.multiDay, nightStartsChecked: st.nightOk,
    party4MedianPct: med(st.party4Pct) != null ? +med(st.party4Pct).toFixed(1) : null,
    party3OnPitchesMedianMin: med(st.party3PitchedH) != null ? Math.round(med(st.party3PitchedH) * 60) : null,
    pack25kgMedianPct: med(st.pack25Pct) != null ? +med(st.pack25Pct).toFixed(1) : null,
  };
  console.log(disc, JSON.stringify(report[disc]));
}
console.log(`\n${problems.length} problem(s)`);
for (const p of problems.slice(0, 40)) console.log("  ", JSON.stringify(p));
if (outFile) fs.writeFileSync(outFile, JSON.stringify({ date: new Date().toISOString().slice(0, 10), report, problems }, null, 1));
