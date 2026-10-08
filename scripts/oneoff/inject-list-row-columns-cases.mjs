#!/usr/bin/env node
// Injection suite for scripts/check-list-row-columns.mjs.
//
// Each case plants ONE drift between the Climbs list's thin select (lib/db.js useAreaRoutes) and the
// readers of that row, proves by CHECKSUM that the edit landed, runs the guard, and restores the
// file byte-identically. One case must stay SILENT: a camelCase read that dbRouteToCamel maps onto a
// selected column.
//
// IT EDITS lib/db.js AND lib/DbAreaBrowser.jsx IN PLACE. Do not commit, and do not run the build,
// while it runs.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const DB = "lib/db.js", BROWSER = "lib/DbAreaBrowser.jsx", GUARD = "scripts/check-list-row-columns.mjs";
const sum = (f) => crypto.createHash("sha1").update(fs.readFileSync(f)).digest("hex");

const CASES = [
  // The shape this guard exists for: a list row gains a read of a column the select never carried —
  // PostgREST hands back undefined, and every database route renders it as nothing.
  { name: "reader-gains-a-column", file: BROWSER, expect: "fail",
    find: "  const stars = r.stars ? Math.round(r.stars) : 0;\n",
    repl: "  const stars = r.stars ? Math.round(r.stars) : 0;\n  const _injLen = r.length_m;\n",
    says: /column "length_m" is read but useAreaRoutes' thin select does not include it/ },
  // The select loses a column a reader still reads.
  { name: "select-drops-a-column", file: DB, expect: "fail",
    find: ",stars,sort_order,",
    repl: ",sort_order,",
    says: /column "stars" is read but useAreaRoutes' thin select does not include it/ },
  // The select carries a column nobody renders — the bytes the trim exists to stop.
  { name: "select-carries-dead-weight", file: DB, expect: "fail",
    find: ",approach_variants,areas(name,area_type)",
    repl: ",approach_variants,descent_text,areas(name,area_type)",
    says: /column "descent_text" is selected but no list reader reads it/ },
  // The embed loses the column climbsAPeak() reads on a sibling row.
  { name: "embed-loses-area-type", file: DB, expect: "fail",
    find: "areas(name,area_type)\");",
    repl: "areas(name)\");",
    says: /embed lacks "area_type"/ },
  // An entry reader renamed out from under the guard must fail closed, not pass on fewer readers.
  { name: "entry-renamed", file: BROWSER, expect: "fail",
    find: "function RouteRow({ r, onOpen, C, areaName }) {",
    repl: "function RouteRow_({ r, onOpen, C, areaName }) {",
    says: /entry lib\/DbAreaBrowser\.jsx RouteRow not found/ },
  // MUST STAY SILENT — a camelCase read that dbRouteToCamel maps onto a selected column.
  { name: "camel-read-of-a-selected-column", file: BROWSER, expect: "pass",
    find: "  const stars = r.stars ? Math.round(r.stars) : 0;\n",
    repl: "  const stars = r.stars ? Math.round(r.stars) : 0;\n  const _injGain = r.gainFt;\n",
    says: null },
];

let bad = 0;
for (const c of CASES) {
  const f = path.join(ROOT, c.file);
  const before = fs.readFileSync(f, "utf8");
  const beforeSum = sum(f);
  const hits = before.split(c.find).length - 1;
  if (hits !== 1) { console.log(`  BROKEN CASE  ${c.name}: pattern matched ${hits} times — the case is wrong, not the guard`); bad++; continue; }
  fs.writeFileSync(f, before.replace(c.find, c.repl));
  if (sum(f) === beforeSum) { console.log(`  BROKEN CASE  ${c.name}: edit did not change the file`); fs.writeFileSync(f, before); bad++; continue; }

  let out = "", code = 0;
  try { out = execFileSync("node", [path.join(ROOT, GUARD)], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }); }
  catch (e) { code = e.status || 1; out = String(e.stdout || "") + String(e.stderr || ""); }
  fs.writeFileSync(f, before);
  if (sum(f) !== beforeSum) { console.log(`  BROKEN CASE  ${c.name}: restore was not byte-identical`); bad++; continue; }

  const caught = code !== 0;
  if (c.expect === "fail") {
    if (caught && c.says.test(out)) console.log(`  ok    ${c.name}: CAUGHT, and the message names it`);
    else { console.log(`  FAIL  ${c.name}: ${caught ? "failed for the WRONG reason" : "MISSED"}\n${out.split("\n").slice(-6).join("\n")}`); bad++; }
  } else {
    if (!caught) console.log(`  ok    ${c.name}: stayed SILENT, as it must`);
    else { console.log(`  FAIL  ${c.name}: flagged CORRECT code\n${out.split("\n").slice(-4).join("\n")}`); bad++; }
  }
}
console.log(bad ? `\n${bad} case(s) wrong` : `\nok — ${CASES.length}/${CASES.length}`);
process.exit(bad ? 1 : 0);
