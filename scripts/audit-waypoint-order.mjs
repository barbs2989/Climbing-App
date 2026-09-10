// Are a route's waypoints in a sensible order, and does it list the same place twice?
//
// Two reports drove this: Forbidden Peak's West Ridge lists Trailhead (0 mi), Summit (4.5
// mi), Boston Basin camp (3 mi), West Ridge notch (4.2 mi) — the summit third from the end
// of a walk it is the far point of; and Mount Olympus' Blue Glacier standard route shows two
// summit pins on the map.
//
// Read-only, report-only. The repair lands in normalizeWaypoints() at the DB boundary rather
// than in the rows, so it covers seed routes and future imports too; this script measures how
// much it changes and prints what it would touch.
//
//   node scripts/audit-waypoint-order.mjs                 # whole catalog summary
//   node scripts/audit-waypoint-order.mjs --state wa      # ids under a state prefix
//   node scripts/audit-waypoint-order.mjs --list 30
//
// SIBLING, NOT A DUPLICATE. `scripts/audit-waypoints.mjs` asks a different question of the
// same column; the two were written in parallel under one filename (#789 and #783). This one
// asks whether the LIST is sensible — ordering and duplicate pins — and needs no gpx at all.
// That one asks whether each waypoint is on the route's own GPX TRACK: segment-aware distance
// to the line, whether the trailhead sits at the track's start, whether the track ever reaches
// the summit. Neither subsumes the other — a perfectly ordered list can sit entirely off the
// track, and a list every point of which is on the track can still name the summit third from
// the end. Run both.
import { SUPABASE_URL, headers, anonKey, requireServiceKey } from "./lib/supabase-env.mjs";
import { orderWaypoints, dedupeWaypoints } from "../lib/waypoints.js";

// Two pins this far apart are not one place however alike their names. Deliberately far LOOSER
// than dedupeWaypoints' own ~30 m sameSpot test: the question here is not "is this pin precise"
// but "did the merge delete somewhere a climber has to go", and the three real cases stood
// 184 m, 435 m and 7,829 m apart.
const FAR_M = 100;
const _rad = (d) => (d * Math.PI) / 180;
function metresApart(a, b) {
  const dLat = _rad(b.lat - a.lat), dLng = _rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(_rad(a.lat)) * Math.cos(_rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

// A pin listed AFTER the summit is an approach marker out of place ONLY if it is on the way IN.
// The descent is a leg too, and these are the types you meet on both.
const isSummitPin = (w) => /^(summit|topout)$/i.test(String((w && w.type) || ""));
const isTrailheadPin = (w) => /trailhead|parking/i.test(String((w && w.type) || ""));
// ALIGNED TO THE SET THE SWEEP USED, deliberately, rather than a third vocabulary. This class was
// read route by route across six batches (#1588, #1590, #1594, #1599, #1600, #1602) — 62 reordered,
// 19 left with a recorded reason — and `scripts/oneoff/measure-summit-before-approach-shape.mjs`
// holds that adjudication. A different marker set here would make this count incomparable with it
// and resurrect settled routes as apparent findings: adding `crag`/`climbing area` was tried and
// added 11 crag routes of the shape Trailhead,Topout,Crag, none of them new work.
// `Hazard` is over-inclusive ON PURPOSE and the sweep says so — narrowing it would need the script
// to tell a descent rappel from an approach hazard, which is the judgement it cannot make.
const APPROACH_TYPES = /^(trailhead|junction|water|campsite|camp|approach|pass|hazard|parking)$/i;
const isApproachMarker = (w) => APPROACH_TYPES.test(String((w && w.type) || "").trim());

// THE ROUTE'S OWN DESCENT PROSE IS WHICH PINS ARE ON THE WAY DOWN, and it is written by a
// different pass than the waypoint list — so it is a second record rather than the same claim
// twice. Without it this section reports the RETURN LEG as a defect: four Dragontail-area routes
// list Aasgard Pass after the summit and every one of their descent paragraphs says outright that
// Aasgard is how you get down ("the standard descent is southeast to a saddle, then east across a
// long snow slope to Aasgard Pass"). #1644 established that for wa_dragontail_peak_r3 by hand.
//
// The match is deliberately HARD TO SATISFY, because refusing wrongly DROPS a finding while
// keeping a correct route merely adds a line to a reading list. A token must be >=5 characters —
// which is what stops "North Side wall (GPS pin)" matching any descent paragraph containing the
// word "wall" — must not be a generic feature word, and must not come from the route's OWN name,
// or a route called "Slippery Slab Tower NE Face" matches its own descent prose vacuously.
const GENERIC_PIN_WORD = new Set(["trail", "trailhead", "junction", "route", "routes", "start",
  "point", "reference", "water", "source", "crossing", "campsite", "camp", "basin", "ridge",
  "gully", "notch", "couloir", "glacier", "summit", "topout", "upper", "lower", "north", "south",
  "east", "west", "north-", "left", "right", "above", "below", "approach", "descent", "climbing",
  "area", "wall", "face", "tower", "buttress", "marker", "pass", "saddle"]);
function distinctiveTokens(pinName, routeName) {
  const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9\s-]/g, " ").split(/\s+/);
  const own = new Set(norm(routeName));
  return norm(pinName).filter((w) => w.length >= 5 && !GENERIC_PIN_WORD.has(w) && !own.has(w));
}

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? (argv[i + 1] ?? true) : d; };
const STATE = arg("--state", null);
const LIST = +arg("--list", 12);
const key = (() => { try { return requireServiceKey(); } catch { return anonKey(); } })();

