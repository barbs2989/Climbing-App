// Does a climber's "Rack & gear" correction change the RACK box they were looking at?
//
// THE CHAIN, read from source and then MEASURED here because only rendering can settle it.
//
//   the form      RouteDetail's FIELDS has {k:"rack", label:"Rack & gear", type:"rack",
//                 cur: route.detailedRack || route.rack.join(", ")}
//                 -- so the value it shows you as "current" comes from detailedRack.
//
//   the merge     ClimbMatch.jsx: if(e.rack&&e.rack.live&&e.rack.value) gReq=gReq.concat([...]);
//                 if(gReq.length) o.gearTiers = {...selRoute.gearTiers, required:gReq}
//                 -- so the correction is filed into gearTiers.required. It does NOT write
//                    detailedRack, and it does NOT write rack.
//
//   the box       <RouteGearCheck rack={routeRackFor(route)||DISC_RACK[catOf(route)]||[]}/>
//                 routeRackFor = detailedRack ? rackFromText(detailedRack)
//                              : proNeeds ? [proNeeds] : null
//                 -- so the RACK box reads detailedRack/proNeeds/generic. Never gearTiers.
//
// If that reading is right, a correction lands in a different panel while the box it was made
// on keeps showing the old value, and the screen ends up asserting two different racks for one
// route with nothing saying which is current. That is the #897 shape (a correction out-voted by
// stale enrichment) with an extra turn: here the stale value stays on screen BESIDE the fix.
//
// This probe does not assume any of that. It renders and looks.
import { build } from "esbuild";
import { createRequire } from "module";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const require_ = createRequire(import.meta.url);

// Harness lifted verbatim from check-bare-route.mjs. Guessing the prop set is not viable --
// RouteDetail throws on a missing one -- and an outer React plus a bundled React gives
// "Invalid hook call" on every case, so the render must happen INSIDE the bundle.
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

const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-rack-")), "bundle.cjs");
await build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" },
  bundle: true, format: "cjs", platform: "node", jsx: "automatic",
  loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error",
});
const { render } = require_(out);

const text = (html) => html.replace(/<style[\s\S]*?<\/style>/g, " ")
  .replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/&amp;/g, "&")
  .replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ");

// Distinctive markers so a hit cannot be a coincidence of ordinary rack vocabulary.
const ENRICHED = "Single rack to #3, 60m rope, helmet, ZQENRICHEDZQ";
const CORRECTION = "ZQCORRECTIONZQ triple rack to #4";

// trad, because RouteGearCheck is crag-only -- the cragOnly trap check:field-renders records.
const base = () => ({
  id: "probe_rack", name: "Probe Rack", grade: "5.9", gradeSystem: "yds",
  discipline: "trad", pitches: 4, mountainId: "probe_area",
  _dbArea: { id: "probe_area", name: "Probe Area", areaType: "crag", region: "Colorado" },
});

let failures = 0;
const fail = (m) => { console.log("  FAIL  " + m); failures++; };
const ok = (m) => console.log("  ok    " + m);

// Which tab hosts the rack box? Find it rather than assuming.
const TABS = ["overview", "conditions", "photos", "partners", "planner", "safety"];
const before = base(); before.detailedRack = ENRICHED;
let rackTab = null;
for (const t of TABS) {
  let h; try { h = render(before, t); } catch (e) { continue; }
  if (text(h).includes("ZQENRICHEDZQ")) { rackTab = t; break; }
}
if (!rackTab) {
  fail("ANCHOR LOST: detailedRack does not render on ANY sub-tab -- this probe proves nothing.");
  process.exit(1);
}
ok(`detailedRack renders on the "${rackTab}" tab`);

// ── The control. Without a correction, the enriched rack is what you see.
const t0 = text(render(before, rackTab));
if (!t0.includes("ZQENRICHEDZQ")) fail("control: the enriched rack did not render");
else ok("control: with no correction, the RACK box shows the enriched rack");
if (t0.includes("ZQCORRECTIONZQ")) fail("control: the correction marker appeared before it was applied (probe is unsound)");

