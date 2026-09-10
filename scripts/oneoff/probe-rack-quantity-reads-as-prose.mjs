// Does the widened quantity branch reach the RACK BOX ON SCREEN?
//
// `verify-sling-rack-synonym-widening.mjs` proves the RENDERER: it lifts `rackLines` and diffs its
// output. That is not the same claim as "a climber sees it" — a populated column is not a rendered
// one, the trap this repo records more than any other — and two steps sit between the two:
// `dbRouteToCamel` has to carry the column (as `slingRack`, so this mimics the MAPPER and never
// the column name), and `RouteRackBox` has to compose the bullet as `label + " — " + text`.
//
// Both directions are asserted, because a fix that merely stopped rendering the value would
// satisfy "the machine text is gone" perfectly:
//   1. the new prose IS on screen        ("2× 60cm")
//   2. the pipeline's key names are NOT  ("length:", "quantity:", "purpose:")
//
// Scoped to the RACK box, never the whole tab: the Plan tab legitimately says "length" elsewhere,
// and a tab-wide match is the vacuous assertion check:camping records making three times over.
//
// EVERY PANEL BELOW PRINTS "Standard rack for this discipline — nobody has recorded what this
// route itself takes", AND THAT IS THIS PROBE'S FIXTURE, NOT A DEFECT. `rackGeneric` is
// `!routeRackFor(route)`, and routeRackFor reads contribRack -> detailedRack -> proNeeds -> rack
// and never slingRack — so a route object carrying ONLY a sling rack, as these fixtures do, reads
// as generic while the sling bullets render beneath it. It looks exactly like a caption
// contradicting its own list, so it was measured rather than waved away:
// `measure-sling-rack-only-routes.mjs` reports **0 of 242** live sling_rack routes with nothing
// else feeding routeRackFor. Unreachable in production. Do not "fix" it.
// Read-only.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { build } from "esbuild";
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const require_ = createRequire(import.meta.url);
const dead = (w) => { console.error(`\nPROBE FAILED — ${w}. Nothing below was proven.\n`); process.exit(1); };

// The twelve routes the behaviour diff reported as changed.
const IDS = ["wa_chockstone_route", "wa_flycatcher_buttress", "wa_labor_pains",
  "wa_mount_walkinshaw_scramble", "wa_mount_washington_olympic_standard", "wa_mount_watson_scramble",
  "wa_needle_peak_south_route", "wa_remmel_mountain_nw_ridge", "wa_the_west_face",
  "wa_washington_ellinor_traverse_ridge"];

