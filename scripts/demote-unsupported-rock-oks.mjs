// Withdraws crag rock-audit "ok" verdicts that the audit's own record does not support (2026-10-08).
// An "ok" turns a wall's mapped rock into 'researched', which the app shows WITHOUT "(mapped)". The
// agents' recorded quote is the evidence; this finds the ok groups whose quote
//   - names only a loose word ("granite", "sandstone", "limestone") against a specific held rock
//     (ROCK-BRIEF: a page saying only "granite" never confirms tonalite/granodiorite/…),
//   - names a different specific rock of the same family (e.g. monzogranite for held granodiorite), or
//   - names a different family altogether,
// and turns them back into "unclear": the JSON verdict is rewritten (so re-applying a batch cannot
// confirm them again) and the SQL puts those walls back to rock_basis 'mapped', rock unchanged.
// Quotes naming NO rock are left alone: they name formations ("Wingate", "Burro formation") the
// parser cannot read, and were read by hand. Generic held values ("volcanic rock") stay confirmed.
//   node scripts/demote-unsupported-rock-oks.mjs            -> report only
//   node scripts/demote-unsupported-rock-oks.mjs --write    -> rewrite the JSON, print the SQL
//   node scripts/demote-unsupported-rock-oks.mjs --verify   -> print a SELECT counting walls still 'researched'
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { rocksIn, rockFamily } from "../lib/rockType.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIR = path.join(ROOT, "research-data/crag-aspects/audit");
const write = process.argv.includes("--write"), verify = process.argv.includes("--verify");
const GENERIC = new Set(["volcanic rock", "metamorphic rock", "metavolcanic rock", "metasedimentary rock", "sedimentary rock", "tuff"]);
const LOOSE = new Set(["granite", "sandstone", "limestone"]);
const NOTE = "demoted 2026-10-08: the recorded quote does not name this rock";
const q = function (s) { return "'" + String(s).replace(/'/g, "''") + "'"; };
const norm = function (s) { return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); };

const walls = JSON.parse(fs.readFileSync(path.join(DIR, "walls.json"), "utf8"));
const byPid = new Map();
for (const w of walls) { if (!byPid.has(w[1])) byPid.set(w[1], []); byPid.get(w[1]).push(w); }

// The batch files come in three layouts (one record per line, spaced inline, indented), so a group is
// rewritten IN PLACE inside its own record's text, and the result must parse to exactly the object
// intended — a reserialise would rewrite every line of 67 files.
const reEsc = function (s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); };
const demoteText = function (text, pid, held) {
  const at = text.search(new RegExp('"pid"\\s*:\\s*"' + reEsc(pid) + '"'));
  if (at < 0) throw new Error("record not found: " + pid);
  const next = text.slice(at + 1).search(/"pid"\s*:/);
  const end = next < 0 ? text.length : at + 1 + next;
  const re = new RegExp('("held"\\s*:\\s*"' + reEsc(held) + ' \\(mapped\\)"\\s*,\\s*"verdict"\\s*:\\s*)"ok"');
  const span = text.slice(at, end);
  if (!re.test(span)) throw new Error("group not found: " + pid + " " + held);
  return text.slice(0, at) + span.replace(re, '$1"unclear", "demoted": "' + NOTE + '"') + text.slice(end);
};

const rows = [], why = {};
for (const f of fs.readdirSync(path.join(DIR, "rock-found")).sort()) {
  const file = path.join(DIR, "rock-found", f);
  let found, text; try { text = fs.readFileSync(file, "utf8"); found = JSON.parse(text); } catch (e) { continue; }
  let changed = false;
  for (const c of found) {
    const ws = byPid.get(c.pid) || [];
    // Walls the entry names one by one carry their own evidence: never withdraw those.
    const own = new Set();
    for (const name of Object.keys(Object.assign({}, c.wallExceptions, c.fills))) { const n = norm(name); const w = ws.find(function (x) { return norm(x[2]) === n; }) || ws.find(function (x) { const m = norm(x[2]); return m.startsWith(n) || n.startsWith(m); }); if (w) own.add(w[0]); }
    for (const g of c.groups || []) {
      if (g.verdict !== "ok" || /\((stated|researched)\)$/.test(g.held)) continue;
      const held = g.held.replace(/ \(mapped\)$/, "");
      if (held === "MISSING" || GENERIC.has(held)) continue;
      const said = rocksIn([g.quote, g.note, c.quote].filter(Boolean).join(" "));
      if (!said.length || said.includes(held)) continue;
      const kind = said.every(function (r) { return LOOSE.has(r); }) ? "loose word" : said.every(function (r) { return rockFamily(r) === rockFamily(held); }) ? "other rock, same family" : "other family";
      const hit = ws.filter(function (w) { return w[3] === held && w[4] === "mapped" && !own.has(w[0]); });
      why[kind] = why[kind] || { groups: 0, walls: 0 }; why[kind].groups++; why[kind].walls += hit.length;
      for (const w of hit) rows.push([w[0], held]);
      if (!verify) console.error(f, c.pid, "|", held, "x" + hit.length, "|", kind, "|", said.join("/"));
      g.verdict = "unclear"; g.demoted = NOTE; changed = true;
      text = demoteText(text, c.pid, held);
    }
  }
  if (write && changed) {
    const canon = function (o) { return JSON.stringify(o, function (k, v) { return v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map(function (x) { return [x, v[x]]; })) : v; }); };
    if (canon(JSON.parse(text)) !== canon(found)) throw new Error("in-place edit diverged: " + f);
    fs.writeFileSync(file, text);
  }
}
console.error(JSON.stringify(why), "| walls", rows.length);
const vals = rows.map(function (r) { return "(" + q(r[0]) + "," + q(r[1]) + ")"; }).join(",\n");
if (verify) console.log("select count(*) still_researched from areas a join (values\n" + vals + ") v(id,rock) on a.id=v.id where a.rock=v.rock and a.rock_basis='researched';");
else if (write) console.log("begin;\nupdate areas a set rock_basis='mapped' from (values\n" + vals + ") v(id,rock) where a.id=v.id and a.rock=v.rock and a.rock_basis='researched';\ncommit;");
