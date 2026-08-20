#!/usr/bin/env node
// Remove third-party source ATTRIBUTIONS from the road/access prose that renders on the route page.
//
// The standing rule is no sources anywhere in the app. `check:no-rendered-sources` enforces it for
// app FIELDS and is structurally blind to prose inside a jsonb column; the same class was measured
// and repaired for `waypoints[].note` and nobody had ever looked at `road.*` / `access.*`.
// Measured 2026-08-20: 33 flagged values on 32 WA routes.
//
// THE PRECISION RULE, and it is the whole reason this is a hand-written table rather than a regex
// sweep: 583 values on 415 routes carry a land-manager alert page or a ranger-district phone number
// (`fs.usda.gov/…/alerts`, `nps.gov`, `(509) 548-2550`). Those are NOT attributions of where our
// data came from — they are the live thing a climber is being told to go and check. A pattern-based
// sweep of "names a third party" deletes 583 phone numbers and alert pages. Naming the AGENCY that
// issues a permit or closes a road is likewise operational, and is kept throughout.
//
// EVERY EDIT IS DECLARED AS AN EXACT (find -> replace) PAIR, and the script refuses to run unless
// `find` occurs EXACTLY ONCE in the value as it stands in the database. Nothing can be invented and
// a stale table cannot half-apply: the same discipline as the trailhead fixers, which declare a
// WINNER rather than a coordinate. Dry run by default; `--apply` writes.
//
// Two findings from reading all 33, both of which a regex would have got wrong:
//   - `wa_nooksack_tower_south_face` was a FALSE POSITIVE — "Same access as the East Ridge/Beckey
//     Route" is a ROUTE NAME, not a citation. It is listed in NO_CHANGE and deliberately untouched.
//   - `wa_wolframite_mountain_scramble` names three associations as the volunteers who MAINTAIN the
//     Tungsten Mine site. That is content. Only its "(per recent trip reports)" is a citation.
// And one the detector MISSED: `WenatcheeOutdoors` in the Lichtenberg fee prose. A deny-list of
// source names is beaten by one more name, which is why the number here is a floor, not a total.
import { loadEnv, SUPABASE_URL, requireServiceKey, anonKey, headers, patchRow } from "../lib/supabase-env.mjs";

loadEnv();
const APPLY = process.argv.includes("--apply");