const url = `${SUPABASE_URL}/rest/v1/routes?select=id,name,discipline,grade,pitches,sling_rack&id=in.(${IDS.join(",")})`;
const rows = await (await fetch(url, { headers: headers(anonKey()) })).json().catch((e) => dead("read failed: " + e));
if (!Array.isArray(rows) || !rows.length) dead("empty read — every assertion below would pass vacuously");

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
}`;
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-slingrack-")), "b.cjs");
await build({ stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" }, bundle: true, format: "cjs",
  platform: "node", jsx: "automatic", loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error" }).catch((e) => dead("bundle failed: " + (e && e.message)));
const { render } = require_(out);

const text = (h) => h.replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ")
  .replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/\s+/g, " ");

// The RACK box, bounded by the next heading. `check:camping` records what a tab-wide count costs.
//
// ANCHORED ON A WORD BOUNDARY, because `indexOf("RACK")` matches the RACK inside "ROUTE T-RACK-".
// That is the substring trap CLAUDE.md records for check:ui's landmarks, and the first version of
// this probe walked into it: every route "rendered a RACK box" whose contents were the GPS-track
// panel, so the is-absent assertions passed on text that was never the rack.
function rackPanel(t) {
  const m = /\bRACK\b/.exec(t);
  if (!m) return null;
  const rest = t.slice(m.index + 4);
  const end = rest.search(/\b(WHAT TO BRING|ROUTE BREAKDOWN|KNOWN HAZARDS|TECH STATS|APPROACH|GETTING THERE|ROUTE TRACK|Recent recorded tracks)\b/);
  return end < 0 ? rest : rest.slice(0, end);
}

// WHICH TAB the box sits on is discipline-dependent — `cragOnly` puts it on Overview for a crag
// route and on Planner for these alpine and scrambling ones — so the probe finds it rather than
// asserting a tab. Asserting one would have reported a rendered rack as missing on 10 of 10.
function panelFor(route) {
  for (const tab of ["overview", "planner"]) {
    const p = rackPanel(text(render(route, tab)));
    if (p && p.trim().length > 20) return p;
  }
  return null;
}

// THE POSITIVE ASSERTION IS THE LOAD-BEARING ONE, and the first version of this probe did not
// have it. "No key name in the panel" is satisfied perfectly by a panel that never rendered the
// sling rack — and that is not hypothetical here: every one of these routes shows the GENERIC
// caption ("nobody has recorded what this route itself takes"), so a negative-only probe reported
// ok while proving nothing. Each route must show the text `rackLines` actually produces for it,
// lifted from source rather than retyped so the two cannot drift.
const src = fs.readFileSync(path.join(ROOT, "RouteDetail.jsx"), "utf8");
function lift(name) {
  const i = src.indexOf("function " + name + "(");
  if (i < 0) dead(`ANCHOR LOST: ${name}`);
  let d = 0, k = src.indexOf("{", i);
  for (; k < src.length; k++) { if (src[k] === "{") d++; else if (src[k] === "}") { d--; if (!d) break; } }
  return src.slice(i, k + 1);
}
const rackLines = new Function(lift("fmtSlingVal") + "\n" + lift("fmtSlingRack") + "\n" + lift("rackLines") + "\nreturn rackLines;")();

const MACHINE = /\b(length|quantity|purpose|size|count)\s*:/i;
let bad = 0, seen = 0, panels = 0, checkedBullets = 0;
for (const r of rows) {
  // Mimic dbRouteToCamel: it emits `slingRack`, not the column name.
  const route = { id: r.id, name: r.name, grade: r.grade || "5.7", gradeSystem: "yds",
    discipline: r.discipline || "trad", pitches: r.pitches || 2, mountainId: "probe_area",
    slingRack: r.sling_rack,
    _dbArea: { id: "probe_area", name: "Probe Area", areaType: "crag", region: "Washington" } };
  const panel = panelFor(route);
  seen++;
  if (!panel || panel.length < 40) { console.log(`  FAIL ${r.id}: the RACK box did not render`); bad++; continue; }
  panels++;
  const m = panel.match(MACHINE);
  if (m) { console.log(`  FAIL ${r.id}: still reads out "${m[0]}" — ${panel.slice(Math.max(0, m.index - 40), m.index + 90).trim()}`); bad++; continue; }

  // Every bullet rackLines produces for this row must be on screen, label and text.
  const expect = rackLines(r.sling_rack);
  if (!expect.length) { console.log(`  FAIL ${r.id}: rackLines produced no bullet — the fixture cannot test anything`); bad++; continue; }
  const missing = expect.filter((b) => !panel.includes(b.label) || !panel.includes(b.text));
  checkedBullets += expect.length;
  if (missing.length) {
    console.log(`  FAIL ${r.id}: ${missing.length}/${expect.length} bullet(s) not on screen — e.g. "${missing[0].label} — ${missing[0].text.slice(0, 60)}"`);
    bad++;
  } else {
    const shownBullet = expect.find((b) => /\d+×|\(/.test(b.text)) || expect[0];
    console.log(`  ok   ${r.id}: ${expect.length} bullet(s) on screen — "${shownBullet.label} — ${shownBullet.text.slice(0, 78)}"`);
  }
}

console.log();
if (!panels) dead("no RACK box rendered at all — every 'is absent' assertion above passed vacuously");
if (bad) dead(`${bad} of ${seen} route(s) still read out a key name in the RACK box`);
// Non-vacuity: the fix must have produced the quantity prose, not merely removed the value.
const anyMult = rows.some((r) => {
  const route = { id: r.id, name: r.name, grade: r.grade || "5.7", gradeSystem: "yds",
    discipline: r.discipline || "trad", pitches: r.pitches || 2, mountainId: "probe_area",
    slingRack: r.sling_rack,
    _dbArea: { id: "probe_area", name: "Probe Area", areaType: "crag", region: "Washington" } };
  return /\d+×\s/.test(panelFor(route) || "");
});
if (!anyMult) dead("no route rendered a `N× size` quantity — the machine text is gone because the VALUE is gone, which is not the fix");
if (!checkedBullets) dead("no bullet was checked against the screen — the positive assertion never ran");
console.log(`ok — ${panels} RACK boxes rendered, ${checkedBullets} bullet(s) matched on screen, none reads out a key name, and the quantity prose is there.`);
