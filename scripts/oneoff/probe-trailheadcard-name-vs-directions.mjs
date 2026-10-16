// Does the Plan tab's trailhead card NAME one trailhead and give WRITTEN DIRECTIONS to another?
//
// #1231 consolidated TrailheadCard onto trailheadPoint(), which is right — three surfaces offering
// three destinations for one trailhead was the defect. Its `_nameFollows` rule then takes the PIN's
// name past a measured 1,000 m gap, which is exactly the four peaks with two GENUINE approaches.
//
// But the prose beside it is still `al.trailheadDirection` — the LOGISTICS record — and CLAUDE.md
// records that on all four of those routes the direction text agrees with the LOGISTICS trailhead,
// i.e. with the approach the card no longer names. So the card may now read
//
//     Slate Peak Trailhead (Buckskin Ridge TH)
//     "From the Monument Creek Trailhead off Lost River Road past Mazama"
//
// — one card, two trailheads 15 km apart. Renders the real RouteDetail over the real rows and looks
// for both names in the output, rather than reasoning from the source.
//
// Report-only. Which record is TRUE is a data question and CLAUDE.md is explicit that these four
// are correct data; the question here is only whether one card contradicts itself.
import { build } from "esbuild";
import { createRequire } from "module";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const require_ = createRequire(import.meta.url);

