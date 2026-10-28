// fill-high-point-from-summit.mjs — fill TECHNICAL STATS "High point" (routes.high_point_ft) on alpine and
// mountaineering routes that finish on a summit, from a record the route already carries. Nothing is fetched.
//
//   node scripts/pipeline/fill-high-point-from-summit.mjs                      measure + plan, no writes
//   node scripts/pipeline/fill-high-point-from-summit.mjs --apply [--limit N]  write, paced (owner's bulk-write rule)
//
// Two candidate sources, MEASURED SEPARATELY on the rows that already hold a high_point_ft:
//   pin   the route's own Summit waypoint elevation
//   peak  the parent area's elevation_ft, when that area is a peak
// A source is written only if, on the stored rows the rule accepts, it reproduces the stored value within
// 50 ft at least 95% of the time (MIN_AGREE). Measured 2026-10-28 on 5,669 alpine+mountaineering rows:
//   pin   361 of 362 within 50 ft (99.7%), 317 exact        -> written (6 rows filled)
//   peak   28 of  45 within 50 ft (62.2%), 24 exact, rows with no pin -> NOT written (113 rows held)
// The peak figure fails because a route on a peak's area often tops out on a sub-summit or spire of it
// (Hozomeen South Peak, Garfield's Leaning Spire, the Mowich Face routes ending on Liberty Cap). Pooled,
// the two sources read 95.4% — a pass carried entirely by the pins — which is why they are judged apart.
//
// The rule refuses (and the plan lists why):
//   - a parent that is not an area of type peak (a crag parent: high_point_ft tracks the BASE there)
//   - a traverse / link-up (its high point is the highest of several summits)
//   - any base-like or Topout pin (with a base/topout pair the column tracks the BASE, measured 6 of 7)
//   - a name or text saying the line stops below the top (to the col / notch / shoulder, variation ends,
//     rejoins another line, most parties rappel, ...)
//   - two Summit pins more than 50 ft apart, or a pin and the peak more than 50 ft apart
// Writes are compare-and-set: PATCH ... &high_point_ft=is.null&area_id=eq.<asserted>, so a value someone
// else wrote in the meantime is never replaced. Every written row is re-read and reconciled. The rollback
// file (every id and its prior value, null) is written under OUT_DIR before the first write; --apply
// requires OUT_DIR to be set. 2026-10-28 run: OUT_DIR=~/dev/mp-data/_high_point.
import fs from "fs";
import path from "path";
import os from "os";
import { selectAll, requireServiceKey, patchRow, SUPABASE_URL, headers } from "../lib/supabase-env.mjs";

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const li = args.indexOf("--limit");
const LIMIT = li >= 0 ? +args[li + 1] : Infinity;
const OUT_DIR = process.env.OUT_DIR || path.join(os.tmpdir(), "high-point");
if (APPLY && !process.env.OUT_DIR) throw new Error("set OUT_DIR to a folder that will outlive this session — the rollback file is written there");
const PACE_MS = 1000, SLOW_MS = 4000, BACKOFF_MS = 90000, TOL_FT = 50, MIN_AGREE = 0.95;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const TRAVERSE = /travers|link-?up|enchain|integral|grand tour|\bcircuit\b|\bhorseshoe\b|ridge run/i;
const BELOW_NAME = /\b(col|notch|saddle|gap|pass|shoulder|cleaver|bergschrund|cirque|lower|approach|bivy|camp)\b/i;
const BELOW_TEXT = /\b(to|at|reach(es|ing)?|gains?|ends? (at|on|in)|tops? out (at|on)|finish(es)? (at|on)) the (col|notch|saddle|gap|pass|shoulder|false summit|subsummit|sub-summit|fore-?summit|ridge crest|top of the (couloir|gully|face|wall|buttress|cliff))\b|variation ends|route ends|climb ends|ends (below|short)|stops? (at|below|short)|short of the summit|below the summit|(does not|doesn'?t|do not|don'?t|rarely|seldom|not) (continue|go|reach|climb|carry on)[^.]{0,30}summit|without (reaching|going to|continuing to) the summit|most parties (descend|rappel|rap|bail)|descend from the (shoulder|col|notch|saddle|top of)|rappel the (route|line|couloir|gully)|rap the route|retreat from|turn(ed)? around|not (a|the) summit|summit (is|was) (not|optional)|optional summit|\brejoin/i;
const BASEISH = /^(base|route ?base|route[- _]?start|start|base\/bivy|crag\/route start|climbing area|crag|topout)$/i;

