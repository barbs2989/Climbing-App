// The header pill said "V" while the CRUX GRADE tile below it said "5.9 A2".
//
// `alpine_grade` sits ahead of `grade` in the chain that resolves a displayed grade, and 274 of the
// 517 routes carrying one hold a bare NCCS roman numeral — a COMMITMENT grade. On 30 of them no
// rock or ice grade shadows it, so it was the headline on the route page, in the stat strip, on the
// sibling rows and on every area-list row. displayGrade() in lib/grade.js takes the first column
// that carries a CLIMBING grade instead.
//
// THREE THINGS ARE PROVEN HERE AND THEY NEED DIFFERENT INSTRUMENTS.
//   1. Catalog-wide, the change is exactly the rows it is meant to be — nothing else moves, and no
//      route loses the grade it had. Executed over every route in the catalog.
//   2. It reaches the SCREEN. A resolved value is not a rendered one, and RouteDetail is between
//      them: the pill, the stat strip and the sibling rows all go through gradeLabel(). Rendered
//      with react-dom/server over the LIVE rows.
//   3. The NEGATIVE half. A rule that only ever replaces a roman numeral is satisfied by deleting
//      the commitment grade from the app; a route whose record genuinely holds nothing but one must
//      still show it. Two such routes are asserted to be UNCHANGED, on screen.
//
// The functions are IMPORTED, never re-typed: a copy would agree with itself whatever the app does.
import { build } from "esbuild";
import { createRequire } from "module";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { shortGrade, displayGrade, gradeSources } from "../../lib/grade.js";
import { selectAll } from "../lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const require_ = createRequire(import.meta.url);
let failures = 0;
const fail = (m) => { console.log("  FAIL  " + m); failures++; };
const ok = (m) => console.log("  ok    " + m);

// The rows this change is ABOUT, declared rather than discovered, so a run that silently stopped
// reaching them cannot read as a clean sweep. `was` is what the app showed before it.
const EXPECT = [
  ["bc_slesse_mountain_northeast_buttress", "V", "5.9 A2"],
  ["ab_mount_alberta_japanese_route", "V", "5.6"],
  ["bc_bugaboo_spire_east_ridge", "III", "5.7"],
  ["nt_lotus_flower_tower_southeast_face", "V", "5.8 A2 or 5.10"],
  ["wa_eldorado_peak_east_ridge", "Grade II", "Class 3"],
  ["wa_glacier_peak_cool_glacier_gerdine", "II", "Class 2"],
  ["wa_mount_seattle_south", "Grade I", "Class 2-3"],
];
// ...and the routes that must NOT move: their record holds no climbing grade anywhere, so the
// commitment numeral is the only thing there is to show.
const UNCHANGED = [
  ["wa_mount_rainier_emmons_glacier", "III"],
  ["wa_mount_baker_easton_glacier", "Grade I"],
];

// ── 1. Catalog-wide equivalence.
const cols = "id,name,discipline,grade,rock_grade,ice_grade,alpine_grade,commitment,area_id";
const all = await selectAll("routes", cols, "", { pageSize: 1000 });
if (all.length < 200000) { console.log("FAIL: read " + all.length + " routes — that is not the catalog, so nothing below is a sweep"); process.exit(1); }

// The chain as it stood: the first column with anything in it, shortened for display.
const before = (r) => { const c = gradeSources(r); return c.length ? shortGrade(c[0]) : ""; };
let moved = 0, lost = 0, gained = 0;
const diff = new Map();
for (const r of all) {
  const a = before(r), b = displayGrade(r);
  if (a === b) continue;
  moved++;
  if (a && !b) lost++;
  if (!a && b) gained++;
  diff.set(r.id, [a, b]);
}
console.log("routes read                 : " + all.length);
console.log("displayed grade CHANGES     : " + moved);
if (lost) fail(lost + " route(s) LOST the grade they were showing — a fix that blanks a pill is not a fix"); else ok("no route lost the grade it was showing");
if (gained) fail(gained + " route(s) gained a grade from nowhere"); else ok("no route gained a grade it did not have");
if (moved > 40) fail("far more rows move than this change is about (" + moved + ") — re-read the diff before believing it"); else ok(moved + " rows move, which is the size this change claims");

