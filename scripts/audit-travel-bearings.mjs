#!/usr/bin/env node
// Does a route's prose send a party the way its own pins say the summit is?
//
// THE DEFECT THIS EXISTS FOR HAS SHIPPED TWICE, both found by hand and both able to hurt somebody.
// wa_iron_peak_teanaway_scramble said "From the saddle ... head NORTH along the open ridge" when its
// own stored saddle and summit put the top at 152 degrees, SSE — and what lies north-northwest is a
// higher, harder peak. wa_philadelphia_mountain_scramble told a party to turn a cliff band on the
// side its own hazard pin said the cliffs were on.
//
// Both have the same cause: a LANDFORM'S NAME read as a DIRECTION OF TRAVEL. Iron Peak's north ridge
// is genuinely called that, and you climb it heading south.
//
// No coverage check can see this. The columns are populated, the prose is fluent, and the sentence
// is a plausible instruction. Only comparing it against the row's own coordinates settles it, and
// that needs no research at all — the evidence is already in the row.
//
// SCOPE, deliberately narrow. It fires only where all of this holds:
//   * a sentence says travel FROM a place, and that place is the LAST PIN BEFORE THE SUMMIT — the
//     nearest one to it, and within 2 km
//   * the sentence carries a compass direction that is NOT part of a landform's name, NOT a position
//     ("north of", "from the west"), and NOT something other than the party moving ("draining south")
//   * the direction follows a travel verb closely enough to be governed by it
//   * the route has a placed summit pin to travel toward
//   * the stated direction and the pin-to-summit bearing are OPPOSED — more than 90 degrees apart
//
// THE LAST-PIN RULE IS WHAT MAKES THIS USABLE, and leaving it out was the first draft's mistake.
// An approach is a multi-leg journey: Park Butte Trail runs SOUTH into Schriebers Meadow on the way
// to a summit that bears 359 degrees from the trailhead, and both facts are true. Comparing any
// sentence against the trailhead-to-summit bearing reported 89 findings of which almost none were
// real — the same trap audit:trailhead-road records as "a drive has several named legs". Only on the
// final leg does "head <direction>" actually mean "toward the summit", which is exactly the sentence
// that was wrong on Iron Peak.
//
// 90 degrees is the threshold for the same reason audit:aspect-name uses it on a face: a route
// legitimately wanders, and a party told "north" that walks northeast has been told something true
// enough. Opposed is the claim that cannot be explained away, and it is what both real cases were.
//
// WHAT IT DELIBERATELY CANNOT DO: judge "left" and "right", which depend on the direction of travel
// and therefore on a leg this script does not reconstruct. Iron Peak's beta says "up and to the right
// (north)" — the RIGHT is correct for a party arriving eastbound and only the compass gloss is wrong.
// A check that flagged handedness would have told an author to break that. It reads the compass word
// and leaves the hand alone.
//
// Report-only, and it must stay so: a bearing disagreement says the two records differ, never which
// one to rewrite. Read the row.
//
// Usage: npm run audit:travel-bearings [-- --state wa|all] [-- --selftest]

import { selectAll, requireServiceKey } from "./lib/supabase-env.mjs";

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const STATE = arg("--state", "all");
const SELFTEST = argv.includes("--selftest");
const OPPOSED_DEG = 90;

const DIRS = { north: 0, northeast: 45, east: 90, southeast: 135, south: 180, southwest: 225, west: 270, northwest: 315,
  "north-northeast": 22.5, "east-northeast": 67.5, "east-southeast": 112.5, "south-southeast": 157.5,
  "south-southwest": 202.5, "west-southwest": 247.5, "west-northwest": 292.5, "north-northwest": 337.5 };
const ABBREV = { NNE: 22.5, NE: 45, ENE: 67.5, ESE: 112.5, SE: 135, SSE: 157.5,
  SSW: 202.5, SW: 225, WSW: 247.5, WNW: 292.5, NW: 315, NNW: 337.5 };
/* A direction immediately in front of one of these is naming a feature, not pointing anywhere:
   "the north ridge", "its west face". That distinction is the whole defect, so it is also the whole
   precision problem — see the Iron Peak note above. */
