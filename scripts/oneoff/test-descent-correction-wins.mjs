// Does a climber's agreed descent correction actually reach the screen?
//
// THIS TEST WAS WRONG IN #897 AND SO WAS THE FIX IT GUARDED. Both hand-modelled the merge,
// and both got it backwards in the same direction, so they agreed with each other and passed.
//
// The merge does NOT store a contribution under its form key. Both paths in ClimbMatch.jsx
// write through a rename map:
//
//     local:  o[M[k]||k] = CONV[k] ? CONV[k](e[k].value) : e[k].value
//     DB:     var pk = M[f]||f ; ... o[pk] = ...
//
// and `M` contains {descentText:"descent"}. So a correction submitted against the form key
// `descentText` lands in **route.descent**, while **route.descentText** keeps the untouched
// enrichment prose. #897 returned route.descentText when _descEdited was true -- i.e. it
// returned the enrichment and discarded the correction, which is STRICTLY WORSE than the
// length comparison it replaced (before it, a correction at least won when it was longer).
//
// The sibling _rapEdited got this right and is the model to copy: it reads route.rappels --
// the M DESTINATION -- and uses the flag only to stop the enrichment suppressing it.
//
// So this test DERIVES the destination property from the real M map rather than asserting a
// hand-written property name. A test that hand-models the writer cannot catch the writer and
// the reader disagreeing; it can only confirm that the author believed the same thing twice.
import { build } from "esbuild";
import { createRequire } from "module";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const require_ = createRequire(import.meta.url);

let failures = 0;
const fail = (m) => { console.log("  FAIL  " + m); failures++; };
const ok = (m) => console.log("  ok    " + m);

// ── 1. Read the merge's own rename map out of the source. No hand-modelling.
const cm = fs.readFileSync(path.join(ROOT, "ClimbMatch.jsx"), "utf8");
function literalAfter(src, anchor) {
  const i = src.search(anchor);
  if (i < 0) return null;
  let d = 0, k = src.indexOf("{", i), e = k;
  for (; e < src.length; e++) { const c = src[e]; if (c === "{") d++; else if (c === "}") { d--; if (!d) break; } }
  return src.slice(k, e + 1);
}
const mLit = literalAfter(cm, /\bvar M=\{/);
if (!mLit) { fail("ANCHOR LOST: `var M={` not found -- cannot learn where a contribution lands"); process.exit(1); }
const M = {};
for (const m of mLit.matchAll(/([a-zA-Z_]+)\s*:\s*"([^"]+)"/g)) M[m[1]] = m[2];

const FORM_KEY = "descentText";
const DEST = M[FORM_KEY] || FORM_KEY;
ok(`the merge files form key "${FORM_KEY}" into route.${DEST}`);
if (DEST === FORM_KEY) {
  fail("M no longer renames descentText. Re-read the merge before trusting the rest of this file.");
}

// Both merge paths must agree, or the DB and local paths would disagree about the destination.
if (!/varpk=M\[f\]\|\|f/.test(cm.replace(/\s+/g, ""))) {
  fail("the DB contribution path no longer derives its destination from M -- re-read it");
} else ok("both merge paths derive the destination from M");

// ── 2. Render.
const ENTRY = `
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RouteDetail from ${JSON.stringify(path.join(ROOT, "RouteDetail.jsx"))};
const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const noop = () => {};
export function render(route, tab) {
  return renderToStaticMarkup(
    React.createElement(QueryClientProvider, { client: qc },
      React.createElement(RouteDetail, {
        route, initialSubTab: tab, onBack: noop, onSubTab: noop,
        contribs: [], myReports: [], connections: [], comments: {},
        hzVotes: {}, sunReports: {}, gearEdits: {}, diffRatings: {},
        crewsForRoute: [], myStars: {}, presence: null,
      })));
}
`;
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-desc-")), "bundle.cjs");
await build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" },
  bundle: true, format: "cjs", platform: "node", jsx: "automatic",
  loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error",
});
const { render } = require_(out);
const strip = (h) => h.replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ")
  .replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/\s+/g, " ");

const base = {
  id: "probe_desc", name: "Probe Descent", grade: "5.9", gradeSystem: "yds",
  discipline: "alpine", pitches: 6, mountainId: "probe_area",
  _dbArea: { id: "probe_area", name: "Probe Area", areaType: "peak", region: "Washington" },
};
const ENRICHMENT = "ZQENRICHZQ " + "Descend the east ledges, staying climbers left of the gully. ".repeat(6);
const CORRECTION = "ZQFIXZQ South gully is closed by rockfall - walk off east.";

// Find the tab that renders the descent rather than assuming it.
let tab = null;
for (const t of ["planner", "overview", "safety", "conditions"]) {
  try { if (strip(render({ ...base, descent: ENRICHMENT }, t)).includes("ZQENRICHZQ")) { tab = t; break; } } catch {}
}
if (!tab) { fail("ANCHOR LOST: descent prose renders on no sub-tab"); process.exit(1); }
ok(`descent prose renders on the "${tab}" tab`);

// ── CONTROL: with no contribution, the longer enriched prose still wins.
const c0 = strip(render({ ...base, descent: "Reverse the ascent route.", descentText: ENRICHMENT }, tab));
if (!c0.includes("ZQENRICHZQ")) fail("CONTROL: with no contribution the enriched descent stopped rendering");
else ok("control: with no contribution, the longer enriched prose wins");

// ── THE CASE. Build the post-merge route the way the merge actually builds it: the
//    correction goes to M[formKey], the enrichment column is untouched.
const merged = { ...base, descentText: ENRICHMENT, _contribFields: [FORM_KEY] };
merged[DEST] = CORRECTION;
const t1 = strip(render(merged, tab));
const hasFix = t1.includes("ZQFIXZQ");
const hasStale = t1.includes("ZQENRICHZQ");
console.log("");
console.log("  after a descent correction merges:");
console.log("    correction on screen        :", hasFix);
console.log("    superseded enrichment shown :", hasStale);
if (!hasFix) fail(`the correction (in route.${DEST}) does not reach the screen -- the reader prefers the enrichment`);
else if (hasStale) fail("both the correction and the superseded enrichment render");
else ok("the correction replaces the enriched descent");

// ── CONTROL: a correction to a DIFFERENT field must not flip the preference.
const other = { ...base, descent: "Reverse the ascent route.", descentText: ENRICHMENT, _contribFields: ["rap"] };
if (!strip(render(other, tab)).includes("ZQENRICHZQ")) fail("CONTROL: an unrelated correction changed the descent");
else ok("control: a correction to another field leaves the descent alone");

console.log("");
console.log(failures ? `${failures} finding(s)` : "no findings");
process.exit(failures ? 1 : 0);