async function page(after) {
  const url = `${SUPABASE_URL}/rest/v1/routes?select=id,name,waypoints,descent_text,descent&waypoints=not.is.null` +
    (after ? `&id=gt.${encodeURIComponent(after)}` : "") + `&order=id.asc&limit=1000`;
  for (let a = 0; a < 4; a++) {
    const res = await fetch(url, { headers: headers(key) });
    const t = await res.text();
    if (res.ok) return JSON.parse(t);
    if (a === 3) throw new Error(`GET routes -> ${res.status} ${t.slice(0, 200)}`);
    await new Promise(r => setTimeout(r, 800 * (a + 1)));
  }
}

const t = { rows: 0, withWp: 0, wp: 0, reordered: 0, deduped: 0, dupPins: 0,
  allHaveDist: 0, partialDist: 0, dupSummits: 0, dupFar: 0, dupUnplaced: 0,
  unsortable: 0, afterSummit: 0, afterSummitPins: 0, descentNamed: 0, readingList: 0, selfContradicts: 0 };
const outOrder = [], outDup = [], outFar = [], outAfter = [], outSelf = [];

let after = "";
for (;;) {
  const rows = await page(after);
  if (!rows.length) break;
  for (const r of rows) {
    if (STATE && !String(r.id).startsWith(STATE + "_")) continue;
    t.rows++;
    const wps = Array.isArray(r.waypoints) ? r.waypoints : null;
    if (!wps || !wps.length) continue;
    t.withWp++; t.wp += wps.length;
    const named = wps.filter(w => w && w.distMi != null).length;
    if (named === wps.length) t.allHaveDist++; else if (named) t.partialDist++;

    const dd = dedupeWaypoints(wps);
    if (dd.length !== wps.length) {
      t.deduped++; t.dupPins += wps.length - dd.length;
      const sums = wps.filter(w => w && /^(summit|topout)$/i.test(String(w.type || ""))).length;
      if (sums > 1) t.dupSummits++;
      // "THE SAME PLACE TWICE" IS A CLAIM THIS AUDIT DID NOT CHECK, and twice it was false.
      // dedupeWaypoints merged `trailhead` on TYPE ALONE and stripped POSITIONAL words in
      // nameKey(), so three pins standing 184-7,829 m apart were reported here as duplicates
      // being tidied when they were places being deleted. Both rules are fixed and gated by
      // check:waypoint-dedupe; this measures the claim so a third way cannot hide in the count.
      // Only placed pins can be judged — a pair with no coordinate is counted as unmeasurable
      // rather than waved through.
      for (let i = 0; i < wps.length; i++) for (let j = i + 1; j < wps.length; j++) {
        const a = wps[i], b = wps[j];
        if (!a || !b || String(a.type || "").toLowerCase() !== String(b.type || "").toLowerCase()) continue;
        if (dedupeWaypoints([a, b]).length !== 1) continue;      // this pair is not what collapsed
        if (a.lat == null || b.lat == null || a.lng == null || b.lng == null) { t.dupUnplaced++; continue; }
        const d = metresApart(a, b);
        if (d <= FAR_M) continue;
        t.dupFar++;
        if (outFar.length < LIST) outFar.push({ id: r.id, type: a.type, a: a.name, b: b.name, d });
      }
      if (outDup.length < LIST) outDup.push({ id: r.id, name: r.name, was: wps.length, now: dd.length,
        types: wps.map(w => (w && w.type) || "?").join(",") });
    }
    const ord = orderWaypoints(dd);

    // THE GAP THIS AUDIT USED TO DESCRIBE IN A COMMENT IS MEASURED ON EVERY RUN NOW. That comment
    // read "435 of 1012 ... and 64 of them list an approach marker AFTER the summit" — hand-counted,
    // never re-derived, and by 2026-09-09 wrong by more than 2x in the direction that invents work.
    // A semantic invariant in a comment rots; this repo records that under half a dozen names.
    //
    // "Cannot sort" is tested BEHAVIOURALLY rather than by copying orderWaypoints' gate: that
    // function returns the SAME ARRAY REFERENCE when it declines and a fresh one when it sorts, so
    // `ord === dd` asks the function instead of restating its rule, and cannot fossilise the day
    // the rule changes.
    if (ord === dd && dd.length >= 2) {
      t.unsortable++;

      // THE ONE CLAIM IN THIS SECTION THAT NEEDS NO PROSE AND NO RESEARCH: a route the app cannot
      // sort may still carry SOME distances, and those can already contradict the order it renders.
      // orderWaypoints sorts ASCENDING, so ascending is the app's own model of the list — a
      // backward step among the KNOWN values means the app would reorder this route the moment the
      // gap were filled, i.e. what is on screen today is an order the app itself would reject.
      // The row contradicts itself, which is the standard `check:gain-floor-stated` is held to.
      // NOT NEW WORK: scripts/oneoff/reorder-waypoints-by-distance.mjs already refuses these by
      // name, because sorting them hoists the base of the climb above the trailhead — the array is
      // two approaches spliced together rather than one scrambled sequence. Counted here so the
      // refusal is visible on every run instead of living only in that script's skip list.
      const known = dd.filter(w => w && typeof w.distMi === "number" && Number.isFinite(w.distMi));
      if (known.length >= 2) {
        let worst = 0, pair = null;
        for (let k = 1; k < known.length; k++) {
          const drop = known[k - 1].distMi - known[k].distMi;
          if (drop > worst) { worst = drop; pair = [known[k - 1], known[k]]; }
        }
        if (worst > 0) {
          t.selfContradicts++;
          if (outSelf.length < LIST) outSelf.push({ id: r.id, name: r.name, worst,
            a: `${pair[0].type} "${String(pair[0].name).slice(0, 34)}" @${pair[0].distMi} mi`,
            b: `${pair[1].type} "${String(pair[1].name).slice(0, 34)}" @${pair[1].distMi} mi`,
            known: known.length, of: dd.length });
        }
      }

      const si = dd.findIndex(isSummitPin);
      const after = si < 0 ? [] : dd.slice(si + 1).filter((w) => !isSummitPin(w));
      const markers = after.filter(isApproachMarker);
      // A LOOP legitimately ends back at the trailhead, so a single trailhead as the very last pin
      // is not evidence of anything.
      const loopBack = after.length === 1 && isTrailheadPin(after[0]);
      if (markers.length && !loopBack) {
        const prose = [r.descent_text, r.descent].filter(Boolean).join(" ").toLowerCase();
        const rows_ = markers.map((w) => {
          const tk = distinctiveTokens(w.name, r.name);
          const named = !!(prose && tk.length && tk.some((x) => prose.includes(x)));
          return { pin: `${w.type}${w.name ? ` (${String(w.name).slice(0, 44)})` : ""}`, named };
        });
        t.afterSummit++; t.afterSummitPins += rows_.length;
        t.descentNamed += rows_.filter((x) => x.named).length;
        const unexplained = rows_.filter((x) => !x.named);
        if (unexplained.length) {
          t.readingList++;
          if (outAfter.length < LIST) outAfter.push({ id: r.id, name: r.name,
            seq: dd.map((w) => (w && w.type) || "?").join(","),
            summitAt: si + 1, of: dd.length,
            pins: unexplained.map((x) => x.pin),
            explained: rows_.filter((x) => x.named).map((x) => x.pin) });
        }
      }
    }

    if (ord.some((w, i) => w !== dd[i])) {
      t.reordered++;
      if (outOrder.length < LIST) outOrder.push({ id: r.id, name: r.name,
        before: dd.map(w => `${(w.type || "?")}@${w.distMi ?? "-"}`).join(" → "),
        after: ord.map(w => `${(w.type || "?")}@${w.distMi ?? "-"}`).join(" → ") });
    }
  }
  after = rows[rows.length - 1].id;
  if (rows.length < 1000) break;
}

