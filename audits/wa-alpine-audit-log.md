# WA Alpine/Mountaineering Audit Log

Recurring fact-audit of Washington alpine/mountaineering routes in the live Supabase DB.
Scope: `routes.discipline in ('alpine','mountaineering')`, WA (`id like 'wa_%'`), restricted to
routes whose parent `areas.area_type = 'peak'` (excludes crags/walls mislabeled with an
alpine/mountaineering discipline — see notes below). At audit start there were 422 routes in
scope out of 557 total WA rows tagged alpine/mountaineering.

---

## 2026-07-31 — Pass 1, Batch 33

Five peaks, 10 routes (Mount Stuart 2, Mount Teneriffe 2, Mount Terror 4, Mount Thomson 1,
Mount Tom 1): The Gendarme, West Ridge (Stuart); Kamikaze Trail, Standard Route (Teneriffe);
North Face, East Ridge, Stoddard Buttress, West Ridge (Terror); West Ridge (Thomson);
Glacier/Scramble Route (Tom).

**Confirmed errors → fixes in `sql/2026-07-31-batch-33.sql`:**
- Mount Stuart West Ridge: approach text's trailhead elevation ("~5,500 ft") was wrong and
  self-contradicted its own next sentence (Longs Pass at "~6,400 ft" reached via "~2,100 ft
  gain from the trailhead" implies ~4,300 ft, not 5,500); fixed to 4,243 ft, matching both
  that internal math and external sources (mountainwerks.org's route page, corroborated by
  general trip-report/AllTrails figures for the North Fork Teanaway Road end).
- Mount Stuart West Ridge: the first waypoint ("Esmeralda Basin Trailhead") and the matching
  first `gpx` point stored a coordinate ~2.5 miles east of the real trailhead with a wrong
  elevation (3,200 ft) — same "correct coordinate copied onto the wrong point" bug as batch
  27's Mount Index/Lago/Larrabee fixes. Fixed using the row's own already-correct
  `approach_logistics` trailhead coordinates plus the externally-confirmed 4,243 ft.
- Mount Terror West Ridge and Stoddard Buttress: both had the recurring null-top-level-grade-
  despite-populated-and-internally-consistent-subfields bug (batches 6/10/17/19/26/30/31) —
  filled from their own alpine_grade/rock_grade/commitment, matching the format already used
  by this peak's other two routes.

**Flagged for human review (not auto-fixed):**
- Mount Stuart West Ridge: `itinerary.days[0].schedule` references "Stuart Lake TH" and
  "Reach Stuart Pass," contradicting this route's own approach/waypoints, which describe the
  separate Esmeralda/Ingalls Way trailhead and explicitly stay short of Stuart Pass — likely
  cross-route itinerary contamination, not rewritten for lack of a real timing source.
- Mount Stuart West Ridge: `grade` leads with NCCS "III" while `commitment`/`alpine_grade`
  both say "II" — an internal mismatch no source found this pass could resolve.
- Mount Terror Stoddard Buttress: `fa` splits Stoddard's ascent into a 1984 solo FA plus a
  separate 1985 "left-side" extension: search-engine summaries of the AAC/NWMJ record instead
  describe one push (July 14-17, 1984 season, reported in AAJ's 1985 volume under exactly that
  "Left Side" title), suggesting the on-file two-ascent split may be fabricated — but every
  primary source 403'd this run, so left flagged rather than rewritten from indirect evidence.
- Mount Terror East Ridge (`wa_mount_terror_southeast_face`): re-confirmed the row's own
  pre-existing id/name-mismatch self-flag is still accurate and unresolved.
- Mount Thomson West Ridge: FA party (Beckey brothers + Robert Craig & William Ford, 1940) is
  only partially corroborated — Fred and Helmy Beckey's 1940 West Ridge ascent is confirmed,
  Craig/Ford's presence on this specific climb (vs. others on the same expedition) isn't. Not
  a contradiction, just unconfirmed; noted for a future pass with archive access.

Mount Stuart's Gendarme, both Mount Teneriffe routes, Mount Terror's North Face, and Mount
Tom's Glacier/Scramble Route all audited clean — FA/elevation/land-manager claims checked
this pass (Terror's 8,151 ft and 1961 North Face FA party; Teneriffe's 4,788 ft and DNR land
manager, already self-corrected in a prior pass; Tom's 7,076 ft and 1914 Meany/Thomas Martin
FA) all corroborated externally without contradiction.

---

## 2026-07-27 — Pass 1, Batch 1

Checked 8 routes (one per distinct peak, first 8 alphabetically): Liberty Bell Mountain (A
Servant To Liberty), Burgundy Spire (Action Potential), Agnes Mountain (West Route), Alpine
Lookout (Round Mountain Trail), American Border Peak (Southeast Face/South Ridge),
Amphitheater Mountain (North Ridge), Anderson's Thumb (Standard Route), Apex Mountain/Pasayten
(Apex Buttress).

**Confirmed errors → fixes in `sql/2026-07-27-batch-1.sql`:**
- Amphitheater Mountain: prominence 807 ft → 758 ft (Wikipedia).
- Agnes Mountain: prominence 1394 ft → 1355 ft (Peakbagger + Wikipedia agree).
- Action Potential (Burgundy Spire): `face` said "North Face", should be "East Face" — the
  route's own overview text already said East Face; the field contradicted the row's own prose.
- Apex Mountain: elevation 8307 ft → 8302 ft, prominence 1013 ft → 982 ft (multiple sources
  agree; the route's own waypoints already used the correct 8302 ft).
- A Servant To Liberty (Liberty Bell): "no documented repeats" claim was wrong — Alex Honnold
  has repeated the route per the FA account; fixed `crowds`/`data_quality` text. Also fixed a
  stale Blue Lake Trailhead/Northwest Forest Pass reference in `access`/`partner_requirements`
  that didn't match this route's actual East Face roadside-pullout approach (no pass required
  there) — a prior 2026-07-18 fix caught the waypoint but missed these fields.

**Flagged for human review (not auto-fixed — judgment calls or unverifiable):**
- American Border Peak (Southeast Face/South Ridge): no errors found, everything checked out.
- Amphitheater Mountain / North Ridge: the route's 1973 FA date and technical grade could not
  be verified (Mountain Project blocked fetches this session).
- Agnes Mountain: elevation (8131 ft stored) conflicts across sources (8119 vs 8133 ft) —
  needs a human to pick a source of record.
- Alpine Lookout: discipline is stored as "mountaineering," but every external source (WTA,
  USFS, Mountaineers, AllTrails) and the route's own beta describe a non-technical Class 1
  trail hike to a fire lookout. Possible misclassification — left to a human, since it's a
  categorization call rather than a single verifiable fact. Prominence (1184 ft) also couldn't
  be independently confirmed (peakbagger/listsofjohn blocked fetches).
- Burgundy Spire: elevation (8483 ft stored) vs. listsofjohn.com's 8492 ft — a 9 ft gap, not
  clearly wrong (could be datum/rounding), left for a human with guidebook/topo access.
- Anderson's Thumb: no GNIS/USGS/Peakbagger/Mountain Project entry exists for this micro-
  feature at all, so elevation/prominence/coordinates are unverifiable against any authoritative
  source (already self-flagged LOW confidence in the DB). Separately, the route's own
  `corrections` text describes it as a "Washington North Cascades peak," which contradicts the
  area's own hierarchy (it's in the Olympics) — flagged for a human to fix the wording since we
  didn't have the exact stored string in hand to safely target with SQL.
- **Apex Mountain / Apex Buttress — flagged as the most significant open issue.** No source
  found documents a technical buttress route on Apex Mountain; every source describes the
  mountain's only route as a Class 1–2 walk-up. The route row also contradicts itself
  (`pitches: 7` vs. its own `rope_note` calling it "Single-pitch 5.9 trad"). This may be a
  conflation with the real, nearby Cathedral Peak Southeast Buttress. Not deleted or altered —
  recommend a human review whether this route entry should exist at all.

Next batch will continue alphabetically from `wa_apex_buttress` (see progress file).

---

## 2026-07-27 — Pass 1, Batch 2

Checked 8 routes across 7 peaks, continuing alphabetically: Argonaut Peak (Southeast Ridge,
Northeast Ridge), Austera Peak (Southwest Ridge/McAllister Glacier), Bacon Peak (Diobsud
Creek/Green Lake Glacier), Baring Mountain (North Face), Bear Mountain/Chilliwack (North
Buttress), Prusik Peak (Beckey-Davis), Big Kangaroo (Beckey-Tate).

**Confirmed errors → fixes in `sql/2026-07-27-batch-2.sql`:**
- Argonaut Peak Southeast Ridge: the route's own `corrections`/`rope_note` fields asserted
  single-rope rappels only, while `descent_text` asserted double-rope rappels only — a real
  internal contradiction. Mountaineers.org (the source both claim to draw from) actually
  documents both as standard options ("two single, or 1 double rope rappel"); rewrote
  `descent_text` to match.
- Prusik Peak Beckey-Davis: the route's own approach text names Stuart Lake Trailhead/Aasgard
  Pass as the standard access, with Snow Lakes Trail only as a wildfire-closure fallback — but
  the primary "Trailhead"-type waypoint was labeled plain "Snow Lakes Trailhead" with no
  indication it's the fallback. Clarified the waypoint's note rather than guess new coordinates.

**Notable resolution (no fix needed):** Bear Mountain North Buttress's own `data_quality.gaps`
flagged an unresolved question — is this the Beckey/Fielding 1967 7-pitch route or the
Kearney/Knight 1980 21-pitch "Direct North Buttress"? AAJ records for both confirm this entry
(7 pitches, IV, ~2,200 ft) correctly represents the 1967 line, distinct from the 1980 one.

**Flagged for human review (not auto-fixed — judgment calls or unverifiable):**
- Argonaut Peak Northeast Ridge: no source found documents a "Northeast Ridge" matching the
  stored PD/Class 4-low 5th/5.4/3-pitch spec — the real named NE-side lines are "Northeast
  Buttress" and "Northeast Couloir," neither matching. Same category of issue as batch 1's Apex
  Buttress flag — possible route-identity conflation, needs a human call.
- Baring Mountain North Face: Fred Beckey's presence on the actual 1960 summit FA (vs. an
  earlier 1959 attempt with the same partners) is ambiguous in available sources; the grade and
  the walk-off descent claim (vs. the FA account's own "long rappels down the upper walls")
  couldn't be independently confirmed either way.
- Bacon Peak: FR-1107's washout closure at MP 3.8 is corroborated as of a Dec 2025 event, but
  current (mid-2026) status couldn't be confirmed live.
- Austera Peak: "aspect: Northeast" on a route named "Southwest Ridge" is plausible (likely
  describes the summit-block crux face, not the overall line) but unconfirmed against a primary
  source.
- Big Kangaroo Beckey-Tate: exact FA day (5/29/1967) and the source page for the claimed "2023
  theodolite survey" elevation (8,326 ft) couldn't be directly fetched to confirm, though both
  are plausible and corroborated by secondary sources.

Next batch will continue alphabetically from `wa_beckey_tate` (see progress file).

---

## 2026-07-27 — Pass 1, Batch 3

Checked 8 routes across 6 peaks, continuing alphabetically: Vega North Tower/Eros Tower (Beyond
Redlining), Big Four Mountain (Northwest Ridge, Spindrift Couloir), Big Kangaroo (West
Face/West Route), Big Snow Mountain (East Ridge/Hardscrabble Route, North Slope/Dingford
Route), Black Peak (Northeast Ridge), Guye Peak (Blood Sport).

**Confirmed errors → fixes in `sql/2026-07-27-batch-3.sql`:**
- Beyond Redlining: FA month "July 2020" → "May 2020" (AAC Publications, Mountain Project, and
  an independent trip report all place the FA in May, not July; exact day unconfirmed).
- Beyond Redlining: access data wrongly named Glacier Peak Wilderness as the governing
  wilderness area and misattributed a Dec 2025 storm closure to this route's access road. The
  route's actual approach (Sunrise Mine Trail/FR-4065) is nowhere near Glacier Peak Wilderness
  (separated by the entire Henry M. Jackson Wilderness) and sits in/adjacent to WA DNR's Morning
  Star NRCA and Wild Sky Wilderness instead; the real storm damage was on the Suiattle River
  Road, Glacier Peak Wilderness's own access corridor, not this route's.
- Big Kangaroo West Face/West Route: high_point_ft 8323 ft → 8326 ft — matched none of the
  three figures already documented in this row's own data_quality dispute (8326/8318/8280) and
  contradicted the row's own overview text, which already says 8,326 ft.
- Black Peak Northeast Ridge: overview and summit waypoint both said "8,970 ft," contradicting
  this same row's own high_point_ft (8975) and the authoritative Wikipedia/NAVD88 figure of
  8,975 ft — fixed both to 8,975 ft for internal consistency.
- Big Snow Mountain East Ridge/Hardscrabble Route: the row's own `corrections` text claimed
  "gainFt is left null," but gain_ft was actually populated with 5200 — rewrote `corrections`
  to describe 5,200 ft honestly as a working estimate instead of contradicting the stored value.
- Blood Sport (Guye Peak): access._raw said "Unknown" in nine sub-fields, directly
  contradicting the sibling access.* fields on the same row which already carry real,
  corroborated data from a later enrichment pass — replaced the stale _raw block with a note
  pointing at the good data.

**Flagged for human review (not auto-fixed — judgment calls or unverifiable):**
- **Big Kangaroo West Face/West Route — flagged as the most significant open issue.** The
  row's own `id` (`wa_big_kangaroo_southwest_rib`) implies a route called "Southwest Rib," but
  no such route exists on Big Kangaroo — "Southwest Rib" is the real, distinct name of a
  different 5.8 route on South Early Winter Spire, a different peak nearby. The row's actual
  content correctly describes Big Kangaroo's real route (West Face/West Route); only the `id`
  is wrong. Not renamed here given the broader blast radius of changing an id. Same category as
  batch 1's Apex Buttress and batch 2's Argonaut Peak NE Ridge flags.
- Beyond Redlining: exact FA day unconfirmed (source's own internal date reference doesn't
  cleanly reconcile); a discrepancy between this row's descent beta (8 raps, 60m rope) and one
  independent trip report (7 raps, 70m rope) needs a human with Mountain Project access to
  settle, since MP itself was blocked from direct fetch this session. The specific numeric
  wilderness rules (group size, campfire elevation) were carried over from the wrong wilderness
  area along with the naming fixed above — whether Morning Star NRCA has the same numbers is
  unconfirmed.
- Big Four Mountain Spindrift Couloir: AAJ's own publications disagree on the FA climber's
  surname ("Bart Pauli" in the new-route index vs. "Bart Paull" in the same volume's
  first-person trip report) — needs a human with direct AAJ archive access.
- Black Peak Northeast Ridge: whether the standard Wing Lake basecamp itinerary actually
  crosses onto North Cascades NP land (triggering the stored NPS permit fee) or stays on
  National Forest land (free) is ambiguous across sources.
- Blood Sport (Guye Peak): `discipline` is stored as "alpine," but every available description
  (the row's own text and an indexed MP snippet) depicts a 50ft single-pitch bolted sport/mixed
  crag pitch with no alpine character — same misclassification pattern as batch 1's "Alpine
  Lookout." Left to a human as a categorization call. Grade/FA/length couldn't be confirmed or
  refuted (MP page blocked from direct fetch); a claimed "2021 access dispute" also unconfirmed.
- Big Snow Mountain (both routes): the claimed FSR 56 washout at milepost 17.3 is corroborated
  by search results citing a USFS alerts page, but that page itself was blocked from direct
  fetch — treat as well-corroborated but not primary-source-verified (same caveat as batch 2's
  Bacon Peak flag).

Next batch will continue alphabetically from `wa_blood_sport` (see progress file).

---

## 2026-07-28 — Pass 1, Batch 4

Checked 10 routes across 8 peaks, continuing alphabetically: Bonanza Peak (Mary Green Glacier,
Northeast Buttress), Boston Peak (Southeast Face, Southwest Face), Prusik Peak (Boving-
Christensen), South Early Winters Spire (Boving Roofs), Buckner Mountain (North Face, Southwest
Face), Burgundy Spire (North Face), Cascade Peak (East Ridge).

**Confirmed errors → fixes in `sql/2026-07-28-batch-4.sql`:**
- Bonanza Peak (both routes): `access.land_manager` named a nonexistent "Chiwawa/Entiat Ranger
  Districts" — corrected to Chelan Ranger District, matching the rows' own other fields and USFS.
- Bonanza Peak Mary Green Glacier: FA climber misspelled "Curtis I. James" → "Curtis Ijames"
  (Mazamas' own 100-Year Index); a summit waypoint's rappel count ("three") contradicted the rest
  of the row ("four"); two waypoints had geometrically impossible coordinates, fixed using the
  sibling Northeast Buttress route's correct values for the same landmarks.
- Bonanza Peak Northeast Buttress: `rock_grade` "5.7" understated the route vs. its own overview
  ("5.7/5.8") and AAC sourcing.
- Boston Peak Southeast Face: `approach` described Sahale Peak's approach (Cascade Pass/Sahale
  Arm/Sahale Glacier Camp), not this route's — rewritten to match the row's own already-correct
  beta/itinerary/waypoints (direct Boston Basin approach from Cascade River Road).
- Boston Peak Southwest Face: wrong NPS entrance-pass claim (North Cascades charges none) and an
  unrealistic "45 minutes to hospital" figure, both corrected to match the sibling SE Face route.
- Prusik Peak Boving-Christensen: first waypoint's name/elevation was Snow Lakes Trailhead's data
  attached to Stuart Lake Trailhead's coordinates; summit waypoint elevation (7,916) contradicted
  the row's own high_point_ft (8,008); itinerary total-gain note (4,500 ft) contradicted its own
  day-by-day sum (5,200 ft).
- South Early Winters Spire Boving Roofs: `face` said "West face" against the row's own "SW"
  aspect; `rope_note` named the wrong descent (SW Couloir instead of the row's own documented
  South Arete/Rabbit Ears line).
- Buckner Mountain North Face: `commitment` "III" contradicted the row's own "Grade II" and
  Mountaineers.org.
- Buckner Mountain Southwest Face: `dist_km`/`gain_ft`/`loss_ft` (9.4/3000/3000) all contradicted
  the row's own itinerary sourcing and day-by-day sums (32.19 km / 7,400 ft); `obj_haz` listed a
  crevasse hazard the row's own (more recent) `seasonal_hazards` explicitly rules out.
- Burgundy Spire North Face: `pitches`/`length_m` (6/183) undercounted vs. the row's own 7-pitch
  detail array (sum 244m); a Northwest Forest Pass requirement was wrongly applied to a pullout
  the row's own access narrative doesn't include; `high_point_ft` (8,483) was corrected to 8,400
  to match the row's own waypoint and climbing-literature sourcing; a stale `corrections` note
  described a rack-size inconsistency that no longer exists in the row.
- Cascade Peak East Ridge: two waypoint elevations contradicted the row's own high_point_ft/
  approach text; top-level `grade` ("Class 4") contradicted the row's own "5.8" rock_grade.

**Flagged for human review (not auto-fixed — judgment calls or unverifiable):**
- **Cascade Peak East Ridge — most significant open issue.** The row's own `overview` says it
  was rewritten to describe Cascade Peak's real route (NW Chimney) after discovering the
  previous content actually described Johannesburg Mountain's East Ridge — but `aspect`, `face`,
  part of `approach`, the stale `corrections` blob, and a `seasonal_guidance` block were never
  updated to match. A half-corrected row; needs a human rewrite or split, not a field patch.
- **Boston Peak Southwest Face — second major issue.** Named/aspected as a Southwest Face route
  but its beta duplicates the sibling SE Face route almost verbatim, while its own `fa`/
  `corrections` fields describe the real West Face route (aspect W, 1956 FA, 2024 first winter
  ascent). Internally incoherent about which route it documents; needs a human rewrite or
  retirement decision.
- Boston Peak Southeast Face: an unverified "real fatality history" claim, and two minor (≤100
  ft) elevation/col discrepancies across sources.
- Bonanza Peak Mary Green Glacier: one waypoint ("Moat crossing") already self-flagged as
  corrupted; confirmed geometrically impossible but no authoritative replacement found.
- Bonanza Peak Northeast Buttress: possible `discipline`/`ice_grade` misclassification (no actual
  ice climbing described) — same pattern as prior batches' Alpine Lookout/Blood Sport flags.
- Prusik Peak Boving-Christensen: a pitch-length sum vs. total-length contradiction (can't tell
  which pitch is wrong); a 30%-vs-25% lottery walk-up figure conflict; a 12-vs-8 group-size figure
  that may describe two different legitimate scopes rather than an error; a 1-day lottery-season
  date discrepancy.
- South Early Winters Spire Boving Roofs: the route's `itinerary`/`timing` fields describe
  rappelling off after 3 pitches, contradicting the row's own descent fields (continue to the
  true summit) — direction confirmed and partly fixed above, but the full narrative/numeric
  rewrite needs human-researched replacement hours/mileage, not a guess. FA year, a trailhead
  elevation conflict, and one pitch length also unconfirmed.
- Buckner Mountain North Face: `approach`/itinerary narrative and `waypoints`/`gpx` describe two
  different, both-legitimate approaches to the same route — needs a human to pick one and align
  the row.
- Buckner Mountain Southwest Face: an "11th on the Bulger list" ranking and an "August 2025
  washout" claim couldn't be independently confirmed.
- Burgundy Spire North Face: elevation sourcing splits between climbing literature (8,400 ft,
  used above) and peak-database/LIDAR figures (8,492 ft) — a human should pick the convention.
  A waypoint note also contains leftover analyst commentary about an unrelated trailhead that
  doesn't correspond to anything else in the row.

Next batch will continue alphabetically from `wa_cascade_peak_east_ridge` (see progress file).

---

## 2026-07-28 — Pass 1, Batch 5

Checked 10 routes across 9 peaks, continuing alphabetically: Cathedral Peak/Pasayten (Southeast
Buttress), Chair Peak (North Face, Northeast Buttress), Chelan Butte (Chelan Butte Trail),
Chianti Spire (East Face/Rebel Yell), Chimney Rock (West Face/South Summit), Chiwawa Mountain
(Southwest Route), North Early Winters Spire (Chockstone Route), Unicorn Peak (Classic Route),
Lane Peak (Classic Route).

**Confirmed errors → fixes in `sql/2026-07-28-batch-5.sql`:**
- Chianti Spire East Face/Rebel Yell: `data_quality.gaps` still listed the `fa` and `rock_grade`
  fields as unresolved discrepancies "not editable via this schema" — but both fields on this
  same row already carry the corrected values (fa: Bebie/Nelson 1986, confirmed via Mountain
  Project/StephAbegg; rock_grade: 5.10b). Cleared the two stale gap entries.
- Chianti Spire East Face: `comms` named "Marblemount or North Bend" as closest services — both
  are far on the wrong side of the state; the row's own emergency section already correctly
  names Winthrop/Mazama (Methow Valley). Fixed to match.
- Chianti Spire East Face: `dist_km` (2.4) contradicted the row's own itinerary day-by-day
  mileage (7.8 mi round trip ≈ 12.55 km) by roughly 5x. Fixed to 12.55.
- Chianti Spire East Face: Burgundy Col waypoint had no elevation; the row's own itinerary text
  gives "~7,900 ft" for the same camp. Filled in.
- Chiwawa Mountain Southwest Route: `access.land_manager` named a nonexistent "Chiwawa/Entiat
  Ranger Districts" — the exact same error found and fixed for Bonanza Peak in batch 4. This
  row's own `emergency.rangerStation` and the real USFS alert page for this route's current road
  closure both correctly name the Wenatchee River Ranger District. Fixed to match.
- Chimney Rock West Face/South Summit: `descent_text` still claimed the Rappel Chimney bolts
  "were reportedly replaced for safety in 2001" — the row's own `rappel_detail`/
  `rappel_count_note` fields already flag this exact claim as unsupported for this Washington
  peak and likely misattributed from an unrelated, same-named Chimney Rock in North Idaho, and
  say it "should be dropped." Removed it from `descent_text`.
- Chimney Rock West Face/South Summit: `high_point_ft` (7,727 ft) matched the sibling East Face
  route's main/central-summit elevation, but this route's own name, waypoints, and approach text
  ("...the south peak rather than the main-summit gully used by the East Face") describe
  climbing Chimney Rock's separate, lower South Summit — confirmed via Wikipedia at 7,440 ft,
  matching this row's own summit waypoint exactly. Fixed `high_point_ft` and a conflated
  itinerary schedule label ("Main/South Summit at 7,727 ft") to 7,440 ft.
- Chimney Rock West Face/South Summit: `climate.forecastZone` ("NWAC Snoqualmie Pass zone")
  contradicted this same row's own `seasonal_hazards.avalanche.zone` ("Stevens Pass/East Slopes
  Central boundary... no NWAC zone precisely covers this peak"). Aligned the two.
- Unicorn Peak Classic Route: summit waypoint elevation (6,867 ft) contradicted the row's own
  `high_point_ft` (6,971 ft), Wikipedia's confirmed Unicorn Peak elevation, and all three other
  routes on the same peak in this catalog (cross-checked directly against the DB) — this route
  was the sole outlier. Fixed to 6,971 ft.
- Unicorn Peak Classic Route: `corrections`/`rope_note` flagged a "5.6 vs 5.4" grade discrepancy;
  checked directly against Mountain Project, which grades the Classic Route 5.4, matching this
  row's own `grade` field. Cleared the stale discrepancy note on both fields.
- Lane Peak Classic Route: itinerary day-1 note described a "saddle between Lane and Pinnacle,"
  but the row's own overview, approach text, and waypoint name ("Lane-Denman saddle") all
  consistently say Lane and Denman — Pinnacle Peak is a different, unrelated Tatoosh summit.
  Fixed the stray reference.
- Lane Peak Classic Route: `approach` claimed "roughly 2,000-2,400 ft of gain," contradicting the
  row's own `gain_ft` (1,400), itinerary `gainFt` (1,400), and its own waypoint elevations (net
  ~1,400-1,500 ft). Fixed the approach text to match.

**Flagged for human review (not auto-fixed — judgment calls or unverifiable):**
- Chianti Spire East Face: a "Chianti Spire / East Face (Rebel Yell) area" campsite/base
  waypoint shares byte-identical coordinates with the "Chianti Spire Summit" waypoint — clearly
  wrong (a route's base can't sit at its own summit), but no independent source was found for
  the true separate coordinates, so left for a human with a GPS track or topo.
- Chimney Rock West Face/South Summit: `access.notes` claims "avalanche control closures on
  I-90 affect access" — identical boilerplate to the Chair Peak/Alpental routes (I-90 Exit 52),
  but this route's actual trailhead (Pete Lake, via Cle Elum/Salmon La Sac Road/FR-46) is well
  east of the Snoqualmie Pass avalanche-control corridor. Likely template contamination but not
  fixed here since I-90 does technically reach Cle Elum; a human with local knowledge should
  confirm before rewording.
- Chair Peak North Face: `fa` credits a 4-person 1975 party (Kit Lewis, Charlie Hampson, Rob
  Harris, Greg Jacobson); available secondary sources (primary pages blocked from direct fetch
  this session) corroborate Kit Lewis and Robert Harris but don't mention Hampson or Jacobson —
  couldn't confirm or refute the full party without a primary source.

**Clean (no errors found):** Cathedral Peak Southeast Buttress, Chair Peak Northeast Buttress,
Chelan Butte Trail, and Chockstone Route (North Early Winters Spire) all checked out against
available sources (Wikipedia, Mountain Project/SummitPost search snippets, and prior enrichment
already on file) with no further issues this pass.

Next batch will continue alphabetically from `wa_classic_route_3` (see progress file).

---

## 2026-07-28 — Pass 1, Batch 6

Checked 10 routes: Colchuck Peak (Colchuck Glacier, Holsten-Hilden, North Buttress Couloir),
Colfax Peak (Cosley-Houston Couloir, Kimchi Suicide Volcano, Polish Route), Colonial Peak (West
Ridge/Colonial Glacier), Cutthroat Peak (Complete South Buttress), Concord Tower (North Face),
Corteo Peak (Southwest Ridge/Standard Route).

**Confirmed errors fixed (see `audits/sql/2026-07-28-batch-6.sql`):**
- Kimchi Suicide Volcano: top-level `grade`/`grade_system` were null despite this row's own
  `ice_grade` (AI4+) and `rock_grade` (M5) already being populated and verified (Colin Haley's
  trip report and AAC Publications both give "M5 R AI4+" for this exact route, and its length_m
  of 300 matches the sourced 300m/1,000 ft exactly). Every sibling route on Colfax Peak has a
  populated top-level grade built from its own ice/rock fields; Kimchi was the sole outlier.
  Filled `grade` from the row's own already-verified sub-fields.
- Colonial Peak West Ridge/Colonial Glacier: `corrections` claimed the parent area's elevation
  was still null and needed filling in, but `wa_colonial_peak.elevation_ft` is already 7771
  (matches Wikipedia/Peakbagger/PeakVisor and this route's own summit waypoint) — stale, already
  resolved. Removed that part of the note; kept the still-valid id/name-mismatch observation.
- Complete South Buttress (Cutthroat Peak): row's own `high_point_ft` (8066, Wikipedia's
  USGS-derived figure) contradicted its own summit waypoint (elevFt 8050, the older WTA/
  SummitPost figure) — same row, two elevations for the same summit. Aligned the waypoint to
  `high_point_ft`, matching the pattern of every other route in this batch where summit
  waypoint, `high_point_ft`, and the parent area's `elevation_ft` all agree.

**Flagged for human review (not auto-fixed — structural, not a field patch):**
- Colonial Peak: route id `wa_colonial_peak_northeast` doesn't match the route it actually
  documents — name, overview, `face`, and waypoints all consistently describe the "West Ridge /
  Colonial Glacier" line (the peak's standard/easiest route per Beckey), not a northeast-side
  line. The row already carried a self-flag noting this; left as-is per the same precedent set
  for `wa_big_kangaroo_southwest_rib` in batch 3 — an id rename needs a human decision, not a
  content-field fix.
- Corteo Peak: route id `wa_corteo_peak_southeast_face` has the same problem — name, overview,
  and beta all describe the "Southwest Ridge / Standard Route" (confirmed as the peak's standard
  line by the area's own blurb and Wikipedia's FA account), not a southeast face. Same
  id-rename-needs-a-human pattern as above; not auto-fixed.

