// Do the RACK columns carry source citations onto the screen?
//
// audit:prose-citations enforces the standing rule that NO source reaches a screen. Its
// PROSE_COLS list covers `gear` and `what_to_bring` and stops there -- so `sling_rack`,
// `detailed_rack`, `pro_needs` and `rope_note` have never been opened by it, and all four feed
// the RACK box on the route page. A sample turned up "(per Mountain Project + 2 trip reports)"
// inside a rendered sling_rack bullet, which is exactly what that audit exists to catch.
//
// THE NEEDLES ARE LIFTED FROM THE AUDIT, NOT RETYPED. A second copy of a citation pattern is the
// four-grade-parsers shape: it would agree with the audit the day it was written and drift after,
// and the drift would show up as a column quietly reporting clean.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { selectAll } from "../lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const dead = (w) => { console.error(`\nmeasurement FAILED — ${w}. Nothing below was measured.\n`); process.exit(1); };

const audit = fs.readFileSync(path.join(ROOT, "scripts/audit-prose-citations.mjs"), "utf8");
function liftRe(name) {
  const m = new RegExp("^const " + name + "\\s*=\\s*(/.*/[gimsuy]*);$", "m").exec(audit);
  if (!m) dead(`ANCHOR LOST: const ${name} = /.../ is not in audit-prose-citations.mjs`);
  return new Function("return " + m[1])();
}
const NAMED = liftRe("NAMED"), ACT = liftRe("ACT"), LIVE = liftRe("LIVE");
// Prove the lift before trusting a verdict: these must match, and a bare mention must not.
if (!NAMED.test("per Mountain Project")) dead("the lifted NAMED pattern does not match a known publisher");
if (!ACT.test("sources describe a long pitch")) dead("the lifted ACT pattern does not match a known sourcing act");
if (LIVE.test("a set of stoppers")) dead("the lifted LIVE pattern matches ordinary gear prose");

// The audit's PROSE_COLS, lifted so "which columns are unscanned" is computed, never asserted.
const pm = /const PROSE_COLS = \[([\s\S]*?)\];/.exec(audit);
if (!pm) dead("ANCHOR LOST: PROSE_COLS");
const SCANNED = new Set([...pm[1].matchAll(/"([a-z_]+)"/g)].map((m) => m[1]));

// Every column the RACK box reads. gearReadout/route.cams are objects; all four below are prose-ish.
const GEAR_COLS = ["sling_rack", "detailed_rack", "pro_needs", "rope_note", "gear", "what_to_bring"];
const unscanned = GEAR_COLS.filter((c) => !SCANNED.has(c));
console.log(`audit:prose-citations scans ${SCANNED.size} columns.`);
console.log(`of the ${GEAR_COLS.length} rack-feeding columns, UNSCANNED: ${unscanned.join(", ") || "none"}\n`);
if (!unscanned.length) dead("nothing to measure — the audit already covers every rack column");

const leaves = (v, out = []) => {
  if (typeof v === "string") out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => leaves(x, out));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => leaves(x, out));
  return out;
};

let grand = 0;
for (const col of GEAR_COLS) {
  const rows = await selectAll("routes", `id,${col}`, `${col}=not.is.null`, { pageSize: 1000 })
    .catch((e) => dead(`read of ${col} failed: ` + (e && e.message)));
  if (!rows) dead(`read of ${col} returned nothing`);
  let named = 0, act = 0, live = 0;
  const hits = [];
  for (const r of rows) {
    for (const s of leaves(r[col])) {
      const n = NAMED.test(s), a = ACT.test(s), l = LIVE.test(s);
      if (n) named++;
      if (a) act++;
      if (l) live++;
      if ((n || a) && hits.length < 6) hits.push({ id: r.id, s: s.length > 190 ? s.slice(0, 190) + "…" : s });
    }
  }
  const tag = SCANNED.has(col) ? "scanned" : "UNSCANNED";
  console.log(`${col.padEnd(16)} ${String(rows.length).padStart(5)} rows   named ${named}   sourcing-act ${act}   live-ref ${live}   [${tag}]`);
  if (!SCANNED.has(col)) grand += named + act;
  for (const h of hits) console.log(`      ${h.id}\n        ${h.s}`);
}

console.log(`\n${grand} citation hit(s) sit in columns this audit does not scan.`);
console.log("A live reference (a ranger number, an alerts URL) is counted separately and is KEPT —");
console.log("that is the audit's own distinction and the reason its needles are lifted, not retyped.");
