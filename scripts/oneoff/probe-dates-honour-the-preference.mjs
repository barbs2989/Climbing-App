// Three surfaces rendered a RAW ISO date — "2026-06-17" — straight to a climber.
//
// The app has a stored date-format preference (`lib/date-pref.js`: auto / US / international) and
// formats through DLOCALE in 19 other places, so these were the outliers. `lib/date-pref.js` exists
// precisely because a stored choice was being lost "on every date in the app"; a raw ISO string is
// neither of the two formats it offers.
//
// Found by reading a CI `ui-screens` capture: Crew:Friends renders "FRIENDS' RECENT ACTIVITY" over
// rows dated `2026-06-17`, while every sibling surface shows "84 days ago" or "Posted 12w ago".
//
// TWO THINGS ARE ASSERTED AND THE SECOND IS THE ONE THAT WOULD HAVE BITTEN:
//   1. no rendered date is raw, and the three sites go through `shortDate`;
//   2. `shortDate` is SAFE for the values those sites can actually carry. Its old catch was DEAD —
//      `toLocaleDateString` on an Invalid Date RETURNS "Invalid Date" rather than throwing — and a
//      vouch built from a row with no `created_at` carries `date: ""`. Its single previous caller
//      guarded at the CALL SITE, so nothing was on screen; adding three callers without hardening
//      it would have put "Invalid Date" in front of a climber.
//
// THE SCAN IS AN AST, deliberately: the comment beside the fix quotes the forbidden `{x.date}`
// shape, and a textual scan fails on its own documentation — a trap this repo records repeatedly.
// An AST does not see comments at all.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";
import esbuild from "esbuild";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const FILES = ["ClimbMatchCore.jsx", "ClimbMatch.jsx", "RouteDetail.jsx"];
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log("  ok    " + m); } else { fail++; console.log("  FAIL  " + m); } };

// --- 1. no rendered date is raw ----------------------------------------------------------------
// A JSX expression container whose whole expression is `<something>.date` renders that value
// verbatim. `{shortDate(a.date)}` is a CallExpression and is correctly not matched.
const DATEISH = new Set(["date", "created_at", "createdAt"]);
let containers = 0, raw = [];
for (const f of FILES) {
  const src = fs.readFileSync(path.join(ROOT, f), "utf8");
  let ast;
  try { ast = parse(src, { sourceType: "module", plugins: ["jsx"], errorRecovery: false }); }
  catch (e) { console.error(`FAIL: ${f} did not parse — nothing below was checked.`); process.exit(1); }
  const walk = (n) => {
    if (!n || typeof n !== "object") return;
    if (Array.isArray(n)) { n.forEach(walk); return; }
    // CHILDREN POSITION ONLY. A JSX ATTRIBUTE value is also a JSXExpressionContainer, and all three
    // false positives the first run produced were attributes: two React `key={x.date}` (the
    // `key={"lb"+i}` trap the units census already records) and, worse, `value={eventForm.date}` on
    // an <input type="date">, whose value MUST stay a raw ISO string — formatting it would break
    // the control. A scan that flagged it would tell an author to do that.
    if (n.type === "JSXElement" || n.type === "JSXFragment") {
      for (const child of (n.children || [])) {
        if (!child || child.type !== "JSXExpressionContainer") continue;
        containers++;
        const e = child.expression;
        if (e && e.type === "MemberExpression" && !e.computed && e.property &&
            e.property.type === "Identifier" && DATEISH.has(e.property.name)) {
          raw.push(`${f}: {${e.object.type === "Identifier" ? e.object.name : "…"}.${e.property.name}}`);
        }
      }
    }
    for (const k of Object.keys(n)) if (k !== "loc" && k !== "leadingComments" && k !== "trailingComments") walk(n[k]);
  };
  walk(ast.program);
}
ok(containers > 1000, `ANCHOR: ${containers} JSX expression containers walked — the traversal ran`);
ok(raw.length === 0, raw.length === 0
  ? "no surface renders a raw date"
  : `${raw.length} raw date render(s): ${raw.join(", ")}`);

// The three sites go through the formatter. Asserted by NAME, because a correct formatter proves
// nothing if the call sites stopped using it.
const core = fs.readFileSync(path.join(ROOT, "ClimbMatchCore.jsx"), "utf8");
const rd = fs.readFileSync(path.join(ROOT, "RouteDetail.jsx"), "utf8");
ok(/\{shortDate\(v\.date\)\}/.test(core), "the vouch row formats its date");
ok(/\{shortDate\(it\.date\)\}/.test(core), "the friends-activity row formats its date");
ok(/\{shortDate\(a\.date\)\}/.test(rd), "the route activity row formats its date");

// --- 2. ONE definition ---------------------------------------------------------------------
// RouteDetail carried its own copy twenty lines from one of the raw sites. Two implementations of
// one formatter is how this codebase ended up with four grade parsers.
ok(/export function shortDate\(/.test(core), "shortDate is defined and exported in core");
ok(!/function shortDate\(/.test(rd), "...and RouteDetail no longer declares its own");
ok(/\bshortDate\b/.test(rd.slice(0, rd.indexOf("function") > 0 ? 6000 : 6000)) || /DLOCALE,shortDate/.test(rd),
  "...it imports the core one");

// --- 3. the formatter is SAFE for what these sites carry ---------------------------------------
const outDir = fs.mkdtempSync(path.join(ROOT, ".date-probe-"));
process.on("exit", () => fs.rmSync(outDir, { recursive: true, force: true }));
const entry = path.join(outDir, "entry.mjs");
fs.writeFileSync(entry, 'export { shortDate } from "../ClimbMatchCore.jsx";\n');
const out = path.join(outDir, "b.mjs");
await esbuild.build({
  entryPoints: [entry], bundle: true, format: "esm", outfile: out, jsx: "automatic",
  loader: { ".jsx": "jsx" }, external: ["react", "react-dom", "react/jsx-runtime", "@tanstack/react-query"],
  define: { "import.meta.env": "{}" }, logLevel: "silent",
  plugins: [{ name: "stub", setup(b) {
    b.onResolve({ filter: /^\.\/lib\/supabase$/ }, () => ({ path: "s", namespace: "st" }));
    b.onLoad({ filter: /.*/, namespace: "st" }, () => ({ contents: "export const supabase=null;export const USE_DB=false;" }));
  } }],
});
const { shortDate } = await import(out);
if (typeof shortDate !== "function") { console.error("FAIL: shortDate did not bundle."); process.exit(1); }

ok(shortDate("2026-06-17") !== "2026-06-17" && /2026/.test(shortDate("2026-06-17")),
  `a date-only ISO string is formatted: ${JSON.stringify(shortDate("2026-06-17"))}`);
// THE `T12:00:00` IS LOAD-BEARING: new Date("2026-06-17") is UTC MIDNIGHT, which renders as the
// 16th anywhere west of Greenwich. This is the assertion that catches its removal.
ok(/17/.test(shortDate("2026-06-17")), "...on the day it says, not the day before (the T12:00:00)");
// A VOUCH WITH NO created_at CARRIES "" — the case that made hardening necessary.
for (const bad of ["", null, undefined])
  ok(shortDate(bad) === "", `${JSON.stringify(bad)} renders as nothing, never "Invalid Date"`);
// A value that already carries a time must not have T12:00:00 appended onto it.
ok(!/Invalid/.test(shortDate("2026-06-17T10:00:00Z")), "a full timestamp is formatted, not broken");
// AND AN UNPARSEABLE VALUE COMES BACK UNCHANGED rather than as a machine string.
ok(shortDate("not a date") === "not a date", "an unparseable value is returned as-is");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
