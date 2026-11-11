// Wave 2 of the trip-plan work (owner 2026-11-11): "then do text only plans convert day by day, make
// that a rule in the app" and, for research, "Washington only", mixed only on a peak.
//
// Writes `routes.itinerary` for three kinds of row, every plan through lib/itineraryShape.js:
//   research   out-research-*.json — a WA route that had NO plan. Needs 2+ sources, not low
//              confidence, and the COMPLETE bar (every day titled and carrying hours, miles or gain).
//   convert    out-prose-*.json — a route whose plan was PROSE. Written when it clears the COMPLETE
//              bar and is not low confidence; otherwise (or when the converter skipped it) it falls
//              back to MECHANICAL.
//   mechanical the prose split at its own "Day N" markers, each day's text kept whole as that day's
//              note, no figure added. Used for the fallbacks above and for the 27 trad/sport rows in
//              inputs/crag-prose.json (the owner excluded those disciplines from research; a crag route
//              shows no Trip plan, but the rule and migration 0409 cover every row).
// So after --apply no prose plan is left, and nothing the research could not stand behind is written.
//
// Guards: the row's current value must still equal what the inputs recorded (prose string / null),
// its area must not have changed; a before-file is saved first (rollback: write those values back);
// patchRow paces writes; every id is re-read and compared with keys sorted (jsonb reorders keys).
// Dry run by default; --apply writes.
import fs from "node:fs";
import path from "node:path";
import { SUPABASE_URL, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";
import { itineraryShapeErrors } from "../../lib/itineraryShape.js";

const APPLY = process.argv.includes("--apply");
// --dir=<folder> runs the same checks on a later batch (e.g. research-data/trip-plans-2026-11-11-retry, whose retry-*.json inputs are research).
const DIR = (process.argv.find((a) => a.startsWith("--dir=")) || "--dir=research-data/trip-plans-2026-11-11-wave2").slice(6);
const key = requireServiceKey();
const read = (f) => JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8"));
const ROAD = /\b(road|gate|closure|closed|washout|washed out|FR ?\d|forest road|highway|hwy)\b/i;
// Drops only the SENTENCES of a cal line that talk about roads, gates or closures (owner 2026-10-28:
// road text lives in GETTING THERE); the rest of the line, and the plan, are kept.
const dropRoad = (s) => String(s).split(/(?<=[.!?])\s+/).filter((x) => !ROAD.test(x)).join(" ").trim() || undefined;
const canon = (v) => Array.isArray(v) ? v.map(canon) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).filter((k) => v[k] !== undefined).sort().map((k) => [k, canon(v[k])])) : v;

// Inputs: what each row held when it was dumped.
const inputs = new Map();
for (const f of fs.readdirSync(path.join(DIR, "inputs")).filter((f) => /^(research|prose|retry)-\d+\.json$|^crag-prose\.json$/.test(f))) {
  for (const r of read("inputs/" + f)) inputs.set(r.id, { row: r, kind: /^(research|retry)/.test(f) ? "research" : "convert" });
}

/** The same day split the page used to draw prose with (ItineraryView's splitItineraryDays). */
function mechanical(text) {
  const t = String(text).trim();
  const re = /\bDay\s+(\d+)\s*(?:of\s*\d+)?\s*[:—\-)]\s*/gi;
  const marks = []; let m;
  while ((m = re.exec(t))) marks.push({ idx: m.index, end: re.lastIndex });
  const cap = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  const segs = marks.length ? marks.map((mk, i) => t.slice(mk.end, i + 1 < marks.length ? marks[i + 1].idx : t.length).trim().replace(/^[;,.\s]+|[;,\s]+$/g, "")).filter(Boolean) : [t];
  const lead = marks.length && marks[0].idx > 0 ? t.slice(0, marks[0].idx).trim() : "";
  return { cal: lead || undefined, days: segs.map((s, i) => ({ n: i + 1, title: segs.length === 1 ? "Day trip" : "Day " + (i + 1), objective: "", note: cap(s), gainFt: null, lossFt: null, hours: null, miles: null, packLb: null, schedule: [] })) };
}
function clean(it) {
  return { cal: it.cal || undefined, totalNote: it.totalNote || undefined, days: it.days.map((d, i) => ({ n: i + 1, title: d.title, objective: d.objective || "", note: d.note || "", gainFt: d.gainFt ?? null, lossFt: d.lossFt ?? null, hours: d.hours ?? null, miles: d.miles ?? null, packLb: d.packLb ?? null, schedule: (d.schedule || []).filter((s) => s && s.label).map((s) => ({ time: s.time || "", label: s.label, detail: s.detail || "" })) })) };
}

const outs = new Map();
for (const f of fs.readdirSync(DIR).filter((f) => /^out-(research|prose|retry)-\d+\.json$/.test(f))) for (const x of read(f)) outs.set(x.id, { ...x, file: f });

