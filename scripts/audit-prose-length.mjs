// Does a route's DESCRIPTION state a climb length or pitch count that its own STATS contradict?
//
// The route page renders both: the "Route length"/"Climb length" and "Pitches" tiles at the top
// of Overview (`length_m`, else the sum of `pitch_detail` lengths; `pitches` when > 0), and the
// "Route description" card (`overview`) a scroll below. Reported by the owner (2026-10-24):
// "sometimes the description of the route says the climb length is different than technical
// stats show". So a disagreement is ONE SCREEN giving two answers to one question.
//
// WHAT COUNTS AS A CLAIM ABOUT THE WHOLE ROUTE, because almost every number in this prose is a
// SECTION ("a 50-ft chimney", "Pitch 2 moves the belay 30 m", "the last 120 m of the ridge"). The
// first unrestricted run read 1,633 pitch phrases and every "a N-ft <feature>" as a route length,
// and the findings were nearly all sections. The discriminator is POSITIONAL, never a deny-list of
// feature nouns, which one more noun beats:
//   length  — only the OPENING of the description ("A 55 m pillar…", "150 ft of climbing…"),
//             "the route/climb/it is|runs|climbs N ft", or "N m in total/overall" not tied to a
//             numbered pitch (P3-4, 70m total is two pitches, not the route).
//   pitches — a sentence that OPENS with the count ("Seven pitches.", "A five-pitch route"),
//             "a/an/this N-pitch <route noun>" anywhere, or "N pitches long".
// One-sided on purpose: a whole-route length stated mid-paragraph is MISSED rather than misread,
// which costs a finding and cannot manufacture one. A per-pitch length ("a 30 m pitch") is a route
// length only on a route stored as one pitch.
//
// THREE OUTCOMES per claim, and only one is a contradiction:
//   MISMATCH — the stats show a value the prose disagrees with. The finding.
//   MISSING  — the prose states a value and the stats show none (pitches 0/null, no length).
//              Nothing on screen contradicts anything; a gap, reported as a count.
//   match    — within tolerance (length ×0.8…×1.25 ±3 m: guidebooks round, and "about 150 ft").
//
// REPORT ONLY. Neither half is privileged — the prose is as often the stale half as the stats
// (an extension's "two pitches long" describing itself beside a whole-line count). Every finding
// is READ and researched before anything is written; see docs/guards/route-prose.md.
//
// Service key (the scan must be complete to report a zero); reads every route with an `overview`.
// `--state=wa` narrows, `--json` prints findings for a consumer, `--fixture=f.json` reads rows from
// a file, `--selftest` needs no DB. NOT a build gate: a property of the DB, not of the checkout.
import { readFileSync } from "node:fs";
import { requireServiceKey, selectAll } from "./lib/supabase-env.mjs";

const arg = (n, d) => { const a = process.argv.find(x => x.startsWith(`--${n}=`)); return a ? a.split("=").slice(1).join("=") : d; };
const STATE = arg("state", null);
const FIXTURE = arg("fixture", null);
const JSON_OUT = process.argv.includes("--json");
const SHOW_MISSING = process.argv.includes("--missing");

const WORDS = "one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|single";
const WNUM = Object.fromEntries(WORDS.split("|").map((w, i) => [w, i + 1])); WNUM.single = 1;
const num = s => s == null ? null : (WNUM[s.toLowerCase()] ?? Number(String(s).replace(/,/g, "")));

