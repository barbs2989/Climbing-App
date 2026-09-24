// Applies the two declared repair sets for text that sat in the wrong place on the route page:
//
//   fa-research-voice-rewrites.json  { id: newFa | null }
//     `fa` renders as a one-line "FIRST ASCENT · …" strap. Enrichment wrote research ARGUMENT into
//     it ("the account does not name a specific line, but the cliffed north face makes this … the
//     only plausible non-technical route the 1933 party could have used"), plus source names and
//     notes about what was "stored here previously". The strap gets who and when.
//
//   pipeline-voice-repairs.json  [id, path, find, replace]  (find=null -> delete the key/element)
//     The research pass talking to itself on screen: "County SAR line was NOT verified this
//     session", "not found in available sources", "(see corrections)", "per Mountain Project".
//
//   EMERGENCY_VARIANTS below — the "SAR line not verified this session" sentence in ~11 exact
//     spellings, applied to every route's emergency.notes that contains one.
//
// Every edit must match EXACTLY ONCE in the LIVE value or the whole run refuses before writing,
// so nothing is half-applied and nothing is written over a value that changed since it was read.
// Writes go through patchRow (throws unless exactly one row came back); every touched row is
// re-read afterwards and compared with what was intended.
//
//   node scripts/oneoff/apply-misplaced-prose-repairs.mjs --dry
//   node scripts/oneoff/apply-misplaced-prose-repairs.mjs
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { SUPABASE_URL, headers, requireServiceKey, patchRow, selectAll } from "../lib/supabase-env.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DRY = process.argv.includes("--dry");
const key = requireServiceKey();

const FA = JSON.parse(fs.readFileSync(path.join(HERE, "fa-research-voice-rewrites.json"), "utf8"));
const EDITS = JSON.parse(fs.readFileSync(path.join(HERE, "pipeline-voice-repairs.json"), "utf8"));
const EMERGENCY_VARIANTS = [
  ["County SAR non-emergency line was NOT verified this session. Call 911 for emergencies.", "Call 911 for emergencies."],
  ["County SAR non-emergency line was NOT independently verified this session — dial 911 for emergencies.", "Call 911 for emergencies."],
  ["County SAR non-emergency line not verified this session; dial 911 for emergencies.", "Call 911 for emergencies."],
  ["County SAR non-emergency number was NOT verified this session -- call 911 for emergencies.", "Call 911 for emergencies."],
  ["County SAR non-emergency line was NOT verified this session - call 911 for emergencies.", "Call 911 for emergencies."],
  ["County SAR non-emergency line was NOT verified this session; call 911 for emergencies.", "Call 911 for emergencies."],
  ["County SAR non-emergency line was NOT verified this session — use 911. Hospital not verified.", "Use 911 for emergencies."],
  ["Snohomish County SAR non-emergency line was NOT verified this session — use 911 for emergencies.", "Use 911 for emergencies."],
  ["King County SAR non-emergency line was NOT verified this session — use 911 for emergencies.", "Use 911 for emergencies."],
  ["County SAR/sheriff non-emergency line not verified this session; use 911.", "Use 911 for emergencies."],
  ["Whatcom County SAR coordinated via Sheriff's Office but the specific line was not independently verified this session.", "Whatcom County SAR is coordinated via the Sheriff's Office."],
];
// Camp notes are copied onto every route that shares the camp, so one sentence recurs on up to 29
// routes. Each is the research pass explaining why it left a FIELD empty ("No elevation is recorded
// here because none is reliably sourced"). Keep the fact about the ground, drop the bookkeeping.
const BIVY_VARIANTS = [
  ["No elevation is recorded here because none is reliably sourced; treat it", "Treat it"],
  ["The objective itself, recorded here because the obvious question about a standing lookout has a clear answer and getting it wrong in either direction matters: you may walk", "The lookout itself: you may walk"],
  ["Elevation is not recorded here because a confident figure could not be established; it sits", "It sits"],
  ["No single elevation is recorded here for that reason.", ""],
  ["No elevation is recorded here because a confident figure could not be sourced; it sits", "It sits"],
  ["Published elevations for the usual spots vary because parties camp at several benches at different heights, so no single figure is recorded here.", "Parties camp at several benches at different heights."],
  ["Published elevations for the col disagree badly, with figures from roughly 6,600 to 7,400 feet, so no number is recorded here rather than pick one.", "Estimates of the col's height run from roughly 6,600 to 7,400 feet."],
  ["Recorded here only because parties benighted on the walk in have stopped", "An emergency option only: parties benighted on the walk in have stopped"],
  ["This is deliberately the only Kololo camp recorded here — the lower camps on the same approach, at the river bench, at White Pass and at the gap above this basin, all belong to the Glacier Peak file and are not repeated.", "Lower camps on the same approach sit at the river bench, at White Pass and at the gap above this basin."],
  ["Published elevations for the flats come only from sources that could not be verified, so none is recorded here.", ""],
  ["Published elevations for the lookout differ by several hundred feet, so none is recorded here.", ""],
];

