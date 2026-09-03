#!/usr/bin/env node
// Does the prose that renders on a route page still name a third party as the SOURCE of a claim?
//
// The standing rule is no sources anywhere in the app. `check:no-rendered-sources` enforces it for
// app FIELDS named `source` and is structurally blind to this: these citations are free prose
// inside jsonb columns, so every identifier is bound, every column is populated, and the section
// renders. Only reading the value finds them.
//
// The class was measured once for `waypoints[].note` (60 WA notes; 6 redacted, 54 still needing a
// rewrite) and NOBODY HAD EVER LOOKED AT `road.*` / `access.*` — the same defect, different
// columns, which is the shape this repo keeps repeating (four grade parsers, two climb_logs
// hydrations, three waypoint audits). That sweep found 33 and repaired 32.
//
// THE PRECISION RULE, and without it this audit is actively destructive: A LIVE REFERENCE IS NOT A
// CITATION. 585 values on 416 WA routes carry a land-manager alert page or a ranger-district phone
// number — `fs.usda.gov/…/alerts`, `nps.gov`, `(509) 548-2550`. Those are not claims about where
// our data came from; they are the live thing a climber is being told to go and check, and they are
// often the only actionable line in the value. Naming the AGENCY that issues a permit or closes a
// road is operational too. A pattern that flags "names a third party" reports all 585 and whoever
// works the list down deletes 585 phone numbers.
//
// Two exclusions, both MEASURED against real output rather than assumed, and both reported as stale
// if they stop matching:
//   - a source-like word inside a ROUTE NAME. `wa_nooksack_tower_south_face` says "Same access as
//     the East Ridge/Beckey Route" — a route name, not a citation. A bare /Beckey/ flagged it.
//   - an organisation named as an ACTOR. `wa_wolframite_mountain_scramble` names three associations
//     as the volunteers who MAINTAIN the Tungsten Mine site. That is content.
//
// And the honest limit, stated because a count here reads as a total and is not one: THIS IS A
// DENY-LIST AND ONE MORE NAME BEATS IT. The Lichtenberg fee prose cited `WenatcheeOutdoors`, which
// no pattern here matched; it was found by reading. Treat the number as a floor and re-scan with a
// different pattern before calling the class closed.
//
// REPORT-ONLY. The repair is a rewrite, not a deletion — the citation is usually welded into a
// sentence that also carries the road, the mileage or the fact, and sentence deletion writes
// gibberish onto route pages. Read-only, anon key, fails closed on an empty read. NOT a build gate:
// a property of the DB, not the checkout, so no code change can cause or fix it.
import { selectAll } from "./lib/supabase-env.mjs";

const args = process.argv.slice(2);
const flag = n => { const i = args.indexOf("--" + n); if (i >= 0 && args[i + 1] && !args[i + 1].startsWith("--")) return args[i + 1]; const eq = args.find(a => a.startsWith("--" + n + "=")); return eq ? eq.slice(n.length + 3) : null; };
const STATE = flag("state") || "wa";
const INJECT = flag("inject");
const FULL = args.includes("--full");

const ROAD_ACCESS = [["road", "status"], ["road", "seasonalGate"], ["road", "driveNote"], ["road", "name"],
                     ["access", "closures"], ["access", "seasonal"], ["access", "notes"], ["access", "rules"],
                     ["access", "closureNote"], ["access", "permit"], ["access", "fees"], ["access", "parking_pass"]];

// A named third-party publisher. `Beckey` needs a guide word beside it — on its own it is a route
// name here far more often than a citation.
// `Peakbagger` is a website; `peakbagger`/`peakbaggers`/`peakbagging` is the ordinary English
// word for a kind of climber - "a known peakbagger objective", "Bulger-list peakbaggers pairing
// it with the summit", "occasional peakbagger visits mid-July through August". Those cite nobody.
// The site is CAPITALISED AND SINGULAR (`Peakbagger`, `Peakbagger's`), so every other form is
// blanked before matching. Measured 2026-09-02: 15 of 300 flagged leaves in WA were reachable
// ONLY through the common noun, and a sweep on them would have deleted true prose about who
// climbs a peak. Exactly the `Source Lake` / "water source" exclusion below, one word over.
const COMMON_NOUN = /\bpeakbaggers\b|\bpeakbagger\b|\bPeakbaggers\b|\bpeakbagging\b|\bPeakbagging\b/g;
const deCommonNoun = (t) => t.replace(COMMON_NOUN, (m) => "x".repeat(m.length));