// ── pitches ──────────────────────────────────────────────────────────────────────────────────
const NW = `(\\d{1,2}|${WORDS})`;
const RANGE = `(?:\\s*(?:-|–|to|or)\\s*${NW})?`;
const P_RES = [
  // "Seven pitches.", "A five-pitch route", "It is a long ten-pitch outing" — the sentence OPENS with it.
  // Not followed by a preposition or verb that makes it a section ("Two pitches of 5.7 reach…",
  // "One pitch leads to…").
  new RegExp(`(?:^|[.!?;]\\s+|\\(\\s*)(?:(?:it|this)\\s+is\\s+)?(?:an?\\s+|this\\s+)?(?:long\\s+|short\\s+|big\\s+|classic\\s+|strong\\s+|fine\\s+|steep\\s+|scrambly\\s+)?${NW}${RANGE}[- ]pitch(?:es)?\\b(?!\\s+(?:of|on|up|at|in|above|below|reach|reaches|lead|leads|follow|follows|climb|climbs|cross|take|from|differ|ascend|trending|to)\\b)`, "gi"),
  new RegExp(`\\b(?:an?|this)\\s+(?:\\w+\\s+){0,2}?${NW}${RANGE}-pitch\\s+(?:route|line|climb|outing|crack|corner|trad|sport|bolted|classic|5\\.\\d|ice|mixed|gully|chimney|face|arete|dihedral|free)`, "gi"),
  new RegExp(`\\b${NW}${RANGE}\\s+pitches\\s+long\\b`, "gi"),
];
const P_PARTIAL = /\b(first|last|final|next|top|bottom|lower|upper|remaining|other|extra|more|additional|opening|initial|further|crux|harder|easier|another|these|those|of|two|three)\s+$/i;

