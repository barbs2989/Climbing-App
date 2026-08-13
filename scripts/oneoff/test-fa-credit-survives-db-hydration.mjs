// Can another climber's first-ascent claim reach the route page?
//
// #843 established that climb_logs is hydrated TWICE. This asks the mirror question, the
// one check:log structurally cannot: what does RouteDetail's hydration drop?
//
// A route's `activity` is assembled from three sources, deduped by _dbId in this order:
//     route.activity   seed rows          — carry faAscent / developed
//     myReports        App's `logs`       — YOUR rows, fully hydrated by ClimbMatch
//     dbReports        RouteDetail's own hydration of climb_logs — EVERYONE's rows
// Your own row wins the dedupe, so it keeps the full shape. Every other climber's row
// exists only as dbReports — and that hydration returns 14 keys, none of them faAscent
// or developed.
//
// buildConsensus reads exactly those two:
//     faCredits   = activity.filter(a => a.faAscent).map(a => a.user)
//     isDeveloped = activity.some(a => a.developed)
// and RouteDetail renders them as the "First Ascent Credit" and "Route Development" panels.
//
// Two halves, because either alone proves nothing:
//   1. STATIC — the write path persists both columns, ClimbMatch reads them, RouteDetail
//               does not.
//   2. RENDER — the real buildConsensus + the real RouteDetail, over the two row shapes.
import { createRequire } from "node:module";
import { readFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const ROOT = new URL("../../", import.meta.url).pathname;
const read = (f) => readFileSync(join(ROOT, f), "utf8");
let bad = 0;
const say = (ok, msg) => { if (!ok) bad++; console.log((ok ? "  ok   " : "  FAIL ") + msg); };

const CM = read("ClimbMatch.jsx"), RD = read("RouteDetail.jsx"), CORE = read("ClimbMatchCore.jsx");

// Balance braces; never a fixed window. A 4,000-char window over ClimbMatch's hydration runs
// on into syncLogToDb and matches its locals — the trap #843 hit and check:overlay-discovery
// already records.
const balanced = (src, anchor) => {
  const st = src.indexOf(anchor);
  if (st < 0) return "";
  let d = 0;
  for (let k = src.indexOf("{", st); k < src.length; k++) {
    if (src[k] === "{") d++;
    else if (src[k] === "}" && --d === 0) return src.slice(st, k + 1);
  }
  return "";
};

console.log("\nWhere fa_ascent and developed survive:\n");

const payload = balanced(CM, "var payload={");
say(/fa_ascent:/.test(payload) && /developed:/.test(payload),
  "the write path persists BOTH fa_ascent and developed");

const ownHyd = balanced(CM, "var item={_dbId:row.id");
say(ownHyd.length > 500 && ownHyd.length < 4000, `own-logs hydration isolated (${ownHyd.length} chars)`);
say(/row\.fa_ascent/.test(ownHyd) && /row\.developed/.test(ownHyd),
  "ClimbMatch's own-logs hydration reads both");

// RouteDetail's hydration is the object literal it returns per climb_logs row.
const dbHyd = balanced(RD, "return {_dbId:r.id");
say(dbHyd.length > 200 && dbHyd.length < 2000, `RouteDetail's hydration isolated (${dbHyd.length} chars)`);
say(/r\.fa_ascent/.test(dbHyd), "RouteDetail's hydration reads fa_ascent");
say(/r\.developed/.test(dbHyd), "RouteDetail's hydration reads developed");

// The same hydration feeds TripReport, which reads three more it was also dropping.
say(/r\.itinerary/.test(dbHyd), "...and itinerary  (TripReport renders a day-by-day block)");
say(/r\.sun_vote/.test(dbHyd), "...and sun_vote   (TripReport renders a sun block)");
say(/r\.sun_note/.test(dbHyd), "...and sun_note");
say(/ascent\.itinerary/.test(CORE), "TripReport really does read ascent.itinerary");
say(/ascent\.sunVote/.test(CORE), "TripReport really does read ascent.sunVote");

// partners is deliberately NOT hydrated, and the reason is measurable rather than a taste
// call: matchClimber resolves it against seed CLIMBERS by INTEGER id.
say(/CLIMBERS\.find\(c=>c\.name===nm&&ascent\.partnerIds\.includes\(c\.id\)\)/.test(CORE),
  "partners stays out: matchClimber resolves partnerIds against seed INTEGER ids");
say(!/r\.partners/.test(dbHyd), "...so the hydration does not feed it uuids");

// And the consumers, so this is about a real panel rather than a spare field.
say(/activity\.filter\(a=>a\.faAscent\)/.test(CORE), "buildConsensus derives faCredits from a.faAscent");
say(/activity\.some\(a=>a\.developed\)/.test(CORE), "buildConsensus derives isDeveloped from a.developed");
say(/First Ascent Credit/.test(RD), "RouteDetail renders a First Ascent Credit panel");
say(/Route Development/.test(RD), "RouteDetail renders a Route Development panel");

// ── render ───────────────────────────────────────────────────────────────────
// Same esbuild harness check:bare uses. Render INSIDE the bundle — an outer React plus a
// bundled one throws "Invalid hook call" on every case, which reads exactly like the defect.
const ENTRY = `
import {createElement as h} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {QueryClient,QueryClientProvider} from "@tanstack/react-query";
import {buildConsensus} from "./ClimbMatchCore.jsx";
import RouteDetail from "./RouteDetail.jsx";
const qc=new QueryClient({defaultOptions:{queries:{retry:false}}});
const noop=()=>{};
export const consensus = buildConsensus;
// Prop set lifted verbatim from check:bare. Guessing it is not viable — several are indexed
// without a guard, so a missing one throws deep inside the component and reads like a crash
// in the code under test.
export function renderRoute(route){
  try{
    return renderToStaticMarkup(h(QueryClientProvider,{client:qc},
      h(RouteDetail,{route,initialSubTab:"conditions",onBack:noop,onSubTab:noop,
        contribs:[],myReports:[],connections:[],comments:{},hzVotes:{},sunReports:{},
        gearEdits:{},diffRatings:{},crewsForRoute:[],myStars:{},presence:null})));
  }catch(e){return "THREW: "+e.message;}
}
`;
const { build } = await import("esbuild");
const out = join(mkdtempSync(join(tmpdir(), "cm-fa-")), "bundle.cjs");
await build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" },
  bundle: true, format: "cjs", platform: "node", jsx: "automatic",
  loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error",
});
const { consensus, renderRoute } = createRequire(import.meta.url)(out);