**Clean (no errors found):** Colchuck Glacier, Holsten-Hilden, North Buttress Couloir (all three
Colchuck Peak routes — FA parties/dates for all three independently corroborated via SummitPost,
AAC Publications, and Mountain Project), Cosley-Houston Couloir and Polish Route on Colfax Peak,
and Concord Tower North Face (FA, grade, and elevation all check out; the peak's own
elevation-ambiguity note already covers the 7,560–7,612 ft source spread). Complete South
Buttress's 22-pitch count (vs. ~12–16 for the standard South Buttress it extends) is already
well-documented and cited in the row's own `data_quality`/`itinerary.sourceNote` fields
(SuperTopo's 22-pitch breakdown of the full/extended line) — not an error, despite initially
looking like an outlier against sources describing the shorter standard route.

Next batch will continue alphabetically from `wa_corteo_peak_southeast_face` (see progress file).

---

## 2026-07-28 — Pass 1, Batch 7

Checked 10 routes across 6 peaks: Crater Mountain (Standard Route), Crooked Thumb Peak (South
Route), Cutthroat Peak (Cauthorn-Wilson Couloir, Northeast Face, South Buttress Direct,
Southeast Buttress, South Buttress, West Ridge), Dark Peak (Dark Glacier Route), Sloan Peak
(Diamond In The Rough).

**Confirmed errors fixed (see `audits/sql/2026-07-28-batch-7.sql`):**
- Three Cutthroat Peak routes (Cauthorn-Wilson Couloir, Northeast Face, Southeast Buttress) had
  `high_point_ft` = 8050, an outlier matching no source found and contradicting each row's own
  summit waypoint (already 8066) and Wikipedia's 8,066 ft figure for the peak. A fourth route,
  South Buttress Direct, had the inverse mismatch — correct `high_point_ft` (8066) but a summit
  waypoint stamped 8050. All four aligned to 8066, matching the parent area's own elevation_ft
  (8065) and the two other Cutthroat routes in this batch (South Buttress, West Ridge) that were
  already internally consistent.
- Sloan Peak's area row blurb text read "Sloan Peak (7,839 ft)", contradicting its own
  `elevation_ft` column (7835) — which matches Wikipedia's figure exactly, and matches the area's
  own `prominence_ft` (3875) against Wikipedia too. Corrected the blurb's stale figure to 7,835 ft.

**Flagged for human review (not auto-fixed):**
- Crooked Thumb Peak South Route: three conflicting grades for the same summit headwall crux
  within a single row — `grade` says "5.8+ (or 5.2 A1)", `rock_grade` repeats that, but the
  summit waypoint's own note says "a 5.6 headwall," and `corrections` separately references a
  "Grade III-IV/5.6" rating. Sourcing for this remote, rarely-repeated Picket Range route
  (2 recorded ascents 18 years apart per the area's own blurb) is too sparse online to resolve
  which figure is right — the row's own `corrections` field already acknowledges thin sourcing.
- South Buttress Direct (`wa_cutthroat_peak_r1`) and South Buttress (`wa_cutthroat_south_buttress`)
  both appear to be the same real Beckey/Gordon-1958 route (5.8, III, ~850 ft, 12 pitches, per
  Mountain Project) entered twice under different route IDs and names — `r1`'s own `corrections`
  field admits it was "matched" to the same MP "South Buttress" listing the other row also
  describes, and no independent source for a separately-named "South Buttress Direct" was found.
  Flagging as a likely duplicate for a human merge/rename decision, not auto-fixed. (Distinct
  from Southeast Buttress, confirmed via Mountain Project/Mountaineers.org as a genuinely
  different line — twin-gully approach to a separate notch, not the same route under another name.)
- Dark Peak Dark Glacier Route: elevation given three different ways in three places — parent
  area `elevation_ft` = 8518, route `high_point_ft` = 8507, and the summit waypoint's own
  `elevFt` = 8504. External sources support both 8504 (Peakbagger, via search snippet) and 8507
  (a metric-to-feet conversion elsewhere), but no source was found supporting 8518, and
  Peakbagger's own page returned a 403 on direct fetch this session — flagging rather than
  guessing which of the three is authoritative.
- Cutthroat Peak Northeast Face: re-reviewed the row's pre-existing self-flagged note (no
  primary source uses "Northeast Face" for a Cutthroat Peak route; the data is borrowed from the
  well-documented "East Face" line) — still unresolved, still needs a human check against a
  Beckey guidebook or the original AAJ report before renaming.

**Clean (no errors found):** Crater Mountain Standard Route (elevation, waypoints, and approach
details all internally consistent and consistent with area data) and Cutthroat Peak West Ridge
(FA — Adam/Bedayn/Davis, July 22, 1937 — matches the parent area's own blurb almost verbatim,
and all elevation fields agree at 8066).

Next batch will continue alphabetically from `wa_diamond_in_the_rough` (see progress file).

## 2026-07-28 — Pass 1, Batch 8

Checked 10 routes across 6 peaks: Bear Mountain (Direct North Buttress), Dorado Needle (Direct
Southwest Buttress, East Ridge/Inspiration Glacier), Pernod Spire (Direct West Face), South Early
Winters Spire (Dolphin Chimney), Dome Peak (Dome Glacier), Dragontail Peak (Backbone Ridge, East
Ridge via Aasgard Pass, Hidden Couloir, Gerber-Sink).

**Confirmed errors fixed (see `audits/sql/2026-07-28-batch-8.sql`):**
- Bear Mountain's Direct North Buttress had the most significant errors this pass: `fa`,
  `pitches`, `length_m`, `commitment`, and `season` all conflicted with the row's own
  `overview`/`beta` prose and with AAC Publications/Steph Abegg/Mountain Project — the row looks
  like it was populated with data from a different route or ascent record. It stored a 2016
  party as the FA (that's a repeat ascent — the real FA was Alan Kearney and Bobby Knight,
  September 1980, freed by Bryan Burdo and Yann Merrand in 1985) and stored 5 pitches/274m/Grade
  IV/winter-ice season instead of the real 21 pitches/~670m/Grade V/summer-rock (Jul-Sep). Also
  fixed a mislabeled entrance-fee claim on the same row — North Cascades NP charges no entrance
  fee; the real requirement there is a USFS Northwest Forest Pass at the Hannegan Pass trailhead.
- Dome Peak's Dome Glacier route had two copy-paste artifacts: a hazard note naming "Chelan
  County" (Dome Peak is actually in Skagit County, confirmed via Wikipedia and the row's own
  `emergency.county` field) and a parking-pass note naming the "Mountain Loop Highway" corridor
  (the route's own `access.fees` field already correctly names Downey Creek Trailhead, a
  different Darrington-RD corridor).
- Two internal self-contradictions: Dorado Needle's Direct Southwest Buttress had a top-level
  `gain_ft`/`loss_ft` of 7000/7000 that disagreed with its own `itinerary.days` breakdown and
  `totalNote` (~7,200 ft) — aligned to the more granular figure. Dolphin Chimney (SEWS) had a
  top-level `gain_ft` of 2100 that disagreed with its own nested `itinerary.days[0].gainFt`
  (2200) for the identical day — aligned to the nested figure.
- Dorado Needle's East Ridge/Inspiration Glacier had a stale "permit is free" claim; NPS now
  charges a $10/person + $6 reservation fee for backcountry permits park-wide, already correctly
  reflected on the sibling Direct Southwest Buttress route on the same peak.
- Pernod Spire's Direct West Face had `commitment` = "III" contradicting its own `overview` text
  ("an 8-pitch III/IV 5.10+ R line"); the FA report (AAJ, Bentley/Peritore 2006) also gives
  III/IV.
- Dragontail Peak's Gerber-Sink had its own summit waypoint stamped 8,841 ft, one foot off from
  its own `high_point_ft` (8,840), the parent area's `elevation_ft` (8,840), and every sibling
  route's summit waypoint (also 8,840) — aligned to 8,840.

**New pattern — likely duplicate route rows (not auto-fixed, flagged for human merge/delete):**
- `wa_dragontail_peak_backbone_ridge` and the separate row `wa_backbone_ridge` appear to be the
  same real route (Backbone Ridge, Dragontail Peak) entered twice under two different IDs — same
  name, same FA (Bonneville/Weigelt 1970, Fin Direct variation Cruver/Lewis 1975) worded almost
  identically in both rows; one is a thin stub, the other fully enriched.
- Same pattern: `wa_dragontail_peak_r4` and `wa_dragontail_peak_triple_couloirs`, both named
  "Triple Couloirs" with the identical FA (Joiner/Nelson/Seman, May 1974).
- This is distinct from (but the same family as) the id/name-mismatch flags in earlier batches
  (`wa_big_kangaroo_southwest_rib`, `wa_colonial_peak_northeast`, `wa_corteo_peak_southeast_face`,
  `wa_cutthroat_peak_r1`/`wa_cutthroat_south_buttress`) — here the rows are full duplicates of
  each other, not a single mislabeled id.

**Flagged for human review (not auto-fixed):**
- Bear Mountain Direct North Buttress: a `face` note referencing "Gerber-Sink" (no such named
  feature found near Bear Mountain in any source) and an `ice_grade` of WI5+ on what every source
  confirms is a summer rock route — both look like further contamination from another route's
  data, but no source was found to confirm a correct replacement value.
- Dome Peak: the route's own `high_point_ft` (8,920) vs. the parent area's `elevation_ft` (8,926)
  — a genuine source conflict (Wikipedia/Mountaineers.org/peakery say ~8,920+ vs. listsofjohn.com
  LiDAR at 8,926), not a two-summit height difference; couldn't confirm which figure is right.
- Dorado Needle's Direct Southwest Buttress: a `rope_note` describing "Grade III+" that appears
  copy-pasted from the standard (non-Direct) Southwest Buttress it's a harder variant of, while
  `alpine_grade`/`commitment` say "III" — unclear which grade belongs to which line.
- Dolphin Chimney (SEWS): descent/rappel detail (via "Rabbit Ears," 3 raps) only weakly
  corroborated, and even the corrected `gain_ft` (2200) is still below the ~2,607 ft implied by
  the route's own trailhead/summit waypoints — flagging for a human to re-derive from a GPX/topo
  rather than guessing further.

**Clean (no errors found):** Dragontail Peak's Backbone Ridge (aside from the duplicate-ID flag
above), East Ridge via Aasgard Pass, and Hidden Couloir (FA, grades, coordinates, permit/lottery
details, and approach descriptions all corroborated against USFS/Mountaineers/guidebook sources).

---

## 2026-07-28 — Pass 1, Batch 9

Checked 10 routes: Dragontail Peak's Pandora's Box, Triple Couloirs (r4), Serpentine Arête, and
the separate Triple Couloirs row (`wa_dragontail_peak_triple_couloirs`); Witches Tower (E/SE
Face); Chimney Rock (East Face); East McMillan Spire (West Ridge/Southwest Face); Snowking
Mountain (East Ridge); Silver Star Mountain/Okanogan (East Ridge); Inspiration Peak (East Ridge).

**Confirmed errors → fixes in `sql/2026-07-28-batch-9.sql`:**
- **Pandora's Box** (`wa_dragontail_peak_r3`) — the biggest find this batch. A prior 2026-07-15
  enrichment pass rewrote the route's *prose* to correctly describe it as a moderate, unroped,
  SW-facing snow/scramble couloir, but never touched the *structured* fields, which still
  described the debunked fabricated WI6 ice/mixed route it replaced. Fixed 8 self-contradicting
  fields: grade_system/grade_num (was asserting WI6), disciplines (dropped ice/mixed), pitches
  and pitch_detail (dropped an invented 7-pitch "M5 R" crux), rappels (dropped a rappel that
  contradicted the route's own bail/descent_text fields), obj_haz (dropped a fabricated "R-rated
  crux"), climate (was framed as a primary winter ice route, contradicting its own May-Jul
  season), and approach/timing/itinerary text (dropped a self-contradictory "Northeast Couloir"
  label on what its own `aspect` field already correctly calls SW-facing).
- **Triple Couloirs** (`wa_dragontail_peak_r4`) — fixed 3 "Asgard Pass" → "Aasgard Pass"
  misspellings (descent/descent_text/bail), and fixed `alpine_grade` "IV" → "D" to match the
  column's documented French-adjectival format (see note below).
- **Serpentine Arête** — its own waypoints/gpx arrays carried two conflicting entries for
  "Aasgard Pass"; fixed the one used in the primary route line to match Wikipedia/GNIS
  coordinates, which the record's *other* (unused) Aasgard Pass entry already matched.
- **E/SE Face** (Witches Tower) — dist_km and gain_ft both contradicted the record's own
  itinerary block; corrected to match (24.14 km / 5,700 ft, per the record's own day-by-day
  breakdown and totalNote).
- **East McMillan Spire** (West Ridge/Southwest Face) — gain_ft (5,835) didn't match loss_ft
  (8,500) despite being a car-to-car out-and-back; corrected to 8,500.
- **Snowking Mountain** (East Ridge) — same NPS-vs-Forest-Service copy-paste pattern as batch 8's
  Bear Mountain fix: `access.land_manager`/`notes`/`rules` wrongly carried North Cascades NP
  boilerplate (Boston Basin lottery, bear canisters) on a Mount Baker-Snoqualmie NF route,
  contradicting this same record's own `access.landManager` and `emergency.notes` fields. Also
  fixed a beta/pitch_detail claim that the route crosses the Snowking Glacier, contradicting the
  record's own overview (which three times calls this the "non-glaciated" line), and two stale
  "7,439 ft" itinerary mentions that were never updated after the record's own corrections field
  resolved the summit to 7,433 ft.
- **Inspiration Peak** (East Ridge) — `fa` said "...1959"; the record's own overview/corrections
  fields already state the climb happened in October 1958 (the AAJ report was merely *published*
  in 1959), confirmed via AAC Publications/Peak of the Week — only the `fa` field itself was
  never updated.

**One proposed fix reviewed and rejected:** an audit agent recommended changing
`wa_dragontail_peak_triple_couloirs.alpine_grade` from "D" to "IV," citing sources that grade the
route "Grade IV" — but that's the NCCS commitment grade, and `alpine_grade` is documented in
`supabase/migrations/0006_composite_grades.sql` as the French adjectival scale (F/PD/AD/D/TD/ED).
"D" is the schema-correct value; the fix was applied in the opposite direction instead, to r4
(see above), whose alpine_grade wrongly held "IV".

**Duplicate confirmed, still unresolved:** `wa_dragontail_peak_r4` and
`wa_dragontail_peak_triple_couloirs` — flagged as a likely duplicate in batch 8 — were both
directly audited this batch and independently reconfirmed as the same real route (identical FA,
pitch count, length) stored under two IDs from what look like two separate enrichment passes.
Still needs a human merge/delete decision, not an automated fix.

**Flagged, not fixed:**
- **E/SE Face** (Witches Tower) — descent_text/itinerary describe a mandatory roped "5.6" pitch
  that contradicts the record's own grade fields ("4th class"). The record's own sourceNote
  admits no trip report exists for "E/SE Face" by that name and that timing was extrapolated in
  part from Witches Tower's separate, real "Southeast Face" route (a documented one-pitch 5.6
  line) — content from that different route appears to have bled into this one. Needs a human
  rewrite or a route split, not a value patch.
- **Silver Star Mountain/Okanogan** (East Ridge) — no confirmed fixes at all. The record's own
  `approach`/`beta` text names a Cedar Creek trailhead near Mazama, but its own `waypoints` start
  at a different, named Silver Star Creek trailhead — a strong internal inconsistency suggesting
  two distinct real routes (an easier Cedar-Creek-approached "SE Face & E Ridge" vs. the harder,
  Silver-Star-Creek-approached full ridge line) were merged into one record. Every verification
  source (SummitPost, Mountain Project, the Northwest Mountaineering Journal) returned HTTP 403
  during this run, so this is entirely flagged for a human with guidebook/primary-source access
  rather than resolved from search snippets.
- Also flagged, lower priority: pitch-count ambiguities on Serpentine Arête, both Triple
  Couloirs rows, and Inspiration Peak (guidebook sources vary and don't clearly contradict the
  stored value); an FA-attribution gap on East McMillan Spire (sources confirm the Beckeys'
  1940 McMillan-group activity but not an East-summit-specific FA); and a Cyclone Lake camp
  elevation mismatch on Snowking Mountain.

**Clean (no errors found):** Chimney Rock's East Face — correctly avoided the
summit/sub-peak-elevation mismatch found on its sibling West Face route back in batch 5.

Next batch will continue alphabetically from `wa_east_ridge_4` (see progress file).

---

## 2026-07-28 — Pass 1, Batch 10

Checked 10 routes across 6 peaks: Mount Thomson (East Ridge), Pinnacle Peak/Tatoosh (East
Ridge), Primus Peak (East Slope), East Twin Needle (South Route, Thread of Ice), Eldorado Peak
(East Ridge/Inspiration Glacier, Northwest Couloir/Eldorado Glacier, Northeast Face, West
Arete), Elephant Butte (Standard Route/Stetattle-Sourdough Ridge).

**Confirmed errors → fixes in `sql/2026-07-28-batch-10.sql`:**
- Elephant Butte (area row): `elevation_ft` (7384) and `prominence_ft` (1122) both disagreed
  with Wikipedia (7,380 ft / 1,060 ft) — the area's own blurb text already correctly describes
  "about 5,200 ft of relief in roughly one mile" above McMillan Creek, matching Wikipedia's
  prominence writeup, and the route on this peak already stores the correct 7,380 ft in its own
  `high_point_ft` and summit waypoint. The area row was the sole outlier; fixed
  `elevation_ft`/`prominence_ft` and a stale "7,384-foot" figure in the blurb to match.
- Eldorado Peak East Ridge/Inspiration Glacier: `high_point_ft` (8876) was the sole outlier
  against Wikipedia's 8,872.9 ft figure, this peak's own `area.elevation_ft` (8872), and all
  three other Eldorado Peak routes audited this batch (all already 8872) — one of which
  (Northeast Face) already carries a `corrections` note settling this exact 8872/8876/8868
  source spread. Fixed to 8872.
- Thread of Ice (East Twin Needle): top-level `grade` was null despite `grade_system`/`grade_num`
  (yds/7) already matching this row's own `rock_grade` (5.7) — same pattern as batch 6's Kimchi
  Suicide Volcano fix. Filled `grade` = '5.7' to match the row's own verified sub-fields and the
  "5.X" convention used by every other yds-graded route in this catalog.

**Flagged for human review (not auto-fixed — judgment calls or unverifiable):**
- **East Twin Needle South Route — most significant open issue.** The row's own top-level
  `grade` ("Grade III, 5.7") self-contradicts its own `rock_grade` (5.10a), `commitment` (II),
  and even its own `beta` text, which quotes the FA account directly: "It is graded II 5.10a."
  A web search turned up only one documented technical line on this peak from the cited 2003
  Wallace/Haley/Bunker enchainment — a Southeast Ridge/Face rated II 5.10a — and no
  independently-documented, distinctly-named 5.7 "South Route." This matches the row's own
  pre-existing `corrections`/`data_quality` self-flags (already present before this audit) that
  call the 5.7-vs-5.10a naming a genuine unresolved question. Left unfixed rather than guessing
  which value should win, following the same precedent as prior batches' route-identity flags
  (Apex Buttress, Argonaut Peak NE Ridge, Colonial Peak, Corteo Peak, Cutthroat Peak r1).
- Thread of Ice: `ice_grade` (AI2) vs. a secondary source snippet referencing "AI3" for the same
  route — couldn't confirm either figure directly; SummitPost, the AAC Publications page, and
  the original CascadeClimbers.com trip report all returned HTTP 403 on direct fetch this
  session. FA (Steph Abegg and Wayne Wallace, June 27, 2009) and the route's general
  description (north-side couloir between the Twin Needles) were independently corroborated via
  search snippets of those same blocked sources.
- Mount Thomson East Ridge: `gain_ft` (3600) and `loss_ft` (4900) disagree by ~1,300 ft for what
  the row describes as a straightforward out-and-back (ascend and descend the same East Ridge/
  Bumblebee Pass line) — cumulative gain and loss should be equal on a retraced out-and-back.
  No authoritative source with a precise track was found to determine which figure (if either)
  is correct, so left flagged rather than guessed.

**Clean (no errors found):** Pinnacle Peak East Ridge (elevation, grade, and the row's own
pre-existing id-vs-grade correction note all check out), Primus Peak East Slope (elevation
matches Wikipedia/Bulger-list figures and the area's own data), and three of the four Eldorado
Peak routes — Northwest Couloir/Eldorado Glacier (its 8-pitch/480m stats match a SummitPost
description of "eight 60m pitches" almost exactly), Northeast Face (elevation already correctly
fixed in a prior pass), and West Arete (pitch count/length already reconciled via its own
`corrections` note).

Next batch will continue alphabetically from `wa_elephant_head_standard` (see progress file).

---

## 2026-07-29 — Pass 1, Batch 11

Checked 10 routes across 7 peaks: Elephant Head (Standard Route), Prusik Peak (Energizer
Bunny), Sloan Peak (Fire on the Mountain), Vesper Peak (Fish & Whistle), Flora Mountain
(Southwest Slope), North Early Winters Spire (Flycatcher Buttress), Forbidden Peak (East
Face/Catscratch, East Ridge, East Ridge Direct, North Ridge).

**Confirmed errors → fixes in `sql/2026-07-29-batch-11.sql`:**
- Forbidden Peak North Ridge: `high_point_ft` stored 10,781 ft, which isn't Forbidden Peak at
  all — the route's own summit waypoint (8,815 ft), the parent area row, and all three other
  Forbidden Peak routes in this batch agree on 8,815 ft. Fixed to 8,815.
- Forbidden Peak North Ridge: `grade_num` stored 3 against its own `grade` ("Grade III, 5.6")
  and `rock_grade` ("5.6") — looks like the "III" commitment token got read as the number
  instead of the YDS grade, inconsistent with how every other route in this batch populates
  `grade_num` (digits after "5."). Fixed to 6.

**Flagged for human review (not auto-fixed — judgment calls or unverifiable):**
- **Forbidden Peak East Ridge vs. East Ridge Direct — likely duplicate routes.** Same FA party
  (Beckey/Hieb/Cooper/Claunch, 1958), same grade (5.8/5.8-), same pitch count (6), and East
  Ridge's own `overview` text literally opens with "This is Forbidden's East Ridge Direct...".
  East Ridge's own `data_quality` field already states: "no separate, easier 'East Ridge'
  (non-direct) named route on Forbidden could be verified... the two catalog entries should
  probably be reconciled/deduplicated." Left unfixed — merging/deleting a duplicate route row
  is a human decision, and outside this audit's guardrails (no deletes).
- Forbidden Peak East Face/Catscratch: this row's own `corrections` field already documents
  that the name conflates two unrelated Forbidden Peak features — "Catscratch" (Cat Scratch
  Gullies) is a class-4 approach to the **West** Ridge notch, not an east-side route, while the
  content actually describes the "East Ledges" line. The stored technical grade fields
  (`rock_grade` 5.9, `grade_num` 9, `alpine_grade` D) also don't match the class-4 terrain the
  row's own `beta` describes. Needs a human call on renaming/re-grading/splitting rather than a
  single-field fix.
- Fire on the Mountain (Sloan Peak): three disagreeing length/pitch figures on one row —
  `pitch_detail` entries sum to 380 m, `beta` text says "1,100 ft (333 m)", and the stored
  `length_m` is 457 m; `pitches` is 8 but the `overview` text says 7. Already partly
  self-flagged in `data_quality` ("some sources cite 8 pitches instead of 7"). No authoritative
  source found to settle which figure is right, so left flagged rather than guessed.
- Elephant Head Standard Route: `fa` reads "Jim Nelson, August 6, 1982 (Northwest Ridge)", but
  this row's `beta`/`overview`/`approach` describe a Dana Glacier line, not a Northwest Ridge —
  and the row's own `data_quality` gap says no FA history was actually found for Elephant Head
  itself. The FA looks like it may belong to a different line/peak. Left flagged; no reliable
  source found to confirm or replace it.

**Clean (no errors found):** Energizer Bunny (Prusik Peak — FA, grade, and rack details
cross-check against the route's own trip-report-sourced data with no contradictions), Fish &
Whistle (Vesper Peak), Flora Mountain Southwest Slope (elevation already correctly fixed in a
prior pass, per its own `corrections` note), Flycatcher Buttress (North Early Winters Spire —
rack/grade/pitch count verified against Mountain Project per its own `corrections` field), and
Forbidden Peak East Ridge Direct (internally consistent on its own; the duplication concern
above is attributed to the sibling `wa_forbidden_peak_east_ridge` row, not this one).

Next batch will continue alphabetically from `wa_forbidden_peak_northeast_face` (see progress
file).

---

## 2026-07-31 — Pass 1, Batch 31

Checked 10 routes across 3 peaks: Mount Seattle (Seattle Creek Basin Route), Mount Sefrit
(Bloody Head Couloir, Southwest Ridge), Mount Shuksan (Beckey-Schmidtke, Fisher Chimneys,
Hanging Glacier, North Face, Northwest Arete, Price Glacier, Sulphide Glacier).

**Confirmed errors → fixes in `sql/2026-07-31-batch-31.sql` (8):**
- **North Face and Price Glacier (Mount Shuksan)** both had the batch's biggest find: a
  "Heliotrope Ridge Trailhead" waypoint (48.795,-121.66) — externally confirmed (WTA/USFS)
  that this is Mount **Baker's** Coleman/Deming Glacier trailhead, an entirely different
  mountain, contradicting each route's own `approach`/`approach_logistics`/`road` text.
  Fixed both using already-correct sibling waypoints on the same peak: Hanging Glacier's
  own prior-corrected "White Salmon Road (hairpin) TH" for North Face, and
  Beckey-Schmidtke's "Nooksack Cirque Trailhead" for Price Glacier (Beckey-Schmidtke's own
  approach text explicitly says it shares Price Glacier's trailhead).
- **Fisher Chimneys** had the same pattern one route over: its "Lake Ann Trailhead" waypoint
  (48.805,-121.66, 2800 ft) didn't match its own already-correct `approach_logistics`
  coordinates/elevation (48.8500241,-121.6861633, 4,770 ft) or the externally-confirmed real
  Lake Ann Trailhead (~4,700 ft, Austin Pass on SR 542) — fixed to match.
- **Northwest Arete's** `approach`/`approach_logistics` prose described the wrong side of the
  mountain entirely (Nooksack Cirque Trail, the side shared by Price Glacier/Beckey-Schmidtke)
  contradicting its own `face`/`road`/`waypoints` fields (all White Salmon side). Confirmed via
  SummitPost's Northwest Arete page ("begin by parking at the lower White Salmon lodge...
  following a dirt road up the White Salmon drainage") and rewrote the approach text plus the
  structured trailhead fields to match.
- **Fisher Chimneys** also had a real rendering bug, not just a data error: `watch_out` was
  stored as one newline-joined string instead of a JSON array like every other route.
  `lib/db.js`'s `toArr()` only splits strings on commas, not newlines (confirmed by reading the
  app's own parsing code — read-only, no app code touched), so the app would have rendered all
  12 items as a single run-on bullet. Converted to a proper 12-item JSON array.
- Confirmed the "Mount Tom area, North Cascades" DB-wide junk clause (first identified in batch
  15, affecting 35 routes) on 3 more routes this batch (Hanging Glacier, Price Glacier, Sulphide
  Glacier `access.notes`) and stripped it from all three.
- **Mount Sefrit Southwest Ridge**: `fa` stored the mountain's 1930 FA (Jim Irving & Brick
  Spouse), but the row's own `corrections` field already explains this route-level `fa` should
  be left null since no source confirms the 1930 ascent was specifically this line — the
  decision was written down but never applied to the column. Cleared to match, same
  never-propagated-correction pattern as batches 12/15/30.
- **Mount Seattle Seattle Creek Basin Route**: `grade`/`grade_system`/`grade_num`/`disciplines`
  were all null despite its own beta text already citing "Route 3, Grade I, Class 3" — the same
  bug already fixed on this peak's own sibling Noyes Basin Route in batch 30. Filled the same
  way.

**Externally corroborated, left untouched:** Beckey-Schmidtke's FA (Fred Beckey & Clifford
Schmidtke, July 5 1946) and Price Glacier's FA (Beckey, Jack Schwabland, Bill Granston, 1945)
were both independently confirmed (AAC/Alpine Journal 1947 account, Wikipedia). Mount Shuksan
(9,131 ft) and Nooksack Tower (8,285 ft) elevations both check out exactly against Wikipedia.

**Flagged for human review (3):**
- Mount Seattle's area `prominence_ft` (758) sits between two external figures found this pass
  (Wikipedia 726 ft vs. PeakVisor ~768 ft) — not a clear outlier against either and no
  DB-internal contradiction, so left as-is.
- `grade_num` handling for Class-4-labeled routes is inconsistent within this single batch:
  Sefrit's Southwest Ridge stores `grade_num=4` for "Class 4" while Fisher Chimneys and Sulphide
  Glacier both store `grade_num=0` for their own "Class 4" component. No schema documentation
  settles which convention is correct, and it isn't a self-contradiction within any one row —
  left unfixed, worth a dedicated pass to establish the intended DB-wide convention.
- The recurring alpine_grade-holds-a-Roman-numeral-instead-of-a-French-adjectival-letter bug
  (flagged in batches 9/19/21/23/25/29) affects 3 of this batch's routes (Beckey-Schmidtke "IV",
  Price Glacier "IV", North Face "II-III"). Checked available sources for Price Glacier
  specifically (SummitPost, search snippets of Nelson/Potterfield) and found only NCCS/YDS/ice
  grades cited, no French adjectival letter — consistent with batch 29's finding that PNW
  glacier/alpine routes usually aren't assigned one. Left unfixed rather than guess.

**Clean (no errors found):** Bloody Head Couloir (Mount Sefrit) — FA, grades, hazards, and
approach beta all internally consistent and consistent with available sources.

Next batch will continue alphabetically after `wa_mount_shuksan_sulphide_glacier` (see progress
file).

---

## 2026-07-29 — Pass 1, Batch 12

Checked 10 routes across 5 peaks: Forbidden Peak (Northeast Face, Northwest Face, West Ridge),
Fortress Mountain (East Ridge, Northeast Face, Southwest Face), Fortune Peak (East Slope,
Standard Route), South Early Winters Spire (Free Mojo), Frenzel Spitz (South Route).

