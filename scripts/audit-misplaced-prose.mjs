// Text that is on the route page but is not what that place on the page is FOR.
//
// Reported 2026-09-24 from Mount Carru's FIRST ASCENT strap, which read:
//   "Hermann F. Ulrichs and Richard (Dick) Alt, July 1933 -- this was the first ascent of the peak
//    overall; the account does not name a specific line, but the cliffed north face makes this
//    south-slope/southeast-ridge scramble the only plausible non-technical route the 1933 party
//    could have used."
// Every word true, and none of it for a climber: it is the research pass ARGUING with itself in a
// field that renders as a one-line credit. check:token-boxes cannot see it (the strap wraps, so it
// is not token-SHAPED) and check:field-renders cannot either (the column reaches a screen). The
// defect is the VOICE and the TOPIC, not the geometry.
//
// Three sections, each a different repair:
//   1. FIRST ASCENT PLACEHOLDERS  "unknown", "??", "N/A" … — 68,547 rows. NOT a data backlog: the
//      reader nulls them (lib/fa.js usableFa, applied in dbRouteToCamel). Reported so a regression
//      in that test is visible as a jump in the count, and so a NEW placeholder spelling shows up.
//   2. FIRST ASCENT IN RESEARCH VOICE  the strap argues about which line the party took, names a
//      source, or talks about what was "stored here previously". Repair: who + when, and at most
//      "(first ascent of the peak)". scripts/oneoff/fa-research-voice-rewrites.json is the first
//      batch, 138 rows.
//   3. PIPELINE VOICE ANYWHERE  any rendered string that talks about the session, the DB, "available
//      sources", "see corrections", or tags a publisher ("per Mountain Project"). Repair is per
//      value — delete the clause, keep the fact. scripts/oneoff/pipeline-voice-repairs.json.
//
// The cues match a VOICE, not a topic — same principle as audit:note-voice, whose cue list this
// extends to every column. "Source Lake" is a place, "entry gully" is a gully you enter, and the
// waypoint caveat "Coordinate is a geometric interpolation … not independently verified" is REQUIRED
// by check:waypoint-caveat; all three are exempted below by name, measured, not by loosening a cue.
// "(6,320-6,340 ft depending on source)" is deliberately NOT a cue: collapsing it means inventing a
// number, and audit:prose-citations owns publisher names inside grades.
//
// Read-only, report-only, anon key, fails closed on a short read. NOT a build gate — a property of
// the database, not the checkout.
//
//   node scripts/audit-misplaced-prose.mjs            # whole catalog
//   node scripts/audit-misplaced-prose.mjs --list 60  # print more rows per section
import { readFileSync } from "fs";
import { selectAll } from "./lib/supabase-env.mjs";
import { FA_PLACEHOLDER } from "../lib/fa.js";

const argv = process.argv.slice(2);
const LIST = +(argv[argv.indexOf("--list") + 1] || 0) || 25;

