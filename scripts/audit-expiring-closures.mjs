#!/usr/bin/env node
// Does a route state a closure that has a SHELF LIFE — a fact the world will resolve, in a field
// nothing ever re-reads?
//
// `road.status`, `road.seasonalGate`, `road.driveNote`, `access.closures` and `access.seasonal` all
// render on the route page, and all hold free prose written once by an enrichment pass. Nothing in
// the app or in any guard ever re-checks them against the world. So a closure written there is
// correct on the day and a LIE afterwards, with no symptom whatsoever: the column is populated, the
// section renders, and every coverage check stays green.
//
// The case that produced the rule: `wa_mount_hopper_standard` said "Closed indefinitely since
// October 2025 due to Bear Gulch Fire damage; no confirmed 2026 reopening as of the most recent NPS
// update." FS-24 and the Staircase area reopened 8 July 2026. A climber reading it a year on is
// told the road is shut when it is open — and that is the direction that sends somebody to a
// different mountain, or to drive around a gate that is not there.
//
// THE PRECISION RULE, and without it this audit is noise: a YEAR IS NOT A SHELF LIFE. 619 of the
// 5,610 WA values carry a year and most of them are naming a durable CAUSE — "impassable at
// milepost 3.1 due to 2021 flood damage" stays true until somebody repairs it, and the year is what
// makes it informative rather than vague. What expires is a claim about the CURRENT state with no
// date the reader can judge it by. So this flags the claim shape, never the year.
//
// Two exclusions, both measured rather than assumed, and both PRINTED rather than silently dropped:
//   SELF-LIMITING — the value names an explicit end date ("through Dec 31, 2027"), so a reader can
//     see for themselves whether it has run out. Still worth re-checking; not a defect.
//   PERMANENT — "no funded replacement", "decommissioned". A permanently closed bridge is a durable
//     fact and is exactly what these fields are FOR.
//
// REPORT-ONLY, and it must stay that way. It cannot know the state of a road; it can only say which
// claims have an expiry date attached to them somewhere outside the database. The exit code says
// "things to look at", never "these are bugs". Two things make a bulk rewrite actively dangerous
// here, both learned from the Staircase repair:
//   - THE ROAD IS NOT THE APPROACH. Staircase's road reopened while the North Fork Skokomish trail
//     out of it stayed closed. Clearing the road claim without reading the rest would have deleted
//     a warning that still mattered.
//   - a report-only sibling (`audit:trailhead-agreement`) refuses to pick a winner between two
//     disagreeing rows for the same reason, and had it picked, it would have picked wrong here.
//
// Read-only, anon key. NOT a build gate — this is a property of the database, not the checkout, so
// no code change can cause or fix it and failing `npm run build` would block PRs whose author
// cannot affect it. Same reasoning as check:counts and audit:trailhead-agreement.
import { selectAll } from "./lib/supabase-env.mjs";

const args = process.argv.slice(2);
const flag = n => { const i = args.indexOf("--" + n); if (i >= 0 && args[i + 1] && !args[i + 1].startsWith("--")) return args[i + 1]; const eq = args.find(a => a.startsWith("--" + n + "=")); return eq ? eq.slice(n.length + 3) : null; };
const INJECT = flag("inject");
const STATE = flag("state") || "wa";
const FULL = args.includes("--full");
/* --json exists so nothing has to RE-DERIVE this classification. A grouping pass over the same
   backlog wrote its own shelf-life needle, and being looser than these tiers it reported ~20 routes
   in the Suiattle corridor where this audit reports ONE — a worklist inflated by a second classifier
   nobody was comparing against. Same shape as the four grade parsers.
   NOTE: this file ends on `process.exitCode`, never `process.exit()`. Do not "tidy" that — on a PIPE
   an explicit exit truncates stdout mid-write, which reads as a script that emits broken JSON. */
const JSON_OUT = args.includes("--json");
const say = (...a) => { if (!JSON_OUT) console.log(...a); };

// Every rendered prose field that can carry a closure. `access.notes` and `access.closureNote` are
// included because a closure lands in them often enough to matter — 197 of the marked WA values.
const FIELDS = [["road", "status"], ["road", "seasonalGate"], ["road", "driveNote"],
                ["access", "closures"], ["access", "seasonal"], ["access", "notes"], ["access", "closureNote"]];

// T1. The copy dates itself to when the RESEARCHER looked, not to anything the reader can check.
// It is the worst of the three because it is simultaneously the least useful phrasing and the ONLY
// freshness signal the value carries — so the repair is to date it or drop the claim, never to
// delete the phrase and leave a bare assertion behind.
const RESEARCH_ACT = /as of (this|the most recent|the latest|my|our)\s*(writing|research|update|check|report|reports|available|information|pass)|at the time of (writing|research)|as of this research/i;

