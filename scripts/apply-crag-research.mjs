// Turns the crag research files (research-data/crag-aspects/found/<k>.json, written by agents
// following AGENT-BRIEF.md) into SQL for areas.aspect and areas.rock. Prints the SQL; it writes
// nothing itself. Run:  node scripts/apply-crag-research.mjs > fix.sql  then apply with
// `npx supabase db query --linked -f fix.sql`.
//   aspect  set on each confirmed wall id that the queue entry actually lists (an id the agent
//           invented is dropped), and only where areas.aspect is null — a re-run never overwrites.
//   rock    the crag's researched rock goes on every listed wall whose rock is 'mapped' or null,
//           with rock_basis 'researched'; a per-wall rock beats the crag's. 'stated' rock (the
//           routes' own) is left alone, since guidebooks are the source of truth.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { rocksIn, rockFamily } from "../lib/rockType.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIR = path.join(ROOT, "research-data/crag-aspects");
const queue = new Map(JSON.parse(fs.readFileSync(path.join(DIR, "queue.json"), "utf8")).map(function (q) { return [q.k, q]; }));
const ASPECTS = new Set(["N", "NE", "E", "SE", "S", "SW", "W", "NW", "varies"]);
const q = function (s) { return "'" + String(s).replace(/'/g, "''") + "'"; };
// One rock from the app's own list, or null: "Sherman granite" -> granite; "gneiss and schist,
// sandy granite" names three, so it says nothing about any ONE wall and is dropped.
const cleanRock = function (s) { const r = rocksIn(String(s || "")); return r.length === 1 ? r[0] : null; };

const aspectRows = [], rockRows = [];
let files = 0, dropped = 0;
for (const f of fs.readdirSync(path.join(DIR, "found")).filter(function (n) { return /^\d+\.json$/.test(n); })) {
  const r = JSON.parse(fs.readFileSync(path.join(DIR, "found", f), "utf8"));
  const entry = queue.get(r.k);
  if (!entry) { console.error("no queue entry for", f); continue; }
  files++;
  const ids = new Set(entry.walls.map(function (w) { return w.id; }));
  const cragRock = r.rock && cleanRock(r.rock.value);
  const perWall = new Map();
  for (const w of r.walls || []) {
    if (!ids.has(w.id)) { dropped++; continue; }
    if (w.aspect && ASPECTS.has(w.aspect)) aspectRows.push([w.id, w.aspect]);
    if (cleanRock(w.rock)) perWall.set(w.id, cleanRock(w.rock));
  }
  // Same FAMILY as the wall's mapped rock: the research confirms it, so keep the more specific
  // mapped name (granodiorite, not "granite") and only mark it researched.
  for (const w of entry.walls) {
    const rk = perWall.get(w.id) || cragRock; if (!rk) continue;
    // ...unless the mapped name is only a category ("metasedimentary rock"), which "schist" beats.
    rockRows.push([w.id, w.rock && !/rock$/.test(w.rock) && rockFamily(w.rock) === rockFamily(rk) ? w.rock : rk]);
  }
}
const out = [];
if (aspectRows.length) out.push("update public.areas a set aspect = v.aspect\nfrom (values\n" + aspectRows.map(function (x) { return "  (" + q(x[0]) + ", " + q(x[1]) + ")"; }).join(",\n") + "\n) v(id, aspect)\nwhere a.id = v.id and a.aspect is null;");
if (rockRows.length) out.push("update public.areas a set rock = v.rock, rock_basis = 'researched'\nfrom (values\n" + rockRows.map(function (x) { return "  (" + q(x[0]) + ", " + q(x[1]) + ")"; }).join(",\n") + "\n) v(id, rock)\nwhere a.id = v.id and (a.rock is null or a.rock_basis in ('mapped', 'researched'));");
console.log(out.join("\n\n"));
console.error(files + " crag files; " + aspectRows.length + " wall aspects; " + rockRows.length + " wall rocks; " + dropped + " unknown wall ids dropped");