// Bare "presumably" is NOT a cue: "Presumably Bob", "unknown, presumably 1980s" are climbers writing
// their own FA notes (17 of the first run's 82 hits, all non-WA). Research voice presumes a LINE.
const FA_RESEARCH = /\b(?:presum(?:ed|ably) (?:via|to be|to have|original|the (?:FA|original))|(?:is|was) the presumed|plausible|not (?:separately |specifically |explicitly |independently )?(?:documented|confirmed|verified|corroborated)|no source|(?:the |one |another )?account (?:does not|gives)|(?:stored|recorded) here|previously stored|see corrections|Grokipedia|Mountain Project|AAJ|trip report that|not fully attributable|on the source page|by any source located|carried by no|another record|some (?:accounts|sources)|secondary source|(?:is|was) not recorded for this line|not (?:a )?route-specific|rather than a (?:confirmed )?route-specific)\b/i;
const PIPELINE = /\b(?:this session|(?:current |existing )?DB value|DB entry|previously stored|stored here|see corrections|enrichment pass|re-research|this entry is|this row|sources? (?:checked|found|located)|(?:in|from) (?:the )?available sources|in any source|by any source located|no located source|carried by no|NOT (?:independently )?verified|per (?:WTA|Mountain Project|SummitPost|Peakbagger|the guidebook)|Wikipedia|Grokipedia|recorded here)\b/i;
const EXEMPT = [
  /\bSource Lake\b/,                                                      // a place in the Alpental valley
  /geometric interpolation[^.]*not independently verified/i,              // the manufactured-pin caveat check:waypoint-caveat requires
];
const SKIP_PATH = /^access\._raw\b/;                                      // not rendered: an import scratch block
// Section 4. The owner's rule: the app never names where its information came from. NAMED (publishers)
// is lifted from audit:prose-citations by anchor — never retyped — and SOURCING catches the generic forms
// ("trip reports describe", "one account", "published beta", "depending on source"). audit:prose-citations
// reads WA routes and a fixed column list; this reads EVERY rendered string in every state plus area
// blurbs, which is how "5.2 (5.5 at the overhanging band per SummitPost)" in a grade field was found.
// The bare word "source" is NOT a cue: in this catalog it is mostly water ("the last reliable source").
const SOURCING = /\b(?:depending on (?:the )?sources?|sources? (?:differ|disagree|vary|conflict|say|describe|give|list|report|note|state|suggest|mention|cite|put|place|rate|call)s?\b|(?:some|many|most|several|multiple|other|older|online|published|secondary|available) (?:sources|accounts|beta)\b|according to|(?:one|another|an older|a single) (?:account|source|report)\b|per (?:the |one |a )?(?:guide(?:book)?|route page|topo|trip reports?|FA party|first ascensionist)|as (?:reported|described|listed) (?:by|on|in) (?:the |a |one )?(?:guide(?:book)?|trip reports?|forum|website|site|page|topo|blog)|trip reports? (?:describe|say|note|report|mention|suggest|indicate|state|put|give)s?\b|reported (?:by|on|in) (?:a |one |the )?(?:trip report|guidebook|forum)|cited (?:by|in) (?!climbers|parties)|(?:sourced|taken|derived|drawn|read) (?:from|via) (?:the |a |one |public )?(?:source|map|page|guide|topo|report|site)|(?:in|from|by|per) (?:the|a|one|any|available|published|online) sources?\b(?! (?:Lake|Creek|basin))|\b(?:the|a|one|any|no) (?:published |online |available )?sources? (?:gives?|says?|states?|lists?|describes?|documents?|notes?|puts?|confirms?|mentions?|records?|specif)|(?:given|stated|listed|documented|recorded|specified|found) in (?:the|any|a|one) sources?\b)/i;
// Named but NOT a source: a land manager issuing a permit/closure/forecast, a club as the OPERATOR of an
// outing or the owner of a grading scale, a guidebook a climber is told to CARRY. Decided keeps.
const NOT_A_SOURCE = /\b(?:NPS|USFS|NWAC|WSDOT|Ranger District)\b|\bThe Mountaineers\b.{0,40}\b(?:run|runs|lead|leads|offer|outing|course|scramble rating|rate|rating|classif)|\b(?:bring|carry|pack)\b.{0,40}\bguide(?:book)?\b/i;
const NOT_RENDERED = /^(?:access\._raw|data_quality|corrections|name_search|verif|lists)\b|(?:^|\.)(?:source|sources|_source)\b/;
const NAMED = (() => {
  const src = readFileSync(new URL("./audit-prose-citations.mjs", import.meta.url), "utf8");
  const m = src.match(/^const NAMED = (\/.*\/[a-z]*);$/m);
  if (!m) { console.error("audit:misplaced-prose — ANCHOR LOST: NAMED in audit-prose-citations.mjs"); process.exit(2); }
  return eval(m[1]);
})();
const COMMON_NOUN = (() => {
  const m = readFileSync(new URL("./audit-prose-citations.mjs", import.meta.url), "utf8").match(/^const COMMON_NOUN = (\/.*\/[a-z]*);$/m);
  if (!m) { console.error("audit:misplaced-prose — ANCHOR LOST: COMMON_NOUN in audit-prose-citations.mjs"); process.exit(2); }
  return eval(m[1]);
})();
// Named, but NOT a source — each READ and decided on 2026-09-24, exempt by name rather than by loosening
// NAMED. A value here that later changes still passes, so re-read one before quoting it as clean.
const KEEP = new Set([
  // a club named as the OPERATOR of trips/courses, or the owner of a grading scale
  "routes.wa_bacon_peak_diobsud pro_needs", "routes.wa_colonial_peak_west_ridge crowds.peakTraffic",
  "routes.wa_earl_peak_southwest_ridge partner_requirements.experienceLevel", "routes.wa_fortune_peak_standard_route watch_out[2]",
  "routes.wa_mount_thomson_west_ridge partner_requirements.experienceLevel", "routes.wa_mutchler_peak_scramble detailed_rack",
  "routes.wa_south_rib rock_grade", "routes.wa_unicorn_peak_r1 crowds.estimatePerSeason",
  // a guidebook a climber is told to CARRY or CONSULT — the owner answered KEEP (open-product-decisions #5)
  "routes.wa_cathedral_rock_northeast_ridge_2003_variation what_to_bring[3]", "routes.wa_chimney_peak_the_chimney pro_tips[0]",
  "routes.wa_garfield_mountain_south_route what_to_bring[6]", "routes.wa_mcmillan_spire_west_southwest_ridge pro_tips[1]",
  "routes.wa_ne_arete watch_out[1]", "routes.wa_sews_sw_rib pro_tips[0]",
  // a map app named as a TOOL, and a trip plan registered with a site — neither is where our data came from
  "routes.wa_chimney_peak_the_chimney what_to_bring[3]", "routes.wa_gunn_peak_southeast_route comms", "routes.wa_lincoln_peak_standard comms",
  // a first-ascent credit naming the climber; volunteer trail crew maintaining structures
  "routes.wa_east_twin_needle_thread_of_ice beta", "routes.wa_energizer_bunny overview", "routes.wa_wolframite_mountain_scramble access.rules",
  // area history: who named or first climbed a peak, a club's lookout, "Cascade climbers" meaning people
  "areas.wa_bryant_peak blurb", "areas.wa_cloudy_peak blurb", "areas.wa_mount_hinman blurb", "areas.wa_mount_pilchuck blurb",
  "areas.wa_mount_seattle blurb", "areas.wa_mount_triumph blurb",
]);

