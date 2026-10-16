/* Which rope does this station list assume? Ask the arithmetic, not the prose.

   A rappel is limited to HALF the rope: a single 60 m rope reaches ~30 m, a single 70 m reaches
   ~35 m. So a station list containing a 55 m rappel cannot be done on one rope — that table IS
   the two-rope sequence, whether or not any sentence says so.

   This matters because most parties carry one rope (user, 2026-08-12). A route whose header
   says "3 rappels" off a table of 55 m stations is telling a single-rope party a number they
   cannot achieve; they will do roughly twice that, and they find out at the first station.

   Prose parsing found this for the handful of routes that happened to describe their rope
   setup. Arithmetic finds it for every route that records lengths, with no language in the loop.

   Read-only, report-only. */
import { anonKey, selectAll } from "../lib/supabase-env.mjs";

// Half-rope reach, minus a little for the knot and for anchors set slightly below the lip.
const SINGLE_60 = 32;
const SINGLE_70 = 37;

const key = anonKey();
const rows = await selectAll("routes", "id,name,rappels,rappel_detail,rappel_count_note", "rappel_detail=not.is.null", { pageSize: 200, key });
if (!rows.length) throw new Error("empty read — refusing to report a clean result");

let withLengths = 0;
const needsTwo = [], needs70 = [], fitsSingle = [];
for (const r of rows) {
  const d = Array.isArray(r.rappel_detail) ? r.rappel_detail : [];
  const lens = d.map((x) => x && x.lengthM).filter((n) => typeof n === "number" && n > 0);
  if (!lens.length) continue;
  withLengths++;
  const max = Math.max(...lens);
  const over60 = lens.filter((n) => n > SINGLE_60).length;
  if (max > SINGLE_70) needsTwo.push({ r, max, over60, n: d.length });
  else if (max > SINGLE_60) needs70.push({ r, max, over60, n: d.length });
  else fitsSingle.push({ r, max, n: d.length });
}

console.log(`routes with a station list        : ${rows.length}`);
console.log(`  ...of which record any length   : ${withLengths}\n`);
console.log(`every station within a single 60 m rope (<=${SINGLE_60} m) : ${fitsSingle.length}`);
console.log(`needs a single 70 m for the longest (${SINGLE_60}-${SINGLE_70} m) : ${needs70.length}`);
console.log(`CANNOT be done on one rope (>${SINGLE_70} m station)        : ${needsTwo.length}`);
console.log(`\nThe last group is the important one: the header prints that station COUNT, and a`);
console.log(`single-rope party will do roughly double it.\n`);

const say = (label, list) => {
  if (!list.length) return;
  console.log(label);
  for (const x of list.sort((a, b) => b.max - a.max).slice(0, 30)) {
    console.log(`  ${x.r.id.padEnd(44)} ${String(x.n).padStart(2)} stations, longest ${x.max}m, ${x.over60} over ${SINGLE_60}m`);
  }
  if (list.length > 30) console.log(`  … and ${list.length - 30} more`);
  console.log("");
};
say("TWO-ROPE STATION LISTS", needsTwo);
say("NEEDS A 70 M SINGLE ROPE", needs70);
