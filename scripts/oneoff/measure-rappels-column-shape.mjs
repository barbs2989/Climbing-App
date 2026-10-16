#!/usr/bin/env node
// IS `fmtRappels`' UNIT BRANCH REACHABLE, OR IS IT DEAD?
//
// `fmtRappels(r)` returns early for anything that is not an object, then renders
// `r.lengthM + "m"` or `r.lengthFt + "ft"` -- a unit chosen by WHICH COLUMN the value came from
// rather than by the climber's setting. It reaches two live surfaces: `rappelNoteText`, and the
// TECH STATS "Rappels" tile on the route page.
//
// CLAUDE.md states that `rappels` is prose on every WA row ("Every WA value is a sentence"),
// which would make that branch DEAD and the literal a false positive of the unit census. That is
// a claim about the DATA and this file has recorded being wrong about exactly this kind of claim
// before, so it is measured rather than quoted -- and measured CATALOG-WIDE, not just WA, since
// "every WA value" says nothing about the other 197k routes.
//
// Read-only, anon key. Report-only.
import { selectAll } from "../lib/supabase-env.mjs";

const rows = await selectAll("routes", "id,rappels", "rappels=not.is.null", { pageSize: 1000 });
if (!rows.length) {
  console.error("FAIL: zero rows with a rappels value — a broken read reads as a clean answer here.");
  process.exit(1);
}

const kind = { string: 0, number: 0, object: 0, array: 0, other: 0 };
const withLenM = [], withLenFt = [], objNoLen = [];
for (const r of rows) {
  const v = r.rappels;
  if (Array.isArray(v)) { kind.array++; continue; }
  const t = typeof v;
  if (t === "string") kind.string++;
  else if (t === "number") kind.number++;
  else if (t === "object" && v) {
    kind.object++;
    if (v.lengthM != null) withLenM.push([r.id, v.lengthM]);
    else if (v.lengthFt != null) withLenFt.push([r.id, v.lengthFt]);
    else objNoLen.push(r.id);
  } else kind.other++;
}

console.log(`rows with a rappels value: ${rows.length}`);
console.log(`  string (prose/count text) : ${kind.string}`);
console.log(`  number                    : ${kind.number}`);
console.log(`  object                    : ${kind.object}`);
console.log(`  array                     : ${kind.array}`);
console.log(`  other                     : ${kind.other}`);
console.log("");
console.log(`objects carrying lengthM  : ${withLenM.length}   <- would render "Nm" to an IMPERIAL climber`);
console.log(`objects carrying lengthFt : ${withLenFt.length}  <- would render "Nft" to a METRIC climber`);
console.log(`objects with neither      : ${objNoLen.length}   <- the unit branch cannot fire`);

for (const [id, v] of withLenM.slice(0, 8)) console.log(`   lengthM  ${id}: ${v}`);
for (const [id, v] of withLenFt.slice(0, 8)) console.log(`   lengthFt ${id}: ${v}`);

const reachable = withLenM.length + withLenFt.length;
console.log("");
console.log(reachable
  ? `VERDICT: the unit branch is REACHABLE on ${reachable} row(s) — the literal is a real defect, not a census false positive.`
  : "VERDICT: the unit branch is DEAD — no row stores an object carrying a length, so the literal is a census false positive. Record it as such rather than converting it.");