function classify(r, area) {
  const why = [];
  if (!area || area.area_type !== "peak") why.push(`parent-not-peak(${area ? area.area_type : "missing"})`);
  const text = `${r.name || ""}\n${r.description || ""}\n${r.overview || ""}`;
  if (TRAVERSE.test(text)) why.push("traverse");
  if (BELOW_NAME.test(r.name || "")) why.push("name-below-summit");
  if (BELOW_TEXT.test(text)) why.push("text-below-summit");
  const wps = Array.isArray(r.waypoints) ? r.waypoints : [];
  if (wps.some((w) => w && BASEISH.test(String(w.type || "").trim()))) why.push("base-or-topout-pin");
  const pins = [...new Set(wps.filter((w) => w && /^summit$/i.test(String(w.type || "").trim()) && +w.elev > 0).map((w) => Math.round(+w.elev)))];
  if (pins.length > 1 && Math.max(...pins) - Math.min(...pins) > TOL_FT) why.push("summit-pins-disagree");
  const pin = pins.length ? Math.max(...pins) : null;
  const peak = area && area.area_type === "peak" && area.elevation_ft > 0 ? area.elevation_ft : null;
  if (pin != null && peak != null && Math.abs(pin - peak) > TOL_FT) why.push("pin-vs-peak-disagree");
  if (pin == null && peak == null) why.push("no-elevation");
  return { ok: !why.length, why, pin, peak, src: pin != null ? "pin" : "peak", value: pin != null ? pin : peak };
}

const key = requireServiceKey();
const routes = await selectAll("routes", "id,name,area_id,discipline,description,overview,high_point_ft,waypoints",
  "discipline=in.(alpine,mountaineering)", { pageSize: 250, key });