// T2. An open-ended closure. The world resolves this one and nothing here notices. The Hopper shape.
const OPEN_ENDED = /indefinitel|until further notice|no (confirmed |announced |published |estimated |reopening )?(re)?open(ing)? (date|estimate)|no reopening|no estimated (repair|reopening)|still closed|remains? closed/i;

// T3. Dated to a period rather than a date. "As of mid-2026" tells a reader nothing about whether
// it has expired unless they know when it was written, and nothing on screen says.
const AS_OF_PERIOD = /\bas of (early|mid|late)?[- ]?20\d\d\b|\bas of the 20\d\d season\b|\bcurrently\b|\bat present\b|\bat this time\b/i;

// SELF_LIMITING must catch the way a closure order actually STATES its own expiry, which is a date
// RANGE as often as a "through" clause — "effective May 20-Dec 31, 2026", "April 2, 2026 - January
// 1, 2028". A first draft matched only "through/until/expires" and reported four orders that name
// their own end date as though they named none.
const SELF_LIMITING = /through (at least )?[a-z]{0,9}\.?\s*\d{0,2},?\s*20\d\d|expires? [^.]*20\d\d|until [a-z]+ \d{1,2},? 20\d\d|\b(?:effective\s+)?[a-z]{3,9}\.?\s*\d{1,2}(?:,?\s*20\d\d)?\s*[-–—]\s*[a-z]{3,9}\.?\s*\d{1,2},?\s*20\d\d|\b\d{1,2}\/\d{1,2}\/20\d\d\s*(?:through|[-–—])\s*(?:at least\s*)?\d{1,2}\/\d{1,2}\/20\d\d/i;
const PERMANENT = /permanentl|decommission|no funded|will not be (re)?built|abandoned/i;

// T0. THE CLAIM HAS ALREADY EXPIRED — the sharpest tier, and the one SELF_LIMITING was hiding.
// That exclusion waves a value through the moment it names an end date, on the reasoning that the
// reader can judge it. THAT IS A CLAIM ABOUT THE DATES AND NOTHING HAD EVER TESTED IT: a value
// reading "in effect through at least Dec 31, 2025" is self-limiting AND, today, describes an
// order that lapsed months ago. CLAUDE.md's own command block already promised this question was
// asked. It was not.
//
// THE PRECISION RULE IS POSITIVE, DELIBERATELY. A date in the past is not an expired claim: most
// dated prose here is a past-tense EVENT report ("a washout was reported in January 2026") or a
// historical example ("as demonstrated by the ~17-month Dec 2024-May 2026 closure"), both of which
// stay true forever. The tempting rule is a deny-list of history markers — was/had/e.g./since
// rescinded — and this repo records that a deny-list is beaten by one more adjective. Asking
// instead whether the value asserts the closure is IN FORCE needs no vocabulary of history.
// Measured on the live catalog: 16 values name a lapsed end date, and this rule reports 2.
const ONGOING = /\bin effect through\b|\bremains? (?:closed|in effect|active)\b|\bis (?:currently )?closed\b|\bcurrently closed\b|\bclosed until further notice\b|^\s*closed\b/i;
// A value that names its end AND then says the order outlived it has ANSWERED the question itself.
// Not a history adjective — the value explicitly addressing its own expiry.
const SELF_ANSWERED = /\bstill (?:active|in effect|closed)\b|\bhas been extended\b|\bsince extended\b/i;

const MON = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
const MRE = "(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\.?";
// A day-less month is taken as its LAST day, so a month still running never reads as expired.
function monthDate(s) {
  const m = s.match(new RegExp(`(${MRE})\\s*(\\d{1,2})?[,\\s]*\\s*(20\\d\\d)`, "i"));
  if (!m) return null;
  const mo = MON[m[1].slice(0, 3).toLowerCase()];
  if (mo == null) return null;
  const y = Number(m[3]), d = m[2] ? Number(m[2]) : null;
  return { when: d != null ? new Date(y, mo, d) : new Date(y, mo + 1, 0), txt: m[0].trim() };
}
// Only a date a CLAUSE marks as an END counts. A bare date in the prose is a cause, not an expiry.
function statedEnds(t) {
  const out = [];
  for (const m of t.matchAll(new RegExp(`${MRE}\\s*\\d{0,2},?\\s*(?:20\\d\\d)?\\s*[-\u2013\u2014]\\s*(${MRE}\\s*\\d{0,2},?\\s*20\\d\\d)`, "gi"))) {
    const d = monthDate(m[1]); if (d) out.push(d);
  }
  for (const m of t.matchAll(new RegExp(`\\b(?:through|until|thru|expires?)\\s+(?:at least\\s+)?(${MRE}\\s*\\d{0,2},?\\s*20\\d\\d)`, "gi"))) {
    const d = monthDate(m[1]); if (d) out.push(d);
  }
  for (const m of t.matchAll(/\b\d{1,2}\/\d{1,2}\/20\d\d\s*(?:through|[-\u2013\u2014])\s*(?:at least\s*)?(\d{1,2})\/(\d{1,2})\/(20\d\d)/g)) {
    out.push({ when: new Date(Number(m[3]), Number(m[1]) - 1, Number(m[2])), txt: m[0].trim() });
  }
  return out;
}
const TODAY = new Date();
function expiredClaim(t) {
  if (!ONGOING.test(t.trim()) || SELF_ANSWERED.test(t)) return null;
  const ends = statedEnds(t);
  if (!ends.length) return null;
  // The LATEST stated end decides. An earlier one being past says nothing about the claim.
  const last = ends.reduce((a, b) => (b.when > a.when ? b : a));
  return last.when < TODAY ? last : null;
}