// FOUR FAMILIES WERE MISSING, AND THE SWEEP WAS DECLARED CLOSED WITHOUT THEM. This list is a
// DENY-LIST, and its own note two paragraphs down already says the count is a FLOOR and to
// "re-scan with a different pattern before calling the class closed". That was not done: #1480
// reported "the publisher half is closed, 1 masthead left" measured with THIS regex, which is
// circular — a deny-list cannot audit itself. Scanning for shapes it does not list found, in WA:
//
//     AAJ / American Alpine Journal          18 values
//     "The Mountaineers" (only Mountaineers.org was listed)  29
//     Climber's Guide to the Olympic Mountains               7
//     a literal "Source:" prefix                              1
//
// The last one is the sharpest: wa_mount_steel_standard's `face` reads "West (the standard line
// climbs the amphitheater on the west side of the peak). SOURCE: Climbers Guide to the Olympic
// Mountains route description, consistent with the route's own aspect field." A rendered field
// that names its source with the word "Source:" AND then names a database column.
//
// TWO CANDIDATES WERE MEASURED AND DELIBERATELY LEFT OUT. "Fifty Classic Climbs" is a LIST THIS
// APP ITSELF RENDERS (`fifty_classics`, and its own copy names the book), so a route saying it is
// on that list is stating a fact about the route, not citing a source. "Selected Climbs" matches
// ZERO values in WA - a detector for a class of nothing.
//
// "THE MOUNTAINEERS" IS OFTEN AN OPERATOR, NOT A PUBLISHER, and this file already states that
// rule for clubs: "especially when The Mountaineers or other clubs run scheduled trips" is a fact
// about who climbs a peak. But "The Mountaineers route page: 'Descend by rappelling and
// downclimbing the route'" is a citation. Same word, both kinds, so this stays a READING LIST -
// which is what this audit is - and must not be swept on the pattern alone.
const NAMED = /\bWTA\b|Washington Trails Association|AllTrails|SummitPost|Peakbagger|Mountain ?Project|Wikipedia|CalTopo|\bGaia\b|Mountaineers\.org|\bThe Mountaineers\b|WenatcheeOutdoors|\bAAJ\b|American Alpine Journal|\bAAC\b|American Alpine Club|Climber'?s Guide|Cascade Alpine Guide|Cascade ?Climbers|NWHikers|TrailCatJim|SuperTopo|SpokAlpine|SkiSickness|Steph ?Abegg|Beckey(?:'s)?\s+(?:guide|guidebook)|\bguidebooks?\b|trip[- ]report aggregator|OpenStreetMap|Google (?:Maps|Earth)/i;
// The act of sourcing, even when the publisher is unnamed.
// The act of sourcing, even when the publisher is unnamed. THE WORD "SOURCE" ON ITS OWN IS USELESS
// HERE: waypoint notes say "reliable water source" and "Source Lake" (a real place in the Alpental
// valley) — a broad /source/i returns 45 WA notes of which 44 are water and place names. A
// citation is a COUNTED or QUALIFIED plural ("multiple sources") or sources doing something
// ("sources describe"). That distinction takes the waypoint-note count from 45 to 1.
// A SOURCE THAT DISAGREES, OR FAILS TO SAY, IS STILL A CITATION — and the list above covered only
// sources ASSERTING. Every verb in it (describe/state/report/say/agree/list/indicate/confirm) is a
// source making a claim, so the whole other half of how this catalog talks about its own
// provenance was invisible: "Sources differ on the elevation", "depending on the source", "no
// source gives exact sizes", "not stated in source", "the source doesn't give an exact figure".
// Those are the dominant shape once you look outside road/access.
//
// They are safe to add BECAUSE THEY ARE INFORMATIONAL VERBS. The water-source trap this comment
// already warns about does not reach them: a creek can BE a source and can be seasonal, but it
// cannot differ on an elevation or fail to document a length.
//
// NARROWED 2026-09-02 BY THE USER: "per trip reports" NAMES NO THIRD PARTY, so this pattern no
// longer matches it. The audit's headline question is whether prose "names a third party as the
// source of a claim", and by that test the phrase was a false positive -- 67 of 101 findings, and
// it is the phrasing this sweep spent eighteen PRs deliberately converting TO, on the reasoning
// that a category is not a source and that it tells a reader a number is INFERRED rather than
// counted. The audit was reporting its own convention back as a defect. 101 -> 34.
//
// WHAT DELIBERATELY STAYS, because the split was measured rather than assumed
// (classify-remaining-citation-findings.mjs) and the three surviving shapes are not the same:
//   * 2 name an actual publisher and are documented keeps (the guidebook in the reader's hands,
//     and "Green Trails / CalTopo map and compass" -- a gear line saying WHICH map to buy).
//   * 16 put the word "source" in front of a climber -- "sources differ", "no source gives a
//     season". That is the app-facing thing the no-sources rule is actually about, so a bare
//     category and a visible "source" are different questions however similar they look here.
//   * 12 are other sourcing acts, and that bucket is NOT noise: it holds the last real citations,
//     two "Verified via SpokAlpine" values naming a publisher NAMED has never known about.
// A LITERAL "Source:" LABEL IS A SEPARATE ALTERNATIVE, added 2026-09-02 alongside the narrowing
// above and not affected by it: it names the ACT with a colon rather than the category. 5 values
// in WA, and the sharpest is wa_mount_steel_standard's `face` -- "Source: Climbers Guide to the
// Olympic Mountains route description, consistent with the route's own aspect field." Lookbehinds
// exclude "water source:" and "heat source:", tested on five shapes.
//
// So do NOT extend this narrowing to `sources? (differ|describe|...)` on the grounds that it too
// names nobody. It was considered and rejected: those say "source" on screen.
// A CREDIT field names a person because that is the column's whole purpose, so a bare NAME
// there is content rather than a citation. Declared (not inlined) so consumers can LIFT it.
const CREDIT_FIELD = /^fa\b/;
const ACT =/\bsourced (?:via|from)\b|\bper (?:WTA|AllTrails|SummitPost|Peakbagger|Wikipedia|Mountain ?Project)|\bcorroborated by\b|confirmed by (?:two|multiple|several|independent)|\b(?:multiple|several|various|numerous|independent|published|online|climbing|guidebook)\s+sources?\b|\bsources?\s+(?:describe|state|report|say|agree|list|indicate|confirm)\b|\breported by (?:WTA|AllTrails)|\baccording to (?:WTA|AllTrails|SummitPost|Mountain ?Project)|\bverified via\b|\bsources?\s+(?:differ|disagree|vary|conflict|only say)\b|\bdepending on the sources?\b|\bno sources?\s+(?:gives?|describes?|documents?|states?|specifies|mentions?|confirms?|found)\b|\bnot (?:stated|documented|given|specified|recorded|broken out) in (?:the |any )?sources?\b|\bthe sources?\s+(?:does not|doesn't|do not|don't|only)\b|\bsource range\b|\bin the source (?:account|report|text|trip report)\b|\bper (?:the )?source\b|\bfound in sources?\b|\bby any source\b|(?<!water )(?<!heat )\bSources?:/i;