for (const [id, was, now] of EXPECT) {
  const d = diff.get(id);
  if (!d) fail(id + ": did not change at all (expected " + JSON.stringify(was) + " -> " + JSON.stringify(now) + ")");
  else if (d[0] !== was || d[1] !== now) fail(id + ": moved " + JSON.stringify(d[0]) + " -> " + JSON.stringify(d[1]) + ", expected " + JSON.stringify(was) + " -> " + JSON.stringify(now));
  else ok(id + ": " + JSON.stringify(was) + " -> " + JSON.stringify(now));
}
for (const [id, keep] of UNCHANGED) {
  const row = all.find((r) => r.id === id);
  if (!row) { fail(id + ": not in the catalog, so this case proved nothing"); continue; }
  if (diff.has(id)) fail(id + ": MOVED to " + JSON.stringify(diff.get(id)[1]) + " — its record carries no climbing grade, so " + JSON.stringify(keep) + " is all there is to show");
  else if (displayGrade(row) !== keep) fail(id + ": shows " + JSON.stringify(displayGrade(row)) + ", expected " + JSON.stringify(keep));
  else ok(id + ": still " + JSON.stringify(keep) + " — nothing better exists in the row");
}

// ── 2 and 3. On screen, through the real mapper and the real component.
globalThis.WebSocket = globalThis.WebSocket || function () {};
const ENTRY = `
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RouteDetail from ${JSON.stringify(path.join(ROOT, "RouteDetail.jsx"))};
import { dbRouteToCamel } from ${JSON.stringify(path.join(ROOT, "lib/db.js"))};
const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const noop = () => {};
export { dbRouteToCamel };
export function render(route) {
  return renderToStaticMarkup(
    React.createElement(QueryClientProvider, { client: qc },
      React.createElement(RouteDetail, {
        route, initialSubTab: "overview", onBack: noop, onSubTab: noop,
        contribs: [], myReports: [], connections: [], comments: {},
        hzVotes: {}, sunReports: {}, gearEdits: {}, diffRatings: {},
        crewsForRoute: [], myStars: {}, presence: null,
      })));
}
`;
const out = path.join(ROOT, "scripts", "oneoff", "_grade-pill-bundle.cjs");
await build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" },
  bundle: true, format: "cjs", platform: "node", jsx: "automatic",
  loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error",
});
const { render, dbRouteToCamel } = require_(out);
fs.rmSync(out, { force: true });

const text = (html) => html.replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ")
  .replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/&#x2F;/g, "/").replace(/\s+/g, " ");

const SCREEN = [...EXPECT.map((e) => [e[0], e[1], e[2], true]), ...UNCHANGED.map((u) => [u[0], null, u[1], false])];
for (const [id, was, now, changes] of SCREEN) {
  const raw = all.find((r) => r.id === id);
  if (!raw) { fail("screen " + id + ": not in the catalog"); continue; }
  const route = dbRouteToCamel({ ...raw, areas: { id: raw.area_id, name: "Probe Peak", area_type: "peak" } });
  let html;
  try { html = render(route); } catch (e) { fail("screen " + id + ": render threw " + e.message); continue; }
  if (html.length < 2000) { fail("screen " + id + ": rendered " + html.length + " chars — too thin for any assertion below to mean anything"); continue; }
  // SCOPED TO THE HERO, never the whole page — the trap this repo records as "count inside the
  // panel". The Overview tab's COMPOSITE GRADE block renders an ALPINE pill holding exactly the
  // commitment numeral, LABELLED, which is where it belongs and must keep rendering. The hero pill
  // and the stat strip are everything above the sub-tab bar, whose first control is Overview.
  const cut = html.indexOf(">Overview<");
  if (cut < 0) { fail("screen " + id + ": ANCHOR LOST - no sub-tab bar, so the hero could not be scoped"); continue; }
  const head = html.slice(0, cut);
  if (head.length < 1200) { fail("screen " + id + ": hero is " + head.length + " chars, too thin to assert on"); continue; }
  const t = text(head);
  const bare = new RegExp(">\\s*" + (was || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*<");
  if (!t.includes(now)) fail("screen " + id + ": the hero never says " + JSON.stringify(now));
  else if (changes && was && bare.test(head)) fail("screen " + id + ": the hero still renders " + JSON.stringify(was) + " as the grade");
  else ok("screen " + id + ": hero renders " + JSON.stringify(now) + (changes ? "" : " (unchanged, correctly)"));
  // ...and the labelled ALPINE pill in COMPOSITE GRADE must survive, or this "fix" is a deletion.
  if (changes) {
    const body = html.slice(cut);
    if (!/>ALPINE</i.test(body) && !/>Alpine</.test(body)) fail("screen " + id + ": the COMPOSITE GRADE block lost its Alpine pill");
    else if (!bare.test(body)) fail("screen " + id + ": COMPOSITE GRADE no longer shows " + JSON.stringify(was) + " under its own label");
    else ok("screen " + id + ": " + JSON.stringify(was) + " still shows under COMPOSITE GRADE, labelled");
  }
}

console.log("");
if (failures) { console.log("probe-grade-pill-is-not-a-commitment-grade: " + failures + " failure(s)"); process.exit(1); }
console.log("ok — no displayed grade is a bare commitment numeral where the row holds a climbing grade.");