console.log("\n=== waypoint audit ===");
console.log("routes read (waypoints not null):", t.rows, " with a non-empty list:", t.withWp, " waypoints total:", t.wp);
console.log("routes where every waypoint has distMi:", t.allHaveDist, " partial:", t.partialDist);
console.log("\nroutes listing the same place twice:", t.deduped, " duplicate pins removed:", t.dupPins,
  " of which had 2+ summit/topout pins:", t.dupSummits);
// "the same place" is now MEASURED rather than asserted — see the note beside the loop.
if (t.dupFar) {
  console.log(`  ${t.dupFar} of those merged pairs stand MORE THAN ${FAR_M} m apart — that is not a`);
  console.log(`  duplicate being tidied, it is a place being DELETED before it reaches the screen.`);
} else {
  console.log(`  every merged pair stands within ${FAR_M} m — so these really are duplicates, not`);
  console.log(`  two places collapsed into one.`);
}
if (t.dupUnplaced) console.log(`  (${t.dupUnplaced} pair(s) carry no coordinate, so their separation is unmeasurable.)`);
// This number is ONLY about the routes orderWaypoints can actually order, and saying so is the
// whole point of printing it this way. `orderWaypoints` sorts by distMi and returns the list
// UNTOUCHED unless every pin has a finite one — so for a route missing a single distance the
// app renders the stored order however wrong, and this audit reports it as in-order BY
// CONSTRUCTION. An unqualified "0 out of order" over that population is the vacuous-pass shape,
// so the denominator is stated with the verdict — and what is sitting inside it is MEASURED
// below rather than described from memory.
const unsortable = t.withWp - t.allHaveDist;
// The wording matters and was backwards. This compares the STORED array against what
// orderWaypoints produces, so a non-zero count means the app is CORRECTING those routes at
// render time — they render in order, and it is the stored order that differs. Saying they
// "render out of order" reported a fix as a defect. It went 0 -> 4 the moment distMi was
// derived for 17 routes, which is the sort starting to work rather than anything breaking.
console.log(`routes the app REORDERS at render time (stored order differs, screen is correct): ${t.reordered}` +
  ` — of the ${t.allHaveDist} it can order at all`);