// Go and look at this yourself, now — operational, and it must never be swept.
/* `data_quality` IS DELIBERATELY NOT SCANNED, and it is the whole reason this widening had to be
   measured rather than swept. It carries 288 of the 302 hits -- by far the largest column -- and
   it RENDERS NOWHERE: `.gaps` appears zero times in RouteDetail.jsx and ClimbMatchCore.jsx, and
   the two page-level graders built on `data_quality.confidence` were deleted as noise long ago.
   The standing rule is that no SOURCE reaches a screen. A column that reaches no screen cannot
   break it, and adding it here would bury eleven real findings under 288 that nobody should act
   on -- a detector whose output is 96% noise is one people stop reading.
   If `data_quality` ever starts rendering, add it: the citations are still in there. */
/* THE PHONE NEEDLE REQUIRED PARENTHESES AND THIS CATALOG DOES NOT WRITE THEM. Measured
   2026-09-02 (measure-live-phone-formats.mjs): 425 values carry a phone number and LIVE matched
   5 -- so 417 sheriff's offices, ranger districts, hospitals and SAR dispatch numbers, nearly all
   of them in `emergency`, counted as neither live nor cited. That is the most operational content
   in the catalog going unreported by the bucket whose whole job is to say "this is operational".
   IT CANNOT CHANGE THE FINDING COUNT, which is why it is safe: `live` is only assigned in the
   `!cited` branch below, so widening it can never take a value out of `hits`. Of the 420 LIVE
   missed, 3 are also cited and correctly stay findings. */