const TIERS = [
  /* Ordered by severity, and t0 is FIRST because it is the only tier describing a statement that
     is false NOW rather than one that will age into falsehood. `shelfLife:false` keeps the
     SELF_LIMITING / PERMANENT exclusions off it — SELF_LIMITING is precisely what was hiding it. */
  { key: "expired", fn: expiredClaim, shelfLife: false, title: "the claim has ALREADY EXPIRED — it asserts a closure past its own stated end date" },
  { key: "research-act", re: RESEARCH_ACT, title: "dates itself to when the RESEARCHER looked" },
  { key: "open-ended",   re: OPEN_ENDED,   title: "an OPEN-ENDED closure — the world resolves it, nothing here re-reads it" },
  { key: "as-of-period", re: AS_OF_PERIOD, title: "dated to a PERIOD, not a date the reader can judge" },
];

const rows = await selectAll("routes", "id,name,area_id,road,access",
  `id=like.${STATE}_*&or=(road.not.is.null,access.not.is.null)`, { pageSize: 1000 });
if (!rows.length) { console.error(`FAIL — read 0 ${STATE} routes. Refusing to report a clean result about data this never saw.`); process.exit(1); }

const values = [];
for (const r of rows) for (const [col, key] of FIELDS) {
  const v = r[col] && typeof r[col] === "object" ? r[col][key] : null;
  // roadName rides along for --json consumers: a closure is grouped by the ROAD, and a driveNote
  // often names the destination rather than the road it runs on.
  if (typeof v === "string" && v.trim()) values.push({ id: r.id, name: r.name, area: r.area_id, field: `${col}.${key}`, text: v.replace(/\s+/g, " ").trim(), roadName: (r.road && typeof r.road === "object" && typeof r.road.name === "string") ? r.road.name.replace(/\s+/g, " ").trim() : null });
}
if (!values.length) { console.error(`FAIL — ${rows.length} ${STATE} routes carry road/access, and 0 carry any prose in them. Every test below would be vacuous.`); process.exit(1); }

if (INJECT === "expiring") { values[0].text = "Closed indefinitely since October 2025 due to fire damage; no confirmed 2026 reopening as of the most recent update."; console.log(`[inject] ${values[0].id} ${values[0].field}: the Hopper sentence verbatim`); }
if (INJECT === "clean") { for (const v of values) v.text = "Paved to the trailhead. Gate opens as snow clears."; console.log("[inject] every value rewritten as a durable statement; every tier must report 0"); }
if (INJECT === "yearonly") { for (const v of values) v.text = "Impassable to vehicles at milepost 3.1 due to 2021 flood damage."; console.log("[inject] every value carries a YEAR naming a durable cause; every tier must report 0 — a year is not a shelf life"); }
/* The expired tier's three cases. The two that must stay SILENT carry it: an always-fire rule
   satisfied `expired` on its own, and it is the quiet pair that pins the precision. */
if (INJECT === "expired") { for (const v of values) v.text = "Closed MP 3.7 to end per Forest Order (flood damage; in effect through at least Dec 31, 2020)."; console.log("[inject] every value asserts an ONGOING closure past its own stated end -> the expired tier must report all of them"); }
if (INJECT === "expiredanswered") { for (const v of values) v.text = "Closed MP 3.7 to end per Forest Order (in effect through at least Dec 31, 2020, and still active per the latest alerts)."; console.log("[inject] the same value, but it ANSWERS its own expiry -> expired must report 0"); }
if (INJECT === "pastreport") { for (const v of values) v.text = "The road was closed for culvert replacement July 9-Sept 22, 2020, and has since reopened."; console.log("[inject] a PAST-TENSE report naming a lapsed range -> expired must report 0; a date in the past is not an expired claim"); }