**Confirmed errors → fixes in `sql/2026-07-29-batch-12.sql`:**
- Forbidden Peak Northeast Face: `fa` stored the FA party/year of a completely different route
  (Beckey/Burgner/Nephew, 1972 — confirmed via Mountain Project/SummitPost/stephabegg.com to be
  Dragontail Peak's Northeast Buttress, 1971). This row's own account is the 1961 AAJ report by
  Ed Cooper and Stuart Ferguson, whose pitch-by-pitch description (300 ft grade III to a 300 ft
  50° ice patch, then 600 ft of easier upslab rock) matches this row's own `pitch_detail` almost
  verbatim. Fixed to Cooper/Ferguson; exact year (1960 vs 1961) is inferred from the AAJ volume's
  publication cycle and noted as not independently reconfirmed to the day.
- Forbidden Peak Northeast Face: `grade_num` (7, implying 5.7 YDS) contradicted its own
  `rock_grade` ("Class 3-4", no 5th-class rock at all) — 7 exactly matches the misattributed
  Dragontail route's own YDS grade (5.7), confirming it's the same contamination as the FA fix
  above rather than a real value. Cleared to null; no sourced YDS class exists to fill in its
  place.
- Fortress Mountain: elevation is a genuine two-source conflict (Wikipedia 8,679 ft vs.
  Peakbagger/ListsOfJohn 8,684 ft). The East Ridge route's own `corrections` field already
  researched this and settled on 8,679 ft, but the area row and all three routes actually stored
  8,684 ft, contradicting that already-recorded decision. Fixed `areas.elevation_ft` and all
  three routes' `high_point_ft` (plus two stale waypoint elevations) to 8,679 ft to match.
- Fortress Mountain, all three routes: `access.land_manager` named a nonexistent "Chiwawa/Entiat
  Ranger Districts" — the same repeated error already fixed for neighboring Bonanza Peak (batch
  4) and Chiwawa Mountain (batch 5), both on the same Trinity Trailhead corridor. Each row's own
  `access.landManager` (camelCase) field already correctly said "Wenatchee River Ranger
  District"; aligned `land_manager` to match.
- Fortune Peak, both routes: `access.land_manager` named "Mt. Baker-Snoqualmie National Forest
  (Snoqualmie Ranger District)" — wrong forest entirely. USFS trail pages for the Esmeralda
  Basin/Ingalls Way approach confirm Okanogan-Wenatchee National Forest, Cle Elum Ranger
  District, matching each row's own `landManager` field already on file. Fixed to match.
- Fortune Peak East Slope: `corrections` claimed the area's parent was mismatched as "Snoqualmie
  Pass" and referenced a nonexistent `hierarchyNote` field — but the area's actual parent/path is
  already correctly Teanaway/Ingalls (confirmed via Wikipedia), so the claim is a stale leftover
  describing an already-resolved problem. Trimmed the note so it no longer contradicts the row's
  own (correct) area placement.

**Flagged for human review (not auto-fixed — judgment calls or unverifiable):**
- Fortress Mountain Northeast Face: this row's own `corrections` field already documents that
  every source found (SummitPost, CascadeClimbers, Country Highpoints) calls this line the
  "Northeast Ridge," not a standalone "Northeast Face" — same id/name-conflation pattern flagged
  for other peaks in prior batches (Big Kangaroo, Colonial Peak, Corteo Peak). Left unfixed; a
  rename is a human decision, not a field patch.
- Frenzel Spitz South Route: top-level `grade` reads "Grade III, 5.6" but the separate
  `commitment` field stores "II" — an internal conflict this audit couldn't resolve. Sourcing for
  this very remote Southern Pickets route is thin (this row's own `data_quality` already flags
  "no route-specific... writeup... found"); the FA party/date (Cooper, Denny, Firey, Firey,
  Whitmore — Sept 10, 1961) checked out exactly against an independent source, but no source with
  a specific commitment grade for this line was found. Left flagged rather than guessed.

**Clean (no errors found):** Forbidden Peak Northwest Face (FA, pitch-by-pitch description, and
IV 5.8 grade all independently confirmed against Beckey's own account and multiple trip
reports), Forbidden Peak West Ridge (already high-confidence per its own `data_quality`, no
contradictions found), Free Mojo / South Early Winters Spire (FA confirmed as Blake Herrington
and Graham Zimmerman via Herrington's own blog), Fortune Peak Standard Route (elevation,
approach, and hazards all internally consistent and match Wikipedia/WTA).

Next batch will continue alphabetically from `wa_frying_pan_whitman_glaciers` (see progress
file).

---

## 2026-07-29 — Pass 1, Batch 13

Checked 10 routes across 4 peaks: Little Tahoma (Frying Pan/Whitman Glaciers), Ghost Peak
(South Route), Gilbert Peak (Meade Glacier, West Route), and Glacier Peak (Cool Glacier/Gerdine
Ridge, Disappointment Cleaver/Sitkum Glacier, Disappointment Peak Cleaver, Frostbite Ridge,
Kennedy Glacier, Sitkum Glacier).

**Confirmed errors → fixes in `sql/2026-07-29-batch-13.sql`:**
- Glacier Peak's own area blurb notes the White Chuck Road (FR-23) has been closed since
  December 2024 flood damage, and three of this peak's five routes correctly say the same —
  but `wa_glacier_peak_disappointment_cleaver` said the closure was "since Dec 2025," an outlier
  against those three sibling rows. Confirmed via the real USFS closure order (fsr-23-and-fsr-27
  -closure-order, effective March 19 2025 – Dec 31 2025 for flood damage from the *preceding*
  December, i.e. 2024) that the correct year is 2024; fixed `access.closures` and
  `road.driveNote`. Note for whoever reviews this: a real, separate, much bigger storm did hit
  the North Cascades in December 2025 and washed out the Suiattle River Road (FSR 26) at MP 4.5
  — that's the correct basis for this same route's *other*, unrelated "extremely limited access
  as of April 2026" note elsewhere in the row, which was left alone since it checks out. Only
  the White-Chuck-Road-specific date was wrong.
- Two Glacier Peak routes (Cool Glacier/Gerdine Ridge, Disappointment Peak Cleaver) misspelled
  1897 first-ascent USGS surveyor A. H. Dubor's name as "Dubois" — Wikipedia's Glacier Peak
  article and this peak's other two routes in this same batch both spell it "Dubor" correctly.
  Fixed both to match.
- Frostbite Ridge's own summit waypoint stored 10,550 ft for Glacier Peak, while its own
  `high_point_ft`, the area's `elevation_ft`, and every other Glacier Peak route's summit
  waypoint in this batch all say 10,541 ft — sole outlier, fixed.
- Gilbert Peak Meade Glacier's own `corrections` field claimed the route used the 8,201 ft
  benchmark elevation, but the actual stored `high_point_ft` is 8,184 ft (correctly matching
  Wikipedia/USGS and the area's own `elevation_ft`) — the note didn't describe what was actually
  stored. Rewrote the note to say 8,184 ft was used, keeping the benchmark discrepancy on record
  for reference; did not change the elevation itself since it already matches the
  higher-confidence source.

**Flagged for human review (not auto-fixed):**
- `wa_glacier_peak_disappointment_cleaver`'s own `corrections` field already documents that this
  listing's name conflates two distinct, separately-cataloged routes ("Disappointment (Peak)
  Cleaver" and "Sitkum Glacier") and recommends a rename/split — a naming decision, not a fact
  to patch, left as-is per guardrails.

**Independently confirmed (already self-flagged, not new):** `wa_frying_pan_whitman_glaciers`'s
own `data_quality` note already flags it as a likely duplicate of the separate
`wa_little_tahoma_east_shoulder` row; pulled that row directly and confirmed identical FA and
summit elevation, corroborating the existing flag rather than raising a new one.

**Clean (no errors found):** Ghost Peak South Route (elevation ~8,000 ft and FA party/date both
confirmed against Wikipedia; the route's own low-confidence self-rating and thin sourcing were
already honestly disclosed in its own `data_quality`/`corrections` fields), Gilbert Peak West
Route (elevation and area placement check out; its own ambiguity note about which trailhead
"West Route" refers to was already flagged and is a judgment call, not a factual error), Glacier
Peak's 1897 Gerdine-party FA date/personnel (Wikipedia confirms 1897, matching every route on
the peak).

Next batch will continue alphabetically from `wa_goat_mountain_south_ridge` (see progress
file).

---

## 2026-07-29 — Pass 1, Batch 14

Checked 10 routes across 7 peaks: Goat Mountain (South Ridge), Golden Horn (North Face),
Mount Goode (Megalodon Ridge, Northeast Face, Southwest Couloir), Mount Stuart (Gorillas
Direct), Gunnshy Peak (Standard Route), Gunsight Peak (Standard Route), and Guye Peak
(Improbable Traverse, West Face/r1).

**Confirmed errors → fixes in `sql/2026-07-29-batch-14.sql`:**
- Megalodon Ridge's own `fa` field claimed a 2008 first-ascent date ("primary AAC/Alpinist
  coverage confirms 2008"), contradicting its own `overview`/`beta` text and the Mount Goode
  area blurb, both of which correctly say 2007. Verified externally (Alpinist's contemporaneous
  2007 newswire piece and Climbing.com's "Megalodon Man" account) that the climb happened
  September 6, 2007 — the "2008" on file was the American Alpine Journal's publication year for
  its writeup (AAJ annuals report on the prior season), not the ascent year. Fixed the `fa`
  field to match the row's own already-correct overview/beta and the area blurb.
- The Mount Goode area blurb misspelled 1936 first-ascent party member Phil Dickert's surname as
  "Dickett" — this same area's own Southwest Couloir route (the 1936 FA route) already spells it
  correctly ("Dickert") in its own `fa` field, and external sources (Mountaineers.org's Wolf
  Bauer history) confirm "Dickert." Fixed.
- Southwest Couloir's own `itinerary.sourceNote` already states "on-file gainFt was corrected to
  8,400 ft to match WTA.org's cited total" — but the actual stored `gain_ft` column was never
  updated and still read 5,300 ft (while `loss_ft`, at 8,400 ft, does match the note's claimed
  figure). Applied the correction the row itself already described.
- Gunsight Peak's area `elevation_ft`/`prominence_ft` (8,185 ft / 546 ft) conflicted with its own
  Standard Route's summit waypoint (8,198 ft) and a prominence discrepancy that route's own
  `data_quality.gaps` note already flagged as unresolved ("518 ft per Wikipedia/Wikidata vs. 546
  ft previously on file"). Verified externally (summit data for Gunsight Peak, Chelan County —
  Dome Peak massif) that 8,198 ft / 518 ft prominence is correct; fixed the area row and the
  Standard Route's `high_point_ft` to match.
- Goat Mountain's area `elevation_ft` (6,892 ft) was the sole outlier against its own South Ridge
  route's overview, hazards list, and true-summit waypoint (all 6,891 ft), the sibling East Peak
  route's `high_point_ft` (also 6,891 ft), and SummitPost's East-Peak-specific figure (6,891 ft
  vs. the West Peak's 6,721 ft). Fixed the area plus two stray "6,892 ft" mentions buried inside
  the South Ridge route's own `itinerary` JSON (an objective line and a schedule entry).

**Flagged for human review (not auto-fixed):**
- `wa_goat_mountain_south_ridge`'s own `high_point_ft` (6,721 ft, the West Peak) doesn't match
  its own overview/itinerary narrative, which describes continuing on to tag the true East Peak
  summit (6,891 ft) — content that properly belongs to the separate sibling route
  `wa_goat_mountain_east_peak`. Same route-identity-conflation pattern flagged repeatedly in
  earlier batches (Big Kangaroo, Colonial Peak, Corteo Peak, Cascade Peak East Ridge, etc.) — a
  human rename/split decision, not a fact to patch.
- `wa_guye_peak_improbable_traverse` vs. `wa_guye_peak_r1` (West Face): both document the same
  1960 Guye Peak first ascent but spell the climbers' names differently — "Dave Hisser and Mike
  Borgoff" vs. "Dave Hiser and Mike Borghoff." Couldn't confirm the correct spelling from
  accessible sources this run (Mountain Project, SummitPost, CascadeClimbers' First Ascents wiki,
  and the likely relevant NWMJ archive page all returned errors); one weak signal (a different
  NWMJ page mentioning a "Dave Hiser" on an unrelated Mount Terror climb) isn't specific enough
  to settle it. Left flagged.
- `wa_goode_mountain_northeast_face`'s own `fa` field states a specific, confident first ascent
  ("Fred Beckey and John Parrott, 1954"), but its own `data_quality.gaps` field says "No
  confirmed first-ascent party/date found for this specific line" — a direct internal
  contradiction this run couldn't resolve externally (no dedicated source found distinct from
  the well-documented Northeast Buttress). Needs a human with guidebook access.

**Noted but out of scope (not fixed):** Sibling route `wa_gunsight_peak_east_face` carries the
same elevation slip as Gunsight Peak's Standard Route did (`high_point_ft` 8,200 vs. the now-
corrected 8,198 ft), but it's tagged discipline `trad`, not `alpine`/`mountaineering` — outside
this audit's scope and outside this batch's selected routes, so left untouched. Noting it here
since its discipline tag means it won't otherwise come up in this recurring audit's normal
rotation.

**Clean (no errors found):** Golden Horn North Face (elevation and land-manager fields check
out; already-resolved `corrections` note on the peak's own elevation matches Wikipedia/
Peakbagger), Gorillas in the Mist's sibling Gorillas Direct (Mount Stuart) (FA, grade, and
approach details corroborated, `corrections` field already sourced directly from Mountain
Project), Gunnshy Peak Standard Route (elevation matches area; access/land-manager fields
correct for Wild Sky Wilderness).

Next batch will continue alphabetically from `wa_guye_peak_r2` (see progress
file).

## 2026-07-29 — Pass 1, Batch 15

Checked 10 routes across 8 peaks: Guye Peak (North Route "Hidden Ridge", South Gully/Spur),
Hadley Peak (Cougar Divide, Skyline Divide), Helmet Butte (Standard Route), Himmelhorn
(Southeast Route), Mount Deception (Honeymoon Route), Hozomeen Mountain (Southeast Face),
Hurry-Up Peak (South Ridge), and Icy Peak (Southwest Route/Icy Glacier).

**Confirmed errors → fixes in `sql/2026-07-29-batch-15.sql`:**
- `wa_guye_peak_south_gully` and `wa_icy_peak_southwest_route` both had `access.notes`
  stamped with a false location clause naming an unrelated peak — "Whatcom Peak area, North
  Cascades" on the Guye Peak (Snoqualmie Pass) route, and "Mount Tom area, North Cascades" on
  the Icy Peak (Mt. Baker) route. Confirmed this is copy-paste boilerplate junk, not a
  per-route fact, by finding the identical "Mount Tom area, North Cascades" string on 35
  routes DB-wide — including `wy_gooseneck_glacier_route` (Gannett Peak, **Wyoming**), which
  has no possible connection to the North Cascades. Stripped the false clause from this
  batch's two affected routes rather than fabricate a replacement location. The other 33
  affected routes are outside this batch's scope — worth a dedicated future pass since it's a
  widespread pattern, not a one-off.
- Hozomeen Mountain's area `elevation_ft` (8,072 ft) was a 1-ft outlier against its own
  Southeast Face route's `high_point_ft` (8,071 ft, already correct) and external sources
  (Wikipedia cites 8,071 ft NAVD 88, corroborated independently while checking the 1904 FA).
  Fixed the area to match.
- Helmet Butte's area `elevation_ft` and its Standard Route's `high_point_ft` both read 7,372
  ft, but the route's own `corrections` field already documents a prior research pass that
  concluded "research supports 7,400 ft (Wikipedia, most consistently corroborated topo/USGS
  figure)" — the finding was written into `corrections` but never applied to the actual
  elevation columns. Independently corroborated externally (Wikipedia and peakery.com both
  cite 7,400 ft) and applied to both rows.

**Flagged for human review (not auto-fixed):**
- `wa_hozomeen_mountain_southeast_face`: its own `corrections` field is a detailed self-audit
  stating this route's name/id ("Southeast Face (Standard)") doesn't correspond to any
  documented route on Hozomeen's main (North, 8,071 ft) summit — every source checked
  describes the standard/easiest route there as the Northeast Ridge/Buttress (1904 FA, class
  4), and that's what this entry's fields actually document under a mismatched name. A real
  "Southeast Buttress" exists (FA 1988, III 5.6) but on a separate sub-summit (South Peak,
  8,003 ft) about a mile away. This run's external checks corroborate the `corrections`
  field's account, but the name/id-vs-content mismatch is a rename/split decision for a
  human, not a field patch — same conflation pattern flagged repeatedly in prior batches (Big
  Kangaroo, Cascade Peak East Ridge, Goat Mountain, etc.).
- `wa_hadley_peak` (area + both routes, 7,522 ft): external sources disagree with each other
  (7,470 / 7,513 / 7,515 / 7,516 ft depending on source) and none exactly match the on-file
  figure, so nothing was changed — but the area's stored coordinates matched an independently
  found GPS reading to five decimal places, a stronger signal than the noisy elevation
  figures. Flagging for a future pass with topo/LIDAR access rather than picking one of the
  conflicting numbers.
- `wa_honeymoon_route`: the FA claim ("1965 Arnie & Diane Bloomer") couldn't be corroborated
  externally this run, consistent with the route's own `data_quality.gaps` note already
  flagging it as unverified/single-source. Also noticed `gain_ft` (7,861) is markedly higher
  than `loss_ft` (5,400) for what the route's own descent text describes as an out-and-back —
  gain should roughly equal loss for a round trip. Worth a human recheck of whether `gain_ft`
  was miscomputed or copied from a different itinerary.

**Clean (no errors found):** Guye Peak North Route/"Hidden Ridge" (elevation matches area;
own `data_quality` already flags the technical-grade uncertainty appropriately), Hadley
Peak's two routes beyond the elevation question above (access/road/permit fields check out,
including the FS-37 washout closure), Himmelhorn Southeast Route (FA fully corroborated
externally: Cooper/Denny/Firey/Firey/Whitmore, Sept 8 1961; elevation 7,880+ ft matches),
Hurry-Up Peak South Ridge (elevation 7,821 ft matches Wikipedia/ListsOfJohn exactly), Icy
Peak Southwest Route beyond the boilerplate-notes fix (elevation 7,073 ft matches Wikipedia
exactly).

Next batch will continue alphabetically from `wa_icy_peak_southwest_route` (see progress
file).

## Batch 16 — 2026-07-29

Checked: Ingalls Peak (East Peak Southwest Face, South Ridge), Inner Constance (Northwest
Buttress, Standard Route), Inspiration Peak (West Ridge), Jack Mountain (Northeast
Glacier), Johannesburg Mountain (Cascade-Johannesburg Couloir, Northeast Buttress), Mount
Stuart (King Kong / Gorillas Direct Direct), and Klawatti Peak (Southeast Face).

**Confirmed errors → fixes in `sql/2026-07-29-batch-16.sql`:**
- `wa_ingalls_peak_east_route` had three separate self-contradictions between a stored
  field and this same row's own other fields: `fa` misspelled "Butchart" as "Butcharc"
  (the row's own `overview` already spells it correctly); `grade_num` (5) broke the
  DB-wide YDS-digit convention for its "5.3" grade (should be 3, confirmed against the
  sibling South Ridge route's correct `grade_num=4` for "5.4"); and `gain_ft`/`loss_ft`
  (4200/4200) contradicted the row's own `itinerary`, which had already recomputed
  3300/3300 in a `sourceNote` but never had that value copied up to the top-level
  columns. All three fixed from the row's own already-correct data.
- `wa_ingalls_peak_south_ridge`: `fa` misnamed the second 1941 first-ascent climber "Ken
  Colbert" — external sources (SummitPost, Wikipedia's Ingalls Peak article, Mountain
  Madness) consistently agree on "Ken Solberg." Also had a populated `gain_ft` (3500)
  but a null `loss_ft` for a car-to-car day climb that returns to the same trailhead —
  filled from the row's own gain figure.
- Both in-scope Inner Constance routes (`wa_inner_constance_northwest_buttress`,
  `wa_inner_constance_standard`) had `high_point_ft` = 7,670 ft, a systematic offset from
  the area's own `elevation_ft` (7,672 ft) and the Standard route's own overview text,
  which explicitly cites "7,672 ft, Peakbagger LiDAR" — fixed both to 7,672. A third
  sibling route on the same peak, `wa_inner_constance_seans_route`, carries the identical
  error but is tagged discipline `trad`, out of this audit's scope — flagged instead of
  fixed (same out-of-scope-sibling precedent as batch 14's Gunsight Peak East Face note).
- `wa_johannesburg_mountain_northeast_buttress` had two errors: `high_point_ft` (9220) was
  wildly wrong for a peak whose real summit is 8,200 ft — contradicted by the area row,
  Wikipedia, and this same row's own "Johannesburg summit" waypoint (elevFt 8200), plus
  every sibling route on the peak; and `pitches` (30) contradicted three of this row's own
  internal citations of "20-pitch(es)" (in `overview`, `watch_out`, and `itinerary.cal`),
  with its own `pitch_detail` array only enumerating 12 discrete pitches. Both fixed to
  match the row's own already-correct internal narrative (no external source pinned an
  exact modern pitch count beyond "~20," so a human with a firmer guidebook figure should
  prefer that over 20 if found).
- `wa_king_kong_gorillas_direct_direct` (Mount Stuart) had its `approach` field copy-pasted
  wholesale from a *north-side* Stuart route (Stuart Lake Trailhead / Icicle Creek Road) —
  but this row's own `waypoints` (Esmeralda Basin Trailhead, Ingalls Pass) and `face` field
  ("West Face Wall, between Goat Pass and Stuart Pass") describe the *south-side*
  approach shared with its sibling `wa_gorillas_direct`, whose own verified approach text
  was used to rewrite this field. Also filled a null `high_point_ft` from the row's own
  "Mount Stuart summit area" waypoint (elev 9415), matching the area and every other
  summit-topping sibling route.

**Flagged for human review (not auto-fixed):**
- `wa_jack_mountain_northeast_glacier` (+ area, + 5 other Jack Mountain routes outside this
  batch): `high_point_ft`=9075 is unanimous across all 6 of the peak's own routes but
  conflicts with the area's own `elevation_ft`=9069 — a genuine external datum split
  (9,075 ft per Wikipedia/AllTrails/FKT vs. ~9,066-9,069 ft per peakery.com/older USGS
  sources). Affects the whole peak, not one route — needs a human to pick a value/datum
  and apply it consistently rather than a single-row patch.
- `wa_johannesburg_mountain_northeast_buttress`: `fa`/`beta` disagree on Tom Miller's
  unnamed 1951 climbing partner, and a separate sibling row
  (`wa_johannesburg_mountain_northeast_rib_1951_route`) carries an undated/unattributed
  "1951" FA that may document the same historical climb under a different ID — a possible
  duplicate-route-identity split, same family as prior batches' Dragontail Peak flags.
  Needs a human with Beckey's guide or the full AAC account.
- `wa_king_kong_gorillas_direct_direct`: `fa` says "Sol Wertkin & Tyree Johnson, 2016
  (freed by Sol Wertkin)" while `beta` says "First ascent...by Sol Wertkin and Jon
  Gleason" — likely an FA-vs-FFA mixup between two different partners, but which field
  should say what couldn't be resolved from the sources checked.
- `wa_klawatti_peak_southeast_face`: a "Bergschrund" waypoint's latitude sits ~6.3 km from
  the very next (summit) waypoint despite `distMi` implying they're only ~0.2 mi apart —
  almost certainly a coordinate typo, but no source was found to confirm the intended
  value.
- `wa_inner_constance_standard`: this row's own `corrections` field already documents an
  unresolved route-identity conflict between its name/approach text (the long Crystal Pass
  line) and its own `overview`/`waypoints` (the shorter South Gully/"Route 2A" line) — a
  human rewrite/split decision, not a single-field patch.

**Clean (no errors found):** Johannesburg Mountain's Cascade-Johannesburg Couloir
(FA/elevation/length all corroborated and internally consistent) and Inspiration Peak's
West Ridge (FA, elevation, grade_num, and gain/loss all check out against external sources
and the row's own waypoint-derived profile).

Next batch will continue alphabetically from `wa_klawatti_peak_southeast_face` (see
progress file).

## Batch 17 — 2026-07-29

Checked: Klawatti Peak SW Buttress, Koala Krack (Kangaroo Temple), Kololo Peaks Standard
Route, Kyes Peak Glaciated Scramble, Labor Pains (North Early Winters Spire), and all
three of Lane Peak's north-face couloirs (The Zipper, The Fly, Lover's Lane).

**Confirmed error fixed:**
- `wa_kyes_peak` (area row): `elevation_ft` was 7282, a 2 ft outlier against both of the
  peak's own routes (7280, unanimous, including the in-scope Glaciated Scramble) and
  external sources (Wikipedia/Peakbagger: "7,280+ ft, NGVD 29"). Fixed the area row to
  7280 — same systematic-offset pattern as batch 16's Inner Constance fix, just with the
  area (not the routes) as the wrong value this time.

**Flagged for human review (not auto-fixed):**
- `wa_koala_krack`: already self-flagged in its own `corrections` field as unconfirmable
  (no MP/SuperTopo page found). This pass additionally checked whether "Koala Rock" —
  which does exist on Mountain Project — might be the real location; it turned out to be
  an unrelated Smith Rock, Oregon formation ("The Marsupials" area), just a name
  collision. Doesn't resolve the original uncertainty either way.
- `wa_kololo_peaks_standard`: `gain_ft`/`loss_ft` (6120/7000) violate the gain-loss =
  net-elevation-change identity that holds elsewhere in the dataset (verified on this
  batch's own Kyes Peak route). The route's own trailhead waypoint (2050 ft) and
  `high_point_ft` (8240 ft) imply a net one-way climb of +6190 ft; `gain_ft` is
  plausible but `loss_ft` (7000 ft) has no support in the route's own approach/descent
  text and no external source pins a correct replacement figure.
- `wa_lane_peak_r3` (Lover's Lane): `grade`/`grade_system`/`grade_num` are all null,
  unlike its two siblings on the same face (Zipper WI3, Fly WI2), despite its own
  `watch_out` text referencing "the moderate AI1 rating" as a baseline that never made it
  into the grade fields — and AI1 sits oddly next to this row's own overview calling it
  the steepest/narrowest of the three couloirs. A Mountain Project page exists but its
  exact grade couldn't be retrieved this pass.

**Clean (no errors found):** Klawatti Peak SW Buttress (FA/elevation/pitch-count all
corroborated), Labor Pains (FA/pitch-count/length all corroborated against SummitPost/AAC
sources), and Lane Peak's Zipper and Fly couloirs (elevation and route descriptions check
out; no confirmed FA on file for either, consistent with sources). Also checked but not
flagged: Kololo Peaks' elevation (8240) diverges from Wikipedia's rounded "8,200 ft" but
matches peakery.com exactly and is internally consistent between the area and route rows
— left alone as ordinary source variance for an unofficial/unsurveyed summit.

Next batch will continue alphabetically from `wa_lane_peak_r3` (see progress file).

---

## 2026-07-30 — Pass 1, Batch 18

Checked 10 routes across 7 peaks: Le Conte Mountain (Northern Aspect), Lemah Mountain
(East Route) and Lemah Two (Goatshead Spire), Mount Stone (Lena Lake to Mt Stone
traverse), Gunn Peak (Lewis Creek Route), Lexington Tower (East Face), and all four
in-scope Liberty Bell Mountain routes (Liberty and Injustice for All, Beckey Route, East
Face, Independence Route).

**Confirmed errors fixed (see `audits/sql/2026-07-30-batch-18.sql`):**
- Le Conte Mountain Northern Aspect: `access.land_manager`/`parking_pass`/`passRequired`
  all carried Darrington Ranger District / Mountain Loop Highway / Downey Creek
  Trailhead references — the Suiattle River drainage corridor used for Dome Peak, not
  this route's actual Cascade River Road/Marblemount approach. Same contamination family
  as batch 8's Dome Peak fix. Also fixed `climate.forecastZone` ("Washington Pass East
  Slopes zone", an unrelated east-of-crest location) to the correct West Slopes North.
- Mount Stone traverse: `access._raw.special_requirements` stated the standard
  Putvin-only route's ~5,000 ft gain figure instead of this full traverse's own
  ~9,000 ft (matching its own `gain_ft` and Mountain Project's page for this exact
  route); `parking_pass`/`_raw.parking_pass_required` omitted the Northwest Forest Pass
  needed at Lena Lake Trailhead (the route's actual start), even though the row's own
  waypoint #1 already had it right.
- Gunn Peak Lewis Creek Route: two waypoint elevations (trailhead 2400→2200,
  summit 6240→6244) contradicted the row's own approach text/`high_point_ft`/area row;
  `gain_ft` (4900) contradicted `loss_ft` and the row's own itinerary (both 5200);
  `access.notes` claimed Gunn Peak "sits outside designated wilderness," directly
  contradicting this same row's own `wilderness_zone_name` field and overview text —
  Gunn Peak is the Wild Sky Wilderness's highest point.
- Lexington Tower East Face: `alpine_grade`/`commitment` said III, should be IV per
  multiple independent sources (Mountaineers.org, SummitPost, Mountain Project,
  chossclimbers) all citing "Grade IV... eight pitches"; `rappels` described a
  non-standard 7-rap descent as if standard, contradicting the row's own `descent_text`;
  a stale `data_quality.gaps` entry said the 1966 FA year was unverified when `fa`
  already had it; `access._raw.seasonal_closures` said SR-20 typically closes
  "mid-November," contradicting the row's own `access.seasonal` field and WSDOT data
  (early December).
- **Liberty Bell East Face — most significant find this batch.** The row's own `face`
  field literally read "East Face (Lexington Tower)", and its `fa`/`pitches`/
  `rock_grade`/`grade_num` were a verbatim copy of Lexington Tower's East Face (Marts &
  McPherson, June 1966, 5.9+, ~10 pitches) — a different, neighboring formation. This
  row's own `pitch_detail` (4 pitches summing to 125m, crux 5.6), `descent_text`, and
  `itinerary` all consistently describe a shorter, easier line that actually stays on
  Liberty Bell. Fixed the header fields to match the row's own already-correct
  pitch-by-pitch data; `fa` left NULL (no source found for this specific short line)
  rather than guessed, with a `corrections` note and `data_quality` gap added to explain.
- Liberty Bell (3 routes): `emergency.county` disagreed both with the area row/Beckey
  Route (which correctly say the summit straddles Chelan/Okanogan) and, on two of the
  three, with the row's own `emergency.notes` field, which already admitted the
  straddle. Aligned East Face, Independence Route, and Liberty and Injustice for All to
  the confirmed county straddle.
- Liberty Bell Independence Route and Liberty and Injustice for All: both had
  `itinerary`/`timing` day-1 notes describing the wrong face/descent — Independence
  Route's said "west face" against its own `face`/`aspect`/overview (all East Face);
  Liberty and Injustice's said a generic "Beckey descent" against its own specific
  two-rope P3→P1 rappel description in `descent_text`/`rappel_detail`. Both rewritten to
  match each row's own already-correct structured fields.

**Flagged for human review (not auto-fixed):**
- Lexington Tower's own `parent_peak` is stored as Liberty Bell, but Wikipedia's
  infobox lists Early Winters Spires — no "Early Winters Spires" area row was available
  this batch to confirm the target id, and per this repo's documented history of
  id-shaped guesses causing damage, left for a human to confirm the id first.
- Le Conte Mountain: an incomplete-looking `waypoints` array (two near-duplicate
  "Cascade Pass" entries with no return-leg points between them).
- Lemah Mountain East Route: two waypoints appear geographically displaced ~5-6 miles
  from the actual route line, contradicting the row's own beta text; no confident
  replacement coordinates found (cited CalTopo source not fetchable this pass).
- Lemah Two (area): its coordinates sit just north of Lemah Mountain's main summit,
  but route descriptions place Lemah Two south/southwest of Main Peak — possibly the
  same kind of USGS-quad mislabeling this massif has a documented history of.
- Mount Stone traverse: a waypoint leg's stored `distMi` (0.5 mi) is geometrically
  impossible against the two waypoints' own coordinates (~1.02 mi straight-line) — can't
  tell whether the coordinate or the distance is the actual error without map access.
- Gunn Peak: the row's own `verif.status`/`corrections` fields already flag that "Lewis
  Creek Route" may not be a distinct line from the modern standard Gunn Peak approach —
  possible name-derived duplicate, needs a human check. Also, even the corrected
  gain/loss (5200/5200) runs higher than any external source's reported figure
  (~3,937-4,380 ft) for this peak.
- Lexington Tower: a notch waypoint elevation (7,621 ft) exceeds the peak's own
  confirmed summit elevation (7,560 ft) despite the route's own text saying it tops out
  below the true summit — internally self-consistent (trailhead + gain_ft = notch elev)
  but geometrically impossible; can't tell which single field is wrong without a topo.
- Liberty Bell East Face and Liberty and Injustice for All: both routes' own
  `approach`/`road` fields describe an SR-20 pullout approach while their own
  `waypoints`/`gpx` point to Blue Lake Trailhead — internally split, no independent beta
  found online for either obscure line to arbitrate.

**Clean (no errors found):** Lemah Two Goatshead Spire (FA, elevation, and approach all
independently corroborated, correctly kept distinct from the massif's Main Peak) and
Liberty Bell's Beckey Route (FA, grade, pitch data, county note, and permit/closure info
all check out).

Next batch will continue alphabetically after `wa_liberty_bell_independence_route` (see
progress file).

---

## 2026-07-30 — Pass 1, Batch 19

Checked 10 routes: Liberty Bell Mountain (Northwest Face, Serpentine Crack, Thin Red
Line, Liberty Crack, Liberty Crack (Free), Liberty Traverse), Liberty Cap / Mount
Rainier (via Liberty Ridge, via Ptarmigan Ridge), Lichtenberg Mountain (West Face -
West Rib).

**Fixed:**
- Northwest Face: `alpine_grade` stored 'III' — a plain copy of this row's own
  `commitment` field, i.e. an NCCS Roman-numeral grade sitting in the column the schema
  (`migrations/0006_composite_grades.sql`) defines as the French adjectival scale
  (F/PD/AD/D/TD/ED). Same bug fixed on Dragontail Peak's Triple Couloirs in batch 9.
  Every other rock route on Liberty Bell audited this batch already stores `D` here —
  aligned Northwest Face to match.
- Serpentine Crack: `waypoints[0].note` contained a leaked meta-comment — "Reused
  coordinate from this session's own Liberty Bell area research (same real
  trailhead)." — describing an authoring process rather than the route. Replaced with
  the same trailhead description already used verbatim on this route's own siblings.
- Thin Red Line: `fa` credited the free ascent to "Mikey Schaefer, 2008" alone,
  dropping Kate Rutherford — who this row's own overview already names as co-first-
  freer. Confirmed via Climbing.com's FA account (Rutherford & Schaefer, 5.12c,
  September 15, 2008); both climbers added to `fa`.