const LIVE = /fs\.usda\.gov|nps\.gov|wsdot|weather\.gov|recreation\.gov|(?:\(\d{3}\)\s*|\b\d{3}[-.\s])\d{3}[-.\s]\d{4}\b/i;

/* DECIDED BY THE USER 2026-09-02: A POINTER TELLING A CLIMBER TO GO AND CHECK SOMETHING FOR
   THEMSELVES IS A LIVE REFERENCE AND STAYS. Asked as "is 'go check WTA yourself' a live reference
   (keep) or a citation (cut)?", answered "keep them". It is the same reasoning that already keeps
   the land-manager alert pages and ranger phone numbers above: the actionable thing a climber is
   told to go and look at, often the only line in the value they can act on.
   The distinction is DIRECTION, not vocabulary. "check recent trip reports before you go" points
   the reader outward; "per recent trip reports" attributes a claim backwards to a source. The
   second is still cut.

   NO DETECTOR WAS BUILT FOR IT, and that is a measurement rather than laziness
   (measure-live-reference-pointers.mjs): of the 214 findings, a strict pointer test matched 0 and
   a deliberately loose cross-check -- any advisory verb anywhere in a citing sentence -- matched
   3. Two of those three are the class, and they are handled below and by repair. A detector for a
   class of two is the thing this repo keeps refusing to build.

   THE REAL RISK IS THE OPPOSITE ONE, so it is written here rather than in a memory file: the
   pointer-shaped values mostly do not trip these needles AT ALL. "check recent trip reports
   before you go" names no publisher NAMED knows, and "Read both CascadeClimbers trip reports"
   names a site that is not in the list. DO NOT ADD bare `trip reports?` to NAMED, and do not add
   CascadeClimbers or NWHikers -- that widening would sweep precisely the class the user decided
   to keep, and it would look like progress while doing it. */

// Flagged and deliberately not a citation. A stale entry fails.
const EXEMPT = [
  // "East Ridge/Beckey Route" needed an exemption until NAMED was tightened to require a guide word
  // beside the name; it is now excluded BY CONSTRUCTION and an entry here would report as stale.
  ["wa_wolframite_mountain_scramble", "access.rules", "three associations named as the volunteers who MAINTAIN the mine site — content, not a source"],
  /* WHERE A GENERIC FORM LOSES NOTHING, THE BROADER INSTRUCTION WINS — #1462's test, and it
     retired an exemption I had added hours earlier. I exempted wa_chimney_peak_the_chimney
     pro_tips[1] on the grounds that "the SummitPost page for Chimney Peak in the Selway Crags"
     names the page that MISLEADS you, so the publisher IS the content. #1462 cut the name, and
     the warning survives intact: "Do not confuse this peak with Chimney Peak in the Selway
     Crags, Idaho — search engines mix the two constantly and the Idaho route beta is useless
     here" says everything the longer form said. The masthead was carrying nothing.
     The DECISION above still stands and is a different shape: a POINTER sends the reader
     somewhere useful, and cutting the destination destroys it. A WARNING not to trust something
     usually survives the cut, because the reason not to trust it is the part doing the work. */
];

const rows = await selectAll("routes", "id,name,road,access,waypoints", `id=like.${STATE}_*`, { pageSize: 1000 });
if (!rows.length) { console.error(`FAIL — read 0 ${STATE} routes. Refusing to report a clean result about data this never saw.`); process.exit(1); }