const cols = "id,fa,grade,season,aspect,commitment,alpine_grade,rock_grade,ice_grade,aid_grade,face,permit,comms,turnaround,pro_needs,detailed_rack,rope_type,rope_note,rappel_count_note,rappels,best_season,bail,descent,descent_text,approach,overview,beta,gear,hazards,obj_haz,what_to_bring,pro_tips,watch_out,timing,access,road,crowds,emergency,climate,itinerary,partner_requirements,seasonal_guidance,seasonal_hazards,approach_logistics,approach_variants,climbing_route,bivy,pitch_detail,waypoints,rappel_detail,sling_rack,ascender,start_type,landing,pads,rock,crux,prot_rating";
const rows = await selectAll("routes", cols, null, { pageSize: 1000 });
if (rows.length < 100000) { console.error(`audit:misplaced-prose — read only ${rows.length} routes; the catalog is ~205k. Refusing to report on a partial read.`); process.exit(2); }

const show = (label, list, fmt) => { console.log(`\n${label}: ${list.length}`); for (const x of list.slice(0, LIST)) console.log("  " + fmt(x)); if (list.length > LIST) console.log(`  … ${list.length - LIST} more (--list N)`); };

// 1 + 2 ─ first ascent
const ph = {}; let nPh = 0; const faVoice = [];
for (const r of rows) {
  if (typeof r.fa !== "string") continue;
  if (FA_PLACEHOLDER.test(r.fa)) { nPh++; ph[r.fa] = (ph[r.fa] || 0) + 1; continue; }
  if (FA_RESEARCH.test(r.fa)) faVoice.push(r);
}
console.log(`audit:misplaced-prose — ${rows.length} routes read`);
console.log(`\n1. FIRST ASCENT PLACEHOLDERS (nulled by lib/fa.js at read time — not a backlog): ${nPh} rows, ${Object.keys(ph).length} spellings`);
console.log("   top: " + Object.entries(ph).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => `${JSON.stringify(k)}×${v}`).join("  "));
show("2. FIRST ASCENT IN RESEARCH VOICE (hand rewrite: who + when)", faVoice, (r) => `${r.id} | ${r.fa.slice(0, 180)}${r.fa.length > 180 ? "…" : ""}`);

