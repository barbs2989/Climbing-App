// Fill EMPTY route records from fill-shells/<route_id>.json (FILL-SHELLS.md). Writes only columns that
// are empty now; `discipline`/`disciplines` may change only on a shell (no overview, approach or beta).
// Text is refused when it shares a 6-word run with a harvested trip report, shouts, or names a source.
// A chosen track is NOT written here: it is listed for apply-verdicts' track path (same 300 m rule).
// Usage: node apply-fill-shells.mjs <fillDir> <harvest.json>... [--write]
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { patchRow, selectAll } from "../../lib/supabase-env.mjs";
import { shoutedStrings } from "../../lib/shouted-prose.mjs";
import { duplicateIn, itemText, sameFact, stackedPin } from "./dedupe.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const args = process.argv.slice(2), WRITE = args.includes("--write");
const [dir, ...files] = args.filter(a => a !== "--write");
const found = r => r.pb && !r.pb.skip && r.pb.dm <= 2000;
const harvest = new Map();
for (const f of files) for (const rec of JSON.parse(fs.readFileSync(f, "utf8"))) if (found(rec) || !harvest.has(rec.area_id)) harvest.set(rec.area_id, rec);
const words = s => String(s).toLowerCase().replace(/[^a-z0-9' ]+/g, " ").split(/\s+/).filter(Boolean);
const grams = (s, n = 6) => { const w = words(s), g = new Set(); for (let i = 0; i + n <= w.length; i++) g.add(w.slice(i, i + n).join(" ")); return g; };
const strings = v => typeof v === "string" ? [v] : Array.isArray(v) ? v.flatMap(strings) : v && typeof v === "object" ? Object.values(v).flatMap(strings) : [];
const empty = v => v == null || v === "" || (Array.isArray(v) && !v.length) || (typeof v === "object" && !Array.isArray(v) && !Object.keys(v).length);
const canon = v => JSON.stringify(v, (k, x) => x && typeof x === "object" && !Array.isArray(x) ? Object.keys(x).sort().reduce((o, kk) => (o[kk] = x[kk], o), {}) : x);
const ALLOWED = ["discipline", "disciplines", "grade", "grade_system", "rock_grade", "season", "best_season", "overview", "beta", "approach", "descent_text", "turnaround", "bail", "high_point_ft", "outing_shape", "gear", "what_to_bring", "hazards", "obj_haz", "watch_out", "pro_tips", "features", "road", "access", "waypoints", "approach_logistics"];
const SOURCE_RE = /\b(peakbagger|summitpost|mountain ?project|wta\b|washington trails|mountaineers|beckey|guidebook|trip reports?|according to|reported by|cascade alpine guide)\b/i;

const writes = [], tracks = [];
for (const f of fs.readdirSync(dir).filter(f => f.endsWith(".json"))) {
  const v = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  if (v.verdict !== "real") { console.log(`LEAVE ${v.route_id}: ${v.verdict}${v.duplicate_of ? " of " + v.duplicate_of : ""}`); continue; }
  const row = (await selectAll("routes", "*", `id=eq.${encodeURIComponent(v.route_id)}`, { pageSize: 5 }))[0];
  if (!row) { console.log(`REFUSE ${v.route_id}: no such row`); continue; }
  const shell = empty(row.overview) && empty(row.approach) && empty(row.beta);
  // a "real" route must not be another route on the same peak under a near-identical name
  const key = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/(the|route|via|standard)/g, "").replace(/s+/g, " ").trim();
  const sibs = await selectAll("routes", "id,name", `area_id=eq.${encodeURIComponent(row.area_id)}&id=neq.${encodeURIComponent(row.id)}`, { pageSize: 500 });
  const twin = sibs.find(x => key(x.name) === key(row.name));
  if (twin) { console.log(`REFUSE ${row.id}: same name as ${twin.id} on this peak — a duplicate route, not a shell to fill`); continue; }
  const rep = grams((harvest.get(row.area_id)?.tracks || []).map(t => t.tr || "").join("\n"));
  const after = {}, refused = [];
  for (const [k, val] of Object.entries(v.fill || {})) {
    if (!ALLOWED.includes(k) || empty(val)) continue;
    if (k === "waypoints") {
      // keep every stored pin; add only a Trailhead the route lacks, with a coordinate
      const cur = row.waypoints || [];
      const add = (val || []).filter(w => /trailhead/i.test(w.type || "") && Number.isFinite(w.lat) && Number.isFinite(w.lng) && !cur.some(c => /trailhead/i.test(c.type || "")));
      if (add.length && stackedPin(add[0], cur)) { refused.push(`waypoints (trailhead sits on "${stackedPin(add[0], cur).name}")`); continue; }
      if (add.length) after.waypoints = [add[0], ...cur];
      continue;
    }
    const disc = k === "discipline" || k === "disciplines";
    if (!empty(row[k]) && !(disc && shell)) continue;
    const bad = strings(val).map(s => { const c = [...grams(s)].find(g => rep.has(g)); return c ? "copied: " + c : SOURCE_RE.test(s) ? "names a source: " + s.slice(0, 60) : shoutedStrings(s).length ? "shouted" : null; }).find(Boolean);
    if (bad) { refused.push(`${k} (${bad})`); continue; }
    let out = val;
    if (Array.isArray(val)) { // no item twice, and none repeating what the row's prose already says
      const prose = [row.overview, row.approach, row.beta, row.descent_text, after.overview, after.approach, after.beta, after.descent_text];
      out = val.filter((x, i) => !val.slice(0, i).some(y => sameFact(itemText(x), itemText(y))) && !duplicateIn(itemText(x), prose));
      if (out.length < val.length) console.log(`  ${row.id} ${k}: dropped ${val.length - out.length} duplicate item(s)`);
      if (!out.length) continue;
    }
    if (canon(row[k]) !== canon(out)) after[k] = out;
  }
  if (refused.length) console.log(`REFUSED in ${v.route_id}: ${refused.join("; ")}`);
  if (Object.keys(after).length) writes.push({ id: row.id, before: Object.fromEntries(Object.keys(after).map(k => [k, row[k] ?? null])), after });
  if (v.track_aid) tracks.push({ route_id: row.id, area_id: row.area_id, aid: String(v.track_aid), why: v.track_why || "" });
  console.log(`${row.id.padEnd(46)} ${shell ? "shell" : "partial"}  fill: ${Object.keys(after).join(",")}${v.track_aid ? "  track " + v.track_aid : ""}`);
}
fs.writeFileSync(path.join(dir, "..", "fill-shells-tracks.json"), JSON.stringify(tracks, null, 1));
console.log(`rows to fill ${writes.length}; tracks listed ${tracks.length} -> fill-shells-tracks.json`);
if (!WRITE) process.exit(0);
const rb = path.join(REPO, "scripts", `rollback-gpx-any-source-fill-shells-${Date.now()}.json`);
fs.writeFileSync(rb, JSON.stringify({ at: new Date().toISOString(), note: "restore with patchRow(routes, id, before)", rows: writes.map(w => ({ id: w.id, before: w.before })) }, null, 1));
console.log("rollback saved", rb);
let bad = 0;
for (const w of writes) await patchRow("routes", w.id, w.after);
for (const w of writes) { const now = (await selectAll("routes", "id," + Object.keys(w.after).join(","), `id=eq.${encodeURIComponent(w.id)}`, { pageSize: 5 }))[0]; for (const k of Object.keys(w.after)) if (canon(now[k]) !== canon(w.after[k])) { bad++; console.log("RECONCILE", w.id, k); } }
console.log(`filled ${writes.length}, reconcile problems ${bad}`);