- Liberty Crack: summit waypoint elevation read 7,746 ft, the sole outlier against the
  Liberty Bell area row's own canonical 7,720 ft (whose blurb explicitly flags 7,745-
  7,750 as an outdated USGS-derived figure) and against all five other Liberty Bell
  routes audited this batch, which already store 7,720 — fixed to match.
- Liberty Crack (Free): `fa` dated the fully-free bolt-ladder-bypass variation
  (Schaefer/Lee/Herrington/Hadley) to 2017. Blake Herrington's own trip-report blog
  (dated July 1, 2016) and a CascadeClimbers.com report titled "6/28/2016" both place
  the actual ascent in June/July 2016 — this row's own overview already hedged
  "2016-2017"; fixed `fa` to the confirmed year.
- Liberty Ridge finish (Liberty Cap): `fa` misspelled the third 1935 first-ascensionist
  as "Jim Burrow" — this row's own overview already spells it "Jim Borrow" correctly,
  and the AAC's own publication title for the FA account corroborates both the
  spelling and the September 28-October 1, 1935 date range already on file. Also
  updated `overview`: it cited Liberty Cap at a stale "14,112 ft" (vs. this route's own
  area row, already correctly researched to 14,097 ft / ~14,095 ft per an Aug 2025 GPS
  survey) and named Columbia Crest, at a stale "14,411 ft", as Rainier's "true high
  point." A GPS survey conducted August 28, 2024 (widely reported: Seattle Met, Seattle
  Times, Newsweek, GPS World) found the crater's southwest rim, about 440 ft south of
  Columbia Crest, now stands higher (~14,400 ft) than the faster-thinning Columbia
  Crest icecap (~14,389 ft) — Columbia Crest has not been the true summit since roughly
  2014. Overview rewritten to match both this route's own area data and the 2024
  resurvey.
- Ptarmigan Ridge finish (Liberty Cap): top-level `grade` was NULL despite
  `alpine_grade`/`rock_grade`/`ice_grade` all already populated ('IV'/'5.6'/'AI2-3')
  and `grade_num` (6) already matching the rock grade digit — filled from the row's own
  sub-fields, same pattern as batch 6/10's null-grade fixes. Also fixed the same stale
  Liberty Cap (14,112 ft) and Columbia Crest "true summit" (14,409 ft) figures as the
  Liberty Ridge route above, in this route's own waypoints array.

**Flagged for human review (not auto-fixed):**
- Liberty Ridge finish / Ptarmigan Ridge finish: `alpine_grade` stores 'IV' on both —
  the same commitment-grade-in-the-adjectival-column bug fixed on Northwest Face above,
  but Liberty Cap has only these two routes and both share the identical bug, so there's
  no correctly-typed in-DB sibling to copy from. Sources found (International Mountain
  Guides, Mountaineers.org, SummitPost) describe Liberty Ridge as "Grade V" (a
  commitment grade) but none states a French adjectival rating — needs a human with a
  guidebook (e.g. Nelson/Potterfield *Selected Climbs*) to supply the correct D/TD-class
  value.
- Northwest Face: `fa` (Hans Kraus & John Rupley, 1956; free FA Sandy Bill, Ron Burgner,
  Ian Martin & Frank Tarver, 1966) could be neither corroborated nor contradicted by
  this run's sources — left as-is.
- Liberty Traverse: `fa` is 'unknown'; the stored summit order (Liberty Bell → Concord
  Tower → Lexington Tower → North Early Winters Spire → South Early Winters Spire)
  matches the Liberty Bell Group's documented layout, but no source was found to confirm
  the specific 26-pitch count or overall 5.9 grade for a single continuous traverse —
  left as-is.

