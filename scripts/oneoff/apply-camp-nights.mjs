// Applies researched NIGHT BY NIGHT camping (owner note 2026-11-26) from
// enrichment-wip/camp-nights/output/bNN.json to routes.bivy: per camp `nights`, `role`, `why`, and
// new camps only where a night had none on file.
//
//   node scripts/oneoff/apply-camp-nights.mjs <output.json> --dry           validate + print plan
//   node scripts/oneoff/apply-camp-nights.mjs <output.json> --copy-batch F  write the audit:copied-prose shape
//   node scripts/oneoff/apply-camp-nights.mjs <output.json> --write         write (paced), rollback, reconcile
//
// REFUSES (route skipped, listed): confidence "low"; a camp name not on the route (bivy or Campsite pin);
// a night outside the plan; a plan night with zero or two main camps; a why outside 40-240 chars, with a
// source named, an emoji or shouting; a new camp with no researched elevation. A camp on file that the
// research did not mention keeps what it had. Reads the LIVE row right before writing, and refuses a row
// whose camps changed since the census (another session or a climber edited it).
import { readFileSync, writeFileSync } from "node:fs";
import { SUPABASE_URL, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const args = process.argv.slice(2);
const file = args[0];
const DRY = !args.includes("--write");
const copyAt = args.indexOf("--copy-batch");
const research = JSON.parse(readFileSync(file, "utf8"));
const inputFile = file.replace("/output/", "/input/");
const input = Object.fromEntries(JSON.parse(readFileSync(inputFile, "utf8")).map(r => [r.id, r]));

const SOURCE_WORDS = /summitpost|peakbagger|mountaineers|cascadeclimbers|nwhikers|\bwta\b|guidebook|beckey|trip reports? (say|note|describe)|according to|reportedly|https?:|www\./i;
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
const SHOUT = /\b[A-Z]{4,}\b(?:\s+\b[A-Z]{3,}\b)+/;
const proseBad = (t, lo, hi) => {
  const s = String(t || "").trim();
  if (s.length < lo || s.length > hi) return `length ${s.length} not ${lo}-${hi}`;
  if (SOURCE_WORDS.test(s)) return "names a source";
  if (EMOJI.test(s)) return "emoji";
  if (SHOUT.test(s)) return "shouting";
  return null;
};
const key = v => String(v == null ? "" : v).trim().toLowerCase();

async function liveRow(id) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,bivy,waypoints,itinerary&id=eq.${encodeURIComponent(id)}`, { headers: headers(requireServiceKey()) });
  if (!res.ok) throw new Error(`GET ${id} -> ${res.status}`);
  const rows = await res.json();
  return rows[0] || null;
}

const plans = [], refused = [];
for (const r of research) {
  const inp = input[r.id];
  if (!inp) { refused.push([r.id, "not in the input batch"]); continue; }
  if (r.confidence === "low") { refused.push([r.id, "low confidence"]); continue; }
  const days = inp.trip_plan.days.length;
  const onFile = new Set(inp.camps_on_file.map(c => key(c.name)));
  const pins = new Set(inp.campsite_pins.map(c => key(c.name)));
  const errs = [];
  const camps = (r.camps || []).map(c => ({ ...c, nights: (c.nights || []).map(Number) }));
  const news = (r.new_camps || []).map(c => ({ ...c, nights: (c.nights || []).map(Number) }));
  for (const c of camps) {
    if (!onFile.has(key(c.name)) && !pins.has(key(c.name))) errs.push(`camp "${c.name}" is not on the route`);
  }
  for (const c of news) {
    if (onFile.has(key(c.name))) errs.push(`new camp "${c.name}" is already on file`);
    if (!(Number(c.elev_ft) > 0)) errs.push(`new camp "${c.name}" has no researched elevation`);
    for (const f of ["water", "capacity", "permit"]) if (c[f] && proseBad(c[f], 3, 600)) errs.push(`new camp "${c.name}" ${f}: ${proseBad(c[f], 3, 600)}`);
    if (c.notes && proseBad(c.notes, 20, 700)) errs.push(`new camp "${c.name}" notes: ${proseBad(c.notes, 20, 700)}`);
  }
  const all = camps.concat(news);
  for (const c of all) {
    if (!["main", "route"].includes(c.role)) errs.push(`"${c.name}" role ${c.role}`);
    if (c.nights.some(n => !Number.isInteger(n) || n < 0 || n > days - 1)) errs.push(`"${c.name}" nights ${JSON.stringify(c.nights)} outside 0-${days - 1}`);
    const pb = proseBad(c.why, 40, 240); if (pb) errs.push(`"${c.name}" why: ${pb}`);
  }
  for (let n = 1; n < days; n++) {
    const m = all.filter(c => c.role === "main" && c.nights.includes(n)).length;
    if (m !== 1) errs.push(`night ${n} has ${m} main camps`);
  }
  if (errs.length) { refused.push([r.id, errs.join("; ")]); continue; }
  plans.push({ id: r.id, camps, news, sources: r.sources || [], census: inp.camps_on_file.map(c => key(c.name)).sort().join("|") });
}

console.log(`${file}: ${plans.length} to apply, ${refused.length} refused`);
refused.forEach(([id, why]) => console.log(`  REFUSED ${id}: ${why}`));

if (copyAt > 0) {
  const shaped = {};
  for (const p of plans) shaped[p.id] = { area: "camp-nights", bivy: p.camps.map(c => ({ why: c.why })).concat(p.news.map(c => ({ why: c.why, water: c.water || "", capacity: c.capacity || "", permit: c.permit || "", notes: c.notes || "" }))), review: { sources: p.sources } };
  writeFileSync(args[copyAt + 1], JSON.stringify(shaped, null, 1));
  console.log("wrote", args[copyAt + 1]);
}
if (DRY) process.exit(0);

const rollback = [], done = [], stale = [];
const rbPath = file.replace(/\.json$/, `.rollback-${Date.now()}.json`);
for (const p of plans) {
  const live = await liveRow(p.id);
  if (!live) { stale.push([p.id, "row gone"]); continue; }
  const bivy = Array.isArray(live.bivy) ? live.bivy : [];
  const now = bivy.filter(b => b && b.role !== "hidden").map(b => key(b.name)).sort().join("|");
  if (now !== p.census) { stale.push([p.id, "camps changed since the census"]); continue; }
  rollback.push({ id: p.id, bivy: live.bivy });
  writeFileSync(rbPath, JSON.stringify(rollback));
  const by = new Map(p.camps.map(c => [key(c.name), c]));
  const next = bivy.map(b => {
    const c = b && by.get(key(b.name));
    if (!c || b.role === "hidden") return b;
    by.delete(key(b.name));
    return { ...b, role: c.role, nights: c.nights, why: c.why.trim() };
  });
  // A camp the research named that exists only as a Campsite PIN: a bivy entry of the same name joins it (campSites merges on name).
  for (const c of by.values()) next.push({ name: c.name, role: c.role, nights: c.nights, why: c.why.trim() });
  for (const c of p.news) next.push({ name: c.name.trim(), type: c.type || "camp", elev: Math.round(Number(c.elev_ft)), role: c.role, nights: c.nights, why: c.why.trim(), water: c.water || "", capacity: c.capacity || "", permit: c.permit || "", notes: c.notes || "" });
  await patchRow("routes", p.id, { bivy: next });
  done.push([p.id, next]);
}
// Reconcile: a 200 is not evidence the data changed.
let bad = 0;
for (const [id, want] of done) {
  const live = await liveRow(id);
  if (JSON.stringify(live && live.bivy) !== JSON.stringify(want)) { bad++; console.log(`  RECONCILE FAIL ${id}`); }
  await new Promise(r => setTimeout(r, 300));
}
console.log(`wrote ${done.length}, reconciled ${done.length - bad}/${done.length}, stale ${stale.length}; rollback ${rbPath}`);
stale.forEach(([id, why]) => console.log(`  STALE ${id}: ${why}`));
if (bad) process.exit(1);