const areaIds = [...new Set(routes.map((r) => r.area_id))];
const areas = new Map();
for (let i = 0; i < areaIds.length; i += 150) {
  const chunk = areaIds.slice(i, i + 150);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/areas?select=id,name,area_type,elevation_ft&id=in.(${chunk.map((s) => `"${s}"`).map(encodeURIComponent).join(",")})`, { headers: headers(key) });
  if (!res.ok) throw new Error(`areas read -> ${res.status}`);
  for (const a of await res.json()) areas.set(a.id, a);
}
if (areas.size !== areaIds.length) throw new Error(`read ${areas.size} of ${areaIds.length} parent areas — refusing to plan on a partial read`);

// 1. Measure each source on the rows that already hold a value.
const agree = { pin: { n: 0, w: 0, exact: 0 }, peak: { n: 0, w: 0, exact: 0 } };
const misses = [];
for (const r of routes.filter((x) => x.high_point_ft != null)) {
  const c = classify(r, areas.get(r.area_id));
  if (!c.ok) continue;
  const d = Math.abs(c.value - r.high_point_ft), a = agree[c.src];
  a.n++; if (d <= TOL_FT) a.w++; if (d === 0) a.exact++;
  if (d > TOL_FT) misses.push(`${r.id} [${c.src}] stored ${r.high_point_ft}, rule ${c.value}`);
}
const passes = {};
for (const [s, a] of Object.entries(agree)) {
  passes[s] = a.n >= 20 && a.w / a.n >= MIN_AGREE;
  console.log(`${s}: ${a.w} of ${a.n} within ${TOL_FT} ft (${a.n ? (100 * a.w / a.n).toFixed(1) : "-"}%), ${a.exact} exact -> ${passes[s] ? "WRITE" : "do not write"}`);
}
console.log(`disagreements over ${TOL_FT} ft:\n  ${misses.join("\n  ")}`);

// 2. Plan the blanks.
const plan = [], held = [], refused = {};
for (const r of routes.filter((x) => x.high_point_ft == null)) {
  const c = classify(r, areas.get(r.area_id));
  if (!c.ok) { for (const w of c.why) { const k = w.replace(/\(.*/, ""); refused[k] = (refused[k] || 0) + 1; } continue; }
  (passes[c.src] ? plan : held).push({ id: r.id, area_id: r.area_id, name: r.name, area: areas.get(r.area_id).name, src: c.src, high_point_ft: c.value });
}
const blank = routes.filter((x) => x.high_point_ft == null).length;
console.log(`rows ${routes.length}; blank high point ${blank}; PLAN ${plan.length}; held (source failed the measurement) ${held.length}`);
console.log("refused (a row can have several reasons):", refused);
for (const p of plan) console.log(`  ${p.id} | ${p.name} | ${p.area} | ${p.high_point_ft} ft [${p.src}]`);
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, "plan.json"), JSON.stringify({ agree, misses, plan, held, refused }, null, 1));
if (!APPLY) { console.log(`plan written to ${OUT_DIR}/plan.json — re-run with --apply to write`); process.exit(0); }

// A read the app itself makes; slow or failing means the database is struggling, and a bulk job waits.
async function probeMs() {
  const t = Date.now();
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id&id=eq.${encodeURIComponent(plan[0].id)}`, { headers: headers(key) });
    return res.ok ? Date.now() - t : Infinity;
  } catch { return Infinity; }
}

const batch = plan.slice(0, LIMIT);
const rbFile = path.join(OUT_DIR, `rollback-${Date.now()}.json`);
fs.writeFileSync(rbFile, JSON.stringify(batch.map((p) => ({ id: p.id, area_id: p.area_id, before: { high_point_ft: null }, wrote: { high_point_ft: p.high_point_ft } })), null, 1));
console.log(`rollback ${rbFile}`);
const log = [];
for (const p of batch) {
  let ms = await probeMs();
  while (ms > SLOW_MS) {
    console.error(`health probe ${ms} ms — backing off ${BACKOFF_MS / 1000} s`);
    await sleep(BACKOFF_MS);
    ms = await probeMs();
  }
  try {
    await patchRow("routes", p.id, { high_point_ft: p.high_point_ft }, { filter: `high_point_ft=is.null&area_id=eq.${encodeURIComponent(p.area_id)}` });
    log.push({ id: p.id, wrote: p.high_point_ft });
    console.log(`${p.id}: high_point_ft ${p.high_point_ft}`);
  } catch (e) {
    // 0 rows changed = someone filled it first, or the row moved area: both mean leave it alone.
    log.push({ id: p.id, skipped: String(e.message || e).slice(0, 200) });
    console.error(`SKIP ${p.id}: ${String(e.message || e).slice(0, 200)}`);
  }
  await sleep(PACE_MS);
}
// Re-read every row and reconcile: a 200 is not evidence the data changed.
const wrote = log.filter((l) => l.wrote != null);
const after = await selectAll("routes", "id,high_point_ft", `id=in.(${wrote.map((l) => `"${l.id}"`).map(encodeURIComponent).join(",")})`, { pageSize: 250, key });
const am = new Map(after.map((r) => [r.id, r.high_point_ft]));
const bad = wrote.filter((l) => am.get(l.id) !== l.wrote);
fs.writeFileSync(path.join(OUT_DIR, `apply-${Date.now()}.json`), JSON.stringify(log, null, 1));
console.log(`written ${wrote.length} of ${batch.length}; re-read ${after.length}, mismatched ${bad.length}${bad.length ? ": " + bad.map((b) => b.id).join(", ") : ""}`);
if (bad.length) process.exit(1);
