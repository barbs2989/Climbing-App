#!/usr/bin/env node
/* check:route-prose-format — a route field the edit sheet FORMATS is READ as formatting on the page.

   Why (owner note 2026-11-25: "When edited climb, especially for sections that can be long paragraphs we
   should allow formatting options ... descriptions, approaches, descents"): the description, the approach,
   the descent, where it starts, a way in's notes and a climbing section's notes are edited in RichEditor
   (bold, italic, strikethrough, bullet and numbered lists, quotes), which STORES plain markdown. The page
   used to print them through splitParagraphs, which knows nothing of markers. The bug class this guards is
   #2018's: a box that lets a climber press Bold, and a reader that then prints the asterisks.

   What this checks:
   1. SuggestFix's ROUTE_PROSE_FIELDS is a list of "long" FIELDS, and the long branch hands exactly those to
      RichEditor; a way in's notes and a climbing section's notes are RichEditors too.
   2. Every RichEditor in the edit sheet and Add a climb has `noLink`: route text refuses a link when it is
      sent (0530), so a link button there would build text the server turns down.
   3. Add a climb formats the same four columns (description, approach, descent, location on the wall).
   4. Each page reader of those fields calls renderProse, and none of them still runs splitParagraphs.
   5. proseHasMarkup (core) tells catalog prose from formatted text: a plain sentence and snake_case are
      not markup; bold, struck, a word in _underscores_ and a line break are.
   6. Injection cases: each mutation below must make sections 1-5 fail.

   Notes: docs/guards/contributions-and-logbook.md (check:route-prose-format). */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => { const p = path.join(ROOT, f); if (!fs.existsSync(p)) { console.log("  FAIL  anchor lost: " + f + " is gone — this guard can no longer see what it checks"); process.exit(1); } return fs.readFileSync(p, "utf8"); };
const FILES = {
  sf: "src/components/SuggestFix.tsx",
  add: "lib/AddRoute.jsx",
  core: "ClimbMatchCore.jsx",
  overview: "src/components/RouteOverviewTab.tsx",
  approach: "src/components/ApproachVariants.tsx",
  descent: "src/components/RoutePlanTab.tsx",
  sections: "src/components/ClimbingRouteTable.tsx",
  location: "src/components/TechStats.tsx",
};