const today = new Date().toISOString().slice(0, 10);
// The 14 keys RouteDetail's hydration actually returns, for a row whose DB columns say
// fa_ascent = true and developed = true.
const THIN = {
  _dbId: "row-1", user: "Robin Vasquez", avatar: "", date: today,
  stars: 5, condTags: ["Dry"], tickType: "Summit", text: "First ascent of this line.",
  photos: [], beta: undefined, gearBeta: undefined, outcomeReasons: [], outcomeNote: undefined,
  cond: undefined,
};
// The same row once the hydration carries the two columns.
const FULL = { ...THIN, fa: true, faAscent: true, developed: true };

console.log("\nOne climb_logs row with fa_ascent = developed = true:\n");

const cThin = consensus([THIN]), cFull = consensus([FULL]);
say(Array.isArray(cFull.faCredits) && cFull.faCredits.includes("Robin Vasquez"),
  "hydrated shape credits Robin Vasquez            [CONTROL]");
say(cFull.isDeveloped === true, "hydrated shape sets isDeveloped              [CONTROL]");
say(!cThin.faCredits.length, "dropped shape credits NOBODY");
say(!cThin.isDeveloped, "dropped shape reports no development");

// ...and the panels really are gated on those, on the real screen.
const route = {
  id: "probe", name: "Probe Route", grade: "5.9", gradeSystem: "yds",
  discipline: "trad", pitches: 4, mountainId: "probe_area",
  _dbArea: { id: "probe_area", name: "Probe Area", areaType: "crag", region: "Washington" },
};
const strip = (s) => s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
const hThin = strip(renderRoute({ ...route, activity: [THIN] }));
const hFull = strip(renderRoute({ ...route, activity: [FULL] }));

say(!/^ ?THREW/.test(hThin) && !/^ ?THREW/.test(hFull), "neither render throws            [CONTROL]");
say(/First Ascent Credit/.test(hFull) && /Robin Vasquez/.test(hFull),
  "hydrated shape puts First Ascent Credit on screen   [CONTROL]");
say(/Route Development/.test(hFull), "hydrated shape puts Route Development on screen [CONTROL]");
say(!/First Ascent Credit/.test(hThin), "dropped shape shows NO First Ascent Credit panel");
say(!/Route Development/.test(hThin), "dropped shape shows NO Route Development panel");

if (bad) { console.error(`\n${bad} assertion(s) failed.`); process.exit(1); }
console.log("\nAnother climber's first ascent now reaches the panel that exists to credit it.");