const plan = [], held = [], fellBack = [];
for (const [id, { row, kind }] of inputs) {
  const x = outs.get(id);
  if (kind === "research") {
    if (!x) { held.push({ id, why: "no research output yet" }); continue; }
    if (x.skip) { held.push({ id, why: "research skipped: " + x.reason }); continue; }
    const why = [...itineraryShapeErrors(x.itinerary, { complete: true })];
    if (!Array.isArray(x.sources) || new Set(x.sources).size < 2) why.push("fewer than two sources");
    if (String(x.confidence).toLowerCase() === "low") why.push("low confidence");
    if (x.itinerary && x.itinerary.cal) x.itinerary.cal = dropRoad(x.itinerary.cal); // road text lives in GETTING THERE, not Trip plan
    if (why.length) { held.push({ id, why: why.join("; ") }); continue; }
    plan.push({ id, kind, itinerary: clean(x.itinerary), expect: row.itinerary ?? null, area: row.area_id });
    continue;
  }
  // convert: prose → day by day
  // Hours a converter COMPUTED from a pace rule ("D1/D3 hours derived at ~2 mph + 1 h per 1,000 ft",
  // "D1 hours derived pace": prose-4) are an estimate, not a stated time, and the planner already
  // computes times from the same miles and gain. Those days' hours go back to null.
  if (x && !x.skip && x.itinerary && Array.isArray(x.itinerary.days)) {
    const re = /\b(D\d+(?:\s*[/&,]\s*D?\d+)*)\s+hours?\s+derived/gi; let m;
    while ((m = re.exec(String(x.figureSources || "")))) for (const n of m[1].match(/\d+/g)) { const d = x.itinerary.days[Number(n) - 1]; if (d) d.hours = null; }
  }
  let it = null, reason = null;
  if (!x) reason = "no conversion output";
  else if (x.skip) reason = "converter skipped: " + x.reason;
  else {
    // A conversion keeps the prose's facts and adds only figures it could stand behind, so a day the
    // prose gave no hours/miles/gain for stays a GAP (the page says so, with + Add) rather than sending
    // the whole plan back to the bare mechanical split and losing its titles and cleaned notes.
    const why = itineraryShapeErrors(x.itinerary, { complete: true }).filter((e) => !/has no hours, miles or gain$/.test(e));
    if (String(x.confidence).toLowerCase() === "low") why.push("low confidence");
    if (x.itinerary && x.itinerary.cal) x.itinerary.cal = dropRoad(x.itinerary.cal); // road text lives in GETTING THERE, not Trip plan
    if (why.length) reason = why.join("; ");
    else it = clean(x.itinerary);
  }
  if (!it) { it = mechanical(row.itinerary); fellBack.push({ id, why: reason }); }
  const e = itineraryShapeErrors(it);
  if (e.length) { held.push({ id, why: "mechanical conversion still breaks the rule: " + e.join("; ") }); continue; }
  plan.push({ id, kind: fellBack.some((f) => f.id === id) ? "mechanical" : "convert", itinerary: it, expect: row.itinerary, area: row.area_id });
}
const by = (k) => plan.filter((p) => p.kind === k).length;
console.log("write " + plan.length + " (research " + by("research") + ", converted " + by("convert") + ", mechanical " + by("mechanical") + "); held " + held.length);
fs.writeFileSync(path.join(DIR, "apply-report.json"), JSON.stringify({ plan: plan.map((p) => ({ id: p.id, kind: p.kind })), held, fellBack }, null, 1));
if (!APPLY) { console.log("dry run; --apply to write. Details: " + DIR + "/apply-report.json"); process.exit(0); }

const live = async (ids) => {
  const r = await fetch(SUPABASE_URL + "/rest/v1/routes?select=id,area_id,itinerary&id=in.(" + ids.map(encodeURIComponent).join(",") + ")", { headers: headers(key), signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error("STOPPED: " + r.status + " - the database is not answering; do not retry fast");
  return new Map((await r.json()).map((x) => [x.id, x]));
};
const ids = plan.map((p) => p.id);
const before = {};
for (let i = 0; i < ids.length; i += 50) for (const [id, x] of await live(ids.slice(i, i + 50))) before[id] = x;
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
fs.writeFileSync(path.join(DIR, "before-" + stamp + ".json"), JSON.stringify(Object.fromEntries(Object.entries(before).map(([id, x]) => [id, x.itinerary])), null, 1));
let wrote = 0; const stale = [];
for (const p of plan) {
  const cur = before[p.id];
  if (!cur || cur.area_id !== p.area || JSON.stringify(canon(cur.itinerary ?? null)) !== JSON.stringify(canon(p.expect))) { stale.push(p.id); continue; }
  await patchRow("routes", p.id, { itinerary: p.itinerary });
  wrote++;
}
let ok = 0; const mismatch = [];
const written = plan.filter((p) => !stale.includes(p.id));
for (let i = 0; i < written.length; i += 50) {
  const m = await live(written.slice(i, i + 50).map((p) => p.id));
  for (const p of written.slice(i, i + 50)) (JSON.stringify(canon(m.get(p.id)?.itinerary)) === JSON.stringify(canon(p.itinerary)) ? ok++ : mismatch.push(p.id));
}
console.log("wrote " + wrote + ", stale (changed since dumped; not written) " + stale.length + (stale.length ? " " + stale.join(" ") : "") + ", re-read matching " + ok + " of " + wrote);
if (ok !== wrote) { console.error("FAIL - not read back as written: " + mismatch.join(" ")); process.exit(1); }