function check(src) {
  const out = [];
  const bad = (m) => out.push(m);
  // ── 1 ──
  const pf = /const ROUTE_PROSE_FIELDS=\[([^\]]*)\]/.exec(src.sf);
  if (!pf) { bad("SuggestFix has no ROUTE_PROSE_FIELDS list"); return out; }
  const keys = (pf[1].match(/"([A-Za-z]+)"/g) || []).map((k) => k.slice(1, -1));
  for (const want of ["overview", "approach", "descentText", "location"]) if (!keys.includes(want)) bad("ROUTE_PROSE_FIELDS lacks " + want);
  for (const k of keys) {
    if (!new RegExp('\\{k:"' + k + '",label:[^}]*?type:"long"').test(src.sf)) bad("ROUTE_PROSE_FIELDS names " + k + ", which is not a \"long\" field in FIELDS");
  }
  if (!/if\(f\.type==="long"&&ROUTE_PROSE_FIELDS\.indexOf\(f\.k\)>=0\)return <RichEditor /.test(src.sf)) bad("the edit sheet's long branch no longer hands ROUTE_PROSE_FIELDS to RichEditor");
  if (!/<RichEditor [^>]*ariaLabel=\{"Approach "\+\(idx\+1\)\+" notes"\}/.test(src.sf)) bad("a way in's notes are not a RichEditor");
  if (!/<RichEditor [^>]*ariaLabel=\{"Section "\+\(idx\+1\)\+" notes"\}/.test(src.sf)) bad("a climbing section's notes are not a RichEditor");
  // ── 2 ──
  for (const f of ["sf", "add"]) {
    const eds = src[f].match(/<RichEditor [^>]*\/>/g) || [];
    if (!eds.length) bad(FILES[f] + " has no RichEditor");
    for (const e of eds) if (!/\bnoLink\b/.test(e)) bad(FILES[f] + ": a RichEditor offers a link, which route text refuses: " + e.slice(0, 90));
  }
  // ── 3 ──
  for (const [v, what] of [["overview", "description"], ["approach", "approach"], ["descent", "descent"], ["wallLoc", "location on the wall"]]) {
    if (!new RegExp("<RichEditor [^>]*value=\\{" + v + "\\}").test(src.add)) bad("Add a climb's " + what + " box is not a RichEditor");
  }
  // ── 4 ──
  const READERS = [
    ["overview", /renderProse\(route\.overview\|\|route\.desc,/, /splitParagraphs\(route\.overview/],
    ["approach", /renderProse\(v\.notes,/, /splitParagraphs\(v\.notes/],
    ["approach", /renderProse\(prose,/, /splitParagraphs\(prose/],
    ["descent", /renderProse\(x\[1\],/, /splitParagraphs\(x\[1\]/],
    ["sections", /renderProse\(s\.notes,/, /\{s\.notes\}/],
    ["location", /renderProse\(_loc,/, /facts\.unshift\(\["Location",_loc\]\)/],
  ];
  for (const [f, want, gone] of READERS) {
    if (!want.test(src[f])) bad(FILES[f] + " no longer reads its formatted field through renderProse (" + want + ")");
    if (gone.test(src[f])) bad(FILES[f] + " still prints a formatted field raw (" + gone + ")");
  }
  // ── 5 ──
  const fn = /function proseHasMarkup\(s\)\{return (\/.*\/)\.test\(s\);\}/.exec(src.core);
  if (!fn) { bad("ClimbMatchCore has no proseHasMarkup"); return out; }
  let re;
  try { re = new Function("return " + fn[1])(); } catch (e) { bad("proseHasMarkup's pattern does not parse: " + e.message); return out; }
  const CASES = [
    ["Walk the trail 2.5 mi to the col. Turn left at the cairn.", false],
    ["Clip the bolt near the snake_case_flake.", false],
    ["Head up the *left* gully", false],
    ["Go **left** at the cairn.", true],
    ["Not the ~~east~~ gully.", true],
    ["Rappel _twice_ from the chains.", true],
    ["First paragraph.\nSecond paragraph.", true],
  ];
  for (const [t, want] of CASES) if (re.test(t) !== want) bad("proseHasMarkup(" + JSON.stringify(t) + ") is " + !want + ", expected " + want);
  return out;
}

const real = {};
for (const [k, f] of Object.entries(FILES)) real[k] = read(f);
const found = check(real);
let failures = 0;
if (found.length) { for (const m of found) console.log("  FAIL  " + m); failures += found.length; }
else console.log("  ok    every formatted route field is edited in RichEditor (no link button) and read through renderProse");

// ── 6. injection cases ──
const INJECT = [
  ["the long branch goes back to a textarea", "sf", "if(f.type===\"long\"&&ROUTE_PROSE_FIELDS.indexOf(f.k)>=0)return <RichEditor ", "if(f.type===\"long\"&&ROUTE_PROSE_FIELDS.indexOf(f.k)>=0)return <textarea "],
  ["descentText dropped from the list", "sf", '"descentText","location"]', '"location"]'],
  ["a link button comes back", "sf", "<RichEditor noLink ariaLabel={\"Section ", "<RichEditor ariaLabel={\"Section "],
  ["Add a climb's descent back to a textarea", "add", "<RichEditor noLink ariaLabel=\"Descent\" value={descent}", "<textarea aria-label=\"Descent\" value={descent}"],
  ["the description reader goes back to splitParagraphs", "overview", "renderProse(route.overview||route.desc,", "splitParagraphs(route.overview||route.desc,"],
  ["a section's notes print raw", "sections", "renderProse(s.notes,{fontSize:12,color:C.textSub,lineHeight:1.55})", "<div>{s.notes}</div>"],
  ["proseHasMarkup stops seeing a line break", "core", "function proseHasMarkup(s){return /\\n|", "function proseHasMarkup(s){return /"],
];
let missed = 0;
for (const [name, f, from, to] of INJECT) {
  if (!real[f].includes(from)) { console.log("  FAIL  injection anchor lost (" + name + "): the text it mutates is gone from " + FILES[f]); failures++; continue; }
  const mut = Object.assign({}, real, { [f]: real[f].replace(from, to) });
  if (mut[f] === real[f]) { console.log("  FAIL  injection did not land: " + name); failures++; continue; }
  if (!check(mut).length) { console.log("  FAIL  injection MISSED: " + name); missed++; }
}
if (!missed) console.log("  ok    " + INJECT.length + "/" + INJECT.length + " injection cases caught");
failures += missed;
if (failures) { console.log("\ncheck:route-prose-format FAILED — " + failures + " finding(s)."); process.exit(1); }
console.log("\ncheck:route-prose-format passed.");
