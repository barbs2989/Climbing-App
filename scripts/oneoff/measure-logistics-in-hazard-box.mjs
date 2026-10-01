// Which KNOWN HAZARDS lines are not hazards at all — parking, permits, road status, trip length?
//
// Reading the 468 paraphrase pairs (audits/2026-09-30-hazard-paraphrase-decisions.json) turned up
// ~25 such lines, but only among lines that happened to be in a pair. This lists every PRINTED line
// (knownHazards, what RouteDetail renders) carrying logistics vocabulary, with the route's other
// prose beside it, so a reader can decide two things per line: is it a hazard, and does the page
// already say it elsewhere? A keyword is a reason to READ a line, never a verdict — "road washout
// on the approach" can be a real hazard.
//
//   node scripts/oneoff/measure-logistics-in-hazard-box.mjs [--out file.json]
import { writeFileSync } from "fs";
import { selectAll } from "../lib/supabase-env.mjs";
import { knownHazards, toWarnArr } from "../../lib/hazards.js";

const argv = process.argv.slice(2);
const OUT = argv.includes("--out") ? argv[argv.indexOf("--out") + 1] : null;
const LOGISTICS = /\b(park(ing|ed)?|permit|pass required|forest pass|discover pass|interagency|fee|ferry|boat|schedule|road|gate[ds]?|plow(ed)?|unplowed|high[- ]clearance|4wd|awd|washout|washed[- ]out|closure|closed|trailhead|turnout|camp(ing|site)? (ban|banned|closed|prohibited|not allowed|permit)|quota|reservation|lottery|long day|multi-day|\d+[- ]day|overnight|split (it )?over|topo|guidebook|beta|documentation|documented|cell (service|coverage)|signal|shuttle|bus)\b/i;
const CONTEXT = "id,name,hazards,obj_haz,watch_out,road,permit,access,approach_logistics,approach,overview,best_season,timing,descent_text,season";

const rows = await selectAll("routes", CONTEXT,
  "or=(hazards.not.is.null,obj_haz.not.is.null,watch_out.not.is.null)", { pageSize: 1000 });
if (!rows.length) { console.log("BROKEN PROBE: no rows read — a failed read is not an empty catalog"); process.exit(1); }

const hits = [];
let printed = 0;
for (const r of rows) {
  const cols = { hazards: Array.isArray(r.hazards) ? r.hazards : [], obj_haz: Array.isArray(r.obj_haz) ? r.obj_haz : [], watch_out: toWarnArr(r.watch_out) };
  const k = knownHazards(cols.hazards, cols.obj_haz, cols.watch_out);
  const shown = [...k.hazards, ...k.watchOut];
  printed += shown.length;
  const lines = shown.filter(t => LOGISTICS.test(t)).map(t => ({
    text: t,
    src: Object.entries(cols).flatMap(([c, a]) => a.map((x, i) => String(x).trim() === t ? `${c}[${i}]` : null)).filter(Boolean),
  }));
  if (!lines.length) continue;
  const ctx = {};
  for (const c of ["road", "permit", "access", "approach_logistics", "approach", "overview", "best_season", "timing", "descent_text", "season"]) if (r[c] != null && r[c] !== "") ctx[c] = r[c];
  hits.push({ id: r.id, name: r.name, watchOutIsString: typeof r.watch_out === "string", box: shown, lines, context: ctx });
}
console.log(`printed lines: ${printed}; with logistics vocabulary: ${hits.reduce((s, h) => s + h.lines.length, 0)} on ${hits.length} routes`);
if (OUT) { writeFileSync(OUT, JSON.stringify(hits, null, 1)); console.log("wrote", OUT); }