export function pitchClaims(t) {
  const out = [];
  P_RES.forEach((re, i) => { for (const m of t.matchAll(re)) {
    if (i > 0 && P_PARTIAL.test(t.slice(Math.max(0, m.index - 25), m.index))) continue;
    const a = num(m[1]), b = num(m[2]) ?? a;
    if (!a || a > 40) continue;
    out.push({ lo: Math.min(a, b), hi: Math.max(a, b), at: m.index, text: m[0].replace(/^[.!?;(\s]+/, "") });
  } });
  return out;
}

// ── length ───────────────────────────────────────────────────────────────────────────────────
const U = "(ft|feet|foot|'|m|meters?|metres?)(?![a-z0-9])";
const N = "(\\d{1,2},\\d{3}|\\d{1,4})";
const NR = `${N}(?:\\s*(?:-|–|to)\\s*${N})?`;
const NOUN = "(?:route|climb|line|crack|corner|dihedral|arete|arête|face|slab|chimney|outing|wall|buttress|ridge|gully|couloir|pillar|flow|smear|curtain|column|ice|climbing|rock|trad|sport|5\\.\\d+|wi\\d|m\\d|classic|lead|pitch)";
const APPROX = "(?:about\\s+|roughly\\s+|around\\s+|some\\s+|approximately\\s+|~\\s*)?";
const L_RES = [
  new RegExp(`^\\s*(?:(?:it|this)\\s+is\\s+)?(?:an?|this)\\s+(?:\\w+\\s+){0,2}?${APPROX}${NR}\\s*-?\\s*${U}\\s*-?\\s*(?:long\\s+|tall\\s+|high\\s+)?(?:\\w+\\s+){0,2}?${NOUN}\\b`, "gi"),
  new RegExp(`^\\s*${APPROX}${NR}\\s*${U}\\s+(?:long|tall|high|of\\s+(?:climbing|ice|rock))\\b`, "gi"),
  new RegExp(`\\b(?:route|climb|line|it)\\s+(?:is|runs|climbs|goes|covers|totals|measures)\\s+${APPROX}${NR}\\s*${U}`, "gi"),
  new RegExp(`\\b${NR}\\s*${U}\\s+(?:in\\s+total|total|overall)\\b`, "gi"),
];
const L_PRE_BAD = /\b(rope|rappel|rap|approach|hike|walk|trail|first|last|lower|upper|top|bottom|final|opening|initial|another|second|third|crux|extra|start|next)\b[^.]{0,20}$/i;
const L_PITCH_TOTAL = /\b(P\d|pitch(es)?\s*\d|pitches?\s+\d\s*-\s*\d)[^.]{0,15}$/i;
const toM = (v, u) => /^(ft|feet|foot|')$/i.test(u) ? v / 3.28084 : v;

export function lengthClaims(t) {
  const out = [];
  L_RES.forEach((re, i) => { for (const m of t.matchAll(re)) {
    const d = m[0].search(/\d/);
    if (L_PRE_BAD.test(t.slice(Math.max(0, m.index - 30), m.index + d))) continue;
    if (i === 3 && L_PITCH_TOTAL.test(t.slice(Math.max(0, m.index - 20), m.index))) continue;
    const a = Number(m[1].replace(/,/g, "")), b = m[2] ? Number(m[2].replace(/,/g, "")) : a;
    const lo = toM(Math.min(a, b), m[3]), hi = toM(Math.max(a, b), m[3]);
    if (lo < 5 || hi > 3000) continue;
    out.push({ lo, hi, at: m.index, text: m[0].trim(), perPitch: /\b(pitch|lead)\b/i.test(m[0]) });
  } });
  return out;
}

// READ: findings a person read and researched and found NOT to be a contradiction (the prose
// number describes a section, an extension or another line). Keyed `id:kind`; a reason is required.
// They still print, as READ, so a later edit that makes one real is not hidden — they just do not count.
const READ = {
  // all read and researched 2026-10-24
  "ak_6th_tower_accidental_alpinism:pitches": "seven pitches, two of them ridge scrambling: five roped, as stored",
  "ak_godwin_creek_cosmic_debris:length": "80 m is the easy ice shared with the neighbouring route, to the first belay",
  "ak_godwin_creek_varcolaci:pitches": "two pitches is the mixed extension; the 550 ft apron below makes the whole line five",
  "ak_southwest_buttress:pitches": "six pitches is the opening section of a 20-pitch, 2000 ft route",
  "bc_slesse_mountain_navigator_wall:pitches": "seven pitches is the neighbouring East Pillar spur",
  "bc_slesse_mountain_north_east_headwall_variation:pitches": "six pitches is the detour; the stats are the whole line",
  "bc_stonerabbit_peak_wubble_wabbit_a_wete:pitches": "five pitches to the crest, then the crest itself: 20 in all",
  "ca_wedge_the_2_hex:pitches": "\"two pitches possible\" is an option; one 21 m pitch",
  "co_cataract_gulch_2_no_fight_left:pitches": "the two-pitch figure is an older listing the prose quotes",
  "co_regency_the_south_side:length": "150 ft is the main slab; the route is longer",
  "ut_cataract_gorge_ice_good_enough_for_who_it_s_for:length": "20 ft is the opening ice step; the mixed ledges follow",
  "wa_inner_constance_seans_route:pitches": "three pitches is the crack system; six in pitch_detail",
  "wa_magic_mountain_south_ridge:length": "1,000 ft is heather and scree gained from camp, not the scramble section",
  "wa_sharkfin_tower_southeast_ridge:pitches": "the two-pitch line is the separate Southeast Face",
  "wa_spontaneity_arete:pitches": "six pitches plus an optional seventh, as stored",
  "wa_the_perfect_crime_with_variations:pitches": "five pitches, six counting the P2.5 link, as stored",};

const pdSum = r => Array.isArray(r.pitch_detail) ? r.pitch_detail.reduce((a, p) => a + (Number(p && (p.length_m ?? p.lengthM)) || 0), 0) : 0;
// What the Overview tile shows: length_m, else the pitch breakdown summed (RouteDetail climbLenRaw).
export const shownLengthM = r => r.length_m || pdSum(r) || 0;

export function classify(r) {
  const t = r.overview || "";
  const found = [];
  const pc = pitchClaims(t);
  if (pc.length) {
    const p = r.pitches || 0;
    if (!pc.some(c => p >= c.lo && p <= c.hi)) found.push({ kind: "pitches", verdict: p ? "MISMATCH" : "MISSING", stored: p || null, claims: pc });
  }
  let lc = lengthClaims(t);
  if ((r.pitches || 0) > 1) lc = lc.filter(c => !c.perPitch);
  if (lc.length) {
    const L = shownLengthM(r);
    if (!lc.some(c => L >= c.lo * 0.8 - 3 && L <= c.hi * 1.25 + 3)) found.push({ kind: "length", verdict: L ? "MISMATCH" : "MISSING", stored: L ? Math.round(L) : null, claims: lc });
  }
  return found;
}

function selftest() {
  const cases = [
    // [overview, pitches, length_m, expected verdicts]
    ["Four pitches, 120m in total. First: 45m, WI3.", 2, 49, ["pitches:MISMATCH", "length:MISMATCH"]],
    ["A 55 m pillar climbed by laybacking deep finger cracks.", 1, 30, ["length:MISMATCH"]],
    ["Two pitches of 5.7 on the regular route reach the ledge.", 5, 200, []],          // a section
    ["Six pitches: 30 m of thin ice; 35 m up a gully.", 6, 200, []],                     // agrees
    ["Follow the ramp to a 40 ft pillar, typically harder than it looks.", 4, 168, []], // a feature
    ["P3-4, 70m total: WI2-3.", 5, 274, []],                                            // two pitches' total
    ["A two-pitch route. Pitch 1 (5.5, 90') has a bolt.", 0, null, ["pitches:MISSING"]],
    ["One pitch leads to an open book.", 3, 137, []],
    ["A 150 ft slab of clean rock.", 1, 46, []],
  ];
  let bad = 0;
  for (const [overview, pitches, length_m, want] of cases) {
    const got = classify({ overview, pitches, length_m }).map(f => `${f.kind}:${f.verdict}`);
    const ok = JSON.stringify(got) === JSON.stringify(want);
    if (!ok) bad++;
    console.log(`${ok ? "ok  " : "FAIL"} ${JSON.stringify(got)} ← ${overview.slice(0, 60)}`);
  }
  console.log(bad ? `FAIL: ${bad} of ${cases.length} cases` : `selftest: ${cases.length}/${cases.length}`);
  process.exit(bad ? 1 : 0);
}

if (process.argv.includes("--selftest")) selftest();

const rows = FIXTURE ? JSON.parse(readFileSync(FIXTURE, "utf8"))
  : await selectAll("routes", "id,name,area_id,discipline,length_m,pitches,overview,pitch_detail",
      `overview=not.is.null${STATE ? `&id=like.${STATE}_*` : ""}`, { key: requireServiceKey(), pageSize: 500 });
if (!rows.length) { console.error("FAIL: zero routes read — a broken scan, not a clean catalog."); process.exit(1); }

const findings = [];
const tally = { pitches: { MISMATCH: 0, MISSING: 0 }, length: { MISMATCH: 0, MISSING: 0 } };
const read = [];
for (const r of rows) for (const f of classify(r)) {
  if (READ[`${r.id}:${f.kind}`]) { read.push(`${r.id}:${f.kind}`); continue; }
  tally[f.kind][f.verdict]++;
  findings.push({ id: r.id, name: r.name, discipline: r.discipline, pitches: r.pitches, length_m: r.length_m, ...f,
    context: f.claims.map(c => r.overview.slice(Math.max(0, c.at - 30), c.at + c.text.length + 60).replace(/\s+/g, " ")) });
}

if (JSON_OUT) { console.log(JSON.stringify(findings, null, 1)); process.exit(0); }
console.log(`audit:prose-length — ${rows.length} routes with a description${STATE ? ` (${STATE})` : ""}`);
console.log(`  pitches: ${tally.pitches.MISMATCH} contradict the stats, ${tally.pitches.MISSING} stated where the stats show none`);
console.log(`  length:  ${tally.length.MISMATCH} contradict the stats, ${tally.length.MISSING} stated where the stats show none`);
console.log(`  ${read.length} read and found not to contradict (READ in this file)`);
for (const k of Object.keys(READ)) if (!read.includes(k) && !STATE && !FIXTURE) console.log(`  stale READ entry, no longer flagged: ${k} — remove it`);
for (const f of findings.filter(f => f.verdict === "MISMATCH" || SHOW_MISSING)) {
  const claim = f.claims.map(c => f.kind === "length" ? `${Math.round(c.lo)}${c.hi !== c.lo ? "-" + Math.round(c.hi) : ""} m` : `${c.lo}${c.hi !== c.lo ? "-" + c.hi : ""}`).join(" / ");
  console.log(`\n${f.verdict} ${f.kind}  ${f.id}  [${f.discipline}]  stats=${f.stored ?? "none"}${f.kind === "length" ? " m" : ""}  prose=${claim}`);
  for (const c of f.context) console.log(`    “…${c}…”`);
}