const values = [];
for (const r of rows) {
  for (const [col, key] of ROAD_ACCESS) {
    const v = r[col] && typeof r[col] === "object" ? r[col][key] : null;
    if (typeof v === "string" && v.trim()) values.push({ id: r.id, field: `${col}.${key}`, kind: "road/access", text: v.replace(/\s+/g, " ").trim() });
  }
  if (Array.isArray(r.waypoints)) r.waypoints.forEach((w, i) => {
    if (w && typeof w.note === "string" && w.note.trim()) values.push({ id: r.id, field: `waypoints[${i}].note`, kind: "waypoint note", text: w.note.replace(/\s+/g, " ").trim() });
  });
}
// ROUTE PROSE — the other 20+ climber-facing columns. This audit read road/access/waypoints only,
// which is 3 of them, so a clean result was a statement about a ninth of the prose on the page.
//
// Read COLUMN BY COLUMN rather than by widening the select above: this repo records a wide jsonb
// select over 8k rows timing out on the anon role's 3s statement_timeout, and a per-column read is
// the shape already proven to complete.
const PROSE_COLS = ["rappel_detail", "rappel_count_note", "rappels", "descent_text", "descent",
  "beta", "overview", "watch_out", "best_season", "approach", "approach_variants", "climbing_route",
  "itinerary", "bivy", "pitch_detail", "gear", "what_to_bring", "pro_tips", "hazards", "obj_haz",
  "seasonal_guidance", "seasonal_hazards", "climate", "emergency", "crowds", "partner_requirements",
  /* ADDED 2026-09-02, the same way `fa` was added below and for the same reason: measured what
     this audit could not see. It covered `gear` and `what_to_bring` and stopped there, so the
     other FOUR columns feeding the RACK box had never been opened -- and all four RENDER, which
     is the bar this list is held to. Proven rather than argued: every one is in
     check:field-renders' FIELDS with no KNOWN exemption, and that guard fails a column that
     reaches no screen.

     They carry 132 hits between them, and `rope_note` alone has 63 -- more than any column
     already listed. The sample that found it was a rendered sling bullet reading
     "cams: ... (per Mountain Project + 2 trip reports)", i.e. a publisher named on screen inside
     a climber's rack. `data_quality` stays out for the opposite reason stated below: it renders
     nowhere, so its citations cannot break the rule. RENDERING is the test, not size. */
  "sling_rack", "detailed_rack", "pro_needs", "rope_note",
  /* ADDED 2026-08-26 after measuring what this audit could not see. `fa` RENDERS -- `route.fa` on
     the route page -- and was never opened, so a citation in it was on screen and uncounted.
     ONLY `fa`. `road` and `access` also render and also carry citations, and are deliberately NOT
     added: this audit already scans them on a SEPARATE path with its own ROAD/ACCESS section in
     the output, so listing them here scans them TWICE. Measured -- doing so took the route-prose
     corpus from 126,112 values to 153,869 and inflated the headline while finding nothing new.
     READ THE OUTPUT'S SECTION HEADINGS BEFORE WIDENING A COLUMN LIST.
     `data_quality` is excluded for the opposite reason -- see the note above LIVE. */
  "fa",
  /* ADDED 2026-09-02. `face` renders as its OWN CARD on Overview under the heading
     FACE / WHERE ON THE PEAK — 1,035 WA routes, prose up to 247 characters — and had never
     been scanned. It held the only literal "Source:" in the catalog, an AAJ citation and a
     named guidebook. A column that renders prose and is not in this list is invisible by
     construction, which is how the rack columns hid 132 citations until #1422. */
  "face"];
