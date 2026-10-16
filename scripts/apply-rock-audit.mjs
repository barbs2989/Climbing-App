// Turns the crag rock audit (research-data/crag-aspects/audit/rock-found/bNN.json, written by agents
// following audit/ROCK-BRIEF.md) into SQL. Prints the SQL; it writes nothing itself. Run:
//   node scripts/apply-rock-audit.mjs b01 [b02 …] [--no-fills=<pid>,…] > fix.sql
// The wall roster (audit/walls.json: [id, pid, name, rock, basis]) is the snapshot the batches were
// built from, so a group verdict reaches exactly the walls the agent was shown.
//   ok         the held rock is confirmed: rock_basis 'mapped' -> 'researched', rock unchanged.
//   wrong      every wall in the group takes `correct` (one rock from the app's list) as 'researched'.
//              Routes keep their own rock: a route's rock wins over its area's (routeRock), and it
//              came from route-level data, so it is counted on stderr, never rewritten from here.
//   unclear    nothing.
//   exception  a named wall on other rock takes that rock, whatever its group said.
//   fill       a named wall with NO rock takes one; --no-fills skips a crag whose fills had no source.
//   aspect     a named wall's stated direction, only where areas.aspect is null.
// A 'stated' group (the routes' own rock) is never rewritten here — guidebooks are the source of
// truth — it is printed to stderr for a person to read instead.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { rocksIn } from "../lib/rockType.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIR = path.join(ROOT, "research-data/crag-aspects/audit");
const args = process.argv.slice(2);
const noFills = new Set((args.find(function (a) { return a.startsWith("--no-fills="); }) || "=").split("=")[1].split(",").filter(Boolean));
const batches = args.filter(function (a) { return /^b\d+$/.test(a); });
const ASPECTS = new Set(["N", "NE", "E", "SE", "S", "SW", "W", "NW", "varies"]);
const q = function (s) { return "'" + String(s).replace(/'/g, "''") + "'"; };
const cleanRock = function (s) { const r = rocksIn(String(s || "")); return r.length === 1 ? r[0] : null; };
const norm = function (s) { return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); };

// walls-extra.json: walls the snapshot does not hold (they had no rock when it was taken), added by
// hand when a batch names one, so its fill is applied and verified like any other.
const extra = path.join(DIR, "walls-extra.json");
const walls = JSON.parse(fs.readFileSync(path.join(DIR, "walls.json"), "utf8")).concat(fs.existsSync(extra) ? JSON.parse(fs.readFileSync(extra, "utf8")) : []);
// A man-made wall (audit/man-made.json) has no rock on purpose: no verdict on its crag may give it one.
const MAN_MADE = JSON.parse(fs.readFileSync(path.join(DIR, "man-made.json"), "utf8"));
const byPid = new Map();
for (const w of walls) { if (MAN_MADE[w[0]]) continue; if (!byPid.has(w[1])) byPid.set(w[1], []); byPid.get(w[1]).push(w); }

const rock = new Map(), confirm = new Set(), aspect = new Map(), routeFix = [];
const tally = { ok: 0, wrong: 0, unclear: 0, exceptions: 0, fills: 0, aspects: 0, skipped: 0 };
const setRock = function (w, r) { rock.set(w[0], r); confirm.delete(w[0]); if (w[3] && w[3] !== r) routeFix.push([w[0], w[3], r]); };
for (const b of batches) {
  for (const c of JSON.parse(fs.readFileSync(path.join(DIR, "rock-found", b + ".json"), "utf8"))) {
    const ws = byPid.get(c.pid) || [];
    const named = function (name) { const n = norm(name); return ws.find(function (w) { return norm(w[2]) === n; }) || ws.find(function (w) { const m = norm(w[2]); return m.startsWith(n) || n.startsWith(m); }); };
    for (const g of c.groups || []) {
      tally[g.verdict] = (tally[g.verdict] || 0) + 1;
      const inGroup = ws.filter(function (w) { return (w[3] ? w[3] + " (" + w[4] + ")" : "MISSING") === g.held; });
      if (/\(stated\)/.test(g.held)) { if (g.verdict === "wrong") console.error("REVIEW stated:", c.crag, g.held, "->", g.correct); continue; }
      if (g.verdict === "ok") for (const w of inGroup) { if (w[4] === "mapped") confirm.add(w[0]); }
      if (g.verdict === "wrong") { const r = cleanRock(g.correct); if (!r) { tally.skipped++; console.error("no single rock:", c.crag, g.correct); continue; } for (const w of inGroup) setRock(w, r); }
    }
    for (const [name, r0] of Object.entries(c.wallExceptions || {})) { const w = named(name), r = cleanRock(r0); if (w && r) { setRock(w, r); tally.exceptions++; } else { tally.skipped++; console.error("exception unmatched:", c.crag, name, r0); } }
    if (!noFills.has(c.pid)) for (const [name, r0] of Object.entries(c.fills || {})) { const w = named(name), r = cleanRock(r0); if (w && r && !w[3]) { setRock(w, r); tally.fills++; } else { tally.skipped++; console.error("fill skipped:", c.crag, name, r0); } }
    for (const [name, d] of Object.entries(c.aspects || {})) { const w = named(name); if (w && ASPECTS.has(d)) { aspect.set(w[0], d); tally.aspects++; } else { tally.skipped++; console.error("aspect unmatched:", c.crag, name, d); } }
  }
}
console.error(JSON.stringify(tally), "| rock writes", rock.size, "| confirmations", confirm.size, "| aspects", aspect.size, "| walls whose rock changed (their routes keep their own)", routeFix.length);
const vals = function (rows) { return rows.map(function (r) { return "(" + r.map(q).join(",") + ")"; }).join(",\n"); };
// --verify prints one SELECT counting the planned changes that did NOT land (all zero = applied).
if (args.includes("--verify")) {
  console.log("select (select count(*) from areas a join (values\n" + (vals([...rock]) || "('','')") + ") v(id,rock) on a.id=v.id where a.rock is distinct from v.rock or a.rock_basis<>'researched') rock_missed, (select count(*) from areas where rock_basis='mapped' and id in (" + ([...confirm].map(q).join(",") || "''") + ")) confirm_missed, (select count(*) from areas a join (values\n" + (vals([...aspect]) || "('','')") + ") v(id,aspect) on a.id=v.id where a.aspect is null) aspect_missed;");
  process.exit(0);
}
console.log("begin;");
if (rock.size) console.log("update areas a set rock=v.rock, rock_basis='researched' from (values\n" + vals([...rock]) + ") v(id,rock) where a.id=v.id and (a.rock is distinct from v.rock or a.rock_basis is distinct from 'researched');");
if (confirm.size) console.log("update areas set rock_basis='researched' where rock_basis='mapped' and id in (" + [...confirm].map(q).join(",") + ");");
if (aspect.size) console.log("update areas a set aspect=v.aspect from (values\n" + vals([...aspect]) + ") v(id,aspect) where a.id=v.id and a.aspect is null;");
console.log("commit;");