// 3 ─ pipeline voice in any rendered string
const hits = [];
const walk = (v, p, id) => {
  if (v == null || SKIP_PATH.test(p)) return;
  if (typeof v === "string") { const m = v.match(PIPELINE); if (m && !EXEMPT.some((e) => e.test(v))) hits.push({ id, p, m: m[0], v }); return; }
  if (Array.isArray(v)) return v.forEach((x, i) => walk(x, `${p}[${i}]`, id));
  if (typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, `${p}.${k}`, id);
};
for (const r of rows) for (const [k, v] of Object.entries(r)) if (k !== "id" && k !== "fa") walk(v, k, r.id);
const fam = {}; for (const h of hits) { const f = h.p.replace(/\[\d+\]/g, "[]"); fam[f] = (fam[f] || 0) + 1; }
console.log(`\n3. PIPELINE VOICE IN A RENDERED STRING: ${hits.length} strings on ${new Set(hits.map((h) => h.id)).size} routes`);
for (const [k, v] of Object.entries(fam).sort((a, b) => b[1] - a[1])) console.log(`   ${String(v).padStart(4)}  ${k}`);
show("   rows", hits, (h) => `${h.id} ${h.p} ["${h.m}"] ${h.v.slice(0, 150)}${h.v.length > 150 ? "…" : ""}`);

// 4 ─ a source named in any rendered string (routes, every state) or an area blurb
const src = [];
const walkSrc = (v, p, id, table) => {
  if (v == null || NOT_RENDERED.test(p)) return;
  if (typeof v === "string") {
    if (p === "fa") { if (NAMED.test(v) && /\b(?:per|according to|listed (?:on|by)|recorded (?:on|by))\b/i.test(v)) src.push({ table, id, p, v }); return; }
    const n = v.replace(COMMON_NOUN, "").match(NAMED), g = v.match(SOURCING);
    if (g || (n && !NOT_A_SOURCE.test(v) && !KEEP.has(`${table}.${id} ${p}`))) src.push({ table, id, p, v, m: (g || n)[0] });
    return;
  }
  if (Array.isArray(v)) return v.forEach((x, i) => walkSrc(x, `${p}[${i}]`, id, table));
  if (typeof v === "object") for (const [k, x] of Object.entries(v)) walkSrc(x, `${p}.${k}`, id, table);
};
for (const r of rows) for (const [k, v] of Object.entries(r)) if (k !== "id") walkSrc(v, k, r.id, "routes");
const areas = await selectAll("areas", "id,blurb", "blurb=not.is.null", { pageSize: 1000 });
for (const a of areas) walkSrc(a.blurb, "blurb", a.id, "areas");
const famS = {}; for (const h of src) { const f = h.table + " " + h.p.replace(/\[\d+\]/g, "[]"); famS[f] = (famS[f] || 0) + 1; }
console.log(`\n4. A SOURCE NAMED IN A RENDERED STRING: ${src.length} strings on ${new Set(src.map((h) => h.table + h.id)).size} rows (${areas.length} area blurbs read)`);
for (const [k, v] of Object.entries(famS).sort((a, b) => b[1] - a[1]).slice(0, 20)) console.log(`   ${String(v).padStart(4)}  ${k}`);
show("   rows", src, (h) => `${h.table}.${h.id} ${h.p} ["${h.m || "fa"}"] ${h.v.slice(0, 150)}${h.v.length > 150 ? "…" : ""}`);