function leaves(v, out = []) {
  if (typeof v === "string") { if (v.trim()) out.push(v); return out; }
  if (Array.isArray(v)) { for (const x of v) leaves(x, out); return out; }
  if (v && typeof v === "object") { for (const x of Object.values(v)) leaves(x, out); return out; }
  return out;
}
let proseCols = 0;
for (const col of PROSE_COLS) {
  let got;
  try { got = await selectAll("routes", `id,${col}`, `id=like.${STATE}_*&${col}=not.is.null`, { pageSize: 1000 }); }
  catch (e) { console.error(`FAIL — ${col} read threw (${String(e.message || e)}). Refusing to report a clean result about a column this never read.`); process.exit(1); }
  proseCols++;
  for (const r of got) for (const [i, s] of leaves(r[col]).entries()) {
    values.push({ id: r.id, field: `${col}[${i}]`, kind: "route prose", text: s.replace(/\s+/g, " ").trim() });
  }
}
if (proseCols !== PROSE_COLS.length) { console.error(`FAIL — read ${proseCols} of ${PROSE_COLS.length} prose columns.`); process.exit(1); }

if (!values.length) { console.error(`FAIL — ${rows.length} ${STATE} routes and 0 prose values. Every test below would be vacuous.`); process.exit(1); }
if (!values.some(v => v.kind === "route prose")) { console.error("FAIL — 0 route-prose values across every column. The widened scan is not reading."); process.exit(1); }

if (INJECT === "cite") { values[0].text = "The road is open to the trailhead, per SummitPost and several trip reports."; console.log(`[inject] a citation onto ${values[0].id} ${values[0].field}`); }
if (INJECT === "commonnoun") { for (const v of values) v.text = "Rarely climbed; occasional peakbagger visits, and Bulger-list peakbaggers tag it from a shared high camp."; console.log("[inject] every value uses the COMMON NOUN peakbagger(s) and cites nobody; the citation count must be 0"); }
if (INJECT === "thesite") { for (const v of values) v.text = "Peakbagger lists four logged ascents for this peak, and Peakbagger's page gives the elevation."; console.log("[inject] every value names the SITE Peakbagger; every value must be reported"); }
/* THE NARROWING NEEDS BOTH DIRECTIONS OR IT IS NOT PINNED. `tripcategory` alone is satisfied by a
   needle that matches nothing at all, and `tripnamed` alone by one that matches everything; only
   the pair says the boundary is where it is meant to be. Same sentence in each, differing solely
   in whether the thing after "per" is a category or a masthead. */
if (INJECT === "tripcategory") { for (const v of values) v.text = "Expect 3-5 rappels per trip reports, and treat the count as approximate."; console.log("[inject] every value says 'per trip reports' and names NO third party; citations must be 0"); }
if (INJECT === "tripnamed") { for (const v of values) v.text = "Expect 3-5 rappels per SummitPost, and treat the count as approximate."; console.log("[inject] the same sentence naming a PUBLISHER; every value must be reported"); }
if (INJECT === "facredit") { for (const v of values) { v.field = "fa[0]"; v.text = "The Mountaineers, 1925 - the first recorded ascent of Mount Daniel used this Lynch Glacier line."; } console.log("[inject] every value is an fa CREDIT naming a club; citations must be 0"); }
if (INJECT === "facite") { for (const v of values) { v.field = "fa[0]"; v.text = "First ascent party is given as Beckey and Schmidtke, corroborated by multiple sources."; } console.log("[inject] every value is an fa value carrying a sourcing ACT; every one must still be reported"); }
if (INJECT === "notfa") { for (const v of values) { v.field = "beta[0]"; v.text = "The Mountaineers describe this as the standard line."; } console.log("[inject] the SAME club name outside fa; every value must still be reported"); }
if (INJECT === "livedash") { for (const v of values) v.text = "Okanogan County Sheriff non-emergency dispatch: 509-422-7232, or call 911."; console.log("[inject] every value carries a BARE-DASH phone number and cites nobody; citations must be 0 and live must be every value"); }
if (INJECT === "liveonly") { for (const v of values) v.text = "Call the Mt. Baker Ranger District at (360) 854-2553 and check fs.usda.gov/alerts before driving."; console.log("[inject] every value is a LIVE reference; the citation count must be 0 and the live count must be every value"); }

