// Which columns can a climber SEE on the route page but NOT correct?
//
// `bivy` is the precedent and the reason this is worth asking at all: it rendered on every route
// carrying camping data, sat in neither `FIELDS` nor `SS`, and its section's edit pencil opened
// the WAYPOINTS editor — a different store. So ~380 routes carried camping written by an
// enrichment pass and the climber who had actually slept there could not fix a word.
//
// THIS IS A READING LIST, NOT A DEFECT COUNT. Most of what it prints is correctly uncontributable:
// derived (`corrections`, `data_quality`, `gear_confidence`, `verif`, `lists`), owned by another
// flow (`gpx`/`elev_pts` go through GpsSubmissionModal), or enrichment blobs nobody would hand-
// edit. The point is to see the set and read it, the way `audit:terrain`'s number is a working
// feature rather than a backlog.
//
// FIVE WERE WIRED after this was written — `crowds`, `partnerRequirements`, `seasonalGuidance`,
// `emergency` and `approachLogistics` are contributable now through the generic OBJ_KEYS editor,
// taking the count 21 -> 16. Of what is left: FOUR must never become writable (`verif`,
// `corrections`, `data_quality`, `gear_confidence` are trust and provenance records — a write
// path lets a climber forge their own verification), TWO belong to GpsSubmissionModal (`gpx`,
// `elev_pts`), `lists` is curated tick-list membership, and THREE are already reachable through
// another field (`desc`/`description` fold into overview/beta; `pro_tips` renders concatenated
// with `beta`, which is contributable). That leaves SIX needing an editor that does not exist
// yet: approach_variants, climbing_route, climate, seasonal_hazards, sling_rack, difficulty.
//
// `sling_rack` looks like a cheap text field and is NOT: fmtSlingRack returns null for a plain
// string, so a text box there would be contributable and render nothing — the very defect this
// measures. It needs a structured builder like the rack one.
//
// ONE OF THEM IS THE BIVY SHAPE EXACTLY, and it is why this was written down rather than left as
// a count: `climbing_route`.
//
//   * It renders as the CLIMBING ROUTE section, gated `!isPitched(route) && climbingRoute.length`.
//   * That section carries an edit pencil, and the pencil opens `setFixOpenSection("pitchDetail")`
//     — a DIFFERENT column.
//   * `climbingRoute` is not in `SS`, so nothing a climber writes can ever reach that section.
//   * `pitchDetail` IS in `SS`, so the correction is accepted and merged — and on an unpitched
//     route `pitchEntryKind` classifies a plain-numbered entry as a "stage", so it renders under
//     ROUTE BETA instead. `ClimbingRouteTable` reads only `route.climbingRoute` and keeps showing
//     the enrichment text the climber was trying to replace.
//
// That is the rack-correction shape this repo already records: one page asserting two different
// answers to one question, with nothing saying which is current, and the form still offering the
// superseded text to the next climber. Note `isPitched` reads the DISCIPLINE, not the data, so a
// pitchDetail contribution cannot flip the route into the pitched branch and resolve it that way.
//
// Not fixed here. The repair is either to make `climbing_route` contributable (the bivy fix — a
// FIELDS entry, an `SS` entry, and a shape `check:contrib-shapes` accepts) or to stop offering an
// edit that cannot land. Both are a decision about what the form asks, not a bug fix, so this
// measures and reports.

import fs from "node:fs";

const app = fs.readFileSync("ClimbMatch.jsx", "utf8");

// SS is the allow-list BOTH merge paths consult. A key absent from it is accepted, toasted as
// recorded, written to `contributions`, and then read by nothing.
const i = app.indexOf("var SS={");
if (i < 0) { console.error("ANCHOR LOST: var SS={ — the allow-list moved."); process.exit(1); }
const ssSeg = app.slice(i, i + 3000);
const SS = new Set([...ssSeg.slice(0, ssSeg.indexOf("};"))
  .matchAll(/([A-Za-z_][A-Za-z0-9_]*)\s*:/g)].map((m) => m[1]));

// The renamer both merge paths route through: form key -> route property.
const mi = app.indexOf("var M=");
if (mi < 0) { console.error("ANCHOR LOST: var M= — the rename map moved."); process.exit(1); }
const mSeg = app.slice(mi, app.indexOf("}", mi) + 1);
/* BOTH DIRECTIONS. The first version of this script checked M forward only and reported
   `permits` as uncorrectable: M holds `permit:"permits"`, so the FORM key is `permit` and the
   ROUTE property is `permits`, and only the reverse lookup finds it. That is this repo's
   "read the whole mapper" lesson, and it cost one phantom finding out of 22. */
const M = {}, RM = {};
for (const m of mSeg.matchAll(/([A-Za-z_][A-Za-z0-9_]*)\s*:\s*"([^"]+)"/g)) { M[m[1]] = m[2]; RM[m[2]] = m[1]; }

// The columns proven to reach a screen. Reusing check:field-renders' own list rather than
// restating it, so the two cannot drift on which columns render.
const guard = fs.readFileSync("scripts/check-field-renders.mjs", "utf8");
const fm = guard.match(/const FIELDS\s*=\s*\[([\s\S]*?)\n\];/);
if (!fm) { console.error("ANCHOR LOST: check-field-renders' FIELDS list moved."); process.exit(1); }
const rendered = [...new Set([...fm[1].matchAll(/"([a-z0-9_]+)"/g)].map((m) => m[1]))];

const camel = (c) => c.replace(/_([a-z])/g, (_, ch) => ch.toUpperCase());
// SS keys that abbreviate a column rather than camelCasing it. Without these the run reports
// correct work: `hazards` is contributable as `haz`, `turnaround` as `turn`.
const ALIAS = {
  hazards: "haz", obj_haz: "objHaz", turnaround: "turn", best_season: "bestSeason",
  rappel_detail: "rap", descent: "descentText", descent_text: "descentText",
  what_to_bring: "whatToBring", watch_out: "watchOut", rope_note: "ropeNote",
  start_type: "startType", prot_rating: "protRating", pitch_detail: "pitchDetail",
  rappel_count_note: "rappelCountNote", detailed_rack: "rack", pro_needs: "rack",
};

// Fail closed: an empty side makes every column look contributable, or none.
if (SS.size < 40 || rendered.length < 40) {
  console.error(`broken scan — ${SS.size} SS keys, ${rendered.length} rendered columns.`);
  process.exit(1);
}

const missing = [];
let contributable = 0;
for (const col of rendered.sort()) {
  const keys = [camel(col), col, ALIAS[col], RM[camel(col)], RM[col]].filter(Boolean);
  if (keys.some((k) => SS.has(k) || SS.has(M[k]))) contributable++;
  else missing.push(col);
}

console.log(`rendered columns: ${rendered.length}   contributable: ${contributable}   not: ${missing.length}\n`);
for (const c of missing) console.log("  " + c);
console.log(`
Read this as a list, not a backlog — the header says which entries are deliberate. The one still
worth acting on is climbing_route: its section's edit pencil writes to pitchDetail, which renders
in a different section.`);