// ── After a climber's "Rack & gear" correction merges. This is exactly what ClimbMatch's
//    merge produces: gearTiers.required set, detailedRack untouched.
//    MODEL BOTH WRITES. A rack contribution goes through two paths at once: the general loop
//    (`o[M[k]||k] = CONV[k](value)`, and M.rack==="rack", CONV.rack === v=>[v]) sets o.rack,
//    AND the gReq special case sets o.gearTiers.required. Setting only one of them is how the
//    #897 descent test managed to pass while its fix was inverted -- a probe that hand-models
//    the writer can only confirm the author believed the same thing twice.
const after = base();
after.detailedRack = ENRICHED;
after.rack = [CORRECTION];
after.gearTiers = { required: [CORRECTION] };
after._contribFields = ["rack"];
const t1 = text(render(after, rackTab));

const showsCorrection = t1.includes("ZQCORRECTIONZQ");
const stillShowsStale = t1.includes("ZQENRICHEDZQ");

console.log("");
console.log("  after a rack correction merges:");
console.log("    correction visible anywhere on the tab :", showsCorrection);
console.log("    superseded enriched rack still visible :", stillShowsStale);

if (!showsCorrection) {
  fail("the correction reaches NO screen at all -- it is silently discarded");
} else if (stillShowsStale) {
  fail("BOTH racks render: the correction appears in another panel while the RACK box keeps "
     + "showing the value it replaced. The screen states two different racks for one route.");
} else {
  ok("the correction replaces the enriched rack on screen");
}

// ── Narrow it: is the value inside the RACK box itself, or somewhere incidental?
const html1 = render(after, rackTab);
const ri = html1.indexOf("RACK");
if (ri < 0) fail("ANCHOR LOST: no literal 'RACK' heading to slice around");
else {
  const around = text(html1.slice(ri, ri + 1400));
  console.log("");
  console.log("  within 1400 chars after the RACK heading:");
  console.log("    enriched marker  :", around.includes("ZQENRICHEDZQ"));
  console.log("    correction marker:", around.includes("ZQCORRECTIONZQ"));
  if (around.includes("ZQENRICHEDZQ")) fail("the RACK box itself still shows the superseded rack");
  else if (!around.includes("ZQCORRECTIONZQ")) fail("the RACK box shows neither value");
  else ok("the RACK box itself shows the correction");
}

// ── CONTROL 1: an UNEDITED route whose gearTiers.required is enrichment-seeded must keep
//    showing detailedRack. This is what makes the _rackEdited gate load-bearing rather than
//    defensive -- without it, every seed route would have its rack box inverted.
const seeded = base();
seeded.detailedRack = ENRICHED;
seeded.gearTiers = { required: [CORRECTION] }; // present, but NOT contributed
const tc = text(render(seeded, rackTab));
if (!tc.includes("ZQENRICHEDZQ")) fail("CONTROL: an uncorrected route stopped showing its enriched rack");
else ok("control: with gearTiers present but no contribution, the enriched rack still wins");

// ── CONTROL 2: _contribFields naming a DIFFERENT field must not trigger the override.
const other = base();
other.detailedRack = ENRICHED;
other.gearTiers = { required: [CORRECTION] };
other._contribFields = ["descentText"];
const to = text(render(other, rackTab));
if (!to.includes("ZQENRICHEDZQ")) fail("CONTROL: a correction to another field hijacked the rack box");
else ok("control: a contribution to a different field leaves the rack box alone");

// ── CONTROL 3: a route with no rack data at all must still render (generic fallback).
try {
  const t3 = text(render(base(), rackTab));
  if (t3.includes("undefined") || t3.includes("[object Object]")) fail("CONTROL: bare route leaked a placeholder");
  else ok("control: a route with no rack data still renders cleanly");
} catch (e) { fail("CONTROL: bare route threw -- " + String(e.message).slice(0, 100)); }

console.log("");
console.log(failures ? `${failures} finding(s)` : "no findings");
process.exit(failures ? 1 : 0);