const LANDFORM = /^(?:ridge|face|arete|arête|buttress|spur|gully|gullies|couloir|couloirs|col|pass|saddle|summit|peak|slope|slopes|side|shoulder|rib|wall|bowl|basin|glacier|snowfield|flank|aspect|corner|dihedral|chimney|chute|crest|edge|fork|branch|prow|tower|spire|notch|climb|arm|route|trail|creek|stream|drainage|valley|meadow|meadows|lake|butte|camp|approach|variation|bench|ledge|rim|cirque|headwall|moraine|tarn|plateau)\b/i;
/* A direction can belong to something that is not the party. A stream drains south; a face faces
   south; a summit is SEEN from the south. None of those is an instruction. */
const NOT_THE_PARTY = /\b(?:drain(?:s|ing|ed)?|flow(?:s|ing)?|fac(?:es|ing)|look(?:s|ing)|seen|visible|view(?:s|ed)?|lies|lie|sits|runs|running|rises|rising|falls|falling|extends?|point(?:s|ing)?)\s+(?:\w+\s+){0,2}$/i;
/* Travel verbs — the sentence has to be an instruction to MOVE, not a description of what lies where. */
const TRAVEL = /\b(?:head|heads|heading|go|goes|going|travel|climb|climbs|climbing|ascend|ascends|ascending|traverse|traverses|traversing|continue|continues|continuing|follow|follows|following|walk|walks|hike|hikes|scramble|scrambles|trend|trends|trending|make your way|work|works|working)\b/i;

const rad = d => d * Math.PI / 180;
export function bearing(a, b) {
  const y1 = rad(a[0]), y2 = rad(b[0]), dx = rad(b[1] - a[1]);
  const t = Math.atan2(Math.sin(dx) * Math.cos(y2), Math.cos(y1) * Math.sin(y2) - Math.sin(y1) * Math.cos(y2) * Math.cos(dx));
  return (t / Math.PI * 180 + 360) % 360;
}
export const angleDiff = (a, b) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };

/* Pull the compass words a sentence USES as directions, skipping those naming a landform. */
export function statedDirections(sentence) {
  const out = [];
  // Spelled-out words are matched case-insensitively; ABBREVIATIONS are matched UPPERCASE ONLY and
  // never as a single letter. This route text writes "climb the connecting ridge NNW to a bulge",
  // and missing it is not merely lost recall — it made the sentence look like it only ever said
  // "west", which turned a correct multi-leg description into a finding. A lone "S" is a possessive
  // or a grade far more often than it is south, which is why the abbreviations start at two letters;
  // audit:aspect-name records the same rule after "Weston Wall" matched "west".
  const re = /\b(north|south|east|west|northeast|northwest|southeast|southwest|north-northeast|east-northeast|east-southeast|south-southeast|south-southwest|west-southwest|west-northwest|north-northwest)\b|\b(NNE|ENE|ESE|SSE|SSW|WSW|WNW|NNW|NE|NW|SE|SW)\b/g;
  let m;
  while ((m = re.exec(sentence))) {
    // Strip a parenthetical gloss before reading what follows: "the east (left) side of the crest"
    // is naming a side, and the bracket was hiding the noun that says so.
    const after = sentence.slice(m.index + m[0].length).replace(/^[\s/-]+/, "").replace(/^\([^)]*\)\s*/, "");
    const before = sentence.slice(0, m.index);
    if (LANDFORM.test(after)) continue;                    // "north ridge" — a name
    if (/^(?:of|side|end|shore|bank|rim|arm|aspect|facing)\b/i.test(after)) continue;  // "north of", "north side"
    if (/\b(?:from|on|to)\s+the\s*$/i.test(before)) continue;  // "from the west" — where it is, not where you go
    if (NOT_THE_PARTY.test(before)) continue;              // "draining south", "south-facing"
    /* The direction must be governed by a travel verb, not merely share a long sentence with one. */
    const clause = before.split(/[,;:]/).pop() || "";
    if (!TRAVEL.test(clause) && !TRAVEL.test(before.slice(-60))) continue;
    const deg = m[1] ? DIRS[m[1].toLowerCase()] : ABBREV[m[2]];
    if (deg == null) continue;
    out.push({ word: m[0], deg, at: m.index });
  }
  return out;
}