**Clean (no errors found):** Overexposure (FA, route character, and its role as the
group's standard rappel line all independently corroborated) and Lichtenberg Mountain's
West Face - West Rib (this row already self-describes as sparsely documented; nothing
found online to confirm or refute it, consistent with that self-assessment).

Next batch will continue alphabetically after `wa_lichtenberg_mountain_west_face_west_rib`
(see progress file).

---

## 2026-07-30 — Pass 1, Batch 20

Checked 8 routes across 5 peaks: Lincoln Peak (North Ridge, X Couloir/Standard), Little
Mac Spire (Southwest Route), Little Sister (North Face, West Face), Little Tahoma
(Cowlitz/Ingraham Glaciers, East Shoulder), Luahna Peak (Southwest Slope-Southeast
Ridge).

**Confirmed errors fixed (see `audits/sql/2026-07-30-batch-20.sql`):**
- Lincoln Peak North Ridge and X Couloir/Standard (both routes on this peak):
  `high_point_ft` stored 9,085 ft, matching neither this route's own summit waypoint in
  the same row (9,101 ft, cited to GNIS Feature ID 1522127) nor ListsOfJohn.com's
  surveyed figure — a bad transcription from a prior pass. Fixed both to 9,101.
- Little Tahoma East Shoulder: `approach_logistics.trailhead`/`trailheadLat`/
  `trailheadLng`/`trailheadDirection` were an exact copy of Luahna Peak's trailhead
  (White River Trailhead near Lake Wenatchee, ~130 mi away) — cross-route contamination,
  same pattern as prior batches' Mount Tom/Dome Peak mixups. This row's own
  approach/descent/GPX text already correctly named Fryingpan Creek Trailhead
  (confirmed via NPS's "Summerland Trailhead" page, Mountaineers.org,
  trailcatjim.com); propagated that into the contaminated field.
- Little Tahoma Cowlitz/Ingraham Glaciers: `access.notes` read "Northwest Forest Pass...
  Mount Tom area, North Cascades" — USFS-language contamination on a route entirely
  inside Mount Rainier NP (per this same row's own `landManager` field). Replaced with
  NPS's actual policy: no NW Forest Pass, $82/yr climbing registration for glacier/
  10,000ft+ travel, separate overnight wilderness permit.

**Flagged for human review (not auto-fixed):**
- Little Mac Spire Southwest Route: `fa` ("1969") and `grade` ("II-III, 5.4") are
  already self-flagged as unconfirmed in the row's own `data_quality.gaps`; no
  route-specific source found this pass to confirm or refute either. Separately, its
  `corrections` narrative field contains a stale, self-contradictory note placing the
  peak "near Mac Peak in the Deception Lakes area" (Alpine Lakes Wilderness) —
  contradicts the rest of the row and the area table (actual parent: Southern
  Pickets/North Cascades NP). Reads like leftover text from an earlier bad research
  pass; needs a human to clean it out.
- Little Sister West Face: `fa` ("Darin Berdinka, June 21, 2013") is broadly
  corroborated, but sources describe the line as "Northwest" rather than confirming the
  exact name "West Face" — not a clear enough mismatch to fix outright; worth checking
  the live Mountain Project listing directly.
- Little Sister (both routes): `access.closures` cites a specific "FR 12 closing from
  MP 4.6 starting Aug 2026" — plausible given ongoing Middle Fork Nooksack Rd washout
  closures, but this pass couldn't independently confirm the exact date/mile-marker
  with the Mount Baker Ranger District; time-sensitive, left as-is.
- Little Tahoma (both routes): a shared rounded waypoint coordinate (46.8884, -121.611)
  is used for two different named features (Summerland campsite vs. the Fryingpan
  Creek/Summerland Trailhead) — each individually correct in elevation/description, so
  likely a rounding artifact rather than a wrong location; a human with a precise GPS
  track could tighten it to match the route's own cited GPX start exactly.

**Clean (no errors found):** Little Sister North Face (no FA on file — an honest null —
and the Elbow Lake Trailhead approach confirmed correct) and Luahna Peak Southwest
Slope-Southeast Ridge (elevation, land manager, and trailhead all independently
confirmed — this route turned out to be the *source* of the Little Tahoma East Shoulder
contamination above).

Next batch will continue alphabetically after `wa_luahna_peak_southwest_slope_southeast_ridge`
(see progress file).

---

## 2026-07-30 — Pass 1, Batch 21

Checked 10 routes across 9 peaks: Phantom Peak (Luna Glacier), Luna Peak (Southeast
Slopes), Lundin Peak (South Face Left), Magic Mountain (South Ridge/Southeast Slopes),
Martin Peak (West Ridge), Morning Star Peak (Marvin's Ear), McMillan Spire West
(Southwest Ridge, West Ridge/Southwest Approach), Mix-up Peak (East Face/East
Buttress), South Early Winters Spire (Mojo Rising).

6 confirmed errors → fixes in `audits/sql/2026-07-30-batch-21.sql`:
- Luna Peak Southeast Slopes: `gain_ft`/`loss_ft` (6700/6711) didn't match the row's own
  itinerary-day gain/loss sums (8700/8700), and `dist_km` (16.1) was far short of the
  itinerary's own "~48 mi round trip" note (≈77.2 km) — same top-level-equals-itinerary
  convention verified on this batch's sibling Luna Glacier route.
- Magic Mountain South Ridge: `fa` (and the area's own `blurb`) named the 1938 FA party's
  fourth climber "Ralph Clough," contradicting this same route's own `overview` field,
  which already correctly says "Ray Clough" — confirmed via independent sources on the
  1938 Ptarmigan Traverse party.
- Martin Peak West Ridge: `fa` credited a solo "Ida Zacher Darr" ascent; per alpenglow.org's
  Dwight Watson historical notes, Everett Darr and Ida Zacker made this first ascent as a
  two-person party in July 1936 (after an unsuccessful Bonanza Peak attempt) — the two
  names had been merged into one. Also fixed this same row's trailhead waypoint, which sat
  ~4 mi from Holden Village's real location while the row's own `approach_logistics`
  already had the correct coordinate.
- McMillan Spire (West) area: `prominence_ft` (737) contradicted the row's own blurb,
  which already cites "600 ft of clean prominence" per Wikipedia — fixed to 600.
- McMillan Spire (West) — West Ridge/Southwest Approach: top-level `grade` ("Grade III,
  5.6") contradicted this row's own `alpine_grade`/`commitment` ("II") and `rock_grade`
  ("4th class"); every external source describes Class 2-3 scrambling with an occasional
  low-5th variation, not sustained 5.6 — cleared the orphaned YDS grade fields to match
  the row's own already-correct class rating, same pattern as an earlier batch's
  Dragontail Peak Northeast Face fix.

8 items flagged for human review (see SQL file's "NOT fixed" section for full detail):
Luna Glacier's nonstandard "M1c" rock-grade notation and a possible duplicate-FA overlap
with sibling Phantom Peak South Route; a likely Mountain-Project-ID duplicate between
Lundin Peak South Face Left and its out-of-scope sibling "South Face (2001 Variation)";
Martin Peak West Ridge's own itinerary describing a "Southeast Slopes" scree-gully summit
day under a route named "West Ridge" (already self-flagged in the row's own
`data_quality.gaps`); McMillan Spire West's disputed area elevation (8038 vs. two
already-disclosed competing sources); McMillan Spire West's Southwest Ridge route, whose
stored 6-pitch 5.8 Grade III alpine-rock description conflicts with every external source
describing that line as a snow-climb scramble variant, compounded by thin/synthesized-
looking data (no data_quality block, a straight-line GPX); and on Mojo Rising, a
Blue Lake Trailhead elevation contradiction (5200 vs. ~5400 ft) plus a rack-size
inconsistency between `sling_rack` and the route's other gear fields.

2 routes audited clean: Marvin's Ear (Morning Star Peak) and Mix-up Peak's East
Face/East Buttress — FA, elevation, grade, and area placement all independently
confirmed with no contradictions found.

Next batch will continue alphabetically after `wa_mojo_rising` (see progress file).

---

## 2026-07-30 — Pass 1, Batch 22

Checked 10 routes across 3 peaks: Mount Adams (Adams Glacier, Lava Glacier Headwall, Lyman
Glacier, Mazama Glacier Headwall, North Ridge, Northwest Ridge, South Climb, Wilson Glacier
Headwall), Mount Anderson (Eel Glacier/Flypaper Pass), Mount Baker (Boulder Glacier/Boulder
Cleaver).

**Confirmed errors → fixes in `sql/2026-07-30-batch-22.sql`:**
- Adams Glacier: `high_point_ft` (12281) contradicted its own `watch_out` text ("...high
  elevation (12,276 ft)"), the parent area's `elevation_ft` (12276), and all 7 other Mount
  Adams routes in this batch (all 12276) — fixed to 12276.
- Wilson Glacier Headwall: summit waypoint `elevFt` (12280) contradicted this same row's own
  `high_point_ft` (12276) and every sibling route — fixed to 12276.
- Wilson Glacier Headwall: `access.notes` carried the exact "Mount Tom area, North Cascades"
  boilerplate contamination documented DB-wide in batch 15 (35 affected routes, 2 already
  fixed) — stripped, same fix pattern as the batch 15 precedent.

**Flagged for human review (not auto-fixed):**
- Adams Glacier: Wikipedia's current infobox lists Mount Adams at 12,281 ft NAVD88 while
  USGS and every other on-file record for this peak use 12,276 ft — a genuine external datum
  split (same family as batch 16's Jack Mountain flag). Fixed to the unanimous internal value
  above, but the peak-wide datum choice is still an open question for a human.
- Wilson Glacier Headwall: internal land-manager contradiction — `access.landManager` says
  "Yakama Nation (Tract D...)" while `access.land_manager` says "U.S. Forest Service" and the
  top-level `permit` field describes only a USFS Recreation.gov pass, with no mention of the
  tribal permit that `rope_note`/`access.closures` separately describe. Also, its own
  `waypoints` trailhead entry uses Killen Creek Trailhead (self-flagged in its own note as "no
  source names this trailhead for Wilson specifically") while `approach`/`descent_text`/`road`/
  `approach_logistics` all consistently describe the Cold Springs/South Climb trailhead instead
  — same waypoint-vs-approach-text mismatch pattern as many prior batches, but this row's own
  `corrections` field already admits "sourcing is thin and partly ambiguous... treat as a
  low-confidence, expert-review-required entry," so left to a human rather than guessed.
- Two legacy, non-`wa_`-prefixed rows exist for Mount Adams outside this audit's `id LIKE
  'wa_%'` scope filter: `adams_northwest_ridge` and `adams_avalanche_glacier`.
  `adams_northwest_ridge` shares the same route name and a similar length (610m) as this
  batch's `wa_mount_adams_northwest_ridge`, but a different FA party (Givler/LeBlond/McGowan
  1967 vs. Molenaar/Johnson/Ostro/Startzell 1960) and pitch count (3 vs. 5) — possibly two
  distinct historical ascents of the same line, or a duplicate entered under two ID schemes
  (same family as the Dragontail Peak duplicates found in batch 8). Out of this audit's scope
  to fix/merge (id doesn't match `wa_%`, and no delete authority regardless) — flagging for a
  human to check.
- Northwest Ridge: its own `overview` and `beta` text describe the route as "the west face of
  Mount Adams's North Ridge" / "the northwest face of the North Ridge" without ever using the
  route's own name — worth a human check on whether this is legitimate geographic description
  (Northwest Ridge sits adjacent to North Ridge) or a mild route-identity mix-up; not auto-fixed
  since unclear which framing is right.

**Clean (no errors found):** Lava Glacier Headwall, Lyman Glacier, Mazama Glacier Headwall,
North Ridge (FA — A.G. Aiken/Edward Allen/Andrew Burge, 1854 — independently confirmed as
Mount Adams's first ascent), South Climb (FA framing and elevation both externally verified),
Mount Anderson Eel Glacier/Flypaper Pass (FA — Fairman B. Lee, 1920 — confirmed; the route's
own already-disclosed 7,323–7,330 ft elevation range matches the area blurb, not a new issue),
and Mount Baker Boulder Glacier/Boulder Cleaver (1891 LaConnor Expedition FA independently
corroborated via John Miles's *Koma Kulshan*, matching this row's own already-hedged phrasing).

Next batch will continue alphabetically after `wa_mount_baker_boulder_glacier` (see progress
file).

---

## 2026-07-30 — Pass 1, Batch 23

Checked 10 routes across 3 peaks: Mount Baker (Boulder-Park Cleaver, Cockscomb Ridge,
Coleman-Deming Glacier, Coleman Headwall, Easton Glacier, North Ridge, Park Glacier Headwall,
Squak Glacier), Mount Buckindy (Glacier/Scramble Route), Mount Carrie (Standard Route /
Carrie Glacier).

**Confirmed errors → fixes in `sql/2026-07-30-batch-23.sql`:**
- North Ridge: `alpine_grade` held "Grade III" — an NCCS commitment-grade string in the column
  the schema (`migrations/0006_composite_grades.sql`) defines as the French adjectival scale
  (F/PD/AD/D/TD/ED) — the same bug fixed on Dragontail Peak's Triple Couloirs (batch 9) and
  McMillan Spire West Ridge (batch 21). Externally corroborated (RMI Expeditions, Mooney
  Mountain Guides both independently cite "AD, AI2-3" for this exact route) and fixed to "AD".
- Park Glacier Headwall: top-level `gain_ft` (1,840) contradicted this same row's own itinerary
  day-by-day breakdown (day 1: 1,800 ft to the Portals camp; day 2: 5,000 ft camp-to-summit,
  summing to 6,800 ft) — off by roughly 5,000 ft, far outside the ~100–300 ft rounding gaps seen
  on every other Baker route audited this batch (all of which track their own itinerary sums
  closely). Fixed to 6,800 to match the row's own itinerary.
- Mount Carrie Standard Route: top-level `gain_ft`/`loss_ft` (4,995/9,800) contradicted this same
  row's own detailed 4-day itinerary (2800/0, 1800/600, 2650/2650, 200/4400), which sums to
  7,450 ft gain / 7,650 ft loss — appropriately near-symmetric for a route that returns to the
  same Sol Duc trailhead. Fixed both to match the itinerary sum.
- **Mount Buckindy Glacier/Scramble Route — the batch's biggest find.** Its `access` block turned
  out to be a patchwork: legitimate USFS/Glacier Peak Wilderness content (fees, permit, closures)
  spliced together with boilerplate lifted wholesale from an NPS North Cascades permit-zone
  route. `access.land_manager` named "National Park Service — North Cascades National Park"
  outright, directly contradicting this same row's own `access.landManager` field ("Mount
  Baker-Snoqualmie National Forest ... within the Glacier Peak Wilderness"), the parent area's
  own blurb, and the row's own approach text (Green Mountain Trailhead / FR-1570 Kindy Creek
  Road — both Forest Service roads, nowhere near North Cascades NP). `access.notes` described the
  NPS North Cascades Boston Basin/Eldorado/Sulphide Glacier Recreation.gov lottery split, which
  has nothing to do with this peak. `access.rules` and `group_limit` (6) described the NPS
  6-off-trail/12-on-trail group-size split and named NPS-specific designated Boston Basin
  campsites; confirmed externally (wilderness.net/USFS) that Glacier Peak Wilderness's actual
  Forest Service group-size limit is a flat 12, matching every other route in this batch.
  `access.seasonal` named "Cascade River Road" (the NPS Boston Basin/Eldorado access corridor) as
  this route's access road, when the row's own `access.closures` field already correctly names
  the real one (Suiattle River Road/FR 26 via FR 2680 to the Green Mountain Trailhead). All four
  fields fixed to match the row's own correct fields and external sourcing.

**Flagged for human review (not auto-fixed — judgment calls or unverifiable):**
- Boulder-Park Cleaver, Cockscomb Ridge, Coleman Headwall, Easton Glacier, and Squak Glacier all
  carry the same `alpine_grade` "Grade `<Roman numeral>`" bug fixed on North Ridge above — but
  unlike North Ridge, no source found this pass states a specific French adjectival grade for any
  of these five. Coleman Headwall's own sources consistently cite the NCCS "Grade III+" rating,
  not an adjectival letter; Easton Glacier, Squak Glacier, and Boulder-Park Cleaver are mellow
  glacier/scramble routes not typically assigned an adjectival grade at all in the sources
  checked. Left unfixed rather than guess a letter, per the precedent set for Liberty Cap's
  routes in batch 19.
- Squak Glacier: `itinerary`, `gain_ft`, `loss_ft`, `max_angle`, `grade`, and `grade_system` are
  all null. This looks like thin/incomplete data rather than a factual error, and — unlike the
  null-grade fixes on Kimchi Suicide Volcano/Thread of Ice/Ptarmigan Ridge Finish in batches
  6/10/19 — there's no populated sibling sub-field on this row to safely derive a top-level grade
  from. Worth a dedicated enrichment pass rather than an audit fix.
- Cockscomb Ridge: `fa`'s third climber name ("E. Vielbig") could not be independently confirmed
  this pass. The AAC Publications first-ascent account names Chuck Murley, John Musser, and the
  report's own (unnamed in available excerpts) author as the third climber; the direct AAC page
  403'd this session and web-search snippets don't surface the author's byline.

**Clean (no errors found):** Coleman-Deming Glacier — FA (Edmund Coleman's 1868 first ascent of
Mount Baker), `alpine_grade` ("PD", correctly in the French adjectival scale), itinerary sums, and
access fields all checked out with no contradictions.

**No action needed:** Mount Baker's own `elevation_ft`/`prominence_ft` (10,781/8,810) sit a few
feet below Wikipedia's current NAVD88 infobox figures (10,786/8,812), but 10,781 ft is itself
directly attested in Wikipedia's own introductory prose, and all 9 Mount Baker routes plus the
area row agree on it internally — not treated as an error, consistent with how similar
sub-10-ft datum spreads have been handled in prior batches (e.g. batch 17's Kyes Peak).

Next batch will continue alphabetically after `wa_mount_carrie_standard` (see progress file).

---

## 2026-07-30 — Pass 1, Batch 24

Checked 10 routes across 4 peaks (Mount Challenger, Mount Constance x5, Mount Crowder x2, Mount
Cruiser x2), the next in scope alphabetically after `wa_mount_carrie_standard`.

**Confirmed errors → fixes in `sql/2026-07-30-batch-24.sql`:**
- Mount Challenger area row: `elevation_ft` 8238 → 8207 — its own route's `high_point_ft`,
  corrected summit waypoint, and `prominence_ft` (567, which is only consistent with an 8,207 ft
  summit) all already agreed on 8207; the area row alone hadn't been updated. Also on the
  Challenger Glacier route: stripped the "Mount Tom area, North Cascades" contamination string
  from `access.notes` (same DB-wide boilerplate bug flagged in batch 15) and fixed `dist_km`
  (48 → 59.55) plus a mileage figure in `itinerary.totalNote` (21 mi → 37 mi) — the row's own
  `itinerary.sourceNote` already asserted the corrected 59.55 km/37 mi figure "is consistent with
  this profile," but the actual `dist_km` column and a separate summary sentence were never
  updated to match; corroborated independently by the row's own waypoints (19.5 mi one-way to
  summit) and external Hannegan/Whatcom Pass trip reports.
- Mount Constance: two routes (Finger Traverse, Terrible Traverse) had `grade` = "Grade III"
  contradicting their own `alpine_grade`/`commitment` ("II") — the mismatched value exactly
  matched sibling West Arête's own correct "III", suggesting cross-row copy contamination; fixed
  both to "Grade II". Terrible Traverse's `descent` field also carried a "snow bridge hazards"
  clause contradicting its own `seasonal_hazards.crevasses` ("no glacier travel") — the same
  generic boilerplate sentence found verbatim on Mount Crowder's Southwest Route this batch;
  removed the inapplicable clause. North Chimney's `hazards[0]` was a verbatim copy of Finger
  Traverse's wording naming only "the Finger Traverse," though North Chimney's own overview says
  climbers use either the Terrible or Finger Traverse — reworded using the row's own overview
  text. North Chute's `waypoints[0]` trailhead coordinates (47.75095/-123.14012) matched neither
  this row's own `approach_logistics` field nor any of its 4 siblings' consistent trailhead point
  (~47.7403/-123.0658) — fixed to match, corroborated by the errant coordinate also appearing
  mid-track inside the siblings' own GPX data. West Arête's `fa` field held a hedged-sounding
  guess ("similar vintage... early-to-mid 1900s likely") directly contradicting its own
  `corrections` field, which states "'fa' is left null rather than guessed" — nulled to match
  what the row's own correction already concluded. West Arête's trailhead waypoint `note` also
  had leftover internal audit commentary ("CORRECTION: existing DB entry...") baked into a
  user-facing field (coordinates themselves were already correct) — replaced with a normal
  description matching sibling style.
- Mount Crowder Southwest Route: a "Hannegan Pass Trailhead" waypoint (and matching gpx point)
  was an exact-coordinate duplicate of the legitimate Hannegan Pass waypoint on the separate Mount
  Challenger route. Its note argued this should replace the row's real Goodell Creek trailhead,
  citing Steph Abegg's "Mystery Ridge Enchainment" TR — but that TR actually ran
  Crowder-then-continuing-north-to-Hannegan, i.e. Hannegan was the party's *exit* after the whole
  traverse, not their way in to Crowder; this contradicted the row's own approach text,
  approach_logistics, and itinerary throughout. Removed as contamination.
- Mount Cruiser: both routes' "Mount Cruiser" summit waypoint held `elevFt` 6106, contradicting
  each route's own `high_point_ft` (6104), the area row, and external sources — fixed both to
  6104. Northwest Face/Corner's `access.land_manager` flatly said NPS/Olympic NP, contradicting
  its own (correct) `access.landManager` field, which properly notes the summit/Sawtooth Ridge
  sits in the Mount Skokomish Wilderness (Olympic National Forest) just south of the park —
  fixed to match. South Corner's `gain_ft` (5700) contradicted its own itinerary day-sum (5250,
  matching elevation math and the sibling route's already-correct value) and `loss_ft` was null
  despite the same itinerary giving 5250 — fixed both to 5250. South Corner also had the same
  flat-NPS land-manager error on *both* its `landManager` and `land_manager` fields (unlike its
  sibling, which had already fixed one of the two) — fixed both to match the sibling's correct
  split-jurisdiction language.

**Flagged for human review (not auto-fixed):** Challenger Glacier's headline grade ("5.6-5.7")
vs. its own rock_grade/pitch/descent fields (all "5.5") — external sources themselves disagree,
so likely genuine grading ambiguity rather than a DB bug; its itinerary day-mile splits still
don't sum to the now-corrected 37 mi round trip; an unconfirmed NPS group-size claim (403'd on
fetch); a ~12% gain_ft-vs-itinerary gap that may be a legitimate Naismith-style estimate; two
minor (~100-250 m) coordinate offsets between area/approach_logistics/waypoint fields, not
necessarily errors given Challenger's 5-summit ridge. Finger Traverse/Terrible Traverse's `beta`
text calling the crossing a "descent" move while their own itinerary/timing place it during the
AM ascent — contradictory, needs a human call. North Chimney's own name/id vs. its own overview
("generally known... as the 'South Chute'") — a rename candidate, not something to force via
SQL, consistent with the same id/name-conflation pattern flagged repeatedly since batch 3. Mount
Crowder Southwest Route's `fa` (hedged 1962 SW Flank credit) vs. its own `corrections` field
(which asserts instead that the FA climbed the NE Ridge) — no external source found actually
states which line the 1962 party used, and the NE Ridge is independently documented elsewhere in
this same dataset as a difficult, cliff-banded technical descent, making the `corrections`
field's specific claim look unsupported rather than confirmed; left both fields as-is. Also
flagged Crowder's `dist_km` (61.15 km) for the dedicated `audit:distances` script — doubling per
the app's rendering convention lands suspiciously close to a whole-number 76 mi round trip, while
the row's own `itinerary.totalNote` separately claims "~32 mi." Both Cruiser routes' top-level
`permit` field contradicts their own `access.passRequired`; South Corner additionally has a stale
`access._raw` sub-object, a populated 137-point `gpx` track that contradicts its own
`data_quality.gaps` claim of "no public GPS track found" and whose shape looks possibly synthetic
(flagged for a human to verify it's a real recorded track), and a `length_m` that matches neither
its own `pitch_detail` sum nor either of two external trip-report figures found.

**Process note:** CLAUDE.md's SQL-handoff guardrails call for `npm run check:sql -- fix.sql`
before handing over any .sql file, but no such script exists anywhere in this repo's history (on
any branch) — it's referenced in CLAUDE.md but was never implemented, and this audit's guardrails
restrict it to touching only files under `audits/`, so it cannot add the missing script itself.
As a substitute this batch, re-fetched all 9 target route rows plus the target area row live
immediately before writing SQL and confirmed every id exists and every current value matches what
the fix statements assume (no concurrent writes, no stale reads) — the same failure mode
`check:sql` is meant to catch, verified by hand instead. Flagging the missing script for whoever
maintains the checker tooling.

Next batch will continue alphabetically after `wa_mount_cruiser_south_corner` (see progress
file).

---

## 2026-07-30 — Pass 1, Batch 25

Checked 10 routes across 10 distinct peaks: Mount Custer (Standard), Mount Daniel (Daniel
Glacier), Mount Deception (Standard), Mount Degenhardt (Southwest Route), Mount Despair (East
Route), Mount Duckabush (Standard), Mount Ellinor (Standard), Mount Fairchild (Standard), Mount
Fernow (Southeast Face), Mount Formidable (North/Ptarmigan).

**Confirmed errors → fixes in `sql/2026-07-30-batch-25.sql`:** 22 fixes across all 10 routes,
none audited fully clean. The dominant pattern this batch was top-level `gain_ft`/`loss_ft`
disagreeing with the route's own `itinerary.days` sums — found and fixed on 6 of the 10 routes
(Daniel, Deception, Despair, Duckabush, Fairchild, Fernow), all corroborated by the row's own
itinerary totalNote/sourceNote text, not just the day-by-day arithmetic. Also fixed: two more
instances of the area-elevation/route-elevation drift seen in many prior batches (Daniel
7977→7960 ft, Despair 7299→7296 ft — Despair's own `corrections` field had already decided on
7296 but never applied it to the area row); a cross-route land-manager contamination on Daniel
(Mt. Baker-Snoqualmie copied in where the row's own `emergency.rangerStation` already said
Okanogan-Wenatchee/Cle Elum, confirmed via USFS/WTA); a cross-route trailhead contamination on
Duckabush (the Dosewallips Road washout parking — a different Olympics trailhead entirely —
copied into `approach_logistics`, contradicting the row's own waypoints/approach/road fields);
a wrong ranger-station address on Degenhardt (NPS Sedro-Woolley HQ contact info mislabeled as
the Marblemount Wilderness Information Center); a contradicted top-level `permit` claim on
Ellinor (claimed a wilderness self-issue permit the row's own `access.permit` and WTA/USFS both
say isn't required); a contradicted top-level `grade` on Formidable (rock-class understated
against the row's own `rock_grade` and a Steph Abegg trip report title); a data_quality.gaps
entry on Custer falsely claiming no GPS/waypoint data exists despite 8 populated waypoints/gpx
points on the same row; a null `alpine_grade` fix on Deception (held a copy of `commitment`,
violating the French-adjectival-scale schema — nulled rather than guessed, no source gives a
letter grade for an unroped scramble); missing top-level `lat`/`lng` backfilled on Degenhardt
from the row's own already-correct area/approach_logistics coordinates; and two more stale
prose-elevation mentions (Daniel's Peggy's Pond ~5300→~5,560 ft, Duckabush's trailhead ~900→~440
ft) that contradicted the same row's own waypoints.

**Flagged for human review (not auto-fixed):** Fairchild's `itinerary` appears to blend two
genuinely different, separately-documented approaches to the same peak (Sol Duc/Appleton
Pass/Mount Carrie vs. Whiskey Bend/Long Ridge/Mount Fitzhenry) across different sub-fields of one
row — the gain/loss fix above only patches the numeric symptom, not this root cause. Degenhardt's
own name/id ("Southwest Route") vs. sources that only document an "East Ridge" and a "Corkscrew
Route" for this peak — another instance of the id/name-conflation pattern flagged since batch 3 —
plus an FA-year conflict (1931 vs. 1932) across otherwise-agreeing sources. Duckabush has a
genuine three-way summit elevation conflict (area 6232 ft vs. route high_point_ft 6254 ft vs.
external sources ranging 5741-6254 ft) and an unresolved question of which side of the peak the
"standard route" actually follows (south/southeast per `aspect`/approach text vs. north/northwest
per the itinerary and schedule) — the one definitive print guidebook source was login-walled.
Ellinor has two genuine cross-source elevation/prominence disagreements (5944 vs. 5952 ft;
538 vs. 440 ft) neither resolvable from sources reachable this pass. Six routes (Custer, Daniel,
Despair, Duckabush's sibling pattern, Fernow, Formidable) still carry the recurring
alpine_grade-holds-an-NCCS-numeral-instead-of-a-French-letter bug, but none had a source giving a
specific correct French grade to substitute, so all were left as-is (Deception's was the one
exception with clean grounds to null it, since its sub-fields already show it's an unroped
scramble). Despair's itinerary day-by-day gain/loss split still only sums to 6,000/6,000 even
after the top-level total was corrected to 12,000/12,000 — needs a human re-derivation once the
cited trailcatjim.com trip report is reachable (403'd this pass). Fernow has a very recent (Jul
28 2026) USFS trail closure not yet reflected in `access.closures`, and an ambiguous `dist_km`
that may or may not already be a round-trip figure per this repo's known dual-convention issue —
left alone per the standing guidance not to bulk-normalize that column. Custer's `dist_km` has
the same one-way-vs-round-trip ambiguity. Formidable's own naming ("North Route via Ptarmigan
Traverse") vs. every current source calling this line the "South Route" — flagged only, per the
project's convention of not renaming ids/names via SQL.

Next batch will continue alphabetically after `wa_mount_formidable_north_ptarmigan` (see progress
file).

---

## 2026-07-30 — Pass 1, Batch 26

Checked 10 routes across 8 peaks: Mount Formidable (South Face), Mount Fury West (Mongo Ridge,
West Ridge), Mount Fury East (Southeast Glaciers), Mount Goode (Northeast Buttress), Mount Hardy
(Southwest Slopes), Mount Hinman (Hinman Glacier), Mount Howard (South Slope), Mount Index (North
Norwegian Buttress, North Peak Traverse).

**Confirmed errors → fixes in `sql/2026-07-30-batch-26.sql`:**
- Mount Formidable South Face: `fa` misspelled two of the four 1938 FA climbers' names ("Calder
  Bessler, Ralph Clough") — the row's own area blurb already spells them correctly ("Bressler,
  Ray Clough"), confirmed via the Alpine Institute's Ptarmigan Traverse history and a UC Academic
  Senate in-memoriam for Ray W. Clough. Also fixed two stale approach-text elevations (Cascade
  Pass 5,560→5,392 ft; Cache Col ~6,600→~6,903 ft) that contradicted the row's own waypoints and
  Wikipedia.
- Mount Goode Northeast Buttress: `fa` dated the first winter ascent "March 3-5, 1985" — that's
  the AAJ's *publication* year; the Pilling/Mascioli climb itself was March 1984, confirmed via
  AAC Publications and independent trip-report summaries. Fixed.
- Mount Fury East's own area row (`elevation_ft`=8326) was a stale outlier against its own blurb
  (which already settles on the 2022 Gilbertson theodolite survey's 8,356±8 ft for East Fury) and
  its own Southeast Glaciers route (`high_point_ft`=8356) — fixed the area, plus a matching stale
  8326 summit-waypoint figure on the route itself, both to 8356.
- Three Mount Fury routes had gain_ft/loss_ft contradicting their own itinerary day-by-day sums
  and totalNote prose (Mongo Ridge 11000/4000 → 10000/10700; West Ridge 7000/6640 → 9100/9100;
  Hinman Glacier 3500/7800 → 6100/6300) — all fixed to match each row's own more granular data.
- Mount Hinman Glacier: `access.land_manager` said "Snoqualmie Ranger District," contradicting
  the row's own `emergency.rangerStation` ("Skykomish Ranger District") — the Necklace Valley
  approach used by this route is entirely on the US-2/Skykomish side, confirmed via the USFS
  Necklace Valley Trailhead page. Fixed.
- Mount Hinman's own area blurb opened by calling it "the second-highest summit in the Alpine
  Lakes Wilderness" — false; Mount Stuart (9,415 ft) and several Stuart Range summits exceed it,
  confirmed via Wikipedia/SummitPost. Removed the false superlative rather than guess a specific
  rank.
- Mount Howard South Slope: `grade`/`grade_system`/`grade_num`/`alpine_grade`/`disciplines` were
  all null despite the row's own overview text and the area's own blurb already describing it as
  a "Class 2-3" non-technical scramble — filled from the row's own prose plus SummitPost/
  Mountaineers.org corroboration, matching the sibling `wa_mount_hardy_snow_scramble` field for
  field. A genuine enrichment gap, not a fabricated fact.
- Mount Index North Norwegian Buttress: `high_point_ft` stored Mount Index's Main Peak elevation
  (5991), but this route tops out on the separate Middle Peak — confirmed externally (Mountain
  Project pages for both the Jötnar and Bluebell lines on this buttress state the route reaches
  Middle Peak) and internally (the row's own `waypoints` already correctly lists "Mount Index
  Middle Peak" at 5,527 ft as the Summit waypoint, and its own overview says the buttress is
  separated from Main Peak "by a deep cleft"). Fixed `high_point_ft` to 5527. Also fixed
  gain_ft/loss_ft (2200/5000 → 5000/5491, matching the row's own itinerary — the old loss_ft
  value exactly equaled the itinerary's gain total, a likely copy/swap bug).
- Mount Index North Peak Traverse: `commitment` stored "I" for a 3-day, bivy-required, roped 5.7
  three-summit traverse — directly contradicted by the row's own `access.notes` ("a serious Grade
  III+ alpine objective") and SummitPost/Beckey-sourced descriptions rating the North Face segment
  alone "Grade III, 5.7." Fixed to III as a floor (the full traverse may warrant higher; not
  guessed further). Also fixed `gain_ft` (3991 → 5800, matching the row's own itinerary sum,
  which already matched the row's own correct `loss_ft`).

**Flagged for human review (not auto-fixed):**
- Mount Fury Mongo Ridge (`wa_mount_fury_east_mongo_ridge`): same id/content-mismatch pattern as
  many prior batches — the route's own id says "fury_east" but its `area_id`, `face`, and content
  are unambiguously about West Peak (matching the area blurb: "West Fury, reached only via the
  serious Mongo Ridge"). Also, this row's own `data_quality.gaps` text claims the route is "filed
  under the East Peak area entry," which is itself wrong — the row's actual `area_id` is
  `wa_mount_fury_west`. Two distinct self-contradictions about the same underlying id mixup; not
  renamed here per this audit's standing no-rename guardrail.
- Mount Fury West Ridge (`wa_mount_fury_west_west_ridge`): the row's own `corrections` field says
  "no FA record for this connecting-ridge line could be sourced, so `fa` is left null" — but `fa`
  is *not* null; it holds a 1958 FA party/date that, per the `corrections` text's own reasoning,
  belongs to the peak's original ascent line, not this modern route. Also, `pitch_detail`
  describes an entirely different (1958-era, Hannegan-Pass-approached) route than every other
  field on the row (which describes the modern Ross Lake/Access Creek/Luna Col approach) —
  apparent two-route conflation, needs a human rewrite/split.
- Mount Fury Southeast Glaciers (`wa_mount_fury_east_southeast_glaciers`): gain_ft/loss_ft
  (6200/13000) don't reconcile three ways — neither with each other, nor with the row's own
  itinerary day-sum (6900/7200), nor with the row's own totalNote ("~13,000 ft of cumulative
  gain/loss," implying both should be ~13,000). Unlike this batch's other two Fury gain/loss
  fixes, no single source in the row settles which figure is right — left flagged.
- Two of three Mount Fury routes (West Ridge, Southeast Glaciers) have a Northwest Forest Pass
  requirement stamped on a waypoint note, contradicting the row's own `access.passRequired` (none
  needed, this is NPS land) — a new boilerplate-contamination pattern not seen in prior batches;
  sources needed to confirm/deny were 403'd this pass.
- Mount Fury East Southeast Glaciers: FA ("Don Keller, Joan Firey, and Joe Firey, 1960") could not
  be independently corroborated this pass (AAC Publications/SummitPost 403'd); general sourcing
  confirms the Fireys' documented Picket Range FA activity in this era but not this specific climb.
- Mount Goode Northeast Buttress: `alpine_grade` holds "Grade III-IV," the same recurring
  NCCS-Roman-numeral-in-the-French-adjectival-column bug flagged repeatedly in prior batches — no
  source found gives a specific French-scale (F/PD/AD/D/TD/ED) rating for this route, so left
  as-is rather than guessed. Also, `pitches` (7) conflicts with sourcing that suggests closer to
  14, and The Mountaineers.org gives "Grade III-IV, 5.4" vs. the on-file "Grade IV, 5.5" (AAC/MP) —
  sources split, on-file value has the stronger two-source backing but isn't unanimous.
- Mount Formidable South Face: Kool-Aid Lake's elevation appears as four different values across
  four fields in the same row (6,320/6,100/~6,200/6,120 ft) — no independent source found to
  settle which is right. `length_m` (183) doesn't match the row's own pitch_detail sum (75m) or
  the col-to-summit relief (~306m) — unclear what the field represents.
- Mount Howard South Slope: `length_m`=91 has no support anywhere in the row's own text (which
  explicitly says no technical rack/rope is needed) and looks like contamination from an unrelated
  technical route, matching a known bug pattern in this DB — recommend nulling (to match sibling
  Mount Hardy's null value for an equivalent scramble) but left flagged since no source justifies
  any specific replacement and this audit doesn't guess-null without one more corroborating look.
  Also flagged: `gain_ft` (4600) undercounts vs. the row's own turnaround/itinerary text
  (5,000-6,400 ft); no external source pins down an exact figure.
- Mount Index North Norwegian Buttress: `grade`="V" (yds) conflicts with `commitment`="VI" —
  sources consistently cite Grade VI for the Jötnar line described in this row. `pitches`=16
  matches Jötnar specifically but the row's `fa`/`overview` also describe the 21-pitch Bluebell
  ascent — ambiguous which line the summary fields represent.
- Mount Index North Peak Traverse: FA party name "Bill (Wolf) Schoening" could not be corroborated
  — the only Schoening independently documented as a Beckey Cascades partner in this era is Pete
  Schoening (of 1953 K2 "Belay" fame); no source found for a "Bill"/"Wolf" Schoening. AAC
  Publications was 403'd this pass; needs a human with primary-source access.

**Clean (no errors found):** Mount Hardy Southwest Slopes (Class 2-3 scramble, FA, land manager,
and gain/loss all independently corroborated and internally consistent) audited fully clean —
including a re-check of the 8,099 vs. 8,097 ft summit/waypoint gap, which the row's own overview
already explains as normal survey variance and not a new issue.

Next batch will continue alphabetically after `wa_mount_index_north_peak_traverse` (see progress
file).

---

## 2026-07-30 — Pass 1, Batch 27

Checked 8 routes across 6 peaks: Mount Index (Northeast Buttress), Mount Johnson (Standard
Route), Mount Lago (South Slope-South Face), Mount Larrabee (South Ridge), Mount Logan (Fremont
Glacier, Banded Glacier/r1, Douglas Glacier/r2), Mount Maude (North Face/r1).

**Confirmed errors → fixes in `sql/2026-07-30-batch-27.sql`:**
- Mount Index Northeast Buttress: both `waypoints` entries (and matching `gpx`) had longitudes
  ~0.24-0.25° (~19 km) too far west of the real Lake Serene Trailhead/Lake Serene, contradicted by
  WTA/Trailforks/Wikipedia and by this row's own (correct) `approach_logistics.trailheadLat/Lng`.
  Fixed. Also `rock_grade`/`grade_num` stored "5.8"/8, contradicting this row's own `corrections`
  field and `pitch_detail`, both of which already settle the crux at "5.6-5.7" — fixed to 5.7/7.
- Mount Johnson Standard Route: `gain_ft`/`loss_ft` (3150/3150) didn't match this row's own
  `high_point_ft` minus trailhead elevation (5180), which also equals the sum of every
  consecutive waypoint elevation step in the row's own data — fixed to 5180/5180. Also `approach`
  text gave Upper Royal Basin's elevation as "~5,200 ft", contradicting its own sentence's math
  and the row's own waypoint (elev 5600) — fixed to "~5,600 ft".
- Mount Lago: area `elevation_ft` (8748) contradicted the peak's own route `high_point_ft` (8745)
  and external sources (Wikipedia/Peakbagger/PeakVisor all give 8,745 ft) — fixed. The route's
  `approach_logistics` named the trailhead "Monument Creek Trailhead" at that trailhead's real,
  distinct coordinates — a different drainage unrelated to this route, contradicting the row's own
  `waypoints[0]`, `approach` text, and `road`, which all agree the real start is Robinson Creek
  Trailhead. Fixed to match the row's own correct fields.
- Mount Larrabee South Ridge: `waypoints[0]` ("Twin Lakes Trailhead") held coordinates and
  elevation byte-for-byte identical to `waypoints[1]` ("Twin Lakes") despite the row itself saying
  they're 2 road-miles apart — evidently copy-pasted. Wikipedia confirms waypoint[1] is the real
  Twin Lakes; the row's own beta places the real trailhead (end of FS-3065) about 2 miles before
  it, externally sourced at ~48.9435, -121.6625, ~3,700 ft — fixed. `approach_logistics.trailheadLat/Lng`
  were likewise near-identical to the row's own "High Pass" waypoint (a landmark 3.3 mi up-route,
  not a trailhead) — fixed to the same corrected trailhead coordinates.
- Mount Logan Fremont Glacier: `access.notes` ended with "Mount Tom area, North Cascades." —
  boilerplate contamination from an unrelated peak; this row's own `area.name`/`overview` and both
  sibling Logan routes confirm this is Mount Logan. Removed the contaminated tail.
- Mount Logan Banded Glacier (`r1`): `approach`/`approach_logistics` described an Easy Pass/Fisher
  Basin approach and a "Rainy Pass PCT North Trailhead" start, but this route's real approach
  (Beckey's Cascade Alpine Guide via Mountaineers.org, an independent trip report, and this row's
  own stored GPX track starting at 48.685,-121.093 — matching sibling route Fremont Glacier's own
  Thunder Creek GPX) is Thunder Creek Trail + Fisher Creek Trail from Colonial Creek Campground.
  Fixed the top-level `approach` summary and trailhead fields only — see flagged item below for
  what wasn't touched.
- Mount Maude North Face (`r1`): `length_m` (533, ~1,750 ft) and an `overview` line ("rises about
  1,000 vertical feet") both undercounted this route's true scale ~2.5-4x. AAC Publications' 1957
  FA account and independent route-beta summaries describe "the 4,000-foot wall on the north side
  of Mount Maude", corroborated in-row by this peak's own `area.blurb`, which already
  independently says "the 4,000-foot North Face." Fixed both fields to match.

**Flagged for human review (not auto-fixed):**
- Mount Logan Banded Glacier (`r1`): the Easy-Pass-approach contamination above runs much deeper
  than the two fields fixed — `beta`, `descent_text`, `road`, `access.closures`, `itinerary`,
  `pitch_detail`, `seasonal_guidance`, `partner_requirements`, and `data_quality` all still
  describe the wrong Easy Pass/Fisher Basin approach (which belongs to sibling route Douglas
  Glacier/`r2`, confirmed correct for that route). Rewriting a multi-day itinerary and
  pitch-by-pitch narrative with fabricated mileage/timing would itself be a fabrication risk, so
  this needs a human enrichment pass, not an audit-script fix.
- Mount Index Northeast Buttress: `dist_km` (4.5) is inconsistent with the row's own waypoint
  distance to Lake Serene alone (3.6 mi = 5.79 km, before the route even starts) but no source
  gives a confident replacement figure. `ice_grade` ("WI3-") has no support in gear/pitch_detail/
  overview (only axe/crampons for early-season snow, no ice tools) and may be fabricated, but a
  brief unlisted ice step can't be ruled out. `alpine_grade` ("D", French scale) is unsupported by
  any source and duplicates the row's own Roman-numeral `commitment` field ("III") in a different
  scale. Which Mount Index summit (Main vs. North Peak) this route's `high_point_ft` (5991, Main
  Peak) should reflect is unclear given historical FA sourcing points to North Peak.
- Mount Johnson Standard Route: the row's "Corkscrew ledge" beta (waypoint name, `pitch_detail`,
  descent text) closely mirrors independent trip-report language describing a "Corkscrew Route" —
  but those sources attribute it to neighboring Mount Clark, not Mount Johnson, matching the
  shared-col contamination pattern this audit has flagged before. Primary sources 403'd this pass.
  Also: three different permit-season windows appear across `approach`, `itinerary.cal`, and
  external sources; and the itinerary's day-by-day gain/loss splits don't reconcile with the
  corrected 5180 total (already self-flagged as "estimated" in the row).
- Mount Lago: `fa` ("Hermann Ulrichs and Dick Alt, 1933") could not be independently corroborated
  this pass. `gain_ft`/`loss_ft` (2800) is ambiguous — unclear if it's meant as full trailhead-to-
  summit gain (~6,245 ft) or just the summit-day push from an unstored camp elevation.
- Mount Larrabee South Ridge: `gain_ft`/`loss_ft` (3900) vs. the itinerary's day sum (4225) vs. the
  `sourceNote`'s implied baseline (3,640 ft) don't reconcile — likely downstream of the corrected
  trailhead waypoint above; recommend recomputing after that fix lands rather than guessing now.
  Also `dist_km` (6.4) doesn't reconcile against waypoint-summed one-way distance or the stated
  round trip — a known cross-table convention issue per CLAUDE.md, not normalized here.
- Mount Logan Fremont Glacier: `gain_ft`/`loss_ft` (8900/9600) don't match the itinerary's
  symmetric day-sum (8200/8200); same mismatch pattern on both sibling Logan routes suggests a
  differing accounting convention rather than a one-off error, needs a guidebook total to resolve.
- Mount Logan Banded Glacier (`r1`): `gain_ft`/`loss_ft` (7027/13000) disagree with both the
  itinerary's day-sum (8100/8100) and its own `totalNote` ("~12,500 ft") — three different figures
  in one row, none independently verifiable from available sources.
- Mount Logan Douglas Glacier (`r2`): the row's own `itinerary.sourceNote` already admits mileage
  inconsistency across sources; its cited "6,800 ft" gain doesn't match stored `gain_ft` (7000) or
  the itinerary day-sum (9200) either — pre-existing, self-flagged ambiguity.
- Mount Maude North Face (`r1`): `dist_km` (6.4) undercounts the row's own waypoint-implied one-way
  distance (~8 mi/12.9 km) and itinerary total (~14 mi round trip) — the known one-way/half-round-
  trip convention issue per CLAUDE.md, not bulk-normalized here. `loss_ft` (400) vs. the
  itinerary's day-level loss (6000) may reflect different intended scopes (one-way climb vs. a
  full loop day with a different descent) rather than a contradiction — flagged rather than
  guessed.

**Clean:** No route in this batch was fully clean — every route had at least one confirmed fix or
an open flag (Mount Logan Douglas Glacier/`r2` had no confirmed errors, but its own itinerary
inconsistency was already self-flagged in the data).

Next batch will continue alphabetically after `wa_mount_maude_r1` (see progress file).

## Batch 28 — 2026-07-30 (Pass 1)

Checked 8 routes across 5 peaks, `wa_mount_maude_r2` through `wa_mount_price_hester_lake_route`
(continuing alphabetically after `wa_mount_maude_r1`): Mount Maude (Entiat Ice Fall/`r2`), Mount
Olympus (Blue Glacier, West Ridge), Mount Persis (The Hexorcist, West Ridge), Mount Pilchuck (East
Ridge, Standard Route), Mount Price (Hester Lake Route).

**Confirmed fixes (2):**
- Mount Olympus Blue Glacier: the row's own `waypoints` summit entry stored `elevFt` 7973 for
  "Mount Olympus (West Peak)", contradicting this same row's own `high_point_ft` (7980), the
  sibling `wa_mount_olympus_west_ridge` row's summit waypoint (7980), and the externally-confirmed
  NPS/USGS figure of 7,980 ft. Fixed the waypoint to 7980.
- Mount Pilchuck Standard Route: the row's own `waypoints` summit/lookout entry stored `elevFt`
  5341, contradicting this same row's own `high_point_ft` (5324), the sibling
  `wa_mount_pilchuck_east_ridge` row's `high_point_ft` (also 5324), and the externally-confirmed
  USGS figure of 5,324 ft. Fixed the waypoint to 5324.

**Coordinates/peak sanity checks:** all 5 peaks' stored summit lat/lng (Maude, Olympus, Persis,
Pilchuck, Price) fall within a plausible bounding box for the named peak and match published
coordinates — no contamination pattern found in this batch, unlike several recent batches.

**Flagged for human review (3):**
- Mount Olympus West Ridge: `fa` ("1964, Gary Maykut, Len Miller, and Joe Witte") could not be
  independently corroborated this pass — no guidebook/archive source found confirming this specific
  route first ascent (as opposed to the peak's 1907 first ascent, which is well documented and
  matches the Blue Glacier row). Not fixed or removed since it also can't be refuted.
- Mount Persis The Hexorcist: `fa` reads "Likely Bryan Burdo & Bill Enger, 1985 (see corrections)"
  but this row's own `corrections` field only documents the `high_point_ft` fix and says nothing
  about the FA — a dangling, unresolved pointer. Bryan Burdo's authorship as route developer is
  corroborated (Mountain Project), but the 1985 date and Bill Enger's involvement could not be
  independently confirmed this pass, so left as-is rather than guessing at a rewrite.
- Mount Pilchuck East Ridge: has no `waypoints`/`gpx` data on file at all (unlike every other route
  in this batch), so the trailhead/summit coordinates for this specific line can't be sanity-checked
  against the peak's own summit fix above — a data gap, not something to fabricate.

**Clean:** Mount Persis West Ridge (`fa` 1917/Hinman independently corroborated by multiple
sources; elevation, coordinates, access/permit and hazard text all check out) and Mount Price
Hester Lake Route (elevation 5,587 ft corroborated by secondary sources despite one topo-service
outlier of 5,535 ft; approach/hazard text plausible) had no confirmed errors or open flags this
pass.

Next batch will continue alphabetically after `wa_mount_price_hester_lake_route` (see progress
file).

## Batch 29 — 2026-07-30 (Pass 1)

Checked 10 routes across 2 peaks, `wa_mount_rahm_standard` through `wa_mount_rainier_kautz_glacier`
(continuing alphabetically after `wa_mount_price_hester_lake_route`): Mount Rahm (Standard Route)
and Mount Rainier (Curtis Ridge, Disappointment Cleaver, Edmunds Headwall, Emmons-Winthrop Glacier,
Fuhrer Finger, Fuhrer Thumb, Gibraltar Ledges, Ingraham Direct, Kautz Glacier).

**Confirmed fixes (10):**
- Six Rainier summit routes (Disappointment Cleaver, Emmons-Winthrop Glacier, Fuhrer Finger,
  Gibraltar Ledges, Ingraham Direct, Kautz Glacier) stored `high_point_ft` 14410, the stale
  pre-2024-survey figure — contradicting this same peak's own `area` row, which an earlier pass
  had already corrected to 14406 ft (NAVD88), matching the August 2024 GPS survey (Gilbertson et
  al., "Mount Rainier Elevation Survey 2024") that found Mount Rainier's true high point shifted
  from the melting, icecapped Columbia Crest to the rocky Southwest Rim, now measured at
  14,399.6 ft NGVD29 / 14,406.2 ft NAVD88. Three of the six (Fuhrer Finger, Gibraltar Ledges,
  Ingraham Direct) had already had their own `waypoints` summit entries corrected to 14406 in a
  prior pass but never had `high_point_ft` updated to match — a self-contradiction within the same
  row. Fixed `high_point_ft` on all six, plus the still-stale `waypoints` summit entries on
  Disappointment Cleaver, Emmons, and Kautz Glacier.
- Kautz Glacier's `fa` claimed the route "to the true summit [was] proven practicable by Joe Hazard
  of the Seattle Mountaineers in 1921 and 1924" — this claim doesn't match any source found. Three
  independent sources (American Alpine Institute's route history, a July 11 1920 letter from Roger
  Toll to Harry Myers held in UW's Pacific Northwest Historical Documents Collection responding to
  Myers's own published account of the climb, and general Rainier climbing-history summaries) agree
  the Kautz Glacier route's first full ascent to the summit was June 26–28, 1920, by Hans Fuhrer,
  Heinie Fuhrer, Roger Toll, and Harry Myers. Fixed to the corroborated history, keeping the
  existing (and accurate) note about Kautz's non-summiting 1857 attempt.
- Emmons-Winthrop Glacier's `fa` named "Warner Forbes, Jones, and Wells, August 1884" — two of the
  three names are wrong. Multiple sources (NPS Nature Notes history, SummitPost, and Snohomish
  local-history accounts) agree the actual Aug 20, 1884 first-ascent party was Rev. J. Warner
  Fobes, George James, and Richard O. Wells — "Forbes" is a misspelling of "Fobes," and "Jones" is
  simply the wrong name (it was James). Fixed; also added the specific date since every source
  agreed on it.
- Fuhrer Thumb's `gain_ft` (3599) contradicted its own `waypoints` (Paradise trailhead 5,400 ft →
  Columbia Crest summit 14,406 ft implies ~9,006 ft of gain) and its own `loss_ft` (9000, via a
  different descent line) — no other field in the row supports 3599. Fixed to 9000, matching the
  row's own elevation data.
- Mount Rahm Standard Route's trailhead waypoint had a leaked internal research comment sitting in
  its `note` field ("Reused coordinate from this session's own Devil's Club (Southeast Mox Peak)
  research...") instead of normal descriptive text — same leaked-audit-commentary pattern already
  fixed on Mount Constance West Arete (batch 24) and Liberty Bell Serpentine Crack (batch 19).
  Coordinates were already correct and untouched; only the note text was reworded.

**Coordinates/peak sanity checks:** Mount Rahm and Mount Rainier's stored summit lat/lng both fall
within a plausible bounding box for the named peak and match published coordinates.

**Flagged for human review (3):**
- Curtis Ridge has a `waypoints` entry named "Columbia Crest" typed `Summit` with no `elevFt` at
  all, while the route's own `high_point_ft` (13800) implies the route does *not* reach the true
  summit. Unclear whether Curtis Ridge actually continues to the top (joining Liberty Ridge/the
  upper mountain, as some general route descriptions suggest) or tops out around 13,800 ft with a
  mislabeled waypoint — Mountain Project's dedicated route page 403'd this pass and no other
  route-specific topout source was found. Needs a human with page access or a guidebook.
- The recurring `alpine_grade`-holds-an-NCCS-Roman-numeral-instead-of-a-French-adjectival-letter
  bug (flagged and partially fixed in batches 9/19/21/23/25) affects 8 of this batch's 10 routes
  (Rahm, Curtis Ridge, Disappointment Cleaver, Emmons, Fuhrer Finger, Gibraltar Ledges, Ingraham
  Direct, Kautz Glacier). Checked sources for the two most technical candidates (Fuhrer Finger,
  Kautz Glacier) and found only NCCS/YDS grades cited anywhere (Mountaineers.org, AAI, Mountain
  Project) — no French adjectival letter for any of them, consistent with batch 23's finding that
  moderate PNW glacier routes usually aren't assigned an adjectival grade at all. Left unfixed
  rather than guess a letter.
- Mount Rahm's on-file elevation (8,485 ft) sits between two conflicting external figures found
  this pass (8,480 ft vs. Wikipedia's 8,486 ft) — not an outlier against either, so left as-is;
  noted only in case a future pass finds a definitive source. Its own `prominence_ft` (280) matches
  Wikipedia's figure exactly.

**Clean:** Gibraltar Ledges' FA (Hazard Stevens & P.B. Van Trump, Aug 17 1870) was independently
corroborated by multiple sources. Fuhrer Finger's FA party (Hans Fuhrer, Heine Fuhrer, Joseph
Hazard, Thomas Hermans, July 2 1920) matches external sources for 4 of the 5 documented climbers —
one source also credits a fifth participant (Peyton Farrer) not present in this row, a minor
completeness gap rather than an error, not worth a SQL patch. Edmunds Headwall's `alpine_grade`
('D') was already correctly typed — no issue.

Next batch will continue alphabetically after `wa_mount_rainier_kautz_glacier` (see progress file).

---

## 2026-07-31 — Pass 1, Batch 30

Checked 10 routes across 3 peaks: Mount Rainier (Kautz Headwall, Liberty Ridge, Mowich Face,
Nisqually Icefall, Ptarmigan Ridge, Sunset Ridge, Tahoma Glacier, Willis Wall), Mount Redoubt
(South Face / Redoubt Glacier), Mount Seattle (Noyes Basin Route).

**Confirmed errors → fixes in `sql/2026-07-31-batch-30.sql` (9):**
- Learned that batch 29's fix pattern ("stale `high_point_ft`=14410 → the area's corrected 14406")
  doesn't apply peak-wide: Liberty Ridge, Ptarmigan Ridge, and Willis Wall are north-face routes
  whose own `waypoints` already correctly name their top-out as **Liberty Cap** (14,112 ft) — a
  real, separate, lower summit block on Rainier's crater rim, not the true summit. Externally
  confirmed (IMG, SummitPost, Mountain Project) that Liberty Ridge's defined technical climbing
  ends at Liberty Cap; reaching the true summit needs a further, optional traverse. Fixed all
  three to 14112 to match their own waypoints, instead of 14406.
- Kautz Headwall, Nisqually Icefall, and Tahoma Glacier had the ordinary stale 14410/14411 figure
  (south/west-side routes that do reach the true summit) — fixed to 14406, same as batch 29.
  Mowich Face and Sunset Ridge already had the correct 14112 Liberty-Cap figure — audited clean.
- Kautz Headwall's `fa` field was a verbatim copy of the sibling standard Kautz Glacier route's
  1920 FA (fixed in batch 29) — cleared to NULL rather than guess; no source documents a distinct
  first ascent for this ice-headwall variation.
- Liberty Ridge's `fa` had a garbled, duplicated-parenthetical rendering of its second and third
  climbers ("Will (Arnold) Borrow (Campbell), and Arnold Campbell") — fixed via the AAC's own 1936
  publication and Mountaineers/Filson retrospectives to "Ome Daiber, Will Borrow, and Arnold
  Campbell, September 28-October 1, 1935".
- Mount Redoubt's area `elevation_ft` (8963) was the sole outlier against its own South Face
  route's `high_point_ft` (8969) — the route's own `corrections` field had already researched and
  settled on 8,969 ft (Wikipedia, Peakbagger, PeakVisor) but that figure was never applied to the
  area row. Fixed.
- Mount Seattle's Noyes Basin Route had the recurring null-top-level-grade-despite-populated-
  sub-fields bug (batches 6/10/17/19/26): `grade`/`grade_system`/`grade_num`/`disciplines` were
  null despite `alpine_grade`='Grade I' and the route's own beta text already citing "Route 1,
  Grade I, Class 3" from the *Climber's Guide to the Olympic Mountains*. Filled to Class 3 /
  class / 3 / `["scrambling"]`, matching sibling South Slopes' convention.

**Clean:** Mowich Face and Sunset Ridge (elevation already correct); Tahoma Glacier's 1891 FA
(Van Trump, Drewry, Riley, with a dog) independently corroborated externally.

**Flagged for human review (4):**
- Ptarmigan Ridge / Willis Wall: both routes' approach text correctly documents that the
  traditional trailheads (Mowich Lake Road, Carbon River Road via Ipsut Creek) are no longer
  drivable as of 2026 and the Fairfax Bridge closed permanently in April 2025, so most parties now
  approach via White River Campground — but each route's `waypoints` array still lists only the
  old trailhead, with no White River Campground point added even though its coordinates already
  exist in `approach_logistics`. Left flagged rather than inserting a new waypoint entry.
- Kautz Headwall: no source found documents a distinct FA for this variation — left NULL.
- Liberty Ridge: `gain_ft` (9708) runs a bit higher than a straight Mowich Lake→Liberty Cap delta
  (~9,312 ft) would suggest — plausibly camp-to-camp ups/downs, not independently confirmed.
- Mount Redoubt South Face: its own `corrections` field also notes a competing 2020s LiDAR
  re-survey figure (8,958 ft) — used the better-corroborated 8,969 ft this pass, but a future pass
  should recheck if the LiDAR figure becomes more widely cited.

Next batch will continue alphabetically after `wa_mount_seattle_noyes_basin` (see progress file).

---

## 2026-07-31 — Pass 1, Batch 32

Checked 10 routes across Mount Shuksan (White Salmon Glacier), Mount Spickard (Southwest Route),
Mount St. Helens (Monitor Ridge, Worm Flows), Mount Steel (First Divide Route), and Mount Stuart
(Girth Pillar, Ice Cliff Glacier, North Face, North Ridge Complete, Stuart Glacier Couloir).

**Confirmed errors → fixes in `sql/2026-07-31-batch-32.sql` (5, touching 8 fields across 5
routes):**
- White Salmon Glacier, Ice Cliff Glacier, and Stuart Glacier Couloir all had `watch_out` stored
  as one newline-joined string instead of a JSON array — the same rendering bug caught on Fisher
  Chimneys in batch 31 (`lib/db.js`'s `toArr()` only splits on commas, so the app would render
  each route's hazard list as a single run-on bullet instead of separate items). Converted all
  three to proper JSON arrays.
- The same three routes also carried the recurring "Mount Tom area, North Cascades." junk clause
  at the end of `access.notes` (DB-wide copy-paste contamination first identified in batch 15,
  already confirmed on 3 Shuksan routes in batch 31) — stripped from all three.
- Mount Stuart North Ridge (Complete): `fa` credited the right climbers (Mead Hargis & Jay
  Ossiander) with the wrong year (1963). Cross-checked via several independent searches
  (converging on American Alpine Institute's route-history profile): 1963 was actually Fred
  Beckey & Steve Marts's earlier ascent via a lower-ridge variation, seven years before Hargis &
  Ossiander's 1970 toe-to-summit line over the Great Gendarme — the route this row actually
  describes and the one most parties climb today. Fixed the year and added a short note
  distinguishing it from the two earlier partial/variation ascents (Claunch & Rupley's ungendarmed
  1956 ascent, and Beckey & Marts's 1963 lower-ridge version) so one field doesn't conflate three
  distinct historical climbs.
- Mount Spickard Southwest Route: `corrections` stated "this page uses 8,980 ft" for the summit
  elevation, but the row's own `high_point_ft` actually stores 8979 — a plain contradiction
  between the row's documented reasoning and its real data. External sources genuinely disagree
  on this summit's elevation (8978 ft lidar-revised Wikipedia figure, 8979 ft traditional
  Wikipedia/trailcatjim figure, 8980 ft PeakVisor, 8983 ft older listsofjohn.com and this peak's
  own `areas.elevation_ft` row), so rather than pick a winner among them, the fix only makes the
  corrections text match what the row already stores (8979, the traditional figure).

**Clean:** Ice Cliff Glacier's FA (Bill & Gene Prater, Dave Mahre, Aug 5 1957) and Stuart Glacier
Couloir's FA (Helmy Beckey & Larry Strathdee, June 1944) were both independently corroborated
externally. Mount Steel First Divide Route's trailhead waypoint (47.5155, -123.3295) matches the
NPS-published Staircase Ranger Station GPS coordinates exactly; its distance/gain figures are
internally consistent (12.7 mi to First Divide ≈ the stored 20.4 km, and trailhead→First
Divide→summit elevation deltas sum to the stored 5,440 ft gain). Monitor Ridge and Worm Flows'
permit/quota text matches current (2026) Recreation.gov terms; Mount St. Helens's on-file FA
("Unknown, 1853") is a reasonable hedge given historians still debate the exact circumstances of
Thomas J. Dryer's disputed first ascent.

**Flagged for human review (4):**
- Mount Spickard: the area row's `elevation_ft` (8983) still disagrees with the route's
  `high_point_ft` (8979) — left both as-is since external sources don't converge on a single
  correct figure (see above); a future pass should recheck if a lidar-based figure becomes the
  clear consensus.
- White Salmon Glacier's `fa` ("Piley, Richards, Thompson — September 9, 1926") could not be
  independently confirmed or contradicted by any source found this pass — left unverified.
- Girth Pillar's `fa` ("Kit Lewis & Jim Nelson, 1983") is partially corroborated (a source
  confirms Lewis and Nelson made the first winter ascent of "their" Girth Pillar route, implying
  they did establish it) but the 1983 date itself was not independently confirmed — left as-is
  rather than guess.
- Mount Stuart North Face: already correctly flagged as an unverified fabricated duplicate of
  Ice Cliff Glacier by a prior research pass (2026-07-28, `verif.status="unverified"` with a
  detailed `corrections` note). Re-verified the flag is accurate — no source checked this pass
  documents a distinct "North Face" route on Mount Stuart — and left untouched; no new action
  needed. Also noted but not fixed: its `grade_num` field doesn't match any of the routes here
  (Stuart Glacier Couloir's `grade_num`=3 doesn't correspond to its M5-/WI2-3 grades), but
  `lib/db.js` never maps `grade_num` into the app's route object — the UI derives its own grade
  number from the `grade` text via `gn()` at render time — so this is inert stored data with no
  live rendering impact, not worth a guess-based fix.

Next batch will continue alphabetically after `wa_mount_stuart_stuart_glacier_couloir` (see
progress file).

---

## 2026-07-31 — Pass 1, Batch 34

Six peaks, 8 routes (Mount Torment 2, Cathedral Peak 1, Needle Peak 1, Snowfield Peak 1, North
Early Winters Spire 1, Nooksack Tower 2): South Ridge, Torment-Forbidden Traverse (Torment); NE
Ridge (Cathedral); North Ridge (Needle); Neve Glacier/West Ridge (Snowfield); Northwest Corner/
Boving-Pollack (North Early Winters Spire); East Ridge/Beckey Route, South Face (Nooksack Tower).

**Confirmed errors → fixes in `sql/2026-07-31-batch-34.sql` (5, touching 6 fields across 4
routes):**
- Mount Torment South Ridge: `grade`/`commitment`/`alpine_grade` overstated the route as
  Grade II-III/III — independent sources (including a SummitPost page literally titled "South
  Ridge, II, 5.4") consistently give it as Grade II. Corrected all three fields.
- Snowfield Peak Neve Glacier/West Ridge: the Pyramid Lake Trailhead waypoint's `elev` (2500)
  contradicted both external trail data and this same row's own `approach` text, which correctly
  says "~1,150 ft" — looks like a value copied from the lake instead of the trailhead. Fixed.
- North Early Winters Spire NW Corner: the Blue Lake Trailhead waypoint carried a note claiming
  a *previous* audit pass had "corrected" its coordinate from (48.5191,-120.6742) to
  (48.5168,-120.6573) because the former was ~1.3km off. Re-verifying independently (Trailforks,
  WTA, The Mountaineers) found the opposite — the original coordinate was the real trailhead, and
  the "correction" was a regression that moved it 1.3km to nowhere in particular. Reverted the
  coordinate and rewrote the note; also fixed the same waypoint's `elevFt` (5200 → ~5,400, matching
  external sources and this row's own approach text).
- North Early Winters Spire NW Corner: a `hazards` entry describing the real, well-corroborated
  May 2025 Early Winter Couloir anchor-failure fatalities (3 dead, 1 seriously injured, a single
  rusted piton pulled while the whole party was clipped to it) dated the incident May 11 — every
  news source dates the fall itself to the evening of May 10 (the 911 call, from the injured
  survivor after reaching help, was the morning of the 11th). Corrected the date.
- Nooksack Tower East Ridge/Beckey Route: `name` ("East Ridge / Beckey Route") contradicted this
  same row's own `aspect`/`face` fields (N/NE, North Face) and every external source, which call
  it the Beckey-Schmidtke or North Face route — it climbs a north-facing ice couloir to a north
  arête, never an east ridge. Renamed to "North Face (Beckey-Schmidtke Route)"; the row's own
  beta/approach/pitch detail already correctly described the real route, so only the name was
  wrong.

**Clean:** Needle Peak North Ridge's FA claim (Blake Herrington & Tim Halder, Aug 19-20 2006,
opening a traverse to Bonanza Peak) is corroborated by the AAJ account and cross-checked against
the same pair's Tupshin Peak climb ten days earlier; its mostly-null grade/pitch fields are
appropriate given the only source rates the whole two-day traverse, not this segment alone.
Nooksack Tower South Face's FA (Klubberud & Manfredi, July 2002), pitch count, and grade (V,
5.10-) are all independently confirmed against AAC Publications.

**Flagged for human review (9):**
- Mount Torment South Ridge: three of four `pitch_detail` grades (5.5) run hotter than the
  confirmed Grade II/5.4 cap — no pitch-by-pitch source found to assert a specific fix.
- Mount Torment (both routes): `fa` spells the FA's second climber "Walter Sellers" on one row
  and "Walt Sellers" on the other — both spellings appear in reputable sources for what's almost
  certainly the same person; no primary source reachable to settle which the guidebook of record
  uses.
- Mount Torment (both routes): `dist_km` (4.8 on both) reads low against external figures
  (~10 mi RT for the South Ridge, 9.0 mi one-way for the Traverse per Mountain Project) — flagged
  per this repo's standing caution against guessing at that column's intended convention.
- Cathedral Peak NE Ridge: `gain_ft` (4700) is arithmetically too low given this row's own
  trailhead/summit elevations (net gain alone is already 5,556 ft before the approach's known dip
  into Spanish Creek) — no source gives an exact figure to replace it with.
- Cathedral Peak NE Ridge: `fa` (August 1973) and the grade/pitches trio (5.3/II/7) couldn't be
  matched to a locatable Mountain Project page under this route name — the one Cathedral Peak
  ridge route confirmed by URL ("North Ridge") is a different, better-documented line. Possible
  route misidentification; needs direct MP/Beckey access to resolve.
- Nooksack Tower East Ridge/Beckey Route: the Nooksack Cirque Trailhead waypoint's elevation
  (2,200 ft) matches neither the USFS-published trailhead location/elevation nor this row's own
  approach text, and is much closer to the described washout/parking point — possibly mislabeled.
- Nooksack Tower East Ridge/Beckey Route: the river-ford waypoint sits ~1.1 mi from the ford
  coordinate given in this row's own approach text — an internal inconsistency neither source
  could resolve.
- Nooksack Tower East Ridge/Beckey Route: `season` ("Jun-Aug") and `best_season` ("mid-July
  through September") disagree with each other on both ends of the window.
- North Early Winters Spire NW Corner: the summit waypoint is plausible (right massif, right
  elevation) but no source specifically pins the North spire's coordinates apart from the more
  commonly cited South spire point — low priority.

Also noted but not touched: current (2026) status of Forest Road 32/Ruth Creek (Nooksack Tower's
access road) couldn't be confirmed beyond general regional flood-damage reporting — an
access-conditions question for a human to check directly, not a database fact error.

Next batch will continue alphabetically after `wa_nooksack_tower_south_face` (see progress file).

## 2026-07-31 — Pass 1, Batch 35

Eight peaks, 8 routes: North Face (Lexington Tower); North Face Var. Right/Directisimo (Concord
Tower); Fight or Flight (Castle Peak, Pasayten); Northwest Couloir/Cedar Creek approach (North
Gardner Mountain); North Ridge (Whatcom Peak); North Ridge (Cutthroat Peak); North Ridge (Primus
Peak); Northeast Buttress (Colchuck Peak).

**Confirmed errors → fixes in `sql/2026-07-31-batch-35.sql` (5, touching 4 routes):**
- Concord Tower North Face Var. Right (Directisimo): `high_point_ft` (7569) contradicted this
  same row's own summit waypoint (stored at 7560) as well as external sources, which consistently
  give Concord Tower's summit as 7,560 ft. Corrected.
- North Gardner Mountain Northwest Couloir: `high_point_ft` (8963, also duplicated onto the
  summit waypoint) was off by 7 ft — Wikipedia/Wikidata/Mountaineers.org/peakery.com all agree on
  8,956 ft, and the summit coordinate itself matches Wikidata to within ~10m, so only the number
  was wrong. Fixed on both fields.
- North Gardner Mountain Northwest Couloir: the Cedar Creek Trailhead waypoint was missing
  lat/lng entirely (the only trailhead in this batch with nulls) — filled with 48.5792,-120.4787,
  corroborated independently by WTA and Trailforks for the real USFS Trail #476 trailhead.
- Whatcom Peak North Ridge: a `hazards` entry conflated two adjacent glaciers — the cited 2017
  NPS climbing ranger blog post attributes a "bare ice, shallow crevasse crossing" observation to
  Whatcom Glacier, not Challenger Glacier as stored; the same account calls Challenger Glacier's
  crevasses "open but easy to navigate." Corrected the attribution (note: the primary NPS page
  403'd on direct fetch this pass, so this rests on search-engine synthesis of that page rather
  than a full-text read — worth a human re-check once the page is reachable).
- Colchuck Peak Northeast Buttress: `fa` ("Mark Weigelt and Julie Brugger, 1970") was a
  cross-peak misattribution — Weigelt's real 1970 FA is Backbone Ridge on the neighboring
  Dragontail Peak, climbed with John Bonneville, not Julie Brugger, and not this route
  (independently confirmed via Climbing.com, AAC Publications, SummitPost). No source found gives
  a correctly-attributed FA for this route itself, so the field was set to note the fact is
  unverified rather than guess a replacement.

**Clean:** Lexington Tower North Face (FA, grade, summit elevation, "Stegosaur" descent all
independently confirmed). Castle Peak Fight or Flight (FA party/date/detail, elevation matching
Gilbertson's GPS resurvey, Canada-side approach all confirmed). Primus Peak North Ridge (existing
"needs more research" FA flag left standing — circumstantially well supported this pass via an
AAC Publications 1987 AAJ entry and Mark Bebie's obituary, but the article text itself couldn't
be read to confirm authorship, so not marked resolved). Cutthroat Peak North Ridge (FA date,
summit elevation, approach, and grade all consistent — see flags below for two minor unresolved
details).

**Flagged for human review (4):**
- North Gardner Mountain Northwest Couloir: Cedar Creek Trailhead `elevFt` (2961) is ~80-115 ft
  lower than WTA/USFS published figures (~3,040-3,075 ft) — sources disagree by more than
  rounding and the origin of the stored figure couldn't be identified.
- Whatcom Peak North Ridge: `fa` calls the North Ridge "the original first ascent of Whatcom
  Peak" — the 1936 Berry/Buchanan ascent of the peak itself is solid, but no source ties it to
  this specific ridge line rather than another route.
- Cutthroat Peak North Ridge: the third 1940 FA climber's surname ("Ed Kenney") couldn't be
  confirmed — searches repeatedly surfaced "Ed Kennedy" instead, with no primary source reachable
  to settle the spelling.
- Cutthroat Peak North Ridge: the West Ridge descent's rappel count ("4-5 rappels") is higher
  than at least one independently found description (two 30m rappels plus downclimbing) — could
  be real party-to-party variation; no single source settled on a count.

Next batch will continue alphabetically after `wa_northeast_buttress_4` (see progress file).

## 2026-07-31 — Pass 1, Batch 36

Eight peaks, 8 routes: Northeast Face Direct (Mount Formidable); Northeast Ridge, 1963 Route
(Johannesburg Mountain); Northwest Arete (Argonaut Peak); Northwest Buttress (Sloan Peak);
Northwest Face (Kangaroo Temple); Northwest Face, Boving-Pollock (South Early Winters Spire);
Standard Route / Northwest Spire (Northwest Mox Peak); Northwest Ridge (Dorado Needle).

**Confirmed errors → fixes in `sql/2026-07-31-batch-36.sql` (5, touching 4 routes):**
- Johannesburg Mountain Northeast Ridge (1963 Route): `approach_logistics.trailheadLat/Lng`
  was mislabeled as the Cascade Pass junction (3.6 mi up-trail) instead of the actual trailhead —
  the row's own `waypoints` array already carries a corrected trailhead point with a note
  explaining an earlier ~1.2km DB-pin fix, but that fix was never propagated to
  approach_logistics. Corrected to match, cross-checked against this batch's own Mount Formidable
  route, which shares the identical real-world trailhead.
- Argonaut Peak Northwest Arete: the short `descent` field said to simply reverse the arête back
  to the notch, directly contradicting this row's own more detailed `descent_text`/`rappel_detail`
  (both describe a 4-rappel traverse east to the Argonaut-Colchuck col instead). Rewrote the short
  field to match the row's own already-correct detail.
- Northwest Mox Peak Standard Route: two fixes on the same waypoint — `elev` (1800) contradicted
  the row's own approach text ("park at 2,350 ft") and the identical trailhead coordinate on
  sibling wa_southeast_mox_peak_se_rib (2350 ft); and the waypoint's `note` was a leaked internal
  research artifact ("Reused coordinate from this session's own Southeast Mox Peak research...")
  — the same session-leak pattern fixed on Dragontail Peak's Serpentine Arete in batch 19.
  Replaced with normal trailhead description text.
- Dorado Needle Northwest Ridge: the trailhead waypoint (and matching first `gpx` point) was
  stored ~8km from the real trailhead, contradicted by this row's own `approach_logistics` field
  and by all 4 sibling Eldorado Peak routes in the DB, which agree on the correct coordinate for
  the shared trailhead this route's own approach text says it uses. Corrected both.

**Clean:** Mount Formidable's Northeast Face Direct (FA, 11-year ascent gap, elevation, trailhead
all independently confirmed — existing unverified-surname flag left standing). Sloan Peak's
Northwest Buttress (route stats, elevation, approach all confirmed; FA-year ambiguity already
resolved by a prior pass). Kangaroo Temple's Northwest Face (Beckey brothers' 1942 FA, elevation,
approach all confirmed).

**Flagged for human review (2):**
- South Early Winters Spire Northwest Face (Boving-Pollock): `fa` records only the 1977 free
  ascent (Boving & Kerns), while the row's own overview describes a separate 1976 aid FA by
  Boving & Pollock that the field omits — row's own data_quality note already flags this as
  unresolved (key corroborating source 403'd), left unfixed per standing policy.
- wa_southeast_mox_peak_se_rib (out of this batch's scope): carries the same leaked
  internal-research-note pattern found and fixed on this batch's Northwest Mox Peak route, on its
  own Depot Creek Road trailhead waypoint — worth a future batch or a dedicated DB-wide sweep for
  this note-leak pattern.

Next batch will continue alphabetically after `wa_northwest_ridge` (see progress file).

## 2026-07-31 — Pass 1, Batch 37

Six peaks, 8 routes: Northwest Ridge (Boston Peak); NW Face Var., Remsberg Variation
(Liberty Bell Mountain); NW Ridge (Colchuck Balanced Rock); Southwest Route (Old Guard
Peak); South Ridge / PCT approach (Old Snowy Mountain); Blue Glacier/Snow Dome East Face
Ramps, Summit Block Northwest Edge Finish, and the West-Middle-East Traverse (Mount
Olympus, 3 routes).

**Confirmed errors → fixes in `sql/2026-07-31-batch-37.sql` (4, touching 4 routes):**
- Old Guard Peak Southwest Route: `access.land_manager` ("Mt. Baker-Snoqualmie National
  Forest, Darrington Ranger District") contradicted this same row's own, more detailed
  `access.landManager` and `emergency.rangerStation` fields, which correctly place the
  peak in Okanogan-Wenatchee NF's Chelan Ranger District (south of Cache Col, in Glacier
  Peak Wilderness, outside North Cascades NP) and only credit Darrington RD with the
  separate western Suiattle River/Downey Creek access corridor. `access.parking_pass`
  separately claimed a Northwest Forest Pass was needed "at Mountain Loop Highway
  trailheads" — an unrelated Mt. Baker-Snoqualmie NF corridor nowhere near this route,
  contradicting the row's own `access.passRequired` field (already correctly "no pass
  needed"). Both corrected — the same wrong-ranger-district/wrong-corridor contamination
  pattern seen in batches 4, 5, 8, and 12.
- Mount Olympus Blue Glacier/East Face Ramps: `access.notes` carried the exact "Mount Tom
  area, North Cascades" string plus a Northwest Forest Pass claim — the identical
  DB-wide copy-paste contamination first identified in batch 15 (35 affected rows at the
  time, including a Wyoming route). Mount Olympus sits in Olympic National Park on the
  Olympic Peninsula, nowhere near the North Cascades; corrected to match this row's own
  already-correct `permit`/`access.land_manager`/`access.parking_pass` fields (NPS
  Olympic NP entrance fee, not a Forest Service pass).
- Mount Olympus Blue Glacier/East Face Ramps: the West Peak summit waypoint's `elevFt`
  (7973) was the sole outlier against this same row's own `high_point_ft` (7980), the
  area row's `elevation_ft` (7980), and the identical West Peak waypoint on both sibling
  routes audited this batch (Summit Block Northwest Edge Finish, Traverse — both 7980).
  Fixed to 7980.
- Mount Olympus Summit Block, Northwest Edge Finish: top-level `grade` was null despite
  populated, internally-consistent `alpine_grade` (PD), `rock_grade` (5.4), `commitment`
  (Grade III), and `pitch_detail` (Class 5.3-5.4) — the recurring null-grade-despite-
  populated-subfields bug (batches 6/10/17/19/26/30/31/33). Filled as "Grade III; 5.4",
  matching sibling wa_olympus_blue_glacier_east_ramps's grade format.
- Mount Olympus Traverse: `rope_note` read "West Peak (7,969ft)", the sole outlier
  against this same row's own `high_point_ft`, its own West Peak waypoint, and the area
  row's `elevation_ft` (all 7980) — a plain digit-transposition typo. Fixed to 7,980ft.

**Clean:** Boston Peak's Northwest Ridge (elevation, FA, and trailhead all internally
consistent; the row's own `corrections` field already resolves a July-vs-August FA-month
source discrepancy). Liberty Bell's NW Face Var. (Remsberg Variation) (pitch grades,
shared P1-P2 with the standard route, summit elevation matching 8 sibling Liberty Bell
routes, and Methow Valley RD access details all consistent). Old Snowy Mountain's South
Ridge/PCT route (elevation, approach, Cowlitz Valley RD land manager, and the December
2025 FR-21 washout closure all independently corroborated).

**Flagged for human review (2):**
- Colchuck Balanced Rock NW Ridge: `pitches` is stored as 0, contradicting the row's own
  overview/hazards text describing "a few pitches of low 5th class... up to 5.6" plus a
  documented descent rappel — real roped multi-pitch climbing, not an unroped scramble.
  The cited source (Steph Abegg's trip report) 403'd on fetch this pass and no Mountain
  Project page gave an exact pitch count; "a few" isn't specific enough to assign a
  number, so left flagged rather than guessed.
- Old Guard Peak Southwest Route: the row's own `data_quality.gaps` field already flags
  an unresolved naming ambiguity between the route's name/approach text ("Southwest
  Route" / "southwest side") and its own `face`/`aspect` fields (both NW) — re-confirmed
  still open this pass, left as a standing (not new) flag.

Next batch will continue alphabetically after `wa_olympus_traverse` (see progress file).

## 2026-07-31 — Pass 1, Batch 38

Seven peaks, 8 routes: Open Book (Unicorn Peak); Southeast Route and West Ridge
(Ottohorn); Southeast Route (Overcoat Peak); Standard Rock Route (Pernod Spire); South
Route (Phantom Peak); Point Success via Success Cleaver (Point Success); and the route
literally named "Poltergeist Pinnacle," which turns out to be filed under Mount
Challenger's `area_id` rather than the separate Poltergeist Pinnacle area.

**Confirmed errors → fixes in `sql/2026-07-31-batch-38.sql` (5, touching 3 routes):**
- Ottohorn Southeast Route: `fa` credited Twin Needles' August 17, 1932 first ascent
  (Degenhardt/Martin/Strandberg) — a different Southern Pickets formation entirely. This
  same row's own `overview` field and the `wa_ottohorn` area's own `blurb` already
  correctly describe Ottohorn's real FA (Cooper/Denny/J. Firey/G. Firey/Whitmore, Sept 10
  1961, via the east ridge from the Ottohorn-Himmelhorn col), independently corroborated
  by AAC Publications and an Alpinist obituary for George Whitmore. Corrected to match.
- Ottohorn Southeast Route: the "Ottohorn summit" waypoint's `elevFt` (7640) was the sole
  outlier against this same row's own `high_point_ft`, the area's `elevation_ft`, and
  external corroboration (all 7840). Fixed to 7840.
- Overcoat Peak Southeast Route: `access.land_manager` named Okanogan-Wenatchee NF,
  which has no jurisdiction over this route's Dingford Creek/Middle Fork Snoqualmie
  approach — contradicted by this row's own more specific `access.landManager`/
  `emergency.rangerStation` (both correctly Mt. Baker-Snoqualmie NF, Snoqualmie RD) and
  USFS's own trailhead page. Same wrong-ranger-district pattern as batches 4/5/8/12/37.
- Overcoat Peak Southeast Route: `access.parking_pass` cited Salmon La Sac, Pete Lake and
  Necklace Valley — three unrelated east-side/Skykomish trailheads this route never
  uses — contradicting this row's own `access.fees`, which correctly discusses only the
  Dingford Creek Trailhead. Boilerplate copy-paste from unrelated trailheads; replaced.
- Pernod Spire Standard Rock Route: the "Burgundy Col" waypoint's `note` was a leaked
  internal-research artifact ("Reused coordinate from this session's own Vasiliki Tower
  research...") — the same session-leak pattern already fixed on Northwest Mox Peak
  (batch 36) and Dragontail's Serpentine Arete (batch 19). The coordinate itself was
  already correct (matches the same real col on sibling route `wa_south_face` under
  `wa_vasiliki_tower`); only the note text was replaced.

**No confirmed errors, but not fully clean — one flag apiece (see below):** Unicorn
Peak's Open Book (elevation, grade, pitch length, and the route's own correct Rainier
Climbing Cost Recovery Fee exemption — non-glaciated, below 10,000 ft — all
independently corroborated; only the trailhead elevation is unresolved). Ottohorn's West
Ridge (a sparsely-documented 2017 FA line; the thread title/date citation matches the
real Cascade Climbers thread found via search, and every shared field agrees with the
sibling Southeast Route; only the underlying trip report itself was unreachable to
confirm no further beta exists). Point Success via Success Cleaver ($82 Climbing Cost
Recovery Fee and current NPS parking rates confirmed correct, and — unlike the Unicorn
Peak/Tatoosh routes audited alongside it this batch — correctly triggered since Point
Success sits above the glacier/10,000 ft threshold; only the stored GPX/trailhead
mismatch is unresolved). No route this batch was 100% issue-free.

**Not fixed — flagged findings downgraded after direct verification:** two of this
batch's research findings did not survive a second look against the live data and were
NOT applied, which is itself worth recording. Phantom Peak's South Route was proposed to
have its `approach_logistics.trailhead` corrected from "Nooksack Cirque Trailhead" to
Hannegan Pass — but the row's own `waypoints`/`gpx`/most of its `approach` text actually
describe a *third*, different approach (Ross Lake water taxi → Big Beaver Trail → Luna
Camp → Luna Creek bushwhack), while only the `itinerary` and part of the `approach` text
describe Hannegan Pass. The row genuinely mixes three approach narratives across four
fields; patching just `approach_logistics` to Hannegan Pass would have "fixed" one
contradiction by creating a new one against the waypoints/GPX track. Left flagged, not
patched. Separately, `wa_poltergeist_pinnacle`'s `pitches`/`length_m` (6/445) were
proposed to be changed to match its duplicate stub `wa_poltergeist_pinnacle_north_route`
(4/421) — but the stub's own itemized `pitch_detail` lengths (55+60+60+270m) sum to 445,
not 421, meaning 445 is actually the internally-consistent figure and the *stub* is the
one carrying the error. No fix applied to either row this batch (the stub is out of this
batch's audited-id list); worth a dedicated pass.

**Flagged for human review (7):**
- Unicorn Peak's Open Book: the "Snow Lake Trailhead" waypoint's `elev` (4400 ft) has
  genuinely conflicting external sourcing (~4,000 ft per several hiking guides vs. "just
  above 4,400 ft" per another) — no authoritative NPS figure found, left unresolved.
- Ottohorn Southeast Route: the route's own "Goodell Creek Trailhead" waypoint/GPX
  coordinate sits ~0.28 mi from `approach_logistics`' trailhead coordinate — may be two
  legitimately distinct points on the same short access road rather than an error; no
  source precise enough to confirm which.
- Ottohorn West Ridge: the row's central claim (no route beta beyond the 2017 Cascade
  Climbers trip-report title/date is publicly available) could not be independently
  confirmed or refuted — the source thread is blocked at this environment's outbound
  proxy, with no working archive fallback.
- Pernod Spire Standard Rock Route: `rock_grade`/`grade`/`beta`/`corrections` describe
  Pernod's easier line, but `overview`/`pitch_detail`/`rappel_count_note` all describe
  the harder historic FA "South Face (5.9 A0)" line instead — apparent cross-
  contamination between two distinct routes on the same spire (a sibling `wa_south_face_2`
  row already exists). Could not find a pitch-by-pitch source to determine which fields
  belong on which row; left unresolved rather than guess.
- Pernod Spire Standard Rock Route: `dist_km` (9.66) appears to already be a round-trip
  figure (matches the row's own itinerary mileage almost exactly) rather than the
  one-way convention the app is documented to double for display — per standing
  guidance, not normalized on a single row without a DB-wide pass.
- Point Success via Success Cleaver: the row's prose (`approach`, `itinerary.sourceNote`)
  describes the Longmire/Wonderland Trail approach — the only remaining approach per an
  outside source, since the Tahoma Creek Trail closed — but the stored `gpx` track and
  final `waypoints` entry both start from the closed Tahoma Creek/Westside Road gate
  instead, with a waypoint note that contradicts the rest of the row. Needs a real
  Longmire-based GPX track, not a one-field patch.
- `wa_poltergeist_pinnacle` (route on Mount Challenger's `area_id`): strong evidence
  (matching FA, matching grade, and the separate `wa_poltergeist_pinnacle` area's own
  blurb naming this exact FA/grade as its "sole recorded technical route") suggests this
  route belongs under the distinct `wa_poltergeist_pinnacle` area instead, where a
  thinner duplicate (`wa_poltergeist_pinnacle_north_route`) already exists for the same
  climb. Not fixed: moving `area_id` would collide with the existing duplicate rather
  than resolve it, and needs a human merge decision (which record is canonical, whether
  the surviving row needs a peak-scoped id) rather than a single UPDATE — see CLAUDE.md's
  Triple Couloirs precedent for why area_id changes aren't made on inference alone.

Next batch will continue alphabetically after `wa_poltergeist_pinnacle` (see progress file).

## 2026-07-31 — Pass 1, Batch 39

Ten routes across eight peaks: `wa_poltergeist_pinnacle_north_route` (the duplicate stub
flagged in batch 38), Primus Peak, Prusik Peak (x3), Vesper Peak's Ragged Edge, Liberty
Bell's Rapple Grapple, Raven Ridge, Robinson Mountain, and Rock Mountain.

**Confirmed errors → fixes in `sql/2026-07-31-batch-39.sql` (10, touching 7 routes + 1
area row):**
- `wa_poltergeist_pinnacle_north_route`: `length_m` (421) was the sole outlier against
  this row's own `pitch_detail` sum (55+60+60+270 = 445m), independently corroborated
  against the AAC Publications 2004 FA report and matching the length_m (445) already on
  file for the likely-duplicate `wa_poltergeist_pinnacle` route flagged last batch — fixed
  to 445. This closes the loop batch 38 left open ("no fix applied to either row").
- `wa_primus_peak_south_ridge`: `access.notes` carried the "Mount Tom area, North
  Cascades" boilerplate string first identified DB-wide in batch 15 — stripped.
- `wa_prusik_peak_der_sportsman`: a summit waypoint's `elevFt` (8000) was the sole
  outlier against this row's own `high_point_ft` and both sibling Prusik Peak routes
  (all 8008) — fixed.
- `wa_prusik_peak_south_face_burgner_stanley`: `rock_grade`/`grade_num` (5.10a/10)
  contradicted this row's own top-level grade ("III, 5.9+") and every `pitch_detail`
  entry — confirmed via Climbing.com's route title ("Stanley-Burgner, III 5.9+, six
  pitches") and fixed to 5.9+/9. Same route's `dist_km` (31.4) was stored round-trip, not
  one-way — its own `itinerary.totalNote` already states "~19.5 mi round-trip" (31.4 km),
  while both sibling Prusik routes correctly store one-way distance — fixed to 15.7.
  Unlike the DB-wide `dist_km` convention ambiguity CLAUDE.md warns not to bulk-fix, this
  had concrete single-row internal evidence (its own note plus its own siblings).
- `wa_ragged_edge` (Vesper Peak): `access.land_manager`/`access.rules` carried Glacier
  Peak Wilderness boilerplate (wrong wilderness area's group-size/campfire rules),
  contradicting this row's own `access._raw.wilderness_zone`/`land_manager` fields, which
  correctly place Vesper Peak outside any wilderness — same wrong-district/zone
  contamination pattern as many prior batches; fixed.
- `wa_rapple_grapple` (Liberty Bell): `high_point_ft` was null despite the row's own
  waypoints already giving 7,720 ft, matching the area row and every previously-audited
  Liberty Bell sibling — filled. Its top-level `descent` field described the standard
  Beckey Route rappels to the Liberty Bell-Concord notch, contradicting this row's own
  more detailed `descent_text`, which documents a distinct east-side gully exit with two
  independent rappels — rewritten to match.
- `wa_rock_mountain_northeast_ridge` + area `wa_rock_mountain`: `high_point_ft` (6852) and
  `elevation_ft` (6856) disagreed with each other and with external sources (Wikipedia:
  6,840+ ft; GNIS/Wikidata: 2,085.5m = 6,841 ft, independently confirmed via search) — both
  fixed to 6841.

**Not fixed — a proposed fix rejected after independent re-verification:** research
initially proposed correcting `wa_prusik_peak_west_ridge`'s `fa` field from "the specific
first-ascent party is not recorded in available sources" to "Fred Beckey, 1957." A direct
follow-up search confirmed the West Ridge route does date to 1957, but found no source
naming Beckey (or anyone else) as the first-ascent party for that specific line — the
1957 date is conflated in some secondary write-ups with Beckey's well-documented 1948
first ascent of the *peak* via a different route, and a Beckey guidebook quote about the
West Ridge's rock quality doesn't establish him as its first ascensionist. The row's
existing hedge was already the accurate statement; left unchanged rather than downgrade a
correct "unverified" field into a wrong confident one.

**Flagged for human review (11):**
- `wa_poltergeist_pinnacle_north_route`: top-level `grade`/`commitment` say "Grade IV,"
  but the row's own `data_quality.gaps` says public sources document it as "III 5.9 R/X"
  — could not confirm the exact AAC/NWMJ commitment grade from search snippets alone.
- `wa_poltergeist_pinnacle_north_route`: `access.fees` says the Perfect Pass/Whatcom Pass
  zone is walk-up only, while `access.notes` describes a generic 60/40 Recreation.gov
  split — needs a human to confirm this specific zone's actual reservation status.
- `wa_poltergeist_pinnacle` (area): stored lat/lng sits ~270m from Wikipedia's cited
  coordinate — worth a topo/USGS cross-check given the peak's tiny 40 ft prominence.
- `wa_primus_peak_south_ridge`: `overview`/`approach`/`itinerary` describe the Eldorado
  Creek/Cascade River Road approach via Klawatti Col, but `turnaround`/`pitch_detail`/
  `bail` and the numeric `dist_km`/`gain_ft` describe the separate, real Thunder
  Creek/Lucky Ridge/East Ridge route instead — a two-route splice needing a human
  decision on which route this row actually represents (check whether a distinct East
  Ridge row already exists for Primus). Also: `loss_ft` null, `fa` unpopulated.
- `wa_prusik_peak_der_sportsman`: `length_m` (183, ~600ft) vs. a non-approved aggregator's
  198m figure — not fixed without a stronger source.
- `wa_prusik_peak_south_face_burgner_stanley`: `length_m` (152m, ~499ft) vs. external
  sources themselves disagreeing (600-650 ft) — left unresolved.
- `wa_prusik_peak_west_ridge`: the row's `gpx`/a "Snow Lakes Trailhead" waypoint describe
  a different trailhead than the `approach`/`approach_logistics` narrative (Stuart Lake
  TH via Colchuck/Aasgard Pass) — needs a corrected track or corrected narrative, not a
  one-line patch.
- `wa_ragged_edge`: the row's own `sourceNote` self-declares this a duplicate entry of
  `wa_vesper_peak_north_face_ragged_edge` — needs a human merge decision, not auto-fixed.
  Also: `gain_ft`/`loss_ft` (4115/4400) mismatch each other and the row's own itinerary
  (4400/4400 — gain should equal loss on a round-trip climb).
- `wa_rapple_grapple`: `fa` ("Bryan Burdo," no year) is unverifiable, already self-flagged
  as a gap; `watch_out` text reads as generic rappel-pun boilerplate rather than sourced
  beta.
- `wa_raven_ridge_southeast_ridge_crater_lake`: FA party "Gilbertson & Robinson, Jan 2019"
  is unverifiable — worth a second look given a Robinson Mountain route is in this same
  batch, in case of a stray cross-record name bleed (surname could be coincidental).
- `wa_robinson_mountain_north_couloir` / `wa_rock_mountain_northeast_ridge`: remaining
  guidebook-citation and multi-peak-traverse mileage claims are trip-report-sourced and
  not independently checkable without the source texts.

Next batch will continue alphabetically after `wa_rock_mountain_northeast_ridge` (see
progress file).

## 2026-07-31 — Pass 1, Batch 40

Ten routes across seven peaks: Ruth Mountain (2), Sahale Mountain (2), Mount Washington
(Olympics), Sentinel Peak, South Early Winters Spire's Southwest Rib, Sharkfin Tower, and
Sherman Peak/Baker (2).

**Confirmed errors → fixes in `sql/2026-07-31-batch-40.sql` (24 field-level fixes across
11 UPDATE statements, touching 10 routes + 2 area rows):**
- `wa_ruth_mountain_south_slopes`: `access.notes` carried the "Mount Tom area, North
  Cascades" boilerplate contamination string (same recurring bug first seen batch 15,
  most recently batch 39) — stripped.
- Sahale Mountain, both routes: `access._raw.altitude_restrictions` said Sahale Glacier
  Camp sits at 7,400 ft, contradicted by WTA's page (12 mi RT / 3,940 ft gain, matching
  this row's own `gainFt`) and by each route's own waypoints/approach text, already 7,600
  ft — fixed, including the same figure repeated in the Sahale Arm route's
  `pitch_detail[1].notes`.
- Sahale Mountain, both routes + Sharkfin Tower: `access.rules`/`group_limit` said Boston
  Basin is a 6-person cross-country zone. NPS's own cross-country-zones page names Boston
  Basin (with Eldorado and Sulphide Glacier) a 12-person high-occupancy zone instead —
  fixed on all three rows (found first while auditing Sharkfin, then applied to its Boston
  Basin-approach sibling Sahale routes too).
- `wa_mount_washington_olympic` (area) + its `wa_se_ridge_aka_shield_wall` route: three
  different elevations were stored across one peak (area 6255, route `high_point_ft`
  6260, route's own `access._raw.altitude_restrictions` 6278) — resolved to 6,260 ft
  (Wikipedia infobox; its prominence figure, 2,615 ft, independently matches this row's
  own `prominence_ft` exactly). The same route's `access` block was also contaminated
  with Olympic *National Park*-specific land-manager/wilderness-zone language and a
  Mount Ellinor day-hike stat ("3.2-mile out-and-back"), even though Mount Washington
  sits entirely in the Mount Skokomish *Wilderness* of Olympic *National Forest* — already
  stated correctly in this same peak's own area blurb, confirmed via fs.usda.gov — fixed
  `landManager`/`land_manager`/`permitZone`/`_raw.wilderness_zone`/`_raw.altitude_restrictions`.
- `wa_sentinel_peak_standard`: `approach`'s Cache Col elevation ("~6,600-6,800 ft")
  contradicted this row's own waypoint (6,900 ft) and Wikipedia (6,903 ft) — fixed.
  `hazards`/`pitch_detail` described crossing "Dana Glacier" and climbing a "south face" —
  Dana Glacier is real but sits ~2.5 mi south near Dome Peak, unrelated to Sentinel, and no
  source describes a south-face Sentinel route; this row's own approach/descent_text/
  itinerary all agree on the real route (Le Conte Glacier → col → west face/west ridge,
  matching `pitch_detail`'s 4th entry) — removed the contaminated entries rather than
  inventing replacement beta for a route no source documents. Also fixed: `access.permit`
  cited the wrong 2026 NCNP lottery window (was Feb 10-Mar 3/Apr 25; actual is Mar 2-13/Apr
  29); `access.parking_pass` named "Mountain Loop Highway," which doesn't reach Sentinel
  Peak (it's a Cascade River Road/Suiattle River Road objective); `approach_logistics.
  trailheadDirection` said 3,660 ft vs. this row's own waypoint of 3,600 ft.
- `wa_sews_sw_rib`: `access.rules` attributed a 1/4-mile no-camping closure to Cutthroat
  Lake, but USFS's Blue Lake Trailhead page attributes it to Blue Lake — this route's own
  trailhead lake; same field's "10 day" dispersed-camping cap corrected to the actual
  Okanogan-Wenatchee NF 14-day standard. `waypoints[0].elevFt` (Blue Lake Trailhead) was
  5,200 ft against WTA/Gaia's ~5,400 ft — and this row's own `gain_ft` (2407) already
  equals 7807−5400, i.e. the rest of the record already assumed 5,400. `approach_logistics.
  trailheadDirection` said 1.5 mi west of Washington Pass; sources (and this row's own
  `approach` text) say ~1 mi.
- `wa_sharkfin_tower_southeast_ridge`: `access._raw.permit_pickup_hours` embedded the
  wrong NCNP Wilderness Information Center phone number ((360) 873-4500 vs. the real (360)
  854-7245, already stored correctly elsewhere in this DB); `passRequired`/`_raw.
  parking_pass_required` gave the annual Northwest Forest Pass price as $35 (USFS/REI
  confirm $30).
- Sherman Peak, both routes: `high_point_ft` (10160) contradicted the area row, both
  routes' own summit waypoints, and the Crater Rim Scramble route's own overview text (all
  already 10,133) — a real July 2023 differential-GPS survey (countryhighpoints.com,
  survey-grade DGPS + NOAA OPUS post-processing) fixed Sherman Peak at 10,133.0 ft / 395.4
  ft prominence, just under the 400 ft cutoff that removed it from WA's Top 100 peaks list;
  10,160 was the stale pre-survey figure — fixed on both routes' `high_point_ft` plus the
  Squak Glacier route's own summit waypoint. The Crater Rim Scramble route's `gain_ft`
  (7500) also didn't match its own `loss_ft` (6800)/totalNote or the verified trailhead-
  to-summit difference — looks carried over from stats for the longer route to Baker's
  true summit (Grant Peak), which this route doesn't reach — fixed to 6800.

**Scrutinized and confirmed real, not fabricated:** both the "2025 DGPS resurvey" claim
that Old Guard Peak is ~2.7 ft higher than Sentinel Peak, and the "July 2023 DGPS survey"
behind Sherman Peak's 10,133 ft figure, independently verified against
countryhighpoints.com's peak-survey writeups (a site that specifically tracks WA
prominence-list resurveys) — this pattern of suspiciously-precise recent-survey claims has
been fabricated before in this DB, but not this time in either case.

**Flagged for human review — not auto-fixed (see `sql/2026-07-31-batch-40.sql`'s trailing
comment block for full detail):** `wa_ruth_icy_traverse`'s Ruth-Icy Saddle/Ruth Glacier
Camp waypoint longitudes sit the wrong direction from Icy Peak (needs a human topo pull,
not a guessed value); `wa_ruth_mountain_south_slopes`'s Hannegan Pass elevation and
gain/loss figures disagree internally; which of Icy Peak's two sub-summits is truly higher
is disputed between sources; `wa_sahale_mountain_r1`'s `dist_km` matches the known
WA round-trip/one-way convention bug pattern (CLAUDE.md) but this row's own itinerary
insists otherwise — needs a GPX-track check, not a bulk fix; several gain_ft/loss_ft vs.
itinerary-sum mismatches (Sahale, Sentinel, SEWS) that no source could resolve; `wa_se_
ridge_aka_shield_wall`'s remaining Olympic-NP-flavored fee/permit-hour text (confirmed
wrong direction, correct Forest-Service wording not sourced this session) and an
unresolved pitch-count disagreement; `wa_sentinel_peak`'s area `parent_chain` wrongly
routes through "Mountain Loop Hwy" (needs a human to pick the correct existing area-tree
parent); `wa_sews_sw_rib`'s pitch-count/length_m disagreements between sources;
`wa_sharkfin_tower_southeast_ridge`'s unverified prominence figure and pitch-grade
looseness; `wa_sherman_peak_baker_squak_glacier`'s season/camp-elevation claims against a
couple of guide sources favoring an earlier window and a lower camp.

Next batch will continue alphabetically after `wa_sherman_peak_baker_squak_glacier` (see
progress file).

## 2026-07-31 — Pass 1, Batch 41

Ten routes across six peaks: Sherpa Balanced Rock, Mount Stuart (Sherpa Glacier), Sherpa
Peak (East/North/West Ridges), Silver Star Mountain (Glacier + NE Ridge), Sinister Peak
(North Face + Southwest Route), and Sitkum Spire. Research split across five parallel
passes; several agents reported WebFetch returning 403 on every direct URL this session
(a session-wide proxy issue, not per-site blocking) and fell back to WebSearch snippets —
findings resting only on that weaker evidence are flagged below rather than auto-fixed.

**Confirmed errors → fixes in `sql/2026-07-31-batch-41.sql` (14, touching 9 routes + 1
area row):**
- `wa_sherpa_balanced_rock_ne_couloir` + area `wa_sherpa_balanced_rock`: `high_point_ft`/
  `elevation_ft` (8605, an old USGS-quad figure) contradicted the same route's own summit
  waypoint (8630) and the modern consensus elevation (Wikipedia/SummitPost), already used
  correctly on the sibling `wa_sherpa_peak` area row and both East/West Ridge summit
  waypoints — fixed to 8630 on both rows.
- `wa_sherpa_glacier`: `access.notes` carried the same "Mount Tom area, North Cascades"
  boilerplate contamination fixed on Ruth Mountain last batch and on `wa_primus_peak_south_
  ridge` in batch 39 — stripped. Summit-ridge `grade`/`grade_num`/`rock_grade` (Class 4)
  contradicted this row's own overview text ("simple class-3 ridge scrambling") and
  SummitPost — fixed to Class 3. `dist_km` (43.45, converting to exactly 27.00 mi)
  contradicted this row's own `partner_requirements.fitnessSpec` ("~27 mi... car-to-car"
  round trip) — under this app's distKm*2 round-trip display convention that doubles to a
  54-mi round trip; fixed to the one-way value (21.73) that reproduces the row's own stated
  27 mi. Single-row fix backed by an internal numeric match, not a bulk `dist_km` pass.
- `wa_sherpa_peak_north_ridge`: summit waypoint `elevFt` (8635) was the sole outlier
  against this route's own `high_point_ft` and both sibling routes' summit waypoints (all
  8630) — fixed.
- `wa_sherpa_peak_west_ridge`: `gain_ft` (7400) contradicted `loss_ft` (4330) on a route
  this row's own `descent_text` describes as reversing the same approach — gain should
  equal loss on an out-and-back. The row's own `itinerary.totalNote` ("~4,300 ft gain
  total") and trailhead-to-summit arithmetic both land near the existing `loss_ft` — fixed
  `gain_ft` to 4330.
- `wa_silver_star_glacier`: `comms` labeled the real Okanogan County non-emergency number
  (509-422-7232) "Skagit County Sheriff Dispatch" — Silver Star sits in Okanogan County,
  and this same route's own `emergency` block elsewhere already has the correct county;
  fixed the label, kept the number. Also `fa` credited the 1952 Beckey/Hieb/Staley/Wilde
  ascent to this east-summit route, but multiple sources place that ascent on the WEST
  summit — already (and correctly) credited on the sibling `wa_silver_star_ne_ridge`
  route — and this route's own overview text says the east summit's real FA (Wernstedt,
  1926) used a different line entirely. No source gives a specific FA party for this exact
  north-glacier line to the true summit, so `fa` was cleared rather than guessed.
- `wa_sinister_peak_north_face` + `wa_sinister_peak_southwest_route`: both routes' shared
  Downey Creek Trailhead disagreed between each route's own waypoint (1440 / 1400) and both
  routes' own approach prose ("~1,450 ft", matching USFS) — fixed both to 1450. North Face's
  `high_point_ft`/summit waypoint (8440) also didn't match the area row or the sibling
  route's summit waypoint (both 8444, matching ListsOfJohn) — normalized to 8444.
- `wa_sitkum_spire_standard`: White Chuck River Trailhead waypoint `elev` (1600)
  contradicted this route's own `approach`/`approach_logistics.trailheadDirection` text
  (both "~2,300 ft"), independently matching a WTA trip report — fixed to 2300.
- `wa_sherpa_peak_east_ridge`: the (already coordinate-corrected) Esmeralda Basin
  trailhead waypoint sat at array index 3, after "East end of ridge" (7,800 ft) instead of
  first, with no `distMi` — since this route's `gpx` track is built directly from the same
  ordered list, the rendered path climbed to 7,800 ft, dropped back to 3,500 ft, then
  jumped to the 8,630 ft summit. Reordered to Trailhead → Long's Pass → Stuart basin bivy →
  East end of ridge → Summit and gave the trailhead `distMi: 0`; no coordinates changed.

**Flagged for human review — not auto-fixed:** `wa_silver_star_glacier`'s glacier-saddle
waypoint (8,700 ft) sits 120-350 ft above the area's own "300-ft-deep col" description —
only self-derived arithmetic, not a topo source, so flagged rather than corrected;
`wa_silver_star_ne_ridge`'s 5.9 grade is corroborated only by search-snippet paraphrase
(direct fetch blocked), thin but not contradicted. `wa_sherpa_peak_west_ridge`'s FA year
(stored 1961; Wenatchee Outdoors search snippets suggest 1962) and third climber name
("James Wick" — possibly a garbled "James Wickwire," a documented period climbing partner
of the other two FA members, but no source places Wickwire on this specific route) — both
unconfirmed beyond search snippets, not fixed. `wa_sherpa_peak_north_ridge`'s FA ("Rick La
Belle and Pat Derr, 1971") could not be corroborated or refuted. `wa_sherpa_peak_east_
ridge`'s `commitment` ("II") disagrees with its own `grade` ("Grade III, 5.7") — needs a
human grade call. `wa_sherpa_glacier`'s Stuart Lake Trailhead elevation disagrees three
ways across its own waypoint (2930) and two routes' `approach_logistics.trailheadDirection`
fields (3540, 3400) — no single figure stands out as authoritative. `wa_sinister_peak_
southwest_route`'s top-level `gain_ft`/`loss_ft` (7000/5500) disagree with its own
itinerary day-sum (~8200/8400), `itinerary.totalNote` ("8,000-9,000 ft"), and
`partner_requirements.fitnessSpec` ("~14,000 ft cumulative") — three internal sources that
don't agree with each other or the top-level fields, so no confident single fix; also its
Cub Lake Pass waypoint's own `note` text ("~5,880 ft per trip reports") disagrees with its
`elev` field (6000, which matches Mountaineers.org) and its Sixmile Camp waypoint (2300)
disagrees with the route's own approach prose (2,440 ft) — neither could be resolved with a
clear winner. `wa_sinister_peak`'s area `prominence_ft` (853) vs. external sources citing
840 ft — ListsOfJohn (likely the more precise source) was blocked from direct fetch.
`wa_sitkum_spire_standard`'s `corrections` field cites Glacier Peak's summit as "10,541 ft"
matching the area blurb and route overview, but search snippets suggest a 2014-15 lidar
resurvey lowered the accepted figure to ~10,525+ ft — flagged rather than fixed given the
session-wide WebFetch outage prevented reaching a primary source (USGS/current Wikipedia)
for the exact current figure; this claim also appears in 3 places (area blurb, route
overview, route `corrections`), so a fix needs to touch all three consistently. Same
route's `corrections` field also cites `high_point_ft` as 10,541 when the actual stored
value is 9,355 — a real internal contradiction, but resolving it requires first deciding
whether this route's stats (gain_ft/loss_ft = 8500, consistent with reaching Glacier Peak's
true summit) are describing the spire or the full Glacier Peak summit push, a route-
semantics question left to a human rather than guessed at. Same route's `dist_km` (14.5)
doesn't match its own waypoint distances (12.5 mi one-way) or `itinerary.totalNote` ("~25 mi
round trip") under any convention tried — flagged, not fixed. `wa_sitkum_spire_standard`'s
White Chuck River Trail #643 characterization ("brushy, unmaintained... with blowdown") is
softer than the Forest Service's own reported "inaccessible, no plans to repair" language,
though recent trip reports still describe parties using it — a tone gap, not a clear error.

Next batch will continue alphabetically after `wa_sitkum_spire_standard` (see progress
file).

## 2026-08-01 — Pass 1, Batch 42

Five peaks, 10 routes (Sloan Peak 2, Snowfield Peak 1, Snowking Mountain 1, South Early
Winters Spire 5, Cathedral Peak 1), researched via 5 parallel agents: Corkscrew Route, West
Face/r1 (Sloan Peak); Neve Glacier (Snowfield Peak); Standard Route (Snowking Mountain);
South Arete, Direct East Buttress, East Buttress, Passenger, Southwest Couloir (South Early
Winters Spire); South Face (Cathedral Peak, Pasayten).

Sloan Peak: both routes carried the same wrong-wilderness-name error (labeled "Glacier Peak
Wilderness" instead of the actual Henry M. Jackson Wilderness the peak sits in, confirmed via
Wikipedia/USFS/PeakVisor) plus copy-paste contamination bled in from other peaks (a Vesper
Peak trailhead reference, a Glacier-Peak/Suiattle-River-Road note) — fixed on both routes.
`wa_sloan_peak_r1`'s Bedal Creek Trailhead waypoint was ~200 m off from the same physical
trailhead's coordinate on the sibling Corkscrew Route — reconciled to match. Both routes had
the round-trip-stored-as-one-way `dist_km` bug (9.5 mi round trip stored directly instead of
halved) — fixed per-row, not bulk-normalized. `wa_sloan_peak_corkscrew`'s `loss_ft` and
`wa_sloan_peak_r1`'s null `loss_ft` were both corrected to match `gain_ft` on these
out-and-back routes. Biggest open flag: `wa_sloan_peak_r1` looks like a duplicate/mislabeled
entry of `wa_sloan_peak_corkscrew` (identical GPX track and gain_ft) rather than the genuinely
distinct roped 5.7-5.8 "West Face" rock route its own `beta` field says it should document —
that same `beta` field also misattributes a real but unrelated 2023 winter ice ascent
(Merrill-Minton) as this route's FA. Needs a human merge/delete or from-scratch rewrite
decision, not a field patch.

Snowfield Peak: top-level `permit` column was null while `access.permit` already fully
documented the NPS backcountry-permit requirement — same "app reads the wrong column" bug
this project has fixed repeatedly before; copied across. `loss_ft` was null on a round-trip
route and filled to match `gain_ft`/itinerary. A "Colonial Glacier moraine camp" waypoint
elevation (6,400 ft) was an outlier against four other same-row mentions of the same camp and
external trip reports (all 5,400–6,100 ft) — corrected to a best-fit 5,900 ft.

Snowking Mountain: repeated, on this peak's other route (`wa_snowking_mountain_standard`),
the exact NPS/North-Cascades-NP-vs-Forest-Service contamination pattern already found and
fixed on this same peak's sibling `wa_east_ridge_2` in batch 9 — `access.land_manager`,
`access.notes` (NPS Recreation.gov lottery boilerplate), `access.rules` (NPS Boston Basin
campsite/bear-canister boilerplate), `access.group_limit` (6, an NPS cross-country-zone cap),
and the top-level `permit` column (written in NPS/Marblemount language) were all fixed to the
correct Forest Service/Glacier Peak Wilderness facts. Also fixed: `loss_ft` (1,100, internally
impossible against `gain_ft`=6,800 and the route's own itinerary loss sum) corrected to 6,800;
a stale 7,439 ft summit figure surviving in two itinerary text fields, not updated to match
this row's own (correct) 7,433 ft `high_point_ft`; and the area's `elevation_ft` (7,439→7,433)
and `prominence_ft` (1,639→1,593, moderate-confidence search-snippet evidence only). Flagged:
`alpine_grade` holding a Roman-numeral commitment grade instead of the French adjectival scale
the column is defined for (same bug class as batch 9's Dragontail fix, but no sourced
replacement value found); `fa` unresearched; and the area hierarchy embedding
`wa_hwy20_ncnp` in a Forest Service peak's ancestry chain, which may be a shared corridor
label rather than an error — needs sibling-area data to judge.

South Early Winters Spire: found the same Cutthroat-Lake/Blue-Lake trailhead mixup already
seen on the neighboring Liberty Bell/Lexington Tower cluster (batches 18, 40) — three of the
five routes (South Arete, Direct East Buttress, Passenger) had `access.rules` misattributing
a 1/4-mile no-camping buffer to Cutthroat Lake instead of Blue Lake, the trailhead they
actually use; fixed on all three. Also fixed: South Arete's `gain_ft` (2,000, disagreeing
with its own `loss_ft`/itinerary/descent_text, all of which imply ~2,400) and Passenger's
`grade_num` (12, not matching its own displayed "5.11d" grade text — the row's own
`corrections` field already explains the AAC-vs-Mountain-Project sourcing split behind it).
East Buttress and Southwest Couloir had no confirmed errors. Peak-wide flag: all 5 routes'
Blue Lake Trailhead elevation disagrees between their own waypoints (5,200/5,204 ft) and
their shared `approach_logistics` boilerplate (5,400 ft) — external sources split the same
way, so left unresolved. Direct East Buttress's `alpine_grade` ("D") is invalid for the
commitment-grade column and disagrees with its own `commitment`/grade text — flagged, not
guessed, since only weak search-snippet evidence was found for a replacement.

Cathedral Peak (Pasayten): `overview` said "the original 1969 Beckey line," contradicting the
row's own `fa` field ("September 1968") — fixed to 1968, confirmed via the AAC Publications
first-ascent account (whose named features — Confession Box, Pulpit Ledge, Belfry Ledge —
match this row's own `beta`/`pitch_detail` almost verbatim) and Mountain Project; no source
found supports 1969. Flagged: an internally implausible `gain_ft`/`loss_ft` pairing (6,700 ft
of loss exceeds the ~5,556 ft net trailhead-to-summit gain implied by this row's own
confirmed elevations) with no authoritative gain/loss breakdown found to fix it against; a
waypoint sitting implausibly close (~370 ft) to the summit that a 403'd Mountain Project page
could not be used to correct; and a 5 ft elevation-datum discrepancy (8,606 vs. 8,601 ft)
between `high_point_ft`/area `elevation_ft` and the summit waypoint, likely just two
legitimate figures from different survey vintages.

Session note: most agents this batch got clean WebFetch reads from Wikipedia/USFS/AAC
Publications (last batch's session-wide 403 outage did not recur), though Mountain
Project/SummitPost/Peakbagger/CascadeClimbers direct fetches were still frequently blocked,
pushing several items in this batch to WebSearch-snippet-level evidence rather than a direct
source read — noted inline above and in the SQL file where that weaker evidence level applies.

Next batch will continue alphabetically after `wa_south_face_10` (see progress file).

---

## 2026-08-05 — Pass 1, Batch 43

Eight peaks, 10 routes, researched via 5 parallel agents: South Face (Argonaut Peak); South
Face (Pernod Spire); South Face, South Face Center (Concord Tower); South Face (Kangaroo
Temple); South Face (Inspiration Peak); South Gully/South Spur, South Rib (Guye Peak); South
Headwall (Mount Stuart); South Ridge (Luna Peak).

Argonaut Peak: top-level `permit` claimed an Enchantment Permit Area lottery requirement,
contradicting this row's own `access.fees`/`access.notes`/`access.permit` fields, which
already correctly state the Teanaway-side Beverly Creek/Ingalls Creek approach sits outside
the lottery boundary — fixed to match. `loss_ft` (1,400) badly undercounted against the row's
own itinerary day-by-day sums (gain 6,257/loss 6,157 combined) for a car-to-car out-and-back —
both `gain_ft`/`loss_ft` aligned to the itinerary totals.

Pernod Spire: `alpine_grade` held "UIAA VI," a rock-difficulty grade from the wrong scale
entirely (not the French adjectival scale this column is documented to hold per
`0006_composite_grades.sql`) — cleared, matching the sibling Argonaut Peak row which already
leaves this column null. A waypoint ("SR-20 Burgundy Col / Wine Spires pullout") was a leaked
internal-research-session artifact — its note text read like an AI research agent's own
reasoning ("Confirms existing DB entry's location/description; minor coordinate refinement
based on...") rather than trail beta, and unlike every other waypoint on the row it carried no
elev/distMi; removed it and its matching `gpx` point, then filled the now-adjacent summit
waypoint's missing elev from the row's own `high_point_ft`. Also fixed `rope_type` ("single"
→ "double," matching the row's own "two 60m ropes"/double-rope-rappel fields) and
`sling_rack.cams` (extended to 4 in, matching the row's own rack list which already calls for
a #4 Camalot).

Concord Tower: no confirmed errors on either route this batch. South Face's fourth FA-climber
name ("Bruce Schuler") couldn't be independently confirmed or refuted (primary sources
403'd). South Face Center's `fa` is currently "Not Known," cleared by an earlier pass whose
own `sourceNote` says the "Fielding & Tarver, 1966" attribution "could not be verified
anywhere and appears to be a mix-up" — this batch's research found consistent search-snippet
corroboration for exactly that FA, matching the row's own overview/beta almost verbatim, but
every primary source (SummitPost) 403'd again. Given a prior pass already investigated and
reversed this same fact, left flagged for a human with direct source access rather than
reversed a second time on secondary evidence alone.

Kangaroo Temple: `overview` called the route "eight-pitch," contradicting the row's own
`pitches` (7), `pitch_detail` (7 entries), and `rope_note` ("7-pitch") — fixed to
"seven-pitch." The same `rope_note` also claimed the descent uses "chains atop North Face and
P1 belay chains," directly contradicted by the row's own `hazards` field ("hidden 3-bolt
anchors (no chains)") — fixed to match.

Inspiration Peak: `fa` asserted a confident "June 18, 1970," but the row's own
`data_quality.gaps` field already documents the real finding in detail — Mike Heath's own
1970 AAJ first-ascent account gives the date "June 18" but never states a year, and per AAJ's
convention of reporting the prior season's climbs the ascent likely happened in 1969, a
conclusion the gaps note says should leave `fa` unresolved pending a second source. That
conclusion was written down but never applied to the `fa` column itself — fixed to reflect it
honestly rather than assert the unconfirmed year. Flagged, not fixed: `pitches`
(8)/`length_m` (305, ~1,000 ft) are corroborated by Heath's own account ("this impressive
1000-foot face," ~8 leads), but `overview`/`beta`/`itinerary` all separately describe a
compressed 4-pitch, ~600 ft version — a real internal inconsistency needing a human prose
rewrite across several fields, not a single value patch.

Guye Peak: both routes carried a byte-identical leaked failed-research block in
`access._raw` ("Area name not found in standard Washington climbing databases or USFS/NPS
resources," every sub-field "Unknown") — false on its face (Guye Peak is one of the most
documented crags in the state) and contradicted by each row's own populated top-level
`access.*` fields; same pattern already fixed on this peak's `wa_blood_sport` route in batch
3 — replaced both with a pointer note. Both routes' `alpine_grade` duplicates the NCCS
commitment grade rather than a French adjectival value, and South Gully/South Spur's
pitches/grade/length_m mix data from its two seasonal variants (summer scramble vs. winter
mixed line) inconsistently — both left flagged, not patched (the former is a DB-wide
recurring ambiguity with no sourced replacement in this case; the latter needs a human
decision on how to represent both variants). Whether Alpine Lakes Wilderness's surveyed
boundary reaches these two short roadside-adjacent lines is also unresolved — `permit` is
null on both despite Guye Peak being wilderness-listed — needs an authoritative USFS boundary
map, not a guess.

Mount Stuart: South Headwall's `permit` and `access.notes`/`access.rules`/`access.group_limit`
all described Enchantment Permit Area quota rules (8-person cap, single site,
non-transferable, lottery) — confirmed via multiple independent sources that no Enchantment
permit applies to any south-side Mount Stuart route; the lottery covers only the Stuart
Lake/Colchuck/Snow Lakes zones reached via Icicle Creek Road, not the Longs Pass/Ingalls Way
(Teanaway-side) approach this route's own `approach` field describes — replaced with standard
Alpine Lakes Wilderness rules (free self-issue permit, 12-person limit), the same distinction
already correctly documented on this batch's Argonaut Peak row. A waypoint named "Ingalls
Pass" (elev 6,457 ft) was also wrong: the row's own approach text names "Longs Pass Trail
#1229," and external sources confirm the route crosses Longs Pass (~6,200 ft) — the stored
elevation actually matches Ingalls Pass's real elevation (~6,500 ft, a different pass leading
to an unrelated basin, Lake Ingalls) — renamed and corrected. `watch_out` was also stored as
one newline-joined string instead of a JSON array (the recurring rendering bug — `lib/db.js`'s
`toArr()` only splits on commas); converted to an array and dropped "Descent involves multiple
rappels," contradicted by the row's own descent/descent_text (a walk-down via the Cascadian
Couloir) and null `rappels` field.

Luna Peak: South Ridge's `gain_ft`/`loss_ft` (8,600/8,009) were asymmetric and didn't match
the row's own itinerary day-by-day sums, which are already symmetric at 8,700/8,700 for this
out-and-back — aligned to match. `dist_km` (16.1) was off by more than 2x from the same
itinerary (three days summing to 48 miles round trip) and from the row's own `approach` text,
which independently states "the ~77 km on-file round-trip distance" — corrected to 38.62 km
one-way, matching this app's documented `distKm*2` display convention.

## 2026-08-05 — Pass 1, Batch 44

Eight peaks, 10 routes, researched via 5 parallel agents. Black Peak/Whatcom Peak: Black Peak's
South Ridge had two cross-contamination bugs — `approach_logistics.trailhead` pointed at the
Lake Ann Trailhead on SR-542 near Mount Baker (a same-named but different trailhead ~90 mi
away, confirmed via USFS/PNT coordinates), and `access.rules` carried Boston Basin's
site-specific camp rules/elevations, an unrelated NCNP zone near Eldorado/Forbidden Peak —
both fixed using the row's own already-correct waypoint/approach data; also filled top-level
lat/lng (null) and `loss_ft` (null) from the row's own waypoint/itinerary data, and cleared
`alpine_grade` duplicating `commitment`. Whatcom Peak's South Spur: filled top-level lat/lng
from the row's own waypoint; `gain_ft`/`loss_ft` (6700/1374) were wildly asymmetric for a
closed loop and didn't match the row's own itinerary day-sums (11,000/9,300) — aligned.

South Twin Sister (3 routes): North Ridge and West Ridge both falsely claimed some routes
cross into North Cascades National Park — Twin Sisters Mountain sits entirely within Mount
Baker Wilderness, ~40 mi from the NCNP boundary — fixed on both; both also claimed a
Northwest Forest Pass is required, contradicting West Ridge's own `access.passRequired` field,
which already correctly says no pass is needed at the FR 38 pullouts — fixed on both. West
Ridge's `gain_ft`/`loss_ft` (3000/5400) were asymmetric for a car-to-car out-and-back and
contradicted the row's own itinerary (6100/6100, sourced to a real trip report) — aligned. The
Olivine Scramble route was clean — its land-manager/permit fields (Hampton Lumber, fee
permit) were independently confirmed more current and accurate than its two siblings'.

Sharkfin Tower (Southeast Face): only the recurring `watch_out` newline-string-instead-of-array
bug — fixed. Southeast Mox Peak: the route was misnamed "Southeast Rib / Standard" when every
source (Mountain Project, an AAC winter-FA report, trip reports) and the row's own
face/aspect/overview fields identify it as the West Ridge (Beckey Route) — renamed;
`alpine_grade` cleared (NCCS notation duplicating `commitment`); a waypoint note contained a
leaked AI-research-session artifact ("Reused coordinate from this session's own Devil's Club
research...") — replaced with a real note, coordinate left unchanged. Left flagged: the record
mixes two non-interchangeable approaches (Depot Creek/Canada vs. Ross Lake/Perry Creek) whose
mileage/gain figures don't reconcile — needs a human decision on which is canonical.

Mount Shuksan (Southeast Ridge/SE Corner): only the `watch_out` array bug — fixed. South Early
Winters Spire (Southern Man): `fa` named "Kevin Falley," the wrong first name — corrected to
Leighan Falley, confirmed via independent bios and matching the row's own `overview` field;
`aspect` said "E" but the row's own text repeatedly describes a south-facing headwall route (5
of 9 pitches) — corrected to "S"; `timing.sectionBreakdown[0].note` was truncated mid-word —
completed using the identical text already present in the row's own `itinerary.days[0].note`;
`watch_out` array bug — fixed. Left flagged: a leaked research-session artifact in
`emergency.notes`, a pre-existing FA-conflict already correctly hedged in `data_quality.gaps`,
and `alpine_grade` duplicating `commitment` with no sourced replacement.

Dorado Needle (Southwest Buttress): the trailhead waypoint/GPX start point was ~6 km off from
the real Eldorado Trailhead, which the row's own `approach_logistics` field already had
correct — fixed both. The route claimed an entrance-fee parking pass ($30/vehicle or America
the Beautiful $80); North Cascades NP charges no entrance fee at all — fixed. `dist_km` (9.7)
contradicted the row's own approach text (~25.75 km round trip) — corrected to 12.88 km
one-way per this app's `distKm*2` display convention. `alpine_grade` cleared (duplicated
`commitment`). Left flagged: Eldorado-zone `group_limit` (6 here vs. possibly 12 per some
sources) needs confirmation against a primary NPS boundary page that returned 403s this batch.

## Batch 45 — 2026-08-05

Eight peaks, 10 routes, researched via 5 parallel agents. Every proposed fix was re-verified
against this batch's own raw row data before writing SQL — two proposed "fixes" were rejected
on that check (see below), since they would have overwritten correct data with wrong data.

**Rejected fixes (important):** wa_southwest_face's (The Tooth) research agent proposed
changing `grade`/`rock_grade` from 5.5 to 5.7 citing Mountaineers.org/Mountain Project — but
this row's own `corrections` field already documents a prior, more careful pass that explicitly
weighed the 5.7 claim against Mountain Project's dedicated route page (with a full grade
conversion table) and deliberately kept 5.5. Left as-is and flagged rather than re-litigated on
weaker evidence. wa_soviet_route's (Bonanza Peak) research agent proposed changing
`high_point_ft` from 9320 to 9511/9516 to match Bonanza's main summit — but this route's own
`overview` text explicitly says it climbs to Bonanza's **Southwest Peak, a distinct 9,320 ft
sub-summit**, not the 9,516 ft main summit; 9320 is correct for what this route actually climbs.
Also revised (not rejected) wa_spectre_peak_south_route's gain/loss fix: the research agent
proposed matching only the technical-climbing day's stats (1,500/200 ft), but the row's own
4-day itinerary sums to a symmetric 8,100/8,100 ft for the full out-and-back trip — used the
full-trip figure instead, consistent with how this convention has been resolved on other
multi-day routes in past batches.

**The Tooth / Pinnacle Peak:** Southwest Face `pitches` (0) and `alpine_grade` (duplicated
`commitment`) fixed from the row's own pitch_detail/commitment fields. Pinnacle Peak's Southwest
Scramble `gain_ft`/`loss_ft` (1050) only covered the trailhead-to-saddle segment, missing the
saddle-to-summit gain — fixed to 1682 ft from the row's own waypoint elevations; its
`permitZone`/`wilderness_zone` wrongly said "Tatoosh Wilderness" (a separate Gifford Pinchot NF
unit) instead of Mount Rainier NP's own "Mount Rainier Wilderness" — fixed. Flagged: a stray
"Fires prohibited near Tatoosh Lakes" contamination with no verified replacement text, a
trailheadLat/Lng vs. waypoints[0] drift, and The Tooth's area blurb citing a 1928 FA against one
source citing 1916 (areas-table issue, outside this batch's route scope).

**Bonanza Peak / Spectre Peak:** Soviet Route repeated the "Chiwawa/Entiat Ranger Districts"
nonexistent-district error already fixed elsewhere on this peak in batch 4 — fixed to Chelan
Ranger District; `loss_ft` (null) and `dist_km` (stored as round-trip) both fixed from the row's
own itinerary day-sums. Spectre Peak's South Ridge ("Spirited Away") had a nonexistent "Glacier
Ranger District" (real name: Mt. Baker Ranger District, confirmed via USFS's own site) fixed;
`dist_km` round-trip-vs-one-way fixed; a stale summit waypoint elevation (7880) fixed to match
high_point_ft/area elevation (7952); a stale data_quality.gaps note referencing an
already-superseded "1980" FA year removed; a truncated `approach_logistics.trailheadDirection`
completed from the row's own approach text. Flagged: a real 5.8-vs-5.9 grade split between the
FA party's own trip report and AAC Publications, already self-documented and left unresolved.

**Spider Mountain:** No fixes — both routes audited clean/flag-only. wa_spider_mountain_north_ridge's
id says "north_ridge" but its own name/content ("Southeast Gully / East Ridge") and every field
consistently describe the peak's real standard route — same id/name-mismatch family flagged
repeatedly in past batches (Big Kangaroo, Colonial Peak, Corteo Peak, etc.), left for a human
rename decision. Also flagged: the 1938 peak-FA climber's name ("Ralph Clough" on file vs. "Ray
W. Clough" in most sources) and a possible NCNP-vs-Forest-Service land-manager gap on both
routes, since the peak straddles both per the area's own blurb but the routes' access field only
names the park.

**Spire Point / Prusik Peak:** Spire Point's Southwest Face `pitches` (1, contradicted by its
own 5-pitch rope_note/pitch_detail) fixed to 5. Prusik Peak's Stanley-Burgner got the batch's
most fixes: `alpine_grade` cleared (duplicated commitment), `loss_ft` filled from gain_ft/itinerary
symmetry, `dist_km` fixed (round-trip→one-way), descent/descent_text's "five rappels" corrected
to "four" to match the row's own rappel_detail array and rappel_count_note, a copy-pasted
"Snow Lakes Trailhead" waypoint name corrected to the coordinates' real match ("Stuart Lake
Trailhead"), `length_m` corrected to the externally-sourced 600 ft figure, and `fa` corrected to
name the FA party (already named in the row's own overview field). Flagged as a likely duplicate
(not auto-merged): Stanley-Burgner and sibling wa_prusik_peak_south_face_burgner_stanley — every
external source uses "Stanley-Burgner"/"Burgner-Stanley"/"South Face" interchangeably for what
looks like one single 1968 route documented under two DB rows.

**Storm King:** this batch's own task briefing incorrectly assumed this Storm King was in
Olympic NP near Mount Olympus — the audit agent caught the error itself (this Storm King is
actually in North Cascades NP, near Mount Goode) and correctly declined to apply any wrong
Olympic-NP corrections; the DB's existing area hierarchy/land-manager text was already right.
Biggest finding of the batch: wa_storm_king_north_face's own `verif` field already states
"Likely a fabricated entry" — no source found this run corroborates a "North Face" route or its
claimed 1978 FA; every available source documents only the Southwest Route as an established
line on this peak. Flagged prominently for a human decision on removal/further investigation
(not deleted, per guardrails); a harmless internal coordinate fix (`approach_logistics`
peakLat/Lng, ~3km off from the area's own coordinates) was still applied regardless of that
question. Southwest Scramble's `loss_ft` (2200) fixed to 6300 to match its own itinerary
day-sum and gain_ft symmetry. Flagged, not fixed: a leaked research-session artifact disguised
as a "Rainy Pass Trailhead" waypoint, whose own note text second-guesses the route's real
trailhead — but removing it would leave the route with no stored trailhead waypoint at all
before mile 13.8, so left for a human to resolve rather than mechanically deleted.

Pre-flighted with `check:sql` before finalizing — all 22 write targets confirmed to exist live,
no deletes proposed this batch.

Next batch will continue alphabetically after `wa_storm_king_southwest_scramble` (see progress file).

## 2026-08-05 — Pass 1, Batch 46

Eight peaks, 10 routes (Swiss Peak 1, Tenpeak Mountain 2, The Brothers 2, Concord Tower 1,
The Chopping Block 1, Southeast Mox Peak 1, Mount Stuart 1, South Early Winters Spire 1):
Standard Route (Swiss Peak); North Couloir, Southeast Route (Tenpeak); South Couloir, Brothers
Traverse (The Brothers); The Cave Route (Concord Tower); South Route (Chopping Block); The
Devils Club (SE Mox); The Direct North Ridge w/ Gendarme (Stuart); The Hitchhiker (SEWS).
Researched via 8 parallel agents, one peak-group each.

**Confirmed errors → fixes in `sql/2026-08-05-batch-46.sql`:**
- Tenpeak Mountain Southeast Route: `pitches` (3) contradicted the row's own beta text ("the
  final two pitches...") and its own 2-entry `pitch_detail` array — fixed to 2.
- The Chopping Block South Route: this row's own `corrections` field already flagged a grade
  discrepancy (DB said "Grade II-III, 5.4"; sources say "5.5/Grade II") that was never applied —
  confirmed via Mountaineers.org (corroborated by references to Beckey's Cascade Alpine Guide)
  and fixed; also filled the null `pitches` field with the sourced 5-pitch count (the row's own
  `pitch_detail` array still only lists 2 of the 5 and needs expansion by a future pass).
- Southeast Mox Peak's Devils Club: `rope_note` said "(23 pitches)", contradicting the row's own
  top-level `pitches` field (25) and its own fully-detailed 25-entry `pitch_detail` array
  (individually graded pitches 1-25, matching the ~25-pitch figure independently found in
  AAJ/Climbing.com/CascadeClimbers sources) — corrected to 25.
- Mount Stuart's Direct North Ridge w/ Gendarme: `fa` omitted the ridge's actual 1956 original
  ascent (Don Claunch & John Rupley, who bypassed the Great Gendarme) and mislabeled the 1963
  Beckey/Marts ascent as simply "Upper ridge" when it was actually the first ascent climbing
  directly over the Gendarme — corrected per American Alpine Institute / SummitPost / Cascades
  climbing-history sources. The 1970 Hargis/Ossiander direct-lower-start credit was already
  right and is unchanged.

**Independently verified as correct, no action:** Swiss Peak's 7,988 ft elevation and the
Wallace/Kaplan 2005 Northern Pickets traverse claim; Tenpeak's 8,312 ft elevation and its
Southeast Route's 1940 Anderson/Campbell FA; The Brothers' 1908/1912 Hill/Collier-party FAs and
"Mt. Edward"/"Mt. Arthur" naming; Concord Tower's Cave Route FA (Burgner/McPherson, 1968) and
route description; The Chopping Block's 1932 Degenhardt/Strandberg FA; Southeast Mox Peak's
8,504 ft elevation and its Devils Club FA (Layton/Wolfe, 2005) and ~2,500 ft East Face height;
Mount Stuart's 9,415 ft elevation/5,354 ft prominence and its AAC-documented July 2020 rockfall
accident; SEWS's 7,807 ft elevation and its Hitchhiker FA (Burdo/Johnston, 2007).

**Flagged for human review (not auto-fixed):**
- Swiss Peak's own area row has no `lat`/`lng` at all (both null) — no source found this pass
  gives a specific, corroborated summit coordinate to fill the gap; left blank rather than
  guessed.
- The Brothers: the area's `elevation_ft` (6868) sits 2 ft above both of its own routes'
  `high_point_ft` (6866) — this is noise within an already-documented, unresolved external
  conflict (this row's own `data_quality.gaps` already flags 6,842 ft older USGS-derived figures
  vs. 6,866-6,868 ft newer ones); independently re-confirmed as still unresolved, not a new issue.
- Concord Tower's area `elevation_ft` (7611) may itself be the error, not the Cave Route's
  `high_point_ft` (7569) as a prior pass's own note hypothesized — secondary sources
  (SummitPost-derived search snippets) converge on "7,560+ ft," closer to the route's own figure
  than the area's — but the source is a rounded, non-primary figure, so left flagged rather than
  swapped.
- Southeast Mox Peak's Devils Club: the row's own top-level grade fields (`grade`="5.11",
  `rock_grade`="5.11-", `grade_num`=11) could not be corroborated by any primary source found
  (AAJ, Alpinist, Climbing.com, CascadeClimbers all cite only "V+ 5.9+ A2-" — the same figure the
  row's own overview text cites as a secondary "press summary," when it may actually be the only
  documented grade). Not auto-fixed because correcting it would also require reconciling the
  row's own detailed 25-entry `pitch_detail` array (individual pitch grades run up to 5.11- on a
  possible later free-climbing breakdown this pass could not independently verify), and this is
  safety-relevant grade information on a serious, remote wall.
- Southeast Mox Peak's Devils Club: `alpine_grade`="V+" looks like the same recurring DB-wide bug
  as past batches (a Roman-numeral/NCCS-style commitment grade landing in a field meant to hold
  a French-adjectival value, duplicating the row's own separate `commitment`="V" field) — no
  sourced French-scale replacement value found, so left flagged rather than cleared/guessed.
- SEWS's Hitchhiker: `approach`/`descent_text`/`road`/`access` all consistently describe the
  Blue Lake Trailhead, but the row's own `waypoints` array carries a single, explicitly
  self-flagged point ("Hairpin Turn Pullout," noted inline as "DIFFERENT from existing DB value")
  that a prior pass left unresolved. External research this pass found the hairpin/Spire Gully
  approach is actually the better-corroborated one for this specific south-face route (shared
  with neighboring Backseat Driver/Rubbernecker), making the majority-agreeing prose fields the
  likely error rather than the flagged waypoint — but no fully-detailed, route-specific approach
  paragraph could be sourced to safely rewrite `approach`/`road`/`access` without fabricating
  driving-direction specifics, so left flagged for a human rewrite rather than a partial patch.

Pre-flighted with `check:sql` before finalizing — all 4 write targets confirmed to exist live,
no deletes proposed this batch.

Next batch will continue alphabetically after `wa_the_hitchhiker` (see progress file).
