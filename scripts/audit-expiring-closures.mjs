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

const TIERS = [
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
  if (typeof v === "string" && v.trim()) values.push({ id: r.id, name: r.name, area: r.area_id, field: `${col}.${key}`, text: v.replace(/\s+/g, " ").trim() });
}
if (!values.length) { console.error(`FAIL — ${rows.length} ${STATE} routes carry road/access, and 0 carry any prose in them. Every test below would be vacuous.`); process.exit(1); }

if (INJECT === "expiring") { values[0].text = "Closed indefinitely since October 2025 due to fire damage; no confirmed 2026 reopening as of the most recent update."; console.log(`[inject] ${values[0].id} ${values[0].field}: the Hopper sentence verbatim`); }
if (INJECT === "clean") { for (const v of values) v.text = "Paved to the trailhead. Gate opens as snow clears."; console.log("[inject] every value rewritten as a durable statement; every tier must report 0"); }
if (INJECT === "yearonly") { for (const v of values) v.text = "Impassable to vehicles at milepost 3.1 due to 2021 flood damage."; console.log("[inject] every value carries a YEAR naming a durable cause; every tier must report 0 — a year is not a shelf life"); }

const seen = new Set(), buckets = new Map(TIERS.map(t => [t.key, []]));
let selfLimiting = 0, permanent = 0;
for (const v of values) {
  for (const t of TIERS) {
    if (!t.re.test(v.text)) continue;
    const k = v.id + "\0" + v.field;
    if (seen.has(k)) break;              // tiers are exclusive and ordered by severity
    seen.add(k);
    // The exclusions are about SHELF LIFE, so they do not apply to t1: a value that leaks the
    // research act is bad copy whether or not the closure it describes names an end date.
    if (t.key !== "research-act") {
      if (PERMANENT.test(v.text)) { permanent++; break; }
      if (SELF_LIMITING.test(v.text)) { selfLimiting++; break; }
    }
    buckets.get(t.key).push(v);
    break;
  }
}

const flagged = TIERS.reduce((n, t) => n + buckets.get(t.key).length, 0);
const routes = new Set(TIERS.flatMap(t => buckets.get(t.key)).map(v => v.id));
console.log(`${rows.length} ${STATE} routes carry a road/access object; ${values.length} prose values across ${FIELDS.length} rendered fields.`);
console.log(`${flagged} value(s) on ${routes.size} route(s) state something with a shelf life.`);
console.log(`excluded, and NOT silently: ${selfLimiting} name an explicit end date, ${permanent} describe a permanent closure.\n`);

for (const t of TIERS) {
  const hits = buckets.get(t.key);
  console.log(`── ${t.key.toUpperCase()} — ${t.title}: ${hits.length} value(s) on ${new Set(hits.map(h => h.id)).size} route(s)`);
  const show = FULL ? hits : hits.slice(0, 8);
  for (const h of show) console.log(`   ${h.id}  ${h.field}\n      ${h.text.slice(0, FULL ? 400 : 190)}${h.text.length > (FULL ? 400 : 190) ? "…" : ""}`);
  if (!FULL && hits.length > show.length) console.log(`   … ${hits.length - show.length} more (pass --full)`);
  console.log("");
}

if (flagged) {
  console.log("These are CANDIDATES, not findings, and a bulk rewrite would do damage:");
  console.log("  - THE ROAD IS NOT THE APPROACH. Staircase's road reopened while the trail out of it stayed shut;");
  console.log("    clearing the road claim without reading the rest deletes a warning that still applies.");
  console.log("  - the phrase carrying the expiry is usually the only freshness signal the value has, so date it");
  console.log("    or drop the claim — deleting the phrase alone leaves a bare assertion that ages worse.");
  console.log("  - and do not replace one with a closure that is true TODAY. That reproduces the defect.");
}
process.exitCode = 0;

// Injection-tested:
//   --inject=expiring   the Hopper sentence on the first value  -> must appear under research-act
//   --inject=clean      every value made durable                -> every tier must report 0
//   --inject=yearonly   every value carries a year naming a cause -> every tier must report 0,
//                       which is the precision rule: a year is not a shelf life, and a detector
//                       that flagged one would return most of the catalog and be ignored.
