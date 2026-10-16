// HOW MANY QUERY HANDLES CARRY AN OUTAGE FLAG, and which do not?
//
// CLAUDE.md quotes this number in three places and they DISAGREE -- "13 of the 25", "4 of 28",
// "34 handles, 14 flagged". One of those lines even says *re-measure rather than quoting this, it
// has moved twice*, which is the document knowing it rots and asking. A count retyped from memory
// in a file everything else is derived from is the stale-bookkeeping failure this repo records
// under half a dozen names.
//
// So: one measurement, in one place, that the prose can point at instead of restating.
//
// WHAT A "FLAG" IS: `xUnavailable` derived from a handle's `.isError`. That is the convention
// check:outage-flag-reach enforces, and this lifts the same shape rather than inventing one.
//
// WHAT THIS DOES NOT SAY, stated because the count invites the wrong reading: an unflagged handle
// is NOT a defect. Most are lookups where emptiness is never asserted to the user, and CLAUDE.md
// records several checked-and-cleared by name. This is a list to READ.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const db = fs.readFileSync(path.join(ROOT, "lib/db.js"), "utf8");

// The read hooks lib/db.js exports. A handle is only a "query handle" if it comes from one.
const hooks = new Set([...db.matchAll(/export function (use[A-Z]\w*)/g)].map((m) => m[1]));
if (hooks.size < 20) { console.error(`only ${hooks.size} use* hooks parsed from lib/db.js — the scan is broken`); process.exit(1); }

const FILES = ["ClimbMatch.jsx", "RouteDetail.jsx"];
let total = 0, flagged = 0;
const rows = [];

for (const f of FILES) {
  const src = fs.readFileSync(path.join(ROOT, f), "utf8");

  // Every `name = useSomething(` where useSomething is one of lib/db.js's read hooks. Comments are
  // NOT stripped: these files explain the convention in prose that names the hooks, and a comment
  // is not an assignment, so the `=` in the pattern already excludes it.
  const handles = new Map();
  for (const m of src.matchAll(/\b([A-Za-z_$][\w$]*)\s*=\s*(use[A-Z]\w*)\s*\(/g)) {
    if (hooks.has(m[2])) handles.set(m[1], m[2]);
  }

  // Every `somethingUnavailable = ...` and which handle's .isError it reads.
  const flags = new Map();
  for (const m of src.matchAll(/\b(\w*[Uu]navailable)\s*=\s*([^;,\n]{0,220})/g)) {
    const expr = m[2];
    for (const h of [...expr.matchAll(/\b([A-Za-z_$][\w$]*)\s*\.\s*isError/g)]) {
      flags.set(h[1], (flags.get(h[1]) || []).concat(m[1]));
    }
  }

  for (const [name, hook] of [...handles].sort()) {
    const fl = flags.get(name);
    total++;
    if (fl) flagged++;
    rows.push({ f, name, hook, flag: fl ? fl.join(", ") : null });
  }
}

if (!total) { console.error("no query handles found at all — the scan is broken, not the app"); process.exit(1); }

console.log(`${total} query handle(s) across ${FILES.length} file(s); ${flagged} carry an outage flag, ${total - flagged} do not.\n`);
for (const f of FILES) {
  const mine = rows.filter((r) => r.f === f);
  console.log(`--- ${f}: ${mine.filter((r) => r.flag).length}/${mine.length} flagged ---`);
  for (const r of mine.filter((x) => x.flag)) console.log(`  flag  ${r.name.padEnd(28)} ${r.hook.padEnd(26)} -> ${r.flag}`);
  for (const r of mine.filter((x) => !x.flag)) console.log(`  ----  ${r.name.padEnd(28)} ${r.hook}`);
  console.log("");
}
console.log(`An unflagged handle is NOT a defect: most are lookups where emptiness is never asserted.
Read the render site before treating one as a finding -- CLAUDE.md records several cleared by name.`);