// id, jsonb column, sub-key, exact find, replacement, and what the edit costs.
const EDITS = [
  ["wa_bacon_peak_diobsud", "road", "driveNote", " (Mt. Baker Ranger District alert, corroborated by WTA.org's Anderson and Watson Lakes page)", "", "a parenthetical that is nothing but attribution"],
  ["wa_bye_gulley", "road", "driveNote", " (SummitPost)", "", "bare trailing citation; the directions and the NPS reservation both stay"],
  ["wa_voile_normale", "road", "driveNote", " (SummitPost)", "", "same value on a second route"],
  ["wa_carne_mountain_trail_route", "access", "fees", " (per USFS and WTA)", "", "the fee claim stands without naming who reported it"],
  ["wa_crooked_thumb_peak_south_route", "access", "fees", " (current per WTA)", "", "the two fee figures stay"],
  ["wa_castle_peak_pasayten_south_route", "access", "closures", " per Mountain Project's area-access warning", "", "the fact — not an authorized crossing — is the part that matters"],
  ["wa_castle_peak_pasayten_the_drawbridge", "access", "closures", " per Mountain Project's area-access warning", "", "same value on a second route"],
  ["wa_glacier_view_temple", "access", "permit", " per Mountain Project", "", "leaves: No climbing permit required."],
  ["wa_project_crack", "access", "permit", " per Mountain Project", "", "leaves: No climbing permit required."],
  ["wa_the_pillar_under_pale_streaks", "access", "permit", " per Mountain Project", "", "leaves: No climbing permit required."],
  ["wa_chianti_spire_lichen_bouquet", "access", "permit", " SummitPost records Chianti Spire's red tape as \"None,\" and camping needs no permit; standard", " Standard", "the first sentence already states the fact; the citation only repeated it"],
  ["wa_chianti_spire_north_face", "access", "permit", " SummitPost records the red tape for Chianti Spire simply as \"None,\" and camping requires no permit - standard", " Standard", "same shape on the neighbouring route"],
  ["wa_davis_peak_nc_north_face", "road", "driveNote", "SummitPost's original directions run you", "Older directions run you", "the contrast with our own advice survives without the name"],
  ["wa_gunn_peak_southeast_route", "road", "status", " (May 2026 WTA alert)", " (May 2026)", "KEEP THE DATE. It is the only freshness signal the value carries."],
  ["wa_gunn_peak_southeast_route", "access", "closures", "as of a WTA alert dated 5/6/26", "as of 6 May 2026", "date kept, source dropped"],
  ["wa_lewis_creek_route", "road", "seasonalGate", "as of a WTA alert dated 5/6/26", "as of 6 May 2026", "same shape on a second route"],
  ["wa_jack_mountain_southwest_ridge", "access", "permit", "SummitPost is explicit that permits are required for camping east of the Little Jack ridge crest (Pasayten Wilderness - free, non-quota, self-issued at the trailhead register) and that different regulations apply", "Permits are required for camping east of the Little Jack ridge crest (Pasayten Wilderness - free, non-quota, self-issued at the trailhead register), and different regulations apply", "both permit regimes and the where-you-sleep advice stay. The longer find is deliberate: dropping the attribution prefix alone strands the second \"and that\" clause with nothing to attach to, which is the lowercase-fragment trap the waypoint-note sweep recorded."],
  ["wa_mount_bigelow_tribute_to_richard", "road", "driveNote", "From Carlton (WTA's version):", "From Carlton:", "the second set of directions is the content; whose version it is is not"],
  ["wa_mount_constance_north_chimney", "road", "driveNote", " beyond what older guidebooks describe", "", "the mileage and time estimate stay"],
  ["wa_mount_fury_east_direct_east_ridge", "road", "seasonalGate", "WTA notes the Ross Dam trailhead parking sits", "The Ross Dam trailhead parking sits", "the WSDOT gate detail is operational and stays"],
  ["wa_mount_hardy_snow_scramble", "access", "permit", "WTA lists no fee specific to this off-trail summit route;", "There is no fee specific to this off-trail summit route;", "the two informal parking areas stay"],
  ["wa_mount_pugh_pika_slab", "road", "seasonalGate", "SummitPost notes that when", "When", "the half-hour-each-way cost is the useful part"],
  ["wa_mount_spickard_southwest", "road", "driveNote", "recent trip reports note washouts and logging damage near the road/trail's end, so plan for a longer approach on foot than older guidebook mileages suggest", "there are washouts and logging damage near the road/trail's end, so plan for a longer approach on foot than older mileages suggest", "the warning survives; only who reported it goes"],
  ["wa_mount_watson_scramble", "access", "closures", " This is now confirmed by two independent sources: trip-report aggregators (e.g. AllTrails) reporting the 12/11/2025 washout, and a Washington Trails Association trail alert (posted 7/8/2026) stating the road is closed at mile 3.8 due to a washout. The official Forest Service trailhead/wilderness pages had not posted a formal alert as of this research pass, so call", " The washout dates from 11 December 2025 and the closure was still posted on 8 July 2026. Call", "BOTH DATES KEPT — they are what lets a reader judge the claim. Also removes an 'as of this research pass' leak."],
  ["wa_nooksack_tower_beckey_route", "access", "fees", ", per WTA and USFS trail pages;", ";", "the Ruth Creek ford warning is the substance and stays"],
  ["wa_tailgunner_peak_w_route", "access", "closures", "check current WTA trip reports before heading out", "check current conditions before heading out", "a live third-party reference is still a source; the instruction survives"],
  ["wa_tower_mountain_southwest_route", "access", "permit", " -- confirmed by both WTA's route notes for this PCT segment (Hart's Pass to Rainy Pass, which covers Cutthroat/Granite Pass) and the Forest Service's Pasayten-area wilderness permit guidance.", ".", "the permit rule and the PCT-thru-hike distinction both stay"],
  ["wa_wolframite_mountain_scramble", "access", "rules", " (per recent trip reports)", "", "the three associations named here MAINTAIN the mine site — that is content, not a citation"],
  // Whole-value rewrites. These four are built out of source-versus-source prose, so there is no
  // clause to cut: the disagreement itself is the useful content and has to be restated without
  // naming who is on each side. The advice — carry a pass, confirm signage — is preserved verbatim.
  ["wa_lichtenberg_mountain_southeast_ridge", "access", "fees",
   "The Forest Service lists no fee for the Smithbrook Trailhead site; WenatcheeOutdoors notes no permit is required for the north-side winter start on the US 2 shoulder. SummitPost and several trip reports state a Northwest Forest Pass is required at the trailhead — carry one if you park on the forest road.",
   "The Forest Service lists no fee for the Smithbrook Trailhead site, and no permit is required for the north-side winter start on the US 2 shoulder. Other accounts report that a Northwest Forest Pass is expected at the trailhead — carry one if you park on the forest road.",
   "also drops WenatcheeOutdoors, which the detector never matched"],
  ["wa_lichtenberg_mountain_west_face", "access", "fees",
   "The Forest Service Smithbrook Trailhead page lists no fee; SummitPost and other sources report a Northwest Forest Pass is required. Carry one.",
   "The Forest Service lists no fee for the Smithbrook Trailhead, but other accounts report that a Northwest Forest Pass is required. Carry one.",
   "the conflict and the instruction both survive"],
  ["wa_lichtenberg_mountain_west_face_west_rib", "access", "fees",
   "The Forest Service's own Smithbrook Trailhead page states no fees are required for the site, and WTA's Lake Valhalla page lists no pass required. Several climbing and hiking sources, including SummitPost and multiple trip reports, state a Northwest Forest Pass is expected at this trailhead. Carrying a Northwest Forest Pass or an America the Beautiful pass costs nothing and removes the ambiguity.",
   "The Forest Service states that no fee is required for the Smithbrook Trailhead, but other accounts report that a Northwest Forest Pass is expected there. Carrying a Northwest Forest Pass or an America the Beautiful pass costs nothing and removes the ambiguity.",
   "the closing advice is kept word for word — it is the only actionable line"],
  ["wa_raven_ridge_standard_route", "access", "fees",
   "USFS's own Libby Lake Trailhead page and WTA state no parking fee or pass is required; note one source (Mountaineers.org) states a Northwest Forest Pass is required — confirm current signage locally",
   "The Forest Service states that no parking fee or pass is required at the Libby Lake Trailhead, though some accounts report that a Northwest Forest Pass is expected — confirm current signage locally",
   "confirm-signage-locally is the instruction and stays"],
];