const parse = (p) => p.split(".").flatMap((seg) => { const m = seg.match(/^([^[]+)((?:\[\d+\])*)$/); return [m[1], ...[...m[2].matchAll(/\[(\d+)\]/g)].map((x) => +x[1])]; });
const count = (s, sub) => s.split(sub).length - 1;

// ---- read every row the declared edits touch, plus every emergency.notes carrying a variant ----
const ids = new Set([...Object.keys(FA), ...EDITS.map((e) => e[0])]);
const emerg = await selectAll("routes", "id,emergency", "emergency->>notes=ilike.*this%20session*", { key, pageSize: 1000 });
for (const r of emerg) ids.add(r.id);
const withCamps = (await selectAll("routes", "id,bivy", "bivy=not.is.null", { key, pageSize: 1000 }))
  .filter((r) => Array.isArray(r.bivy) && r.bivy.some((b) => b && /recorded here/i.test(b.notes || "")));
for (const r of withCamps) ids.add(r.id);
const live = {};
const idList = [...ids];
for (let i = 0; i < idList.length; i += 40) {
  const chunk = idList.slice(i, i + 40);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=*&id=in.(${chunk.map(encodeURIComponent).join(",")})`, { headers: headers(key) });
  if (!res.ok) throw new Error(`read ${res.status} ${await res.text()}`);
  for (const r of await res.json()) live[r.id] = r;
}
const missing = idList.filter((id) => !live[id]);
if (missing.length) throw new Error(`ids not in the live DB (refusing): ${missing.join(", ")}`);

// ---- build the new column values, refusing on any edit that does not land exactly once ----
const next = {}; // id -> { col: newValue }
const col = (id, c) => { next[id] ||= {}; if (!(c in next[id])) next[id][c] = structuredClone(live[id][c]); return next[id][c]; };
const problems = [];
let nEdits = 0;

for (const [id, v] of Object.entries(FA)) {
  const cur = live[id].fa;
  if (typeof cur !== "string") { problems.push(`${id} fa: live value is ${JSON.stringify(cur)}`); continue; }
  next[id] ||= {}; next[id].fa = v; nEdits++;
}
for (const [id, p, find, repl] of EDITS) {
  const [c, ...rest] = parse(p);
  let root = col(id, c);
  if (!rest.length) {
    if (find === null) { next[id][c] = null; nEdits++; continue; }
    if (typeof root !== "string" || count(root, find) !== 1) { problems.push(`${id} ${p}: find matches ${typeof root === "string" ? count(root, find) : "non-string"}x`); continue; }
    next[id][c] = root.replace(find, () => repl); nEdits++; continue;
  }
  let parent = root;
  for (const k of rest.slice(0, -1)) parent = parent?.[k];
  const last = rest.at(-1);
  if (parent == null || !(last in parent)) { problems.push(`${id} ${p}: path absent`); continue; }
  if (find === null) { Array.isArray(parent) ? parent.splice(last, 1) : delete parent[last]; nEdits++; continue; }
  const s = parent[last];
  if (typeof s !== "string" || count(s, find) !== 1) { problems.push(`${id} ${p}: find matches ${typeof s === "string" ? count(s, find) : "non-string"}x`); continue; }
  parent[last] = s.replace(find, () => repl); nEdits++;
}
let nEmerg = 0;
for (const r of emerg) {
  const e = col(r.id, "emergency");
  if (!e || typeof e.notes !== "string") continue;
  for (const [f, t] of EMERGENCY_VARIANTS) if (e.notes.includes(f)) { e.notes = e.notes.split(f).join(t); nEmerg++; }
}
let nBivy = 0;
for (const r of withCamps) {
  for (const b of col(r.id, "bivy")) {
    if (!b || typeof b.notes !== "string") continue;
    let n = b.notes;
    for (const [f, t] of BIVY_VARIANTS) if (n.includes(f)) { n = n.split(f).join(t); nBivy++; }
    b.notes = n.replace(/ {2,}/g, " ").trim();
    if (/recorded here/i.test(b.notes)) problems.push(`${r.id} bivy "${b.name}": notes still say "recorded here" — add the sentence to BIVY_VARIANTS`);
  }
}
const leftover = Object.entries(next).filter(([, c]) => c.emergency && /this session/i.test(c.emergency.notes || "")).map(([id, c]) => `${id}: ${c.emergency.notes}`);
if (leftover.length) problems.push(...leftover.map((l) => `emergency.notes still says "this session" — add its spelling to EMERGENCY_VARIANTS: ${l}`));

if (problems.length) { console.error(`REFUSING — ${problems.length} edit(s) do not land cleanly:\n  ` + problems.join("\n  ")); process.exit(1); }
console.log(`fa rewrites ${Object.keys(FA).length} · declared edits ${nEdits - Object.keys(FA).length} · emergency-variant replacements ${nEmerg} · camp-note replacements ${nBivy} · rows ${Object.keys(next).length}`);

if (DRY) {
  for (const [id, cols] of Object.entries(next)) for (const [c, v] of Object.entries(cols)) {
    const a = JSON.stringify(live[id][c]), b = JSON.stringify(v);
    if (a !== b) console.log(`\n${id}.${c}\n  - ${a.slice(0, 400)}\n  + ${b.slice(0, 400)}`);
  }
  console.log("\n--dry: nothing written");
  process.exit(0);
}

// ---- write, then re-read and reconcile ----
for (const [id, cols] of Object.entries(next)) await patchRow("routes", id, cols, { key });
let bad = 0;
for (let i = 0; i < idList.length; i += 40) {
  const chunk = idList.slice(i, i + 40).filter((id) => next[id]);
  if (!chunk.length) continue;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=*&id=in.(${chunk.map(encodeURIComponent).join(",")})`, { headers: headers(key) });
  for (const r of await res.json()) for (const [c, v] of Object.entries(next[r.id])) if (JSON.stringify(r[c]) !== JSON.stringify(v)) { bad++; console.error(`MISMATCH ${r.id}.${c}`); }
}
console.log(bad ? `${bad} column(s) did not read back as written` : `re-read: all ${Object.keys(next).length} rows read back exactly as written`);
process.exit(bad ? 1 : 0);