const seen = new Set(), buckets = new Map(TIERS.map(t => [t.key, []]));
let selfLimiting = 0, permanent = 0;
for (const v of values) {
  for (const t of TIERS) {
    const hit = t.fn ? t.fn(v.text) : (t.re.test(v.text) ? true : null);
    if (!hit) continue;
    if (hit !== true) v.expiredOn = hit.txt;
    const k = v.id + "\0" + v.field;
    if (seen.has(k)) break;              // tiers are exclusive and ordered by severity
    seen.add(k);
    // The exclusions are about SHELF LIFE, so they do not apply to t1: a value that leaks the
    // research act is bad copy whether or not the closure it describes names an end date.
    if (t.key !== "research-act" && t.shelfLife !== false) {
      if (PERMANENT.test(v.text)) { permanent++; break; }
      if (SELF_LIMITING.test(v.text)) { selfLimiting++; break; }
    }
    buckets.get(t.key).push(v);
    break;
  }
}

const flagged = TIERS.reduce((n, t) => n + buckets.get(t.key).length, 0);
const routes = new Set(TIERS.flatMap(t => buckets.get(t.key)).map(v => v.id));
say(`${rows.length} ${STATE} routes carry a road/access object; ${values.length} prose values across ${FIELDS.length} rendered fields.`);
say(`${flagged} value(s) on ${routes.size} route(s) state something with a shelf life.`);
say(`excluded, and NOT silently: ${selfLimiting} name an explicit end date, ${permanent} describe a permanent closure.\n`);

for (const t of TIERS) {
  const hits = buckets.get(t.key);
  say(`── ${t.key.toUpperCase()} — ${t.title}: ${hits.length} value(s) on ${new Set(hits.map(h => h.id)).size} route(s)`);
  const show = FULL ? hits : hits.slice(0, 8);
  for (const h of show) say(`   ${h.id}  ${h.field}\n      ${h.text.slice(0, FULL ? 400 : 190)}${h.text.length > (FULL ? 400 : 190) ? "…" : ""}`);
  if (!FULL && hits.length > show.length) say(`   … ${hits.length - show.length} more (pass --full)`);
  say("");
}

if (flagged) {
  say("These are CANDIDATES, not findings, and a bulk rewrite would do damage:");
  say("  - THE ROAD IS NOT THE APPROACH. Staircase's road reopened while the trail out of it stayed shut;");
  say("    clearing the road claim without reading the rest deletes a warning that still applies.");
  say("  - the phrase carrying the expiry is usually the only freshness signal the value has, so date it");
  say("    or drop the claim — deleting the phrase alone leaves a bare assertion that ages worse.");
  say("  - and do not replace one with a closure that is true TODAY. That reproduces the defect.");
}

if (JSON_OUT) {
  /* The whole point is that a consumer gets THIS classification rather than approximating it, so a
     payload that silently lost the tiering would be worse than no mode at all — it would look like
     a clean backlog. Refuse rather than emit one. */
  const out = TIERS.flatMap(t => buckets.get(t.key).map(h =>
    ({ id: h.id, name: h.name, tier: t.key, field: h.field, text: h.text, roadName: h.roadName || null })));
  if (out.length !== flagged) { console.error(`FAIL — serialised ${out.length} of ${flagged} flagged values`); process.exitCode = 1; }
  else console.log(JSON.stringify({ state: STATE, routes: rows.length, values: values.length, flagged, findings: out }, null, 1));
}
process.exitCode = process.exitCode || 0;

// Injection-tested:
//   --inject=expiring   the Hopper sentence on the first value  -> must appear under research-act
//   --inject=clean      every value made durable                -> every tier must report 0
//   --inject=yearonly   every value carries a year naming a cause -> every tier must report 0,
//                       which is the precision rule: a year is not a shelf life, and a detector
//                       that flagged one would return most of the catalog and be ignored.
//   --inject=expired    every value asserts an ongoing closure past its stated end -> ALL reported
//   --inject=expiredanswered  the same value, self-answered ("still active")   -> expired reports 0
//   --inject=pastreport a past-tense report naming a lapsed range              -> expired reports 0
// The last two are the ones that matter. `expired` alone is satisfied by a rule that fires on any
// past date, and that rule returns 16 values here of which 15 are correct past-tense prose. Only
// the quiet pair pins the difference between "names an old date" and "asserts something untrue".
//
// Re-run all six after touching the output path. --json routes every report line through say(), so
// a mistake there is silent on stdout and invisible in the exit code; the cases are what notice.
// Verified after adding --json: clean 0/0/0/0, yearonly 0/0/0/0, expiredanswered 0, pastreport 0,
// expired 5609, expiring 1 under research-act.
