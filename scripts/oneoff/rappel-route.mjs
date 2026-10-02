// One route at a time: read its rappel fields, then write a researched rap-by-rap breakdown.
//
//   node scripts/oneoff/rappel-route.mjs show <route_id>
//   node scripts/oneoff/rappel-route.mjs apply <patch.json> [--dry]
//
// patch.json: { "id", "area_id", "stations": N, "set": { rappel_detail, rappels, rappel_count_note,
//               descent?, descent_text? }, "allowRange"?: true }
// `apply` refuses unless, after the patch, every reader in lib/rappels.js agrees on N (or, with
// allowRange, the only disagreement is a single-rope range the header states openly), no rendered
// string names an internal id or a third-party source, and every station says something. It saves
// the replaced values to $ROLLBACK_DIR before writing, then re-reads the row.
import fs from "fs";
import path from "path";
import { SUPABASE_URL, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";
import { rappelSummary, rappelHeaderLabel, rappelSingleRopeWarning } from "../../lib/rappels.js";

const COLS = "id,name,area_id,pitches,discipline,grade,rappels,rappel_count_note,rappel_detail,descent,descent_text,gear";
const key = requireServiceKey();
const read = async (id) => {
  const rows = await (await fetch(`${SUPABASE_URL}/rest/v1/routes?id=eq.${encodeURIComponent(id)}&select=${COLS}`, { headers: headers(key) })).json();
  if (!Array.isArray(rows) || rows.length !== 1) throw new Error(`expected 1 row for ${id}, got ${JSON.stringify(rows).slice(0, 200)}`);
  return rows[0];
};
const cam = (r) => ({ ...r, rappelDetail: r.rappel_detail, rappelCountNote: r.rappel_count_note, descentText: r.descent_text });
const SOURCE = /mountain ?project|summitpost|mountaineers\b|cascade ?climbers|\bwta\b|alpinedave|peakbagger|supertopo|guidebook|beckey(?![- ]+(?:route|variation|chimney|gully))|nelson'?s/i;

const [cmd, arg] = process.argv.slice(2);
const DRY = process.argv.includes("--dry");

if (cmd === "show") {
  const r = await read(arg);
  const c = cam(r);
  console.log(`${r.id} | ${r.name} | ${r.area_id} | ${r.discipline} | ${r.grade} | pitches ${r.pitches}`);
  console.log("HEADER:", rappelHeaderLabel(c), "| summary", JSON.stringify(rappelSummary(c)), "| warning", rappelSingleRopeWarning(c));
  console.log("RAPPELS:", r.rappels);
  console.log("NOTE:", r.rappel_count_note);
  console.log("DESCENT:", r.descent);
  console.log("DESCENT_TEXT:", r.descent_text);
  console.log("GEAR:", JSON.stringify(r.gear));
  for (const s of r.rappel_detail || []) console.log(`  S${s.n} ${s.lengthM ?? "—"}m | anchor: ${s.anchor || ""} | station: ${s.station || ""} | notes: ${s.notes || ""} | pull: ${s.pull || ""} | hazards: ${JSON.stringify(s.hazards || [])}`);
} else if (cmd === "apply") {
  const p = JSON.parse(fs.readFileSync(arg, "utf8"));
  const r = await read(p.id);
  if (r.area_id !== p.area_id) throw new Error(`${p.id} is on ${r.area_id}, patch says ${p.area_id} — refusing`);
  // A text-only fix keeps the stored table: omit rappel_detail from `set`.
  const keepTable = !("rappel_detail" in p.set);
  const d = keepTable ? r.rappel_detail : p.set.rappel_detail;
  // stations: 0 means no source publishes a count: the table is removed rather than invented.
  if (p.stations === 0) { if (d !== null) throw new Error("stations 0 needs rappel_detail: null"); }
  else if (!Array.isArray(d) || d.length !== p.stations) throw new Error(`patch has ${d && d.length} stations, says ${p.stations}`);
  (d || []).forEach((s, i) => {
    if (s.n !== i + 1) throw new Error(`station ${i + 1} is numbered ${s.n}`);
    if (![s.station, s.notes].some((x) => typeof x === "string" && x.trim().length >= 20)) throw new Error(`station ${s.n} says nothing`);
    if (s.lengthM != null && !(typeof s.lengthM === "number" && s.lengthM > 0 && s.lengthM <= 70)) throw new Error(`station ${s.n} lengthM ${s.lengthM}`);
  });
  const after = cam({ ...r, ...p.set, rappel_detail: d });
  const s = rappelSummary(after), h = rappelHeaderLabel(after);
  console.log("HEADER:", h, "|", JSON.stringify(s), "| warning:", rappelSingleRopeWarning(after));
  if ((s.documented || 0) !== p.stations) throw new Error("documented count is not the patch's station count");
  if (s.disagrees && !p.allowRange) throw new Error("prose still reports more rappels than the table");
  if (s.singleRopeExceeds && !p.allowRange) throw new Error("a single-rope count exceeds the table");
  const text = JSON.stringify(p.set);
  const id = text.match(/\b(?:wa|or|ca|co|ut)_[a-z0-9_]{4,}\b/); if (id) throw new Error(`rendered text names an internal id: ${id[0]}`);
  const src = text.match(SOURCE); if (src) throw new Error(`rendered text names a source: ${src[0]}`);
  if (DRY) { console.log("--dry: not written"); process.exit(0); }
  const dir = process.env.ROLLBACK_DIR || "/Users/nathanbarber/.claude/jobs/5f66ec87/tmp/rappel-rollback";
  fs.mkdirSync(dir, { recursive: true });
  const old = {}; for (const k of Object.keys(p.set)) old[k] = r[k];
  fs.writeFileSync(path.join(dir, `${p.id}.json`), JSON.stringify({ id: p.id, old }, null, 1));
  await patchRow("routes", p.id, p.set);
  const b = await read(p.id);
  if ((b.rappel_detail || []).length !== p.stations || ("rappels" in p.set && b.rappels !== p.set.rappels)) throw new Error("re-read does not match what was written");
  console.log(`written and re-read: ${p.id} — ${p.stations} stations`);
} else {
  console.log("usage: show <id> | apply <patch.json> [--dry]");
}