const exemptKeys = new Set(EXEMPT.map(e => e[0] + "\0" + e[1]));
const hitKeys = new Set();
const hits = [], live = [];
for (const v of values) {
  const _t = deCommonNoun(v.text);
  /* `fa` IS A CREDIT FIELD, so a name in it is the CONTENT, not a citation. Naming who made the
     first ascent is the entire purpose of the column -- "The Mountaineers, 1925", "Steph Abegg
     and Wayne Wallace, June 27, 2009" -- and NAMED matches both the club and the person. Measured
     2026-09-03: 12 of 12 `fa` hits were credits and NONE was a citation, so this column ran at 0%
     precision and contributed 16% of the headline.
     The column stays scanned rather than removed, because a real citation CAN appear in it ("FA
     per SummitPost", "corroborated by multiple sources"). What changes is that a bare NAME no
     longer counts there -- only a sourcing ACT does. ACT is unaffected by the credit vocabulary:
     "documented as a likely first ascent" and "reported a suspected first winter ascent" are
     hedges about certainty, which this repo keeps deliberately, and neither is in ACT. */
  const isCredit = CREDIT_FIELD.test(v.field);
  const cited = isCredit ? ACT.test(_t) : (NAMED.test(_t) || ACT.test(_t));
  if (cited) hitKeys.add(v.id + "\0" + v.field);
  if (cited && !exemptKeys.has(v.id + "\0" + v.field)) hits.push(v);
  else if (!cited && LIVE.test(v.text)) live.push(v);
}
const stale = EXEMPT.filter(e => !hitKeys.has(e[0] + "\0" + e[1]));

const group = k => hits.filter(h => h.kind === k);
console.log(`${rows.length} ${STATE} routes; ${values.length} prose values (${values.filter(v => v.kind === "road/access").length} road/access, ${values.filter(v => v.kind === "waypoint note").length} waypoint notes, ${values.filter(v => v.kind === "route prose").length} route prose).`);
console.log(`${hits.length} value(s) on ${new Set(hits.map(h => h.id)).size} route(s) name a third party as the source of a claim.`);
console.log(`${live.length} value(s) on ${new Set(live.map(h => h.id)).size} route(s) carry a LIVE land-manager reference — operational, and NOT a finding.`);
console.log(`${EXEMPT.length} exempt, ${stale.length} stale.\n`);

for (const kind of ["road/access", "waypoint note", "route prose"]) {
  const g = group(kind);
  console.log(`── ${kind.toUpperCase()}: ${g.length} value(s) on ${new Set(g.map(h => h.id)).size} route(s)`);
  const show = FULL ? g : g.slice(0, 10);
  for (const h of show) {
    const m = h.text.match(new RegExp("[^.;]*(?:" + NAMED.source + "|" + ACT.source + ")[^.;]*", "i"));
    console.log(`   ${h.id}  ${h.field}\n      …${(m ? m[0] : h.text).trim().slice(0, FULL ? 300 : 165)}…`);
  }
  if (!FULL && g.length > show.length) console.log(`   … ${g.length - show.length} more (pass --full)`);
  console.log("");
}

if (stale.length) {
  console.error("STALE exemptions — these no longer match anything, so the list is describing prose that is gone:");
  for (const [id, field, why] of stale) console.error(`   ${id} ${field} — ${why}`);
  process.exitCode = 1;
} else {
  if (hits.length) {
    console.log("The repair is a REWRITE, not a deletion: the citation is usually welded into a sentence");
    console.log("that also carries the road, the mileage or the fact. And this is a deny-list — one more");
    console.log("publisher name defeats it, so read the value rather than trusting the count.");
  }
  process.exitCode = 0;
}

// Injection-tested:
//   --inject=cite      a citation onto the first value -> must be reported
//   --inject=liveonly  every value a phone number + a land-manager URL -> citations 0, live = all.
//   --inject=commonnoun  every value uses "peakbagger(s)" as the common noun -> citations 0.
//                        This must PASS; it is the precision case, and it is what stops the
//                        needle reporting true prose about who climbs a peak.
//   --inject=thesite     every value names the SITE Peakbagger -> every value reported. Pairs
//                        with commonnoun: without it, a needle that matched nothing would also
//                        satisfy the precision case.
//                      This is the precision rule: the destructive failure of this audit is
//                      reporting the 589 operational references as findings. It exits 1, correctly:
//                      overwriting every value also makes the exemption stale, and stale bookkeeping
//                      is a failure whatever caused it. Read the citation count, not the exit code.