/* Which of the route's own pins does this sentence say you are leaving FROM? */
export function fromPin(sentence, pins) {
  const m = /\bfrom (?:the |a |your )?([a-z0-9'’\- ]{3,40})/i.exec(sentence);
  if (!m) return null;
  const said = m[1].toLowerCase().trim();
  let best = null;
  for (const p of pins) {
    const name = String(p.name || "").toLowerCase();
    const type = String(p.type || "").toLowerCase();
    /* Match on a distinctive word the pin's own name or type carries — "the saddle" against
       "Eldorado Pass (saddle)". Short words are excluded so "the ridge" cannot match everything. */
    for (const tok of new Set([...name.split(/[^a-z]+/), type])) {
      if (tok.length < 5) continue;
      if (said.includes(tok)) { best = p; break; }
    }
    if (best) break;
  }
  return best;
}

const LAST_LEG_KM = 2;
const km = (a, b) => { const R = 6371, dy = rad(b[0] - a[0]), dx = rad(b[1] - a[1]);
  const q = Math.sin(dy / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dx / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(q)); };

export function analyse(rows) {
  const findings = [], stats = { routes: 0, sentences: 0, comparable: 0 };
  for (const r of rows) {
    const pins = (r.waypoints || []).filter(w => w && w.lat != null && w.lng != null);
    const summit = pins.find(w => /summit/i.test(String(w.type || "")));
    if (!summit || pins.length < 2) continue;
    /* The LAST pin before the summit is the only one from which "head <direction>" means "toward the
       summit". Anything further out is a leg of a journey and its bearing proves nothing. */
    let lastLeg = null, bestD = Infinity;
    for (const w of pins) {
      if (w === summit) continue;
      const d = km([+w.lat, +w.lng], [+summit.lat, +summit.lng]);
      if (d < bestD) { bestD = d; lastLeg = w; }
    }
    if (!lastLeg || bestD > LAST_LEG_KM) continue;
    stats.routes++;
    // DESCENT TEXT IS EXCLUDED, and it has to be: it describes travel AWAY from the summit, so the
    // pin-to-summit bearing is the wrong comparison by construction. Three findings in the draft
    // before this one were descents being read as approaches.
    for (const col of ["approach", "beta", "climbing_route"]) {
      const raw = r[col];
      const text = typeof raw === "string" ? raw : "";
      if (!text) continue;
      for (const sent of text.split(/(?<=[.!?])\s+/)) {
        stats.sentences++;
        if (!TRAVEL.test(sent)) continue;
        // THE SENTENCE MUST BE HEADED FOR THE TOP. A leg that ends at a col, a saddle or the base of
        // something is travel to an INTERMEDIATE, and comparing it against the summit bearing
        // condemns correct writing — "continue west a quarter mile to a saddle at 7,400 ft" makes no
        // claim about where the summit is. Same lesson as the last-pin rule, one level finer: not
        // just the last PIN, but a sentence whose destination is actually the summit.
        if (!/\b(?:summit|top|high point|highest point)\b/i.test(sent)) continue;
        // ...AND THE SUMMIT MUST BE NAMED AFTER THE DIRECTION, because that is the order an
        // instruction is written in: you say which way, then where it gets you. Requiring only that
        // the sentence MENTIONS a summit kept three false positives that this ordering removes —
        // a multi-leg sentence that passes "below Kololo's east summit" on its way to a saddle, and
        // a traverse that BEGINS "from Washington's summit" heading for a different peak. In both,
        // the summit token sits before the direction word, so neither is a claim about reaching it.
        const dirs = statedDirections(sent).filter(d => /\b(?:summit|top|high point|highest point)\b/i.test(sent.slice(d.at)));
        if (!dirs.length) continue;
        const from = fromPin(sent, pins);
        if (!from || from !== lastLeg) continue;
        stats.comparable++;
        const brg = bearing([+from.lat, +from.lng], [+summit.lat, +summit.lng]);
        /* If ANY stated direction is compatible, the sentence is fine — prose often gives a sequence
           ("north then east"), and condemning it on the first word would report correct writing. */
        const best = Math.min(...dirs.map(d => angleDiff(d.deg, brg)));
        if (best <= OPPOSED_DEG) continue;
        findings.push({ id: r.id, col, from: from.name, said: dirs.map(d => d.word).join("/"),
          bearing: Math.round(brg), off: Math.round(best), km: +bestD.toFixed(2), sentence: sent.replace(/\s+/g, " ").slice(0, 240) });
      }
    }
  }
  return { findings, stats };
}

function selftest() {
  const IRON = { id: "iron", approach: "From the saddle, head north along the open ridge to the summit.",
    waypoints: [{ type: "Junction", name: "Eldorado Pass (saddle)", lat: 47.42212, lng: -120.90591 },
      { type: "Summit", name: "Iron Peak summit", lat: 47.41514, lng: -120.9005 }] };
  const cases = [
    ["the real Iron Peak defect is caught", [IRON], o => o.findings.length === 1 && o.findings[0].off > 140],
    ["the same row with the direction corrected is silent",
      [{ ...IRON, approach: "From the saddle, head south-southeast along the open ridge to the summit." }],
      o => o.findings.length === 0],
    ["a LANDFORM name is not a direction — 'the north ridge' must not fire",
      [{ ...IRON, approach: "From the saddle, climb the north ridge to the summit." }], o => o.findings.length === 0],
    ["'north of' is a position, not an instruction",
      [{ ...IRON, approach: "From the saddle, the summit lies north of the col and you climb toward it." }],
      o => o.findings.length === 0],
    ["a merely oblique direction is NOT opposed and stays quiet",
      [{ ...IRON, approach: "From the saddle, head east along the open ridge to the summit." }], o => o.findings.length === 0],
    ["a sentence naming a sequence is judged on its BEST direction",
      [{ ...IRON, approach: "From the saddle, head north at first, then south-southeast to the summit." }],
      o => o.findings.length === 0],
    ["no summit pin means nothing to compare, and nothing is claimed",
      [{ id: "x", approach: "From the saddle, head north.", waypoints: [{ type: "Junction", name: "Eldorado Pass (saddle)", lat: 47.42212, lng: -120.90591 }] }],
      o => o.findings.length === 0 && o.stats.routes === 0],
    ["a description with no travel verb is not an instruction",
      [{ ...IRON, approach: "From the saddle, the north face is visible across the valley." }], o => o.findings.length === 0],
    ["handedness is left alone — 'to the right' alone never fires",
      [{ ...IRON, approach: "From the saddle, scramble up and to the right to the summit." }], o => o.findings.length === 0],
    ["an UPPERCASE abbreviation counts as a direction",
      [{ ...IRON, approach: "From the saddle, head N along the open ridge NNW to the summit." }],
      o => o.findings.length === 1],
    ["...and a compatible abbreviation clears a sentence that also names a wrong one",
      [{ ...IRON, approach: "From the saddle, head north at first, then SSE to the summit." }],
      o => o.findings.length === 0],
    ["a lowercase 'se' is not southeast — it is the middle of a word",
      [{ ...IRON, approach: "From the saddle, traverse loose scree to the summit." }], o => o.findings.length === 0],
  ];
  let bad = 0;
  for (const [label, rows, ok] of cases) {
    const pass = ok(analyse(rows));
    if (!pass) bad++;
    console.log(`${pass ? "ok  " : "FAIL"} ${label}`);
  }
  console.log(bad ? `\n${bad} self-test case(s) FAILED` : `\nall ${cases.length} self-test cases pass`);
  process.exit(bad ? 1 : 0);
}

if (SELFTEST) selftest();

const key = requireServiceKey();
const filter = STATE === "all" ? "waypoints=not.is.null" : `waypoints=not.is.null&id=like.${STATE}_*`;
const rows = await selectAll("routes", "id,name,area_id,waypoints,approach,beta,climbing_route,descent_text", filter, { pageSize: 150, key });
if (rows.length < 100) {
  console.error(`REFUSING — only ${rows.length} routes read. A short read makes every route look clean.`);
  process.exit(1);
}

const { findings, stats } = analyse(rows);
console.log(`${STATE}: ${rows.length} routes with waypoints — ${stats.routes} carry a placed summit pin and could be compared`);
console.log(`${stats.sentences} sentences scanned, ${stats.comparable} of them an instruction FROM a known pin\n`);
console.log(`sentences whose stated direction is OPPOSED (>${OPPOSED_DEG}deg) to the pin-to-summit bearing: ${findings.length}\n`);
for (const f of findings.sort((a, b) => b.off - a.off)) {
  console.log(`  ${f.off}deg off   ${f.id}  [${f.col}]`);
  console.log(`      from "${f.from}" (${f.km} km out, the last pin before the top) the summit bears ${f.bearing}deg, the text says ${f.said}`);
  console.log(`      "${f.sentence}"`);
}
console.log(`\nReport-only. A disagreement says the two records differ, never which to rewrite — and the`);
console.log(`pin can be the wrong half. Read the row before changing a word.`);