// The four routes audit:trailhead-agreement reports as disagreeing — the whole population past the
// 1,000 m gap, so this is the complete class rather than a sample.
const IDS = process.argv.slice(2).filter(a => !a.startsWith("--"));
const WANT = IDS.length ? IDS : [
  "wa_mount_carru_scramble",
  "wa_the_direct_north_ridge_w_gendarme",
  "wa_remmel_mountain_nw_ridge",
  "wa_mount_howard_south_slope",
];
const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=*&id=in.(${WANT.join(",")})`, { headers: headers(anonKey()) });
if (!res.ok) { console.log(`FAIL: read failed (${res.status})`); process.exit(1); }
const rows = await res.json();
if (!rows.length) { console.log("FAIL: read no routes — refusing to report a clean result"); process.exit(1); }

const ENTRY = `
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RouteDetail from ${JSON.stringify(path.join(ROOT, "RouteDetail.jsx"))};
const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const noop = () => {};
export function render(route) {
  return renderToStaticMarkup(
    React.createElement(QueryClientProvider, { client: qc },
      React.createElement(RouteDetail, {
        route, initialSubTab: "planner", onBack: noop, onSubTab: noop,
        contribs: [], myReports: [], connections: [], comments: {},
        hzVotes: {}, sunReports: {}, gearEdits: {}, diffRatings: {},
        crewsForRoute: [], myStars: {}, presence: null,
      })));
}
`;
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-thcard-")), "bundle.cjs");
await build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" },
  bundle: true, format: "cjs", platform: "node", jsx: "automatic",
  loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error",
});
const { render } = require_(out);

// renderToStaticMarkup ESCAPES — un-escape before matching, or a present name reads as absent and a
// false clean looks like a real result. [[ssr-probes-must-match-escaped-html]]
const strip = h => h.replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ")
  .replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d))
  .replace(/\s+/g, " ").trim();
const camel = r => { const o = { ...r }; for (const [k, v] of Object.entries(r)) o[k.replace(/_([a-z])/g, (_, c) => c.toUpperCase())] = v; return o; };
// The distinctive proper noun of a trailhead name — "Slate Peak Trailhead (Buckskin Ridge TH)" is
// not going to appear verbatim in prose, but "Slate Peak" will. Strip the parenthetical and the
// generic word, exactly the GENERIC-token care audit:road-coverage records.
const core = n => String(n || "").replace(/\(.*?\)/g, " ").replace(/\b(trailhead|th|trail|road|rd)\b/gi, " ").replace(/[^A-Za-z ]/g, " ").replace(/\s+/g, " ").trim();

let contradictions = 0, checked = 0;
for (const r of rows) {
  const al = r.approach_logistics || {};
  const pin = (r.waypoints || []).find(w => w && String(w.type || "").toLowerCase() === "trailhead");
  const html = render(Object.assign(camel(r), { mountainId: r.area_id, _dbArea: { id: r.area_id, name: "Probe", areaType: "peak", region: "Washington" } }));
  const text = strip(html);

  const pinCore = core(pin && pin.name), logCore = core(al.trailhead);
  if (!pinCore || !logCore) { console.log(`${r.id}\n   SKIP — one of the two records has no usable name\n`); continue; }
  checked++;
  /* SCOPE TO THE CARD, NEVER THE TAB. These are peaks with two genuine approaches, so the route's
     own APPROACH prose legitimately names both — a tab-wide match reports correct copy as a
     contradiction. The first run of this probe did exactly that and called all four defects on the
     strength of prose sitting hundreds of characters away. Same mistake check:camping records
     ("count inside the panel"), made again here. The card is bounded by its TRAILHEAD heading and
     the next all-caps heading after it. */
  const h = text.indexOf("TRAILHEAD");
  if (h < 0) { console.log(`${r.id}\n   ANCHOR LOST — no TRAILHEAD heading on the Plan tab; the card did not render\n`); continue; }
  const after = text.slice(h + "TRAILHEAD".length);
  const nextHead = after.search(/\b[A-Z][A-Z][A-Z &’'-]{4,}\b/);
  const card = nextHead > 0 ? after.slice(0, nextHead) : after.slice(0, 600);
  /* AND MATCH THE DIRECTIONS LINE, NOT THE WHOLE CARD. The card also prints road.name, and on
     wa_mount_howard_south_slope that is "Forest Road 657 (Merritt Lake…)" — so a card-wide match
     found "Merritt Lake" and called a row contradictory whose directions honestly say "Two common
     trailheads on US-2 in Chelan County give access." That is CORRECT copy for a two-approach
     peak. The claim being tested is narrow: the card's TITLE names one trailhead while its own
     DIRECTIONS PROSE names another. A road-block naming a different drainage is a real but
     SEPARATE defect — audit:trailhead-road section 2 owns it. */
  const dirText = String(al.trailheadDirection || "");
  const showsPin = card.includes(pinCore);
  const dirOnCard = !!dirText && dirText.includes(logCore) && card.includes(dirText.slice(0, 40));
  /* ATTRIBUTION IS THE WHOLE QUESTION NOW, and forgetting that made this probe report the fix as
     the defect. Both names appearing was the tell while the prose was unlabelled; once the card
     says "Directions on file describe a different start - <name>:" the second name is SUPPOSED to
     be there, and a both-names test reports correct copy. The inverse of the trap check:camping
     records - a fix does not fail an assertion, it stops the assertion meaning what it meant.
     A contradiction is now: the card names one start and prints directions to another WITHOUT
     saying so. */
  const attributed = /describe[sd]? a different start/i.test(card);
  const showsLog = dirOnCard && !attributed;

  console.log(`${r.id}`);
  console.log(`   pin name   "${pin.name}"        in the TRAILHEAD card: ${showsPin ? "YES" : "no"}`);
  console.log(`   log name   "${al.trailhead}"    in the card directions: ${dirOnCard ? "YES" : "no"}${dirOnCard ? (attributed ? "  (attributed - fine)" : "  (UNLABELLED)") : ""}`);
  console.log(`   card text  "${card.trim().slice(0, 150)}"`);
  if (al.trailheadDirection) console.log(`   directions "${String(al.trailheadDirection).slice(0, 100)}"`);
  if (showsPin && showsLog) {
    contradictions++;
    console.log(`   >> UNLABELLED CONTRADICTION - the card names one start and describes another without saying so.`);
  }
  console.log("");
}

if (!checked) { console.log("no route was checked - the probe measured nothing"); process.exit(1); }
console.log(`${checked} route(s) checked · ${contradictions} naming two starts inside ONE card WITHOUT attribution`);
console.log(contradictions
  ? `\nReport-only. The DATA is correct on all of these — they are peaks with two genuine approaches —\nso the question is presentation: a card should not name one start and describe another.`
  : `\nok — no card names one trailhead while describing a different one.`);