console.log(`  ${unsortable} more cannot be ordered (a pin is missing distMi), so they render in` +
  ` STORED order and are counted as in-order here whatever that order is.`);
// WHAT IS SITTING IN THAT GAP — and the refusals are most of the value, so they are printed as a
// count rather than silently dropped.
//
// READ THE AFTER-SUMMIT NUMBER AS AN ADJUDICATED RESIDUE, NOT A BACKLOG. Every route of that shape
// was read individually across six batches (#1588, #1590, #1594, #1599, #1600, #1602): 62 were
// reordered and 19 were deliberately left, in five kinds that no shape test can separate — a
// descent leg correctly after the summit, the same place pinned either side of it, a mistyped
// `Topout` naming the base of a wall, a distance-less pin whose slot would be a guess, and one
// declared partial. `scripts/oneoff/measure-summit-before-approach-shape.mjs` holds that record and
// its own header proves a bulk reorder unsafe. This section exists so the number stops being a
// hand-count in a comment, NOT to re-open the sweep.
//
// scripts/oneoff/probe-waypoint-order-coverage.mjs asks the coverage half standalone and DISAGREES
// with this file about the denominator — it reports 471 sortable against 483 here, because it drops
// routes with fewer than 2 pins from both buckets. Trust this one: it is the one that runs.
if (!t.unsortable) {
  console.log("  NOTHING was unsortable, so this run says nothing about that gap.");
} else {
  // SAY WHICH DENOMINATOR THIS IS. The line above counts every route orderWaypoints leaves alone,
  // which includes the one-pin routes — and a single pin has no order to be wrong about. Printing
  // "of those N" against a different N is the drift this section was written to remove.
  console.log(`\nof those, ${t.unsortable} carry 2+ pins — a lone pin has no order to be wrong about.`);
  console.log(`  ${t.selfContradicts} CONTRADICT THEMSELVES: the distances they DO carry already run backwards in`);
  console.log(`  the stored order, so the app would reorder the route the moment the gap were filled —`);
  console.log(`  what is on screen today is an order the app itself would reject. No prose, no research.`);
  console.log(`  These are ADJUDICATED too — reorder-waypoints-by-distance.mjs skips them by name, e.g.`);
  console.log(`  "the array does not start at its nearest point — likely two approaches spliced together".`);
  console.log(`  ${t.afterSummit} list a non-summit pin AFTER the summit (${t.afterSummitPins} pins) — an ADJUDICATED`);
  console.log(`  RESIDUE, not a backlog: this shape was read route by route across six batches and the`);
  console.log(`  keeps carry recorded reasons. Do not re-sweep it on the strength of this count.`);
  console.log(`  ${t.descentNamed} are NAMED IN THE ROUTE'S OWN DESCENT PROSE — the return leg, not a`);
  console.log(`  misordering. A pass or a lake you meet again on the way down belongs after the top.`);
  console.log(`  ${t.afterSummitPins - t.descentNamed} on ${t.readingList} route(s) are not accounted for by that prose.`);
  console.log(`  Still NOT a defect count: the pin TYPE cannot say which leg a pin is on, and a route`);
  console.log(`  whose descent prose is thin appears here while being perfectly correct.`);
}
if (outFar.length) {
  console.log("\nMERGED BUT NOT THE SAME PLACE:");
  outFar.sort((x, y) => y.d - x.d).forEach(o =>
    console.log(` ${Math.round(o.d).toString().padStart(6)} m  ${String(o.type).padEnd(10)} ${o.id}\n           "${o.a}"  +  "${o.b}"`));
}
if (outDup.length) { console.log("\nduplicates:"); outDup.forEach(o => console.log(` ${o.id} — ${o.name}: ${o.was} → ${o.now} [${o.types}]`)); }
if (outOrder.length) { console.log("\nreordered:"); outOrder.forEach(o => console.log(` ${o.id} — ${o.name}\n    was: ${o.before}\n    now: ${o.after}`)); }
if (outSelf.length) {
  console.log("\nTHE ROW CONTRADICTS ITSELF — known distances run backwards in the stored order:");
  outSelf.sort((x, y) => y.worst - x.worst).forEach(o => {
    console.log(` ${o.worst.toFixed(2).padStart(6)} mi back  ${o.id} — ${o.name}  (${o.known} of ${o.of} pins placed)`);
    console.log(`     ${o.a}\n     then ${o.b}`);
  });
}
if (outAfter.length) {
  console.log("\nAFTER THE SUMMIT AND NOT EXPLAINED BY THE DESCENT (read, do not sweep):");
  outAfter.forEach(o => {
    console.log(` ${o.id} — ${o.name}  (summit is pin ${o.summitAt} of ${o.of})`);
    console.log(`    types: ${o.seq}`);
    console.log(`    unexplained: ${o.pins.join("  |  ")}`);
    if (o.explained.length) console.log(`    (descent prose does name: ${o.explained.join("  |  ")})`);
  });
}
process.exit(0);