// Flagged by the detector and deliberately NOT edited. A name in here that stops being flagged is
// reported as stale, so this cannot rot into a description of prose that is gone.
const NO_CHANGE = [
  ["wa_nooksack_tower_south_face", "road", "driveNote", "\"East Ridge/Beckey Route\" is a ROUTE NAME, not a citation — the detector matched the word Beckey"],
];

const ids = [...new Set([...EDITS, ...NO_CHANGE].map(e => e[0]))];
const url = `${SUPABASE_URL}/rest/v1/routes?select=id,road,access&id=in.(${ids.join(",")})`;
const res = await fetch(url, { headers: headers(APPLY ? requireServiceKey() : anonKey()) });
if (!res.ok) { console.error(`FAIL — read ${res.status}: ${await res.text()}`); process.exit(1); }
const rows = await res.json();
if (rows.length !== ids.length) { console.error(`FAIL — asked for ${ids.length} routes, got ${rows.length}. Refusing to edit a set this does not fully see.`); process.exit(1); }
const byId = new Map(rows.map(r => [r.id, r]));

// Every edit must match exactly once, checked for ALL of them before anything is written.
const planned = new Map();
let bad = 0;
for (const [id, col, key, find, repl, why] of EDITS) {
  const row = byId.get(id);
  const cur = row[col] && typeof row[col] === "object" ? row[col][key] : null;
  if (typeof cur !== "string") { console.error(`FAIL  ${id} ${col}.${key} — not a string in the database`); bad++; continue; }
  const n = cur.split(find).length - 1;
  if (n !== 1) { console.error(`FAIL  ${id} ${col}.${key} — find matched ${n} time(s), must be exactly 1`); bad++; continue; }
  const next = cur.replace(find, repl).replace(/\s{2,}/g, " ").trim();
  const k = id + "\0" + col;
  if (!planned.has(k)) planned.set(k, { id, col, obj: { ...row[col] } });
  planned.get(k).obj[key] = next;
  console.log(`\n${id}  ${col}.${key}\n  why: ${why}\n  -   ${cur}\n  +   ${next}`);
}
for (const [id, col, key, why] of NO_CHANGE) {
  const cur = byId.get(id)?.[col]?.[key];
  if (typeof cur !== "string") { console.error(`FAIL  stale NO_CHANGE entry ${id} ${col}.${key} — value is gone`); bad++; }
  else console.log(`\n${id}  ${col}.${key}\n  LEFT ALONE: ${why}`);
}
if (bad) { console.error(`\n${bad} problem(s). Nothing was written.`); process.exit(1); }

console.log(`\n${EDITS.length} edit(s) across ${planned.size} jsonb column(s) on ${ids.length - NO_CHANGE.length} route(s); ${NO_CHANGE.length} left alone.`);
if (!APPLY) { console.log("DRY RUN — re-run with --apply to write."); process.exit(0); }

for (const { id, col, obj } of planned.values()) await patchRow("routes", id, { [col]: obj });
console.log(`wrote ${planned.size} column(s). Re-reading to reconcile…`);

// A 200 is not evidence. Read the rows back and confirm every replacement is in place and no
// declared `find` survives anywhere.
const check = await fetch(url, { headers: headers(requireServiceKey()) });
const after = new Map((await check.json()).map(r => [r.id, r]));
let wrong = 0;
for (const [id, col, key, find] of EDITS) {
  const v = after.get(id)?.[col]?.[key];
  if (typeof v !== "string" || v.includes(find)) { console.error(`NOT APPLIED  ${id} ${col}.${key}`); wrong++; }
}
console.log(wrong ? `${wrong} edit(s) did not land.` : `verified: all ${EDITS.length} edits are live and no declared citation survives.`);
process.exitCode = wrong ? 1 : 0;
