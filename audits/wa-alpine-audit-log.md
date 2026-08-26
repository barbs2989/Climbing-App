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

---

## 2026-08-05 — Pass 1, Batch 47

Six peaks, 10 routes, researched via 6 parallel agents (one per peak group): Cathedral Peak /
The Monk (5 routes — Le Gibet, Odine, Scabo, West Cracks Left Crack, West Cracks Right Crack),
The Needle (Neve Glacier Approach/Standard), The Pleiades (Glacier/Scramble Route), The Pyramid
(South Route, Southern Pickets), The Rake (Ridge Traverse Route, Southern Pickets), Unicorn Peak
(The Roof).

**Confirmed errors → fixes in `sql/2026-08-05-batch-47.sql`:**

- **The Pleiades scramble** was this batch's biggest find: its own `corrections` field already
  suspected the "Glacier/Scramble Route" name didn't match a literal glacier crossing, and that
  suspicion was correct — `partner_requirements`, `seasonal_hazards.crevasses`,
  `access.land_manager`, `access.permit`, and both `approach_logistics` trailhead fields all
  carried content copy-pasted from an unrelated Mount Baker route (the Park Glacier line via
  Ptarmigan Ridge/Camp Kiser — a different mountain and trailhead ~15 miles away), directly
  contradicting this route's own approach text, waypoints, itinerary, hazards, and
  `rope_type = "none"`. All 6 fixed to describe the route's actual single-day, no-glacier Twin
  Lakes/High Pass Trail approach (confirmed via the USFS Ptarmigan Ridge Trail 682.1 page and
  the row's own internal data).
- **Unicorn Peak's The Roof**: `length_m` (122) contradicted its own single 15m pitch in
  `pitch_detail` — fixed to 15. The identical wrong 122 value appears verbatim on two sibling
  Unicorn Peak routes (`wa_open_book_2`, `wa_classic_route_2`), each also a single 15m-pitch
  route — a copy-paste artifact repeated three times, not three independent measurements.
  Those two siblings are outside this batch's scope; flagged here for a follow-up pass.
- **The Monk - Odine** (Cathedral Peak): `watch_out` still opened "5.8 route in The Monk complex"
  despite `grade`/`grade_num`/`rock_grade` already having been corrected to 5.9 by an earlier
  pass (per the row's own `corrections` note, which cites Mountain Project) — the leftover prose
  was fixed to match the already-corrected structured fields.
- **The Pyramid's South Route** (Southern Pickets): `road.status`/`seasonalGate` claimed a
  winter closure gate at the Goodell Creek trailhead, directly contradicted by this same row's
  own `access.closures` field and confirmed via WSDOT (the real SR-20 winter gate sits far east,
  near Ross Dam/Early Winters — Goodell Creek/Newhalem stays open year-round) — fixed. Also
  renamed the route from "South Route" to "West Ridge": this row's own `aspect` (W), `face`
  ("West/connecting ridge to Mt. Degenhardt"), `pro_tips`, and waypoint notes all describe a
  west-side line, and the route's own cited source (Steph Abegg's Southern Pickets trip report)
  titles this exact climb "Pyramid West Ridge." The route `id` keeps its `_south_route` suffix —
  renaming the id itself is a separate, riskier decision left for a human, consistent with this
  dataset's known id/name-mismatch pattern.

All 10 confirmed fixes were independently re-verified against the live DB (current column
values matched each research agent's report byte-for-byte) before SQL was written, and
pre-flighted with `check:sql` — all 10 write targets confirmed to exist live, no deletes
proposed.

**Flagged for human review, not auto-fixed:**

- All 5 Monk routes share `high_point_ft = 8606` (Cathedral Peak's true summit elevation),
  but their own `waypoints` arrays say The Monk's tower top is 8,300 ft, and the shared
  approach/descent text describes The Monk as a separate, lower, semi-detached tower whose
  routes rappel an NE gully rather than reaching Cathedral's summit — looks copy-pasted from
  the area row rather than reflecting the route's actual topout, but no external source for
  The Monk's specific elevation was found to confirm a replacement value.
- Two Monk routes (Le Gibet, West Cracks - Left Crack) have a `corrections` note claiming a
  verified 2-star Mountain Project rating that was never written to the null `stars` column;
  Mountain Project was unreachable (blocked) this run to re-confirm before applying.
- Scabo and West Cracks - Right Crack both have a `loss_ft` wildly out of step (5450/5200 ft)
  with three sibling Monk routes sharing byte-identical approach text and reporting 1300 ft —
  no source found to say which figure is correct.
- The Needle's mid-route waypoints and `gpx` track are geographically inconsistent with
  themselves and with the real coordinate for Horsemans Pack (off by as much as ~4.4 mi), and
  the `gpx` track never actually reaches the summit — it looks adapted from the shared Snowfield
  Peak approach and never reconciled for The Needle specifically. This needs a human to re-plot
  from an actual GPS track rather than a single-value fix.
- The Rake's summit elevation is disputed between two source families (7,840 ft vs. the on-file
  7,869 ft) with no primary source reachable this run to adjudicate; its `alpine_grade` (IV)
  duplicates the commitment grade instead of the schema's French adjectival scale (the same
  recurring DB-wide pattern noted in prior batches, no sourced replacement found); and its
  `dist_km` looks like it may already store a round-trip figure rather than one-way (per
  CLAUDE.md's guidance on this column, left for `npm run audit:distances` rather than
  hand-patched).
- Both The Needle and The Rake audits were constrained by primary sources (Wikipedia, Mountain
  Project, SummitPost, Peakbagger) returning 403 to direct fetch this run; WebSearch snippets
  were used as a lower-confidence fallback and are noted as such above.

Next batch will continue alphabetically after `wa_the_roof` (see progress file).

## 2026-08-05 — Pass 1, Batch 48

Five peaks, 10 routes, researched via 5 parallel agents (one per peak group): The Tooth
(Tooth Fairy, Northeast Slabs, South Face), The Triad (East Peak), North Early Winters Spire
(The West Face), Three Fingers (North Peak, Middle Peak, South Peak via Lookout), Three Queens
(Middle Peak, West Peak).

**Confirmed errors → 26 fixes in `sql/2026-08-05-batch-48.sql`:**

- **Three Fingers North Peak (`wa_three_fingers_r1`)** was this batch's biggest find: five
  fields (`pro_tips`, `watch_out`, `rope_note`, `ascender`, plus a whole leaked waypoint)
  carried the South Peak lookout route's three-fixed-ladders content, directly contradicting
  this route's own `overview`, which explicitly says "There is no maintained trail, no
  ladders, and no register cabin" on the North Peak — the ladders belong to the separate
  South Peak lookout route. Fixed all five, including removing the leaked "South Peak lookout
  ladders" waypoint and shortening the summit waypoint's note to match.
- Two more Three Fingers self-contradictions: Middle Peak's own summit waypoint note claimed
  its elevation matched "the record's own high_point_ft (6,797 ft)" when both the waypoint and
  `high_point_ft` actually read 6,800 ft — fixed the note's stale number. Middle Peak's
  `approach_logistics.peakLat/Lng` pointed at the North/South Peak's shared coordinate instead
  of its own documented summit (visible in its own waypoints array) — fixed. South Peak
  Lookout's `gain_ft` (5,750) didn't match its own `loss_ft` or itinerary-derived total
  (4,200) for what is an out-and-back route — fixed.
- **North Early Winters Spire's West Face**: a stale Blue Lake TH waypoint/`gpx` point that a
  sibling route on the same peak (`wa_news_nw_corner`) had already caught and fixed — this
  route's own `approach_logistics.trailheadLat/Lng` already had the corrected value, it just
  never propagated to `waypoints`/`gpx`. Also fixed: a 60m-vs-70m rope contradiction against
  its own `rope_length_m`, a 500ft-vs-660ft route-length contradiction against its own
  `pitch_detail`, a repeated FA misspelling ("Beckstad" → "Beckstead", confirmed via theCrag),
  and the recurring `alpine_grade`-duplicates-`commitment` and `watch_out`-string-not-array
  bugs.
- **The Triad's East Peak**: `gain_ft` had regressed to an uncorrected trailhead-to-summit
  delta despite its own itinerary/`sourceNote` already documenting the real, corrected
  round-trip figure — fixed back to the documented value. A null `fa` its own overview already
  answered (1949, Eilertsen/Lowery/Scales/Wilde, corroborated via Wikipedia) — filled. A
  `rappels` field describing "2 rappels of ~30m" contradicting its own pitch-by-pitch descent
  data (1 rappel, ~20m) — fixed. A truncated `approach_logistics.trailheadDirection` string —
  restored from the matching full sentence in the route's own `approach` field. The area row's
  `prominence_ft` (822) disagreed with Wikipedia/Peakbagger/Peakery, which converge on 760 —
  fixed (elevation was not in dispute).
- **Three Queens Middle Peak**: `access.notes` named the Snoqualmie Ranger District at a
  Mt. Baker-Snoqualmie NF phone number, contradicting its own `landManager`/
  `emergency.rangerStation` fields (both correctly say Cle Elum Ranger District) and the live
  USFS "Three Queens Fire" closure alert, which directs inquiries to Cle Elum — fixed. Its
  `dist_km` (4.3, meant to be one-way) didn't match its own itinerary text ("roughly 10 miles
  round trip") or the underlying source trip report — corrected to 8.05 km one-way. West
  Peak's missing trailhead coordinates were filled from the corroborated sibling value (both
  routes share the Mineral Creek Trailhead).
- **The Tooth** had the lightest touch: a commitment-grade-in-`alpine_grade` bug and a wrong
  `nearestHospital` (Harborview instead of the actually-closer Snoqualmie Valley Hospital,
  matching both sibling routes) on Tooth Fairy, and a `watch_out` string-vs-array bug on
  Northeast Slabs. South Face audited clean.

All 26 confirmed fixes were independently re-verified against a fresh full-row fetch of the
live DB (matching each research agent's report) before this file was written, and
pre-flighted with `check:sql` — all write targets (routes and the one areas-table target,
The Triad's `prominence_ft`) confirmed to exist live, no deletes proposed.

**Flagged for human review, not auto-fixed:**

- North Early Winters Spire's West Face: `pitches` (6) vs. `pitch_detail`'s 5 documented
  pitches — no source found for what a genuine 6th pitch would contain; an unverifiable 1985
  FFA (Steve Risse and Dave Tower) — not contradicted either, just unconfirmed.
- The Tooth's Northeast Slabs: `dist_km` reads as a plausible one-way figure by magnitude but
  conflicts with the route's own itinerary narrative ("about 6.5 miles" total) — a
  narrative-vs-render conflict `audit:distances`' magnitude-only heuristic doesn't catch,
  left per CLAUDE.md's guidance not to bulk-normalize this column. Its own
  `rappel_count_note` field already documents an unresolved 2-rappel-vs-4-rappel
  self-contradiction in the descent description.
- Three Fingers: the North Peak and South Peak Lookout summit waypoints share the exact same
  coordinate to 6 decimal places despite being distinct summits with different elevations —
  looks like the area's single representative point reused for two real, separate towers; the
  area's own `elevation_ft` (6,865) matches none of three internally-documented conventions
  (technical true high point at 6,870, named/lookout summit at 6,854 per a prior batch's own
  `corrections` note, or the ~6,858-6,859 ft commonly published externally).
- Three Queens West Peak: `overview`/`beta`/`turnaround` describe camping at "Spectacle Point
  (5,800 ft)," but the only stored waypoint is the separate, lower "Spectacle Lake" (4,265 ft,
  confirmed via Wikipedia) — needs a human with the original source (blocked by robots/WAF
  this run) to confirm the real camp location.
- The Triad's East Peak: waypoints/`what_to_bring` still list a Marble Creek basin campsite
  and bivy gear despite the route's own itinerary/`sourceNote` explicitly correcting this to a
  single-day car-to-car climb — may be intentional (optional multi-day combo with an Eldorado
  glacier camp) rather than leftover contamination; left for a human call.

Next batch will continue alphabetically after `wa_three_queens_west_peak` (see progress file).

---

## 2026-08-05 — Pass 1, Batch 49

Eight routes across 7 peaks (Tomyhoi Peak, Lexington Tower, The Tooth, Tower Mountain,
Trapper Mountain x2, Tricouni Peak, Vesper Peak): Southeast Ridge (Tomyhoi); Tooth and Claw
(Lexington Tower); Tooth - Chair Traverse (The Tooth); Southwest Route/Standard (Tower
Mountain); North Couloir, South Slopes (Trapper Mountain); Southwest Slopes/Lucky Pass
(Tricouni Peak); True Grit (Vesper Peak).

**Confirmed error → 4 fixes in `sql/2026-08-05-batch-49.sql`:** Vesper Peak's area elevation
(6,214 ft) and 3 of its 4 routes' `high_point_ft` (all 6,214 ft) were the outliers against
external sources — independently verified this pass that Wikipedia, Peakbagger.com, and
USGS-derived topo sources all converge on 6,221 ft, with 6,214 ft traceable only to Mountain
Project's area page. The 4th route, True Grit, already carried 6,221 ft with its own
`corrections` field explaining the source split; the other three records had just never been
updated to match. Fixed the area row (elevation_ft + the "(6,214 ft)" mention in its own
blurb text) and both Ragged Edge routes plus Fish & Whistle to 6,221 ft.

**Audited clean, no action:** Tomyhoi Peak's Southeast Ridge (elevation 7,439 ft confirmed via
Wikipedia/Peakbagger, matching WA's actual USFS Yellow Aster Butte/Tomyhoi Lake beta in
detail); The Tooth's Chair Traverse (6,238 ft high point is correct — that's Chair Peak's own
summit elevation, since this route legitimately continues past The Tooth to finish there; the
row's own `corrections` field already documents this reasoning); Tower Mountain's Southwest
Route (the 8,444 ft vs. 8,445 ft area/route gap is a genuine, already-documented external
source split, not something to force into agreement); Trapper Mountain's North Couloir
(approach via Cascade River Road/Cascade Pass to Trapper Lake independently confirmed as the
real, "most-used" approach to this peak).

**Checked and deliberately left alone:** Lexington Tower's Tooth and Claw has a null
`high_point_ft` while its sibling East Face/North Face routes both carry the peak's true
summit elevation (7,560 ft, confirmed). Research this pass turned up a specific reason NOT to
fill it the same way: multiple sources indicate Lexington Tower's east-side face routes
(including this one) top out on an east shoulder/notch below the true summit spire, not the
summit itself — filling in 7,560 ft would misrepresent the route. No confirmed substitute
figure was found, so the null stays. Also independently verified this pass: the route's FA
credit ("Steve Risse, Dave Tower, June 1989") is genuine and correctly attributed (Mountain
Project + SummitPost agree, and Steve Risse is independently documented via an AAC obituary as
active on Lexington Tower's east side in this era) — "Dave Tower" being a real climber's name,
not a mangled reference to the peak itself.

**Flagged for human review, not auto-fixed:**

- **wa_trapper_mountain_south_slopes** — this batch's most significant find. The route's
  approach/waypoints describe reaching Trapper Lake via a "Devore Creek Trail" junction off
  the Stehekin River Trail. Two independent research passes confirmed this is contamination:
  Devore Creek Trail is real, but it leads to the Devore Peak/Tupshin Peak/Fourth of July
  Basin cluster, a different, distant peak group — not Trapper Mountain. The route's own
  waypoints even show the tell: a 20+ km gap between the "Devore Creek" waypoint and the
  "Trapper Lake" waypoint with nothing in between. The actual, "most-used" documented approach
  to Trapper Lake goes via Cascade River Road → Cascade Pass → Pelton Basin (matching this
  peak's other route, North Couloir, which already has this right) — but no source gave
  enough specific detail (mileage, waypoint coordinates) to draft a confident non-fabricated
  replacement for the South Slopes route's approach text, road/access fields, waypoints, and
  gpx track, all of which are built around the wrong trail. This needs a human rewrite with
  guidebook (Beckey) or NPS primary-source access, not a field patch. Notably, the area row's
  own blurb ("reaching the peak means getting to Stehekin by boat or floatplane") also leans
  on the Stehekin framing and may need reconciling with the Cascade Pass approach once this is
  resolved.
- **wa_tricouni_peak_southwest_slopes** — the route's own `data_quality.gaps` field already
  flagged an approach mismatch between its `fa` field (which describes an Inspiration
  Glacier/Klawatti Col approach) and its overview/beta/waypoints (which describe the modern
  standard north-side approach via Thunder Creek/McAllister Camp/Borealis Glacier/Lucky Pass).
  Research this pass resolved part of this: the overview/beta and the "Southwest Slopes" name
  are both actually correct — "Lucky Pass" is a real, correctly-named feature, and the final
  chute/ridge from the pass to the summit genuinely faces southwest even though the approach
  to reach that pass comes from the north. What's still unresolved is the `fa` field itself,
  which may be conflating the 1951 Elerding/Carlson party's real ascent (possibly via the
  Inspiration Traverse's south-side finish) with the modern standard route — no source found
  specific enough to confirm which approach that 1951 party actually used, so left as-is
  rather than guessed.

Next batch will continue alphabetically after `wa_true_grit_2` (see progress file).

## Batch 50 (2026-08-06)

Nine peaks, 10 routes (`wa_ultramega_ok` / Burgundy Spire, `wa_upper_north_ridge_w_great_gendarme`
/ Mount Stuart, `wa_vasiliki_ridge_standard` / Vasiliki Ridge, `wa_vesper_peak_north_face_ragged_edge`
/ Vesper Peak, `wa_warrior_peak_standard` / Warrior Peak, `wa_west_craggy_peak_standard_route` /
West Craggy Peak, `wa_west_twin_needle_south_route` / West Twin Needle, `wa_whatcom_peak_southwest_route`
/ Whatcom Peak, `wa_whitehorse_mountain_nw_shoulder` + `wa_whitehorse_mountain_r1` / Whitehorse
Mountain), researched via 8 parallel agents, one per peak group. WebFetch to primary sources
(Mountain Project, SummitPost, Peakbagger, Wikipedia, Beckey's guide) was blocked at the
network/proxy level for the entire run, so every finding below leans on WebSearch snippet
corroboration across multiple independent queries rather than direct page reads — noted per
item where that materially limited confidence. 11 confirmed fixes written to
`audits/sql/2026-08-06-batch-50.sql`, pre-flighted with `check:sql` (all 11 write targets
confirmed to exist live, no deletes proposed).

**Fixed this batch:** Vasiliki Ridge's `high_point_ft` (8190 ft) had never caught up to the
row's own `corrections` field, which already documents a 2025 GPS/LiDAR survey settling on
8,203 ft — the area row and the route's own summit waypoint both already carried the corrected
figure. Warrior Peak got three fixes: area elevation (7314→7320 ft, matching the route's own
already-correct `high_point_ft` and Wikipedia/PeakVisor/Wikidata), prominence (804→760 ft, no
source corroborates 804), and `rock_grade` ("3rd class scrambling"→"Class 4, low 5th",
which was self-contradicting the row's own `grade` field and hazard-waypoint note describing
the same summit step) — plus reconciling a duplicate `access.land_manager`/`landManager` pair
that disagreed on whether the route crosses both Olympic NF and Olympic NP (the detailed
`landManager` field was externally verified against the WTA/USFS-documented boundary sign
~7.1 mi in; `land_manager` was the stale NPS-only outlier). Burgundy Spire's Ultramega OK got
three fixes: `dist_km` (10.62→5.31 km, was storing the round-trip figure the app then doubles
again per CLAUDE.md's documented one-way convention — resolved from the route's own
waypoints/itinerary, no external source needed); `gain_ft` (4170→4300, matching the row's own
`loss_ft` and itinerary, since a car-to-car loop's gain must equal its loss); and
`road.seasonalGate`'s SR-20 closure start date (Dec 12→Dec 4, 2025, per WSDOT's official
season-closure announcement — the June 14, 2026 reopening date was independently confirmed
correct and left alone). Mount Stuart's Upper North Ridge w/Great Gendarme repeated the same
nonexistent "Leavenworth Ranger District" error already fixed on this same land unit in
batches 4, 5, and 12 — corrected to Wenatchee River Ranger District, and the row's own false
`corrections: "None — consistent across multiple sources"` claim was overwritten with a note
pointing at the open flags below. Whatcom Peak's Southwest Route had a first-ascent misspelling
("Buchanan"→"Buchanen") where the route's own parent-area blurb already had the correct
spelling, making the route row the sole outlier even within its own DB; also fixed a ~677m
summit-coordinate discrepancy between the area/`approach_logistics` fields (48.8576357,
-121.373549) and the route's own summit waypoint (48.8561, -121.3825), which converts exactly
from Wikipedia's DMS coordinate for Whatcom Peak. Whitehorse Mountain's Northwest Shoulder had
`max_angle` (55°) contradicting its own `descent_text`, which explicitly describes the summit
downclimb reaching "up to about 60 degrees" — fixed to 60; left the sibling route `r1`'s
matching 55° alone since r1's own pitch_detail text (~50-55°) actually supports it.

**Audited clean, no action:** Vesper Peak's North Face (Ragged Edge) — FA, grade/pitch
internal consistency, approach/access, gain/loss, and hazards (including corroborating a
documented September 2024 rockfall event via a CascadeClimbers thread) all checked out; its
elevation fix remains pending from batch 49 and was not re-proposed. `dist_km` is a likely
round-trip-vs-one-way convention issue (same pattern CLAUDE.md warns not to hand-patch) —
left for a future `audit:distances` pass.

**Biggest open flag:** `wa_whitehorse_mountain_r1`'s GPX track is byte-for-byte identical to
its `nw_shoulder` sibling (all 916 points match), and its top-level `gain_ft`/`loss_ft`/`dist_km`
are also copied wholesale from the sibling — contradicting r1's own itinerary and pitch_detail
text, which describe a materially different, externally-corroborated route (a "Snow Gulch"
approach via Ashton Creek, matching a real trip report's stats almost exactly). r1's own
`approach` field even self-contradicts, opening by describing the standard Niederprum/Lone
Tree Pass/High Pass line before switching to Snow Gulch language mid-field. This needs a human
rewrite with a freshly-plotted track, not a field patch.

**Other significant flags, not auto-fixed:**

- **Mount Stuart** (`wa_upper_north_ridge_w_great_gendarme`): the row's `fa` field may have
  the Great Gendarme's first-ascent credit swapped with the original ridge's bypass-FA credit
  — search snippets (climbaz.com's Rupley interview, AAI) suggest the 1956 Rupley/Gordon party
  bypassed the Gendarme via a rappel rather than climbing it, and that Jim Wickwire & Fred
  Stanley's 1964 ascent is the Gendarme's real FA, the reverse of what's on file. Also: a
  waypoint ("Top of Sherpa Glacier notch") sits ~0.2 mi from neighboring Sherpa Peak's own
  summit and contradicts the route's own `face` field, which correctly names the Stuart
  Glacier — looks like cross-peak contamination, same family as prior batches' sibling-route
  bleed. Pitch count disagrees across three fields (16 in `pitch_detail`, 17 in `rope_note`,
  18 top-level), and `dist_km`/`gain_ft` are inconsistent with the row's own waypoints. All
  left flagged — WebFetch to primary sources was blocked this entire run, and this row's
  historical claims deserve a Beckey/AAJ-level source before editing.
- **West Craggy Peak** (`wa_west_craggy_peak_standard_route`): the row's own `corrections`
  field claims "elevationFt...listed as null," but the area's `elevation_ft` (8366) is
  populated and disagrees with the route's own `high_point_ft` (8372) that the same note
  claims was applied — a stale/self-contradicting note on top of a genuinely disputed
  elevation (8366 vs. 8367 vs. 8372 across sources, no clear winner). Also, the "Copper Glance
  Creek crossing" waypoint (distMi 1.6, elev 6400 ft) is very likely misplaced — four
  independent sources (Mountaineers.org, WTA, USFS trail page, Wenatchee Outdoors) put the
  real crossing at ~0.4 mi from the trailhead, nowhere near 6,400 ft — but no source gives an
  exact replacement elevation, only a rough range, so this wasn't patched.
- **West Twin Needle** (`wa_west_twin_needle_south_route`): top-level `grade`/`commitment`
  ("Grade III, 5.7") contradicts the row's own `beta` and `pitch_detail` fields, which quote
  an outside source giving "Grade II" for the same route — the same self-contradiction pattern
  already flagged on sibling wa_east_twin_needle_south_route in batch 10. Also, an "Eye Col"
  waypoint and a "Himmelhorn–West Twin Needle col" appear to be conflated as the same feature
  when external sources place them on opposite sides of the peak, and two consecutive
  waypoints imply a physically impossible 0.8 mi trail distance between points ~3 mi apart
  straight-line — the GPX track's tail also looks like it doesn't reach the real summit.
  `gain_ft`/`loss_ft` (7336/7336) don't match the route's own itinerary day-sum (9000/9000)
  either. No confident single fix for any of this — needs a human with route-specific
  guidebook access.

Next batch will continue alphabetically after `wa_whitehorse_mountain_r1` (see progress file).

## Batch 51 — 2026-08-06

Three routes across 2 peaks — the last unaudited routes in the pass-1 scope (confirmed via a
live query: no route id sorts after `wa_witches_tower_south_face` in scope). **Pass 1 is
complete.** Checked via 2 parallel research agents, one per peak.

- **Windy Peak** (`wa_windy_peak_iron_gate_trail`, `wa_windy_peak_windy_creek_trail`) — both
  routes audited clean. Elevation (8,335 ft) and prominence (1,773 ft) confirmed against
  Wikipedia/Wikidata; summit coordinates match Wikidata to the 3rd-4th decimal, ruling out
  confusion with the other, unrelated "Windy Peak/Pass" near Hwy 20/Rainy Pass; the "easternmost
  Bulger" claim and the 1932-1963 L-4 lookout history (built by Allen & Johnson, used briefly by
  the WWII Aircraft Warning Service, demolished 1963) both confirmed via firetower.org and
  Wikipedia; both approach descriptions (Iron Gate/Boundary Trail/Sunny Pass, and Cathedral
  Driveway/Windy Creek Trail) matched published directions (willhiteweb, WTA) closely, including
  road mileages. One minor blurb detail — surviving telephone-line remnants on the NW slope —
  was unverified (plausible for a lookout of that era, not contradicted, not worth a flag).
- **Witches Tower** (`wa_witches_tower_south_face`) — elevation (8,566 ft), prominence (210 ft),
  and summit coordinates all confirmed against Wikipedia/Wikidata; the Colchuck Lake -> Aasgard
  Pass -> summit waypoint chain is geographically coherent and matches known elevations. One
  flagged, not fixed: the route's own `itinerary.sourceNote` claims a cited trip report's "14.0
  miles" round-trip figure "matches the on-file 22.53 km distance almost exactly," but the row's
  actual `dist_km` is 12.9, not 22.53 — the note is asserting a match to a number that isn't in
  the field. Whether the fix belongs on `dist_km`, on the note text, or reflects the same
  one-way/round-trip `dist_km` convention split flagged project-wide in `CLAUDE.md` (never
  bulk-corrected) isn't resolvable without the source trip report itself (WebFetch to
  SummitPost/Mountain Project/etc. was blocked at the network/proxy level again this run, same
  as batch 50) — left for a human to resolve. The route-naming inconsistency already
  self-documented in `data_quality.gaps` (South Face vs. West Buttress grade/pitch confusion) was
  independently corroborated by search results, not newly found.

0 confirmed errors this batch — no SQL file. 2 routes clean, 1 flagged for human review.

**Pass 1 complete: 524 routes it started with, 526 in scope by the time it finished** (2 routes
were added to the catalog mid-pass by unrelated enrichment work landing on `main`; since they
sorted alphabetically before the pass's cursor, they were never reached this pass). Starting
pass 2 from the top of the alphabet will pick them up along with everything else — facts go
stale, so a fresh full pass is the intended behavior, not a gap to patch around.

## Batch 52 — 2026-08-06 (Pass 2, batch 1)

First batch of the second full pass, starting fresh from the top of the alphabet. 8 routes
across 7 peaks, checked via 7 parallel research agents (one per peak, American Border Peak's
two routes covered together). Direct WebFetch to Mountain Project/AAC/SummitPost/CascadeClimbers/
Wikipedia was 403-blocked for several agents this run (same proxy-policy issue noted in recent
pass-1 batches) — those findings lean on WebSearch snippet cross-referencing instead, called out
per-field below where it lowers confidence.

- **Liberty Bell** (`wa_a_servant_to_liberty`) — the `fa` field and both `pro_tips` entries
  mischaracterized Mikey Schaefer's Aug 6, 2016 completing free ascent as "rope-solo." Per AAC
  Publications, Schaefer's rope-solo work was his 2015 scouting/equipping pass; the actual FA
  send was a partnered lead with Shanjean Lee belaying. Fixed both fields. Everything else
  checked out (route relationship to Freedom or Death/Thin Red Line, descent, approach waypoint,
  grade, pitch count). `length_m` (427) vs. two sources' "450m" and the Alex Honnold repeat-ascent
  claim in `data_quality.gaps` couldn't be resolved (primary sources 403'd) — left for a human.
- **Abernathy Peak** (`wa_abernathy_peak_south_ridge`) — `permit` claimed a free self-issue Lake
  Chelan-Sawtooth Wilderness permit is required; the USFS Okanogan-Wenatchee NF page says no
  wilderness permit of any kind is needed there (unlike the neighboring Pasayten, which does use
  self-issue permits) — only a Northwest Forest Pass for parking, which the field already and
  separately noted correctly. Fixed. Elevation, prominence, coordinates, trail mileage, gain,
  class-3 difficulty, and season all confirmed correct against USFS/PeakBagger/trip reports.
  Trailhead elevation (3,100 ft waypoint vs. a 3,150 ft consensus) and driving distance
  (22-24 mi vs. sourced 21.6-21.8 mi) are minor, unconfirmed discrepancies — not fixed.
- **Burgundy Spire** (`wa_action_potential`) — `approach_logistics` was labeled "Silver Star Creek
  Trailhead" with a Silver Star Creek approach narrative, but carried the coordinates of the
  route's own correctly-documented SR-20/Burgundy Col pullout elsewhere in the same row. Silver
  Star Creek is a real but distinct approach (used for Silver Star Mountain's glacier route, per
  The Mountaineers) — not this route's approach. Fixed to describe the SR-20/Burgundy Col
  approach consistently. Grade, pitch count, FA climbers/year, and the Bench/Burgundy Col
  waypoints all confirmed correct. FA exact dates (July 18-20, 2004 vs. a single-date CC trip
  report title) and pitch-by-pitch gear/length detail couldn't be independently confirmed
  (sources 403'd) — flagged, not fixed. Note: the area row's own `elevation_ft` (8483) differs
  by 9 ft from the route's `high_point_ft` (8492, which matches listsofjohn.com) — out of this
  batch's scope (area row, not one of the audited routes) but worth a future-batch look.
- **Agnes Mountain** (`wa_agnes_mountain_west_route`, area `wa_agnes_mountain`) — two confirmed
  errors. (1) The area's `elevation_ft` (8131) disagreed with the route's own `high_point_ft`
  (already correct at 8119) and with Wikipedia/Peakbagger/PeakVisor, which all independently
  agree on 8,119 ft — fixed the area row. (2) `permit` framed the climb as North Cascades
  NP-regulated (Recreation.gov/Marblemount WIC reservation), but Agnes Mountain and nearly all of
  the route's approach are actually in the Glacier Peak Wilderness (Okanogan-Wenatchee NF) — the
  NPS/Lake Chelan NRA boundary is only ~2 miles up the Agnes Creek Trail from High Bridge, per the
  USFS's own Agnes Gorge Trail page — fixed to describe the correct free self-issue USFS permit.
  FA (Frazier & O'Brien, 1936, via West Fork of Agnes Creek), summit coordinates, prominence, and
  trailhead coordinates all confirmed correct. `gain_ft`/`loss_ft` asymmetry (4,000/6,500 against
  a ~6,450-6,480 ft net elevation change), `dist_km`, descent narrative (may conflate the 1936
  line with a different, more modern south-ridge route), and difficulty grade are flagged as
  needing human verification — no confident single fix for a rarely-climbed 1936 line.
- **Alpine Lookout** (`wa_alpine_lookout_round_mountain_trail`) — audited clean. Trailhead/summit
  coordinates, elevation (6,237 ft), lookout history (1936 L-4 replaced by a 1975 R-6 cab, still
  staffed most summers — confirmed against the National Historic Lookout Register), route
  description, permit rules, and emergency contacts all checked out against WTA/USFS/NHLR. The
  wide gain/distance spread across sources is already disclosed in the row's own `corrections`
  field and needs no fix.
- **American Border Peak** (`wa_american_border_peak_northeast_face`,
  `wa_american_border_peak_southeast_face`) — one confirmed error: the Southeast Face route's
  `beta` field claimed it was "first climbed by Baker, Beckey, and Dudra in 1952," directly
  contradicting the same route's own correctly-populated `fa` field (Dalgleish/Fyles/
  Henderson/Fraser, Sept 14, 1930 — also the peak's overall FA, confirmed via Wikipedia and
  Peakbagger). Fixed the beta field's opening sentence to match; the 1952 party's actual route is
  unidentified and wasn't reintroduced without a confirmed target. Peak elevation (7,998 ft),
  prominence, summit coordinates, grade, gain, and mileage all confirmed correct. No cross-route
  contradictions found. The Northeast Face route checked out on every populated field, most of
  which are still null (thinly documented online) — an unconfirmed 1982 FA (Serl/Jones/Griffiths/
  Nichol) surfaced in search results but wasn't added without a primary-source read.
- **Amphitheater Mountain** (`wa_amphitheater_mountain_finger_of_fatwa`) — audited clean. FA
  (Bennett & Herrington, 2011), north-face aspect, descent, trailhead coordinates, driving
  directions, and Pasayten permit rules all confirmed against Blake Herrington's FA blog post, the
  2012 AAJ note, USFS, and Mountain Project (for the shared descent). The 5.11c letter grade
  (sources found only say "5.11"), length_m (152m best-supported but conflicting 160/175m
  mentions surfaced), and dist_km/gain_ft (independent hiking sources disagree, and this column
  has known convention problems project-wide) are flagged, not fixed. The 2018 CascadeClimbers trip
  report that likely holds the detailed pitch beta was 403-blocked, same gap the row's own
  `rope_note` already discloses.

6 confirmed errors fixed across 5 peaks (SQL: `audits/sql/2026-08-06-batch-52.sql`); 8 fields
flagged for human review; 2 routes (Alpine Lookout, Amphitheater Mountain) plus the Northeast
Face route on American Border Peak audited clean.

## Batch 53 — 2026-08-06 (Pass 2, batch 2)

8 routes across 3 peaks, checked via 3 parallel research agents (one per peak): the 5 remaining
routes on Amphitheater Mountain (batch 52 only covered its 6th route, Finger of Fatwa),
Anderson's Thumb's lone Standard Route, and Argonaut Peak's two routes. Direct WebFetch to
Mountain Project, theCrag, Wikipedia, SummitPost, Climbing.com, and CascadeClimbers was
403-blocked for every attempt across all three agents this run — same proxy-policy issue noted
in recent batches. All findings lean on WebSearch snippet cross-referencing, several independently
repeated verbatim across multiple queries, which raises but doesn't fully restore confidence.

- **Amphitheater Mountain** (`wa_amphitheater_mountain` + 5 routes) — 0 confirmed errors. Area
  elevation (8,358 ft), prominence (758 ft), and the 1901 Calkins/Smith FA all confirmed against
  Wikipedia/PeakVisor. Right Side, North Ridge, Pilgrimage to Mecca, and West Route all checked
  out clean — grades, pitch counts, cruxes, and descents matched Mountain Project/Climbing.com
  text closely, several near-verbatim. One substantive flag, not fixed: Middle Finger Buttress
  Left Side's `beta`/`overview`/`pitch_detail` describe a "hand crack" crux and a 5.7-5.9 finish,
  but six independent WebSearch queries returned an identical MP quote — a chimney into what was
  originally an A1 aid pitch, then 5.7+ dihedrals, with the top two pitches "mostly 4th class" —
  with no hand crack mentioned and a direct grade conflict on the finish. Not fixed because it
  spans multiple narrative fields (a rewrite, not a single fact-fix) and there's an unruled-out
  alternate explanation (a freed variation matching the route's overall 5.10b grade). Three FA
  exact dates and Pilgrimage to Mecca's rack composition (#3 single vs. doubled) also flagged,
  unconfirmed.
- **Anderson's Thumb** (`wa_andersons_thumb_standard`) — 2 confirmed errors, both minor. The
  Flypaper Pass waypoint's `elev` (6500) contradicted the route's own approach narrative ("toward
  Flypaper Pass (6,600 ft)...") and SummitPost's published 6,600 ft figure for the same
  notch — fixed. The `corrections` field's leftover placeholder text mislabeled the peak's region
  as "Washington North Cascades," at odds with every other geographic field on the row (it's
  central Olympics, under Olympic NP) — fixed the substring, left the rest of that stale
  QA-artifact text alone since later fields (`beta`, `itinerary.sourceNote`) already supersede it
  with a cited trip report (trailcatjim.com) this session independently corroborated. Mount
  Anderson summit elevation/coordinates, Anderson Pass, Honeymoon Meadows mileage, Echo Rock
  elevation, Eel Glacier's position, Anderson Glacier's ~2011 disappearance, and the Olympic NP
  wilderness-permit fee structure all confirmed. Flagged, not fixed: an internal
  washout-to-old-trailhead mileage inconsistency (5.5 mi vs. 8-9 mi, plausibly different
  measurement baselines) and a stale QA-artifact note on an otherwise-correct trailhead waypoint.
- **Argonaut Peak** (`wa_argonaut_peak` + 2 routes) — 5 confirmed errors, re-audited as part of
  pass 2. Southeast Ridge (id still reads `east_ridge` from an already-tracked prior rename):
  top-level `permit` claimed an Enchantment Permit Area lottery requirement, contradicting the
  row's own `access.*` fields — the identical bug batch 43 fixed on this peak's sibling South
  Face route (`wa_south_face_12`) never got applied here; fixed the same way. `gain_ft`/`loss_ft`
  didn't match the row's own itinerary day-by-day sums (`loss_ft` held the *gain* total by
  coincidence) — aligned to 4157/4457. Northeast Couloir: `commitment` held "III" against
  SummitPost's consistently documented "II 5.6" — fixed. `loss_ft` (843) was wildly inconsistent
  with the row's own (independently verified) `gain_ft` (5057) for a round trip back to the same
  Stuart Lake Trailhead — aligned to match. `access.notes` was a raw escaped-JSON blob instead of
  plain text (the same leaked-structure rendering bug seen elsewhere in this project), and its
  embedded permit-season date ("June 15-October 15") contradicted the row's own top-level
  `permit`/`access.permit` fields and the official USFS/Recreation.gov season (May 15-Oct 31) —
  rewritten to plain text with the date corrected. Flagged, not fixed: a summit-elevation duality
  (8457 vs. a WTA trip-report's 8453), an unconfirmed `alpine_grade: "AD"`, and NE Couloir's rope
  length spec (30m stored vs. two secondary sources' 50m).

7 confirmed errors fixed across 3 peaks (SQL: `audits/sql/2026-08-06-batch-53.sql`); 8 fields
flagged for human review; Amphitheater Mountain's 5 remaining routes and its area row audited
clean save for the one Left Side flag above.

## Batch 54 — 2026-08-06 (Pass 2, batch 3)

10 routes across 7 peaks, checked via 7 parallel research agents (one per peak): Austera Peak (3
routes), Bacon Peak, Bear Mountain (Chilliwack Range), Prusik Peak (Beckey-Davis), Big Kangaroo
(Beckey-Tate), Morning Star Peak (Beyond Redlining), and Big Four Mountain (2 routes). WebFetch
was 403-blocked for essentially every target domain across all seven agents this run (Wikipedia,
Peakbagger, listsofjohn.com, Mountain Project, StephAbegg.com, AAC Publications) — same
proxy-policy issue as recent batches; all findings lean on WebSearch snippet cross-referencing,
generally with multiple independent snippets per fact.

- **Austera Peak** (`wa_austera_peak` + 2 routes) — 2 confirmed errors, both on the Southwest
  Ridge route. Its `data_quality.gaps` claimed no public GPS track exists for the route while the
  same row's `gpx` field holds a populated 325-point track — removed the stale claim. Its
  `waypoints[0]` (Eldorado Creek Trailhead) held lat/lng 48.5136/-121.1964, contradicting both its
  own `approach_logistics.trailheadLat/Lng` and the sibling route's matching waypoint for the
  identical physical trailhead (both agree on 48.49261/-121.11761) — corrected. **Not fixed,
  worth a note:** the research agent also flagged both Austera routes' `dist_km` (4.5 for both)
  as inconsistent with their waypoints' full trailhead-to-summit mileage. Checked this by hand
  before writing SQL: `dist_km`/`gain_ft`/`loss_ft` on these two routes appear to be scoped to
  just the summit-day segment (high camp to summit), not the full backpack-in — e.g. `wa_austera_
  peak`'s camp-to-summit waypoint span is 2.8 mi one-way, which converts to 4.5 km almost exactly,
  matching the stored value. That said, both unrelated routes share byte-identical `gain_ft`/
  `loss_ft`/`dist_km` (1280/592/4.5), which is itself odd enough to flag for a human look rather
  than either fix or dismiss outright. Elevation/prominence, summit coordinates, the 1965 Firey/
  Meulemans/Hovey FA, and Chockstone Route's grade/pitch description all confirmed clean.
- **Bacon Peak** (`wa_bacon_peak_diobsud`) — 2 confirmed errors, both on the area row: `elevation_
  ft` (7067) and `prominence_ft` (2512) disagreed with Wikipedia/Wikidata/Peakbagger, which
  converge on 7,070/2,505 — fixed both. `elevation_ft` was also self-inconsistent with the route's
  own `high_point_ft` and summit waypoint (already 7070). Coordinates, FR-1107 closure note, and
  the Noisy-Diobsud Wilderness/parent-area placement all confirmed clean. Flagged, not fixed: a
  descent-glacier discrepancy between `rope_note` and `descent_text`, and an unresolved first
  ascent (null on file, sources hedge on 1905/Robertson-Logan).
- **Bear Mountain, Chilliwack Range** (`wa_bear_mountain_chilliwack_north_buttress`) — 1 confirmed
  error: `approach_logistics.trailheadLat/Lng` (48.9583/-121.6417) didn't match the real Hannegan
  Pass Trailhead — the row's own `waypoints[0]` entry for the same trailhead already had it right
  (48.9101/-121.5927, matching WTA/Trailforks) — fixed. Elevation, prominence, coordinates, and
  the 1967 Beckey/Fielding FA all confirmed. Flagged, not fixed (several structural issues, none
  with a clear single-field correction): `gain_ft`/`loss_ft` (5950/5950) doesn't match the
  itinerary's own day-by-day sums, and those sums don't even net to each other (7300 gain vs 6250
  loss for a round trip); `waypoints`/`gpx` aren't sorted by `distMi` (summit sorts second, ahead
  of the pass and camps); and `approach`/`itinerary.sourceNote` both claim the row's mileage
  "matches" 30.58 km when `dist_km` is actually 14.5 km, apparently conflating two different named
  approaches to the same peak.
- **Prusik Peak, Beckey-Davis** (`wa_beckey_davis`) — 3 confirmed errors. `access._raw.group_size_
  limits` said "Maximum party 12 people," contradicting the row's own `access.rules`/`group_limit`
  (8) and Recreation.gov's published Enchantment Permit Area cap — fixed to 8.
  `waypoints[0]` was labeled "Snow Lakes Trailhead" but its coordinates are actually Stuart Lake
  Trailhead's (match the row's own `approach_logistics` within survey tolerance; the real Snow
  Lakes Trailhead is a different location near Leavenworth) — relabeled. `length_m` (198, ~650 ft)
  contradicted the row's own `rope_note` ("700ft") and SummitPost/StephAbegg, both of which give
  700 ft — corrected to 213 m. Elevation, prominence, the 1962 Beckey/Davis FA, and the descent/
  rappel sequence all confirmed. Flagged, not fixed: `pitches` (7) vs. a 6-entry `pitch_detail`
  array (sources themselves split 6 vs. 7, so no clear correction), and `waypoints[3]` sharing
  identical coordinates with the summit waypoint despite being a different named point.
- **Big Kangaroo, Beckey-Tate** (`wa_beckey_tate`) — 1 confirmed error: `itinerary.days[0].gainFt`/
  `lossFt` and `itinerary.totalNote` both said 2,800 ft, contradicting the row's own top-level
  `gain_ft`/`loss_ft` (3166) — independently verified from the row's own approach text (5,160 ft
  trailhead to 8,326 ft summit = 3,166 ft) — fixed the itinerary to match. Elevation, prominence,
  coordinates, and the 1942 Beckey/Beckey/Varney FA all confirmed. Flagged, not fixed: the route's
  grade (5.9+ vs. older sources' III 5.8/5.9) and aspect (S vs. a primary photo source's "southeast
  -facing") both have genuinely conflicting sourcing, already partly self-flagged on file.
- **Morning Star Peak, Beyond Redlining** (`wa_beyond_redlining`) — 2 confirmed errors. `overview`
  said the route was established "in July 2020," contradicting the row's own `fa` field ("May
  2020") and AAC Publications (May 29, 2020) — fixed. Area `prominence_ft` (1000) disagreed with
  Wikipedia and peak-database sources, which give 980 — fixed. Grade, pitch count, FA party, and
  approach description all confirmed. Flagged, not fixed: an `access.permit` field claiming a
  wilderness permit is required, contradicting the row's own top-level `permit` field and this
  area's actual (non-wilderness) land status — plausible cross-contamination from a different
  trailhead record, not conclusively ruled out.
- **Big Four Mountain** (`wa_big_four_mountain` + 2 routes) — 2 confirmed errors. Area `prominence
  _ft` (1150) disagreed with Wikipedia/listsofjohn.com/peakery.com, which converge on 1,080 —
  fixed. Spindrift Couloir's `max_angle` (90) contradicted the row's own `beta` text ("roughly
  95-degree angles") and the AAC/AAJ first-ascent report ("IV+ 5.9 95°") — fixed to 95. FA party/
  date for both routes, route lengths, and the well-documented 1998/2010/2015 ice-cave-collapse
  fatalities all confirmed. Flagged, not fixed: both routes' shared trailhead waypoint elevation
  (1640 ft) is likely low — sources cluster 1,700-1,750 ft and the row's own `gain_ft` math
  implies ~1,720 — but no single authoritative source pins an exact figure, so left for a human
  call rather than guessed.

13 confirmed errors fixed across 7 peaks (SQL: `audits/sql/2026-08-06-batch-54.sql`); 12 fields
flagged for human review; Austera Peak's original route and Chockstone Route audited clean save
for the dist_km note above.

## Batch 55 — 2026-08-06 (Pass 2, batch 4)

10 routes across 6 peaks, checked via 6 parallel research agents (one per peak): Big Kangaroo
(West Face), Big Snow Mountain (2 routes), Black Peak (2 routes), Bonanza Peak (3 routes), Booker
Mountain, and Boston Peak. WebSearch snippet cross-referencing again did most of the work; some
agents also got clean WebFetch hits this run (The Mountaineers' official route pages, NPS fee
pages, WSDOT closure pages).

- **Big Kangaroo, West Face** (`wa_big_kangaroo_west_face`) — 2 confirmed errors, both internal
  self-contradictions. `partner_requirements.approachTime` claimed an 11.5-hr car-to-car day,
  contradicting `timing.totalHrs` (7), `turnaround`, and `itinerary.totalNote` on the same row
  (all three independently agree ~6-8 hrs) — corrected to 6-8 hrs. `waypoints[0]` ("Hairpin Turn
  Pullout") held lat/lng 48.5269/-120.6506 with a note claiming "~0.9 mi **west** of Washington
  Pass," contradicting the route's own `approach` text ("east," milepost 163),
  `approach_logistics.trailheadLat/Lng`, and the CalTopo-sourced GPX track's first point (all
  three agree on 48.5145/-120.6433, east side) — corrected. Elevation (8,326 ft), prominence
  (1,077 ft), the 1942 Beckey/Beckey/Varney FA, grade (II 5.6), land manager, and the
  single-rusty-bolt descent all confirmed clean. Flagged, not fixed: elevation may need revisiting
  per a newer Gilbertson lidar figure (8,318 ft) cited by two sources WebFetch couldn't reach;
  `length_m` (61m/200ft) vs. `pitch_detail`'s ~150m sum, already self-flagged on file as an
  MP-vs-trip-report source split; `beta`'s "up to 4 pitches" vs. `pitches`=3, same cause; and the
  area blurb's Beckey-Tate south-face grade (sources split III 5.8 vs. 5.9).
- **Big Snow Mountain** (`wa_big_snow_mountain` + 2 routes) — 1 confirmed error: area
  `prominence_ft` (1402) disagreed with Wikipedia/SummitPost/Peakbagger-indexed sources, which
  converge on 1,360 ft — the area's own blurb text (3.75 mi isolation to Overcoat Peak) matches
  the corrected figure. Elevation (6,680 ft), coordinates (exact match to listsofjohn.com), both
  routes' gain figures (verified against The Mountaineers/willhiteweb.com), and the FSR 56 washout
  closure note all confirmed clean. Flagged, not fixed: `parent_peak` is null though sources agree
  it's Overcoat Peak (no DB id to write with confidence); stale/self-contradictory `corrections`
  free-text on both routes that no longer matches their own (correct) stored gain/distance values.
- **Black Peak** (`wa_black_peak` + 2 routes) — 1 confirmed error: Northeast Ridge's
  `approach_logistics.trailhead/trailheadLat/trailheadLng` pointed to the Lake Ann Trailhead on
  **SR-542** near Mt. Baker/Artist Point — a different trailhead ~49 miles away — instead of the
  Rainy Pass/Lake Ann-Maple Pass trailhead on SR-20 that the row's own `trailheadDirection` note,
  its `waypoints[0]`, and WTA/The Mountaineers all describe — corrected. Coordinates, prominence
  (3,450 ft), the 1973 Jackson/Kennedy FA, grade (III), and approach/summit timing all confirmed
  clean via The Mountaineers' official route page. Flagged, not fixed: `elevation_ft` (8970 per
  SummitPost/DB vs. 8975 per Wikipedia-derived figures, a 5-ft datum-level split); `pitches`=3 vs.
  a 5-entry `pitch_detail`; and the area's `region: "Washington Pass"` label, which may be an
  intentional broader-corridor grouping rather than an error.
- **Bonanza Peak** (`wa_bonanza_peak` + 3 routes) — 3 confirmed errors. The area blurb and Mary
  Green Glacier route's `fa`/`overview` misspelled first-ascensionist "Curtis Ijames" as "Curtis
  James" and wrongly credited the 1937 FA to the Mary Green Glacier route; sources (Wikipedia's
  Company Glacier page, corroborating search results) agree the 1937 party actually summited via
  the **Company Glacier** on the north side — fixed the name and route attribution across all
  three fields. North Ridge's `overview`/`beta` were contaminated with unrelated-peak content
  ("highest point in the Wenatchee Mountains," a Middle Fork Snoqualmie trailhead) contradicting
  the row's own accurate Holden-Village waypoints and Bonanza's real Chiwawa/Entiat placement —
  replaced with text consistent with the route's own verified fields. Prominence (3,711 ft),
  coordinates, Northeast Buttress's FA/timing (AAC Publications), the 1975 Soviet Route mention,
  and the Holden Village flood-closure details (repeated across all three routes) all confirmed
  clean. Flagged, not fixed: `high_point_ft` (9511) vs. area `elevation_ft` (9516), both genuinely
  sourced; North Ridge's `grade: "Class 2"`, which looks like a mislabeled duplicate of Mary Green
  Glacier rather than a real independent line (an editorial merge call, not a text fix); Mary
  Green Glacier's "Moat crossing" waypoint, already self-flagged in `data_quality.gaps` as
  corrupted; and Northeast Buttress's `ice_grade: "AI2"`, unsupported by any source describing
  this as a rock-only line.
- **Booker Mountain** (`wa_booker_mountain_northeast_face`) — 2 confirmed errors, both apparent
  boilerplate bleed from Cascade River Road/Boston Basin trailhead records. `road.status` claimed
  SR 20 is "generally open year-round," but it closes every winter for avalanche danger and the
  closure gate has historically retreated to Colonial Creek Campground — this route's own
  trailhead (WSDOT, KOMO, Cascadia Daily, King5) — corrected. `access.seasonal` blamed washout
  risk on "Cascade River Road," which serves the unrelated Marblemount→Boston Basin corridor and
  has no connection to this route's Colonial Creek/Thunder Creek trailhead on SR 20 (NPS, WTA) —
  corrected to point at the real SR 20 seasonal-closure risk instead. Elevation (8,284 ft),
  coordinates, the 1904 USGS naming history, the 1964 Davis/Holland FA, the route's beta narrative
  against the 1965 AAJ account, and the 2026 backcountry-permit lottery window all confirmed
  clean. Flagged, not fixed: `access.rules`' Boston Basin-specific camping detail (also apparent
  bleed-over, but no verified replacement found for Booker's actual camping rules); `prominence_ft`
  (992) unverifiable (Peakbagger/Wikidata blocked); and a null `elevation` column sitting alongside
  a populated `elevation_ft`, likely a legacy/duplicate column worth a schema check.
- **Boston Peak** (`wa_boston_peak_southeast_face`) — no confirmed errors. Elevation (8,894 ft),
  prominence (854 ft), coordinates (exact match to Wikipedia), the 1938
  Bressler/Clough/Cox/Myers FA, the NPS Boston Basin permit fee structure, the bear-canister
  requirement, and the standard SE-face route description (verified against Mountaineers.org's own
  program page) all confirmed clean. Flagged, not fixed: `elevation_ft` (listsofjohn.com says
  8,888 ft vs. 8,894 ft everywhere else — majority favors the stored value); a genuine trailhead
  mileage split between guidebook sources (21.7 mi per Beckey vs. 22.5 mi elsewhere) already
  reflected as two different numbers in the row's own fields; a `waypoints` distance duplication
  bug (two different points both carry `distMi: 4.2`) with no sourced correct value for either
  leg; and a `descent_text`/`itinerary`/`bail` conflict describing two different physical
  descents, which can't be resolved from available sources.

9 confirmed errors fixed across 6 peaks (SQL: `audits/sql/2026-08-06-batch-55.sql`); 24 fields
flagged for human review; Boston Peak's Southeast Face audited clean of confirmed errors (several
flags, no fixes).

## Batch 56 — 2026-08-06 (Pass 2, batch 5)

10 routes across 9 peaks, checked via 9 parallel research agents (one per peak, Buckner
Mountain's two routes covered together).

- **Prusik Peak** (`wa_boving_christensen`) — `fa` gave no year ("year not given by available
  sources"), but the route's own `overview` field already stated "put up by Paul Boving and Matt
  Christensen in 1977" — the `fa` field just never picked it up. Confirmed via a StephAbegg trip
  report and a CascadeClimbers.com forum thread both independently corroborating 1977. Fixed.
  Grade/pitch count/length (5.10, 4p, 450') match StephAbegg's title exactly; area elevation,
  prominence, coordinates, and Enchantment permit fees all confirmed. Individual pitch grades and
  the gear list (already self-flagged `gear_confidence: "inferred"`) couldn't be independently
  confirmed — topo pages 403'd — left as-is.
- **South Early Winters Spire** (`wa_boving_roofs`) — the Blue Lake Trailhead waypoint's
  elevation (5,200 ft) contradicted this same route's own `approach_logistics.trailheadDirection`
  text, which already correctly said 5,400 ft; WTA and The Mountaineers both list the trailhead at
  5,400 ft. Fixed. FA (Adam/Bedayn/Davis, 1937), area elevation/prominence/coordinates, grade
  (5.10b), and USFS/Methow Valley RD land-manager text all confirmed. `aspect`/`face` giving
  different compass directions for the same pitch, a seasonal-gate-date discrepancy between two
  of the route's own fields, and a minor `length_m` vs. `pitch_detail`-sum mismatch are flagged,
  not fixed — no single authoritative source pins any of them down.
- **Buckner Mountain** (`wa_buckner_mountain_north_face`, `wa_buckner_mountain_southwest_face`) —
  the Southwest Face route's `access.notes` gave the 2026 NPS early-access lottery window as
  "Mar 2–13," off by one day; WTA, Campflare, and iHeartPNW (all citing the NPS release) agree the
  actual window is March 3–14. Fixed. Elevation (9,114/9,112 ft), prominence, FA (Lewis Ryan,
  1901), coordinates, permit fee structure, and the North Face's Grade II/1,300 ft/8-13 pitch
  description (verbatim match to Mountaineers.org) all confirmed on both routes. Two flags, not
  fixed: `group_limit: 6` on both routes may actually be 12 if Boston Basin is an NPS Type-1
  cross-country zone rather than Type-2 (nps.gov 403'd, couldn't confirm directly — needs a human
  with direct NPS access); and the North Face's `dist_km` (29.93) reads as a one-way figure for
  what its own text describes as a point-to-point Boston Basin→Cascade Pass traverse, which the
  app's `distKm * 2` round-trip rendering convention (CLAUDE.md) isn't built to represent — a
  product/data-model question, not a fact error.
- **Burgundy Spire** (`wa_burgundy_spire` area row) — `blurb` called Burgundy Spire "the highest
  and most technically involved of the four Wine Spires." Mountaineers.org's Wine Spires page and
  SummitPost's Chianti Spire page both corroborate that Pernod Spire is actually the tallest of
  the four, with Burgundy and Chianti roughly equal in elevation just below it. Fixed the blurb's
  claim; also reconfirmed the pass-1 Silver Star Creek approach-contamination fix on the North
  Face route still holds. FA (Beckey party, 1953), grade (5.8, III), length (800'), and land
  manager all confirmed. `elevation_ft` (8,483) matches neither the ~8,400 ft climbing-literature
  figure (which the route's own `high_point_ft` already uses) nor listsofjohn.com's 8,492 ft —
  flagged, not fixed, since neither source lines up with the stored value cleanly enough to
  identify the intended convention.
- **Burnt Boot Peak** (`wa_burnt_boot_peak_north_ridge`) — audited clean. Elevation (6,540 ft),
  prominence, coordinates, FA (Williamson/Bucher/Oas, AAJ 1972), Mount Baker-Snoqualmie NF/Alpine
  Lakes Wilderness permit terms, and emergency contacts all confirmed against Wikipedia,
  ListsOfJohn, Peakbagger, and AAC Publications. The NWAC avalanche-zone label is plausible but
  unconfirmed (zone-boundary map inaccessible) — flagged only.
- **Cardinal Peak** (`wa_cardinal_peak` area row) — `region` said "Entiat Mountains," but Cardinal
  Peak is the highest point of the distinct Chelan Mountains subrange (the two ranges only merge
  further north); AAC Publications titles its report "Cardinal Peak, Chelan Range" and Wikipedia
  agrees. Fixed. Prominence (2,070 ft), the North Fork Entiat trailhead waypoint, and the
  Saska-Basin approach narrative all confirmed. The area's `blurb` carries the same underlying
  mischaracterization (describes Chelan Mountains as a "subpart" of Entiat Mountains) — left
  flagged for an editorial rewrite rather than patched here. A 1-ft elevation datum split (8,596
  vs. 8,595) and a possible USFS district rename ("Entiat" → "Entiat-Chelan Ranger District") are
  also flagged, not fixed — sourcing too thin/transitional to commit to either.
- **Cascade Peak** (`wa_cascade_peak` area row) — `blurb` had the compass relationship to
  Johannesburg Mountain backwards, saying Cascade Peak "sits just 0.53 mi west-southwest of...
  Johannesburg Mountain," when Wikipedia states Johannesburg (the nearest higher peak) lies 0.53
  mi WSW *of Cascade Peak* — i.e. the reverse. Fixed. Confirmed the pass-1 batch-4 geographic-
  conflation fix still holds: this route's own coordinates/waypoints/GPX now cluster tightly
  around Cascade Peak, not Johannesburg. However the deeper route-identity question flagged in
  pass 1 is still open and, per the row's own `data_quality.gaps` note, arguably got worse: the
  2026-07-28 fix's `corrections` field claims Beckey's "East Ridge" and "NW Chimney" are one
  route, citing a CascadeClimbers trip report that is actually titled as a two-summit
  Johannesburg+Cascade linkup — while Mountaineers.org documents Johannesburg's own separate,
  real "East Ridge" (FA 1938) starting from the same col, and this row's own `bail`/`descent_text`
  fields already warn against that route as a distinct, worse alternative. Left flagged for a
  human rename/split decision (likely: rename this row to "NW Chimney" only, create a separate
  Johannesburg East Ridge entry) rather than patched — same conflation family as prior batches'
  Big Kangaroo/Colonial Peak/Corteo Peak/Goat Mountain flags.
- **The Castle, Tatoosh Range** (`wa_castle_peak_tatoosh_southeast_face`, area
  `wa_castle_peak_tatoosh`) — the most contaminated row this batch, four confirmed errors plus one
  on the area row: (1) area `prominence_ft` (239) corrected to 200 ft (Wikipedia/Peakbagger); (2)
  the route's own summit waypoint `elevFt` (6,640) contradicted this same record's `area.
  elevation_ft`/`high_point_ft` (6,440, which matches Wikipedia) — fixed to 6,440; (3) `access.
  _raw` was leftover contamination from an unrelated North Cascades peak record (8,343 ft, "USFS
  Okanogan-Wenatchee NF – north Cascades Ranger District," Pasayten-style access routes — none of
  which exist near the Tatoosh Range), directly contradicting this record's own correct NPS/Mount
  Rainier land-manager text — dropped the field; (4) `road.name` said "Eagle Peak Trailhead,
  Longmire," a real but unrelated Longmire-area trailhead — fixed to the Pinnacle Peak Trailhead/
  Reflection Lakes access this record's own driveNote/approach text already describes; (5)
  `approach_logistics` named "Snow Lake Trailhead"/"Unicorn Creek Basin," confirmed (WTA/
  SummitPost/Willhite) as neighboring Unicorn Peak's approach, not Castle/Pinnacle's — rewritten
  to the Pinnacle Peak Trailhead approach using this record's own already-correct waypoint
  coordinates for that trailhead. FA remains undocumented in every source checked (Mountain
  Project 403'd) — flagged, not guessed. The land-manager distinction (NPS/Mount Rainier NP, not
  the adjacent GPNF Tatoosh Wilderness) was independently reconfirmed as already-correct.
- **Cathedral Peak, Pasayten** (`wa_cathedral_peak_pasayten_se_buttress`) — audited clean, no
  confirmed errors (also re-verifies the pass-1 batch-5 check). Elevation (8,606 ft), prominence,
  summit coordinates, FA (Carl W. and George O. Smith, 1901), and the route's III 5.10a grade/10
  pitches/~1,000 ft (corroborated by a Spokane Alpine Club trip report and a StephAbegg TR) all
  confirmed — correctly distinguished throughout from the unrelated Enchantments-area Cathedral
  Peak. A road-mileage figure that's ambiguous even across USFS/WTA/PNT sourcing, an internal
  gain_ft vs. itinerary-sum mismatch, and an unconfirmable FA-party detail (already self-hedged in
  the row) are flagged, not fixed.

11 confirmed errors fixed across 7 peaks (SQL: `audits/sql/2026-08-06-batch-56.sql`); Burnt Boot
Peak and Cathedral Peak Pasayten audited fully clean. Notable open item carried over from pass 1:
Cascade Peak's East Ridge route-identity conflict is still unresolved and, on this pass's reading,
still needs a human rename/split rather than a text patch.

## Batch 57 — 2026-08-06 (Pass 2, batch 6)

Routes: `wa_chair_bryant_traverse`, `wa_chair_peak_east_face`, `wa_chair_peak_north_face`,
`wa_chair_peak_northeast_buttress`, `wa_chair_peak_northwest_ridge` (Chair Peak),
`wa_chalangin_peak_little_giant_pass_luahna_col` (Chalangin Peak),
`wa_chelan_butte_chelan_butte_trail` (Chelan Butte), `wa_chianti_spire_east_face` (Chianti
Spire), `wa_chimney_rock_east_face_direct`, `wa_chimney_rock_west_face` (Chimney Rock).
Researched via 5 parallel agents, one per peak.

- **Chair Peak** — peak-level facts (elevation 6,238 ft, prominence 878 ft, 1913 FA)
  confirmed clean. `wa_chair_peak_east_face` audited fully clean (pitch-by-pitch beta and
  1933 FA both corroborated externally). Two fixes: `wa_chair_bryant_traverse` had
  grade/grade_num/pitches/fa populated with unverifiable values that directly contradicted
  its own `corrections` field, which explicitly says no dedicated source exists for this
  linkup and all those fields should be null — cleared to match the row's own documented
  methodology. `wa_chair_peak_north_face`'s top-level `grade` held "III" (a commitment
  grade, duplicating the separate `commitment` column) under `grade_system='yds'`, which
  needs a YDS value — corrected to 5.4, matching the row's own `grade_num`/`rock_grade`.
  Flagged, not fixed: North Face's and Northwest Ridge's FA fields may describe the same
  1975 first ascent misfiled under the wrong route (overlapping climber names, same year,
  but attributed to different aspects); Northeast Buttress's grade/grade_system mismatch
  (both 5.4 and 5.6 are self-supported by the row's own pitch_detail); a ~590m disagreement
  between the two routes' "Thumb Tack" landmark waypoints; North Face/NE Buttress `dist_km`
  showing the same round-trip-vs-one-way convention bug CLAUDE.md warns about (not
  bulk-normalized per that guidance); and a dangling "(see hierarchyNote)" reference in two
  routes' `corrections` text pointing at a field that doesn't exist in the schema.
- **Chalangin Peak** — elevation (8,371 ft), prominence, coordinates, USFS Little Giant
  Trailhead details, and gain/loss/distance all corroborated externally (Peakbagger,
  Wikipedia, USFS, WTA, a Jim Brisbine trip report matching mileage/gain almost exactly).
  Two fixes: top-level `permit` was null despite `access.permit` already documenting the
  free self-issue wilderness permit — `lib/db.js` reads only the top-level column, so the
  permit info wasn't rendering in the app at all; copied across. `season` said "Jul-Oct,"
  contradicted by the row's own `climate.summer` field and by WTA/Mountaineers.org, which
  say the Chiwawa River ford is only safely fordable August–October — corrected to
  "Aug-Oct." One minor flag: `length_m` (137, the summit scramble segment) is plausible but
  has no exact external source.
- **Chelan Butte** — confirmed this route's mountaineering tag is honestly represented as a
  non-technical hike (grade/pitches/rack all correctly null; hazards are heat/loose
  gravel/hang-glider traffic, not fabricated alpine hazards). Two related fixes: area
  `elevation_ft` and route `high_point_ft` were both stale at 3,812 ft despite the route's
  own summit waypoint (3,835 ft) and its own `corrections` field already stating Peakbagger/
  PeakVisor/WTA confirm 3,835 ft — the correction had been written down but never applied to
  the columns; now applied, matching external sources. `permit` also wrongly cited a
  Northwest Forest Pass (USFS); Chelan Butte Wildlife Area is WDFW state land, so a Discover
  Pass applies instead — this row's own `access.parking_pass` field already said so
  correctly, contradicting the top-level `permit` text. Flagged: a gain_ft/loss_ft figure
  (2,500 ft) with conflicting AllTrails corroboration (2,631–2,806 ft depending on GPS
  track), and whether "mountaineering" is the right discipline tag at all for a route whose
  own overview says "no technical climbing" — a taxonomy call, not a fact patch.
- **Chianti Spire** — FA (Nelson & Bebie, 1986), grade (III 5.10b), land manager, permit,
  and area hierarchy all read correct and internally consistent. Two related elevation
  fixes: area `elevation_ft` and route `high_point_ft` were both 8,459 ft, contradicting the
  route's own "Chianti Spire Summit" waypoint (8,420 ft) and external sources (ListsOfJohn,
  SummitPost); corrected to 8,420. Also fixed `length_m` (198 → 215), which didn't match the
  row's own pitch_detail lengths summed (45+25+35+25+35+45+5). Several flags: a
  gain_ft/loss_ft vs. itinerary-day-sum mismatch that interacts with the elevation fix and
  isn't cleanly resolvable without a firmer trailhead elevation; a beta-text-vs-pitch_detail
  disagreement over which pitch (P2 or P5) carries the 5.10b crux; a `dist_km` value that
  looks like round-trip miles rather than one-way (the same systemic ~61-row bug CLAUDE.md
  describes — flagged for the dedicated `audit:distances` tool, not patched here); a ~170m
  offset between the area's lat/lng and the route's own summit waypoint; and unverified
  prominence plus a stray editorial note baked into a waypoint's `note` field.
- **Chimney Rock** — re-verified the pass-1 batch-5 elevation correction on
  `wa_chimney_rock_west_face` (high_point_ft 7,440 ft for the South Summit, distinct from
  the 7,727 ft main summit) is still live and still correct against Wikipedia/PeakVisor. One
  fix on `wa_chimney_rock_east_face_direct`: `emergency.nearestHospital` named a nonexistent
  Cle Elum "hospital" — Kittitas Valley Healthcare's only ER is in Ellensburg (603 S
  Chestnut St); Cle Elum has urgent care only, non-emergency — exactly what the sibling West
  Face route already states correctly. Two fixes on `wa_chimney_rock_west_face`: `aspect`
  was stored as "E" though the route's name/overview/beta/descent all consistently describe
  the west face — corrected to "W"; and `itinerary.sourceNote` still cited the 7,727 ft
  main-summit elevation to justify its gain estimate, contradicting the row's own (correct)
  7,440 ft `high_point_ft` — rewritten to reference the right summit. Flagged: East Face
  Direct's 1954 FA party couldn't be corroborated against any accessible source; three of
  West Face's upper waypoints (moat crossing, notch, South Summit) sit ~2.6–2.9 km from the
  peak's own verified coordinates and outside where the embedded GPX track goes, with no
  authoritative south-peak-specific source found to fix them; and West Face's `dist_km`
  shows the same round-trip-vs-one-way fingerprint flagged on Chianti Spire above.

13 confirmed errors fixed across 5 peaks (SQL: `audits/sql/2026-08-06-batch-57.sql`);
`wa_chair_peak_east_face` audited fully clean. Two open items worth a dedicated follow-up:
the round-trip-vs-one-way `dist_km` pattern surfaced again on 3 more routes this batch
(Chair Peak x2, Chianti Spire, Chimney Rock West Face) beyond the ~61 rows already known —
worth running `audit:distances` broadly rather than patching one row at a time; and the
Chair Peak North Face/Northwest Ridge FA overlap looks like the same
first-ascent-misfiled-under-the-wrong-route pattern seen on other peaks in earlier batches.

## Batch 58 — 2026-08-06 (Pass 2, batch 7)

Routes: `wa_chiwawa_mountain_southwest` (Chiwawa Mountain), `wa_chockstone_route` (North
Early Winters Spire), `wa_clark_mountain_west_ridge` (Clark Mountain, Dakobed Range),
`wa_classic_route_2` (Unicorn Peak), `wa_classic_route_3` (Lane Peak),
`wa_colchuck_peak_colchuck_glacier`, `wa_colchuck_peak_east_ridge`,
`wa_colchuck_peak_holsten_hilden`, `wa_colchuck_peak_north_buttress_couloir`,
`wa_colchuck_peak_northeast_couloir` (Colchuck Peak). Researched via 6 parallel agents (one
per peak; Colchuck Peak's 5 routes audited together as a sibling-contamination check).

- **Chiwawa Mountain** — elevation, prominence, FA, land manager, permit/fee, and closure
  order all confirmed clean against USFS. One fix: `grade` said "Class 3-4 + glacier,"
  contradicted by the row's own `pro_needs`/`watch_out`/`seasonal_hazards.crevasses`, which
  all state the standard SW line has no glacier travel — corrected to "Class 3-4." Flagged,
  not fixed: `crowds`/`partner_requirements`/`seasonal_guidance`/`seasonal_hazards` describe
  a wholesale different, roped/glaciated Lyman-Glacier-style climb, directly contradicting
  the row's own overview/approach/pitch_detail/itinerary — needs a human rewrite, not a
  field patch; also an itinerary day-sum vs. top-level gain_ft mismatch and an
  `alpine_grade` Roman-numeral-vs-French-scale bug with no source for the correct letter.
- **North Early Winters Spire** — FA (Grande/Schoening/Widrig, 1950), grade, and land
  manager all confirmed clean. Two fixes: `waypoints[0]`/`gpx[0]` ("Blue Lake TH") carried
  the same stale, contaminated coordinate already found and fixed on sibling routes on this
  peak in an earlier pass — the correct trailhead was already sitting in this row's own
  `approach_logistics` fields, just never applied to waypoints/gpx; also tightened the
  summit waypoint to the row's own precise peak coordinate. `rack`/`detailed_rack` both said
  "0.5-3in," contradicted by the row's own `gear`/`corrections` fields, which already
  quote Mountain Project's "single rack to 2 inches" — propagated. Also fixed a
  `watch_out` stored as a newline-joined string instead of a JSON array. Flagged: a
  pitches-vs-pitch_detail count mismatch and a col waypoint sharing coordinates with the
  summit marker despite a real elevation difference.
- **Clark Mountain (Dakobed Range)** — confirmed this is the correct Clark Mountain (not
  the Pasayten one); elevation, prominence, land manager, and permit info all check out.
  Two fixes: top-level `lat`/`lng` were null despite the identical coordinate already
  present three other places on the same row — backfilled. `itinerary.days[0]`/`[2].miles`
  undercounted the row's own waypoints (Boulder Basin camp sits at 9 mi, not 7.5), and
  `totalNote` separately overcounted both mileage (26 vs. ~23) and elevation (7,300 vs.
  ~6,500 ft, the last already matching top-level `gain_ft` and external
  Mountaineers.org/Wenatchee Outdoors sourcing) — both reconciled. Flagged: a waypoint
  ("Boulder Creek Trail #1562 junction") sitting ~0.85 mi off the row's own GPX track with
  only an approximate replacement coordinate found, left unpatched; and the route's own
  name/face ("West Ridge") vs. every source documenting this line only as "Walrus Glacier."
- **Unicorn Peak** — re-verified the earlier-pass elevation fix (6,971 ft) is still live and
  correct. Safety-relevant find: `rappels`, `pitch_detail[0].notes`, and `watch_out[0]` all
  still pointed climbers at the deprecated "bleached snag" rappel anchor, contradicting the
  row's own `descent_text`, which already correctly documents that anchor is no longer
  sound and the current, trip-report-corroborated anchor is a rock horn — propagated that
  correction to all three lagging fields. Also fixed `detailed_rack` ("no cams needed,"
  contradicting the row's own gear/rack/sling_rack/pro_needs, which all list cams) and
  `length_m` (122, wildly inconsistent with the row's own single 15 m pitch). Flagged: a
  gain_ft/loss_ft vs. itinerary-day-sum mismatch where both sides are independently sourced
  but disagree — a human editorial call, not patched.
- **Lane Peak** — fees, entrance-fee inapplicability, elevation, and internal length math
  all confirmed clean against current NPS figures. One fix: `approach` text said round trip
  is "a bit over 3 miles," contradicted by three internally-consistent fields (`dist_km`,
  `itinerary.days[0].miles`, `itinerary.totalNote`, all ~4 mi) and independently
  corroborated (willhiteweb.com: 2 mi one-way) — corrected. Flagged: a possible
  net-vs-cumulative gain_ft convention question and a mismatched approach_logistics
  trailhead vs. the row's own waypoints/gpx.
- **Colchuck Peak** (5 routes) — `wa_colchuck_peak_colchuck_glacier` audited fully clean.
  Explicitly checked all 5 routes for the Enchantments-overnight-lottery-required-for-a-
  day-trip bug seen elsewhere in this DB — not present here. `wa_colchuck_peak_east_ridge`'s
  gain_ft/loss_ft (2,800/2,800) didn't reconcile with the row's own waypoints or with
  sibling Colchuck Glacier's identical trailhead-to-summit profile (5,300/5,300) —
  corrected. `wa_colchuck_peak_northeast_couloir`'s `watch_out` was a newline-joined string
  instead of a JSON array (8 hazard sentences) — converted. Flagged rather than fixed:
  East Ridge's own `corrections` field wants a name change to "Colchuck Glacier"/"East
  Route," but both names exactly match sibling `wa_colchuck_peak_colchuck_glacier` and East
  Ridge's own `beta` field describes a materially different ridge scramble than its
  approach/pitch_detail — likely the same possible-duplicate-route pattern as Dragontail
  r4/triple_couloirs and Cutthroat r1/south_buttress, a human merge/rename call, not a name
  patch. Holsten-Hilden's `alpine_grade` holds a Roman-numeral commitment grade instead of
  the schema's French adjectival scale (no source for the correct letter) plus a stale
  `corrections` narrative and missing `loss_ft`/`pitches`. North Buttress Couloir's
  top-level `grade` is null; a fix composing one from the row's own alpine_grade/rock_grade/
  ice_grade was considered but rejected since rock_grade/ice_grade are explicitly qualified
  as belonging to a harder variation, not the main line — left null rather than misstate
  the base route, plus a commitment-grade source conflict (II vs. III) and an elevated
  gain_ft/loss_ft with no confirming source. Northeast Couloir's "Colchuck Lake" waypoint
  sits ~600 m from where every sibling's identical waypoint clusters, left unpatched.

12 confirmed errors fixed across 6 peaks/10 routes (SQL:
`audits/sql/2026-08-06-batch-58.sql`); `wa_colchuck_peak_colchuck_glacier` audited fully
clean. Tooling note: `check:sql`'s statement splitter naively strips text after a bare `--`
and splits on every literal `;`, including ones inside quoted string values — this silently
broke several multi-clause UPDATE statements' auto-detectability until dashes/semicolons in
newly-authored SET-clause text were rewritten to avoid them. A few WHERE-clause old-value
matches that must reproduce semicolon-containing live prose verbatim (Unicorn Peak,
Colchuck Peak) remain outside the tool's auto-check; those were independently re-verified
against a fresh live fetch immediately before writing rather than left unchecked.

## Batch 59 — 2026-08-06 (Pass 2, batch 8)

Routes: `wa_colfax_peak_cosley_houston`, `wa_colfax_peak_kimchi_suicide_volcano`,
`wa_colfax_peak_polish_route` (Colfax Peak, 3 routes), `wa_colonial_peak_west_ridge`
(Colonial Peak), `wa_complete_south_buttress` (Cutthroat Peak), `wa_concord_tower_north_face`
(Concord Tower), `wa_copper_peak_south_route` (Copper Peak), `wa_corteo_peak_southwest_ridge`
(Corteo Peak), `wa_crater_mountain_standard_route` (Crater Mountain),
`wa_crooked_thumb_peak_east_face` (Crooked Thumb Peak). Researched via 8 parallel agents, one
per peak.

- **Colfax Peak** (3 routes) — elevation, coordinates, FA (Cosley/Houston 1982; Haley/Hart
  2015 on Kimchi; Rogoz 2000 on Polish), and land manager all confirmed clean. One fix:
  Cosley-Houston Couloir's `length_m` (305, ~1000ft) was a copy/paste duplicate of sibling
  Polish Route's value — AAJ ("ca. 700ft"), the route's own `pitch_detail` sum (200m), and a
  trip report ("600 feet") all cluster around 213m instead — corrected. Flagged, not fixed:
  area `prominence_ft` (473 vs ~400ft externally) was already disclosed as unresolved in the
  row's own `data_quality` field, still unresolved; both Cosley-Houston and Polish Route have
  a `seasonal_guidance.optimalWindow` ("April–June") that contradicts their own broader
  `season`/`best_season` fields; Kimchi's `season` ("Apr") looks like its FA month leaked in
  rather than reflecting its real Dec–May condition window described in its own `best_season`
  text.
- **Colonial Peak** — elevation, FA (Degenhardt/Strandberg 1931), coordinates, route
  name/grade, and NPS permit fee structure all confirmed clean. No SQL. Flagged: `approach`
  text says a Northwest Forest Pass is needed to park, contradicting the row's own
  `access.passRequired: "None"` (plausibly correct, since the trailhead sits inside NPS/Ross
  Lake NRA, but not confirmed via a direct nps.gov read this pass — blocked); a `corrections`
  field references a stale routeId (`wa_colonial_peak_northeast`) that no longer matches this
  row's actual id, left over from an earlier rename pass.
- **Cutthroat Peak** (Complete South Buttress) — confirmed the area's `elevation_ft` had
  drifted back to the stale 8,065 ft figure a prior pass (batch 7) already corrected to
  8,066 ft across the peak's routes (Wikipedia/Peakbagger both agree on 8,066 ft). Fixed the
  area row, its free-text `blurb` (same stale figure embedded in prose), and
  `wa_north_ridge_3` — a sibling route outside this batch's picked list but carrying the same
  stale 8,065 ft `high_point_ft`, found while checking siblings for the same root cause. FA
  ("unknown"), grade (5.8/Grade III), land manager, and season on the route itself all
  checked out clean. Flagged: the route's own `itinerary` schedule text says "~16 pitches"
  while `pitches` says 22 (standard-route pitch count leaking into this Complete-variant's
  prose); pitch count/length couldn't be independently re-confirmed this pass since WebFetch
  403'd on every domain attempted.
- **Concord Tower** (North Face) — audited fully clean. Verified the top-level `grade`
  ("5.6") vs `rock_grade`/crux-pitch grade ("5.7") is not an error: Mountaineers.org and
  Mountain Project both independently publish the route's overall grade as 5.6 despite the
  5.7 crux pitch, a normal older-Beckey-route convention, and the row's own
  `itinerary.sourceNote` already cites that source. The elevation dispute flagged in a prior
  pass (7,569 on file vs 7,611 waypoint/area vs ~7,560 some external sources) remains
  unresolved — no new source found to settle it.
- **Copper Peak** (South Route) — elevation, prominence, coordinates, FA (Bennet/
  Courtwright/Hagman 1937), and land manager all confirmed clean — explicitly checked for
  the recurring fabricated "Chiwawa/Entiat Ranger District" error from earlier batches and
  confirmed this row does NOT have it (correctly reads Chelan Ranger District). Also
  corroborated the Dec 2025 Holden Village flood/landslide closure details against current
  news coverage. No SQL. Flagged: a leftover `corrections` note treats this route as the
  Olympics' (non-technical) Copper Mountain, contradicting the rest of the row which is
  clearly the glaciated North Cascades Copper Peak — stale artifact needing a human
  strip/rewrite.
- **Corteo Peak** (Southwest Ridge) — elevation, coordinates, FA, and grade text confirmed
  clean. Two fixes: area `prominence_ft` was a 1-ft outlier (651 vs Wikipedia/Peakbagger's
  652); `loss_ft` was null on an out-and-back route with a populated, waypoint-consistent
  `gain_ft` (3,245 ft) — filled with the same figure. Rejected a third proposed fix: an agent
  argued `grade_num=2` should be 3.5 for "Class 3-4" under a claimed DB "midpoint" convention,
  but spot-checking 15 other live "Class 3-4" routes shows no such convention (a roughly even
  mix of grade_num 3 and 4, one other outlier at 2) — left flagged rather than applying an
  unsupported number. Also flagged: the route's own `approach` text and one `itinerary`
  objective line describe the peak's separate East Face route (via Horsefly Pass) rather than
  this Southwest Ridge line, contradicting this same row's own `beta`/`descent_text`/
  `waypoints`/`gpx` — the earlier id/name rename (from `wa_corteo_peak_southeast_face`) fixed
  the label but left contaminated prose behind; needs a human rewrite, not a field patch.
- **Crater Mountain** (Standard Route) — elevation, coordinates, and rock_grade confirmed
  clean. One fix: the route's top-level `permit` field wrongly framed the entire route under
  NPS/North Cascades NP complex backcountry-permit rules, contradicting this same row's own
  `access.permit`/`emergency.notes` fields (and USFS's Jackita Ridge Trail #738 page), which
  correctly place the whole standard route in the Pasayten Wilderness (Okanogan-Wenatchee NF,
  free self-issue permit) — rewrote to match. Flagged: area `prominence_ft` (1,971 ft) vs
  Wikipedia/Peakbagger's 1,928 ft — may reflect a newer LiDAR P600 resurvey (1,971 ft clears
  the ~1,969 ft/600m P600 threshold cited as the reason this peak was recently added to that
  list; 1,928 ft doesn't), but peakbagger.com itself was unreachable this pass to confirm
  directly; `fa` is null with no source found naming a first-ascent party; `length_m: 107` on
  an explicitly unroped scramble route looks like a leftover placeholder with no authoritative
  replacement value found.
- **Crooked Thumb Peak** (East Face) — confirmed the FA (Jackson/Jensen/Marts/Schmechel,
  July 31 1963) via the original 1964 AAJ writeup, and the area's elevation/prominence
  against Peakbagger/Wikipedia/PeakVisor — all clean. Correctly left `high_point_ft` null
  rather than filling it from the area's `elevation_ft`: the 1963 AAJ account doesn't state
  whether the party topped the true summit fin, and a modern trip report describes that true
  summit as requiring separate 5.8+/A1 climbing beyond the class 3-4 terrain this route
  describes — a real Picket Range false-summit risk, not something to guess past. Flagged for
  a human with full AAJ archive or Beckey guide access.

7 confirmed errors fixed across 5 peaks (SQL: `audits/sql/2026-08-06-batch-59.sql`); Concord
Tower, Colonial Peak, and Crooked Thumb Peak audited fully clean. Notable this batch: two
prior-pass "corrected" facts were found to have drifted back to their wrong values (Cutthroat
Peak's area elevation, and — per batch 58's note — this is now the second time a
previously-fixed elevation has needed re-fixing) — worth watching whether some upstream
process is periodically re-seeding stale area-level data independently of route-level fixes.

## Batch 60 — 2026-08-06 (Pass 2, batch 9)

Routes: `wa_crooked_thumb_peak_south_route` (Crooked Thumb Peak), `wa_cutthroat_peak_cauthorn_wilson_couloir`,
`wa_cutthroat_peak_northeast_face`, `wa_cutthroat_peak_southeast_buttress`, `wa_cutthroat_south_buttress`,
`wa_cutthroat_west_ridge` (Cutthroat Peak, 5 routes), `wa_dark_peak_dark_glacier_route` (Dark Peak),
`wa_dark_side_of_liberty` (Liberty Bell Mountain), `wa_diamond_in_the_rough` (Sloan Peak),
`wa_direct_north_buttress` (Bear Mountain). Researched via 6 parallel agents, one per peak.

- **Cutthroat Peak's area `elevation_ft` drifted back to the stale 8,065 ft value for the
  second time TODAY** — batch 59, earlier this same pass, had just re-fixed it to 8,066 ft.
  Re-fixed again (area row, blurb, and a South Buttress waypoint/pitch_detail note still
  carrying 8,065 ft) but flagging this loudly: two same-day reversions on one field point at
  an upstream process re-seeding area-level data independently of route fixes, not a stale
  audit. Also fixed two rock_grade errors on Cutthroat siblings, both contradicted by their
  own overview/pitch_detail text and confirmed externally: Northeast Face 5.7→5.10 (AAC
  Publications' "The Swarm" writeup, III 5.10), Southeast Buttress 5.6→5.8
  (Mountaineers.org, "Grade III, 5.8"). Left unfixed and flagged: all 5 Cutthroat routes
  share an identical, self-evidently wrong `beta` field ("Grade II, 5.7... short approach
  from highway") that contradicts each route's own real grade, and an identical
  `approach`/`approach_logistics` block pointing at the Rainy Pass PCT trailhead — confirmed
  ~7 km from the real unofficial SR-20 pullout every guide source describes for this peak —
  both look like template contamination but need authored replacement text, not a
  find-replace; also flagged a ~1 mi trailhead-waypoint disagreement between routes and
  several gain_ft/loss_ft-vs-itinerary mismatches per route.
- **Crooked Thumb Peak** — `high_point_ft` had reverted to 8,129 ft, undoing pass 1's
  deliberate decision to leave it NULL (unconfirmed whether the route tops the true summit
  fin); reset to NULL, reinforced this pass by the route's own cited 2016 trip report, which
  says the party found "no feasible way to reach [the true summit thumb] directly." Also
  fixed a wrong Ross Lake NRA land-manager claim (this route's real Hannegan approach never
  touches the NRA per USFS Trail #674) and a 2026 lottery date off by a day (Mar 2–13 →
  Mar 3–14, per NPS). New flag: the row's own `face` text ("diagonal gully and chimney
  system to the first notch north of the summit") matches the *other* 1963 FA party
  (Ardussi/Magnusson/Mech/Swanson) per AAJ secondary sourcing, while `fa` credits a
  different party (Jackson/Jensen/Marts/Schmechel) who climbed a separate class 3-4 line
  that day — looks like the two 1963 routes' FA credits may be swapped across this peak's
  two DB rows; needs primary AAJ-text access to resolve, not guessed. Also flagged a 5-way
  round-trip-mileage disagreement (40 to 54 mi across different fields in the same row).
- **Dark Peak** — fixed area `prominence_ft` (273→264 ft) based on converging secondary
  sources (SummitPost/Bulger-List context); primary sources (Wikipedia, Peakbagger) were
  blocked at the network level this session, so this fix carries less certainty than usual
  — worth a follow-up primary-source check. The pass-1 3-way elevation conflict (8518
  area / 8507 route / 8504 waypoint) was narrowed but not resolved: 8518 has zero
  corroboration anywhere and is likely wrong, but the correct replacement is genuinely split
  between 8504 and 8507 across credible secondary sources — left unfixed per audit
  guardrails. Also flagged a `season` field ("Jun–Jul") that undercuts the route's own
  broader `best_season` text and external sourcing (May–October), and a ~10% dist_km gap
  against two sources that may just reflect a different approach variant.
- **Liberty Bell Mountain** (`wa_dark_side_of_liberty`, first audit of this route) — found
  the same "Blue Lake trailhead" contamination pattern seen on sibling Washington Pass peaks
  in earlier batches, but this time spread across more fields: `gpx`'s first coordinate
  matches Blue Lake TH almost exactly (~20m), and `dist_km`, `gain_ft`, `itinerary`, and
  `timing` all reflect that trailhead's longer profile — even though this route's own
  (correct) `approach` text describes a completely different, ~20-minute roadside approach
  from a hairpin-curve pullout east of the pass (confirmed via AAC Publications/Climbing.com
  FA accounts). Fixed the one field with a confirmable text correction
  (`partner_requirements.approachTime`, which literally named "Blue Lake trailhead"); left
  the GPS track, distance, and gain figures flagged rather than guessed, since no
  authoritative replacement values were found for the real approach — this needs a
  dedicated re-measurement/re-collection pass, not a field patch. Also flagged a
  10-vs-"10-11"-vs-"11" pitch-count inconsistency across fields.
- **Sloan Peak** (`wa_diamond_in_the_rough`) — re-verified the area's elevation/prominence
  fix from pass 1 batch 7 is still holding (7,835 ft, no drift). Fixed three contamination
  errors in the route's own `access` fields: two fields wrongly named "Glacier Peak
  Wilderness" instead of Sloan Peak's real Henry M. Jackson Wilderness (matching the same
  row's own `wilderness_zone`/`permitZone` fields), and a parking-pass note citing "Sunrise
  Mine TH for Vesper Peak" — an unrelated peak's trailhead — instead of this route's own
  Bedal Creek TH. Also removed a fabricated waypoint ("Route GPS pin, Mountain Project, SW
  Face") that exactly duplicated the summit coordinate while the row's own
  `data_quality.gaps` field already says no public GPS track exists for this route. Flagged
  rather than fixed: the waypoint/gpx array isn't ordered by approach progression (zigzags
  trailhead→summit→junction→summit), and a grade conflict (5.11− on file vs. 5.10/Grade III
  in the route's own cited 2011 FA trip report and every other source found, with
  mountainproject.com blocked from direct verification).
- **Bear Mountain** (`wa_direct_north_buttress`) — re-verified all of pass-1 batch-8's fixes
  (FA, pitch count, length, grade, season, NPS fee correction) are still intact, no
  reversion. One new fix: `ice_grade` "WI5+" contradicts this route's own summer-rock-only
  season and gear fields, and no source describes ice climbing on it — traced to likely
  contamination from an unrelated, identically-named "Direct North Buttress" route on
  Dragontail Peak, whose Mountain Project page lists a crux pitch graded exactly "WI5+ M4."
  Cleared to NULL. Left flagged: an unconfirmable "Gerber-Sink" face-name reference (same
  open item as pass 1), and a `road`/approach field describing a Depot Creek approach that a
  route-specific trip report (skisickness.com) explicitly calls a documented wrong turn —
  the correct approach per that source is the Chilliwack River Trail from the same
  trailhead.

16 confirmed errors fixed across all 6 peaks (SQL: `audits/sql/2026-08-06-batch-60.sql`); no
route in this batch came back fully clean — every peak had at least one open flag alongside
its fixes. This is the third same-day instance of a previously-fixed field reverting
(Cutthroat Peak's elevation, now twice today, plus Crooked Thumb Peak's `high_point_ft`
regressing from pass 1) — worth a dedicated look at whether some import/seed process is
periodically overwriting audited rows independently of this branch's fixes.

## 2026-08-06 — Pass 2, Batch 61

Five peaks, 10 routes, researched via 5 parallel agents (one per peak): Dorado Needle (Direct
Southwest Buttress, East Ridge/Inspiration Glacier), Pernod Spire (Direct West Face), South
Early Winters Spire (Dolphin Chimney), Dome Peak (Dome Glacier, Indian Summer), Dragontail
Peak (Backbone Ridge, East Ridge via Aasgard Pass, Hidden Couloir, Gerber-Sink).

- **South Early Winters Spire** (`wa_dolphin_chimney`) — Blue Lake Trailhead waypoint
  elevation (5,200 ft) contradicted this same row's own `approach_logistics` (5,400 ft) and
  external USFS/trip-report sourcing — fixed. Same Blue-Lake-trailhead contamination family
  seen on sibling Washington Pass peaks in earlier batches. Flagged rather than fixed: an
  unexplained ~200-400 ft gain/loss gap against the trailhead-to-summit delta, and possible
  conflation of two differently-named approach variations in the route's own approach text.
- **Dorado Needle** — `approach_logistics` on both routes stored the wrong Eldorado Creek
  trailhead coordinates (48.49261,-121.11761); the correct value (48.5136,-121.1964) was
  already sitting elsewhere on the same rows (fixed both). Also stripped a stray "Mount Tom
  area, North Cascades" clause from the East Ridge route's `access.notes` — same DB-wide
  copy-paste-boilerplate pattern first flagged in pass-1 batch 15 — and rewrote a stale
  waypoint note that still described a coordinate fix as pending when that coordinate had
  already been corrected in a prior pass. Flagged: Direct Southwest Buttress's very
  existence/FA as a distinct named variant from the standard Southwest Buttress route
  couldn't be corroborated by any source reached this pass (several key sites 403'd); the
  row's own `data_quality` already carries the same low-confidence flag.
- **Pernod Spire** (`wa_direct_west_face`) — `access.passRequired` said "None" while the same
  row's `access.parking_pass`/`_raw.parking_pass` both require a Northwest Forest Pass —
  internal self-contradiction, fixed. Confirmed Pernod Spire (not Burgundy) really is the
  tallest Wine Spire, the correct counterpart to batch 56's Burgundy Spire fix. Biggest open
  flag: the route's `beta`/`pro_tips` fields say the crux is pitch 3, but the structured
  `pitch_detail` array (internally self-consistent, lengths sum to the stored `length_m`)
  marks pitch 6 as the crux with the grade string that actually matches the route's overall
  grade — needs a primary topo/guidebook source to resolve, not guessable from what's on file.
- **Dome Peak** — WebFetch returned HTTP 403 on every URL attempted this pass (a session-wide
  outage, not a per-site block, confirmed via a failed control fetch), so no fixes were
  confident enough to apply from WebSearch snippets alone. Re-verified pass-1 batch-8's
  county and parking-pass fixes are still intact. Re-flagged the still-unresolved
  elevation/prominence split (8,920/area's own blurb 8,926 ft) with no new resolving source
  found. New flag: Dome Glacier's `dist_km` (16.1) looks copy-pasted from its sibling Indian
  Summer route rather than computed from its own ~17-mi one-way waypoints/itinerary — a case
  for `audit:distances`, not a guessed patch, per this column's known mixed-convention
  problem.
- **Dragontail Peak** — Backbone Ridge's waypoints/gpx listed "Aasgard Pass" twice at two
  different coordinates under the same elevation; the wrong one (~620m off Wikipedia's
  actual pass position) was corrected to match the already-right duplicate. Gerber-Sink's
  `descent` field was stale boilerplate about rappels, contradicting its own `rappels: "0"`
  and its well-sourced `descent_text` (walk-off via Aasgard Pass, no rappels documented) —
  rewritten to match. Also resolved an open question from batch 60: that batch attributed
  Bear Mountain's contaminated ice_grade to "an unrelated Direct North Buttress route on
  Dragontail Peak" — confirmed this pass that Direct North Buttress is indeed a real,
  separate Dragontail route (Mountain Project id 112066038), and that Gerber-Sink's own
  ice_grade (WI3+) is independently correct, not the contamination source. Flagged: Hidden
  Couloir's own fields (full ~10hr summit-push itinerary, gain_ft matching the whole
  mountain) look like they describe the full Triple Couloirs route rather than the short
  standalone entry gully its own overview/beta describe — possibly related to the
  already-flagged r4/triple_couloirs duplicate pair; and a templated "Colchuck Lake"
  waypoint tail duplicated (at slightly different coordinates) across multiple routes on
  this peak, needing a human dedup call rather than a guessed merge.

7 confirmed errors fixed across all 5 peaks (SQL: `audits/sql/2026-08-06-batch-61.sql`,
validated with `npm run check:sql` — all 7 checkable statements confirmed against live
target ids; the Gerber-Sink `descent` statement couldn't be auto-checked because the tool's
naive parser splits on the em dash in the replacement text, so it was verified manually
against a fresh live fetch instead). One route (`wa_dragontail_peak_east_ridge_aasgard_pass`)
audited fully clean. `check:sql` also warned the file (5.4KB) exceeds the SQL Editor's
~4KB safe-paste size — split it into chunks when applying by hand.

## 2026-08-07 — Pass 2, Batch 62

Eight peaks, 10 routes, researched via 4 parallel agents grouped by peak: Dragontail Peak
(Pandora's Box, Triple Couloirs, Serpentine Arête), Chimney Rock (East Face) + East McMillan
Spire (West Ridge/Southwest Face), Witches Tower (E/SE Face) + Middle Peak/Gunsight Range
(East Face), Snowking Mountain (East Ridge) + Silver Star Mountain-Okanogan (East Ridge) +
Inspiration Peak (East Ridge).

- **Dragontail Peak** — Triple Couloirs' (`wa_dragontail_peak_r4`) "Asgard"→"Aasgard"
  misspelling fix, logged as applied back in pass-1 batch 9, turned out to still be live on
  the row in all four affected fields (descent/descent_text/bail/turnaround) — the batch-9
  SQL for those quote-heavy text UPDATEs apparently never actually landed on the DB, even
  though that same batch's short `alpine_grade` fix on the same route did land. Re-applied
  here; worth a human double-checking whether other past batches' apostrophe/quote-heavy
  UPDATEs have the same silent-no-op problem. Also filled a NULL `high_point_ft` (8,840 ft,
  from sibling/area consensus). The long-flagged `wa_dragontail_peak_triple_couloirs`
  duplicate has since disappeared from the DB (route_count now matches actual rows) —
  resolved, though the surviving row (`r4`) still carrying the unfixed misspelling raises a
  "did the right copy win" question worth a human glance. Serpentine Arête had a second,
  previously-missed instance of the same duplicate-waypoint bug (a stray "Colchuck Lake"
  entry off by 13 ft) — fixed. Pandora's Box's headline fabricated-WI6-contamination fix from
  batch 9 is intact, but `pro_tips[0]` and `watch_out` still carry unmatched leftover
  harder-route language the original fix missed — flagged, not guessed at (no source gives
  correct replacement text for either field).
- **Chimney Rock** (`wa_east_face_6`) — re-verified clean on the summit-elevation mismatch
  its sibling West Face had in pass 1 (no regression), but its own itinerary day-by-day
  gain/loss no longer sums to its externally-corroborated top-level total — flagged, no track
  data available to say which day is undercounted. Also carries the same round-trip-vs-one-way
  `dist_km` fingerprint CLAUDE.md already documents as a DB-wide, do-not-bulk-fix issue.
- **East McMillan Spire** (`wa_east_mcmillan_spire_west_ridge`) — `approach_logistics` still
  held a stale trailhead coordinate the row's own waypoint/GPX data had already superseded
  (same propagation-gap pattern as batch 61's Dorado Needle fix) — fixed. A real grade-vs-
  commitment contradiction (top-level grade says "Grade III," the dedicated `commitment`
  column says "II") surfaced — left flagged, no accessible source settled which numeral is
  right.
- **Witches Tower** (`wa_e_se_face`) — the pass-1 batch-9 flag (mandatory roped 5.6 pitch in
  descent/itinerary contradicting the row's own 4th-class grade fields) is still unresolved;
  the row's own `corrections`/`sourceNote` fields already explain the likely cause (content
  bled in from a similarly-named separate 5.6 route on the same peak) but nobody has done the
  rewrite/split yet.
- **Middle Peak** (`wa_east_face`, Gunsight Range/Chickamin-Blue Glaciers — confirmed via
  coordinates this is *not* the unrelated Mount Index "Middle Peak" a prior batch touched) —
  the biggest find this batch: five separate confirmed errors, several looking like cross-
  route contamination. `gain_ft` undercounted the route's own itinerary by 1,300 ft; `rappels`
  named the wrong glacier (Blue, the approach side, instead of Chickamin, the actual descent
  side); `access.parking_pass` named "Sunrise Mine TH for Vesper Peak" — a completely
  unrelated Mountain Loop Highway trailhead; `emergency.rangerStation` named an
  Okanogan-Wenatchee district instead of this route's actual Darrington/Mt. Baker-Snoqualmie
  one; and `emergency.nearestHospital` named a real hospital in the wrong county (matching
  Witches Tower's own correct value almost verbatim — likely a copy-paste source) plus a
  hospital that doesn't exist at all ("Skykomish Valley Hospital"). All fixed from the row's
  own correct fields or authoritative sources. Left flagged: a 15 ft area-vs-route elevation
  split that mirrors a genuine real-world source disagreement, and an unconfirmed sheriff-
  jurisdiction county.
- **Snowking Mountain** (`wa_east_ridge_2`) — pass-1 fixes (land manager, glacier-crossing
  contradiction) hold with no regression. New flag: `fa` states a confident, specific FA
  party while the row's own `data_quality.gaps` simultaneously says "no confirmed FA" —
  direct internal contradiction, and external search could only corroborate half the claimed
  party. Left for a human with guidebook access.
- **Silver Star Mountain (Okanogan)** (`wa_east_ridge_3`) — still no fix; every primary
  source (SummitPost, NWMJ, Mountain Project, Mountaineers.org, even Wikipedia) 403'd again
  this pass, same wall pass 1 hit. Got a sharper lead on the pass-1 two-trailhead-merge
  suspicion via search snippets — evidence of at least 3 distinct named ridge routes on this
  peak, any of which could be the contamination source — but rewriting the approach/beta text
  from inference alone risked fabricating details, so left flagged rather than patched.
- **Inspiration Peak** (`wa_east_ridge_4`) — one clean, low-risk fix: the 2026 NCNP
  early-access lottery date window was stale by a day ("Mar 2–13" vs. NPS's actual "Mar
  3–14"), the same off-by-one-day bug already fixed on two sibling NCNP routes (Buckner
  Mountain, Crooked Thumb Peak) in earlier batches but never propagated here.
- **DB-wide flag, not fixed** (surfaced independently on both Silver Star and Inspiration
  Peak this batch): `alpine_grade` holding a roman-numeral commitment grade instead of the
  French adjectival scale `supabase/migrations/0006_composite_grades.sql` defines for that
  column — a spot-check across ~25 other routes found this format inconsistent DB-wide, so
  it reads as a systemic backlog rather than something to patch route-by-route.

10 confirmed errors fixed across 5 of the 10 routes (SQL: `audits/sql/2026-08-07-batch-62.sql`,
validated with `npm run check:sql` — all checkable statements confirm against live target ids;
3 statements weren't auto-checkable due to the tool's known naive-parser issue with hyphens/
em-dashes inside quoted replacement text, same as batch 61's Gerber-Sink case, and were
cross-checked manually against the live rows instead). No route in this batch came back fully
clean — every route had at least one open flag alongside its fixes or in place of one.
`check:sql` also warned the file (7.9KB) exceeds the SQL Editor's ~4KB safe-paste size — split
it into chunks when applying by hand.

## 2026-08-07 — Pass 2, Batch 63

Five peaks, 10 routes, researched via 4 parallel agents: Mount Thomson (East Ridge) +
Pinnacle Peak/Tatoosh (East Ridge) + Primus Peak (East Slope); East Twin Needle (South
Route + Thread of Ice); Eldorado Peak group 1 (East Ridge, NW Couloir/Eldorado Glacier,
North Ridge); Eldorado Peak group 2 (Northeast Face, West Arete).

- **Mount Thomson** (`wa_east_ridge_6`) — `gain_ft` (3600) turned out to be the one-way
  approach gain lifted from the route's own `approach` text, not the round-trip total its
  own itinerary states (4900, matching the existing `loss_ft`) — fixed. Also cleared a
  stale `data_quality.gaps` note claiming the FA was "left as unknown" when the `fa` column
  actually holds a specific, externally-corroborated attribution (Joe Hazard & B. French,
  1917). Flagged, not fixed: the route's own `approach` text states a one-way mileage that
  disagrees with its own itinerary-implied figure.
- **Pinnacle Peak, Tatoosh Range** (`wa_east_ridge_8`) — audited clean; the id-implies-5.8
  vs. actual-5.5 grade mismatch a prior batch already resolved in-row holds with no
  regression. Flagged: `dist_km` is NULL, unlike both sibling Pinnacle routes — no
  authoritative one-way mileage source found to fill it.
- **Primus Peak** (`wa_east_slope`) — `dist_km` (16.1) didn't reproduce the route's own
  itinerary total (~19 mi RT per WTA); 15.3 km does, and is also the exact value already
  on file for sibling route `wa_primus_peak_south_ridge` — looks like a value swap between
  the two Primus routes. Fixed.
- **East Twin Needle** — `wa_east_twin_needle_south_route`'s grade fix from batch 10 (5.7 →
  II 5.10a) is confirmed still live and correct, but three other fields never got the
  memo: `overview` and `pro_needs` still described a separate "moderate 5.7" line distinct
  from "a harder East Arête," and `data_quality.gaps[0]` still cited the retired grade —
  all three rewritten to match the row's own corrected grade/beta. `wa_east_twin_needle_
  thread_of_ice` audited fully clean, including the previously-flagged null-grade pattern
  (already resolved, no regression). Bonus finds on the parent area row (out of this
  batch's route scope but well-corroborated, so fixed anyway): `prominence_ft` (176) was
  the metric prominence value mislabeled as feet (Wikipedia: 576 ft / 176 m), and the
  area's `lat`/`lng` matched a coordinate the route's own waypoint data had already
  identified and superseded as wrong (southeast of Mount Terror instead of the correct
  position near Eye Col) — both fixed to match the route's own sourced values.
- **Eldorado Peak** (5 routes across both agent groups) — East Ridge audited clean, batch
  10's high_point_ft fix confirmed still live with no regression. NW Couloir/Eldorado
  Glacier had four confirmed internal contradictions: `gain_ft` (4000) vs. its own
  itinerary total (6700); `pitches` (8) vs. its own overview/pitch_detail (2-3); `descent`
  claiming an optional rappel that its own `descent_text` explicitly says isn't needed; and
  `rappels` naming a nonexistent "Dean's Tower notch" instead of the "Dean's Spire col"
  consistently named elsewhere in the same row — all four fixed. North Ridge's `aspect`
  (N) contradicted its own overview/beta/watch_out text (all describing an E-facing line)
  — fixed. Northeast Face had a `descent` field that was generic boilerplate contradicting
  its own `descent_text` and external sources, and a `dist_km` storing the full round-trip
  distance instead of one-way (doubling the error under the app's `distKm * 2` convention)
  — both fixed. West Arête's `waypoints` summit elevation (8868) contradicted its own
  `corrections` field, which already explains 8868 is an old USGS benchmark, not the true
  summit (8872.9 ft) — fixed.
- Flagged, not fixed: NW Couloir's `alpine_grade` (M3-M4, mixed) is inconsistent with an
  otherwise pure snow/ice route (no source found to resolve); North Ridge has a `null`
  top-level `grade` despite populated `rock_grade`/`grade_num`; and — the most significant
  open item this batch — the `wa_eldorado_peak` area row's blurb calls the North Ridge "20+
  pitches, one of the 50 Classic Climbs of North America," which flatly contradicts this
  route row's own data (3 pitches, 800 ft, 5.7) and found no external corroboration either
  way. Needs a human to determine whether the area blurb is fabricated or the route row is
  drastically under-scoped.

14 confirmed errors fixed across 5 peaks (SQL: `audits/sql/2026-08-07-batch-63.sql`,
validated with `npm run check:sql` — 11 of 14 statements confirm automatically against live
target ids; 3 weren't auto-checkable due to the tool's known naive-parser issue with
quotes/parens in long replacement text (same as batches 61-62), and were manually
cross-checked against live rows instead). 2 routes (Pinnacle Peak East Ridge, East Twin
Needle Thread of Ice) audited fully clean. `check:sql` also warned the file (7.6KB) exceeds
the SQL Editor's ~4KB safe-paste size — split it into chunks when applying by hand.

## 2026-08-07 — Pass 2, Batch 64

Eight peaks, 10 routes, researched via 4 parallel agents: Elephant Butte + Elephant Head;
Prusik Peak (Energizer Bunny) + Sloan Peak (Fire on the Mountain) + Vesper Peak (Fish &
Whistle); Flora Mountain + North Early Winters Spire (Flycatcher Buttress); Forbidden Peak
(East Face/Catscratch, East Ridge, North Ridge).

**Network caveat:** this run's egress policy blocked WebFetch to most primary sources
(Wikipedia, Mountain Project, NPS.gov, WTA.org, SuperTopo, Mountaineers.org,
CascadeClimbers.com) across all four agents — only WebSearch snippets were reachable. Yield
is lower than recent batches as a result, and several plausible errors were left flagged
rather than fixed for lack of a confirmable primary source. Worth re-running the flagged
items from a session with that access restored.

- **Elephant Butte / Elephant Head** — no new confirmed errors. Both prior pass-1 fixes
  (Elephant Butte's area elevation_ft/prominence_ft; Elephant Head's bad FA credit, which
  was removed rather than guessed) verified still live with no regression. Flagged, not
  fixed: Elephant Butte's `area.region` ("North Cascades / Stehekin") looks geographically
  wrong for a peak reached via the Diablo/Sourdough Ridge corridor, ~40 miles from Stehekin
  itself (a sibling peak, `wa_berdeen_peak`, carries the identical wrong tag, out of scope
  this batch); and an internal contradiction between `access.parking_pass` ("Northwest
  Forest Pass") and `access.passRequired` ("None required...") that no reachable source
  could resolve either way.
- **Prusik Peak** (`wa_energizer_bunny`) — `aspect`, `face`, and `overview` all called this
  Prusik Peak's west face, but AAC Publications titles the route "Prusik Peak, South Face,
  Energizer Bunny" and multiple trip reports group it with the peak's other south-face
  lines (Solid Gold, Burgner-Stanley) — all three fixed. Also fixed a waypoint that named
  itself "Snow Lakes Trailhead" (elev 1,300 ft) while its own coordinates matched the
  Stuart Lake Trailhead (~3,400 ft) that this route's own approach/road fields consistently
  describe as the actual start point — Snow Lakes TH is a real but unrelated trailhead on a
  different, ~10-mile-distant Enchantments approach.
- **Sloan Peak** (`wa_fire_on_the_mountain`) — resolved a pass-1 flag that sat open for a
  full audit cycle: `pitches` (8) and `length_m` (457, ~1,500 ft) both contradicted the
  route's own `pitch_detail` array (7 entries), `overview` ("climbs 7 pitches"), and
  `rope_note` ("7 pitches... ~1000ft technical"); Mountain Project, stephabegg.com, and
  Blake Herrington's *Cascades Rock* guidebook (Herrington co-established the route) all
  agree on 7 pitches / 1,000 ft — fixed to 7 / 305 m, with `beta`'s "8 pitches... 333 m"
  text rewritten to match. Also fixed `access.land_manager` (said "Glacier Peak
  Wilderness," contradicting the row's own `access.landManager` and the DB's own area
  hierarchy, which both correctly say Henry M. Jackson Wilderness — a separate, adjacent
  wilderness) and `access.parking_pass`, which named "Sunrise Mine TH for Vesper Peak" —
  copy-pasted verbatim from sibling route `wa_fish_whistle`'s own field.
- **Vesper Peak** (`wa_fish_whistle`) — `gain_ft` (4,115) didn't equal `loss_ft` (4,400) on
  a single-day car-to-car route with a non-technical walk-off back to the same trailhead,
  where gain should equal loss; `loss_ft` already agreed with the route's own
  `itinerary.days[0].gainFt` (4,400), isolating `gain_ft` as the outlier — fixed.
- **Flora Mountain / North Early Winters Spire** (Flycatcher Buttress) — no confirmed
  errors; both audited as internally consistent on the facts reachable this run (FA,
  elevation, grade, rack all corroborated). Flagged rather than fixed: Flora Mountain's own
  `corrections` field recommends an elevation value (8,325 ft) that no longer matches its
  own already-populated `elevation_ft` (8,323 ft) — stale provenance text, not a factual
  error, but no clearly "correct" replacement to write; Flycatcher Buttress has a base
  waypoint sitting ~20 m from its own summit waypoint despite an 860 ft vertical separation
  and a 10-pitch route between them (looks copied from the summit point rather than
  surveyed), plus two different coordinates for the same SR-20 trailhead within the same
  row (~580 m apart) — neither resolvable without primary topo/GPS access.
- **Forbidden Peak** (3 routes) — the 2026 Boston Basin permit-lottery window stored as
  "Mar 2–13" was off by a day against NPS's actual announced window (Mar 3–14) — fixed on
  the two routes carrying that field (East Face/Catscratch, East Ridge). East Ridge's
  `data_quality.gaps` still described an unresolved duplicate-route problem
  ("...wa_forbidden_peak_east_ridge_direct... should probably be reconciled") that a
  2026-07-29 rename/merge already resolved — confirmed via this row's own `corrections`
  field and the duplicate id's absence from the live DB — stale note rewritten so future
  passes stop re-flagging an already-solved problem; the row's FA/grade/pitch data is
  otherwise internally coherent, no merge artifacts found. North Ridge's `beta` opening
  line read "Grade III, 5.7 climbing," contradicting its own already-correct `grade`/
  `grade_num`/`rock_grade` fields (all 5.6, a pass-1 fix confirmed still live) — likely
  copy-mixed with a single 5.7 move mentioned later in the same sentence ("10 feet of 5.7
  rock... to gain Sharkfin Col") — fixed. East Face/Catscratch's pass-1 flag stands
  unresolved: its own `corrections` field still documents a name conflating two unrelated
  Forbidden Peak features, with grade fields (5.9) that don't match its own class-4
  description — needs an editorial rename/re-grade decision this pass couldn't make.

12 confirmed errors fixed across 6 of the 10 routes (SQL: `audits/sql/2026-08-07-batch-64.sql`,
validated with `npm run check:sql` — 12 of 14 statements auto-confirm against live target
ids; the remaining 2, both the same `jsonb_set` pattern on quote-heavy replacement text,
weren't auto-checkable due to the tool's known naive-parser limitation and were manually
cross-checked against the live rows instead, same as recent batches). 1 route (Elephant
Head) audited fully clean. `check:sql` also warned the file (7.3KB) exceeds the SQL
Editor's ~4KB safe-paste size — split it into chunks when applying by hand.


## Batch 65 — pass 2 (2026-08-07)

Routes: Forbidden Peak (Northeast Face, Northwest Face, West Ridge), Fortress Mountain
(East Ridge, Northeast Face, Southwest Face), Fortune Peak (East Slope, Standard Route),
Free Mojo, Frenzel Spitz South Route. Same ordering as pass-1 batch 12 — checked whether
that batch's fixes held and looked for new drift rather than re-litigating settled facts.

Pass-1 batch 12 fixes confirmed still live and correct: Forbidden Peak Northeast Face's
FA/grade_num (no longer contaminated with Dragontail Peak's FA party), Fortress Mountain's
elevation (8,679 ft, consistent across the area and all 3 routes), the "Chiwawa/Entiat
Ranger Districts" land_manager fix on all 3 Fortress routes, and Fortune Peak's corrected
Cle Elum Ranger District land_manager on both routes. Fortress Mountain Northeast Face's
naming flag from pass 1 (id says "Northeast Face," every source calls it "Northeast
Ridge") was independently resolved by a later pass — the `name` field now reads "Northeast
Ridge" with a `corrections` note documenting the 2026-07-29 rename (id slug intentionally
retained, same precedent as Cutthroat Peak East Face).

New finding this pass: **`gain_ft` below the mathematical floor implied by the route's own
waypoints**, the same self-contradiction class flagged in several earlier batches (Fish
Whistle/Vesper Peak, Southwest Couloir). Forbidden Peak Northeast Face (`gain_ft` 4,600)
and Northwest Face (`gain_ft` 4,800) both climb monotonically from the shared 3,200 ft
Boston Basin Trailhead to the shared 8,815 ft summit with zero recorded elevation loss
along the way — a 5,615 ft net gain is the floor, so both stored values were physically
impossible. Northwest Face's own `loss_ft` was already correctly 5,615, corroborating that
figure; both routes fixed to 5,615 for gain (and Northeast Face's `loss_ft`, also short of
the floor at 5,200, fixed to match). Free Mojo had the identical pattern: `gain_ft`/
`loss_ft` both stored 2,200 against a 2,607 ft net (Blue Lake Trailhead 5,200 ft → South
Early Winters Spire summit 7,807 ft) — fixed to 2,607.

Flagged, not fixed: Frenzel Spitz South Route's `grade` ("Grade III") vs `commitment`
("II") conflict carries over from pass 1 unresolved — a research pass this run couldn't
find any source specifying an NCCS commitment grade for this obscure Southern Pickets
line (AAC Publications and Beckey Vol. 3, the likely authoritative sources, weren't
reachable); needs a human with guidebook/AAJ archive access. Fortress Mountain East
Ridge's `loss_ft` (7,900) is ~2,000 ft higher than its own `gain_ft` (5,884, which already
matches the trailhead-summit net almost exactly) and its sibling Southwest Face's `loss_ft`
(6,000) for the identical trailhead/summit pair, with no alternate descent route described
in the row's own text to explain the excess — no confirmed replacement value, left flagged.
Fortress Mountain Northeast Face has a same-row conflict between `access.land_manager`
(Okanogan-Wenatchee National Forest only) and `access.landManager` (adds "and Mt.
Baker-Snoqualmie National Forest") — external sources suggest Fortress Mountain's summit
does straddle both forests region-wide, which would make the two-forest field the more
complete one, but this pass couldn't confirm the actual Forest Service boundary against
this specific ridge route (sources were proxy-blocked); left flagged rather than picking
a side.

3 confirmed errors fixed (SQL: `audits/sql/2026-08-07-batch-65.sql`, validated with
`npm run check:sql` — all 3 statements auto-confirm against live target ids). 3 flagged
for human review, 4 routes (West Ridge, Fortress Southwest Face, both Fortune Peak
routes) audited clean.

## Batch 66 — pass 2 (2026-08-07)

Routes: Frying Pan/Whitman Glaciers (Little Tahoma), Ghost Peak South Route (Picket
Range), Gilbert Peak's Conrad Glacier / Meade Glacier / West Route, and 5 Glacier Peak
routes (Cool Glacier-Gerdine, Disappointment Peak Cleaver, Frostbite Ridge, Kennedy
Glacier, Sitkum Glacier). Researched via 4 parallel agents grouped by peak.

Little Tahoma's Frying Pan/Whitman Glaciers route had the batch's most contaminated row:
`approach_logistics` described "White River Trailhead (FR-6400, Lake Wenatchee)" — a real
USFS trailhead ~150 miles away near Leavenworth — instead of the route's own, correctly
described Fryingpan Creek Trailhead; `access.notes` carried the same "Mount Tom area,
North Cascades" boilerplate junk string flagged DB-wide (35 routes) in pass-1 batch 15;
`pitches` was 0 despite a populated 2-pitch `pitch_detail`; and `gain_ft` (7,600)
contradicted its own itinerary day-sum (7,338, matching the already-correct `loss_ft`) —
all four fixed. Ghost Peak's South Route had a `descent_text` describing an exit via the
Big Beaver Trail to Ross Lake, flatly contradicting its own approach text ("Hannegan Pass
Trailhead...not Ross Lake") and itinerary — fixed to match the route's own stated exit.

Gilbert Peak: Conrad Glacier's trailhead waypoint was ~1 mile off (missing elevFt too),
correctable against sibling Meade Glacier's confirmed-correct coordinates for the same
physical trailhead — fixed. Both Conrad Glacier and Meade Glacier carried a Cowlitz
Valley Ranger District (Gifford Pinchot NF) land-manager value copy-pasted from the West
Route's Snowgrass-side approach; both routes actually sit on Naches Ranger District
(Okanogan-Wenatchee NF) per their own Conrad Meadows/South Tieton approach text — fixed.
West Route audited clean on every externally-checkable fact (summit coordinate matches
Wikipedia to 5 decimal places).

Glacier Peak: the recurring "A. H. Dubor" misspelling of 1897 USGS surveyor A. H. Dubois
(first fixed pass-1 batch 13) turned up again on 3 of the 5 routes this batch — fixed on
all 3. Cool Glacier-Gerdine's `gain_ft`/`loss_ft` (9,400/9,400) contradicted its own
itinerary day-sum and `totalNote` text (~7,750 ft) — fixed. Frostbite Ridge's `gpx` track
was byte-for-byte identical to Cool Glacier-Gerdine's — a copy-pasted south-side track on
a route whose own text describes a north-side line — nulled rather than fabricating a
replacement; its `approach_logistics.trailheadDirection` also claimed "southeast" from a
trailhead its own coordinates place to the northeast of the summit — fixed. Kennedy
Glacier's `approach_logistics.peakLat/peakLng` was ~500m off the true summit against its
own waypoint, its sibling's matching value, and the area row — fixed; its `loss_ft` was
null despite a populated, itinerary-matching `gain_ft` — fixed.

Biggest open flag: Disappointment Peak Cleaver's row conflates two mutually exclusive
approaches — its prose (`approach`, `approach_logistics`, hazards) describes the south-side
North Fork Sauk/White Pass line, while its structured fields (`waypoints`, `itinerary`,
`road`) describe an entirely different east-side Buck Creek Pass/Trinity/Chiwawa River
line, with `waypoints` even out of physical order. This also explains why its top-level
`gain_ft`/`loss_ft` don't reconcile with either approach's itinerary sum. Needs a human to
pick one canonical approach and rewrite the row consistently — not a single-field patch.
Also flagged, not fixed: Sitkum Glacier's FA year (1897, one unconfirmed search snippet
claimed Wikipedia says 1898 — direct fetch was blocked, so left as-is) and a cross-sibling
trailhead-mileage contradiction with Kennedy Glacier for the shared White Chuck River
Trailhead; Kennedy Glacier's `dist_km` conflicting with its own `corrections` field's
stated one-way mileage; Frostbite Ridge's two internally-disagreeing summit elevations
(10,541 vs 10,550) and a gain/loss-vs-itinerary gap in the opposite direction from Cool
Glacier-Gerdine's fixed one; Gilbert Peak's long-standing 8,184 ft (Wikipedia/USGS) vs
8,201 ft (USFS prose) conflict, already transparently logged in the row rather than
guessed; and Ghost Peak's internal mileage mismatch and low-confidence rappel-count field
(row's own `data_quality.confidence` already marked LOW).

Network caveat: WebFetch was blocked for several primary sources this run (Wikipedia,
fs.usda.gov) on two of the four research threads; those agents fell back to WebSearch
snippets only, which is reflected in the higher-than-usual flagged count.

16 confirmed errors fixed (SQL: `audits/sql/2026-08-07-batch-66.sql`, validated with
`npm run check:sql` — 15 of 15 checkable targets auto-confirm against live ids, no DELETE
removes an only copy; 1 statement not auto-checkable due to the tool's known naive-parser
issue with a comma inside quoted replacement text, manually cross-checked instead). ~18
items flagged for human review. 0 routes fully clean end-to-end (every route in this batch
had at least one confirmed fix or an open flag). check:sql also warned the file (7.4KB)
exceeds the SQL Editor's ~4KB safe-paste size — split it into chunks when applying by
hand.

## 2026-08-07 — Pass 2, Batch 67

Four peaks/areas, 10 routes (Goat Mountain 1, Golden Horn 1, Mount Goode 3, Mount Stuart 1,
Gunnshy Peak 1, Gunsight Range/Middle Peak 2, Guye Peak 1): South Ridge (Goat Mountain);
North Face (Golden Horn); Megalodon Ridge, Northeast Face, Southwest Couloir (Goode);
Gorillas Direct (Stuart); Standard Route (Gunnshy); Gunrunner, Standard Route (Middle
Peak); Improbable Traverse (Guye Peak). Researched via 4 parallel agents grouped by peak.

Goat Mountain's South Ridge had the batch's most internally tangled row: `high_point_ft`
(6,721 ft) was actually the *false* west-summit elevation, not the route's real
destination — its own `waypoints`, approach text, and the parent area row all agree the
route tops out on the true 6,891 ft east summit (confirmed via SummitPost) — fixed, along
with four other fields that had separately drifted to an unsupported "~6,600 ft" figure
for the false summit (should be 6,721 ft, per the row's own already-correct `beta` field),
a resulting arithmetic slip in a waypoint note (170 ft height difference miscomputed as
120), and a gain/loss mismatch (4,300/4,800 vs. the row's own itinerary-sourced 5,100/5,100).
Gorillas Direct (Mount Stuart) had the same trailhead-conflation bug flagged for its
sibling King Kong in an earlier pass: `approach` sent parties to "Longs Pass" at mile 2.5,
but this route's own waypoint for that exact point says "Ingalls Pass" — Longs Pass and
Ingalls Pass are two different forks of the same trailhead system — fixed. Gunnshy Peak's
trailhead waypoint was ~500m off from its own `approach_logistics` value for the identical
point — fixed to the WTA-confirmed coordinate.

Mount Goode's three routes shared a stale `approach_logistics` trailhead (still "Rainy
Pass" on two of three, despite each route's own waypoints/gpx having already been
corrected in a prior pass to "Bridge Creek Trailhead") and an identical, wrong
Boston-Basin-specific camping-rules clause — Boston Basin is a different NCNP corridor
entirely, nowhere near this Bridge Creek approach — fixed on all three. Northeast Face was
the standout: its `fa` ("Beckey and Parrott, 1954") flatly contradicted the row's own
`data_quality.gaps` ("no confirmed first-ascent party/date found"), and no source
corroborates that claim (Beckey's real documented NE-side FA on Goode is the distinct
Northeast Buttress, 1966) — nulled rather than guessed; its `grade` (IV) also disagreed
with its own `commitment`/`alpine_grade` (both III) — fixed; and its `gain_ft`/`loss_ft`
didn't match its own itinerary sum — fixed.

Gunrunner (Middle Peak, Gunsight Range) had the batch's worst cross-route contamination:
`access` and `emergency` fields named a Lake Serene/Vesper Peak trailhead, Mt. Baker
Wilderness, Chelan Ranger District, a Cascade Medical Center located in the wrong town, and
a hospital that doesn't exist — none relate to this route's real Downey Creek Trailhead /
Glacier Peak Wilderness approach, all corrected against its sibling `wa_gunsight_peak_
standard`'s already-verified block for the identical approach; its `dist_km` also
undercounted against its own waypoint mileage and that same sibling — fixed. While
reviewing the sibling as the "known good" reference, found it wasn't fully clean either:
its own `access.parking_pass` carried the identical "Mountain Loop Highway" contamination
— fixed too. Resolved the standing question of whether filing these two routes under an
area named "Middle Peak" (rather than "Gunsight Peak") is a mislabeling: it isn't — Gunsight
Peak is a documented multi-summit massif (North/Middle/South), and Middle Peak is the
correct name for its highest point, the one Wikipedia/USGS list under the massif's overall
name. The underlying elevation figure itself is still unresolved three ways (8,185 ft area
row / 8,198 ft on one route / 8,200 ft on the other, against Wikipedia's 8,198 and
listsofjohn's 8,184) — left flagged, not guessed. Guye Peak's Improbable Traverse audited
essentially clean (best-sourced row in the batch); only its FA names/dates couldn't be
independently confirmed or refuted this pass (primary FA-history sources were
network-blocked) — flagged rather than assumed correct. Golden Horn's North Face was clean
on every fact checked; its one open item is a trailhead ambiguity (prose names Swamp Creek,
structured fields name Rainy Pass North) that may be two genuinely valid alternate
approaches rather than a bug — left for a human to adjudicate rather than picking one.

20 confirmed errors fixed (SQL: `audits/sql/2026-08-07-batch-67.sql`; validated with
`npm run check:sql` — 20 of 22 statements (16 distinct target ids) auto-confirm against
live rows, no DELETE removes an only copy; 2 statements not auto-checkable due to the
tool's known naive-parser issue with quotes in long replacement text, manually
cross-checked instead — both target ids confirmed to exist). ~13 items flagged for human
review. check:sql also warned the file (11.6KB) exceeds the SQL Editor's ~4KB safe-paste
size — split it into chunks when applying by hand.

## 2026-08-07 — Pass 2, Batch 68

Five peaks, 8 routes (Guye Peak 3, Hadley Peak 2, Helmet Butte 1, Himmelhorn 1, Mount
Deception 1): West Face, North Route, Southeast Gully (Guye Peak); Cougar Divide, Skyline
Divide (Hadley Peak); Standard Route (Helmet Butte); Southeast Route (Himmelhorn, a repeat
visit — see below); Honeymoon Route (Mount Deception). Researched via 5 parallel agents
grouped by peak.

Guye Peak's North Route had the batch's worst single defect: its `itinerary`/`timing`
described an entirely different, nonexistent "North Rib" route reached via "the
non-established talus route" — directly contradicting this same row's own
`approach`/`beta`/`overview` and even its own `itinerary.cal` field, which already states
the North Route uses the separate Cave Ridge Trail and is unaffected by the 2021 Alpental
closure. Reads as West Face boilerplate copy-pasted without updating the route name or
approach; it even carried over West Face's summit elevation (5,169 ft, itself wrong — see
below) and a mid-word truncation in one note field. Rewritten from scratch to match the
route's own documented approach. West Face's own `high_point_ft` (5,169) was the sole
outlier against every other reference to Guye's summit on file (area row, its own
waypoint, and both siblings all say 5,168, matching Wikipedia) — fixed; its summit
waypoint/gpx point was separately ~170m off from every other coordinate for the same
point, including its own `approach_logistics` — fixed. Southeast Gully's trailhead
waypoint was missing an elevation, filled from USFS/Mountaineers sources (3,045 ft),
which also reconciles its stated gain against the true floor. One item deliberately left
unfixed: West Face's `pitch_detail` describes the *Improbable Traverse's* specific crux
(5.8 moves protected by old pitons, matching Mountain Project's separate Improbable
Traverse page) while the rest of the row matches Mountaineers.org's West Face description
— looks like the two routes' content has been blended into one row; flagged for a human
with both DB rows in front of them rather than patched blind.

Hadley Peak's Skyline Divide had a gain/loss figure (2,818 ft) below the route's own
mathematical floor and directly contradicted by its own `pro_tips` field ("GPS-tracked
hikes commonly log more gain (3,300+ ft)...") — fixed to 3,300. Its trailhead elevation
(4,250 ft) undershot the USFS-published 4,400 ft — fixed. Cougar Divide's summit waypoint
(7,470 ft) was the odd one out against this route's own `high_point_ft`, the sibling
route's `high_point_ft`, and the area row (all 7,522) — fixed to match the DB's internal
consensus, though external sources genuinely disagree on Hadley's true elevation across a
wider range (7,415–7,546 ft seen), so this only resolves the self-contradiction, not the
open external question (left flagged). Both routes' `access.land_manager` (snake_case
field only — the camelCase `landManager` sibling was already correct on both) wrongly
claimed some approaches cross into North Cascades National Park; Mount Baker/Hadley Peak
sit entirely within Mount Baker Wilderness/USFS land, and NCNP's nearest boundary is ~20
miles away — fixed on both rows, along with the matching NCNP-permit contamination in
`access.rules`.

Helmet Butte's Standard Route carried Mountain-Loop-Highway and Chelan-Ranger-District
contamination in `access.land_manager`/`landManager`/`parking_pass` and
`emergency.rangerStation` — the real managing office for this Chiwawa River Road/Trinity
Trailhead approach is the Wenatchee River Ranger District (confirmed against a live USFS
closure alert for the same road) — fixed all four fields. Its summit waypoint elevation
(7,420 ft) contradicted its own `high_point_ft` (7,400) and its own `corrections` field,
which already documents deliberately picking 7,400 over ListsOfJohn's 7,420 — the
waypoint was never synced to that decision — fixed. The parent area's `blurb` separately
had a stray "7,372-ft summit" typo disagreeing with its own `elevation_ft` (7,400) and
matching no source found — fixed.

Himmelhorn's Southeast Route (previously marked clean in Pass 1, Batch 15 on a lighter
check) got no SQL fixes this pass, but a deeper waypoint/GPX geometry check found a real
problem: the row's own mid-route waypoints (Terror-Crescent Divide Saddle through the
Himmel-Otto Col Gully) sit roughly 3.7 straight-line miles south of where they need to be
relative to the row's own, externally-verified summit coordinate (matches Wikipedia to 5
decimals) — a physical impossibility for what the route's own text describes as a short,
direct col-to-summit push. The GPX track (sourced from a public CalTopo map per
`data_quality.gaps`) shares the same error, and the mid-chain mileage suspiciously matches
published figures for the separate, lower Terror Basin camp — raising the possibility the
wrong basin's track got used. No safe replacement coordinates found this pass; flagged as
the batch's top open item rather than guessed. Mount Deception's Honeymoon Route had a
wrong address *and* phone number for the Wilderness Information Center in
`emergency.rangerStation` (600 E. Park Ave / 360-565-3130 is actually Olympic NP's
separate headquarters mailing address and general visitor line) — corrected to 3002 Mount
Angeles Rd / 360-565-3100, which this same row's own `access._raw.permit_pickup_hours`
field already cited correctly (a self-contradiction) — fixed. Its stored Royal Basin
reservation season ("May 1–Sept 30") disagreed with NPS's actual June 15–Oct 15 window and
with this row's own `seasonal_guidance` note — fixed. Its Upper Dungeness Trailhead
waypoint elevation (2,900 ft) contradicted its own `approach` text, which already
correctly says ~2,500 ft (2,900 ft is actually the NP boundary about 1.2 mi up-trail) —
fixed. Left flagged: the same trailhead waypoint's lat/lng sits ~37m from the Royal Lake
waypoint despite the route text putting them 7.2 trail miles apart — clearly wrong, but no
confidently-sourced replacement coordinate found this pass.

13 confirmed errors fixed across 19 UPDATE statements (SQL:
`audits/sql/2026-08-07-batch-68.sql`; validated with `npm run check:sql` — all 13 distinct
target ids confirmed to exist against live rows, no DELETE in this batch; 2 statements not
auto-checkable due to the tool's known naive-parser issue with `--` inside long
replacement text, manually cross-checked instead — both target ids (already fetched
directly from the live DB earlier in this pass) confirmed to exist). ~13 items flagged for
human review, including one route (Himmelhorn) with a confirmed-but-unfixable geographic
defect. check:sql warned the file (13.1KB) exceeds the SQL Editor's ~4KB safe-paste size —
split it into chunks when applying by hand.

## 2026-08-07 — Pass 2, Batch 69

Checked 10 routes across 6 peaks: Hozomeen Mountain (North Peak North Route, Southeast
Face), Hurry-Up Peak (South Ridge), Icy Peak (Ruth-Icy Traverse, Southwest Route), Ingalls
Peak (East Route, South Ridge), Inner Constance (Northwest Buttress, Standard Route), and
Inspiration Peak (West Ridge). Researched via 5 parallel agents grouped by peak.

18 confirmed errors fixed (SQL: `audits/sql/2026-08-07-batch-69.sql`; `npm run check:sql`
confirmed all 18 distinct target ids exist against live rows, no DELETE in this batch — 2
statements not auto-checkable due to the tool's known naive-parser issue with a long
single-line statement burying the `id =` predicate past its 220-char head-check, both
manually cross-checked instead against rows already fetched directly from the live DB
earlier in this pass). check:sql also warned the file (11.2KB) exceeds the SQL Editor's
~4KB safe-paste size — split it into chunks when applying by hand.

Notable finds: Icy Peak's Southwest Route claimed to reach the true, higher Southeast
summit (7,073 ft) via `high_point_ft` and its own summit waypoint, while its own approach
text says the described line tops out at the lower Northwest/register summit — and gives
an "about 11 ft higher" gap for the true summit that matches Beckey's cited 7,062 ft
Northwest Peak elevation almost exactly, confirming the row's own text was right and the
elevation fields were wrong. Ingalls Peak's South Ridge wrongly placed itself inside the
quota Enchantment Permit Area (it's a separate, non-quota Teanaway-side trailhead — press
coverage explicitly names Lake Ingalls as the fallback for hikers who missed the
Enchantment lottery) and carried a stale rappel description (4 raps needing two 60m ropes
due to stuck-rope reports) that its own `descent_text` already contradicts (3 raps, single
60m rope). Two routes had boilerplate contamination from unrelated routes: Hurry-Up Peak's
`partner_requirements` referenced a "Horseshoe Basin" camp that its own `overview` field
explicitly rules out for this peak (Horseshoe Basin serves Sahale/Boston/Forbidden on the
other side of Cascade Pass), and Inner Constance's Northwest Buttress waypoint/
`approach_logistics` pointed at the Dosewallips/Lake Constance trailhead used by the
*Standard Route*, contradicted by its own approach text and a `pro_tips` field that
explicitly warns that side "deposits you in Avalanche Canyon on the wrong aspect for this
route."

Left flagged rather than fixed: Hozomeen Southeast Face has a much deeper problem than a
field typo — its `overview`/`fa`/`waypoints` describe the AAC-documented Southeast Buttress
of Hozomeen's *South* Peak (8,003 ft) almost verbatim, while `high_point_ft`/`face` assert
it's the *North* Peak (8,071 ft) standard route. The row's own `corrections` field already
diagnoses this and proposes a fix that was never applied — resolving it means picking which
peak this row is actually about, a content decision for a human, not a field-level fact fix.
Also flagged: several internal gain/loss and dist_km reconciliations across multiple routes
where two fields disagree but no single source clearly says which is right; Icy Peak's
"two vs. three summits" question and a Seahpo Peak elevation conflict between two Wikipedia
pages; Ingalls South Ridge's Dogtooth Crags waypoints, which sit roughly a mile from where
the route's own beta says they should relative to Ingalls Col and the summit — a confirmed
geometry problem with no safe replacement coordinates found; and Inner Constance Standard's
`high_point_ft` (7672), which disagrees with its own sibling route (7670) and with external
sources that themselves range 7667–7680 ft.

Three of the five research agents flagged a "duplicate area row" in their data — this is an
artifact of this run's own query (which joins the parent area once per sibling route on that
peak, producing byte-identical rows in the export), not a live database issue. Noting it here
so a future pass doesn't re-flag the same non-bug.

## 2026-08-07 — Pass 2, Batch 70

Checked 10 routes across 6 peaks: Jack Mountain (Nohokomeen Glacier and Headwall, Northeast
Glacier, South Face/Southeast Ridge), Johannesburg Mountain (Cascade-Johannesburg Couloir,
Northeast Buttress), Kimtah Peak (Southwest Slopes/Gully), Mount Stuart (King Kong - Gorillas
Direct Direct), Klawatti Peak (Southeast Face, SW Buttress), and Kangaroo Temple (Koala Krack).
Researched via 6 parallel agents grouped by peak.

32 confirmed errors fixed across 39 UPDATE statements (SQL: `audits/sql/2026-08-07-batch-70.sql`;
`npm run check:sql` confirmed all 25 distinct write targets exist against live rows, no DELETE
in this batch — 8 statements not auto-checkable due to the tool's known naive-parser issue with
long single-line statements burying the `id =` predicate past its head-check length, all
manually cross-checked instead against rows already fetched directly from the live DB earlier
in this pass). check:sql also warned the file (22.7KB) exceeds the SQL Editor's ~4KB safe-paste
size — split it into ~1.5KB chunks when applying by hand.

Notable finds: King Kong (Mount Stuart) resolved a real FA-vs-FFA mixup left open by a prior
audit pass — AAC Publications and Alpinist Newswire both corroborate that Sol Wertkin & Tyree
Johnson made the actual first ascent (with a fall on the headwall crack) about a week before Sol
Wertkin & Jon Gleason's clean, free ascent on Sept 9, 2016; the row's `beta` field had the FFA
date/partner mislabeled as the FA. The same route also had a resurfaced case of this project's
recurring approach-boilerplate-contamination bug: `approach_logistics` and `access.notes`
described the north-side Stuart Lake Trailhead (used by routes like the North Ridge) instead of
the south-side Teanaway/Esmeralda approach this route's own `approach`/`road`/`emergency.county`
fields already correctly use — fixed using the same trailhead coordinates already audited for
the neighboring Ingalls Peak South Ridge route in batch 69. Klawatti Peak's two routes had a
trailhead coordinate ~3.9 mi from the real Eldorado Creek trailhead (matching each row's own
`approach_logistics` field once corrected); the SW Buttress route additionally had a wrong,
self-contradicting note baked directly into a waypoint claiming the *correct* coordinate was the
error — the note had the fix backwards and was corrected along with the coordinate. Kimtah Peak
had an itinerary whose day-by-day mileage (20 mi total) didn't match its own waypoints and its
own "roughly 15 miles" summary note, a `gain_ft` inconsistent with its own `loss_ft` and
itinerary breakdown, and a `data_quality.gaps` list claiming no FA and no gully/gendarme
waypoints existed when the row's own `fa` and `waypoints` fields already had both. Two Jack
Mountain routes and both Johannesburg Mountain routes repeated a pattern seen in many earlier
batches: a stale or self-contradicting field (a wrong hospital name, a backwards land-manager
field, a wrong trailhead, a wrong dist_km/loss_ft pair) that the row's own other fields already
had right.

Left flagged rather than fixed: Kimtah Peak's `elevation_ft`/`high_point_ft` (8,649 ft) has no
attesting source anywhere — every source found gives only "8,600+ ft" because the peak sits
outside LiDAR survey coverage, and the row's own prose already says so while its numeric fields
assert false precision; Jack Mountain's summit elevation is inconsistent across its own three
routes and area row (9,069 vs 9,075 ft) with real external sources split the same way, needing a
human to pick one figure and apply it peak-wide; Klawatti Peak Southeast Face's bergschrund and
glacier-crossing waypoints are still geometrically impossible (flagged in a prior pass, still
unresolved — no safe replacement coordinate found this pass either); Klawatti SW Buttress's
`approach` field is otherwise Eldorado Peak's approach text with one corrected clause patched in
and would benefit from a fuller human rewrite; Johannesburg Mountain's `gpx` tracks on both
routes are contradicted by their own `data_quality.gaps` ("no public GPS track found") and
contain large blocks of geographically implausible points — likely fabricated or contaminated,
but no authoritative replacement track was found to fix it with; and Koala Krack's own existence
as a documented route on Kangaroo Temple remains unconfirmed after a second, more thorough
search pass (Mountain Project's own Kangaroo Temple page lists only 3 routes, not this one) —
still flagged rather than deleted per guardrails.

## 2026-08-07 — Pass 2, Batch 71

Checked 10 routes across 7 peaks: Kololo Peaks (Standard Route), Kyes Peak (Glaciated Scramble,
Northeast Ridge), North Early Winters Spire (Labor Pains), Lane Peak (Zipper, Fly, Lover's
Lane), Le Conte Mountain (Northern Aspect), Lemah Mountain (East Route), and Lemah Two
(Goatshead Spire). Researched via 5 parallel agents grouped by peak.

14 confirmed errors fixed (SQL: `audits/sql/2026-08-07-batch-71.sql`; `npm run check:sql`
confirmed all 11 distinct write targets exist against live rows, no DELETE in this batch — 3
statements not auto-checkable due to the parser's known long-statement issue, manually
cross-checked instead against rows fetched directly from the live DB earlier in this pass).

Notable finds: Le Conte Mountain's `fa` field misnamed a 1938 first-ascent party member
("Ralph" instead of "Ray" W. Clough, later a well-known UC Berkeley structural engineer) and
its `permit` field wrongly described a self-issue Glacier Peak Wilderness permit — the route is
actually in North Cascades NP via Cascade Pass and needs an NPS reservation-lottery backcountry
permit, contradicting the row's own `access.*` fields. Labor Pains had a stray British E-grade
in `alpine_grade` used nowhere else in the catalog, a trailhead waypoint/gpx coordinate ~1.26km
off from its own `approach_logistics` fields, a descent description claiming "bolted stations"
that contradicted its own more granular rappel fields (mixed bolt/natural/gear anchors), and an
`overview` overstating pitch difficulty against its own `corrections` field. Lane Peak's Zipper
had a `grade_num` contradicting its own `ice_grade`/beta/pitch_detail; Lover's Lane's long-null
grade fields (flagged unresolved in pass 1) were filled from its own internally-consistent AI1
rating. Kyes Peak's Glaciated Scramble had a `loss_ft` wildly inconsistent with `gain_ft` for a
stated out-and-back, plus beta text naming the wrong ridge (its own waypoints call the same
point "South Ridge," not "northeast ridge"); the area's `prominence_ft` didn't match Wikipedia's
own elevation-minus-key-col arithmetic. Kololo Peaks Standard Route's summit waypoint mislabeled
the lower west summit as the true high point, contradicting the route's own overview/beta text
and external sources.

Lemah Mountain and Lemah Two audited clean — zero confirmed fixes; FA claims, elevations, and
coordinates for both routes corroborated cleanly against Wikipedia and independent searches.

Left flagged rather than fixed: several ambiguous itinerary/gain-loss semantics for multi-day
routes (Le Conte, Lemah Mountain) where the "correct" figure depends on field intent rather
than a verifiable fact; a Lane Peak Lover's Lane grade conflict against a secondhand (network-
blocked) Mountain Project reading; a Kyes Peak Northeast Ridge FA name that couldn't be
independently confirmed (source domain blocked) though the date/route description corroborate;
Kololo Peaks' area elevation/prominence (primary sources unreachable this pass); and a Lemah Two
area-hierarchy parent mismatch that may be a deliberate access-corridor split shared with
several neighboring peaks rather than a bug.

## Batch 72 (2026-08-07, pass 2)

Routes: Mount Stone (Lena Lake to Mt Stone traverse), Gunn Peak (Lewis Creek Route), Lexington
Tower (East Face), and Liberty Bell Mountain's 7 in-scope routes (Beckey Route, East Face,
Independence Route, Liberty and Injustice for All, Northwest Face, Overexposure, Serpentine
Crack) — researched via 3 parallel agents grouped by peak. 14 confirmed fixes, 11 flags, 2
routes clean (Beckey Route, Northwest Face).

Liberty Bell's East Face group had a recurring "wrong side of the mountain" contamination
pattern: Independence Route, East Face, and Liberty and Injustice for All all had trailhead
waypoints (and, for Independence Route, the full `approach`/`approach_logistics`) copied from
the Blue Lake Trailhead/Beckey Route despite being genuine East Face lines approached from a
separate SR-20 hairpin/pond pullout — corrected using each row's own already-verified approach
text as the source. East Face also had a `beta` field describing an unrelated 10-pitch route
(contradicting its own 4-pitch `pitch_detail`) and an overview calling the route "popular"
against its own `crowds` field ("rarely climbed") — both rewritten to match the row's own
already-correct data. Independence Route's `grade_num` (12) didn't match "5.12a" under the
app's own `gradeNum()` formula (should be 12.25); Liberty and Injustice for All's `dist_km` was
double its same-trailhead siblings' figure. Overexposure's aspect/face were mislabeled
"Southwest" when its own overview text and a waypoint shared with the Northwest Face route both
identify it as the West Face; Overexposure and Serpentine Crack both had `emergency.county`
trimmed to "Chelan" despite their own `emergency.notes` documenting the Chelan/Okanogan county
line.

Lewis Creek Route's `dist_km` (6 km) contradicted its own itinerary's cited 12.07 km. Lexington
Tower's area blurb mislabeled the East Face route's grade "III" against its own alpine_grade/
commitment fields (IV, confirmed externally).

Left flagged rather than fixed: an impossible East Face notch elevation/coordinate on Lexington
Tower (exceeds the peak's own true-summit elevation); a pre-existing "is this a real named
route" question on Lewis Creek Route; an unreconciled multi-source gain/loss range on the Mount
Stone traverse (already caveated on-file); remaining contaminated intermediate waypoints on
Liberty Bell's Independence Route/East Face beyond the trailhead point (no sourced replacement
coordinates found); a possible area-level FA-credit discrepancy on Liberty Bell (2 vs. 3
climbers credited); a corrupted/truncated `approach` field and a gear/pitch-detail size
contradiction on Serpentine Crack; and a `dist_km` one-way-vs-round-trip convention
inconsistency on Overexposure (documented systemic issue, not bulk-normalized per CLAUDE.md
guidance).

## Batch 73 (2026-08-08, pass 2)

Routes: Liberty Bell Mountain's 4 remaining routes (Thin Red Line, Liberty Crack, Liberty
Crack Free, Liberty Traverse), Liberty Cap (Liberty Ridge Finish, Ptarmigan Ridge Finish),
Lichtenberg Mountain (West Face/West Rib), Lincoln Peak (North Ridge, Standard), Little Big
Chief Mountain (Northeast Face) — researched via 5 parallel agents grouped by peak. 31
confirmed fixes, 10 flags, 1 route clean (Lichtenberg). `npm run check:sql` confirmed all 35
checkable write targets exist against live rows (3 statements skipped by the parser's known
long-statement issue — manually cross-checked those 3 directly against the fetched rows
instead, all correct); no DELETE in this batch.

Liberty Bell's 4 routes continued batch 72's east-face-approach-contamination pattern, this
time spreading past `waypoints` into `hazards`, `seasonal_hazards`, `partner_requirements`,
`timing`, `itinerary`, and a wrong top-level `descent` field on Thin Red Line specifically,
plus a shared, byte-identical west-side `gpx` track on three of the four routes (cleared to
NULL — no verified East Face track available to replace it). Liberty Cap's two Rainier-summit
"finish" routes both carried a stale `high_point_ft` (14112 ft, contradicting each row's own
text-endorsed 14,097 ft and the parent area) — fixed on both. Ptarmigan Ridge Finish also had
a live access-data staleness bug: SR-165's Fairfax Bridge, the sole public road to Mowich
Lake, was permanently closed on April 22, 2025 per WSDOT's own announcements (no funded
repair, not expected back before 2031 — independently verified via web search before writing
the fix), but the row still described ordinary seasonal gating; fixed `road`/`access`/
`approach`/waypoint fields to state the closure and point to the still-viable White River/St.
Elmo Pass alternative.

Lincoln Peak's North Ridge route was misnamed and mis-approached: its own `overview` already
identified it as "Wilkes-Booth" (NW Face, FA March 2015, confirmed via AAC Publications and a
CascadeClimbers trip report), but `name` still said "North Ridge / Standard" and `approach`
carried a fabricated 1958 FA/ice-screw claim that traces to neighboring Colfax Peak's own
climbing history (same Lincoln-assassination-themed route-naming convention) — both fixed,
plus a stale `rock_grade` the row had already self-flagged for removal. Also fixed a
commitment-vs-grade contradiction on the Standard route (VI vs. its own III-IV) and
`areas.parent_peak` on Lincoln Peak itself, which named sibling Colfax Peak instead of the
real parent, Mount Baker (confirmed by checking Colfax's own `parent_peak` convention directly
in the live DB).

Little Big Chief Mountain's lone route had an `fa` value asserting a specific 1939 FA
attribution that directly contradicted its own `corrections` field, which had already
concluded the attribution couldn't be confirmed for this specific line and should be left
null — fixed to match the row's own reasoning. Its `beta` field also claimed a PCT approach
to Dutch Miller Gap, contradicting its own more detailed `approach` field and USFS/WTA trail
data (Dutch Miller Gap Trail 1030 the whole way, no PCT segment) — fixed. Lichtenberg
Mountain's West Face/West Rib route audited fully clean: elevation, gain/loss, distance, and
a dated 1978 trip-report-sourced ascent all corroborated externally.

Left flagged rather than fixed: a genuine Liberty Crack-vs-Liberty Crack Free shared-trail
approach-time discrepancy and ambiguous single- vs. dual-county `emergency.county` values on
two Liberty Bell routes; Camp Schurman elevation and Carbon Glacier thickness figures plus an
unconfirmed 1935 FA date on Liberty Cap; a real, unresolved 3-way elevation conflict (9,085 ft
area/text vs. 9,101 ft structured fields, both externally sourced) spanning both Lincoln Peak
routes and the area row; and a narrative-vs-structured belayed-pitch-count inconsistency on
Little Big Chief, given the peak's inherently thin documentation.

## Batch 74 (2026-08-08, pass 2)

Routes: Little Mac Spire (Southwest Route), Little Sister (North Face, West Face), Little
Tahoma (Cowlitz/Ingraham Glaciers, East Shoulder), Live Free or Die! (Liberty Bell), Lizard
Mountain (South Route), Luahna Peak (Southwest Slope/Southeast Ridge). 3 confirmed fixes, 1
flag, 4 routes clean. `npm run check:sql` confirmed both checkable write targets against the
`routes` table exist on live rows; the `areas` write target (Luahna Peak) was cross-checked
manually against the live table instead, since the checker script's generic column set
(`area_id`) doesn't exist on `areas` — confirmed present and correct. No DELETE this batch.

Little Mac Spire's Southwest Route had a `corrections` field contaminated with beta for an
unrelated peak: it claimed the route was "located near Mac Peak in the Deception Lakes area"
— a real but distinct 6,859 ft summit near Stevens Pass, roughly 90 miles from the Southern
Pickets (confirmed via SummitPost/Wikipedia) — and separately contradicted this row's own
`pitches` field (said "2-3 short pitches" against `pitches`=9). Rewrote to drop both while
keeping the still-valid uncertainty flag on the FA date/grade.

Live Free or Die's `watch_out` field described the whole route as a boulder problem ("Boulder
problem grade terrain - V5+...", "bouldering sections", "exposed bouldering terrain"),
directly contradicting this same row's own `overview`, which already explains the on-file
name/grade previously caused exactly this misreading and states plainly it's an 11-pitch,
~1,200 ft face route, not a boulder problem — confirmed externally via the AAC Publications FA
writeup (8 pitches to M&M Ledge, shared 3-4-pitch finish, mostly 5.10-5.11 face climbing with
a bouldery crux move). Also fixed the underlying shape bug: `watch_out` was stored as one
newline-joined string instead of the jsonb `string[]` the column is documented for
(`0012_alpine_rich_fields.sql`) and every sibling route uses — which collapses into a single
run-on bullet client-side, since `toArr()` only splits on commas, not newlines. Replacement
content was drawn from this same row's own `descent_text`/`hazards`/`seasonal_hazards` fields,
not new research.

Luahna Peak's `areas` row carried an outdated elevation (8,450 ft, traceable to a 2005 trip
report) against the current authoritative figure (8,445 ft, per Wikipedia/NGS) that this DB's
own route row already used in `high_point_ft` — fixed the area row to match both.

Little Sister's North Face and West Face, Little Tahoma's East Shoulder (FA independently
confirmed: J.B. Flett & Henry Garrison, August 29, 1894) and Cowlitz/Ingraham Glaciers route,
and Luahna Peak's own route field content all audited clean.

Left flagged rather than fixed: Lizard Mountain's summit elevation, where the row's own
`data_quality` field already correctly flags a real cross-source inconsistency (7,306-7,420 ft)
with no confirmed benchmark found in this pass either.

## Batch 75 (2026-08-08, pass 2)

Routes: Luna Glacier (Phantom Peak), Luna Peak (Southeast Slopes), Lundin Peak (South Face
Left), Magic Mountain (North Face, Northeast Couloir, South Ridge / Southeast Slopes, West
Ridge), Martin Peak (West Ridge). 1 confirmed fix, 1 flag, 6 routes clean. `npm run check:sql`
confirmed the write target exists on the live `routes` table. No DELETE this batch.

Martin Peak West Ridge's `fa` field credited a joint ascent, "Everett Darr and Ida Zacher,
July 1936," but the documented 1936 first ascent was a SOLO climb by Ida Zacher, made while
scouting the Bonanza Peak area — Everett did not summit that day (he later married her; she is
credited in later sources as Ida Zacher Darr). Corroborated by the Mazama Bulletin's 2025 "She
Climbs High!" retrospective on her climbing record, and consistent with this DB's own
`wa_martin_peak` area row, whose blurb already reads "First climbed in July 1936 by Ida Zacher
Darr" with no mention of Everett — the route row, not the area row, was the one out of step.
Also cleared a stale `data_quality.gaps` entry on the same row flagging the on-file route name
as "Southeast Slopes" against sourced "West Ridge" beta: the `name` field already reads "West
Ridge" (a prior pass fixed the name but never cleared the now-obsolete gap note), so it was
dropped and `lastVerified` bumped to this pass.

Flagged rather than fixed: Lundin Peak South Face Left's `grade` field is null despite the
route's crux being well documented (an opening 5.10 layback hand-crack, per Mountain Project's
route description) — left for a human to confirm the precise grade token (e.g. 5.10 vs. 5.10a)
against a primary source before writing, since a search-engine summary alone isn't precise
enough to commit to a specific YDS suffix.

Luna Glacier, Luna Peak Southeast Slopes, and all four Magic Mountain routes audited clean:
elevations, FA people/dates, and area-hierarchy placement all corroborated externally (Wikipedia,
Mazama/AAC-adjacent sources) and internally consistent with this DB's own area rows. Luna
Glacier's summit waypoint, corrected in an earlier pass from a wrong "Luna Peak" coordinate to
Phantom Peak's own verified position, was re-checked against the live `wa_phantom_peak` area row
and still matches (8,016 ft, same lat/lng).

## Batch 76 (2026-08-08, pass 2)

Routes: Marvin's Ear (Morning Star Peak), McMillan Spire West (Southwest Ridge, West Ridge),
Mesahchie Peak (West Ridge/Southwest Gully), Mix-up Peak (East Face/East Buttress), Mojo Rising
(South Early Winters Spire), Mount Adams (Adams Glacier, Lava Glacier Headwall). 3 confirmed
fixes, 1 flag, 4 routes clean. `npm run check:sql` confirmed all 3 write targets exist on live
rows. No DELETE this batch.

West McMillan Spire's own West Ridge route had a real internal elevation contradiction: its
summit waypoint (elev 8,038) and itinerary schedule label ("Summit (8,038 ft)") both contradicted
this same row's own `high_point_ft` (8,004) and its own `corrections` field, which already
documents settling this exact cross-source conflict on 8,004 ft ("Wikipedia/USGS-derived figures
give 8,004 ft"). Externally reconfirmed via Wikipedia (8,004 ft / 2,440 m) -- fixed both. The same
waypoint's `note` also read "(Grade III, 5.6 on the west ridge)", which is the sibling Southwest
Ridge route's own rating (alpine_grade III, rock_grade 5.8-), not this route's (Grade II, 4th
class/low 5th, commitment II) -- looks like cross-route contamination bled in from the sibling
row, so corrected the note to describe this route's own grade instead.

Mount Adams' Adams Glacier route had a `data_quality.gaps` entry claiming the row "defers to the
more conservative on-file Grade IV / serac-hazard framing" -- but the row's own `grade`,
`alpine_grade`, and `commitment` fields all already read III, with no Grade IV anywhere else on
the row. Externally confirmed (Ice and Trail trip report: "Mt. Adams: Adams Glacier (Grade III,
Steep Snow, AI2)") that III is the correct, standard rating -- rewrote the stale gaps note to
match the row's own already-correct fields instead of contradicting them.

Also found the same `watch_out` shape bug flagged and fixed in batch 74 (`wa_live_free_or_die`)
recurring on two more routes this batch: `wa_mojo_rising` and `wa_mount_adams_adams_glacier` both
stored `watch_out` as one newline-joined string instead of the jsonb `string[]` every sibling
route uses -- which collapses into a single run-on bullet client-side since `toArr()` only splits
on commas, not newlines. Converted both to proper arrays with the same bullet content, no new
research needed.

Marvin's Ear, McMillan Spire West's Southwest Ridge, Mesahchie Peak, and Mount Adams' Lava Glacier
Headwall all audited clean -- first ascents (Mix-up Peak: Wesley Grande & Jack Kendrick, 1947;
Mojo Rising: Mark Allen, Joel Kauffman & Tom Smith, Oct 13-14 2006; West McMillan Spire: Fred &
Helmy Beckey, 1940) and route facts all corroborated externally.

Left flagged rather than fixed: Mix-up Peak's East Face/East Buttress has `grade_system='yds'`
paired with a class-based grade text ("Grade II, Class 4 / low 5th") and `grade_num=0` --
inconsistent with this batch's own class-graded sibling (Mesahchie, `grade_system='class'`), but
there's no clearly-intended value within the row itself to fix toward, so left for a human
data-modeling decision rather than guessed.

## Batch 77 (2026-08-08, pass 2)

Routes: Mount Adams (Lyman Glacier, Mazama Glacier Headwall, North Ridge, Northwest Ridge, South
Climb, Wilson Glacier Headwall), Mount Anderson (Eel Glacier), Mount Baker (Boulder Glacier). 2
confirmed fixes, 1 flag, 5 routes clean. `npm run check:sql` confirmed both write targets exist
on live rows. No DELETE this batch.

Lyman Glacier's top-level `season` field ("May-Jun") excluded July even though the row's own
`best_season` ("June to July") and `seasonal_guidance.monthBreakdown` (July rated "good", within
the optimal window) both treat July as climbable -- widened `season` to "May-Jul" to match the
row's own more detailed fields; a same-row consistency fix, no new external fact needed.

Mazama Glacier Headwall's plain-text `permit` field carried the same generic USFS "Mt. Adams
Climbing Pass (Cascade Volcano Pass)" boilerplate used by every other Mount Adams route in this
batch -- but this route starts from Bird Creek Meadows on Yakama Nation land (Tract D), where the
Volcano Pass doesn't apply. The row's own `access` object and `watch_out` array already correctly
documented a Yakama tribal-use permit with non-tribal access restricted to roughly July
1-October 1; rewrote `permit` to match what the row's own fields already established rather than
the copy-pasted USFS default. Externally corroborated via Wikipedia's Mount Adams Recreation Area
article (east-side Tract D land, Bird Creek Meadows carved out as one of the few reservation-side
areas open to public recreation).

North Ridge, Northwest Ridge, South Climb, Eel Glacier, and Boulder Glacier all audited clean.
Checked North Ridge's FA claim ("A.G. Aiken, Edward J. Allen, and Andrew J. Burge, 1854...
believed to have followed this ridge/cleaver") against TroutLake.org's own Mount Adams history,
which independently calls the North Cleaver line "likely" for that party given their camp
location -- matches this DB's hedge almost word for word. South Climb's FA field ("undocumented
for this specific line, climbed since at least the 1860s") also checks out: the first documented
south-side ascent was in 1864. Boulder Glacier's 1891 LaConnor Expedition FA, correctly
distinguished on-file from Joe Morovits's separate 1894 Boulder-Park Cleaver route, and Eel
Glacier's 1920 Fairman B. Lee (party of 13) FA -- the glacier's name is literally Lee's surname
spelled backward -- both externally reconfirmed. Mount Anderson's approach_logistics peak
coordinates (47.721165, -123.331655) matched Wikipedia's summit coordinates almost to the meter.

Flagged rather than fixed: Wilson Glacier Headwall is internally incoherent on season and land
jurisdiction. Its top-level `season` field reads "Jul-Sep," but `best_season` and
`seasonal_guidance` both call May "optimal" and July "risky" -- opposite framings in the same
row. Separately, its `approach` text routes climbers via the Cold Springs/South Climb (USFS)
trailhead onto the Round-the-Mountain Trail, which the row's OWN `access.rules` field says
crosses onto Yakama land and requires the tribal permit that this route's plain-text `permit`
field never mentions (it carries the same USFS Volcano Pass boilerplate flagged and fixed on
Mazama Glacier Headwall above, but here it's genuinely unclear which permit regime actually
governs the route without deeper research). Also, `grade_system` is `'yds'` paired with a
Roman-numeral grade ("III-IV"), inconsistent with every sibling route in this batch. The row's
own `corrections` field already flags itself as thin/ambiguous sourcing requiring expert review,
so all three were left for a human rather than guessed at.

## Batch 78 (2026-08-08, pass 2)

Routes: Mount Baker (Boulder-Park Cleaver, Cockscomb Ridge, Coleman-Deming, Coleman Headwall,
Easton Glacier, North Ridge, Park Glacier Headwall, Squak Glacier). 6 confirmed fixes, 1 flag,
1 route clean. `npm run check:sql` confirmed all 6 write targets exist on live rows. No DELETE
this batch.

Five of the eight routes shared the identical `access.permit` value "Mount Baker Climbing" --
not a real permit name. Confirmed via USFS that Mount Baker has no climbing permit at all
(self-issue registration only, and it's optional); the string is a truncated fragment of the
USFS recreation-area page title "Mt. Baker Summit - Climbing", not a permit description. Each
row's own top-level `permit` column already stated the real fact correctly, matching the other
three routes in this batch whose `access.permit` sub-field was already a full correct sentence --
rewrote the five truncated rows to match, a same-row consistency fix, no new external fact
invented.

Park Glacier Headwall's `access.notes` carried a trailing false clause, "...Mount Tom area,
North Cascades." -- the same copy-paste boilerplate string identified DB-wide in batch 15 (pass
1) and stamped on 35 unrelated routes including a Wyoming route with no possible North Cascades
connection. This is a third confirmed instance (after two fixed in batch 15), fixed with the
identical replacement text used then.

Cross-checked all eight routes' first ascents against external sources: North Ridge (Beckey/
Widrig/Widrig, Aug 1948), Cockscomb Ridge (Murley/Musser/author, July 4, per the 1961 AAJ
article), and Park Glacier Headwall (Bodine/Friar/Keliher, July 4-5, 1971 headwall variation, via
AAC Publications) all corroborated. Coleman Headwall's own `corrections` field already resolves
a III+ vs. IV grade discrepancy against Mountain Project's page, left as-is. Also ran
`npm run audit:distances -- --state wa` given a wide `dist_km` spread across this batch (4-25.7
km, 6.4x) -- none of the eight routes appear in the script's flagged "long approach not explained
by convention" list, so left untouched per the script's own explicit no-bulk-normalize guidance;
the spread reflects genuinely different trailheads (Boulder Creek vs. Heliotrope Ridge vs.
Schriebers Meadow), not a defect.

Flagged rather than fixed: Squak Glacier's `grade`, `grade_system`, and `gain_ft`/`loss_ft` are
all null, unlike every other route in this batch -- its `source` field is just "wa-enrich-batch"
with no `data_quality`/`corrections` object at all, suggesting it never got a full enrichment
pass. External sources describe it only as a "Basic Glacier Climb" with a guide-service
Technical/Strenuous 3/3 rating, not a figure comparable to sibling routes, and no authoritative
gain-ft number was found specific enough to state as fact. Left for a human enrichment pass
rather than guessed.

## Batch 79 (2026-08-08, pass 2)

Routes: Mount Blum North Ridge, Mount Buckindy Scramble, Mount Carrie Standard, Mount Challenger
Glacier, Mount Christie West Slopes, Mount Constance (Finger Traverse, North Chimney, North
Chute). 6 confirmed fixes, 2 flags, 1 route clean (`npm run check:sql` confirmed all 5 `routes`
write targets exist on live rows; the 1 `areas` target was verified to exist by a direct REST
query, since `check-sql-targets.mjs` only knows the `routes` table's column shape).

Cross-checked all six peaks' elevations against Wikipedia/PeakVisor/peakbagger: five matched
exactly (Blum 7,685; Buckindy 7,320; Carrie 6,995; Challenger 8,207; Constance 7,756). Mount
Christie was the outlier -- external sources agree on 6,181 ft, matching this peak's own West
Slopes route `high_point_ft` (already correct), but the area row's `elevation_ft` (6,182) and that
same route's own summit waypoint (`elev: 6182`) both carried a 1 ft slip -- same systematic-offset
pattern as prior batches' Kyes Peak/Hozomeen/Inner Constance fixes. Fixed both.

Mount Buckindy Scramble had a confirmed permit contradiction: the row's own `access.notes`,
`access.rules`, and `access.permit` sub-fields all correctly describe a Forest Service self-issue
permit (Glacier Peak Wilderness, no quota), but the separate top-level `permit` column carried NPS
North Cascades boilerplate ("Marblemount Wilderness Information Center") pointing overnight
climbers at the wrong agency entirely. Confirmed externally that Mount Buckindy sits in the
Mount Baker-Snoqualmie National Forest's Glacier Peak Wilderness, not North Cascades National
Park -- same NPS-boilerplate-on-a-Forest-Service-peak pattern as batch 8's Bear Mountain and
batch 9's Snowking Mountain fixes. Fixed.

Two grade_num convention fixes, same family as prior batches' YDS-digit fills (Ingalls Peak,
Forbidden Peak): Mount Challenger's Challenger Glacier route stored `grade_num: 5` (the YDS digit
of its 5.6-5.7 summit step) against a `grade_system` of `'class'`, breaking the DB-wide convention
that `grade_num` tracks the class digit for class-graded routes (confirmed against ~25 other WA
class-system rows, all consistent) -- its own grade text is "Class 3-4," so fixed to 3. Mount
Constance's North Chimney route had a null `grade_num` despite a populated `grade` ("Grade II-III")
and `rock_grade` ("...short low-5th-class moves..."); filled to 5 using the same "5th class ->
grade_num 5" convention already on file elsewhere (e.g. wa_vasiliki_ridge_standard). Also filled
Mount Blum North Ridge's null top-level `grade` from its own already-verified `commitment` (III)
+ `rock_grade` (5.8-5.9 R) fields, same pattern as batch 6/10's Kimchi/Thread-of-Ice null-grade
fills.

Flagged rather than fixed: Mount Constance's North Chute route is a bare enrichment stub --
`grade`/`grade_system`/`grade_num`/`data_quality`/`corrections` all null, `source` is just
`"wa-enrich-batch"` -- same "never got a full pass" pattern as batch 78's Squak Glacier; needs a
human enrichment pass rather than a piecemeal fill. Mount Blum North Ridge's top-level `permit`
column is also null despite a fully populated `access.permit` sub-field describing the real
requirement -- left un-synthesized since the DB's top-level `permit` strings follow land-manager-
specific templates (Olympic NP vs. NPS North Cascades complex) and Blum's mixed NF-approach/
NP-adjacent-summit situation doesn't cleanly fit either, so a human should pick the phrasing rather
than have one invented here. Mount Carrie Standard's pre-existing `corrections` note (route name
pairs "Carrie Glacier" with the standard climbing line, but the glacier is actually in a separate
cirque the route doesn't cross) was independently corroborated this pass but is not new -- left as
previously flagged, per the note's own instruction not to rename.

## Batch 80 (pass 2, 2026-08-08)

Five peaks, eight routes: Mount Constance (Terrible Traverse, West Arete),
Mount Crowder (Northeast Ridge, Southwest Route), Mount Cruiser (South Corner, NW Face/Corner),
Mount Custer (Standard), Mount Daniel (Daniel Glacier / Southeast Slopes). Researched via 5
parallel agents grouped by peak. WebFetch was blocked by the network egress proxy for nearly
every external domain for 4 of the 5 agents (Crowder, Cruiser, Custer, Daniel) -- those findings
lean on WebSearch snippet corroboration rather than direct page reads; flagged explicitly where
that weakens confidence.

Confirmed fixes (6): Mount Constance West Arete's `gear` array called the rock "granite"
("Full set of nuts/stoppers -- this granite takes them well"), contradicting this same row's own
`descent_text` ("Given the pillow-basalt rock...") and confirmed externally (NPS/WA DNR geology:
Mount Constance is Eocene pillow basalt, not granite) -- fixed. Mount Crowder's area row and both
routes' `approach_logistics` carried a ~35m-outlier summit coordinate (48.7976266, -121.352631)
that didn't match Wikipedia/Peakbagger's published value (48.7977056, -121.3519083) -- notably,
the Southwest Route's own summit waypoint already stored the correct value verbatim, so two
different coordinate sources had been mixed into the same peak record; fixed area + both routes
to the corroborated value. Both Mount Cruiser routes had a stale `road.status` describing FR-24/
the Staircase entrance as closed under the 2025 Bear Gulch Fire order; confirmed via an NPS news
release and Shelton-Mason County Journal reporting that FR-24 and Staircase reopened July 8,
2026 -- fixed (a month stale as of this audit). The NW Face/Corner route's `access.closures` was
similarly stale, claiming closure "through at least Oct 1, 2026"; rewrote to reflect the July 8
reopening while leaving Flapjack Lakes Trail/Gladys Divide (this route's actual approach) marked
closed, since the most recent USFS alerts found still show that specific trail closed for burn-
scar rehab. Mount Daniel's area `prominence_ft` (3508) didn't match any source found -- Wikipedia/
Peakbagger/PeakVisor all agree on 3,480 ft -- fixed. The Daniel Glacier route's `max_angle` (56)
contradicted The Mountaineers' own route page for this named route ("Grade II with 35 degrees
snow and/or ice"), whose description text matches this row's own `beta` field almost verbatim --
fixed to 35.

Mount Custer Standard audited fully clean -- elevation (8,630 ft), prominence (1,230 ft), FA
(Dawe/Mason/Teichman, 1958), the Chosster/breccia rock-quality reputation, permit fee structure,
and the Depot Creek approach chronology all corroborated. One item worth noting for a future pass:
this route's own `data_quality.gaps` cites a prominence figure (1,314 ft) that doesn't match either
the correct 1,230 ft external figure or the DB's own stored `prominence_ft` -- traces to an
AI-generated wiki, not a reliable source; the stale gap note itself wasn't touched this batch
(text-only, no factual column affected).

Flagged rather than fixed (selected highlights; full detail in the per-peak agent reports):
Mount Daniel's `itinerary.totalNote`/`sourceNote`/day-mileage fields are internally consistent
with each other (sum to ~19 mi round trip) but collectively conflict with the route's own
`dist_km` (12.1 km one-way, doubling to ~15 mi per the app's stated convention) and with AllTrails'
15.3 mi figure for the same named route -- fixing this needs a re-split of day-by-day mileage that
no source specifies, left for a human. Mount Cruiser NW Face/Corner's very existence, grade, and
FA (Wayne Wallace & David Parker, 2004) could not be independently corroborated beyond one
low-confidence AI-summarized search snippet (Mountain Project itself was unreachable) -- flagged
for a human with direct MP access. Mount Cruiser South Corner's `gpx` track (127 points) directly
contradicts this same row's own `data_quality.gaps`, which states no public GPS track exists for
this route, and the plotted shape looks synthetic (a smooth spiral) rather than a real trail
alignment -- flagged as a likely fabricated/placeholder track rather than silently nulled, given
the safety implications of presenting fake GPS data as real. Both Cruiser routes also carry a
`permit` field claiming a Northwest Forest Pass is required, contradicting each row's own
`access.passRequired` field ("no Northwest Forest Pass needed... inside the National Park
boundary") -- recommend striking the clause, not confirmed enough to auto-fix. Mount Crowder
Southwest Route's `fa` field and its own `corrections` field directly contradict each other on
whether the 1962 FA party climbed this line or the NE Ridge -- no source found settles it. Mount
Custer's summit coordinate has genuinely conflicting external evidence (GNIS/Wikidata vs. a
distance-from-Spickard cross-check that favors the on-file value) -- left alone pending topo/quad
access. Mount Constance Terrible Traverse and West Arete both store an identical `gain_ft`/
`loss_ft` (7100/7100) despite being different lines -- suspicious but no source gave an exact
replacement figure for either.

## Batch 81 (pass 2, 2026-08-08)

Seven peaks, eight routes: Mount Daniel (Lynch Glacier), Mount Deception (Standard), Mount
Degenhardt (Southwest Route), Mount Despair (East Route), Mount Fairchild (Standard), Mount
Formidable (North Ptarmigan, South Face), Mount Fury (Mongo Ridge). Researched via 7 parallel
agents grouped by peak. WebFetch was blocked by the network egress proxy for every domain tried
across all 7 agents; every finding below leans on cross-corroborated WebSearch snippets rather
than direct page reads, which is noted explicitly for anything less than solidly agreed-upon.

Confirmed fixes (6): Mount Daniel Lynch Glacier's `emergency.notes` wrongly placed the
Deception Pass Trailhead in "Chelan County / Icicle Creek area" and called it "a different
jurisdiction" from the Cathedral Rock Trailhead route -- it's actually the same trailhead area
(Tucquala Meadows/Fish Lake TH via Salmon La Sac Rd, King/Kittitas county line); fixed. Mount
Deception Standard's summit waypoint `elevFt` (7786) contradicted this same row's own
`high_point_ft`, the area's `elevation_ft`, and its own overview text, all of which say 7,788 ft
(Wikipedia/PeakVisor/WTA agree) -- fixed. The same row's `access.parking_pass` wrongly charged
an Olympic NP entrance fee ($30-80) at the Upper Dungeness Trailhead, which sits on Olympic
National Forest land with no entrance station -- only a Northwest Forest Pass applies, which
this row's own `access.passRequired` field already correctly says -- fixed to match. Mount
Formidable North Ptarmigan's `road.status` said Cascade River Road is paved for "20 miles from
Marblemount," but external sources and this route's own sibling (South Face) both say ~10
miles -- fixed. Mount Formidable South Face's `gain_ft`/`loss_ft` (6100/6200) contradicted its
own `itinerary.sourceNote`, which cites a trip report giving "22 mi / 10,600 ft round trip" for
the same climb -- fixed to 10,600/10,600, which also now matches the sibling North Ptarmigan
route's figures for what both rows describe as substantially the same approach. Mount Fury
Mongo Ridge's "Ross Dam Trailhead" waypoint gave `elevFt` 1640, contradicting this same route's
own approach text ("~2,150 ft") and WTA's stated parking-lot elevation (2,150 ft) -- likely
conflated with Ross Lake's water-surface elevation (~1,600 ft) -- fixed.

Not re-proposed: Mount Daniel's area `prominence_ft` (3508, should be 3480 per Wikipedia/
PeakVisor) is still wrong in the live DB, but that exact fix was already proposed in
batch-80's SQL file and hasn't been applied yet -- not duplicated here.

Highest-priority flag, not auto-fixed: Mount Fury Mongo Ridge's `area_id` (`wa_mount_fury_west`)
is actually **correct** -- every source (AAC Publications, Alpinist, NWMJ, Mountain Project,
CascadeClimbers trip reports) confirms Mongo Ridge tops out on West Fury's summit. The broken
field is the route's own **id**, `wa_mount_fury_east_mongo_ridge`, which should read
`wa_mount_fury_west_mongo_ridge`. This is a primary-key rename, not a field patch, so per
CLAUDE.md's route-identity guidance it needs a check for foreign-key/contribution references
before anyone runs it -- flagged for a human, no SQL proposed.

Other flags (selected highlights; full detail in the per-peak agent reports): Mount Fairchild
Standard's `approach`/`waypoints`/`gpx` describe the real Sol Duc-based Bailey Range approach
(Deer Lake -> High Divide -> Cat Basin -> Mount Carrie -> Fairchild Glacier), while its own
`timing`/`itinerary` describe an entirely different, also-real corridor (Whiskey Bend -> Elwha
-> Long Ridge -> Mount Fitzhenry) with no shared waypoints -- looks like two different source
write-ups got blended into one row; needs a human to pick one and strip the other, or split
into two routes, not a simple field fix. (Separately: the task brief for this peak wrongly
described it as near Mount Baker -- it's actually in the Bailey Range, Olympic NP; the DB's own
parent placement was already correct, so this was a briefing error, not a data defect.) Mount
Formidable South Face's Kool-Aid Lake elevation is given three different values within the same
row (waypoint 6320 ft, approach text 6100 ft, pro_tips 6120 ft) -- external sources are
themselves split on the true figure, but the three-way internal disagreement is a defect
regardless of which is right. That same row's "Red Ledges" waypoint elevation (7800 ft) is
higher than the Spider-Formidable col the route's own narrative says is reached afterward --
geographically implausible given the row's own sequence, no source gave a replacement. Mount
Degenhardt's "Southwest Route" name doesn't appear in any source found -- documented routes are
"Corkscrew Route"/"South Route"; the row's own sourceNote calls it "the Southwest/Corkscrew
Route," suggesting the app synthesized this name -- needs a human with Beckey's guide to confirm
the canonical name. Mount Deception Standard's `dist_km` (32.2, i.e. ~20 mi) is likely a doubled/
misapplied value under this codebase's known one-way `distKm` convention, since the row's own
itinerary already sums to ~20 mi round trip -- flagged for `audit:distances` per CLAUDE.md's
guidance not to hand-normalize this column ad hoc rather than fixed directly here. Mount Fury
East's `elevation_ft` (8356, a 2022 theodolite figure) conflicts with a more precise 2024 GPS/RTK
survey giving 8321.5 ft -- may be measuring a since-melted icecap rather than the rock summit,
left for human judgment on which vintage/datum to store. Mount Despair's `parent_id`
(`wa_picket_range`) is questionable -- Wikipedia says the Picket Range is northeast of (not
containing) Mount Despair, and PeakVisor places it in the "Skagit Range" instead -- informal
North Cascades subrange naming makes this hard to resolve from search alone.

## Batch 82 (pass 2, 2026-08-08)

Routes: Mount Fury East Southeast Glaciers, Mount Fury West West Ridge, Mount Goode Northeast
Buttress, Mount Hardy Snow Scramble, Mount Hinman Hinman Glacier, Mount Howard South Slope,
Mount Index North Norwegian Buttress, Mount Index North Peak Traverse. 12 confirmed fixes, 12
flags, 2 routes (Goode, Howard) fully clean. Researched via 7 parallel agents grouped by peak.
`npm run check:sql` confirmed all 8 write targets exist on live rows.

Mount Hardy carried the same systematic 1-2 ft area/waypoint elevation slip seen in several
prior batches (Christie, Kyes, Hozomeen, Inner Constance): `routes.high_point_ft` already had
the correct 8,099 ft, but `areas.elevation_ft` and the route's own "Mount Hardy summit" waypoint
both said 8,097 -- and the row's own overview text explicitly (wrongly) rationalized the gap as
"normal survey variance." Wikipedia/Peakbagger/PeakVisor all give 8,099 ft with summit
coordinates matching this row's waypoint exactly, so it's a data-entry slip, not survey noise;
fixed both, plus the area's prominence_ft (1512 -> 1519, same three sources). Mount Hinman's
area prominence_ft (1306 -> 1252) was similarly off per Wikipedia/PeakVisor/Peakery/
listsofjohn.com; separately its `blurb` cited neighbor Mount Daniel's elevation as 7,899 ft
(Daniel's lower East Peak) where this app's own Mount Daniel route data already uses 7,960 ft
(Daniel's main/true summit, the county highpoint) -- fixed to match.

Mount Fury East and Mount Fury West both had a Mongo-Ridge-contamination bug, continuing the
pattern flagged in batch 81 (where the East Peak's own Mongo Ridge route was found mislabeled).
This time it wasn't an id issue but two different fact-bleeds: East Peak's `fa` credited "Don
Keller, Joan Firey, and Joe Firey, 1960," but AAC Publications' Helmy Beckey obituary and The
Mountaineers' own blog both describe Fred and 14-year-old Helmy Beckey first-ascending East Fury
in 1940 -- fixed to Beckey 1940, though a lower-tier secondary source instead names an unnamed
1930s Ptarmigan Climbing Club ascent, so this one is worth a human double-check against a
primary source (AAJ/Beckey's guide) despite being fixed. West Peak's `descent_text` closing note
invented a "1981 solo first ascent of the full connecting West Ridge, twelve rappels across four
days" -- that description is actually Wayne Wallace's real 2006 solo first ascent of Mongo Ridge,
a separate route on West Fury's south buttress (confirmed via AAC Publications and Wallace's own
trip report); fixed via targeted string replacement, leaving the rest of the descent note as-is.
Also fixed on East Peak: `access.fees` still quoted NPS's pre-March-2024 $5/person/night
backcountry rate (now $10, confirmed via nps.gov/noca and AP coverage of the fee restructure),
and `loss_ft` (13000) which looks like the row's own "~13,000 ft cumulative gain+loss" total got
stored in the loss-only field instead of the ~7,200 ft this row's own 4-day itinerary sums to for
a round trip returning to the same trailhead. On West Peak, `waypoints`/`gpx` also had the summit
itself out of distance order (index 1, right after the trailhead, instead of last) -- reordered
both arrays to ascending distMi.

Mount Index North Peak Traverse's `pitches` (4) contradicted its own itinerary/timing text and
external sources, both converging on ~12 pitches for the standard North Face line -- fixed.
North Norwegian Buttress's `pro_needs` called the 1980s Doorish solo aid line "easier, roughly
A2" than the modern Jotnar line, but AAC Publications and a trip report put Doorish at VI 5.9
A3 -- comparable, not easier -- fixed via targeted replace. Mount Goode and Mount Howard were
both audited fully clean against elevation, prominence, coordinates, FA history, grade, permits,
and access -- no confirmed errors on either.

Flagged rather than fixed: two legitimate elevation surveys disagree on Fury East's summit
(8,356 ft 2022 theodolite vs. 8,321.5 ft 2024 GPS resurvey, possibly measuring
icecap-vs-rock); Fury West's East Fury waypoint sits an implausible ~40m from its own West Fury
waypoint for what should be a 0.25-0.5 mi connecting-ridge traverse, and three different
round-trip mileage figures appear across that row's itinerary/totalNote/dist_km with no way to
tell which is authoritative; Index North Peak Traverse's `fa` names "Bill (Wolf) Schoening"
where every source found (including Pete Schoening's own AAC obituary) points to Pete Schoening
instead, and a separate source conflict over whether Middle Peak was truly first climbed on this
same 1950 ascent or eight years later. Goode: a minor pitch-count variance and an internal
disagreement between `obj_haz` and `pitch_detail` on where its crux 5.7 slab sits (low vs. mid
buttress). Howard: gain_ft/loss_ft may understate its longer Rock Mountain TH approach option,
an internal timing-field mismatch, and a null/unverifiable `fa`.

## Batch 83 (pass 2, 2026-08-08)

Mount Index (Northeast Buttress), Mount Johnson (Standard), Mount Lago (South Slope - South
Face), Mount Larrabee (South Ridge), Mount Logan (Fremont Glacier, Banded Glacier, Douglas
Glacier), Mount Mathias (Bailey Range Scramble). Researched via 6 parallel agents grouped by
peak; WebFetch was blocked by the network egress proxy for every domain tried across all 6
agents, so findings lean on cross-corroborated WebSearch snippets rather than direct page
fetches.

Fixed (1): Mount Lago's `prominence_ft` (3280) didn't match Wikipedia/PeakVisor, which both
consistently give 3,268 ft -- fixed. The row's own `corrections` field had already re-verified
elevation and coordinates in a prior pass but never checked prominence, so this one slipped
through. Elevation, coordinates, FA, permit terms, and access details on all 8 routes in this
batch checked out clean against authoritative sources -- no other confirmed errors.

Flagged rather than fixed: gain_ft/loss_ft internal-consistency problems recur across most of
this batch and are the dominant finding -- Mount Larrabee's gain_ft (3900) disagrees with its
own itinerary day-1 figure (4225) and with the Mountaineers' published ~4,400 ft; Mount Logan
Fremont Glacier's gain_ft/loss_ft (8900/9600) match neither each other (an out-and-back should
balance) nor the route's own itinerary day-sum (8200/8200); Mount Mathias's gain_ft (6130)
matches neither its own itinerary-day sum (11,400 ft) nor its own totalNote ("~11,000 ft"),
and it's unclear whether the field is meant to cover the whole 5-day trip or just summit day.
Worst case is Mount Logan's Banded Glacier route (`wa_mount_logan_r1`): it contains two
directly contradictory self-described "corrections" about its own trailhead -- one field
insists the correct approach is Thunder Creek/Colonial Creek Campground and explicitly claims
to correct an old Easy Pass value, while a different field claims the opposite, that Easy Pass
is correct and Thunder Creek is the wrong "longer approach" -- with `approach`/`beta`/`road`/
`access.closures` all actually describing Easy Pass throughout. Its gpx track's first ~45
points are also suspiciously identical to the sibling Fremont Glacier route's track, and its
gain_ft/loss_ft/itinerary-sum give three more mutually inconsistent numbers (7027/13000/8100).
This needs a human to pick the correct approach and re-derive the dependent fields together --
not a piecemeal SQL patch. Other flags: Mount Index's `high_point_ft` may be reusing the area's
Main Peak elevation for a route whose FA history/description place it on the separate, lower
North Peak; its `ice_grade`/`alpine_grade` look unsourced/possibly fabricated during
enrichment. Mount Johnson's FA party names for the disputed 1935 date couldn't be independently
corroborated. Mount Larrabee's `dist_km` looks too low against its own itinerary/sourceNote and
external ~10-mi-RT figures. Mount Logan Douglas Glacier's itinerary total (28 mi) doesn't sum
from its own day-by-day mileage (19 mi). Mount Mathias's route record appears to blend two
different real approaches (a Hoh-glacier-only line and the full Sol Duc-to-Hoh Bailey Range
Traverse) with no way to tell which one the row is meant to represent.

## Batch 84 (pass 2, 2026-08-08)

Mount Maude (North Face, Entiat Ice Fall), Mount Mystery (Standard), Mount Olympus/West Peak
(Blue Glacier, West Ridge), Mount Persis (The Hexorcist, West Ridge), Mount Pilchuck (East
Ridge). Researched via 5 parallel agents grouped by peak; WebFetch was blocked by the network
egress proxy for every domain tried, so findings lean on cross-corroborated WebSearch snippets.

Fixed (14): Mount Maude North Face's `loss_ft` (400) contradicted its own itinerary
(gainFt/lossFt 6000/6000 for a loop back to the same trailhead) -- set to match `gain_ft`
(5580). Its `dist_km` (6.4, i.e. 4 mi one-way) undershot its own waypoints (summit at 8 mi
one-way) and AllTrails' independently reported 15.6-mi-round-trip figure -- corrected to 12.5.
Mount Mystery's itinerary day-by-day gain/loss (days[0].gainFt 3300, days[2].lossFt 3300) each
summed to 6900 against the row's own top-level 6700 and its own cited trailcatjim.com source --
both corrected to 3100. Its waypoints[1] ("Royal Basin Trail junction") had elev 1900, a 700 ft
drop in the first mile that contradicts every surrounding waypoint's ascending elevation and
WTA's own "gains a gentle 300 feet" description -- corrected to 2900. Mount Olympus Blue
Glacier's `road.status` said the Upper Hoh Road "reopened...in May 2026"; the real reopening was
May 8, 2025 (confirmed via KOMO/Washington State Standard/Peninsula Daily News), and the row's
own sibling West Ridge route already had the correct date -- fixed. Its `access.notes` field
was contaminated with an unrelated peak's text ("Mount Tom area, North Cascades" -- a North
Cascades USFS peak, not this NPS-managed Olympic NP summit) -- replaced with a notes field
consistent with the row's own correct access.fees/parking_pass. Its `waypoints` array had the
summit out of distance order (before Glacier Meadows instead of after) -- reordered. Both
Olympus routes' `length_m` fields were badly off their own internal pitch data (Blue Glacier:
122m vs. three in-row mentions of a ~70-100 ft summit pitch -- fixed to 30; West Ridge: 543m vs.
its own 7-pitch pitch_detail summing to 185m -- fixed to 185) and both shared a `dist_km` of 28
that was actually just the one-way distance to base camp, missing the summit push entirely
(each route's own itinerary sums to ~42 mi round trip) -- fixed to 33.5 (Blue Glacier) / 34.3
(West Ridge). Mount Persis's area `prominence_ft` (599) didn't match Wikipedia/Peakbagger/
Wikidata, which all converge on 544 -- fixed. Mount Pilchuck East Ridge's `permit` field wrongly
required a Discover Pass, but this route's actual trailhead (Pinnacle Lake, via FR 4020/4021)
is USFS land where a Discover Pass isn't valid -- the row's own access.fees/passRequired fields
already had the correct Northwest Forest Pass answer, only the top-level field disagreed --
fixed.

Flagged rather than fixed: Mount Maude Entiat Ice Fall shares the same suspect `dist_km` (6.4)
and has a null `loss_ft`, but neither is independently pinned down for this less-documented
route; both Maude routes' road/access fields are silent on a real May 2026 Chiwawa River Road
closure (FR 6200, storm damage) that blocks the standard drive to Phelps Creek Trailhead
entirely -- worth confirming current status before writing an update, since closures change.
Mount Mystery's advance-permit reservation window (stated as May 1-Sept 30) conflicts with NPS/
WTA/PermitSnag sources giving June 15-Oct 15 -- flagged rather than fixed since the primary NPS
reservation page was not directly fetchable. Both Olympus routes carry an identical, internally
inconsistent gain_ft/loss_ft (7500/400) that doesn't reconcile against either route's own
itinerary -- needs a human to pick a convention and recompute. Mount Persis West Ridge's gain_ft
(2658) is only 6 ft off its own waypoint-implied net gain (2664) and is explicitly WTA-sourced
per the row's own `corrections` field -- too close to call an error. The Hexorcist's `permit`/
`access` fields claim no permit is needed, but its own `road` field says it shares "the same
general FR-62 access as the West Ridge route" -- which documents a required private-timberland
Hampton Resources gate permit -- a self-contradiction within the row that couldn't be resolved
without a source confirming the north-face approach's actual relationship to that gate. Its `fa`
also cites a "see corrections" pointer that the row's own `corrections` field never addresses,
and the named party/date ("Bill Enger, 1985") couldn't be corroborated anywhere the route's
Burdo attribution itself was confirmed. Mount Pilchuck's `areas.elevation_ft` (5341) sits between
two independently-sourced Wikipedia figures (5,344 ft article vs. 5,324 ft state-park page) with
no clear tiebreaker, and the route's own `high_point_ft` (5324) may or may not be an error
depending on which is chosen.


## Batch 85 (pass 2) -- 2026-08-09

Checked: Mount Pilchuck Standard Route, Mount Price (Hester Lake Route), Mount Rahm (Standard
Route/Glacier), and five Mount Rainier routes (Curtis Ridge, Disappointment Cleaver, Edmunds
Headwall, Emmons-Winthrop Glacier, Fuhrer Finger). Researched via 4 parallel agents grouped by
peak (Pilchuck; Price+Rahm; Rainier x3; Rainier x2). WebFetch was blocked by the network egress
proxy again this run; findings lean on cross-corroborated WebSearch snippets from at least two
independent sources per confirmed fix.

Fixed (13): Mount Pilchuck Standard Route repeats the same `permit` defect fixed on its East
Ridge sibling in batch 84 -- a Discover Pass claimed for a USFS (not state-park) trailhead --
fixed to Northwest Forest Pass, matching the row's own access sub-object; its `length_m` (21)
was off by ~200x against its own dist_km (4.3 km = 4,300 m one-way) -- fixed. Mount Rahm's area
lat/lng sat ~150-170 m from the Wikipedia/GNIS summit coordinate that the route's own waypoints
already had correct -- fixed. Curtis Ridge's gain_ft/loss_ft (7000/9500) contradicted its own
itinerary.days sums (9500 gain / 9300 loss) and its own totalNote ("~9,500 ft gain") -- fixed;
its dist_km (29.77, rendering ~2x the real trip once doubled) was corrected to the itinerary's
one-way figure (13.7); its gpx track sat ~40 miles north near North Bend, contradicting its own
waypoints and its own data_quality.gaps note claiming no public track exists -- cleared rather
than left in place. Edmunds Headwall's first waypoint described an unrelated west-side approach
(Dry Creek/Westside Rd) contradicting its own approach text, road field, and approach_logistics,
which all agree on Mowich Lake -- corrected to match, per wildsnow.com/turns-all-year.com ski
trip reports; elevFt on that waypoint was dropped rather than guessed. Emmons Glacier's
"Glacier Basin Camp Site Area" waypoint elev (6800) contradicted its own approach text's 5,935
ft (WTA/Mountaineers-confirmed) -- fixed; its trailhead elevation appeared as three disagreeing
values in one row (4600/4400/4260) -- reconciled to 4,400 ft, the figure matching external
sources and the row's own approach text. Fuhrer Finger's `fa` omitted a first-ascent party
member (Peyton Farrer), confirmed present via two independent sources (SummitPost,
Mountainproject) -- added; its approach text's Camp Muir elevation (10,080 ft) conflicted with
Wikipedia/AllTrails/WTA's 10,188 ft -- fixed.

Flagged rather than fixed (19): Pilchuck's `access.rules` field describes Glacier Peak
Wilderness group-size/campfire rules, but Pilchuck is not inside that wilderness (USFS boundary
page) -- confirmed wrong, but no verified replacement text was found, so left for a human to
rewrite rather than guessing at specifics. Pilchuck's `areas.elevation_ft` sits amid still-
unresolved external disagreement (5,324/5,341/5,344/5,340 ft across WTA/Wikipedia/Peakbagger/
TrailChick) -- same open question noted in batch 84, still unresolved. Pilchuck's `parent_id`
placement under a "Glacier Peak region" bucket looks suspect given the wilderness-rules
contamination above, but isn't independently confirmed as a placement error. Mount Price's
trailhead pass requirement (Northwest Forest Pass) conflicts with an MBS-NF page apparently
saying no fee currently applies at Dingford Creek -- WebFetch to the primary source was blocked;
its `approach_logistics.trailheadLat/Lng` differs by ~130-150 m from its own waypoints[0], which
independently matches a sourced trailhead coordinate. Mount Rahm's `dist_km` (8, implying a much
shorter round trip than the row's own itinerary/waypoint mileage) looks internally inconsistent,
but no clean external one-way figure was found to pin the correct value; its grade ("Class 3 +
glacier") may describe a different (easier) gully variant than sources describing a harder
Class-4/5 western option -- ambiguous rather than clearly wrong. Mount Rainier's area
`elevation_ft` (14406) is contested between the long-standing NPS/USGS figure (14,410 ft) and a
2024 GPS/lidar resurvey figure that may describe a different high point (the SW crater rim, not
the ice-covered Columbia Crest) -- genuinely unresolved, not a simple typo; the same ambiguity
propagates to `high_point_ft` on Curtis Ridge and Disappointment Cleaver. Rainier's stated
winter/summer self-registration window conflicts with at least one other source giving a
different winter start date -- sources disagree with each other. Curtis Ridge's `length_m`
(1067) is an exact duplicate of Edmunds Headwall's value and doesn't fit Curtis Ridge's own
scale, but no correct replacement was identified. Disappointment Cleaver's `dist_km` undershoots
commonly cited 16-18 mi round-trip figures from guide services, though it's internally
consistent with its own waypoint data -- looks like normal source variance (trail mileage vs.
straight-line), not a clear error. Edmunds Headwall's `gain_ft` needs recomputing now that the
trailhead is corrected, but no verified figure was derived; its `alpine_grade` ("D") reads oddly
alongside `commitment: "IV"` with no dedicated guidebook page to check it against. Emmons
Glacier's `dist_km` disagrees by ~24% with its own last waypoint's one-way mileage, and no
external one-way figure was found to adjudicate; its `length_m` (1497) doesn't obviously
correspond to any named segment in the row: flagged for clarification rather than correction;
its "Glacier Basin Camp Site Area" waypoint's lat/lng sits only ~150-200 m from the trailhead
despite being labeled 3.5 mi away -- clearly wrong, but no correct coordinate was identified.
Fuhrer Finger's `dist_km` (24.94, implying a ~31 mi round trip) is more than double the ~14 mi
round trip described by SummitPost/Mountainproject and roughly matched by the row's own
itinerary -- likely wrong, but the correct one-way figure wasn't independently pinned down; its
`gpx` track terminates well short of the summit (covering only the lower Paradise approach)
despite `waypoints` implying full trailhead-to-summit coverage -- a real data gap, not a simple
value fix.

## Batch 86 (pass 2) -- 2026-08-09

Checked: eight Mount Rainier routes -- Fuhrer Thumb, Gibraltar Ledges, Ingraham Direct, Kautz
Glacier, Kautz Headwall, Liberty Ridge, Mowich Face, Nisqually Icefall. Researched via 3 parallel
agents grouped by peak (all Rainier, so grouped ~3/2/3 to parallelize research time). WebFetch
was blocked by the network egress proxy again this run for nps.gov, wikipedia.org, summitpost.org
and caltopo.com; findings lean on cross-corroborated WebSearch snippets from 2+ independent
sources per confirmed fix, same standard as prior batches.

Fixed (12): Fuhrer Thumb repeats a permit-language defect seen on other Rainier routes in earlier
batches -- `access.permit` said "Free climbing permit at Paradise WIC," directly contradicting
its own `access.fees` ($82 cost-recovery fee) and every sibling route's `access.permit` wording --
fixed to match. Gibraltar Ledges' and Ingraham Direct's `waypoints[0]` ("Paradise") both carried
`elevFt: 5420`, contradicting their own approach text and NPS's official Paradise elevation
(5,400 ft) -- both fixed. Kautz Glacier's `waypoints` Camp Hazard elevation (12,500 ft)
contradicted its own approach text and itinerary (both said 10,800 ft) *and* external sources
(Mountaineers.org/willhiteweb/SummitPost/Mountain Project converge on ~11,100-11,300 ft, matching
neither on-file figure) -- all three fields (waypoint, approach text, itinerary objective)
reconciled to the externally-supported figure rather than to each other's still-wrong value.
Kautz Glacier's `fa` field wrongly credited guide Wapowety and "four soldiers" with reaching the
1857 high point; two independent historical accounts agree only Kautz, Dr. Craig, and Pvt.
Nicholas Dogue continued that far (Wapowety and Pvt. Carroll turned back from fatigue/snow
blindness) -- corrected, and the contested high-point elevation (~12,000 ft vs. near the crater
rim across sources) recorded as a range instead of re-asserting a single unverified number; the
1920 first-full-ascent party/year were independently confirmed and left untouched. Kautz
Headwall's `length_m` (259, ~850 ft) contradicted its own overview/pitch_detail ("~300-foot wall,
two pitches," 55m+35m=90m) and external sources describing a ~300 ft, two-pitch, 60m-rope
headwall -- fixed to 91m; its approach text's Camp Hazard figure (10,800 ft) was corrected the
same way as Kautz Glacier's. Liberty Ridge's `waypoints`/`gpx` held Mowich Lake and Puyallup
Glacier coordinates (Rainier's NW side) while every other field on the same row -- approach,
descent_text, bail, timing, approach_logistics -- correctly describes the real White River/
Glacier Basin/St. Elmo Pass/Carbon Glacier (NE side) line; confirmed contamination via
Mountaineers.org/SummitPost/trip-report cross-corroboration and cleared (no reliable replacement
track found this pass; the row's own data_quality.gaps cites a CalTopo URL this audit couldn't
fetch to verify). Nisqually Icefall's `itinerary.days[0].note` and `timing.sectionBreakdown[0].note`
(identical text) described the Kautz Glacier route's Wilson Glacier/Turtle Snowfield/"the Fan"
approach almost verbatim to Mountaineers.org's Kautz page, contradicting this row's own approach
text and the 1948 first-ascent account (both climb directly up the Nisqually Glacier alongside
Wapowety Cleaver, never touching the Wilson Glacier) -- both fields corrected to match the row's
own approach text; the day's hours/miles/gainFt were left alone since they weren't independently
sourced for the corrected line.

Flagged rather than fixed (20): Fuhrer Thumb's `dist_km` (8) looks low against externally-cited
round trips for this style of Paradise-glacier route, and its `access.fees` labels the $82 figure
"(2024)" while sibling routes say "(2026 rate)" for the identical number -- likely a stale year
label, not a wrong dollar amount, but left for a human to standardize. Gibraltar Ledges' Camp
Muir waypoint (10,080 ft) sits amid genuine three-way source disagreement (10,050-10,100 ft per
WTA vs. 10,188 ft per Wikipedia, the latter already used to "fix" Fuhrer Finger's approach text in
batch 85) -- flagged rather than patched piecemeal since a human should pick one canonical Camp
Muir figure and apply it consistently across every Rainier route rather than have this audit
process contradict its own prior fix; its `dist_km` (20.1) also reads high against typical
Camp-Muir-route round trips with no clean one-way source found. Ingraham Direct's `season` field
("January through end of May... before the DC opens for summer") and its own `overview`/
`best_season` ("late May through June") describe different windows that may be talking past each
other (broad winter-viability vs. peak-condition window) rather than one being flatly wrong --
recommend a human reword rather than a mechanical fix. Both Gibraltar Ledges and Ingraham Direct
tag `grade_system: "class"` despite carrying NCCS-style alpine grades ("II-III," "Grade II-III
glacier") -- looks like a broader schema-labeling pattern rather than an isolated defect, not
fixed unilaterally. Kautz Glacier's Camp Hazard waypoint `lat` (46.793) may sit too far south/low
for a 7-mile-in camp (a named topo point closer to 46.836 exists at the same longitude), but exact
modern camp coordinates shift with conditions/year and weren't independently pinned down; its
`gain_ft`/`loss_ft` (9500/9500) sit ~500 ft above its own itinerary-day sums (9000/9000) -- both
individually plausible, read as rounding slack rather than a clear error; its `length_m` (1039)
doesn't obviously reconcile with `pitches: 2` against a `pitch_detail` array that lists 4 entries;
one source suggested the $82 fee "may no longer be valid for the entire 2026 season," a possible
policy change this audit couldn't confirm with nps.gov blocked. Kautz Headwall has the same
gain_ft/loss_ft-vs-itinerary gap as Kautz Glacier, plus a `grade_system: "yds"` tag on a
Roman-numeral commitment grade ("III-IV") -- same schema-pattern concern as above, not fixed here;
its approach text called Camp Hazard "the top of the snowfield" while Kautz Glacier's approach
calls the same camp/elevation "the base of the Turtle Snowfield" -- a smaller "base vs. top of the
same snowfield" wording clash left for a human alongside the elevation fix. Liberty Ridge's `fa`
claim of "~52 hours car-to-summit" couldn't be independently corroborated (the full AAC 1936
journal writeup sits behind a blocked domain) but wasn't contradicted either. Mowich Face's
`descent` field ("using rappels and downclimbing as necessary") contradicts its own more detailed
`descent_text` and `rappels: "0"` (both say the standard descent is a walk-off/glacier carryover
with no rappelling) -- flagged rather than rewritten since the right replacement wording is a
judgment call, not a new fact; its `road.seasonalGate` note ("~27-mile round trip" post-bridge-
closure) looks like a one-way Mowich-Lake-to-Westside-Road figure (26.4 mi one-way per
Mountaineers.org) mislabeled as round-trip; its `dist_km` (28.97) doesn't clearly reconcile with
its own itinerary mileage and no outside one-way figure was found for this rare route; its
"Liberty Cap (inferred route top-out)" waypoint sits ~600 m from the actual surveyed Liberty Cap
point, already self-labeled "inferred" so not clearly wrong. Nisqually Icefall's `dist_km` (24.94)
is the exact same figure as Fuhrer Finger's already-flagged `dist_km` (batch 85) -- two unrelated
routes sharing an unusual decimal is a contamination signal, but no authoritative one-way mileage
for this rarely-documented route was found to supply a replacement; its `data_quality.gaps`
claims no public GPS track was found, yet `waypoints`/`gpx` hold a 2-point Paradise-to-summit
pseudo-track -- likely just synthesized bookends rather than a real found-then-lost track, worth a
glance but not urgent.

## Batch 87 (pass 2) -- 2026-08-09

Checked: eight routes across four peaks -- Mount Rainier (Ptarmigan Ridge, Sunset Ridge, Tahoma
Glacier, Willis Wall), Mount Redoubt (South Face), Mount Seattle (Noyes Basin, Seattle Creek), and
Mount Sefrit (Bloody Head Couloir). Researched via 3 parallel agents grouped by peak. WebFetch was
blocked by the network egress proxy for nps.gov and most secondary sources (Wikipedia, SummitPost,
Mountaineers.org, trip-report sites) again this run; findings lean on cross-corroborated WebSearch
snippets, same standard as prior batches.

Fixed (9): Two Rainier routes (Sunset Ridge, Tahoma Glacier) and Willis Wall each carried a `gpx`
field holding a fabricated straight-line "track" between just their trailhead and summit waypoints
-- Sunset Ridge's and Tahoma Glacier's directly contradicted their own `data_quality.gaps`, which
say no public GPS track was found for either; Willis Wall's was simply straight lines connecting
its own 3 named waypoints. All three cleared to NULL rather than left in place, same treatment as
Liberty Ridge in batch 86. Tahoma Glacier's `access.notes` described "Mount Tom area, North
Cascades" and a Northwest Forest Pass requirement -- Mount Tom is an unrelated North Cascades peak;
every other field in the same access block (land_manager, permit, fees) correctly names Rainier,
so this was copy/paste contamination, fixed to the standard Rainier registration text shared
verbatim by the other 3 Rainier routes in this batch. Tahoma Glacier's `gain_ft` (5,007) and
`loss_ft` (9,500) both contradicted its own itinerary day sums (12,000 ft each way) and the
itinerary's own totalNote citing "~12,000 ft gain" -- both fixed to 12,000; its
`timing.approachTimeHrs` (6) undercounted its own two approach legs (6.5 + 5 = 11.5 hrs per
timing.sectionBreakdown, the only combination that reconciles with totalHrs) -- fixed to 11.5.
Mount Redoubt South Face's `gain_ft` (5,000) contradicted its own itinerary day sums (6,400 ft)
and its own totalNote ("~6,400 ft round trip") -- fixed. Its itinerary day-2 note cited the "true
summit at 8,963 ft," contradicting its own high_point_ft, summit waypoint, and its own
`corrections` field (which documents 8,969 ft as the deliberately-chosen figure over a rejected
8,603 ft MP number and an 8,958 ft LiDAR revision) -- fixed to 8,969 ft. Its
`approach_logistics.trailheadLat/Lng` sat ~11 km from its own actual described trailhead
(waypoints[0], "Depot Creek Road washout") -- fixed to match. Both Mount Seattle routes (Noyes
Basin, Seattle Creek) cited "~16 miles" from the North Fork Quinault Trailhead to Low Divide in
`approach_logistics.trailheadDirection`; the Mountaineers.org route page (echoed by Hiking Project
and Komoot trail summaries) puts this leg at ~9.2 miles one-way -- both fixed to "~9 miles."

Flagged rather than fixed (16): Ptarmigan Ridge's itinerary day-1 note and matching
timing.sectionBreakdown note both still describe the old Mowich Lake/Spray Park approach,
contradicting this same row's own `approach` and `approach_logistics` fields (Mowich Lake Road
not drivable as of 2026, White River is now the only practical approach) -- a real defect, but the
correct replacement hours/miles for a White River-based day 1 aren't documented anywhere in this
row, so left for a human rather than guessed. The same row's `dist_km` (28.97) and `loss_ft`
(9,500) don't reconcile with the itinerary's day sums (13 mi, 4,900 ft loss) -- consistent with
the itinerary missing an "exit to trailhead" day the other three Rainier routes in this batch all
have, likely the same root cause as the stale approach-day text; needs an added day, not a number
swap. Its `fa` date ("September 8, 1935") has corroborated climbers/year but the specific date
wasn't independently found. Sunset Ridge's and Willis Wall's `descent` fields both contradict
their own more-detailed `descent_text` (Sunset Ridge implies retracing the ascent when the real
descent exits the opposite side of the mountain, requiring a shuttle; Willis Wall implies rappels
when its own descent_text explicitly says no fixed rappels are used on the descent) -- same
pattern as Mowich Face in batch 86, flagged rather than rewritten since the right replacement
wording is a judgment call, not a new fact. Sunset Ridge's `fa` "who suggested the route's name"
detail and the omission of a third climber (Don Woods, per one source) couldn't be independently
confirmed or refuted. Tahoma Glacier's `dist_km` (12) is contradicted by two of the row's own
sources that disagree with each other -- its own descent_text cites a 21.5-mile trip report
(34.6 km) while its own itinerary sums to 26 miles (41.8 km) -- flagged rather than picking one
arbitrarily. Its summit elevation (14,406 ft) matches neither the long-standing USGS figure
(14,410 ft) nor the 2022+ resurvey figures (~14,399.6 ft crater rim / 14,389.2 ft Columbia Crest
ice) -- needs a human decision on which convention to standardize on. Its `fa` "Alfred Drewry"
and "with a dog" details couldn't be corroborated or refuted. Redoubt South Face's `dist_km`
(17.7) self-contradicts its own itinerary.sourceNote, which cites "27.68 km" as the on-file
figure -- but per CLAUDE.md's documented dist_km convention (one-way, doubled for display) the
row's own one-way waypoint distance (8.6 mi = 13.84 km) would double to exactly the sourceNote's
27.68 km, suggesting 13.84 is correct -- however this row could also be one of the ~61 known
round-trip-storing exceptions, so left for a human to confirm the convention before fixing. Its
`approach` field says "Approach via Depot Glacier to Redoubt Glacier," but Depot Glacier is a
distinct real feature on Redoubt's northeast slopes (per Wikipedia), not the Depot Creek
drainage this route's own waypoints/itinerary actually follow -- likely a Depot Creek/Depot
Glacier name mix-up, not fixed without reaching NPS's own page (blocked). Its `beta` field
describes a second, harder Northeast Face route in detail, directly contradicting this same row's
own `data_quality.gaps` ("the separate, more technical Northeast Face route... is not documented
here") -- looks like leaked content from a different route, but the correct trim is an editorial
call. Its `loss_ft` is null and could reasonably be filled with the same ~6,400 ft as the fixed
gain_ft, but left as a gap rather than an assumed value. Both Mount Seattle routes' `beta` fields
cite a specific guidebook route number ("Route 1" / "Route 3" in the Climber's Guide to the
Olympic Mountains) that couldn't be verified against the guidebook itself (not accessible online);
their `emergency.notes` claims of "essentially no recorded ascents" may overstate it for Seattle
Creek specifically, since a Mazamas club activity page exists for that exact route. Mount Sefrit's
Bloody Head Couloir had no confirmed errors -- a sparsely-documented route where everything
populated held up against SummitPost's description -- but its `overview` claim that it's "also
called the North Couloir" may be confused with an unrelated, similarly-named route on Bloody
Mountain in the California Sierra Nevada; not confirmed either way.

Clean: FA facts, coordinates, elevations, permit/fee figures, and internal consistency checks not
called out above across all 8 routes -- see full per-route detail in the researching agents'
reports (not reproduced here to keep this log terse).

## Batch 88 (pass 2) -- 2026-08-09

Checked: eight routes across two peaks -- Mount Sefrit (Southeast Ridge, Southwest Ridge) and
Mount Shuksan (Beckey-Schmidtke, Fisher Chimneys, Hanging Glacier, North Face, Northeast Ridge,
Northwest Arete). Researched via 3 parallel agents grouped by peak (Sefrit x2; Shuksan x3; Shuksan
x3). WebFetch was blocked by the network egress proxy for every external domain tried again this
run; findings lean on cross-corroborated WebSearch snippets citing Wikipedia, USGS GNIS, AAC
Publications, NWAC, Mountaineers.org, Trailforks, peakery.com, and trip-report sites, same standard
as prior batches.

Fixed (13): Sefrit Southeast Ridge's `approach` cited Hannegan Campground trailhead elevation as
"about 2,950 ft" -- two independent sources (Mountaineers.org, Trailforks) put it at ~3,110-3,120
ft -- fixed to 3,120 ft. Sefrit Southwest Ridge had four separate fixes: `dist_km` (9.3km/5.8mi)
and the matching `itinerary.days[0].miles`/`totalNote` text all contradicted this row's own
`corrections` field, which documents the stats as derived from a ~10.5 mi round trip
(peakery.com) -- fixed to 16.9 km / 10.5 mi throughout; `gain_ft`/`loss_ft` (4500/4500) matched
the sibling Southeast Ridge route's numbers exactly rather than this row's own
`itinerary.days[0].gainFt/lossFt` (5000/5000) and peakery.com's "about 5,000 feet" -- fixed to
5000/5000; and `access.permit` described a paid North Cascades National Park backcountry-permit
regime ($10/person + $6 fee, Thu/Fri-only issuance) that contradicted this row's own top-level
`permit` field (free self-issue Mount Baker Wilderness permit, no fee) and the sibling route's
identical land manager -- replaced with the same free-permit text already correct elsewhere on
this row. Two Shuksan routes (North Face, Northeast Ridge) had `climate.forecastZone` values
("NWAC Mt. Baker zone", "NWAC/NWS Mt. Baker zone") that aren't real NWAC zone names -- both fixed
to "West Slopes North (NWAC)", matching North Face's own `seasonal_hazards.avalanche.zone` and
NWAC's actual zone naming. Northwest Arete's summit waypoint gave `elevFt` 9127 against this same
dataset's own high_point_ft/area elevation_ft/sibling summit waypoints, all 9131 -- fixed to 9131.
Beckey-Schmidtke's `high_point_ft` (8268, tracing to a single trip-report title) contradicted its
own overview text and its own summit waypoint (both 8285) and Wikipedia/USGS GNIS -- fixed to
8285; its `access.notes` described the Lake Ann Trail/Sulphide Glacier/Fisher Chimneys approach
(correct on the sibling Fisher Chimneys route, untouched here) instead of the Ruth Creek
Road/Nooksack Cirque Trail #750 approach this row's own `approach` field and waypoints actually
document -- rewritten to match. Hanging Glacier's `rope_note` claimed it's "used as an AMGA guide
exam route" -- sources instead credit Shuksan's North Face (a sibling route in this same batch)
with that -- removed the misattributed clause; its top-level `season` ("Jul-Aug") contradicted its
own `best_season` ("May to June") and `seasonal_guidance.monthBreakdown` (no August entry at all)
-- fixed to "May-Jun".

Flagged rather than fixed (16): Sefrit Southeast Ridge's `gain_ft`/`loss_ft` (4500, GPS-logged per
a specific trip report) sits in tension with the corrected trailhead elevation -- both numbers are
individually well-sourced but don't arithmetically reconcile, left for a human. Its `length_m`
(1125) is an internally-labeled "computed total" with no sourced aggregate to check it against; its
waypoints/gpx are null, so no geographic sanity check could be run. Sefrit Southwest Ridge's
`rock_grade` ("Class 3") contradicts its own `grade` field and multiple internal mentions of a
Class 4 crux -- the one real source found (bivouac.com's "West Ridge") supports Class 3 but its
identity with "Southwest Ridge" isn't certain and the page sits behind a login; needs a human with
full access or a Beckey's guide excerpt. Its `access.fees`/`parking_pass`/`passRequired` fields
directly contradict each other on whether a pass is required at the Nooksack Cirque Trailhead --
confirmed data-integrity defect, but no source pinned down which value is right. Its `pitches` (0)
alongside a graded Class 4 section, and `alpine_grade` "PD" on a non-glaciated scramble, are both
internally odd but not independently checkable facts. Its route identity itself is unresolved --
this row's own `corrections` field already documents that no source names an exact "Southwest
Ridge" on Sefrit; the closest match (bivouac's "West Ridge") may or may not be the same line. North
Face's `fa` attribution (Fasset/Hanft/Thompson) rests on a name with no independent corroboration
found; a low-reliability search snippet crediting Fred Beckey may be conflating this with his
Price Glacier FA on the same peak -- needs direct Beckey's guide or CascadeClimbers FA-wiki access
(both egress-blocked). Its `approach`/`itinerary`/`dist_km` blend two real but different approach
variants (the short White Salmon Road approach vs. the multi-day Fisher Chimneys/Lake Ann
approach) into one inconsistent narrative -- needs a human decision on which variant this record
should describe before the fields can be reconciled. Its `length_m` (914/~3,000ft) is ~15-20%
off this same row's own itinerary text ("roughly 2,500-2,600 ft"). Its `access.land_manager`
names NPS alone where the sibling Northwest Arete route documents the same peak's dual USFS/NPS
manager split explicitly -- likely incomplete rather than wrong. Northeast Ridge's `fa` is null
with no source found either way -- plausibly correct as an unrecorded informal finish rather than
a gap. Northwest Arete's route identity is genuinely ambiguous: an AAI page title references a
separate "Northwest Rib" (FA Cruver/Davis, 1974) with different stated boundaries than the
SummitPost "Northwest Arete" page this row's data otherwise matches almost verbatim -- unclear
whether these are the same line under two names or two distinct lines; needs direct Beckey's guide
access to resolve. Its `commitment` field ("10-12 hours, Serious") looks like schema misuse -- every
other route in this batch stores a Roman-numeral grade there instead -- flagged for the data team,
not a fact error. Fisher Chimneys' `fa` (a specific six-person 1920s-40s party) has zero external
corroboration in any source reachable this run -- needs Mountaineers club archive access to verify
before trusting it. Hanging Glacier's `gain_ft`/`loss_ft` (4430/6000) show an unusually large
~35% asymmetry for a there-and-back route with no source found to confirm or correct either
number; it also carries a duplicate waypoint (two identical "Hanging Glacier" entries at the same
coordinates, one typed "Junction" and one "Feature") -- a data-hygiene item, not necessarily a
factual error.

Clean: FA facts, coordinates, elevations, permit/fee figures, and internal consistency checks not
called out above across all 8 routes -- see full per-route detail in the researching agents'
reports (not reproduced here to keep this log terse).

## Batch 89 (pass 2) -- 2026-08-09

Checked: eight routes across four peaks -- Mount Shuksan (Price Glacier, Sulphide Glacier, White
Salmon Glacier), Mount Spickard (Silver Glacier, Southwest Route/Silver Lake), Mount St. Helens
(Monitor Ridge, Worm Flows), and Mount Steel (First Divide). Researched via 4 parallel agents
grouped by peak. WebFetch was blocked by the network egress proxy for every external domain tried
again this run; findings lean on cross-corroborated WebSearch snippets citing WTA, USFS, NPS,
Mount St. Helens Institute, USGS CVO, Mountaineers.org, SummitPost, Wikipedia/USGS GNIS, and
trip-report sites (trailcatjim.com, havetent.com, ericsbasecamp.net), same standard as prior
batches. Also cross-checked several fields against sibling routes already corrected in this
dataset (Shuksan's 9,131 ft summit, confirmed in batch 88).

Fixed (16): Price Glacier's `descent` field described down-climbing the Price Glacier itself,
directly contradicting this same row's own `descent_text` ("NOT back to the Ruth Creek car") and
`pro_tips` ("never reverse the Price") -- rewritten to summarize the row's own documented
Fisher-Chimneys-or-Sulphide exit; its `loss_ft` (6000) didn't sum from its own
`itinerary.days[].lossFt` (0+2100+3700=5800) -- fixed to 5800. Sulphide Glacier's `dist_km` (8,
doubling to a 9.9 mi round trip) undercounted against multiple independent sources citing ~13-14
mi round trip -- fixed to 10.9 (one-way). White Salmon Glacier had three fixes: `approach_logistics.
peakLat/peakLng` were badly off (~14 mi west, ~2 mi north of Shuksan's actual summit) and
disagreed with the correct coordinates already stored on this same peak's other two routes in this
batch -- fixed to 48.8315/-121.6032; its summit `waypoints[1].elev` (9127) disagreed with the
9,131 ft figure used on the sibling routes -- fixed to 9131; and its `approach`/
`approach_logistics.trailhead` fields described the Lake Ann Trailhead/Austin Pass approach --
that's the Fisher Chimneys route's trailhead, not this one's, and directly contradicted this row's
own `waypoints[0]` and `road` fields, which already correctly describe the White Salmon Road
hairpin approach -- rewritten to match. Spickard Southwest Route had three fixes: `corrections`
claimed "'fa' has been left null" but this row's own `fa` field is populated and externally
corroborated (Fred & Helmi Beckey, 1941) -- the stale sentence was replaced; its summit
`waypoints[6].elev` (8983) disagreed with this same row's own `high_point_ft` (8979) and its own
`corrections` text ("this page uses 8,979 ft") -- fixed to 8979; and `dist_km` (13.7, doubling to
~17.0 mi round trip) undercounted against this row's own `waypoints[6].distMi` (10.3 mi one-way)
and its own itinerary ("roughly 20 miles ... round-trip") -- fixed to 16.6. Monitor Ridge's `fa`
("Unknown") is actually well documented -- USGS CVO credits Thomas J. Dryer, John Wilson, Drew &
Smith, Aug 26 1853 -- fixed; its `beta` conflated two adjacent waypoints, describing the 2.1-mi
Loowit Trail junction as "4,800 feet, gaining 1,000 feet" when this row's own waypoint for that
exact junction gives 4,600 ft / 900 ft gained (the 4,800 ft figure belongs to the next waypoint) --
fixed. Worm Flows had four fixes: `gain_ft` (5563) contradicted its own `loss_ft` (5700) and
`itinerary.days[0].gainFt` (5700) on a route explicitly reversed on descent -- fixed to 5700; its
trailhead `waypoints[0].elev` (2680) contradicted its own `overview`/`beta` text ("2,800 ft") and
was the literal arithmetic source of the gain_ft error (8363-2800=5563) -- fixed to 2800; `aspect`
(W) contradicted its own `face` field ("south-southwest side") and an independently-sourced
south-facing description -- fixed to SW; and `seasonal_hazards.avalanche.zone` ("Mount St. Helens
(NWAC forecast zone)", not a real NWAC zone name) contradicted its own `climate.forecastZone`
field, which already correctly names "West Slopes South" -- fixed to match. Mount Steel's First
Divide route had one linked error across three fields: `beta`/`approach`/`dist_km` all cited 12.7
mi to First Divide, but WTA, ProTrails, and The Mountaineers' route page independently give 13.1
mi -- all three fixed together (dist_km 20.4 -> 21.1).

Flagged rather than fixed (19): Steel's trailhead elevation ("about 785 ft") and derived `gain_ft`
(5440) sit in tension with WTA's cumulative-gain figure (3,568 ft) in a way that looks arithmetically
off, but no authoritative trailhead elevation was found to source a specific fix; its `loss_ft` is
null on an out-and-back route -- a completeness gap, not a sourced error. Silver Glacier's
`length_m`/`pitch_detail[].lengthM` values arithmetically equal vertical gain (not slope distance)
for every pitch -- a field-semantics question, not a numeric error with a known correct value.
Spickard Southwest has six open items: contested summit elevation (8,979 vs a newer LIDAR 8,978 ft
not yet reflected in `corrections`); `overview`'s "Tertiary-age gneiss" composition claim
(mixed/unconfirmed); an unconfirmed "3 miles toward Mount Redoubt" glacier-length claim; an
unconfirmed "over a mile" Silver Glacier length claim; a self-contradicting `access.passRequired`
("Trail Park Pass," not standard WA/NPS terminology) that couldn't be resolved via search; and a
~60 ft internal discrepancy in the Ouzel Lake camp elevation between a waypoint and two itinerary
notes. Price Glacier's `waypoints[0].elev` (Nooksack Cirque trailhead, 2200 ft) looks ~350 ft low
against synthesized search results, but wasn't confirmed enough to fix. Sulphide Glacier's
mileage-to-camp figures disagree three ways internally (waypoint distMi 4, itinerary miles 5,
approach-text "7-8 miles") with no primary source found to reconcile them; its day-1 `gainFt`
(3200) looks low relative to the row's own corrected total gain and external sourcing, but
apportioning the fix across days needs a primary source. White Salmon Glacier's FA
("Piley/Richards/Thompson, 1926") is already self-flagged as uncertain and stays that way; its
`description` ("Gains 2,000 ft") reads misleadingly next to `gain_ft` (7500) but may describe only
the final glacier segment; its `dist_km` may be low against one Strava listing, uncorroborated by a
second source; and its corrected-adjacent `waypoints[0].elev` (3650) sits within normal
guidebook-variance of a 3,400-3,450 ft cluster from search. Monitor Ridge's and Worm Flows'
`length_m` fields (1086 / 1421) don't surface in the UI for `discipline: "mountaineering"` and have
no apparent basis given null `pitches`/rope fields on both rows -- needs a human call on intended
semantics before either is touched. Worm Flows' `dist_km` (8, doubling to ~9.9 mi) is undercounted
against this row's own itinerary ("roughly 12 miles roundtrip") and its own summit waypoint distMi
(5.4 mi one-way), but sources disagree enough on the exact figure (10.8-12 mi) that a specific
replacement wasn't fixed -- also notable that Monitor Ridge and Worm Flows, two different-length
routes, shared the identical `dist_km: 8` before this batch, suggesting a copy/paste origin.

Clean: FA facts, coordinates, permits/fees, land-manager text, and internal consistency checks not
called out above across all 8 routes -- see full per-route detail in the researching agents'
reports (not reproduced here to keep this log terse).

## Batch 90 (pass 2) -- 2026-08-09

Checked: eight routes across two peaks -- Mount Steel (Standard Scramble) and Mount Stuart
(Cascadian Couloir, Girth Pillar, Ice Cliff Glacier, North Face, North Ridge, Stuart Glacier
Couloir, The Gendarme). Researched via 3 parallel agents grouped by peak (Steel x1; Stuart
Cascadian/Girth Pillar/Ice Cliff Glacier x3; Stuart North Face/North Ridge/Stuart Glacier
Couloir/Gendarme x4), citing Wikipedia, SummitPost, Mountaineers.org, USFS Wenatchee River/Cle
Elum/Hood Canal Ranger Districts, Recreation.gov, AAI route profiles, and guidebook-derived trip
reports, same standard as prior batches. North Face was left untouched -- already self-flagged
(`verif.status: unverified`) as a likely duplicate of the real Ice Cliff Glacier route, and this
pass confirmed no independently-sourced "North Face" line exists on Stuart in any source checked.

Fixed (17): Mount Steel's `dist_km` (80.47) stored the already-doubled round-trip mileage instead
of the one-way figure the app convention doubles for display -- fixed to 25 mi = 40.23 km per the
row's own waypoints. Its `approach_logistics.trailhead` named the Staircase Trailhead even though
the route's own name, waypoints and beta text (which notes the Staircase/First Divide line is
currently closed by Bear Gulch Fire damage) all point to the Duckabush Trailhead -- corrected to
match. Cascadian Couloir had four fixes: `fa` ("Samuel Gannett, 1895") had zero corroboration
anywhere, while Wikipedia/SummitPost independently credit Frank Tweedy's 1883 solo ascent (with
Richard Goode two days later) via the same south-gully line as today's route; `dist_km` (19.3, the
row's own round-trip mileage per its `totalNote` and final waypoint) was doubling again on display
-- fixed to the one-way 9.66 km; `high_point_ft` (9416) disagreed with its own summit waypoint and
the area row's canonical 9415; and waypoint 0's trailhead elevation (3200) contradicted its own
approach text ("~4,243 ft") and external sources -- fixed to 4243. Girth Pillar and Ice Cliff
Glacier shared the same `dist_km` round-trip-stored-as-one-way bug (24.14, both routes' own
totalNote gives 15 mi round trip) -- both fixed to 12.07 km one-way. Girth Pillar's summit waypoint
`elevFt` (9416) and `length_m` (610, not matching the sum of its own 11 `pitch_detail.lengthM`
values = 455) were also fixed. Ice Cliff Glacier's `access.notes` ("No specific climbing permit")
flatly contradicted its own `permit` field and its Girth Pillar sibling -- the Stuart Lake
Trailhead approach sits inside the Enchantment Permit Area's Stuart Zone and needs the same May
15-Oct 31 lottery permit for overnight stays; found the identical wrong text on Stuart Glacier
Couloir's `access.notes` by direct comparison while fixing this one, and fixed both. North Ridge's
`pitches` (20) contradicted its own 18-entry `pitch_detail` array and its own overview text
("roughly 18 pitches"). Its `fa` field self-contradicted its own `overview`, which correctly names
Rupley & Gordon (not "Don Claunch") for the 1956 FA and separately credits Wickwire & Stanley's
1964 direct Gendarme ascent (which the old `fa` value omitted entirely, misattributing the
Gendarme's first ascent to the 1970 Hargis/Ossiander line instead) -- rewritten to keep all four
real, distinct events (1956/1963/1964/1970). Stuart Glacier Couloir's `gain_ft` (6015) didn't sum
from its own itinerary days (2600+3400=6000) and was exactly the sibling North Ridge row's figure,
a likely copy-paste bleed -- fixed to 6000, matching its own `loss_ft`. The Gendarme's `descent`
described "retracing the ascent when possible," contradicting its own `descent_text` (Cascadian
Couloir exit) and the sibling North Ridge row's `bail` notes (retreat above the Gendarme is
committing, rarely attempted) -- rewritten to match; its null `fa` was filled with the same
Wickwire & Stanley 1964 date now consistent with the corrected North Ridge row.

Flagged rather than fixed (13): Mount Steel's area-row `parent_peak` ("White Mountain") looks wrong
against external sources (should be Mount Duckabush) but sits on the `areas` table, outside this
route-scoped audit's mandate. Minor aspect-wording imprecision and an acknowledged-estimate summit-
day mileage split were also left alone. Cascadian Couloir's itinerary day-by-day gain/loss (sums to
5175/5175) sits in tension with its own top-level gain_ft/loss_ft (8100/8100, which itself looks
right against the double-Longs-Pass-crossing profile) -- no confident source to redistribute the
per-day split. Its waypoints/gpx track for the Lake Ingalls/Longs Pass section don't match its own
approach prose or the trailhead's own logistics coordinates, possibly sourced from the wrong trail
entirely -- needs a re-derived track, not a field patch. Girth Pillar and Ice Cliff Glacier's shared
"Stuart Lake Trailhead" waypoint elevation (3,400 ft) disagrees with Girth Pillar's own approach
text (~3,540 ft) and external sources (~2,930 ft) three ways, with no clearly authoritative pick.
Girth Pillar's gain/loss vs. itinerary sum (16-200 ft off) was within the row's own already-declared
LOW confidence and not treated as a confident error, nor was its unconfirmed-but-uncontradicted 1983
FA year. Ice Cliff Glacier's `length_m` (610, identical to Girth Pillar's since-fixed wrong value,
with no per-pitch data to check it against) was flagged rather than guessed at. North Ridge's
`approach` narrative calls the north Stuart Lake approach "primary" while its own waypoints/gpx and
loop shape only close cleanly via the south (Esmeralda/Longs Pass) side -- needs an editorial call
on which variant the stored track represents. Its `length_m` (853) doesn't sum from its own
pitch_detail (755m, ~13% gap, no clear source for either). North Ridge and Stuart Glacier Couloir's
`dist_km` values read as round-trip mileage per their own itineraries rather than the documented
one-way convention -- consistent with the ~61 known exceptions CLAUDE.md already warns not to bulk-
normalize, so left untouched pending a per-route call. The Gendarme's `commitment` field stores "IV"
(the full North Ridge's grade) on its own 2-pitch sub-feature -- a likely schema-misuse pattern
flagged in prior batches, not a fact error fixed here.

Clean: elevation/coordinates for both peaks (Steel 6,225 ft; Stuart 9,415 ft, matching every route
row and the area rows exactly), FA facts for Stuart Glacier Couloir and Ice Cliff Glacier, permit/
access boilerplate aside from the two access.notes fixes above, false-summit-vs-true-summit
handling on North Ridge and The Gendarme (no elevation conflation despite this being a known
recurring bug shape on this peak), and gain_ft/loss_ft-vs-itinerary sums for Steel, North Ridge and
Ice Cliff Glacier -- see the researching agents' reports for full per-route detail (not reproduced
here to keep this log terse).

## Batch 91 (pass 2) -- 2026-08-09

Checked: eight routes across four peaks -- Mount Stuart (West Ridge, closing out this peak), Mount
Teneriffe (Kamikaze Trail, Standard Route), Mount Terror (North Face, East Ridge/"Southeast Face",
Stoddard Buttress, West Ridge), and Mount Thomson (West Ridge). Researched via 4 parallel agents
grouped by peak, citing SummitPost, Mountaineers.org, Mazamas, FastestKnownTime.com, WTA, dnr.wa.gov,
AAC Publications/AAJ, Mountain Project, and CascadeClimbers.com trip reports -- same standard as prior
batches. WebFetch to most of these domains was blocked by this session's egress proxy, so findings
rest on WebSearch result snippets rather than full-page reads throughout this batch.

Fixed (5): Mount Stuart West Ridge's `dist_km` (32.2) implied a phantom ~40 mi round trip on display,
matching neither its own itinerary text (~16.5 mi) nor any external source -- a FastestKnownTime.com
GPS track of the same loop and this row's own waypoints both converge on the one-way figure already
used for the sibling Cascadian Couloir route (9.66 km, fixed in batch 90), so applied the same value
here. Mount Teneriffe's Standard Route had its `approach_logistics.trailhead` wrongly set to "Mount
Si Trailhead" -- a separate parking lot ~2.9 mi back down the same road -- contradicting its own
approach text/waypoints and its Kamikaze Trail sibling; confirmed via WTA/DNR/Snoqualmie Valley
Record coverage these are two distinct trailheads, not alternate names for one, and corrected to
"Mount Teneriffe Trailhead." Mount Terror's East Ridge (stored under the `wa_mount_terror_southeast_
face` id) had a `descent` field describing a reversal of the ascent, contradicting its own
`descent_text`/`bail` fields and external sources (SummitPost, Mountain Project), which agree every
route on this peak descends via the West Ridge gully into Crescent Creek Basin -- rewritten to match.
Stoddard Buttress's `fa` field described two separate climbs (a July 16 1984 solo ascent plus a
distinct "1985 left-side variant"), but AAC Publications' own synopsis of "Mount Terror, North Face,
Left Side" describes one continuous solo ascent, July 14-17 1984 -- the AAJ writeup appears in the
1985 volume only because AAJ volumes cover the prior season, not because of a second climb -- rewritten
as the single event sources support. Mount Thomson West Ridge's `itinerary.days[0].gainFt/lossFt`
(3600) turned out to be the actual bug, not the top-level `gain_ft`/`loss_ft` (5200) as initially
suspected from a naive trailhead-to-summit elevation diff: a FastestKnownTime.com route page with
matching waypoints and a corroborating WTA trip report both put the real cumulative gain/loss for this
undulating PCT approach (over Kendall Ridge Saddle, Kendall Pass, past Ridge Lake and Bumblebee Pass)
at ~5,200 ft, so the itinerary day was corrected to match the top-level fields instead.

Flagged rather than fixed (8): Mount Stuart West Ridge's commitment grade ("III") is split across
sources -- Mazamas' own route page supports III (matching the stored value) while Mountaineers.org and
spokalpine.com list II -- left as-is, no clear tiebreaker. Its own itinerary text's "~16.5 mi" total is
higher than the best-sourced external figure (~12 mi via FastestKnownTime); only the `dist_km` field
itself was fixed, the prose was left for a human call. Mount Teneriffe Kamikaze Trail's `dist_km`
(5.95) reads roughly 8-13% short against both its own waypoints (4.1 mi one-way) and the most-repeated
external figure (8 mi round trip on AllTrails/aggregators), but sources on this route are inconsistent
enough (ranging 6.5-14 mi) that no single figure could be called authoritative. Mount Terror's East
Ridge/"Southeast Face" id-vs-name mismatch (already self-flagged in the row's own `corrections` field)
remains unresolved -- sources use both names for what appears to be the same line, so no rename was
made; its `fa` field stays null, no source gives a route-specific FA distinct from the 1932 whole-peak
FA. Stoddard Buttress's commitment grade ("IV") could not be confirmed as specific to this route versus
the older North Buttress line (sources split III/IV between the two). Mount Terror West Ridge's null
`fa` may in fact be fillable with the 1932 Degenhardt/Strandberg whole-peak FA (one source describes
that ascent's line as matching today's West Ridge), but nothing confirms today's route is precisely the
1932 line rather than a later reconstruction -- left null pending a Beckey's guide check. Mount Thomson
West Ridge's `fa` ("Fred Beckey, Helmy Beckey, Robert Craig & William Ford, 1940") could not be
confirmed or refuted -- "William Ford" turned up in zero sources anywhere in connection with Beckey,
Craig, or 1940 Cascades climbing, and the primary sources most likely to carry the real FA line
(Beckey's guide, Mountaineers.org) were unreachable this pass; needs a human with direct access to
those sources.

Clean: elevation/coordinates for all four peaks (Stuart 9,415 ft; Teneriffe 4,788 ft; Terror 8,151 ft;
Thomson 6,554 ft, matching every route row and area row exactly), Mount Stuart West Ridge's FA and
gain/loss figures, Mount Teneriffe's land-manager correction (WA DNR, already fixed in a prior pass)
and Kamikaze Trail's gain_ft, Mount Terror North Face's FA/grade/distance figures and West Ridge's
description/grade, and Mount Thomson's grade/pitch-count/elevation -- see the researching agents'
reports for full per-route detail (not reproduced here to keep this log terse).

## Batch 92 (pass 2) -- 2026-08-09

Eight routes across six peaks: Mount Tom (Glacier/Scramble Route), Mount Torment (South Ridge,
Torment-Forbidden Traverse), Mount Triumph (Northeast Ridge), Cathedral Peak/Pasayten (NE Ridge,
stored under the generic id `wa_ne_ridge`), Needle Peak (North Ridge), Snowfield Peak (Neve
Glacier/West Ridge), and North Early Winters Spire (Northwest Corner / Boving-Pollack, stored under
the generic id `wa_news_nw_corner`). Researched via 4 parallel agents grouped by peak. WebFetch to
essentially every primary-source domain (nps.gov, mountainproject.com, summitpost.org,
mountaineers.org, wikipedia.org, theCrag) was blocked by this session's egress proxy, same as every
recent batch, so findings rest on WebSearch result snippets rather than full-page reads throughout.

**Fixed (4) -> `sql/2026-08-09-batch-92.sql`:** Needle Peak's `permit` field described the North
Cascades NP backcountry-permit system, contradicting its own `access.landManager` ("Okanogan-Wenatchee
National Forest") and external sources placing this Dark Peak/Bonanza-ridge objective in the Glacier
Peak Wilderness -- corrected to a free self-issue USFS wilderness permit, the same permit *type*
already correctly stored on this batch's Cathedral Peak row, just previously wrong on this peak.
Mount Torment's Torment-Forbidden Traverse had `alpine_grade` ('D') contradicting its own `commitment`
('IV') and `grade` ('Grade IV, 5.6') -- a pure in-row inconsistency, confirmed against the sibling
South Ridge row where the two fields agree -- corrected to 'IV'. Snowfield Peak's Neve Glacier/West
Ridge had `access.notes`/`access.rules` contaminated with unrelated content: a Northwest Forest Pass
claim naming "Mount Tom area" (a different, Olympics peak) that contradicted this row's own
`access.passRequired`, plus Boston Basin-specific camping/group-size rules (Boston Basin is the
Forbidden/Sahale/Eldorado corridor, not Snowfield's Highway 20/Pyramid Lake corridor) -- the wrong
notes text was rewritten and the unrelated rules/group_limit deleted rather than guessed. North Early
Winters Spire's NW Corner route said "six" bolted West Face rappel stations in three separate fields
(`rappels`, `descent_text`, `pro_tips`), contradicting its own `rappel_count_note` ("four bolted, not
six, plus one tree rappel") and a North Cascade Mountain Guides route page describing four bolted
stations -- all three fields corrected to match.

**Flagged rather than fixed (12):** Cathedral Peak's `dist_km` (27.4, one-way) looks short against its
own waypoint data (a 20 mi trailhead-to-summit figure) and the already-confirmed 18 mi just to reach
the pass below it -- no authoritative single trailhead-to-summit mileage found to set a specific
correct value. Its `stars` (null) contradicts its own `corrections` field, which claims a verified
2-star rating. Mount Triumph's `high_point_ft` (7270) conflicts with Wikipedia's 7,240+ ft, while a
"Picket Twelve" summit list matches the stored 7270 exactly -- a genuine cross-source conflict, not a
typo. Its area placement under `wa_picket_range` is also disputed in the climbing literature (some
sources treat Triumph as merely adjacent to the Pickets, others as one of the "Picket Twelve"). Mount
Tom's own `itinerary.sourceNote` cites "69.2 km/43mi" while the stored `dist_km` (33.8) and day-by-day
itinerary both converge on 42.0 mi -- a small internal citation mismatch. Both Mount Torment routes
store an identical `dist_km` of 4.8, which is inconsistent with each route's own waypoint distances
(4.6 mi and 6 mi one-way respectively) and, for the traverse, its own 11.5 mi itinerary sum -- looks
like a copy/placeholder value on one or both rows, but the correct one-way figure needs re-derivation,
not a guess. The traverse's `high_point_ft` (8815, Forbidden Peak's elevation) disagrees with the South
Ridge's `high_point_ft` (8120, Mount Torment's own elevation) under the same `area_id` -- both are
individually correct for the peak they describe, but which one a "traverse" row should report needs a
schema-intent decision, not a data fix. The traverse also self-contradicts on a waterfall-slabs
fatality claim: `obj_haz`/`descent_text` assert it while `rappel_detail` says it was investigated and
retracted as unsupported -- research turned up a real 2013 NPS-documented fatality in the same descent
system (different exact wording), so the retraction itself may have been too hasty; needs a careful
human re-review rather than either accepting or removing the claim outright. Needle Peak's area
placement under `wa_stehekin` is questionable given it's actually Glacier Peak Wilderness/USFS land
reached via Stehekin, not NPS Stehekin district itself -- depends on whether that branch is a
jurisdictional or a merely-geographic bucket. Snowfield Peak's `fa` (Degenhardt & Strandberg, Aug 1931)
is well corroborated by secondary sources for the peak generally, but no source directly confirmed the
FA specifically climbed today's class-3/4 west-ridge finish rather than some other exit line. North
Early Winters Spire's summit waypoint sits 50-100m from the one external coordinate found, which is
for the shared spire massif rather than the north spire specifically. Its `dist_km` (8.4) converts
suspiciously close to the row's own round-trip mileage rather than the required one-way value -- a
likely convention error, but per this codebase's standing caution against ad hoc edits to `dist_km`,
routed to `audit:distances` for review rather than a manual SQL fix. Its area path segment
`wa_hwy20_ncnp` may misleadingly imply NPS jurisdiction for a peak confirmed (by this row's own access
data) to sit entirely in Okanogan-Wenatchee National Forest.

**Clean:** elevation/coordinates for Mount Tom, Mount Torment, Cathedral Peak, and Snowfield Peak (all
matched published figures/coordinates closely); Mount Tom's FA, grade, and trail waypoint mileages;
Mount Triumph's FA, technical grade hedge, and permit/contact info; Mount Torment South Ridge's FA,
grade, gain/loss, and permit text; the traverse's FA (confirmed to be the *same* 1958 Cooper/Sellers
event as the South Ridge, not a separate ascent, resolving the audit's initial suspicion) and its 2026
NPS reservation-lottery details; Cathedral Peak's permit type and area nesting; Needle Peak's entire
FA/beta narrative (near-verbatim corroborated by an AAC Publications account of the same trip); North
Early Winters Spire's FA, grade, and permit/land-manager text (correctly distinguished from Snowfield's
NPS regime) -- see the researching agents' reports for full per-route detail (not reproduced here to
keep this log terse).

## Batch 93 (pass 2) -- 2026-08-09

Eight routes across seven peaks: Nooksack Tower (Beckey-Schmidtke Route, South Face), Lexington
Tower (North Face), Concord Tower (North Face Var. Right/Directisimo), Castle Peak ("Fight or
Flight"), North Gardner Mountain (Northwest Couloir), Whatcom Peak (North Ridge), and Cutthroat
Peak (North Ridge). Researched via 4 parallel agents grouped by peak. WebFetch to essentially
every primary-source domain (nps.gov, mountainproject.com, summitpost.org, mountaineers.org,
wikipedia.org, AAC Publications, theCrag) was blocked by this session's egress proxy, same as
every recent batch, so findings rest on WebSearch result snippets rather than full-page reads
throughout.

**Fixed (7) -> `sql/2026-08-09-batch-93.sql`:** Both Nooksack Tower routes' first waypoint (and
matching GPX point), labelled "Nooksack Cirque Trailhead," sat about a mile from the real
trailhead -- each row's own `approach_logistics` field already had the correct coordinates,
confirmed against Trailforks, so the waypoint/gpx were just never updated to match. Concord
Tower's Directisimo variant had `length_m` (91) contradicting its own `pitch_detail` sum (120m)
and its own `itinerary.sourceNote` citation of "120 m" from SuperTopo -- 91 is the exact
`length_m` of sibling route wa_north_face_3, a copy-paste value never updated. The same
Directisimo row's Blue Lake Trailhead waypoint elevation (5200) contradicted external sources,
its own approach text ("~5,400 ft"), and the same trailhead point correctly stored as 5400 on
its sibling route. Castle Peak's "Fight or Flight" had a `road` field describing Stehekin
ferry/floatplane access -- unrelated content from a different, Lake Chelan-area peak entirely;
corrected using this row's own already-verified `approach` text (BC Hwy 3/Manning Park or SR-20
to Ross Dam). North Gardner Mountain's Northwest Couloir route had `approach_logistics` pointing
to Wolf Creek Trailhead, the approach for this peak's separate standard south route, when the
route's own name, approach, beta and waypoints all describe the Cedar Creek Trailhead
exclusively. Whatcom Peak's `areas` row (not either audited route) had lat/lng about 0.4 mi off
from the Wikipedia/GNIS-cited summit -- the sibling route's own summit waypoint already had the
correct value.

**Route-identity check (the reason this batch's Castle Peak route drew closer scrutiny):**
`wa_north_face_left_buttress` is a name-derived id, the exact pattern CLAUDE.md flags as
error-prone, so this pass specifically re-verified peak attribution via AAC Publications and
Alpinist sources before trusting anything else on the row. "Fight or Flight" (Herrington/Hirst,
Aug 2008) is correctly placed on Castle Peak -- no area_id mismatch, only the contaminated `road`
field above.

**Flagged rather than fixed (14):** Cutthroat Peak's elevation has two credible, differently-
sourced values in circulation -- 8,065-8,066 ft (Wikipedia/GNIS/Peakbagger, matching the stored
`prominence_ft`) vs. 8,050 ft (ListsOfJohn/SummitPost, tied to a documented north-peak/south-peak
naming ambiguity on the mountain itself) -- and the route's own `high_point_ft` (8065) and
waypoint `elevFt` (8050) disagree as a result; no canonical source to pick a winner. Whatcom
Peak's 1936 FA spelling ("Buchanan" vs. "Buchanen") remains unsettled across the route, its
parent area row, and Wikipedia itself -- the prior pass's "flagged, not applied" stance stands,
now with the added wrinkle that the route's own `data_quality.gaps` text describes an on-file
"Buchanen" spelling that isn't actually what's stored. Concord Tower's summit elevation (7,560 ft
per Mountain Project/WTA/Mountaineers.org vs. 7,611-7,612 ft per ListsOfJohn's LiDAR data) is a
genuine, still-unresolved guidebook-era-vs-LiDAR-era conflict already disclosed in the area's own
blurb. Lexington Tower's area-tree placement skips the "Liberty Bell Group" node that sibling
Concord Tower is nested under, despite both peaks' own text describing themselves as part of that
group -- flagged rather than reparented, since any area-tree change has `route_count` rollup
implications a same-value SQL guard can't protect against. Castle Peak's Frosty Mountain/Lightning
Lake trailhead elevation (3,900 ft on file vs. ~4,090-4,110 ft in published sources, a ~200 ft
gap) and the exact year of the "1993 Colorado Route" it references could not be independently
pinned down. Nooksack Tower's Beckey-Schmidtke route has three mutually disagreeing trailhead
elevations across its `waypoints`, `approach` text, and `gain_ft`-implied value (2,200 / 2,550 /
~2,150 ft), a summit-day hour total that doesn't cleanly reconcile with its own day-by-day
itinerary, and a ford waypoint about a mile from the coordinates named in its own approach
prose -- resolving any of these needs a human call on which "trailhead" or "ford" the field is
meant to represent, not a guess. The South Face route on the same tower carries three
mutually-qualifying permit statements (`permit`, `access.permit`, `access.rules`) and two
disagreeing land-manager fields in the same `access` object. Concord Tower's Directisimo variant
has a `rope_note` whose cited grades (5.6/5.7/5.6+/5.7) don't cleanly match its own pitch_detail
grades (5.6/5.8/5.7) -- plausibly describing the shared standard-route pitch 1 rather than this
variant, worded ambiguously enough not to call outright wrong. Its 2026 SR-20 seasonal-closure
date range ("April 15-25 opening") reads as stale for the actual 2026 season (storm-damaged
reopening pushed to June 14), though the field itself hedges with "typical" so it isn't strictly
false.

**Clean:** elevation/coordinates for Nooksack Tower (8,285 ft), Lexington Tower (7,560 ft),
Whatcom Peak's route-level waypoint (7,574 ft, matching the peak's own area row), and North
Gardner Mountain (8,956 ft); FA records for both Nooksack Tower routes (Beckey/Schmidtke 1946,
Klubberud/Manfredi 2002), Lexington Tower's North Face (Kelley/McGowan 1954), Castle Peak's
"Fight or Flight" area/FA history, and Cutthroat Peak's North Ridge (Beckey/Crooks/Kenney 1940,
now corroborated across more independent sources than the prior pass credited); grade/pitch data
for all eight routes; North Cascades NP backcountry permit fee text (both Nooksack routes,
Whatcom Peak); Northwest Forest Pass fee text and land-manager info for the Washington Pass
routes and Cutthroat Peak -- see the researching agents' reports for full per-route detail (not
reproduced here to keep this log terse).

---

## 2026-08-09 — Pass 2, Batch 94

Eight peaks, 8 routes: North Ridge (Primus Peak); Northeast Buttress (Colchuck Peak); Northeast
Face Direct (Mount Formidable); Northeast Ridge/1963 Route (Johannesburg Mountain); Northwest
Arete (Argonaut Peak); Northwest Buttress (Sloan Peak); Northwest Face (Kangaroo Temple);
Northwest Face/Falcon Route (Little Big Chief Mountain).

**Confirmed errors -> fixes in `sql/2026-08-09-batch-94.sql`:**
- Primus Peak's North Ridge carried an internal date contradiction: the route's own `fa` field
  and `overview` text both said Mark Bebie's first ascent was 1986, but its `beta` field said
  "September 7, 1987." AAC Publications' AAJ 1987 volume (Washington-Cascades section) carries
  the trip report for this exact solo ascent -- AAJ annuals report the PRIOR year's climbs, and
  other Bebie entries in the same 1987 volume are independently dated 1986, confirming the
  editorial pattern. Corrected the `beta` field's year only; `fa`/`overview` were already right.
- Kangaroo Temple's Northwest Face stored `pitches = 5`, but its own `pitch_detail` array (P1-P5)
  stopped one pitch short of what its own `rope_note` field said ("6-pitch 5.7+ face route").
  Mountain Project, Mountaineers.org, and a Spokalpine trip report all independently give 6
  pitches. Fixed the scalar `pitches` field; did not fabricate a P6 entry for `pitch_detail`
  (grade/notes for the missing pitch aren't sourced) -- flagged below instead.
- Little Big Chief Mountain's Northwest Face (Falcon Route) `approach` text named "Dutch Miller
  Gap Trailhead" as the drive-to starting point, but a USFS gate installed in 2007 ended vehicle
  access there -- the real modern drive-to point is Dingford Creek Trailhead, which this same
  route's own `waypoints` field already names correctly. Confirmed via WTA trip reports and USFS
  trailhead pages; the stored 14-15 mile approach figure is consistent with measuring from
  Dingford Creek, reinforcing it as the actual described start. Corrected the `approach` text.

**Flagged for human review (not auto-fixed):**
- Kangaroo Temple's `pitch_detail` array is missing its 6th pitch (see above) -- needs a sourced
  grade/description for P6, not a guess.
- Argonaut Peak's Northwest Arete `access` object (fees/notes/permit/closures/parking_pass) all
  describe a completely different, unrelated approach (Ingalls Creek/Longs Pass from the
  Teanaway, non-quota) than the one this route actually uses -- its own `approach` text,
  `waypoints`, `road`, and top-level `permit` field all consistently describe the Stuart Lake
  Trailhead / Enchantment Permit Area approach instead. The mismatch looks like content
  copy-pasted from a different Teanaway-area route. Not auto-fixed: correcting it means
  replacing five JSON keys and the exact current Enchantment quota-permit cost figures weren't
  independently re-confirmed this pass, so a guessed dollar amount risked introducing a new
  error rather than fixing one.
- Primus Peak's stored prominence (843 ft) matches neither Wikipedia (828 ft) nor PeakVisor
  (856 ft) and those two disagree with each other by 28 ft; the actual authoritative prominence
  databases (ListsOfJohn/Peakbagger) weren't reachable this pass.
- Colchuck Peak's Northeast Buttress FA remains genuinely undocumented after another dedicated
  search (Beckey's guide references, Mountain Project, SummitPost, AAI, CascadeClimbers, AAJ) --
  the route's existing "not documented, pending a source" stance is accurate and was left as-is.
- Johannesburg Mountain's Northeast Ridge (1963 Route) FA party is likewise still unsourced
  after a dedicated search; also unable to independently re-verify its stored grade/pitch
  count/length (5.7+, IV, 12 pitches, ~4,000 ft) due to source-access limits this pass.
- Mount Formidable's Northeast Face Direct: FA surname ambiguity in what could be retrieved
  ("Loren Campbell" vs. "Loren Klubberud") couldn't be resolved without reading the primary
  SummitPost/AAJ text directly; stored pitch count (11) falls within SummitPost's own titled
  range ("8-12 Pitches") but isn't independently pinned down.
- Sloan Peak's Northwest Buttress FA ("M. Preiss & M. Bunker, 2000") could be neither confirmed
  nor contradicted -- no source found supports the previously-corrected "2020" either, so the
  route's existing hedged stance is left as-is. Bedal Creek Trailhead's exact coordinates also
  came back inconsistent across sources and weren't resolved.
- Little Big Chief's FA: AAC Publications confirms Jeff Hansell and the September 10, 2001 date,
  but "Martin Volken" as the second climber wasn't independently re-confirmed (no source found
  contradicting it either).

**Clean:** grade/pitch data, elevation, and coordinates for all eight peaks/routes (Primus 8,508
ft; Colchuck 8,705 ft; Formidable 8,325 ft; Johannesburg 8,200 ft; Argonaut 8,457 ft; Sloan 7,835
ft; Kangaroo Temple 7,572 ft; Little Big Chief 7,225 ft -- all matched independent sources);
permit/land-manager text for Primus, Colchuck, Formidable, Johannesburg, Sloan, and Little Big
Chief; FA party/date for Formidable (month/year), Argonaut (peak's own FA, separate from this
route), Kangaroo Temple (Beckey brothers 1942, confirmed specific to this route, not just the
peak); descent-route descriptions for Colchuck, Johannesburg, and Kangaroo Temple -- see the
researching agents' reports for full per-route detail (not reproduced here to keep this log
terse).

## Batch 95 (pass 2) -- 2026-08-09

Eight routes across seven peaks: South Early Winters Spire (Northwest Face, Boving-Pollock),
Northwest Mox Peak (Standard Route), Dorado Needle (Northwest Ridge), Boston Peak (Northwest
Ridge), Liberty Bell Mountain (NW Face Var., Remsberg Variation), Colchuck Balanced Rock (NW
Ridge), and both Old Guard Peak routes (East Side, Southwest). Researched via 7 parallel agents,
one per peak. WebFetch to essentially every primary-source domain (Mountain Project, SummitPost,
SuperTopo, Wikipedia, NPS, USFS, AAJ, stephabegg.com, trailcatjim.com) was blocked by this
session's egress proxy, same as recent batches, so findings rest on WebSearch result snippets
rather than full-page reads throughout -- treat this batch's confidence as somewhat lower than
usual as a result.

**Fixed (10) -> `sql/2026-08-09-batch-95.sql`:** Dorado Needle's Northwest Ridge -- the peak's
easiest, first-ascent line (3 short pitches) -- was rated `alpine_grade`/`commitment` III, but
BC Adventure Guides, Cascade Mountain Ascents, and spokalpine.com all independently grade it
Grade II, distinct from the peak's harder Southwest Buttress (III+) and East Ridge (III);
corrected to II. That same route's `access` fields implied a per-vehicle NPS entrance fee
("$30/7-day pass", "America the Beautiful ... or per-vehicle entrance fee") -- North Cascades
National Park charges no entrance fee at all (confirmed via NPS-derived sources), so this looks
like content conflated from a fee-charging park; corrected to say no entrance fee applies.
Three routes had `gain_ft`/`loss_ft` figures that didn't reconcile with their own
`itinerary.days[]` breakdowns (a self-verifiable arithmetic check, not an external-source one):
Dorado Needle's NW Ridge (7000/7000 -> 6400/6400, matching its own `itinerary.totalNote`),
Northwest Mox Peak's Standard Route (`gain_ft` 5450 -> 7000), and Old Guard Peak's Southwest
Route (`loss_ft` 14100 -> 12400). Boston Peak's Northwest Ridge `fa` field said "July 2018" while
the same route's `overview`/`beta`/`itinerary` all said August 2018, and AAJ's own indexed record
of the Boyce-Willis "Boston Marathon" enchainment gives August -- aligned `fa` to match. Colchuck
Balanced Rock's `parent_peak` (an area-level field, not a route field) pointed to Colchuck Peak,
but its actual topographic/prominence parent is Enchantment Peak per Wikipedia and PeakVisor --
corrected. Old Guard Peak's Southwest Route had three more internal-consistency errors: its
`itinerary` day-1 note said Cache Col was "~6,100 ft" against the SAME route's own waypoint
(6,903 ft) and approach text ("~6,900 ft"); its Kool-Aid Lake waypoint elevation (6,119 ft) sat
outside the SAME route's own approach text range ("~6,320-6,800 ft"), corrected to 6,320 ft
(AllTrails, the low end of that range); and `emergency.sheriffDispatch` named Skagit County
Sheriff as primary SAR dispatcher despite the peak sitting in Chelan County (confirmed
independently, and already stated correctly on this peak's own East Side Route row) -- aligned
the two routes.

**Flagged rather than fixed (44):** mostly internal inconsistencies and unverifiable specifics
that a blocked-WebFetch pass couldn't resolve independently -- see each researching agent's full
report for detail (not reproduced here to keep this log terse). Notable ones: Colchuck Balanced
Rock's NW Ridge route has `pitches: 0` contradicting its own prose description of "a few pitches"
-- no authoritative count found to supply a replacement. South Early Winters Spire's
Boving-Pollock route resolved a previously-flagged `data_quality.gaps` uncertainty (WebSearch
snippets of a CascadeClimbers.com thread confirm "Boving-Pollock" the route name and "Boving and
Kerns, 1977" the `fa` field describe two real, distinct 1976-aid/1977-free events, not a
conflict) but still carries a genuine internal split between its `rope_type`/`rope_note` (implying
double-rope rappels) and its `descent`/`rappel_detail` fields (explicitly single-rope, 3 raps).
Liberty Bell's Remsberg Variation has a similar `rappels` (3) vs. `descent` (2) mismatch. Boston
Peak's `approach_logistics` peak coordinates sit ~75m from both the area row's and the route's
own summit waypoint -- unclear if intentional. Northwest Mox Peak's `fa` field asserts a specific
1941 Beckey first-ascent date/route for the NW spire that every source found actually documents
for the SE (Hard Mox) spire instead -- this contradicts the row's own `data_quality.gaps`
admission that the NW spire's FA is unconfirmed, but no primary source (AAJ 1942, Beckey's guide)
was reachable to settle it either way, so left as-is rather than guessed at.

## Batch 96 (pass 2) -- 2026-08-09

Checked: Old Snowy Mountain / South Ridge-PCT approach, Mount Olympus / Blue Glacier-Snow Dome
East Face Ramps, Mount Olympus / Summit Block NW Edge Finish, Mount Olympus / Traverse, Unicorn
Peak / Open Book, Ottohorn / Southeast Route, Ottohorn / West Ridge, Overcoat Peak / Southeast
Route.

**Fixed (1):** Ottohorn's West Ridge route claimed the peak's 1961 first ascent (Cooper, Denny,
Firey, Firey, Whitmore) as its own `fa`, stating outright "This route IS the first-ascent line."
Independent sources (the AAC's "First Ascents in the Southern Pickets" and other secondary
accounts) agree that 1961 climb went up the EAST ridge from the Otto-Himmel col -- this peak's own
Southeast Route already attributes it there, correctly hedged. A CascadeClimbers.com trip report
titled "FAs of Beep, Honk, and the West Ridge of Ottohorn 7/25/2017" independently confirms the
West Ridge was a separate, later first ascent; the page itself was unreachable (egress-blocked) so
the exact 2017 party/date could not be confirmed, and `fa` was corrected to remove the false 1961
claim rather than guess a replacement.

**Clean:** elevations, coordinates, land managers, permit/fee info, and first-ascent parties
(where stored) on the remaining seven routes all cross-checked against Wikipedia, NPS/USFS pages,
and peak databases (PeakVisor, Peakbagger, ListsOfJohn) with no discrepancies -- including Mount
Olympus's 7,980 ft summit and its 47.8013N/123.7109W coordinate, which matched to five decimal
places across all three Olympus routes, the area row, and external sources.

## Batch 97 (pass 2) -- 2026-08-10

Checked: Pernod Spire / Standard Rock Route, Phantom Peak / South Route, Phantom Peak / West
Ridge, Point Success / via Success Cleaver, Poltergeist Pinnacle (both the misfiled
`wa_poltergeist_pinnacle` row and its duplicate `wa_poltergeist_pinnacle_north_route`), Primus
Peak / South Ridge, Prusik Peak / Der Sportsman. Eight routes, one research agent per route.
This session's network egress proxy blocked WebFetch to every primary source (Mountain Project,
Wikipedia, CascadeClimbers, AAC Publications, Peakbagger, ListsOfJohn, NPS, USFS) for all eight
agents -- every finding below rests on WebSearch result snippets, not a direct page read. Worth
a follow-up pass once fetch access is restored, especially on the items left flagged rather than
fixed for exactly this reason.

**Fixed (10, `sql/2026-08-10-batch-97.sql`):** Phantom Peak's South Route carried an
`approach_logistics` trailhead and a `road` field naming, respectively, Mount Shuksan's Nooksack
Cirque Trailhead and the Southern Pickets' Goodell Creek access -- neither has anything to do
with Phantom Peak; both corrected to the Hannegan Pass Trailhead / Whatcom Pass approach the
rest of this row's own data already (correctly) uses. Its sibling West Ridge route had the
Marblemount Wilderness Information Center's phone number one digit off (854-7200 -> 854-7245,
matching the South Route's own correct copy of the same office) and an `fa` citation with a
fabricated "Vol. 64" alongside the real AAJ 2022 Issue 96 -- removed rather than guessed at.
Poltergeist Pinnacle: `pitches` said 6 against the row's own 4-entry `pitch_detail` and Mountain
Project's listed 4; fixed to 4. The area row's coordinates were ~270m off from the
Wikipedia-sourced value that was already sitting, correctly, on this same peak's own route
waypoint -- synced. Primus Peak's South Ridge route named the glacier it crosses
"McAllister Glacier" / "North Klawatti/McAllister Glacier" throughout (route name, face,
overview, hazards, pro_tips, watch_out, a waypoint note, timing, itinerary, partner
requirements, seasonal hazards, data-quality notes, and the area blurb) -- two real,
non-adjacent glaciers (Primus is flanked by the North Klawatti Glacier; McAllister Glacier sits
in an unrelated cirque near Dorado Needle) got conflated under one label. Fixed everywhere that
exact mislabel appears; left alone: "McAllister Camp" and "McAllister-Klawatti col," a real,
differently-named feature that turns out to belong to a *different* route entirely (see below).
Prusik Peak's Der Sportsman had a general Alpine Lakes Wilderness group-size figure (12) sitting
inside `access._raw` next to the correct Enchantments-specific figure (8) recorded twice
elsewhere on the same row; a `gain_ft`/`loss_ft` pair (6200/4500) that couldn't both be right on
a round-trip itinerary and didn't match the row's own itinerary breakdown (5400/5400, used
instead); and a `rappels` summary field still saying "single-rope rappel" while every other,
more detailed field on the row (added in a later pass) correctly documents 5-6 rappels.

**Flagged rather than fixed:** Pernod Spire's Standard Rock Route looks like it blends two
different lines under one row -- `beta`/`rock_grade` describe an easy 5.5-5.7 climb while
`pitch_detail` tops out at 5.9 (A0), `aspect`/`face` say "North" but the approach text sends you
to the west face and the itinerary climbs the south face, and three mutually inconsistent
descent accounts exist (`descent`, `descent_text`, and `rappel_detail`) describing three
different ways down. Safety-relevant and not something to guess at from search snippets alone.
Primus Peak's South Ridge route has the same shape, worse: its own `pitch_detail`, `gpx`,
first `waypoints` entry ("Thunder Creek Trailhead"), and `turnaround` field describe a
completely different, independently-documented route -- SummitPost/CascadeClimbers' "East Ridge
via Thunder Creek and Lucky Ridge" -- while `overview`/`approach`/`itinerary`/`road` describe the
real South Ridge/Eldorado approach this row is named for. "McAllister Camp" is real (a Thunder
Creek-side camp, confirming where the mix-up's name collision came from), it just belongs to the
other route. Needs a human to decide whether to split this into two rows. Poltergeist Pinnacle
is flagged for the same reason `wa_poltergeist_pinnacle_north_route`'s `corrections` field
already names it: `wa_poltergeist_pinnacle` (filed under Mount Challenger's area) and
`wa_poltergeist_pinnacle_north_route` (filed under Poltergeist Pinnacle's own area, id
misleadingly says "north_route" though the route and every source call it the East Face) are
the same 2004 Aylward/Murphy first ascent recorded twice. Reparenting or renaming either row
alone would just move the duplicate around; not something to resolve with a text substitution,
and this audit does not delete rows on its own say-so. Smaller items left as-is for lack of a
reachable primary source: the West Ridge FA's exact AAJ page number; Poltergeist Pinnacle's FA
partner name ("Forrest Murphy," found nowhere independently of this DB); a handful of
sub-hundred-foot elevation/prominence disagreements (Primus Peak 843 vs. 828 ft prominence,
Poltergeist Pinnacle 8198 vs. "8,200+" ft) that read as ordinary survey-vintage noise rather
than errors; and Der Sportsman's `length_m` (183), which matches neither its own
`pitch_detail` sum (225m) nor either of two disagreeing theCrag entries (198m, 213m) -- no
single authoritative total found to correct it to.

**Clean:** Point Success's elevation (14,158 ft, second-highest point on Rainier), coordinates,
Success Cleaver route identity, and the full NPS climbing-fee/permit structure ($82 annual
climbing fee, $12/night wilderness camping, 12-person party limit, no-solo rule) all checked out
exactly against current NPS-sourced figures -- no changes needed on this route at all. Phantom
Peak's 1940 Fred & Helmy Beckey first ascent (including the "Helmy," not "Helmi," spelling),
both routes' elevation/coordinates, and the West Ridge's 2021 Wehrly/Larson first ascent were
all independently confirmed. Prusik Peak's elevation, coordinates, and Der Sportsman's identity,
grade (5.11+, not the 5.9 the task brief guessed), pitch-by-pitch description, and the
Enchantments' permit-lottery mechanics all checked out.

## Batch 98 (pass 2) -- 2026-08-10

Checked 8 routes across 7 peaks, continuing alphabetically after `wa_prusik_peak_der_sportsman`:
Prusik Peak (South Face/Burgner-Stanley, West Ridge), Vesper Peak (Ragged Edge), Liberty Bell
Mountain (Rapple Grapple), Raven Ridge (Southeast Ridge/Crater Lake), Remmel Mountain (NW Ridge),
Goose Egg Mountain (Ride the Lightning), Mount Fury West (Ridge Traverse from East Fury).

**Fixed (21):**
- Prusik Peak South Face (Burgner-Stanley): `fa` never actually named the first-ascent party
  despite the row's own overview already stating it and external confirmation (Climbing.com,
  SummitPost) -- filled in (Ron Burgner and Fred Stanley, 1968).
- Prusik Peak West Ridge: `alpine_grade`/`commitment` were both "III," contradicting the route's
  own top-level grade ("Grade II, 5.7") and its own short simul-climb itinerary -- looked
  copy-pasted from the sibling South Face row. Fixed to II.
- Prusik Peak West Ridge: `gain_ft`/`loss_ft` (6200/4608) contradicted the route's own itinerary
  sum (5300/5300, an exact internal contradiction, not just an estimate mismatch). Fixed.
- Prusik Peak West Ridge: `access._raw.group_size_limits` said "Maximum party 12 people,"
  contradicting this same object's own `access.group_limit` (8) and the real Enchantment Permit
  Area rule. Fixed.
- Prusik Peak West Ridge: `access._raw.advanced_lottery_dates` said results post "~March 15,"
  contradicting the row's own `access.notes` ("after Mar 17") and the confirmed 2026 lottery
  result date. Fixed.
- Prusik Peak West Ridge: `fa` said the FA party "is not recorded," but multiple sources credit
  Fred Beckey with the 1957 West Ridge FA. Filled in (no partner recorded).
- Vesper Peak Ragged Edge: `approach_logistics.trailheadLat/Lng` was a different coordinate than
  this same row's own `waypoints[0]` entry for the identical Sunrise Mine Trailhead, which already
  held the externally-verified location. Fixed to match.
- Vesper Peak Ragged Edge: `length_m` (244m ~800ft) overstated the route by ~100ft against Steph
  Abegg's trip report ("700'"), multiple other sources, and the row's own overview/pitch_detail
  sum. Fixed to 213m (~700ft).
- Liberty Bell Rapple Grapple: `waypoints[0].elev` for Blue Lake Trailhead was 5200; WTA/The
  Mountaineers/USFS all give 5,400 ft, matching this row's own approach_logistics prose. Fixed.
- Liberty Bell Rapple Grapple: `gear[0]` still said "rack to 3 inches," contradicting the row's
  own `corrections` field documenting an already-applied "pro to 4 inches" fix elsewhere on the
  same row. Fixed to match.
- Raven Ridge (Southeast Ridge/Crater Lake): `permit` claimed a self-issue Lake Chelan-Sawtooth
  Wilderness permit is required -- false per USFS, and contradicted this row's own `access.permit`
  field. Fixed.
- Remmel Mountain (area): `prominence_ft` (4328) vs. Wikipedia/PeakVisor consensus (4364). Fixed.
- Remmel Mountain (area): `elevation_ft` (8688) contradicted the row's own waypoint, gear text,
  and blurb (all 8685, matching Wikipedia/PeakVisor). Fixed to 8685.
- Goose Egg Mountain (Ride the Lightning): `access.notes` called it a "basalt crag," contradicting
  the row's own `hazards` field ("columnar andesite") and external geology sources. Fixed.
- Goose Egg Mountain: top-level `season` ("May-Oct") was truncated against the row's own
  `best_season`/`approach` text (both "through November") and SummitPost. Fixed to May-Nov.
- Goose Egg Mountain: `access._raw.altitude_restrictions` said "4,531 feet," contradicting the
  row's own `high_point_ft` (4566) and the area's own elevation/prominence pairing. Fixed.
- Mount Fury West (Ridge Traverse from East Fury): `overview` cited East Fury's stale pre-survey
  elevation (8,280 ft) against the row's own parent-area blurb, which already cites the 2022
  Gilbertson survey figure (8,356 ft). Fixed.
- Mount Fury West: `approach` described the standard **Mount Challenger** approach (Big Beaver to
  Beaver Pass, Whatcom Pass, Challenger Glacier) -- a different Northern Pickets peak entirely --
  contradicting this same row's own waypoints/road/approach_logistics/itinerary/descent, which all
  correctly describe Ross Lake -> Big Beaver Trail -> Luna Camp -> Access Creek -> Luna Col.
  Rewritten using only the row's own already-correct data.
- Mount Fury West: `access._raw.special_requirements` was contaminated with Olympic National Park
  content (Elk Lake/Glacier Meadows/Blue Glacier -- Mount Olympus landmarks, not North Cascades),
  contradicting the row's own `land_manager`. Rewritten with correct North Cascades NP content.
- Mount Fury West: `rope_note` misplaced Mount Fury in the "Southern Pickets"; the area's own
  `path` and external sources agree it's in the Northern Pickets. Fixed.
- Mount Fury West: `access.fees` said "N/A" -- outdated since North Cascades NP began charging
  summer-season backcountry permit fees in March 2024. Fixed with current fee structure.

**Flagged for human review, selected highlights:**
- Vesper Peak Ragged Edge: this route's own `timing.sectionBreakdown`/`itinerary.sourceNote` state
  outright that it's a "duplicate route entry for Ragged Edge -- same sources as
  `wa_vesper_peak_north_face_ragged_edge`," meaning two DB rows may describe the same physical
  climb. Needs `audit:identity`-style investigation, not a blind fix from this pass -- the area's
  `route_count` (4) may also be inflated by the duplicate.
- Liberty Bell Rapple Grapple: `pitches` (4) doesn't match its own `pitch_detail` array (3 entries
  summing to 100m of the stated 120m `length_m`) -- the row's `corrections` field explains the
  bump to 4 came from theCrag, but no 4th pitch_detail entry was ever added to match.
- Prusik Peak West Ridge: two different "Aasgard Pass" waypoints exist in one route's own
  `waypoints` array with different coordinates, and neither matches the externally-verified
  location the sibling South Face route stores exactly.
- Remmel Mountain: `approach_logistics.trailhead` names Andrews Creek Trailhead, but the row's own
  approach/waypoints/gpx/road all describe the Thirtymile Trailhead/Chewuch River Trail approach
  instead -- looks like a mismatch between which trailhead field was set vs. which approach was
  actually researched.
- Raven Ridge: this row's own `dist_km` appears to measure only the maintained trail to Crater
  Lake, not the full off-trail route to the summit, while `gain_ft` correctly reflects the full
  trailhead-to-summit elevation -- an internal convention mismatch with no source found precise
  enough to fix the distance.

**Tooling note:** WebFetch to essentially every authoritative domain (Wikipedia, Mountain Project,
SummitPost, NPS, USFS, WTA, Mountaineers.org, theCrag, peakbagger.com) was blocked by network
egress policy for every research agent in this batch. All findings above rest on WebSearch
result-snippet corroboration rather than direct page reads; each agent flagged specific claims
where that distinction mattered most. Worth a note if this recurs across future batches -- may be
worth a policy check on which domains the audit's egress allowlist actually covers.

Next batch will continue alphabetically after `wa_ridge_traverse_from_east_fury` (see progress
file).

## Batch 99 (pass 2) -- 2026-08-10

Checked 10 routes across 8 peaks, continuing alphabetically after
`wa_ridge_traverse_from_east_fury`: Robinson Mountain (North Couloir), Rock Mountain (Northeast
Ridge), Ruth Mountain (Icy Traverse, South Slopes), Sahale Mountain (Quien Sabe Glacier, Sahale
Arm/Sahale Glacier), Eagle Peak (Scramble Route), Mount Washington/Eastern Olympics (SE Ridge aka
Shield Wall), Sentinel Peak (Standard), South Early Winters Spire (SW Rib).

**Fixed (39):** Full detail and citations are in `audits/sql/2026-08-10-batch-99.sql`; the
recurring pattern this batch was fields that self-contradict *other fields on the same row* --
prominence figures unrelated to an already-fixed elevation (Robinson, Rock Mountain); a trailhead
longitude off by ~800 ft on both Ruth Mountain routes, shared by an identical error on both rows;
a Sahale route's overview describing the wrong compass side against its own aspect/face fields; a
group_limit numeric field never actually updated even though the row's own corrections log and
rules text already say it was fixed (both Sahale routes); Eagle Peak's structured `access` object
carrying stale "N/A"/wrong values that contradicted its own populated `access._raw`/top-level
fields on six separate sub-fields; Mount Washington's `access` block being contaminated end-to-end
with Olympic *National Park* fee/permit/rule language on a route that's actually Olympic National
*Forest* land (this row's own land_manager was already correct); Sentinel Peak's Red Ledge hazard
description misplaced against its own waypoint ordering, and its NP backcountry permit wrongly
called "free" when NPS has charged $10+$6 since March 2024; and South Early Winters Spire's
itinerary gain/loss figures and start time never updated to match an already-corrected top-level
elevation delta and cited source trip report.

**Flagged for human review, selected highlights:**
- Ruth Icy Traverse: `itinerary.days[].gainFt/lossFt` sum to 5,500/6,400 but the row's own
  top-level `gain_ft`/`loss_ft` are 8,000/8,000 -- day-by-day breakdown never updated to match a
  prior total correction, and outside trip reports disagree on the true round-trip total, so no
  automatic fix proposed.
- Sahale Quien Sabe Glacier: Sahale Glacier Camp's stated 4-6 person limit vs. several secondary
  sources citing a flat 4-person cap -- nps.gov itself was blocked from direct fetch.
- Sentinel Peak: `area.prominence_ft` (355) is sourced to a pre-2025-resurvey datasheet; the 2025
  DGPS survey found neighboring Old Guard Peak only 2.7 ft higher and "a few hundred yards away,"
  raising the question of whether prominence should now be computed relative to Old Guard instead
  -- needs a human check against primary listsofjohn/peakbagger data, not a blind fix.
- South Early Winters Spire: `length_m` (274) is ~18% off its own `pitch_detail` sum (225m); no
  authoritative total-length source was reachable to say which figure is right.
- Rock Mountain: the structured `access.fees`/`access.permit`/`access.passRequired` fields are all
  null while the free-text `permit` field is populated and correct -- a completeness gap, not a
  factual error, left for a human data-entry pass.

**Tooling note:** Direct WebFetch to most authoritative climbing/reference domains (Mountain
Project, SummitPost, Wikipedia, Peakbagger, PeakVisor, NPS/USFS pages, WTA, Mountaineers.org) was
again blocked by network egress policy for every research agent this batch, same as batch 98.
Findings rest on WebSearch result-snippet corroboration and internal row cross-checks rather than
raw page reads. All proposed fixes above were additionally spot-checked by re-reading the actual
live-DB JSON for each route before finalizing this file, to make sure "current value" claims match
the real rows and that `replace()`/`jsonb_set()` targets are exact.

Next batch will continue alphabetically after `wa_sews_sw_rib` (see progress file).

## Batch 100 (pass 2) -- 2026-08-12

Checked 10 routes across 6 peaks/features, continuing alphabetically after `wa_sews_sw_rib`:
Sharkfin Tower (Southeast Ridge), Sherman Peak/Mount Baker (Crater Rim Scramble via Easton
Glacier, Squak Glacier Route), Sherpa Balanced Rock (Northeast Couloir), Mount Stuart (Sherpa
Glacier), Sherpa Peak (East Ridge, North Ridge, West Ridge), Silver Star Mountain/Okanogan
(Silver Star Glacier, Northeast Ridge).

**Fixed (26):** Full detail and citations are in `audits/sql/2026-08-12-batch-100.sql`. Sherpa
Peak's North Ridge was the densest cluster: five of its six `access.*` sub-fields (permit,
landManager, fees, rules, closures) all described the Teanaway/Esmeralda-side approach used by
its own East and West Ridge siblings instead of the Stuart Lake Trailhead this route actually
uses -- reads like the whole access block was copied from a sibling and never re-pointed. The
three Sherpa Peak siblings also had a permit-field polarity swap running the other direction:
East and West Ridge (Teanaway-side, outside the Enchantment Permit Area lottery zone) both
claimed the lottery applied, while North Ridge (Stuart Lake side, inside the zone) claimed it
didn't -- each route's own `access.permit` sub-field already had it right; only the top-level
`permit`/`notes` fields were swapped. Mount Stuart's Sherpa Glacier had a rendering bug, not
just a fact error: its `waypoints`/`gpx` arrays were stored out of route order (icefall, then
topout, then trailhead, then summit), which `GPXMap` draws straight in array order, producing a
backwards, self-crossing track on the map -- reordered to match the route's own `distMi`
values, and its trailhead elevation corrected from 2,930 to ~3,400 ft to match this row's own
approach-logistics text. Sherman Peak's Easton Glacier route claimed some upper Mount Baker
routes cross into North Cascades National Park; Congress deliberately excluded Baker from NCNP
when the park was created in 1968, and the route stays USFS/Wilderness throughout, contradicting
this row's own `landManager` field and its sibling Squak Glacier route. Several other fixes were
internal-consistency catches rather than needing external sourcing: Sharkfin Tower's
`gain_ft`/`loss_ft` not matching its own itinerary day-by-day sum, and its `length_m` not
matching its own `pitch_detail` sum; Silver Star Glacier's `gain_ft` not matching `loss_ft` on
an out-and-back route, a creek-crossing waypoint elevation implying an uphill crossing where the
route's own approach text describes a ~200 ft descent, a stale "year-round access" note
contradicting the route's own (already-corrected) SR-20 winter-closure field, and a "1 rappel"
figure overstating a rappel the route's own descent text calls optional; and Silver Star's
Northeast Ridge claiming no parking fee at a trailhead its own `road.driveNote` says is shared
with the Glacier route, which correctly documents the Northwest Forest Pass requirement there.
Mount Stuart's Sherpa Glacier was also downgraded from Grade III to Grade II (alpine_grade and
commitment): multiple independent sources describe it as Grade II, snow to 40 degrees, and the
route's own overview already calls it "the easiest and most direct of Mount Stuart's three
north-side glacier routes" at the lowest max_angle of the three, yet it shared "III" with the
harder Ice Cliff Glacier.

**Flagged for human review, selected highlights:**
- Sherpa Peak's North Ridge `data_quality.gaps` field self-reports "this entry duplicates
  `wa_north_ridge_9`" -- an identity/duplicate-row question, not investigated or fixed here (out
  of scope per this audit's methodology; needs `audit:identity`-style follow-up).
- Sherpa Peak (area row) `blurb` states as fact that the Balanced Rock obelisk is Sherpa's true
  summit, while the East and West Ridge routes' own text says the opposite (Balanced Rock is a
  separate ~20-ft feature, not the true summit). External sources describe this as a genuinely
  unresolved controversy (no careful survey exists) -- a human should pick one framing and make
  all three rows agree rather than this pass guessing.
- Sherpa Peak East/West Ridge and Mount Stuart's Sherpa Glacier itinerary day-by-day gain/loss
  figures don't sum to their own top-level `gain_ft`/`loss_ft` (or, being out-and-back routes,
  don't net to zero) -- same recurring shape as past batches, no single day/leg identified with
  enough confidence to fix blindly.
- Three separate `dist_km` questions (Sharkfin Tower, Sherman Peak's Easton Glacier route,
  Sherpa Peak West Ridge) where the figure doesn't cleanly match the route's own waypoint/
  itinerary mileage under either a one-way or round-trip reading -- left alone per CLAUDE.md's
  explicit warning against bulk-normalizing this column.
- Sherpa Peak West Ridge's `grade_num` (5) doesn't match its own `grade` string's stated top
  difficulty ("5.4," which would predict 4 by the convention both siblings use) -- it instead
  matches the separate `rock_grade` field (5.5); unclear which field is meant to drive
  `grade_num`.

**Tooling note:** WebFetch to essentially every authoritative domain (Wikipedia, Mountain
Project, SummitPost, USFS, NPS, Mountaineers.org, WenatcheeOutdoors, peakbagger.com,
willhiteweb.com) was again blocked by network egress policy for every research agent this batch
-- the fourth consecutive batch with this issue (see batches 97-99). All findings above rest on
WebSearch result-snippet corroboration and internal row cross-checks rather than direct page
reads; every proposed fix was spot-checked against the live-DB JSON for each route before
finalizing the SQL file, including full re-verification of the two riskiest fixes (Mount
Stuart's full waypoints/gpx array replacement, Sherpa Peak East Ridge's trailhead elevation)
against the actual current row contents.

Next batch will continue alphabetically after `wa_silver_star_ne_ridge` (see progress file).

## Batch 101 (pass 2) -- 2026-08-12

Checked 12 routes across 6 peaks/features, continuing alphabetically after
`wa_silver_star_ne_ridge`: Sinister Peak (North Face, Southwest Route), Sitkum Spire (Standard
Route), Sloan Peak (Corkscrew Route, West Face/R1), Snowfield Peak (Neve Glacier), Snowking
Mountain (Standard Route), South Early Winters Spire (South Arete, Direct East Buttress, East
Buttress, Passenger, Southwest Couloir). Three otherwise-matching routes were excluded from
scope during selection: `wa_skeena26` and `wa_slippery_slab_tower_ne_face` sit under crag-type
areas (Squire Creek Walls, Thunder Mountain and Slippery Slab Tower), and a second `wa_south_face`
route sits under Vasiliki Tower, also a crag -- none are `area_type = 'peak'`.

**Fixed (5):** Full detail and citations are in `audits/sql/2026-08-12-batch-101.sql`. Sinister
Peak's Southwest Route had a summit elevation (`high_point_ft` 8,440 ft) contradicting its own
summit waypoint (8,444 ft), the `wa_sinister_peak` area row (8,444 ft), and the sibling North
Face route (already 8,444 ft) -- North Face's own 2026-07-31 correction note claimed this sync
had already happened, but the scalar on the Southwest Route itself was never actually touched.
The same row's `gain_ft`/`loss_ft` (7000/5500) also didn't match its own itinerary day-by-day sum
(8200/8400 across its 4-day approach) or that itinerary's own `totalNote` ("roughly 8,000-9,000
ft cumulative gain round trip"). Sitkum Spire's `high_point_ft` (9,355 ft, the spire's own minor
summit) contradicted its own `corrections` field, which explicitly documents the route's real
high point as Glacier Peak's true 10,541 ft summit -- the note was written but the scalar was
never updated to match it, while `gain_ft` (8,500 ft, already on file) was only consistent with
the 10,541 ft figure (net ~8,241 ft from the 2,300 ft trailhead) and not with 9,355 ft (net
~7,055 ft). South Arete's `pitches` field (3) contradicted its own `pitch_detail` (exactly 2
numbered pitches, the second ending "walk-off near summit"), its own `beta` text ("Pitch 1...
Pitch 2... then easier ground leads to the summit"), and its own itinerary note ("a couple of
5.5-5.6 moves over 2 pitches") -- the stray 3 most likely bled in from this same row's separate
`rappel_count_note` (2-3 rappel stations for the descent, a different count).

**Flagged for human review (2):**
- Passenger's first-ascent month (October 1991 on file) conflicts with an AAC Publications
  search-result snippet reading "completed in August," which also implies 8 pitches / 800 ft /
  IV 5.12a against Mountain Project's 7 pitches / 900 ft / 5.11d -- a conflict this row's own
  `corrections` field already weighs for the length/grade half but not the month/pitch-count
  half. WebFetch to `publications.americanalpineclub.org` was blocked, so the full AAC article
  couldn't be read to resolve it either way.
- Snowking Mountain's 2-day itinerary has a ~900 ft gain/loss imbalance (day 1: 4,700 ft gain /
  300 ft loss; day 2: 2,700 ft gain / 6,200 ft loss; net +900 ft on a route that returns to its
  own trailhead) not clearly attributable to either day without a source confirming Cyclone Lake
  camp's actual elevation -- left alone rather than guessed at.

**Clean (7):** Sinister Peak North Face, Sloan Peak Corkscrew Route, Sloan Peak West Face/R1,
Snowfield Peak Neve Glacier, South Early Winters Spire's Direct East Buttress, East Buttress, and
Southwest Couloir.

**Tooling note:** WebFetch to every authoritative domain tried (mountainproject.com,
publications.americanalpineclub.org) was blocked again this batch -- the fifth consecutive batch
with this restriction (see batches 97-100). WebSearch snippets were used instead and did
corroborate several on-file facts against independent sources: Direct East Buttress's Beckey/Doug
Leen 1968 first ascent, Southwest Couloir's Adam/Bedayn/Davis July 1937 first ascent, Snowfield
Peak's 8,351 ft elevation and 2,907 ft prominence, and Sinister Peak's ~8,440-8,444 ft elevation
range. All 4 UPDATE statements (5 field-level fixes: Sinister Peak's Southwest Route touches
`high_point_ft`, `gain_ft` and `loss_ft` in one statement) were spot-checked against the live-DB
JSON and passed `npm run check:sql` before finalizing the SQL file.

Next batch will continue alphabetically after `wa_south_early_winter_spire_southwest_couloir`
(see progress file).

## Batch 102 (2026-08-12, pass 2)

Routes: Cathedral Peak's South Face, Argonaut Peak's South Face, Pernod Spire's South Face,
Concord Tower's South Face and South Face Center, Kangaroo Temple's South Face, Inspiration
Peak's South Face, Guye Peak's South Gully/South Spur and South Rib, Mount Stuart's South
Headwall. Researched via 8 parallel agents (one per peak/route-group).

**Confirmed errors fixed (6):** Argonaut Peak's summit waypoint carried a stale 8,453 ft
elevation while the route's own `high_point_ft` (already correct at 8,457 ft, matching
Wikipedia/USGS-derived data) went unquestioned. Both Concord Tower routes' `high_point_ft`
(7,569 ft) disagreed with their own "Concord Tower Summit" waypoint (7,560 ft) and with every
external source found — no source anywhere supports 7,569. Inspiration Peak's South Face summit
waypoint (7,880 ft) was stale against its own correct `high_point_ft` (7,891 ft, confirmed by
Wikipedia and Peakbagger); separately, its top-level `pitches` (8) and `length_m` (305 = ~1000ft)
contradicted the route's own beta ("about 600 ft (4 pitches)"), itinerary ("just 4 pitches...
the shortest of Inspiration's three technical lines"), and its own 4-entry `pitch_detail` array
(summing to 160m = ~525ft) — corrected to 4 pitches / 160m. Mount Stuart's South Headwall
`approach_logistics.peakLat/peakLng` sat ~0.3mi/1600ft from the true summit, an outlier against
both this row's own area coordinates and its own waypoints entry, both of which match USGS GNIS
Feature ID 1526641 exactly.

**Flagged for human review (9):** Cathedral Peak's `high_point_ft` (8,606) vs. its own waypoint
(8,601) is not a simple typo — both trace to real, differently-sourced conventions (GNIS/NAVD88
gives 8,606; the traditional/NGVD29-era figure and most trip reports give 8,601; a 2020s LiDAR
resurvey gives 8,599 lower still). Left alone pending a human decision on which datum this
database standardizes on. Pernod Spire's South Face first-ascent party/date, grade/length, and
summit elevation could not be independently corroborated this run — WebFetch was blocked for
Mountain Project and every other reference domain, leaving only WebSearch snippets, which is
weaker evidence than the fact-check bar requires; the row's serious safety claim (a 2025 fatal
rappel-anchor failure on the neighboring North Early Winters Spire, cited as hazard context) was
independently and thoroughly confirmed as real via multiple news outlets and the USFS accident
report. Concord Tower's South Face names a fourth FA climber, "Bruce Schuler," alongside three
names (Cramer, Anderson, Stanley) that a SummitPost snippet corroborates for 1965 — no source
mentioning Schuler was found; left on file rather than removed on absence-of-evidence alone.
Concord Tower's South Face Center carries `fa: "Not Known"` per a 2026-08-05 correction that
removed a "Fielding/Tarver 1966" attribution as an apparent mix-up with a different peak — but
this run's SummitPost search results independently and repeatedly attribute Concord Tower's own
South Face Center specifically to Mark Fielding & Frank Tarver, May 1966, contradicting that
removal's stated rationale. This needs a human to check Beckey's Cascade Alpine Guide directly
before either reinstating the FA or confirming the removal was correct. Kangaroo Temple's South
Face first-ascent party (Bill Marts, Steve Marts, Don McPherson, summer 1965) could not be
independently confirmed (same egress-blocked-domains issue); separately, the row's own
`data_quality.gaps` already flags an unresolved internal contradiction about whether the route's
approach crosses Kangaroo Pass — this run's research leans toward "yes, it does" (contradicting
an appended "IMPORTANT" note claiming otherwise) but with only moderate confidence, so the text
was left unchanged pending a human check against SuperTopo's dedicated route page. Guye Peak's
South Rib pitch count (5 pitches, 244m) could not be independently confirmed this run (Mountain
Project unreachable).

**Clean (1):** Guye Peak's South Gully/South Spur — elevation, land manager (confirmed inside
Alpine Lakes Wilderness despite sitting adjacent to the Alpental ski area's permit boundary),
grading, and the on-file 2021 Alpental private-land access dispute all independently corroborated.

**Tooling note:** WebFetch was blocked by the network egress proxy for mountainproject.com,
supertopo.com, summitpost.org, mountaineers.org, americanalpineclub.org, wikipedia.org, and
similar reference domains for most of this batch's agents (confirmed via direct curl testing by
one agent, and via `/root/.ccr/README.md` policy denials by others) — a continuation of the
restriction noted in batches 97-100. Agents fell back to WebSearch snippet synthesis, which is
weaker evidence and in one case (Inspiration Peak's FA year) caused the search layer itself to
briefly hallucinate an unsupported date before the agent caught and discarded it. Items that
depended on primary-source page text and couldn't be corroborated by snippets alone were left
un-fixed and flagged above rather than guessed at. `npm run check:sql` passed clean: 6 write
targets across 6 statements, every target id exists, no DELETE in this file. `.env.local` (not
present in this fresh clone) was recreated locally from the read-only anon key supplied for this
run so `check:sql` could verify against the live schema; it is gitignored and was not committed.

Next batch will continue alphabetically after `wa_south_rib` (see progress file).

---

## 2026-08-12 — Pass 2, Batch 103

Ten routes across 8 peaks: South Ridge (Luna Peak, Black Peak, Eldorado Peak's "Main Peak"
sub-summit), South Spur (Whatcom Peak), North Ridge/Olivine Scramble/West Ridge (South Twin
Sister), Southeast Face (Sharkfin Tower), West Ridge/Beckey Route (Southeast Mox Peak,
stored id `..._se_rib`), Southeast Ridge/SE Corner (Mount Shuksan).

**Confirmed errors fixed (16):** A recurring internal-consistency bug class dominated this
batch — `gain_ft`/`loss_ft` scalars disagreeing with a route's own `itinerary.days` sums
(Eldorado's Main Peak descent text, Sharkfin Tower's gain/loss, Southeast Mox Peak's
gain_ft), and `waypoints`/`gpx` arrays stored out of physical route order so `GPXMap` draws
a backwards, self-crossing track — the same shape fixed on Mount Stuart's Sherpa Glacier
(batch 100) and Shuksan's own North Face/NE Ridge (batch 88), recurring independently on
Luna Peak's South Ridge and Shuksan's own Southeast Ridge, which that batch-88 sweep never
reached. Two "fix already applied to a sibling route but this one was missed" cases:
Whatcom Peak's `approach_logistics.peakLat/peakLng` (batch 50's fix never reached South
Spur) and South Twin Sister's Olivine Scramble `access.parking_pass` (batch 5's sweep never
reached the Scramble, only West/North Ridge). Sharkfin Tower's `access.group_limit`/`rules`
independently recurred the exact Boston-Basin-is-a-12-not-6-person-zone bug already fixed on
its sibling Southeast Ridge in batch 100. Mount Shuksan's `seasonal_hazards.avalanche.zone`/
`climate.forecastZone` carried the same not-a-real-NWAC-zone-name string ("NWAC Mt Baker
zone") already fixed on two Shuksan siblings in batch 88. South Twin Sister's North Ridge
`commitment` (II) contradicted its own `grade` field (Grade III) and a stale itinerary line
still describing a rappel its own `rappels: "0"`/descent_text say doesn't happen; West
Ridge's own `rappels` field overstated an optional rappel as required, the same shape as
Silver Star Glacier in batch 100.

**Flagged for human review (18):** Three elevation-datum conflicts in the Cathedral Peak
shape (external sources genuinely disagree by convention, not error) — Black Peak (8970 vs.
8975/8986 across sources), Eldorado's Main Peak summit waypoint (8868 vs. high_point_ft
8873). Black Peak's `gain_ft` disagreeing with its own itinerary by two different amounts
depending on which of three on-file figures you trust — no clear single value to fix
blindly. `length_m` vs. `pitch_detail`-sum mismatches on Sharkfin Tower and Southeast Mox
Peak, both with only partial corroboration. `dist_km` mismatches on four routes, left alone
per this repo's standing warning against bulk-normalizing that column. South Twin Sister's
lower-approach land manager conflicts between "DNR/Olivine Corp" (North/West Ridge) and
"Hampton Family Forests" (Scramble) for one shared road, unresolved because WebFetch to
hamptonlumber.com was blocked. Southeast Mox Peak's route id (`..._se_rib`) still encoding
its pre-correction name after `name` itself was already fixed to "West Ridge (Beckey
Route)" — a deliberate id-rename follow-up, not something to silently UPDATE. Whatcom
Peak's own area-level lat/lng fix from batch 50 appears never applied to `areas.wa_whatcom_peak`
despite the route-level fix landing correctly — worth confirming alongside this batch's fix.
Black Peak's Wing Lake/Lewis Lake camping-permit-zone ambiguity remains unresolved (conflicting
secondary sources on Park vs. Forest jurisdiction).

**Clean (0):** every route in this batch had at least one confirmed fix or a flagged item;
none passed with nothing to note.

**Tooling note:** WebFetch was blocked by the network egress proxy for mountainproject.com,
supertopo.com, summitpost.org, mountaineers.org, americanalpineclub.org, wikipedia.org,
hamptonlumber.com and similar reference domains for all 8 research agents this batch — the
seventh consecutive batch with this restriction. Agents fell back to WebSearch snippet
synthesis throughout. `npm run check:sql` passed clean: 13 write targets across 20
statements in this file, every target id exists, no DELETE anywhere in the file (2 WARNs
for statements the checker's id-predicate scan couldn't parse across a multi-line
`jsonb_set` — both manually verified correct). `.env.local` (not present in this fresh
clone) was recreated locally from the read-only anon key supplied for this run so
`check:sql` could verify against the live schema; it is gitignored and was not committed.

Next batch will continue alphabetically after `wa_southeast_ridge_se_corner` (see progress
file).

## 2026-08-12 — Pass 2, Batch 104

Nine peaks, 10 routes: Southern Man (South Early Winters Spire); Southwest Buttress (Dorado
Needle); Southwest Face (The Tooth); Southwest Scramble (Pinnacle Peak, Tatoosh); Soviet Route
(Bonanza Peak); South Ridge / "Spirited Away" (Spectre Peak); North Face (Kloke-Tindall) and
Southeast Gully/East Ridge (Spider Mountain, x2); Southwest Face (Spire Point);
Stanley-Burgner (Prusik Peak).

**Confirmed errors → fixes in `sql/2026-08-12-batch-104.sql` (14):**
- Dorado Needle Southwest Buttress: `dist_km` had regressed to 6.44, exactly half the 12.88
  this row's own `corrections` log already recorded fixing on 2026-08-05 — and half of what
  its own approach text ("~25.75 km round trip") and itinerary total ("~16 mi round trip")
  imply. Restored to 12.88.
- Dorado Needle Southwest Buttress: `access.group_limit` (6) and `access.rules` misclassified
  the Eldorado/Dorado Needle cross-country zone as a standard 6-person zone. It's a Type I
  high-occupancy zone (12-person cap) per multiple sources, and this row's own
  `access._raw.group_size_limit` already said "Maximum 12 people per party" — the derived
  field just didn't match its own raw source. Fixed to 12 and reworded.
- Pinnacle Peak (area row): `prominence_ft` was 581; independent sources (Wikipedia, PeakVisor)
  agree on 562 ft.
- Pinnacle Peak Southwest Scramble: `access.fees` said "N/A" inside Mount Rainier National
  Park — the fee-park-vs-fee-free confusion this audit exists to catch. Added the $30/vehicle
  (or $15 pedestrian, or interagency pass) NPS entrance fee, distinct from the overnight
  wilderness-permit fee already on file.
- Spectre Peak "Spirited Away": `best_season`'s closing clause had the snow direction
  backwards ("favorable low-snow conditions... easier descent"), contradicting this same row's
  `climate.summer`, `itinerary.days[3].note`, and `descent_text`, all of which describe
  abundant/lingering snow making the descent glissade-friendly. Corrected.
- Spectre Peak "Spirited Away": `approach` carried a stale parenthetical ("matching the on-file
  74 km distance") left over from the 2026-08-05 correction that changed `dist_km` to 37.02 —
  the prose was never updated. Fixed to reference the current value.
- Spectre Peak "Spirited Away": `itinerary.totalNote` said "~46 hrs of moving time", but this
  row's own `timing.totalHrs` (49) and the sum of `itinerary.days[].hours` (10+8+15+16=49) both
  say 49 — "46" looks like an accidental reuse of the 46-mile distance figure one clause over.
  Fixed to 49.
- Spectre Peak "Spirited Away": `waypoints[0]` (Hannegan Pass) elevation was 5100, but this
  row's own `approach` text says "5,050 ft Hannegan Pass" twice, matching USFS/WTA (pass
  ~5,050 ft, trail max 5,076 ft). Fixed to 5050.
- Spider Mountain North Face (Kloke-Tindall): `fa` credited the June 17, 2003 Volken/Avolio ski
  descent to this 1972 line, but independent sources (skisickness.com's own route page,
  corroborated by a CascadeClimbers thread) place that descent on a separate, nearby 1976 north
  face line ("Arachnophobia"). Removed the misattributed clause rather than guess a replacement
  date for the Kloke-Tindall line's own (still-unconfirmed) first ski descent.
- Spider Mountain North Face: `approach_logistics.trailheadDirection` gave the Cascade Pass
  Trailhead as "~3,660 ft" — an outlier against NPS/WTA (3,600 ft) and against this dataset's
  own sibling route (`wa_spider_mountain_north_ridge`), whose `approach` text and `gain_ft` math
  (8317−3600=4717) both already assume 3,600 ft. Fixed.
- Spire Point Southwest Face: `approach` named "Downey Creek Trail (#792)"; USFS confirms it is
  Trail #768, and this row's own `waypoints[1].note` and `approach_logistics.trailhead` already
  say 768 — `approach` was the sole outlier. Fixed.
- Spire Point Southwest Face: `waypoints[5]` ("Spire Col") elevation was 7000, contradicting
  four other mentions of the same location in this same row (`beta`, `approach`,
  `pitch_detail[0].notes`, `itinerary.days[1]` x2), all saying 7,760 ft — matching a WTA trip
  report. Fixed to 7760.
- Prusik Peak Stanley-Burgner: `waypoints[0]` (Stuart Lake Trailhead) elevation was 1300, about
  2,100 ft too low — USFS/Mountaineers.org place it at ~3,000-3,400 ft, and this row's own
  `approach` text implies a ~3,570 ft start ("Colchuck Lake, 5,570 ft, ~4.1 mi/2,000 ft gain").
  Fixed to 3400.
- Prusik Peak Stanley-Burgner: `itinerary.days[1].schedule[4].detail` described the descent as
  "Downclimb/rappel the West Ridge back toward the notch" — but this row's own `descent`,
  `descent_text`, `rappel_detail`, and `bail` fields all consistently describe a north-face
  rappel descent (4 raps on slung anchors), reconfirmed externally. West Ridge is a distinct,
  separate 5.7 route on Prusik Peak with no role in this route's descent — looks like a
  copy/paste mix-up between the two. Fixed to match the rest of the row.

**Flagged for human review (28):** FA/free-ascent name-date-grade discrepancy on Southern Man
deepened rather than resolved (search snippets now lean "Bobby"/Sept 2009/5.12a against the
on-file "Blake Matthews"/2010/5.11d, but only via secondhand synthesis, not a primary source);
a `gain_ft` vs. itinerary internal mismatch on the same route; an unconfirmed Cutthroat Lake
camping-buffer claim. The Tooth's approach-segment distance (1.5 mi vs. ~2 mi to the Source
Lake fork) and its already-annotated FA date, neither independently confirmable this pass.
Dorado Needle's pitch-count/commitment-grade spread widened to a third data point (9p/5.8/III
vs. 11p/5.8/III vs. 13p/5.7/III+), plus an unconfirmed 1985 establishment date, a time-sensitive
Cascade River Road closure claim, unconfirmed permit-desk hours, and descent-narrative framing
that may conflate two valid variants. Pinnacle Peak's `dist_km` (left alone per this repo's
standing warning against bulk-normalizing that column), a ~130m trailhead-coordinate gap
between two of its own fields, and a shaky "Stevens Peak is also taller" claim (sourced
elevations put it 2 ft lower). Bonanza Peak's main-summit elevation (9516 vs. 9511 across
sources), a three-way Holden Village elevation spread, and an unverifiable rappel-anchor
material detail. Spectre Peak's summit coordinate (area row vs. route waypoint, ~1.2 km apart —
the authoritative peakbagger/listsofjohn sources were both blocked), a crux-pitch numbering
mismatch (P2 in the itinerary vs. pitch 3 in the table), and a 2025 trip-report title citing 10
pitches against this row's detailed 12-pitch table. Spider Mountain's still-unconfirmed exact
first-ski-descent date for the Kloke-Tindall line itself, a Kool-Aid Lake basin elevation
~500-700 ft above independent sources, and a stale route id
(`wa_spider_mountain_north_ridge` naming a route whose actual name/aspect is "Southeast
Gully/East Ridge," southeast-facing) matching the exact id-drift failure pattern this repo's
CLAUDE.md documents. Spire Point's face/aspect fields ("East"/"E") possibly describing a
different SummitPost-documented route ("East Face") than the one this record's name and beta
narrate ("Southwest"/"South") — already flagged in this row's own `data_quality.gaps` and not
newly resolved; its first-ascent party (unknown, no source found); and an unconfirmed 12-person
Glacier Peak Wilderness group cap. Stanley-Burgner's already-known `pitch_detail`-sum vs.
`length_m` mismatch (237m vs. 183m, still unresolved for lack of a primary topo); a ~70m summit
waypoint vs. area-coordinate gap; and a genuinely split grade consensus (5.10a per MP/
dashertonclimbs vs. III 5.9+ per climbing.com/Mountaineers.org vs. 5.10- per climberkyle).

**Clean (0):** every route in this batch had at least one confirmed fix or a flagged item;
none passed with nothing to note.

**Tooling note:** WebFetch was blocked by the network egress proxy for mountainproject.com,
supertopo.com, summitpost.org, mountaineers.org, americanalpineclub.org, wikipedia.org,
cascadeclimbers.com, skisickness.com, stephabegg.com, fs.usda.gov, nps.gov, and similar
reference domains for all 9 research agents this batch — one agent (Dorado Needle) reported
`stephabegg.com`/`fs.usda.gov` blocked despite not being on the pre-flagged likely-blocked
list, i.e. the block is broader than the standing warning suggests. Agents fell back to
WebSearch snippet synthesis throughout, and several flagged items above are explicitly weaker
for it (Southern Man's FA discrepancy, Spectre Peak's summit coordinate, Spider Mountain's
ski-descent date). `npm run check:sql` passed clean against both `--table routes` (default,
11 checkable targets across the 14 routes-table statements) and `--table areas` (1 target, the
Pinnacle Peak prominence fix) — 3 WARNs for statements the checker's id-predicate scan
couldn't parse across long `jsonb_set`/string-literal statements with embedded escaped quotes
(the `access.rules` rewrite, the `access.fees` rewrite, and the Spider Mountain `fa` rewrite,
all containing nested `''`-escaped apostrophes); all three were manually verified against the
same ids' other, cleanly-checked statements in this same file. `.env.local` (not present in
this fresh clone) was recreated locally from the read-only anon key supplied for this run so
`check:sql` could verify against the live schema; it is gitignored and was not committed.

Next batch will continue alphabetically after `wa_stanley_burgner` (see progress file).

## Batch 105 — 2026-08-12

Eight routes, next-alphabetically after `wa_stanley_burgner`: Storm King (2 routes), Middle
Gunsight SW Ridge, Swiss Peak, Tenpeak Mountain (2 routes), Tepeh Towers, The Brothers South
Couloir.

**Confirmed fixes (0):** none this batch.

**Clean (6):** `wa_sw_ridge`, `wa_swiss_peak_standard_route`, `wa_tenpeak_mountain_north_couloir`,
`wa_tenpeak_mountain_southeast`, `wa_tepeh_towers`, `wa_the_brothers_south_couloir`. Spot-checked
via WebSearch against Wikipedia/Peakbagger/Mountain Project/trip-report snippets: Tenpeak
Mountain's FA (Lloyd Anderson & Tom Campbell, Sept 21 1940) matches exactly; The Brothers' FA
history (north/Mt. Arthur 1908 by C. Hill & W. Hill, south/Mt. Edward 1912 by Collier, Corkenill,
Dehn, Fish, Goldsmith, Trumbull) matches exactly, and the row's own `data_quality.gaps` already
correctly flags the 6,842 ft (Wikipedia/NGVD29) vs 6,866-6,868 ft (Brothers Wilderness page,
Mountaineers/USGS) elevation split as unresolved rather than picking one; Swiss Peak's 7,988 ft
high point confirmed; the Middle Gunsight SW Ridge and Tepeh Towers beta both closely match
independent route-page descriptions (loose-then-good-climbing 5-pitch ridge; short low-5th
pitch + scramble off the Eldorado icecap, respectively).

**Flagged for human review (2), both on Storm King, neither newly resolved:**
- `wa_storm_king_north_face` — this row already self-flags (`verif.status: unverified`) that no
  source could corroborate a distinct "North Face" route or its claimed 1978 Dick
  Emerson/Walt Grove FA, separate from the peak's only well-documented line (the Southwest
  Route), and calls it "likely a fabricated entry." Attempted to independently confirm or
  refute this pass; summitpost.org and mountaineers.org (the two primary route-page sources)
  were both egress-blocked, and a WebSearch summary claiming to confirm the FA looked like it
  was echoing the search query back rather than citing real snippet text, so it was not trusted
  either way. Left as-is; still needs a human with direct source access.
- `wa_storm_king_southwest_scramble` — internal contradiction between two of the row's own
  structured fields: `approach_logistics.trailhead`/`trailheadLat`/`trailheadLng` still point to
  Colonial Creek Campground (48.6855, -121.0925), but a waypoint note on the same row says that
  trailhead "is a different, unconnected drainage well north of here and is very likely wrong"
  and proposes Rainy Pass Trailhead instead. Not resolved here since neither approach could be
  independently confirmed against a live source this run (same blocks as above), and the row's
  own hedge ("very likely wrong," not "wrong") isn't confident enough to act on without a source.

**Tooling note:** summitpost.org, mountaineers.org, web.archive.org were all unreachable via
WebFetch this run (egress-blocked or unsupported), consistent with batch 104's tooling note
covering the same domain family. All verification this batch relied on WebSearch's snippet
synthesis rather than direct page fetches.

Next batch continues alphabetically after `wa_the_brothers_south_couloir` (see progress file).

## Batch 106 — 2026-08-12

Ten routes, next-alphabetically after `wa_the_brothers_south_couloir`: Brothers Traverse, The
Cave Route (Concord Tower), Chopping Block South Route, The Devils Club (Southeast Mox Peak),
Direct North Ridge w/ Gendarme (Mount Stuart), The Hitchhiker (South Early Winters Spire), and
four Monk lines on Cathedral Peak (Le Gibet, Odine, Scabo, West Cracks - Left Crack).

**Confirmed fixes (10, across 6 routes):**
- `wa_the_brothers_traverse` — `ice_grade` overstated Mountain Project's own published grade
  (claimed AI3, MP says AI2); `areas.elevation_ft` for The Brothers (6868) matched no source
  and disagreed with this row's own `high_point_ft` (6866, which the Forest Service/WTA/
  Mountaineers all agree on) — fixed both.
- `wa_the_chopping_block_south_route` — `access.rules` grouped Boston Basin/Eldorado in with
  the Southern Pickets as 6-person zones; batch 104 already established (NPS-sourced) that
  Boston Basin/Eldorado are 12-person zones. Corrected the parenthetical rather than the
  route's own (correct) `group_limit`.
- `wa_the_devils_club` — `overview` mischaracterized the 2008 Larson/Wehrly outing as a
  "second ascent"/variation of this route; it was the first ascent of a separate, previously
  unclimbed summit (Lemolo Peak) via its own new route, per AAC/Alpinist/Klipsun. Also
  removed four stale waypoints/gpx points from the wrong (Depot Creek/BC-side) approach —
  the row's own approach text only describes the Ross Lake/Little Beaver/Perry Creek
  approach, and one surviving waypoint's own note already flagged the duplication without
  the earlier pass having removed the stale points.
- `wa_the_direct_north_ridge_w_gendarme` — Stuart Lake Trailhead waypoint elevation (3540 ft)
  was ~610 ft (21%) too high; WTA/USFS agree on ~2930 ft.
- `wa_the_hitchhiker` — `overview` said the route starts "100 yards" right of The Passenger;
  the row's own approach/timing fields already say "100 ft," and external sourcing agrees.
  `grade`/`rock_grade` corrected from "5.11-" to "5.11b" per SuperTopo and theCrag's own
  route-page titles, neither of which supports "5.11-".
- `wa_the_monk_odine` — `road.status`/`road.driveNote` described Forest Road 51 as gravel
  (self-contradictory within `road.status`'s own sentence); WTA/USFS agree the drive is paved
  the entire ~28 miles from Winthrop, matching this row's own `approach` text. `watch_out`
  still opened with "5.8 route" after `grade`/`grade_num`/`rock_grade`/`pitch_detail` were all
  corrected to 5.9 in an earlier pass (per this row's own `corrections` field) — the text
  field was missed by that fix.

**A pattern worth a human's attention, not fixed:** three of the four Monk routes audited
this batch (`wa_the_monk_le_gibet`, `wa_the_monk_odine`, `wa_the_monk_west_cracks_left_crack`)
independently turned up the same two defects: (1) a Monk-specific waypoint sharing near-
identical coordinates with Cathedral Peak's own summit pin, despite these routes' own text
describing The Monk as "a distinct, smaller detached tower/buttress ... not part of the main
South Face wall," and `high_point_ft` on at least `wa_the_monk_odine` exactly matching
Cathedral's true summit elevation (8606) rather than the Monk's own ~8300 ft waypoint; and
(2) a `corrections` field claiming "Grade (5.8, 2 stars) verified on Mountain Project" while
`stars` is `null`. This looks like Monk-route enrichment shared geometry/notes across sibling
routes rather than sourcing each independently, but Mountain Project itself was unreachable
via WebFetch for all four agents this batch, so none could pull the real per-route pin or
star count to write a verified fix. Flagging for a human with direct MP access rather than
guessing; `wa_the_monk_scabo` (below) did NOT show this pattern, so it isn't universal across
the Monk group.

**Also flagged for human review, not fixed:**
- `wa_the_cave_route` — pitch count (3 vs. an independently-sourced 4-pitch "Tunnel Route"
  account, possibly the same climb under SuperTopo's name); `high_point_ft` (7569) matches
  neither of the area's own two disputed elevation figures (7560/7611); trailhead elevation
  disagrees internally (waypoint 5200 ft vs. prose 5400 ft, and both figures independently
  sourced elsewhere).
- `wa_the_chopping_block_south_route` — the "South Route" name itself still isn't confirmed
  as a distinct documented line (already self-flagged in the row); a possible third FA
  credit (James C. Martin) found in one secondary source but not tied specifically to this
  summit.
- `wa_the_devils_club` — AAJ publication year (row says 2007; one source construction points
  to AAJ 2006) unresolved without direct access to the AAC's own PDF; a grade/length pairing
  question (does 2400ft pair with the AAC or the Mountain Project grade?) left as the row's
  existing, disclosed editorial call.
- `wa_the_direct_north_ridge_w_gendarme` — pitch count (20) falls within a plausible range
  across sources that use "Direct"/"Complete"/"Upper" North Ridge inconsistently; `gain_ft`
  doesn't cleanly reconcile against the corrected trailhead elevation, likely because it's a
  cumulative multi-pass approach figure with no single source to check it against.
- `wa_the_hitchhiker` — approach trailhead conflict already self-flagged in the row; rappel
  count (2 vs. 3) reflects genuine route variability per an independent source, not an error;
  `pitch_detail` lengths sum short of `length_m` by ~29m with no source to adjudicate; FA year
  unconfirmed either way.

**Clean (1):** `wa_the_monk_scabo` — every checkable field (grade, pitches, descent, rack,
area elevation/prominence/coordinates, approach mileage, road, permit, group limit) matched
external sourcing exactly, including the row's own `corrections` claim of Mountain Project
verification.

**Tooling note:** every primary route-database/land-manager domain relevant to this batch was
blocked by the network egress proxy for WebFetch across all ten research agents —
`mountainproject.com`, `supertopo.com`, `thecrag.com`, `summitpost.org`, `mountaineers.org`,
`stephabegg.com`, `wta.org`, `fs.usda.gov`, `nps.gov`, `en.wikipedia.org`,
`publications.americanalpineclub.org`, `alpinist.com`, `climbing.com`, `cascadeclimbers.com`,
and `web.archive.org` among them — consistent with the same domain family flagged blocked in
batches 104/105. All findings this batch rest on WebSearch snippet synthesis; several flagged
(not fixed) items above are explicitly weaker for it. `npm run check:sql` passed clean against
both `--table routes` (9 checkable targets across 11 UPDATE statements) and `--table areas` (1
target) — 1 WARN for the `wa_the_monk_odine` road.driveNote statement, whose id predicate the
checker's regex couldn't parse cleanly past an embedded ''-escaped apostrophe earlier in the
file (the Devils Club waypoints fix); manually verified against that statement's own clean
`WHERE id = 'wa_the_monk_odine'` clause. `.env.local` (not present in this fresh clone) was
recreated locally from the read-only anon key supplied for this run so `check:sql` could
verify against the live schema; it is gitignored and was not committed.

Next batch continues alphabetically after `wa_the_monk_west_cracks_left_crack` (see progress
file).

## Batch 107 — 2026-08-13

Checked 10 routes across 8 peaks: The Monk – West Cracks – Right Crack (Cathedral Peak,
Pasayten), Neve Glacier Approach/Standard (The Needle), Glacier/Scramble Route (The Pleiades),
South Route (The Pyramid, Southern Pickets), Ridge Traverse Route (The Rake, Southern Pickets),
The Roof (Unicorn Peak), three routes at The Tooth (The Tooth Fairy, Northeast Slabs, South
Face/Standard), and East Peak Standard Route (The Triad).

**Confirmed errors fixed (9 statements, `audits/sql/2026-08-13-batch-107.sql`):**
- `wa_the_monk_west_cracks_right_crack` — `high_point_ft` (8606, matching Cathedral Peak's own
  summit) corrected to 8300, matching this route's own waypoints and approach text describing
  The Monk as a distinct, smaller detached tower — the same summit-collision defect the prior
  batch found on three of four sibling Monk routes. This route also carries the sibling
  `corrections`-vs-`stars` mismatch pattern (flagged below, not fixed).
- `wa_the_pleiades_scramble` — five fixes: `access.land_manager` dropped a false claim that
  some upper routes cross into North Cascades National Park (contradicted by this row's own
  `permit`/`landManager` fields and by Mount Larrabee's real position west of the NCNP
  boundary); `approach_logistics.trailhead` corrected from "Tomyhoi Lake Trailhead" (this
  route's own washout-contingency fallback) to "Twin Lakes Trailhead" (where this route's own
  waypoints/gpx/approach text actually start); `approach_logistics.trailheadDirection` restored
  from a mid-word truncation, using this route's own untruncated `approach` field; and
  `partner_requirements` plus `seasonal_hazards.{exposure,crevasses}` were rewritten to remove
  beta for an unrelated Mount Baker massif approach (Ptarmigan Ridge/Camp Kiser, roped glacier
  travel, crevasse rescue) that contradicted this same route's own `rope_type`, `rack`,
  `pro_needs`, `gear`, and `itinerary` — an enrichment-contamination defect of the shape
  CLAUDE.md already documents for other columns.
- `wa_the_rake` (area) — `lat`/`lng` moved from a point east of Mount Terror (off the Southern
  Pickets ridgeline entirely) to 48.7755/-121.3067, the point already sitting unused in this
  route's own GPX-track terminus and summit waypoint — verified against the confirmed
  west-to-east ridge order (Terror → The Rake → Twin Needles) and Wikipedia/USGS-sourced
  neighbor coordinates.
- `wa_the_roof` — `length_m` (122, ~400 ft) corrected to 15, matching this route's own
  `pitch_detail`/`rappels`/`descent_text` (all describe a single ~15 m/50 ft rappel) and
  external sourcing that Unicorn Peak's whole summit tower is only 50-70 ft tall.
- `wa_the_tooth_fairy` — `emergency.nearestHospital` corrected from Harborview Medical Center
  (downtown Seattle, ~1 hr away) to Snoqualmie Valley Hospital (~30-40 min via I-90), matching
  both sibling Tooth routes' already-correct value; Harborview is the trauma-transfer
  destination, not the nearest ER.
- `wa_the_triad_east_peak` / `wa_the_triad` (area) — four fixes: area `prominence_ft` (822,
  matching no source) corrected to 760 per Peakbagger/Wikipedia agreement; route `grade_num`
  (stored 0 for a route whose own grade string tops out at 5.4) corrected to 4, matching this
  catalog's own numeric-YDS grade_num convention; `gain_ft` (3920, a straight elevation delta)
  corrected to 5410 to match `loss_ft` on a route that explicitly reverses the same trail
  car-to-car — this route's own `itinerary.days[0]` already carried the correct,
  trip-report-sourced 5410/5410 pair; and `fa` (null) populated from this route's own
  already-stated overview prose ("Dick Eilertsen, Dick Lowery, Dick Scales, and Don Wilde,
  1949"), independently corroborated via WebSearch.

**Also flagged for human review, not fixed:**
- `wa_the_triad` (area) — `parent_peak` (null) should likely be set to `'wa_eldorado_peak'`
  (Eldorado Peak is The Triad's topographic line parent per Peakbagger/Wikipedia, and this
  row's own blurb already says "~2 miles southwest of Eldorado Peak"). **Not written to the SQL
  file**: live DB read access degraded partway through this run — every `areas` query timed out
  for roughly the back half of the batch, including retries of a query pattern that had worked
  minutes earlier — so `wa_eldorado_peak`'s existence as a live area id could not be
  independently confirmed before committing. A human should confirm the id is live, then apply
  `UPDATE areas SET parent_peak = 'wa_eldorado_peak' WHERE id = 'wa_the_triad';` (left as a
  commented-out note at the bottom of the SQL file).
- `wa_the_monk_west_cracks_right_crack` — `corrections` claims "Grade (5.7, 2 stars) verified
  on Mountain Project" while `stars` is `null` — the same corrections/stars mismatch pattern
  flagged (not fixed) on sibling Monk routes last batch. Mountain Project was blocked for
  WebFetch again this run, so the actual current star count could not be independently pulled.
- `wa_the_triad_east_peak` — whether "East Peak" is actually the correct summit name for this
  route's own beta. The two trip reports this route's own `itinerary.sourceNote` cites by name
  are both titled "...to Main/Middle Summit," not "East Peak," and Wikipedia/Peakbagger-derived
  figures list the middle peak, not the east, as the range's true high point at the same
  nominal elevation. Could not resolve — the two cited TR sites (CascadeClimbers.com,
  jeffreyjhebert.com) were both blocked for WebFetch this run.
- `wa_the_needle_neve_glacier` — the attached `gpx` track almost certainly terminates on
  **Snowfield Peak's** summit (36 m from Snowfield's sourced coordinate), not The Needle's own
  summit waypoint (939 m from the track's nearest point, vs. 7-28 m for every other waypoint on
  this same route) — a reused/mislabeled Snowfield-Neve tour track, consistent with this row's
  own `data_quality` sourceNote admitting no trip report documents The Needle specifically
  start-to-finish. No corrected track exists to substitute; needs a human with CalTopo access.
  Also flagged: `grade_num: 0` for a `Class 3/4`-graded route reads as an unparsed fail-open
  default rather than a real 0 rating (same anti-pattern CLAUDE.md warns against elsewhere) —
  not fixed, since the intended value (3 vs. 4) isn't resolvable from this row alone.
- `wa_the_pyramid_picket_south_route` — several unresolved items, none independently fixable
  this run: the route may actually be Beckey's "West Ridge," not "South Route," per one
  indirect source citation (StephAbegg, blocked for direct read); `dist_km` (27.68) appears to
  already be a round-trip figure rather than the one-way convention this column is supposed to
  follow catalog-wide (per CLAUDE.md's existing warning against bulk-normalizing this column —
  recommend `npm run audit:distances` on this id specifically rather than a one-off fix); two
  different trailhead coordinates ~450 m apart are both labeled "Goodell Creek" within the same
  row; and `rappels: "None standard"` sits in tension with `descent`/`itinerary` text describing
  a short rappel most parties use.
- `wa_the_tooth_r1` (Northeast Slabs) — `fa` ("Jim Nelson & Paul Stevenson, 1982") could not be
  corroborated against any accessible source this run (already self-flagged `LOW` confidence
  in the row); `watch_out` is stored as a `\n`-delimited string rather than an array, unlike
  both sibling Tooth routes — a structural inconsistency, not a sourced factual error.
- `wa_the_tooth_south_face` — `length_m` (101 m / ~330 ft) vs. one recurring web claim the wall
  is "400 feet" — sources conflict with no clear tiebreaker; on-file value matches one of two
  commonly-cited figures, so left unchanged.
- `wa_the_roof` — whether "The Roof" is genuinely a distinct, formally named line on Unicorn
  Peak's summit block, vs. an informal label for one of several unnamed 4th-class-to-5.6 lines
  described by available sources — already self-hedged in the row (`gear_confidence:
  "inferred"`); not independently resolvable without Mountain Project/SummitPost access.
- Minor internal-consistency-only notes left as-is (no external source to adjudicate):
  `wa_the_pleiades_scramble` gain/loss figures (3400 vs 3200, already self-documented in the
  row's own `itinerary.sourceNote`) and region label ("Baker / Twin Sisters"); `wa_the_roof`
  `gain_ft` vs. `itinerary` gain (2397 vs 2600); `wa_the_rake` elevation (7869 vs. this same
  route's own 7840 ft summit waypoint, both figures independently sourced elsewhere) and
  unverified prominence; `wa_the_pyramid_picket_south_route` unverified prominence.

**Clean (2):** `wa_the_tooth_r1` (Northeast Slabs) and `wa_the_tooth_south_face` (South Face)
matched external sourcing on every other checkable field (grade, pitches, FA, permit/access,
group limit, hazards).

**Tooling note:** Mountain Project, SuperTopo, theCrag, SummitPost, Wikipedia, Peakbagger,
stephabegg.com, WTA, USFS, NPS, AAC Publications, Alpinist, Climbing.com, CascadeClimbers,
Mountaineers.org, and web.archive.org were all blocked for WebFetch across every research agent
this batch (same domain family flagged blocked in the two preceding batches) — findings above
rest on WebSearch snippet synthesis except where noted. Separately, live DB read access via the
anon key degraded significantly partway through this run: every `areas` query timed out for the
back half of the batch, including retries of query patterns that had succeeded minutes earlier
in the same session. One finding (`wa_the_triad.parent_peak`) was downgraded from a confirmed
fix to a flagged item as a result, rather than write an area-id reference whose target could not
be independently confirmed live. `npm run check:sql -- audits/sql/2026-08-13-batch-107.sql`
**could not complete** — Supabase itself returned a Cloudflare 522 ("Connection timed out"
connecting to the origin) starting partway through this run, and the outage held through 5
retry attempts spread over ~14 minutes (01:06-01:20 UTC), each hitting either the same 522 or a
raw fetch timeout. This is an external infrastructure outage, not a proxy or query-shape issue —
the same anon key and query patterns had succeeded earlier in this same run. The two structural
WARNs `check:sql` did emit before the outage (both on `wa_the_pleiades_scramble`'s
`partner_requirements`/`seasonal_hazards` statements, "UPDATE with no literal id predicate — not
checkable") are a known limitation of its single-line-id-predicate regex on multi-line jsonb
statements, not a defect in those statements — both carry a correct `WHERE id = ...` clause one
line below the `SET`, same shape as a WARN noted (and manually verified clean) in batch 106.
**A human should re-run `npm run check:sql -- audits/sql/2026-08-13-batch-107.sql` once Supabase
is confirmed healthy, before applying any statement in this file.**

Next batch continues alphabetically after `wa_the_triad_east_peak` (see progress file).

## 2026-08-13 -- Run skipped: Supabase unreachable

This scheduled run could not start batch 108. Every request to
`ofuofhojhbcrcahuotya.supabase.co` (REST endpoint, anon key, same query shape that
worked in batch 107) failed to connect at all -- 14 attempts across ~16 minutes
(02:32-02:44 UTC), each either a bare curl timeout or (per `curl -v`) a completed TLS
handshake followed by no HTTP response within 12s. No Cloudflare error page was even
returned this time, which is a step worse than batch 107's tail-end 522s from the same
host earlier the same day (01:06-01:20 UTC) -- this looks like a continuation of, or a
second instance of, that same outage rather than a new unrelated issue. `github.com`
was reachable throughout, so this is Supabase-side, not local/proxy.

No batch was picked, no SQL written, `wa-alpine-audit-progress.json` is unchanged --
`last_processed_id` is still `wa_the_triad_east_peak`.
The next run should just retry batch 108 (routes after `wa_the_triad_east_peak`
alphabetically) as normal; nothing here needs manual recovery.

## 2026-08-13 -- Run skipped: Supabase still unreachable (third consecutive attempt)

Same outage, still not recovered. 10 attempts against
`ofuofhojhbcrcahuotya.supabase.co/rest/v1/routes` over ~13 minutes (04:31-04:44 UTC),
same query shape as every prior batch:

- 8 of 10: bare curl timeout (20s), zero bytes received -- no TLS/HTTP response at all.
- 2 of 10: a real HTTP response, but `503` with body
  `{"code":"PGRST002","message":"Could not query the database for the schema cache. Retrying."}`.

PGRST002 is PostgREST reporting it cannot reach the underlying Postgres instance to
build its schema cache -- this is not a network/proxy/auth problem on this side (a bare
`GET /rest/v1/` with no query returned a normal `401` instantly, so the edge/gateway is
up; only the database-backed queries fail). `github.com` remained reachable throughout.

This means the outage has now held continuously since at least 01:06 UTC through
04:44 UTC (3h38m+) across three separate scheduled runs, and it is the project's actual
Postgres instance that is degraded -- which would affect the live ClimbMatch app's
DB-backed routes/areas for real users too, not just this audit.

No batch was picked, no SQL written, `wa-alpine-audit-progress.json` is unchanged --
`last_processed_id` is still `wa_the_triad_east_peak`. Next run: retry batch 108 as
normal. If this keeps recurring, worth checking the Supabase project dashboard directly
(billing/pause state, compute add-on) rather than continuing to retry blind from here.

## 2026-08-13 -- Pass 2, Batch 108 (Supabase outage recovered)

Supabase is healthy again as of this run -- a bare `GET /rest/v1/` returned 401 (gateway up)
and a real `routes` query returned 200 in ~1s, first try. The outage logged in the two prior
skipped-run entries held from at least 01:06 UTC to sometime before this run started; total
downtime across three consecutive scheduled runs was 3h38m+. No action needed here beyond
noting recovery -- this was infrastructure-side (PGRST002, DB unreachable), not this audit's
to fix.

Eight routes, five peaks (North Early Winters Spire 1, Three Fingers 3, Three Queens 2,
Tomyhoi Peak 1, Lexington Tower 1): The West Face; North Peak (Lookout route), Middle Peak
(South Face), South Peak via Lookout (Three Fingers); Middle Peak South Chimney, West Peak
West Ridge-West Face (Three Queens); Southeast Ridge (Tomyhoi); Tooth and Claw (Lexington
Tower).

**Confirmed errors -> fixes in `sql/2026-08-13-batch-108.sql`:**
- The West Face: `fa` misspelled "Dave Beckstad" -- corrected to "Dave Beckstead" (theCrag and
  other independent sources agree on this spelling for Beckey's 1965 partner).
- The West Face: `overview` stated "roughly 500 ft (152 m)" against this same row's own
  `length_m` of 201 (~660 ft) -- external sources (theCrag: 200m) support the 660 ft figure,
  not 500 ft. Fixed the prose to match the structured field.
- Three Fingers South Peak via Lookout: `loss_ft` (4200) vs `gain_ft` (5750) for a route whose
  own `descent` field says "Reverse the route" -- no source describes an alternate lower exit,
  so this reads as a data-entry bug. Set `loss_ft` = `gain_ft` = 5750.
- Three Queens Middle Peak (South Chimney): `dist_km` (4.3) was roughly half the true one-way
  distance -- the row's own primary source (a 2007 trip report that already matches this row's
  gain/loss/timing figures exactly) states ~10 miles round trip, which converts to ~8.05 km
  one-way under this app's doubling convention. The stored 4.3 km suspiciously matches a
  *partial* leg the same report separately describes (a 2.8-mile hike back to the car from the
  base of the talus). Corrected to 8.05.
- Tooth and Claw: `gpx`'s first two points were byte-identical low-precision duplicates of the
  topout waypoint, while the higher-precision true summit fix (Peakbagger-confirmed) already
  sat correctly as the track's last point -- dropped the duplicate leading point.

**Flagged for human review (not auto-fixed):**
- The West Face: Blue Lake Trailhead elevation is internally inconsistent (5,200 ft in
  waypoints vs 5,400 ft in approach text), and external sources themselves disagree across a
  5,200-5,400 ft range -- needs a human pick, not a guess.
- The West Face: FFA partner "Dave Tower, 1985" -- Risse's general association with an early
  free ascent of this route is corroborated, but the specific partner name/year could not be
  independently confirmed this pass.
- Tooth and Claw: the *sibling* route's (West Face) FFA date/partner overlaps with the item
  above -- same open question, not a sign of the two routes' FA records being confused with
  each other (both are independently sourced and distinct).
- Three Fingers South Peak via Lookout: overview's "built ... by Darrington-area mountaineers"
  is technically accurate (Forest Service personnel/locals) but risks being misread as
  crediting The Mountaineers club, which only took over trail maintenance decades later in
  1985 -- wording risk, not a factual error.
- Three Fingers Middle Peak: `high_point_ft` (6800) passes the sanity check (below both the
  confirmed North Peak 6,870 ft and South Peak ~6,854-6,870 ft) but the exact Peakbagger figure
  for this specific subsidiary summit could not be pulled live (page unreachable this run).
- Three Queens Middle Peak / West Peak: neither route carries a summit waypoint, and West Peak
  also lacks a trailhead waypoint and never captures its named intermediate camp (Spectacle
  Point) -- completeness gaps, not factual errors.
- Three Queens West Peak: Spectacle Point camp elevation (5,800 ft) and `length_m` (183) could
  not be independently verified -- thin documentation on an obscure line.
- Tomyhoi Peak Southeast Ridge: `length_m` (61) is plausible as a "technical crux only" figure
  (route is `pitches: 0`) but no source states it directly.

**Clean (2):** Three Fingers North Peak (Lookout route) and Three Queens West Peak matched
external sourcing on every checked field (elevation, grade, gain/loss, distance, FA/lookout
history where applicable) with no internal inconsistencies.

**Tooling note:** WebFetch was blocked network-wide for every specific route/reference page
attempted across all five research passes this batch (Mountain Project, SuperTopo, theCrag,
SummitPost, Wikipedia, USFS, Peakbagger, WTA, StephAbegg, NC Mountain Guides, and others) --
same domain-family block recorded in batch 107 and the two preceding it. All findings rest on
WebSearch snippet synthesis of those same sources rather than direct page reads; flagged
per-item above where that materially weakens confidence. `npm run check:sql --
audits/sql/2026-08-13-batch-108.sql` ran clean this time (Supabase healthy): all 5 write
targets exist, no DELETE removes an only copy.

Next batch continues alphabetically after `wa_tooth_and_claw` (see progress file).

## 2026-08-13 -- Pass 2, Batch 109

Eight routes, six peaks (The Tooth 1, Tower Mountain 1, Trapper Mountain 2, Main Peak/Mount
Index 1, Tricouni Peak 1, Vesper Peak 1, Burgundy Spire 1): Tooth-Chair Traverse; Southwest
Route/Standard (Tower Mountain); North Couloir and South Slopes (Trapper Mountain); Traverse
of Mount Index; Southwest Slopes/Lucky Pass (Tricouni Peak); True Grit (Vesper Peak);
Ultramega OK (Burgundy Spire).

**Confirmed errors -> fix in `sql/2026-08-13-batch-109.sql`:**
- Tooth-Chair Traverse: `length_m` (274, ~900 ft) is far short of the traverse's real crest
  distance. Mountain Project's page for this exact route states "approximately 1.5 miles" on
  the crest -- and that same page's other facts (the ~50 ft mandatory rappel off Bryant Peak,
  the 3-4 hour crest timing) already match this row exactly, which is strong corroboration MP
  is this row's real source. Corrected to 2,414 m (1.5 mi). `dist_km` (4.8, already tracking
  MP's separately stated "4-5 miles in and out" under this app's one-way/doubling convention)
  needed no change.

**Flagged for human review (not auto-fixed):**
- Trapper Mountain South Slopes -- likely data contamination, not a simple factual slip. This
  row's `approach` text, `waypoints`, and `gpx` all describe reaching Trapper Lake via a boat/
  floatplane trip to Stehekin, then Harlequin Campground and a Devore Creek Trail junction --
  but every other signal points to Trapper Lake actually being reached from Cascade Pass:
  this row's own `beta` field says so, the sibling `wa_trapper_mountain_north_couloir` row
  (same peak) approaches via Cascade Pass/Pelton Basin with matching Trapper Lake coordinates,
  and independent sources (a WTA trip report and an NWHikers.net thread titled "Trapper lake
  via Cascade Pass") both document that exact approach with real hiking times. No source found
  ties Trapper Mountain to Devore Creek at all -- that drainage is the real, documented approach
  to a *different* set of peaks (Tupshin, Devore, Flora), reached from the same Harlequin
  Campground/Stehekin River Trail start point this row uses, which is the likely source of the
  mix-up. The stored `gpx` is also internally broken regardless of source: it jumps roughly
  25 km between its 2nd and 3rd points with nothing in between, which no continuous hike could
  produce. `gain_ft`/`loss_ft`/`dist_km` (5800/5800/30.58) are all downstream of the same wrong
  approach. Not fixed here -- correcting it means re-deriving real waypoints/mileage for the
  Cascade Pass approach, which is a re-enrichment job, not a one-line correction this audit can
  respons­ibly guess at.
- Tricouni Peak Southwest Slopes: `length_m` (274, same 900 ft figure as the Tooth-Chair
  Traverse fix above) has no route-specific source behind it -- no source found states an exact
  footage for this route's Class 3-4 summit scramble, and the identical value recurring on an
  unrelated route in the same batch reads like a shared placeholder rather than two coincidental
  measurements. Left alone rather than guessing a replacement number.

**Clean (5):** Tower Mountain Southwest Route (1913 FA, 8,444 ft elevation, and the loose-rock/
class-3 gully hazard description all confirmed against SummitPost/Wikipedia/ListsOfJohn),
Trapper Mountain North Couloir (1970s foot FA by Roper/Avreitt/Ferguson and the 2012 Stewart/
Spoonde first ski descent both confirmed, including the unusual "Spoonde" spelling), Traverse
of Mount Index (Beckey/Schoening August 1950 FA "in sneakers over two nights" confirmed
verbatim), True Grit (Darin Berdinka 2015 FA and spelling confirmed via his own Mountain
Project/Instagram profile; pitch_detail lengths sum exactly to the stored length_m), Ultramega
OK (Mark Allen/Tom Smith July 24, 2004 FA confirmed via a CascadeClimbers trip report; pitch_
detail lengths sum exactly to the stored length_m -- the overview's separate "~900 ft" prose
undershoots the precise 310 m/1,017 ft by about 13%, but it's explicitly an approximate figure
in prose, not a structured field, so not treated as an error).

**Tooling note:** WebFetch was blocked network-wide again for every specific route/reference
page attempted (mountainproject.com, turns-all-year.com) -- same block recorded in the last
several batches. All findings rest on WebSearch snippet synthesis; flagged per-item above where
that materially weakens confidence. `npm run check:sql -- audits/sql/2026-08-13-batch-109.sql`
ran clean: the 1 write target exists, no DELETE removes an only copy.

Next batch continues alphabetically after `wa_ultramega_ok` (see progress file).

## 2026-08-13 -- Pass 2, Batch 110

Seven routes, six peaks (Mount Stuart 1, Vasiliki Ridge/Ares Tower 1, Vesper Peak 1,
Warrior Peak 1, Mount Washington/Ellinor traverse 1, West Craggy Peak 1, North Peak/Gunsight
Range 1): Upper North Ridge w/Great Gendarme; Standard Route (Ares Tower); North Face
(Ragged Edge); Southeast Peak Standard (Home Lake approach); Washington Ellinor Traverse;
Standard Route (Copper Glance Basin); West Face (North Peak).

**Confirmed errors -> fix in `sql/2026-08-13-batch-110.sql`:**
- Upper North Ridge w/Great Gendarme (Mount Stuart): `fa` had the two 1956/1964 credits
  backwards. Stored text read as though Rupley & Gordon climbed the Great Gendarme
  directly in 1956 and Wickwire & Stanley did the general upper-ridge linkup in 1964.
  Three independent sources (a Mountain Project route-profile synthesis, an AAC
  Publications incident report on this exact route, and Grokipedia's Jim Wickwire page)
  agree on the opposite: Gordon & Rupley's 1956 first ascent of the North Ridge bypassed
  the Great Gendarme rather than climbing it, and Wickwire & Stanley made the first ascent
  of the Great Gendarme itself in 1964. Fixed.
- West Face (North Peak, Gunsight Range): `approach` opened with a claim that the area's
  stored coordinates erroneously place it at Washington Pass and are "likely a data/
  geocoding error worth flagging for correction." That claim is false as of this run --
  the area's live coordinates (48.3068, -120.994) match Wikipedia's Gunsight Peak entry
  (48.30667N, 120.99389W) to four decimal places, correctly placing it near Dome Peak in
  the Glacier Peak Wilderness, nowhere near Washington Pass. Whatever coordinate error this
  note once described has since been corrected and the warning was never removed, so it
  was actively telling climbers to distrust a location that is now right. Removed the
  stale claim; kept the accurate Downey Creek/Ptarmigan Traverse approach text that
  followed it.

**Flagged for human review (not auto-fixed):**
- West Face (North Peak): the same `approach` field's closing sentence says "before
  reaching the base of South Peak's granite faces," but this route's own area is North
  Peak, not the sibling South Peak area a few hundred feet away in the same range --
  reads like cross-contamination between the two peaks' enrichment write-ups (both share
  essentially the same approach). Left as "South Peak's" in the SQL fix above rather than
  silently rewording it, since the audit couldn't independently confirm which peak's face
  the original write-up actually meant.
- West Face (North Peak): `rappels` ("4 double-rope rappels (~50m, 50m, 50m, 20m)", summing
  to ~170m) disagrees with `descent`/`descent_text` (both say "four double-rope rappels of
  approximately 30m each," ~120m total) for what should be the same four rappels off the
  same route. No source found gives an authoritative length for each individual rappel, so
  this is flagged rather than guessed at; the `rappels` total is at least the more plausible
  of the two against the route's own 183m/600ft length.

**Clean (5):** Standard Route/Ares Tower on Vasiliki Ridge (Beckey & Staley's May 31, 1952
FA confirmed, and the route's own hedge that Ares-Tower-specific FA credit is unconfirmed
beyond the general Vasiliki Ridge party ascent matches what's findable); North Face/Ragged
Edge on Vesper Peak (Berdinka & Pires, Aug 18 2013 FA confirmed verbatim, 6 pitches/5.7
confirmed, gain_ft 4115 vs WTA's stated 4,114 ft near-exact match); Warrior Peak Southeast
Peak Standard (Beckey solo 1945 FA confirmed, high_point_ft 7320 and "11th-highest Olympic
peak" both confirmed verbatim against Wikipedia); Washington Ellinor Traverse (Mount
Washington's 6,260 ft elevation confirmed exactly, route description matches independent
trip-report beta on "The Wedge" and the crux gendarme downclimb); West Craggy Peak Standard
Route (the Feb 8-9, 2020 probable-first-winter-ascent claim confirmed independently, Copper
Glance Trailhead elevation close match). One elevation note: West Craggy's `high_point_ft`
(8372) and the area's `elevation_ft` (8366) each match a different, independently
citable source (a Wikipedia "Big Craggy Peak" mention giving West Craggy as 8,372 ft vs a
Mountaineers.org page giving 8,366 ft) -- both plausible, not treated as an error.

**Tooling note:** WebFetch was blocked network-wide again for every specific route/reference
page attempted (stephabegg.com, alpinist.com) -- same block recorded in every batch this
pass. All findings rest on WebSearch snippet synthesis; flagged per-item above where that
materially weakens confidence. `npm run check:sql -- audits/sql/2026-08-13-batch-110.sql`
ran clean: both write targets exist, no DELETE removes an only copy.

Next batch continues alphabetically after `wa_west_face_2` (see progress file).

## Batch 111 — 2026-08-13

Seven routes, next-alphabetically after `wa_west_face_2` and filtered to `area_type='peak'`
(three sibling ids in this id range -- `wa_west_ridge_2`, `wa_western_dihedral`,
`wa_wright_pond` -- sit under crag/wall areas and were skipped per scope): West Twin Needle
South Route (Southern Pickets), Whatcom Peak Southwest Route/Whatcom Glacier, Whitehorse
Mountain Northwest Shoulder (both the standard and the early-season snow/ice variant), Windy
Peak via Iron Gate Trailhead, Windy Peak via Windy Creek Trail, Witches Tower South
Face/Standard Route.

**Confirmed fixes (0):** none this batch.

**Clean (7):** all seven. West Twin Needle's elevation (7,936 ft) and FA (Degenhardt, Martin
& Strandberg, Aug 17 1932) both confirmed verbatim against Wikipedia/AAC Publications, and
the peak's own area coordinates place it correctly in the Southern Pickets relative to the
Goodell Creek trailhead. Whatcom Peak's elevation (7,574 ft) and FA (Fred Berry & Lawrence
Buchanan, 1936) both confirmed exactly against Wikipedia; the route's own `corrections` field
already flags that no source uses the literal name "Southwest Route" (Mountain Project calls
it "South Spur") -- documentation of a naming ambiguity, not a data defect, left as-is.
Whitehorse Mountain's FA (Nels Bruseth, 1909) confirmed, and its Boulder River Wilderness
permit-free access matches the Forest Service's own posture for that trailhead. Windy Peak's
elevation (8,335 ft) confirmed exactly against Wikipedia/Peakvisor for both approach-route
rows, which correctly share the same final Class 2 summit scramble and summit waypoint.
Witches Tower's elevation (8,566 ft, corrected in an earlier pass) reconfirmed against
Wikipedia, and its stated 2026 Enchantment lottery window (Feb 15-Mar 1 application, Mar 17
results) matches Recreation.gov's published 2026 dates exactly.

**Needs human verification (not fixed, too weak to act on):** Whitehorse Mountain's two
routes both give `high_point_ft: 6852`, which matches listsofjohn.com's figure for the peak,
but the parent `areas.elevation_ft` is 6851 -- a 1 ft internal mismatch. Left unfixed because
external sources for this specific peak disagree by far more than that: Wikipedia gives
"6,840+ ft" (old 40-ft-contour estimate), Peakery gives 6,839 ft, and other trip-report
references cite 6,857 ft -- an 18 ft spread. Picking listsofjohn's 6,852 to resolve a 1 ft
internal inconsistency would be arbitrary given how unsettled the peak's true elevation is
across sources; flagging for a human to decide which convention (if any) to standardize on
rather than guessing.

**Tooling note:** WebFetch was unavailable this run (network-restricted sandbox has no route
to stephabegg.com/alpinist.com-style reference pages); all findings rest on WebSearch snippet
synthesis, consistent with every batch this pass. No SQL file this batch -- nothing to write.

Next batch continues alphabetically after `wa_witches_tower_south_face` (see progress file).

---

## 2026-08-13 — Pass 2 complete; Pass 3, Batch 112

Pass 2 is done: a scope query for routes after `wa_witches_tower_south_face` returned zero
rows, confirming all 535 currently-in-scope routes have been audited this pass. Pass 3 starts
over from the top of the `id ASC` ordering (facts go stale; per the recurring-audit brief a
completed pass restarts rather than stopping). Total in-scope count is unchanged at 535 (593
WA rows tagged alpine/mountaineering catalog-wide, 535 of those under a `peak`-type area).

First eight routes, alphabetically: A Servant To Liberty (Liberty Bell Mountain), South Ridge
(Abernathy Peak, via Scatter Lake), Action Potential (Burgundy Spire), West Route (Agnes
Mountain), Round Mountain Trail/Standard Route (Alpine Lookout), Northeast Face and Southeast
Face/South Ridge (American Border Peak, both routes), Finger of Fatwa (Amphitheater Mountain).

**Confirmed fixes (0):** none this batch.

**Clean (8):** all eight, and this batch got unusually thorough web corroboration. Peak
elevations confirmed exactly against independent sources for six of the eight peaks: Liberty
Bell Mountain 7,720 ft, Burgundy Spire 8,492 ft (listsofjohn — an earlier SummitPost hit only
gave an approximate "~8,400 ft," which would have been a false alarm if trusted alone),
American Border Peak 7,998 ft (Wikipedia; listsofjohn's 8,033 ft is a known outlier, not used),
Agnes Mountain 8,119 ft, Amphitheater Mountain 8,358 ft with its summit coordinate matching the
stored waypoint to within ~15 m, and Alpine Lookout 6,237 ft. Abernathy Peak's 8,321 ft matches
the commonly-cited/Bulger-list figure; listsofjohn's 8,332 ft is the outlier there. First-ascent
records confirmed verbatim: Agnes Mountain (W. Ronald Frazier & Dan O'Brien, 1936, via the West
Fork of Agnes Creek — matches Beckey's account exactly, including that it's rarely climbed),
American Border Peak (Alec Dalgleish, Tom Fyles, Stan Henderson, R. A. Fraser, Sept 14 1930),
and Action Potential (Mark Allen & Mike Layton, 2004 — a CascadeClimbers trip report confirms
the FA date and party). A Servant To Liberty's `waypoints` note documents its own prior
correction (2026-07-18, trailhead pin) and the route's Mikey Schaefer/2016/rope-solo FA and
former "A Slave to Liberty" name read as accurate.

**Needs human verification:** none. One internal-consistency oddity was chased down rather
than flagged: Agnes Mountain's West Route has `gain_ft: 4000` against `loss_ft: 6500`, which
looked like a mismatch at first (every other route this batch has equal or near-equal gain and
loss) — but it resolves cleanly once the approach is read: this is a backpack-in/high-camp
route (Swamp Creek Camp on the Agnes Creek Trail), and `loss_ft` matches the full descent from
the 8,119 ft summit back to the 1,650 ft trailhead almost exactly (6,469 ft), while `gain_ft`
is consistent with the climbing day's net ascent from a high camp rather than the whole
approach. Not a defect, just a different (and reasonable) accounting convention — no SQL
fix, and no reason to send it to a human.

No SQL file this batch — nothing to write. Next batch continues alphabetically after
`wa_amphitheater_mountain_finger_of_fatwa` (see progress file).

## Batch 113 — 2026-08-13

Eight routes, next-alphabetically after `wa_amphitheater_mountain_finger_of_fatwa`: both
Middle Finger Buttress lines on Amphitheater Mountain (Left Side, Right Side), the North
Ridge, Pilgrimage to Mecca, and the West Route (all five share the Amphitheater Mountain
peak); Anderson's Thumb Standard Route (Mount Anderson massif, Olympics); and both routes on
Argonaut Peak (Southeast Ridge, Northeast Couloir).

**Confirmed fixes (0):** none this batch.

**Clean (8):** all eight. Middle Finger Buttress Left Side (5.10b, 4 pitches) and Right Side
(5.9, 7 pitches) both confirmed against Mountain Project/theCrag search snippets — grade and
pitch count match exactly for both lines, including that the Left Side begins in a chimney
with an excellent hand crack and the Right Side climbs NW-side cracks with a pitch-3 crux.
Pilgrimage to Mecca's FA (Darin Berdinka and Owen Lunz, July 2004) confirmed verbatim against
Climbing.com's own feature on the route, including the ~20-mile approach and sub-2-hour climb
time. The North Ridge's grade (5.5) and Wikipedia's cited 5-pitch count fall within the
stored 5-7 pitch range the route's own beta text already documents as line-dependent — no
contradiction. Argonaut Peak's elevation (8,457 ft) reconfirmed exactly against Wikipedia
(already checked peak-level in batch 112 but rechecked here as a cross-reference), and its
Southeast Ridge route (Grade II, 5.6, 8 pitches, "two single or one double rope rappel into
the notch") matches a SummitPost description of the same route almost verbatim, including the
rappel count into the notch — strong corroboration that the route's own 2026-07-15
self-correction (renaming it from a phantom "East Ridge" to the real, documented Southeast
Ridge) was the right fix. The Northeast Couloir's permit/access text (Enchantment Permit Area
quota system for overnight, free day-use self-issue) is internally consistent with its Stuart
Lake/Colchuck Lake trailhead sitting inside the Colchuck Zone of the Enchantment Permit
boundary, unlike the Southeast Ridge's Ingalls Creek approach which correctly notes it falls
outside that boundary.

**Needs human verification:** none newly flagged. Anderson's Thumb's technical grade, FA, and
most gear detail remain unverifiable against any public source (no Mountain Project/SummitPost
page for the Thumb itself) — but the route's own `data_quality.gaps` and `corrections` fields
already document this exhaustively as auto-generated/unconfirmed, so re-flagging it here would
just restate what the record already says about itself. Its embedded waypoint note (documenting
a prior fix from a badly-misplaced West Fork Dosewallips trailhead coordinate to
47.7434,-123.2033) was spot-checked against a real West Fork Dosewallips River Trail trailhead
coordinate found via search (47.74359,-123.19138) — within ~900m, consistent with a trail-
junction area rather than a new error.

**Tooling note:** WebFetch was blocked network-wide again for every specific reference page
attempted (mountainproject.com, mountaineers.org, publications.americanalpineclub.org) — same
block recorded in every batch this pass. All findings rest on WebSearch snippet synthesis.

No SQL file this batch — nothing to write. Next batch continues alphabetically after
`wa_argonaut_peak_northeast_couloir` (see progress file).

## 2026-08-13 — Run skipped: database unreachable

No batch this run. Every `/rest/v1/*` data query (`routes`, `areas`) against the live
Supabase project hung indefinitely and eventually returned a proxy-level `504 upstream
request timeout` (measured at 126s on one `routes` attempt); repeated across 6 attempts over
several minutes, on both the `routes` and `areas` tables, with and without a `limit`. The
gateway itself is up — `/rest/v1/` and `/auth/v1/health` both answer in <1s with expected
401s — so this is the Postgres data path specifically being unreachable or paused, not a
network/proxy block (confirmed via `$HTTPS_PROXY/__agentproxy/status`: the CONNECT tunnel to
`ofuofhojhbcrcahuotya.supabase.co` succeeds, TLS completes, no relay failure logged for this
host — the request is sent and nothing ever comes back).

Per the audit guardrails (read-only, never fabricate or guess), no routes were checked, no
SQL was written, and `wa-alpine-audit-progress.json` was left untouched — `last_processed_id`
still points at `wa_argonaut_peak_northeast_couloir`, so the next run resumes at the correct
place rather than skipping a batch it never actually audited.

## 2026-08-13 — Batch 114 (pass 3): Austera Peak, Bacon Peak, Baring Mountain, Bear Mountain, Beckey-Davis

Database had recovered from the prior run's outage — a `routes?limit=1` probe answered in
<1s, so this batch proceeded normally. Checked 8 routes: Austera Peak's peak-level entry,
its Chockstone Route and Southwest Ridge/McAllister Glacier; Bacon Peak's Diobsud Creek/Green
Lake Glacier; Baring Mountain's Northwest Ridge and North Face; Bear Mountain's (Chilliwack)
North Buttress; and Prusik Peak's Beckey-Davis.

**Confirmed fixes (2):** `wa_beckey_davis` stored `pitches: 7` and a beta paragraph opening
"Seven pitches...", contradicting its own `pitch_detail` array (which itemizes exactly 6
pitches) and its own `rope_note` field (already correctly reading "6 pitches, 700ft").
StephAbegg's trip report is titled "Prusik Peak, Beckey-Davis (5.9, 700', 6p)" and Mountain
Project agrees — corrected to 6. `wa_austera_peak_southwest_ridge` stored `grade_num: 5` for
a route whose own `grade` field is "Grade II, 5.2" and whose own `rock_grade` field says
"Easy 5th (roughly 5.2-5.4, short sections)" — this catalog's grade_num convention is the
digits after the decimal (5.2 -> 2, not 5), confirmed by its own sibling route at the same
peak, `wa_austera_peak_chockstone_route`, which shares the identical 5.2 crux grade and
correctly stores grade_num 2. Corrected to 2. SQL: `audits/sql/2026-08-13-batch-114.sql`,
pre-flighted clean with `check:sql`.

**Clean (6):** Austera Peak's FA (Sept 16 1965, Joe & Joan Firey/John & Irene
Meulemans/Anthony Hovey) confirmed exactly against Mountain Project/Mountaineers sources.
Baring Mountain North Face's FA (Don Gordon and Ed Cooper, July 9-13 1960, Beckey on the
final summit team, building on Schoening/Berge's 1951 attempts) confirmed exactly against
AAC Publications. Bear Mountain North Buttress's FA (Fred Beckey & Mark Fielding, July 14-15
1967) and its IV/5.10/7-pitch/2200ft stats confirmed exactly against StephAbegg and AAC.
Austera Peak's own elevation (8,339 ft) and coordinates match the `areas` row exactly
(area_type=peak, same lat/lng). Austera Peak's Chockstone Route (5.2, ~60ft chimney) is
internally consistent with the Southwest Ridge route's own pitch_detail describing the same
summit-tower feature. Baring Mountain Northwest Ridge's elevation (6,127 ft) matches its area
row.

**Needs human verification:** none newly flagged this batch.

No other discrepancies found. Next batch continues alphabetically after
`wa_beckey_davis` (see progress file).

## 2026-08-13 — Batch 115 (pass 3): Beckey-Tate, Beyond Redlining, Big Four Mountain (x2), Big Kangaroo West Face, Big Snow Mountain (x2), Black Peak East Buttress

Checked 8 routes: Big Kangaroo's Beckey-Tate and West Face/West Route; Morning Star Peak's
Beyond Redlining (Vega North Tower); Big Four Mountain's Northwest Ridge and Spindrift
Couloir; Big Snow Mountain's East Ridge (Hardscrabble) and North Slope (Dingford) routes;
and Black Peak's East Buttress.

**Confirmed fixes (2):** `wa_big_four_mountain_spindrift_couloir` stored `max_angle: 90`,
contradicting its own `pitch_detail` array, whose "Upper mixed" pitch reads "drytooling moves
up to roughly 95-degree angles" — and AAC Publications' report on Bart Paull and Doug
Littauer's March 2, 1996 first ascent grades the route "IV+ 5.9 95 degrees" over 4,000 feet,
which also matches this row's own `length_m` (1219m), `alpine_grade` (IV+), `rock_grade`
(5.9) and `ice_grade` (WI5) — every other stat on the row already agreed with the primary
source except `max_angle`. Corrected to 95. `wa_big_kangaroo_west_face` stored
`grade_num: NULL` despite its own `rock_grade` ("5.6") and its own `pitch_detail` crux pitch
(also 5.6, "a steep move past a single old, rusty 1/4-inch bolt to the tiny summit"); the
catalog's grade_num convention (digits after the decimal) is confirmed by the sibling route
on the same peak, `wa_beckey_tate` (5.9+ -> grade_num 9). Corrected to 6. SQL:
`audits/sql/2026-08-13-batch-115.sql`, pre-flighted clean with `check:sql`.

**Clean (3):** Big Four Mountain's Northwest Ridge FA (Forest Farr & Art Winder, July 19
1931) and summit elevation (~6,160-6,170ft) confirmed against Wikipedia/AAC-era secondary
sources. Both Big Snow Mountain routes' summit elevation (6,680ft) confirmed against
Wikipedia, and both routes' `gain_ft` matches their own trailhead-to-summit waypoint
elevations exactly (5,280ft and 5,300ft respectively). Black Peak's summit elevation
(8,970ft) and Rainy Pass/Wing Lake approach line confirmed against WTA/Wikipedia; its
coordinates land correctly on the Wing Lake basin peak, not a namesake elsewhere in the
state.

**Needs human verification (not fixed — flagged only):**
- `wa_black_peak_east_buttress`'s `access.permit` text states NCNP backcountry permits are
  free. Several 2025/2026 secondary sources describe a new NPS fee structure ($10/person +
  $6 non-refundable reservation fee) for North Cascades NP backcountry overnight stays.
  `nps.gov` itself was unreachable from this environment (egress-blocked), so this could not
  be confirmed against the primary source, and this boilerplate permit sentence likely
  recurs across many other NCNP-area routes in the catalog — a single-row fix would be
  incomplete. Recommend a dedicated pass once someone can read nps.gov directly.
- `wa_beckey_tate` and `wa_big_kangaroo_west_face` share one 91-point gpx track (measures
  1.42mi/2.29km) that matches neither route's own `dist_km` (6.92km and 1.9km) nor either
  route's own approach-text mileage claim (~2mi to base for Beckey-Tate, ~3mi to the roped
  pitches for West Face) — and Beckey-Tate's text explicitly calls its own approach "longer
  and more sustained" than West Face's, which is backwards from what the two approach-text
  mile figures say on their own. Too tangled to resolve to one confident number without a
  primary source (e.g. a GPX track that actually reaches each route's own base).
- `wa_beyond_redlining`'s FA date ("May 2020") — two independent web searches for the same
  Roberts/Hicks first ascent returned two different specific dates (May 29 vs July 11,
  2020). The DB's month-level claim isn't contradicted by either, so left unchanged, but the
  exact date could not be pinned down with this environment's available sources.

No web-egress access to individual site domains (Mountain Project, AAC Publications,
StephAbegg, SummitPost, nps.gov, wta.org, Wikipedia, etc.) was available this run — only
WebSearch's own aggregated results were reachable, which is weaker corroboration than a
direct primary-source read and is the reason for the three human-verification flags above
rather than confident fixes.

Next batch continues alphabetically after `wa_black_peak_east_buttress` (see progress file).

## 2026-08-14 — Batch 116 (pass 3): Black Peak Northeast Ridge, Bonanza Peak (x3), Booker Mountain, Boston Peak, Boving-Christensen, Boving Roofs

Checked 8 routes: Black Peak's Northeast Ridge; Bonanza Peak's Mary Green Glacier (standard
route), North Ridge and Northeast Buttress; Booker Mountain's Northeast Face; Boston Peak's
Southeast Face; Prusik Peak's Boving-Christensen; and South Early Winters Spire's Boving
Roofs.

**Confirmed fix (1):** `wa_bonanza_peak_north_ridge` stored `gain_ft: 3800`, but the route's
own two waypoints (Holden Village trailhead 3,300 ft, Bonanza Peak summit 9,511 ft) net
6,211 ft of gain — and its own `itinerary` text shows why: 3,800 ft is roughly the *summit
day* leg from high camp, not the full trailhead-to-summit gain that `gain_ft` represents
everywhere else in this catalog (it feeds the Planner's Naismith-style time estimate
directly). The two sibling routes on this exact peak, sharing nearly the same trailhead —
`wa_bonanza_peak_mary_green_glacier` and `wa_bonanza_peak_northeast_buttress` — both store
`gain_ft: 6300` against a 3,262 ft trailhead and 9,516 ft summit (diff 6,254, rounded),
i.e. both measure the full trip, not one day of it. Corrected to 6200. SQL:
`audits/sql/2026-08-14-batch-116.sql`, pre-flighted clean with `check:sql`.

**Clean (5):** Black Peak's Northeast Ridge FA (Roger Jackson and Michael Kennedy, September
1, 1973) confirmed exactly, and its `gain_ft` (4130) matches its own trailhead (4,855 ft) to
summit (8,970 ft) waypoints within normal trail-profile margin. Bonanza Peak's original 1937
FA (Curtis Ijames, Barrie James, Joe Leuthold, Mazamas) confirmed exactly. The Northeast
Buttress's 2004 three-summit-traverse FA (Kurt Buchwald, Peter Avolio, Martin Volken, Aug
21-22) confirmed exactly against AAC Publications, including the route's own `rock_grade`
(5.7/5.8) matching the source's "V 5.7/5.8" rating. Booker Mountain's Northeast Face FA (Dan
Davis and John Holland, August 22 1964, AAJ 1965) confirmed exactly, elevation (8,284 ft) and
coordinates match the area row. Boston Peak's elevation (8,894 ft) and coordinates match the
area row exactly, and `gain_ft` (5600) is consistent with its own trailhead/summit
waypoints. All six routes' summit coordinates land within a tight margin of each peak's known
published position; area hierarchy placement checked for Bonanza Peak specifically (filed
under "Entiat Mountain Range," a broader regional grouping that legitimately includes it
alongside Mount Maude/Seven Fingered Jack/Fernow, even though its actual approach is via Lake
Chelan/Holden rather than the Chiwawa River) — not a defect.

**Confirmed context, not a defect:** the flood/landslide closure text on all three Bonanza
Peak routes (FR 8301 and Holden Village closed for the 2026 season, boat shuttle suspended)
matches independent news coverage of the December 2025 Railroad Creek flooding almost exactly
— correct road number, correct dates, correct scope.

**Needs human verification (not fixed — flagged only):**
- `wa_black_peak_northeast_ridge`'s `access.permit` carries the same "free backcountry
  permit" claim already flagged on `wa_black_peak_east_buttress` last batch, unresolved for
  the same reason (nps.gov unreachable from this environment). Not re-flagging in detail;
  same open question, same peak.
- Bonanza Peak's own elevation is genuinely contested across sources: 9,511 ft is a
  traditional/older figure, a 2020s lidar re-survey reportedly revised it to 9,503 ft, and
  other current sources (incl. Wikipedia) cite 9,516 ft. In this catalog, the `areas` row and
  two of these three routes' summit waypoints store 9,516 ft, while `wa_bonanza_peak_north_ridge`
  alone stores 9,511 ft. Since even the "authoritative" real-world figures disagree with each
  other, left `wa_bonanza_peak_north_ridge`'s 9,511 ft unchanged rather than guessing which is
  right — flagging the 3-way disagreement (9,511 / 9,516 / 9,503) for a human to settle.
- `wa_boving_christensen`'s FA is stored as "Paul Boving and Matt Christensen (year not given)"
  — already an honest non-claim, and this run couldn't pin a date either: one aggregated
  source implies a repeat by Matt Christensen roughly 33 years after the original ascent
  (~1977), but it's ambiguous whether Matt Christensen was on the FA party or only the later
  repeat. Left as-is.
- `wa_boving_roofs`'s FA is stored as "Paul Boving and Steve Pollock" with no date. Only weak
  corroboration found (Boving and Pollock made a confirmed FA together on the adjacent North
  Early Winters Spire in Sept 1976), not a direct confirmation of this specific route/pitch —
  and one source referred to a similarly-named "Boving-Pollock" pitch on this same peak at a
  different grade (5.10c vs. this row's 5.10b), which may or may not be the same feature. Not
  contradicted, so left unchanged, but flagged as thin.

No web-egress access to individual site domains (Mountain Project, AAC Publications,
CascadeClimbers, StephAbegg, SummitPost, nps.gov) was available this run — only WebSearch's
own aggregated results were reachable, same limitation as last batch.

Next batch continues alphabetically after `wa_boving_roofs` (see progress file).

## 2026-08-14 — Batch 117 (pass 3): Buckner Mountain (x2), Burgundy Spire, Burnt Boot Peak,
Cardinal Peak, Cascade Peak, The Castle, Cathedral Peak

Checked 8 routes: Buckner Mountain's North Face and Southwest Face/Slopes; Burgundy Spire's
North Face; Burnt Boot Peak's North Ridge; Cardinal Peak's Northwest Couloir–North Ridge;
Cascade Peak's East Ridge and NW Chimney; The Castle's (Tatoosh Range) Southeast Face; and
Cathedral Peak's (Pasayten) Southeast Buttress. Two routes on `wa_south_face_3` that carry
an alpine discipline tag and would otherwise have sorted into this batch were skipped —
that area is a `crag`, not a `peak`, per the audit's own scope definition.

**Confirmed fixes (3):** `wa_burgundy_spire`'s area row stored `elevation_ft: 8483`, but its
own North Face route already stores its summit at 8,400 ft (both `high_point_ft` and the
route's own recorded summit waypoint), and three independent outside sources (The
Mountaineers, LemkeClimbs, a peakbagger-derived figure of 2,560 m) all agree on ~8,400 ft.
Corrected the area row to 8400. Separately, `wa_castle_peak_tatoosh_southeast_face`'s own
Summit waypoint stored `elev`/`elevFt: 6640` against its own `high_point_ft` of 6440, the
parent area's `elevation_ft` of 6440, and Wikipedia's 6,440 ft for The Castle — a plain
digit transposition, corrected to 6440. And the same route's `access` jsonb carried a
leftover `_raw` sub-object describing an entirely different peak: 8,343 ft, "Provincial
Park (north)" and other Canadian-border access routes, "north Cascades Ranger District",
and "glacial terrain and ice sheets" as a hazard — nothing about The Castle, a 6,440 ft
non-glaciated Tatoosh Range scramble well inside Mount Rainier NP nowhere near the border,
confirmed both against this same row's own correct `notes`/`permit`/`landManager` fields
and against Wikipedia. `_raw` is not read anywhere in the app (grepped `*.jsx`), so removing
it only strips contaminated leftover data, nothing currently on screen. SQL for all three:
`audits/sql/2026-08-14-batch-117.sql`, pre-flighted clean against both `routes` and `areas`.

**Clean (4):** Buckner Mountain's original 1901 first ascent by Lewis Ryan and Cascade
Peak's July 23, 1950 first ascent by Fred Beckey, Pete Schoening and Phil Sharpe both
confirmed exactly; Burgundy Spire's North Face 1953 Beckey-party first ascent (aided/fixed
ropes, later freed at 5.8 via the Burgundy Ledge tunnel) confirmed. Elevations and
coordinates for Buckner Mountain (9,114 ft), Cascade Peak (7,428 ft), Cardinal Peak
(8,595–8,596 ft, listsofjohn vs. DB, a 1 ft rounding difference) and Cathedral Peak
(8,606 ft) all matched their area rows and outside sources. Cathedral Peak's own FA is
already stored as an honest non-claim ("unrecorded... route established July 1973") and
Wikipedia's pitch count (9-10) and length (~1,000 ft) for its Southeast Buttress line up
with the DB's 10 pitches / 305 m.

**Needs human verification (not fixed — flagged only):** `wa_burnt_boot_peak_north_ridge`'s
FA is stored as Don Williamson, Bill Bucher and Tom Oas, reported in the 1972 AAJ.
Wikipedia gives the peak's overall first ascent as 1963 with no party named. These aren't
necessarily contradictory — the 1963 date could be the peak's easiest-line first ascent
while 1972 is specific to this technical North Ridge line, a distinction this catalog
has drawn correctly elsewhere (e.g. Cascade Peak's own hedge last checked) — but this
environment's blocked web egress to AAC Publications/AAJ archives meant it couldn't be
pinned down further this run. Left unchanged.

No web-egress access to individual site domains (Wikipedia, SummitPost, Mountaineers.org,
peakbagger, AAC Publications) was available this run — only WebSearch's own aggregated
results were reachable, same limitation as prior batches.

Next batch continues alphabetically after `wa_cathedral_peak_pasayten_se_buttress` (see
progress file).

## 2026-08-14 — Batch 118 (pass 3): Chair Peak (x5), Chalangin Peak, Chelan Butte, Chianti Spire

Checked 8 routes: Chair Peak's East Face, North Face, Northeast Buttress, Northwest Ridge,
and the Chair-Bryant Traverse; Chalangin Peak's Little Giant Pass-Luahna Col route; Chelan
Butte Trail; and Chianti Spire's East Face (Rebel Yell). Two routes that would otherwise
have sorted into this alphabetical range were skipped as out-of-scope crags per the audit's
own peak-only scope: `wa_clean_break` (Juno Tower) and a `South Face` on `wa_south_face_3`.

**Confirmed fixes (6):** Two of the same defect on Chair Peak's North Face and Northeast
Buttress — `dist_km` stored 10.78 km and 10.46 km respectively, both almost exactly double
the one-way distance each route's own approach text and own waypoint list independently
support (North Face: approach text says "~2.5-3 mi," own waypoints put the summit at distMi
3.3 = 5.31 km; Northeast Buttress: approach text says "2-2.5 mi," own waypoints put the
summit at distMi 3.2 = 5.15 km — both stored values are within 1.5-1.6% of exactly 2x those
figures). Since the app doubles `dist_km` itself to render round trip, left as stored this
would have shown a round-trip distance roughly 4x the route's own approach prose. Corrected
both to their own waypoint-derived one-way distance. Same two routes also had their
`commitment` grade fixed from 'III' to 'II' (North Face's `grade` column, which duplicated
the same value, fixed too) — both are the catalog's classic moderate ice lines (rock 5.4,
ice AI2/AI2-3, max_angle 70), and The Mountaineers' own route pages, American Alpine
Institute's route profile, and independent trip reports all consistently call them "Grade
II ice climbs"; nothing found calls either III (North Face's own season note correctly
distinguishes the moderate line from a harder, unrelated "North Face Direct 5.9" summer
variant, which may be where a III got attached). 'II' is also this catalog's established
bare-roman-numeral format (279 WA routes already use it this way). Separately,
`wa_chelan_butte`'s `areas.elevation_ft` stored 3812 ft against the peak's own route storing
its own summit waypoint at 3835 ft and three independent outside sources (SummitPost,
willhiteweb.com, a hang-gliding launch-site guide) agreeing on 3,835 ft — corrected to
match. And that same route's `permit` column wrongly cited a Northwest Forest Pass (a USFS
pass) when the row's own `access` jsonb already correctly identifies the land manager as
WDFW (Chelan Butte Wildlife Area, state land) requiring a Discover Pass instead — WDFW's own
site confirms the Discover Pass requirement. Corrected `permit` to agree with the row's own
`access` data. SQL for all six: `audits/sql/2026-08-14-batch-118.sql`, pre-flighted clean
with `check:sql`.

**Clean (3, some already-fixed by a prior pass):** Chair Peak's East Face FA (Don Blair and
Art Winder, September 30, 1933, "first recorded ascent of this face") confirmed exactly,
including the specific "5.5 at the overhanging band per SummitPost" qualifier. Chair Peak's
own elevation (6,238 ft) and summit coordinates matched across the area row and every
route's waypoints. Chalangin Peak's route was fully corroborated: outside sources describe
the Little Giant Pass approach as "about 27 miles and 11,000 ft gain," matching this route's
own `dist_km` (21.7 km one-way, which the app doubles to ~27 mi round trip) and `gain_ft`
(11000) almost exactly, and the Chiwawa River Road drive distance (19 miles) to the
trailhead also matched independently. Chianti Spire's East Face already carries a
self-documenting note on its own trailhead waypoint recording a prior correction (a mismatch
with an unrelated "Early Winters Creek Trailhead" was already caught and fixed by an earlier
audit pass) — checked and confirmed still consistent, along with its FA (Jim Nelson and Mark
Bebie, 1986, matching the area row's own blurb) and rappel-length data (4 rappels of 55 m
each, within a 60m double-rope rappel's reach).

**Needs human verification (not fixed — flagged only):** `wa_chair_bryant_traverse`'s FA
("Ari Schneider, Jason Linker") could not be corroborated either way — this looks like a
plausible but obscure/recent linkup traverse, and no search turned up a record of it under
either name. Not contradicted by anything found, so left unchanged.

Web access this run: WebSearch's aggregated results were reachable; WebFetch/direct domain
access (summitpost.org, en.wikipedia.org) was blocked by the network egress proxy, same
limitation as every prior batch.

Next batch continues alphabetically after `wa_chianti_spire_east_face` (see progress file).

## 2026-08-14 — Batch 119 (pass 3): Chimney Rock (x2), Chiwawa Mountain, North Early Winters
Spire (Chockstone Route), Clark Mountain, Unicorn Peak, Lane Peak, Colchuck Peak (Colchuck
Glacier)

Checked 8 routes across 7 peaks: Chimney Rock's East Face Direct and West Face/South Summit,
Chiwawa Mountain's Southwest Route, North Early Winters Spire's Chockstone Route, Clark
Mountain's West Ridge/Walrus Glacier, Unicorn Peak's Classic Route, Lane Peak's Classic
Route, and Colchuck Peak's Colchuck Glacier.

**Headline finding this run isn't about these 8 routes — it's about the audit pipeline
itself.** While re-verifying, every "confirmed error" below turned out to already have been
found and written up as proposed SQL on 2026-08-06 (batches 57/58), but the live values are
still wrong. Spot-checking ~8 UPDATE statements at random across the whole history —
batch 30 (07-31), batch 42 (08-01), batch 43 (08-05), batch 50/55/56 (08-06), batch 70
(08-07), batch 90 (08-10), batch 100 (08-12), batch 114 (08-13) — every one through roughly
batch 55 had landed live (`fa` nulled on Kautz Headwall, `permit` corrected on
`wa_south_face_12`, `loss_ft` corrected on Sloan Peak Corkscrew), and **nothing checked from
batch 56 onward has** (`high_point_ft` still 8190 not 8203 on Vasiliki Ridge, `access.fees`
unchanged on Jack Mountain, `access.group_limit` still 6 not 12 on Sharkfin Tower, `pitches`
still 7 not 6 on Beckey-Davis, and everything below). That's ~63 batches — over a week of
this audit's output — sitting unreviewed. Worth a human checking whether
`audits/sql/2026-08-06-batch-56.sql` onward got missed entirely, since pass 3 will otherwise
keep re-discovering the same fixes indefinitely without ever landing them.

**Confirmed fixes (6, all re-derived independently this run and all duplicates of unapplied
2026-08-06 proposals — SQL: `audits/sql/2026-08-14-batch-119.sql`, pre-flighted clean with
`check:sql`):**
- `wa_chimney_rock_west_face`: `aspect` stored 'E' though the route's own name ("West Face/
  South Summit"), approach text ("Pitch 1 ... on the west face"), and descent_text ("Descend
  by reversing the West Face") all independently call it the west-facing line. Corrected to
  'W'. (Re-checked the broader "possible Idaho Chimney Rock contamination" concern this row
  carries in CLAUDE.md's `audit:aspect-name` notes — the one contaminated sentence it
  referred to was the 2001 rappel-bolt claim already removed from `descent_text` in batch 5;
  the rest of the row — trailhead, ranger district, waypoints, approach — is internally
  consistent and specific to the real Alpine Lakes Chimney Rock. No further contamination
  found.)
- `wa_chimney_rock_east_face_direct`: `emergency.nearestHospital` still names a Cle Elum
  "hospital" ER; Kittitas Valley Healthcare's only ER is in Ellensburg, Cle Elum has urgent
  care only — exactly what the sibling West Face route's own copy of this field already
  states correctly. Fixed to match.
- `wa_chiwawa_mountain_southwest`: `grade` said "Class 3-4 + glacier," contradicted by the
  row's own `overview` ("non-glaciated, largely cross-country scramble"), `pro_needs` ("No
  rope, rack, or crevasse-rescue gear is needed... unless you detour onto the glaciated NE
  side"), and `watch_out` ("this is not the glaciated Lyman Glacier route"). Corrected to
  "Class 3-4."
- `wa_chockstone_route`: `rack`/`detailed_rack` both said cams "0.5-3in," contradicted by
  the row's own `corrections` field quoting Mountain Project verbatim ("single rack to 2
  inches"). Propagated. Same route's `watch_out` was a newline-joined string instead of a
  JSON array (5 hazard sentences) — converted.
- `wa_classic_route_2` (Unicorn Peak) — safety-relevant: `rappels`, `watch_out[0]`, and
  `pitch_detail[0].notes` all still send climbers to the deprecated "bleached snag" rappel
  anchor, contradicted by the row's own `descent_text`, which already documents that anchor
  is no longer sound and the current, trip-report-corroborated anchor is a rock horn.
  Propagated to all three. Same route's `length_m` (122, ~400 ft) was wildly inconsistent
  with its own single 15 m pitch — corrected.

**Checked and still internally consistent, no new issues found:** Clark Mountain's West
Ridge (elevation, coordinates, gain_ft-vs-itinerary within normal noise at 6,500/6,100 ft),
Lane Peak's Classic Route (all fields match prior-pass fixes), and Colchuck Peak's Colchuck
Glacier (fully clean, matches its batch-58 "audited fully clean" finding — re-verified
elevation, waypoints, gain_ft/itinerary sum agree closely at 5,300/5,305).

**Needs human verification (not fixed — flagged only):**
- `wa_chiwawa_mountain_southwest`: `dist_km` is populated (30.58) despite this same row's
  own `data_quality.gaps` explicitly stating "no single dist_km value was reliable enough to
  record" (mileage varies 14-16 mi for Chiwawa alone vs. ~20 mi combined with Fortress
  Mountain, by the row's own account). A genuine internal contradiction, but resolving which
  of the two documented trip shapes `dist_km` should represent is an editorial call, not a
  fact this run can adjudicate — left unchanged.
- `wa_chimney_rock_east_face_direct`: 1954 FA (Cornelius Molenaar, Elvis R. Johnson) still
  could not be corroborated against any source this run's web access could reach — carried
  over unchanged from batch 57's identical flag.

Web access this run: WebSearch's aggregated results were reachable and did confirm Chimney
Rock's three summit elevations (7,727/7,634/7,440 ft) against Wikipedia's snippet content;
WebFetch/direct domain access was not attempted separately this run.

Next batch continues alphabetically after `wa_colchuck_peak_colchuck_glacier` (see progress
file).

## 2026-08-19 — Batch 120 (pass 3): Colchuck Peak (x4), Colfax Peak (x3),
Colonial Peak

Checked `wa_colchuck_peak_east_ridge`, `wa_colchuck_peak_holsten_hilden`,
`wa_colchuck_peak_north_buttress_couloir`, `wa_colchuck_peak_northeast_couloir`
(Colchuck Peak); `wa_colfax_peak_cosley_houston`,
`wa_colfax_peak_kimchi_suicide_volcano`, `wa_colfax_peak_polish_route`
(Colfax Peak); `wa_colonial_peak_west_ridge` (Colonial Peak).

**Fixed (SQL in `audits/sql/2026-08-19-batch-120.sql`):**
- `wa_colchuck_peak_east_ridge`: `gain_ft` (2800) didn't reconcile with its
  own trailhead/summit waypoints (3,400 ft -> 8,705 ft = 5,305 ft), and all
  three sibling Colchuck Peak routes sharing that exact trailhead/summit
  already store ~5,300-5,305. Corrected to 5,305.
- `wa_colchuck_peak_holsten_hilden`: `grade` field ("Grade IV, M6, AI3+")
  contradicted this row's own `corrections` text, which documents choosing
  Mountain Project's "Grade III, WI3, M6" as the primary value over the
  2011 AAC first-ascent account's "IV, AI3+" grading. The stored grade was
  the one the row's own note says was rejected. Corrected to match the
  documented decision.
- `wa_colchuck_peak_north_buttress_couloir`: `gain_ft` (6600) was an outlier
  against the same trailhead/summit pair (5,305 ft net, matching the other
  three Colchuck Peak siblings); no elevation loss/regain is described in
  the approach that would explain the extra ~1,300 ft, and a Wenatchee
  Outdoors trip report's "3,300 ft tent-to-tent" from a camp near Colchuck
  Lake (5,574 ft) corroborates a total closer to 5,300-5,500 than 6,600.
  Corrected to 5,305.
- `wa_colfax_peak_polish_route`: `dist_km` (14.48) was roughly double the
  sibling `wa_colfax_peak_cosley_houston`'s `dist_km` (7.49) despite this
  row's own approach text stating "Same trailhead and lower approach as
  Cosley-Houston" and this row's own summit waypoint carrying the identical
  one-way `distMi` (4.5 mi = 7.24 km) as Cosley-Houston's. Corrected to
  7.49 to match the one-way distance both the shared approach text and this
  row's own waypoint mileage agree on.

**Checked and still internally consistent, no new issues found:**
`wa_colchuck_peak_northeast_couloir` (gain_ft, waypoints, grade all
reconcile; the row's own claim of "3 deaths in Feb 2023" on this couloir is
independently confirmed — NWAC's final report and multiple news sources
both date the fatal slide to Feb 19, 2023, three climbers), and
`wa_colfax_peak_kimchi_suicide_volcano` (thin data — one waypoint only —
but nothing on file contradicts itself or an external source).

**Needs human verification (not fixed — flagged only):**
- **Likely duplicate route pair, not touched (guardrails forbid deletes):**
  `wa_colchuck_peak_east_ridge` ("East Ridge (Non-Technical)") and
  `wa_colchuck_peak_colchuck_glacier` ("Colchuck Glacier") both describe the
  same physical line — near-identical waypoints (same trailhead, same
  Colchuck Lake, same Colchuck Col approach), same glacier ascent/descent,
  same summit. `wa_colchuck_peak_east_ridge`'s own `corrections` field
  already half-concedes this ("It is the peak's original 1948 first-ascent
  line and standard non-technical route"), and it's corroborated externally
  — SummitPost/Beckey's Cascade Alpine Guide describe Colchuck's "East
  Route" as "commonly called the Colchuck Glacier Route because most
  parties attain the col from this direction," i.e. the same route under
  two names. The two rows still disagree with each other on `gain_ft`
  (now-corrected 5305 vs 5300) and `dist_km` (7.5 vs 8) — minor, but a sign
  they were researched independently rather than as one route. This needs
  a human dedup decision (which id/name is canonical, whether to merge or
  redirect) rather than an audit-script fix — flagged, not resolved.
- `wa_colonial_peak_west_ridge`: `corrections` field references a stale id
  ("wa_colonial_peak_northeast") that does not match this row's actual id
  ("wa_colonial_peak_west_ridge") or name — looks like leftover text from
  before an earlier id/name correction was applied. Cosmetic (the field
  isn't safety-relevant), left unchanged pending a decision on whether to
  clean up or preserve as history.
- `wa_colfax_peak_cosley_houston`: `rappels`/`descent_text` both state "no
  rappelling on the standard descent," but `pro_needs` and `detailed_rack`
  both list "V-thread hardware for descent." Could plausibly mean retreat/
  bail gear rather than the standard descent, but the row doesn't say so
  explicitly — left unchanged, flagging the ambiguity rather than guessing
  which reading is intended.

Web access this run: WebSearch reachable and useful (confirmed the Feb 2023
avalanche fatality count/date, and the "East Route = Colchuck Glacier Route"
naming from SummitPost/Beckey). WebFetch was blocked by the network egress
proxy for both mountainproject.com and publications.americanalpineclub.org,
so the Holsten-Hilden grade fix relies on the row's own internal
documentation (its `corrections` field quoting MP directly) rather than a
fresh independent read of the MP page.

Next batch continues alphabetically after `wa_colonial_peak_west_ridge`
(see progress file).

## 2026-08-19 — Batch 121 (pass 3): Complete South Buttress, Concord Tower,
Copper Peak, Corteo Peak, Crater Mountain, Crooked Thumb Peak (x2)

Checked `wa_complete_south_buttress` (Cutthroat Peak),
`wa_concord_tower_north_face` (Concord Tower), `wa_copper_peak_south_route`
(Copper Peak), `wa_corteo_peak_southwest_ridge` (Corteo Peak),
`wa_crater_mountain_standard_route` (Crater Mountain),
`wa_crooked_thumb_peak_east_face`, `wa_crooked_thumb_peak_south_route`
(Crooked Thumb Peak).

**Fixed (SQL in `audits/sql/2026-08-19-batch-121.sql`):**
- `wa_complete_south_buttress`: `dist_km` (6.44) matched this row's own
  `itinerary.totalNote` almost exactly ("roughly 4.0 mi ... round trip"),
  and the itinerary's `gainFt:3300` matches the top-level `gain_ft`
  exactly, confirming the itinerary describes the same trip as the
  top-level fields -- so `dist_km` was populated with the round-trip
  figure rather than the one-way value the app expects (it renders round
  trip as `dist_km*2`). Corrected to 3.22 (half).
- `wa_concord_tower_north_face`: two fixes. `high_point_ft` (7569) matched
  neither of the two elevations this row's own `data_quality.gaps` note
  names as the live external dispute (7,560 ft MP/WTA/StephAbegg vs.
  ~7,611-7,612 ft ListsOfJohn) nor this row's own summit waypoint
  (elev 7611) -- internally self-contradictory regardless of which
  external source is right. Reconciled to the row's own waypoint (7611).
  Separately, `dist_km` (9.7) didn't match a one-way convention against
  either same-row signal (summit waypoint distMi 2.3 mi = 3.70 km, or the
  itinerary's round-trip "6" mi). Corrected to 3.70 km, matching the
  waypoint.
- `wa_copper_peak_south_route` and `wa_corteo_peak_southwest_ridge` shared
  an identical `dist_km` (17.7) despite unrelated approaches (Holden
  Village boat-in vs. Rainy Pass trailhead) and different waypoint-derived
  one-way distances (5.5 mi vs 6.3 mi) -- the same value cannot be correct
  for both. Corrected each to its own row's waypoint-derived one-way
  mileage (8.85 km and 10.14 km respectively), both corroborated in the
  same order of magnitude by external trip reports (Copper Peak: 8-9.72 mi
  round trip per multiple sources; Corteo Peak: 9.8-11 mi round trip).
- `wa_corteo_peak_southwest_ridge`: `grade_num` (2) didn't match its own
  grade text ("Class 3-4"). The identical grade text on
  `wa_copper_peak_south_route` in this same batch stores `grade_num=4` --
  the same input shouldn't sort as two different grades. `grade_num` feeds
  the finder RPCs' sort/filter, so this route was ranking as though
  "Class 2". Corrected to 4 to match the sibling row.
- `wa_crater_mountain_standard_route`: top-level `permit` field described
  the North Cascades National Park Complex's NPS backcountry-permit
  process (Recreation.gov reservation / Marblemount WIC walk-up), but
  Crater Mountain is in the Pasayten Wilderness on Okanogan-Wenatchee
  National Forest (USFS) land, confirmed externally (multiple sources).
  This row's own `access.permit` field already stated the correct process
  (free self-issue Pasayten Wilderness permit at the trailhead; the NPS
  permit only applies if a trip continues into the adjoining National
  Park). Corrected the top-level `permit` field to match.

**Checked and still internally consistent, no new issues found:**
`wa_crater_mountain_standard_route`'s other fields (elevation, gain_ft,
FA left honestly null, hazards) all reconciled against USGS/Wikipedia
elevation (8,132 ft, confirmed) and its own waypoints/approach text.
Elevations for Cutthroat Peak (8,066 ft), Copper Peak (8,965 ft, also
confirmed as 21st-highest/19th Bulger), Corteo Peak (8,107 ft), and
Crooked Thumb Peak (8,129 ft) all matched external sources exactly. FA
claims for `wa_concord_tower_north_face` (Beckey & Parrott, June 12 1956)
and `wa_copper_peak_south_route` (Bennet/Courtwright/Hagman, August 1937)
both independently confirmed.

**Needs human verification (not fixed -- flagged only):**
- `wa_concord_tower_north_face`: even after reconciling the row's internal
  self-contradiction (see fix above), the peak's TRUE summit elevation
  remains disputed between external sources themselves (7,560 ft per
  Mountain Project/WTA/StephAbegg vs. ~7,611-7,612 ft per ListsOfJohn).
  This run picked the value consistent with the row's own waypoint, not
  the "true" figure -- a human with access to a primary survey source
  should settle which cluster is right.
- `wa_copper_peak_south_route`: the `corrections` field text is stale and
  contradicts the row's own current content -- it explains a decision to
  treat the route as the non-technical Olympics "Copper Mountain" (Class
  2-3), but the actual stored content (waypoints, hazards, glacier travel,
  Holden Village boat approach) is clearly and correctly the glaciated
  Entiat Mountains Copper Peak (8,965 ft, confirmed). Looks like leftover
  reasoning from an earlier draft, same shape as batch 120's Colonial Peak
  stale-corrections flag. Cosmetic (not user-facing), left unchanged.
- `wa_crooked_thumb_peak_east_face` / `wa_crooked_thumb_peak_south_route`:
  both cite distinct 1963 Mountaineers first-ascent parties for their
  specific named lines, while the peak's overall documented first ascent
  is 1940 (Fred & Helmy Beckey) per Wikipedia. Plausible as route-specific
  FAs distinct from the peak's FA (normal in climbing databases), but this
  run's web access could not independently confirm either 1963 claim --
  AAC Publications and Wikipedia were both unreachable via WebFetch
  (network egress proxy blocks both domains). Left unchanged.

Web access this run: WebSearch was reachable and did the load-bearing work
(confirmed 5 peak elevations, 2 FA claims, and the Pasayten Wilderness vs.
NPS jurisdiction question for Crater Mountain). WebFetch was blocked by the
network egress proxy for en.wikipedia.org, consistent with prior runs'
notes about mountainproject.com and publications.americanalpineclub.org.

Next batch continues alphabetically after `wa_crooked_thumb_peak_south_route`
(see progress file).

## 2026-08-19 — Batch 122 (pass 3): Cutthroat Peak (Cauthorn-Wilson Couloir,
East Face, Southeast Buttress, South Buttress, West Ridge), Dark Peak (Dark
Glacier Route), Liberty Bell (Dark Side of Liberty), Sloan Peak (Diamond In
The Rough)

Checked `wa_cutthroat_peak_cauthorn_wilson_couloir`,
`wa_cutthroat_peak_northeast_face` (name field: East Face),
`wa_cutthroat_peak_southeast_buttress`, `wa_cutthroat_south_buttress`,
`wa_cutthroat_west_ridge` (all Cutthroat Peak), `wa_dark_peak_dark_glacier_route`
(Dark Peak), `wa_dark_side_of_liberty` (Liberty Bell), `wa_diamond_in_the_rough`
(Sloan Peak).

**Fixed (SQL in `audits/sql/2026-08-19-batch-122.sql`):**
- Three Cutthroat Peak routes (`wa_cutthroat_peak_cauthorn_wilson_couloir`,
  `wa_cutthroat_peak_northeast_face`, `wa_cutthroat_peak_southeast_buttress`)
  stored a route *duration* ("13 hrs" / "12.5 hrs" / "12 hrs") in `commitment`
  instead of an NCCS-style commitment grade. That field is rendered on the
  route page as a "Commitment" badge in the TECHNICAL STATS composite-grade
  panel and looked up against `COMMITMENT_EXPLAINERS` (a bare I-VI keyed map)
  for an explainer sentence -- both broken by a duration string. Checked
  against the rest of the WA catalog: the overwhelming majority of
  `commitment` values are bare (or +/- modified) Roman numerals, and the
  small minority of duration/prose values are almost all on non-technical
  Class 2-4 scramble routes where an NCCS grade doesn't really apply. These
  three are pitched, roped alpine rock/ice routes with their own
  `rock_grade`/`pitch_detail`, so they belong with the numeral-grade
  majority. Each row's own `grade` field already held a correctly-shaped
  value ("III+", "III", "III"), and for the East Face route the "III"
  matches AAC Publications' description of that exact 1976 Bard/Chouinard/
  Cunningham line as "East Face (6 pitches, III 5.10)". Set `commitment` to
  match each row's own `grade` field. Same defect class and same fix shape
  as batch 118's Chair Peak `commitment` fixes.
- `wa_dark_peak_dark_glacier_route`: three fields (top-level `permit`,
  `access.permit`, `access.fees`) described the NPS backcountry permit
  needed for this route's approach camps (Fivemile Camp, Swamp Creek Camp,
  inside North Cascades National Park Complex) as free. NPS's own current
  backcountry-permits page (confirmed via a corroborating Washington's
  National Park Fund / WTA writeup, since WebFetch is blocked for nps.gov
  as in prior runs) states a $10/person recreation fee plus a $6
  non-refundable reservation fee applies, charged mid-May through early
  October -- squarely inside this route's own `best_season` (Jun-Jul). The
  top-level `permit` field also named the wrong permit entirely (the free
  self-issue Glacier Peak Wilderness permit, which covers the Forest
  Service ground around the peak itself, not the NPS-administered approach
  camps -- this row's own `access.landManager` already correctly
  distinguishes the two jurisdictions, so the fix only touches the fee/cost
  claim, not that split). Rewrote all three fields to state the correct fee
  and reservation process, keeping the existing NPS-vs-Wilderness structure.

**Checked and still internally consistent, no new issues found:**
Peak elevations for Cutthroat Peak (8,066 ft), Dark Peak (8,507 ft, 56th on
the Bulger List), Liberty Bell Mountain (7,720+ ft) and Sloan Peak (7,835 ft)
all matched external sources exactly. FA claims independently confirmed:
Cutthroat Peak West Ridge (Adam/Bedayn/Davis, July 22 1937 -- also the
peak's overall FA, matching this row's own note), Cutthroat South Buttress
(Beckey/Gordon, 1958), Dark Side of Liberty (Schaefer/Lee free ascent,
August 2019), Diamond In The Rough (Roberts/Workman, Sept 11 2011).

**Needs human verification (not fixed -- flagged only):**
- **Systemic, not isolated**: all 5 Cutthroat Peak routes in this batch
  share an identical, verbatim `beta` field: "Grade II, 5.7 climbing. Short
  approach from highway. Rock improves significantly higher on ridge. Fair
  granite in approach, improves on ridge. Moderate exposure. Quick alpine
  climb from Rainy Pass. Uncrowded route." This reads as a boilerplate
  template applied across the whole peak rather than five distinct
  descriptions, and it contradicts each route's own better-populated fields
  on nearly every count: the "5.7" claim only matches one of the five
  routes' `rock_grade` (East Face); the couloir route is a WI4 ice line
  (nothing like "5.7 climbing"); "Grade II" matches only two of the five
  routes' actual grade; and "short approach"/"quick alpine climb" reads
  oddly next to the South Buttress's 12-pitch, 10.5-hour car-to-car day.
  Writing five accurate, route-specific replacements is a research task
  beyond a quick fact-check (this audit's SQL fixes reconcile against a
  row's own other fields or an external source, not author new descriptive
  prose from scratch) -- flagging for a dedicated enrichment pass rather
  than guessing at replacement text.
- `wa_cutthroat_south_buttress`: `alpine_grade`/`commitment` both store
  "III", but the American Alpine Institute's own route profile page titles
  it "Cutthroat Peak, S. Buttress (5.8, III+)". Left unchanged -- III vs
  III+ is a minor, commonly-disputed rounding in guidebook/source grading
  (other sources this run found describe it as plain III), not a clear
  single-source error.
- `wa_dark_peak_dark_glacier_route`: `access.landManager`/`access.rules`
  claim the peak and upper basin/glacier themselves sit within the Glacier
  Peak Wilderness (Okanogan-Wenatchee NF), distinct from the NPS-managed
  Agnes Creek approach corridor. Plausible given Dark Peak's position on
  the ridge between the Agnes Creek and Railroad Creek drainages, but
  confirming the precise wilderness/park boundary would need authoritative
  GIS/boundary data this run's web access could not verify. Left unchanged.

Web access this run: WebSearch did the load-bearing work (5 elevations, 4 FA
claims, the NPS backcountry permit fee structure). WebFetch was blocked by
the network egress proxy for nps.gov, consistent with prior runs' notes
about wikipedia.org, mountainproject.com and AAC Publications.

Next batch continues alphabetically after `wa_diamond_in_the_rough`
(see progress file).

## Batch 123 (2026-08-19, pass 3)

Checked: `wa_direct_north_buttress` (Bear Mountain, Direct North Buttress),
`wa_direct_southwest_buttress` (Dorado Needle), `wa_direct_west_face` (Pernod
Spire), `wa_dirty_sanchez` (Goose Egg Mountain), `wa_dolphin_chimney` (South
Early Winters Spire), `wa_dome_peak_dome_glacier`, `wa_dome_peak_indian_summer`,
`wa_dorado_needle_east_ridge`.

**Confirmed errors fixed (2):**
- `wa_direct_north_buttress`: `road` described "Depot Creek Road (BC) via
  Chilliwack River Road, from Chilliwack, BC" -- the approach for Redoubt and
  Spickard, as this same row's own `bivy` list explicitly says ("NOT reachable
  from the Hannegan Pass trailhead -- it must never be treated as an
  alternative camp on that approach"). This row's own `approach` text and
  `approach_logistics.trailhead` both consistently describe the Hannegan Pass
  Trailhead (FR-32) approach instead. Reconciled `road` to match the rest of
  the row.
- `wa_dorado_needle_east_ridge`: the trailhead waypoint carried a `note`
  reading "Existing DB value (48.492611,-121.117611) appears incorrect ...
  recommend correcting to this value" -- but that "existing" value is exactly
  what is currently stored (and matches `approach_logistics` and the
  trailhead used by `wa_direct_southwest_buttress`). Stale scratch commentary
  from an earlier correction pass; replaced with a plain, accurate note.

**Clean (6):** `wa_direct_southwest_buttress`, `wa_direct_west_face`,
`wa_dirty_sanchez`, `wa_dolphin_chimney`, `wa_dome_peak_dome_glacier`,
`wa_dome_peak_indian_summer` -- no errors found. Checked a possible date
conflict between the two Dome Peak routes over the Suiattle River Road (FR-26)
closure ("December 2025 flood washout" vs. "USFS closure order effective April
2, 2026") -- confirmed via web search these are NOT contradictory: the flood
damage occurred in December 2025 and the formal USFS closure order took effect
several months later, in April 2026. Both rows are correct.

Web access this run: WebSearch confirmed the FR-26/Suiattle closure timeline
and corroborated the Hannegan Pass approach for Bear Mountain's north side
routes.

Next batch continues alphabetically after `wa_dorado_needle_east_ridge` (see
progress file).

## Batch 124 (2026-08-19, pass 3)

Checked: `wa_dragontail_peak_backbone_ridge`, `wa_dragontail_peak_east_ridge_aasgard_pass`
(East Ridge / standard route), `wa_dragontail_peak_r1` (Hidden Couloir),
`wa_dragontail_peak_r2` (Gerber-Sink), `wa_dragontail_peak_r3` (Pandora's Box / W
Couloir), `wa_dragontail_peak_r4` (Triple Couloirs), `wa_dragontail_peak_serpentine_arete`,
`wa_e_se_face` (Witches Tower, E/SE Face).

**Confirmed errors fixed (1):**
- `wa_dragontail_peak_backbone_ridge`: `descent_text` still cited a specific rappel-station
  coordinate ("a documented rappel station near 47.479°N, 120.832°W") that the row's own
  `rappel_count_note` says was already assessed as unverifiable and "removed as unsupported"
  (it coincides suspiciously closely with the peak's own summit coordinates rather than a
  real documented station fix), and that `rappel_detail` separately states is "not
  independently documented in any source found." The removal was never actually applied to
  `descent_text`, leaving the row contradicting its own correction note. Reconciled
  `descent_text` to match `rappel_count_note`/`rappel_detail`.

**Clean (7):** `wa_dragontail_peak_east_ridge_aasgard_pass`, `wa_dragontail_peak_r1`,
`wa_dragontail_peak_r2`, `wa_dragontail_peak_r3`, `wa_dragontail_peak_r4`,
`wa_dragontail_peak_serpentine_arete`, `wa_e_se_face` — no errors found. Verified against
authoritative/secondary sources: Dragontail Peak summit elevation (8,840 ft, matches
Wikipedia/Peakbagger); Witches Tower summit elevation and coordinates (8,566 ft,
47.4766°N/-120.8255°W, matches Wikipedia within a few meters); first-ascent claims for
Backbone Ridge (Weigelt/Bonneville 1970, Fin Direct by Cruver/Lewis 1975 — confirmed via
SummitPost/AAC), Triple Couloirs (Joiner/Nelson/Seman, May 1974 — confirmed via American
Alpine Institute), and Serpentine Arête (Hargis/Ossiander, 1973 — confirmed via multiple
trip-report sources). Gerber-Sink's FA remains honestly unresolved in the row itself
("exact given names/year not documented in sources found") and this run found nothing to
add. Witches Tower's E/SE Face genuinely has no findable first-ascent record (row already
says "unknown"); left unchanged. Cross-checked all seven Dragontail routes' shared
`approach_logistics.peakLat/peakLng` and `high_point_ft` for internal agreement — all
consistent with each other and with the external elevation.

Web access this run: WebSearch confirmed all elevation, coordinate, and first-ascent facts
above; no WebFetch attempts were needed.

Next batch continues alphabetically after `wa_e_se_face` (see progress file).

## Batch 125 (2026-08-19, pass 3)

Checked: `wa_east_face` (Middle Peak / Middle Gunsight, Gunsight Range), `wa_east_face_6`
(Chimney Rock), `wa_east_mcmillan_spire_west_ridge` (East McMillan Spire), `wa_east_ridge_2`
(Snowking Mountain), `wa_east_ridge_3` (Silver Star Mountain), `wa_east_ridge_4` (Inspiration
Peak), `wa_east_ridge_6` (Mount Thomson), `wa_east_ridge_8` (Pinnacle Peak, Tatoosh Range).

**Confirmed errors fixed (5, across 4 routes):**
- `wa_east_face`: the "Summit" waypoint stored `elev=8000` against the row's own
  `high_point_ft=8200` for the same peak. Mountain Project's Gunsight Range page places the
  range's four summits at 8,000-8,200 ft and names Middle Gunsight the range's highest point --
  inconsistent with 8,000. Corrected the waypoint to 8200 to match `high_point_ft`.
- `wa_east_face`: `fa` named the second first-ascensionist "Martins Putelis" -- no such climber
  could be found anywhere. The real name is "Mahting Putelis," a documented Cascades
  climber/guide credited alongside Sol Wertkin for other mid-2000s North Cascades FAs. Fixed the
  transcription error; year (2006) and grade (5.10d) were independently corroborated and left
  unchanged.
- `wa_east_face_6`: `alpine_grade`/`commitment` read "Grade IV"/"IV" for a 3-pitch 5.3 route.
  Three independent sources describing this exact route (Mountaineers.org, bivy.com,
  trailcatjim.com) all grade it Grade II, and the row already contradicted itself -- its own
  `climbing_route` pitch-4 notes read "...Grade II overall." Reconciled both fields to Grade II.
- `wa_east_ridge_2`: the "Summit" waypoint stored `elev=7400` against `high_point_ft=7433`.
  Wikipedia and an independent GPS database both give Snowking Mountain's true summit as 7,433
  ft; Snowking also carries a subsidiary "Middle Peak" at 7,400 ft, the likely source of the
  contaminated value. Corrected the waypoint to 7433.
- `wa_east_ridge_4`: the "Summit" waypoint stored `elev=7880` against `high_point_ft=7891`.
  Wikipedia gives Inspiration Peak's elevation as 7,891 ft, matching `high_point_ft`; the
  waypoint was the outlier. Corrected to 7891.

**Needs human verification (not fixed, flagged only):**
- `wa_east_mcmillan_spire_west_ridge`: `fa` "Fred Beckey and Helmy Beckey, 1940" -- spelling
  of "Helmy" is confirmed correct against AAC/Mountaineers.org obituary sources (not "Helmi" as
  might be guessed). The 1940 date itself is only indirectly corroborated: sources consistently
  document the Beckeys' 1940 FA of the *main* (West) McMillan Spire, but none found explicitly
  names the *East* spire's West Ridge as a separate 1940 first ascent (they're joined by an easy
  traverse, so a shared-trip ascent is plausible but unconfirmed). Left unchanged.
- `wa_east_ridge_2`: `fa` "Hermann Ulrichs & Albert Heath, 1938" -- Ulrichs' own 1938 ascent of
  Snowking is independently corroborated (Alpenglow Ski History, citing Ulrichs' personal
  account), but no source found names "Albert Heath" as his partner on that climb. Left
  unchanged -- absence of corroboration, not a contradicting source.
  - Also worth noting for a future pass: `wa_east_ridge_2`'s `alpine_grade` is null despite a
    2-pitch-free Class 2-3 route having a defined `commitment: II` -- not touched this run since
    it's a missing value rather than a wrong one, and out of this run's scope (re-homing found
    errors, not filling gaps).
- `wa_east_ridge_3` (Silver Star, East Ridge): the FA field packs three separate historical
  claims into one string. The 2000 Childs/Goldie continuous roped ascent and the 1932
  Ulrichs/Pennington tower-traverse are each partially corroborated by NWMJ (alpenglow.org)
  search snippets but could not be confirmed in full (WebFetch was blocked for every relevant
  domain this run -- see below). The 1986 Beckey/Beckstead "NE Spur & East Ridge" sub-claim is
  unconfirmed and possibly conflated with a documented 1965 Beckey/Beckstead FA on a *different*
  peak (North Early Winters Spire); a real route named "NE Spur & East Ridge" does exist on
  Silver Star but is graded III 5.8 in the one source found, not "Grade IV" as the DB's FA prose
  states for that sub-claim. None of this rises to a confirmed, citable single fix, so left
  unchanged pending access to a primary source (Beckey's guide or the AAJ archive).

**Clean (3):** `wa_east_mcmillan_spire_west_ridge` (elevations 7,992/8,004 ft and summit
coordinate all confirmed), `wa_east_ridge_6` (Mount Thomson: elevation, 1917 Hazard/French FA,
and coordinate all confirmed), `wa_east_ridge_8` (Pinnacle Peak: elevation, coordinates, and the
Tatoosh-vs-Rainier permit-policy distinction all confirmed against NPS/Wikipedia/SummitPost).

Web access this run: WebSearch did the load-bearing work throughout (elevations, FA claims, grade
cross-checks). WebFetch was blocked for every domain attempted this run (Wikipedia, Peakbagger,
SummitPost, Mountain Project, AAC Publications, alpenglow.org, mountaineers.org, even
example.com/google.com) -- consistent with prior runs' notes, but total this time rather than
domain-specific. All findings rest on WebSearch's synthesized snippets rather than a direct page
read; flagged items above name exactly which sub-claims would benefit from primary-source access.

Next batch continues alphabetically after `wa_east_ridge_8` (see progress file).

## 2026-08-19 — Pass 3, Batch 126

Two peaks, 8 routes (Primus Peak 1, East Twin Needle 2, Eldorado Peak 5): East Slope (Primus);
South Route, Thread of Ice (East Twin Needle); East Ridge, Northwest Couloir/Eldorado Glacier,
North Ridge, Northeast Face, West Arete (Eldorado).

**Fixed (SQL in `audits/sql/2026-08-19-batch-126.sql`):**
- `wa_eldorado_peak_north_ridge`, `wa_eldorado_peak_west_arete`: both routes' own Summit
  waypoint stored elev(Ft)=8868 for Eldorado Peak, while `high_point_ft` on these same two rows
  -- and on all three sibling Eldorado routes in this batch -- says 8872. Wikipedia and a
  dedicated elevation-survey source (countryhighpoints.com) both confirm 8,872.9 ft as the
  correct modern figure, explaining 8,868 ft as an outdated USGS benchmark never precisely on
  the true summit. Corrected both waypoints to 8872.
- `wa_eldorado_peak_north_ridge`: `permit` column was NULL while its own `access.permit`
  sub-field and all four Eldorado siblings in this batch carry identical NPS park-wide permit
  text (no permit for day climbs; backcountry permit required for any overnight stay). Same
  peak, same trailhead, same land manager as its siblings -- populated with their verified text.

**Confirmed correct, no action:** Eldorado East Ridge FA (Blair/Grigg/Wilson/Winder, Aug 27,
1933 -- matches Mountaineer annual + Wikipedia); Eldorado West Arete FA (Emerson & Gove, Aug 24,
1969, IV 5.8 -- matches AAC Publications); East Twin Needle South Route FA (Wallace/Haley/Bunker,
July 27, 2003 Southern Pickets enchainment -- matches AAC Publications); East Twin Needle Thread
of Ice FA (Abegg & Wallace, June 27, 2009 -- matches the FA trip report title itself); Primus
Peak elevation 8,508 ft (matches Wikipedia/WTA exactly).

**Needs human verification (not fixed, flagged only):**
- `wa_east_twin_needle_south_route`: `high_point_ft`/area `elevation_ft` both store 7868 for
  East Twin Needle, but the route's own Summit waypoint stores elev=7840, and Wikipedia's Twin
  Needles article gives "7,840+ ft" for the eastern (lower) needle against 7,936 ft for the
  western one. The two DB figures disagree with each other by 28 ft, and Wikipedia's own figure
  is an open-ended "+" (no precise survey found -- Peakbagger and Wikipedia itself were both
  blocked for direct fetch this run). Not confident enough in either number to pick a winner;
  left unchanged pending a primary source for the exact East Twin Needle summit elevation.

**Sub-kilometer trailhead/summit coordinate slop checked and left alone per CLAUDE.md's
documented threshold** (nothing exceeded ~500m): Eldorado's `approach_logistics` trailhead vs.
waypoint trailhead disagree by ~294m on 2 of 5 routes and ~1m on the other 3 (both plausibly the
parking area vs. the river-crossing start of the climbers' path); East Twin Needle South Route's
two trailhead records disagree by ~454m (parking area vs. trail proper). Neither rises to the
audit's action threshold.

Web access this run: WebSearch did all the load-bearing work (elevations, FA dates/teams, grade
cross-checks) via synthesized snippets from Wikipedia, AAC Publications, and Mountaineer/AAC
primary sources. WebFetch was blocked for every domain attempted (Wikipedia, Peakbagger) --
consistent with prior runs' notes.

Next batch continues alphabetically after `wa_eldorado_peak_west_arete` (see progress file).

## 2026-08-20 — Pass 3, Batch 127

Eight routes, seven peaks (all in Washington Cascades): Elephant Butte Standard Route, Elephant
Head Standard, Energizer Bunny (Prusik Peak), Fire on the Mountain (Sloan Peak), Fish & Whistle
(Vesper Peak), Flora Mountain Southwest Slope, Flycatcher Buttress (North Early Winters Spire),
Forbidden Peak East Ridge Direct.

**Confirmed correct, no action:** Elephant Butte elevation 7,380 ft (Wikipedia); Prusik Peak
elevation 8,008 ft (Wikipedia); Sloan Peak elevation 7,835 ft (Wikipedia); Flora Mountain
elevation 8,323 ft and FA (Leuthold & Metzger, Sept 11 1940) both match trailcatjim.com/
countryhighpoints.com's lidar-revised figure and the peak's documented FA; North Early Winters
Spire elevation 7,760 ft (SummitPost); Forbidden Peak elevation 8,815 ft (Wikipedia) and its
East Ridge Direct FA (Beckey, Hieb, Cooper, Claunch, May 1958) and grade (III, 5.8) both match
SummitPost/Mountaineers/multiple trip-report sources; Fire on the Mountain FA (Herrington &
Roberts, 2009) matches AAC Publications/StephAbegg.com exactly; Flycatcher Buttress FA team and
year (Marts, Don & King McPherson, 1965) corroborated, though the FFA credit to Burdo (1990,
free solo) could not be independently confirmed or contradicted — left as-is. Fish & Whistle's
FA (Berdinka, 2017) also could not be independently corroborated (route-setter info sits behind
Mountain Project, which was not fetchable this run) but nothing contradicts it either — no
action.

**Needs human verification (not fixed, flagged only):**
- `wa_elephant_head_standard`: `high_point_ft`=7990 could not be checked against any
  authoritative source this run. This Elephant Head (Glacier Peak Wilderness, between the Dana
  and Chickamin Glaciers near Dome Peak) is obscure enough that WebSearch returned only
  Beckey-guide-style prose describing its location, never a summit elevation, and the two
  candidate primary sources (Peakbagger, SummitPost) were both blocked for direct fetch. Left
  unchanged pending a primary-source elevation figure.
- `wa_energizer_bunny`: stored `grade`="5.10+ C1" (and `detailed_rack`/`gear` both describe a
  "C1 aid section" on pitch 3). The FA party's own trip report (stephabegg.com, written by
  co-first-ascensionist Steph Abegg) grades the route "5.10+ **A0**", not C1 — a real
  distinction (A0 is aiding off gear/moves already in place vs. C1's clean hanging-aider
  aiding). Since this is a difficulty-classification call by the party that put up the route,
  not a plain factual transcription error, flagged for a human to reconcile rather than
  auto-corrected.

**Coordinates/waypoints checked and consistent:** all eight routes' `approach_logistics`
peak/trailhead coordinates agree with their own `waypoints` array entries to within a few
hundred meters or better (Elephant Head's two trailhead records differ by ~40m; the rest agree
even more closely) — nothing near the ~500m action threshold.

Web access this run: WebSearch did all the load-bearing work; WebFetch was blocked for every
domain attempted (peakbagger.com, summitpost.org), consistent with every prior run's notes.

Next batch continues alphabetically after `wa_forbidden_peak_east_ridge` (see progress file).

## Batch 128 — pass 3 (2026-08-20)

Routes: Forbidden Peak (North Ridge, Northeast Face, Northwest Face, West Ridge), Fortress
Mountain (East Ridge, Northeast Face, Southwest Face), Fortune Peak (East Slope, Standard
Route) — 9 routes across 3 peaks. This exact set was covered in pass 1 (batch 12) and pass 2;
re-checked whether those fixes held and looked for new drift rather than re-litigating settled
facts.

**Confirmed error → fix in `sql/2026-08-20-batch-128.sql`:**
- Fortune Peak, both routes (`wa_fortune_peak_east_slope`, `wa_fortune_peak_standard_route`):
  the top-level `permit` column is NULL on both, even though each row's own
  `access.permit` sub-field already correctly states a free self-issue Alpine Lakes Wilderness
  permit is required at the Esmeralda Trailhead (confirmed against the USFS Okanogan-Wenatchee
  Esmeralda Trailhead page: self-issue wilderness permit + separate $5/day or $30/yr day-use
  fee). `RouteDetail.jsx`'s PERMIT box (~L1872) reads `route.permits` directly with no fallback
  to `route.access.permit`, unlike the edit-form's own `cur:` default a few hundred lines up
  which already falls back correctly — so that box renders nothing on either route today. Wrote
  the already-verified `access.permit` value into the column the screen actually reads, per the
  "before writing prose into a column, check where it renders" rule (CLAUDE.md, enrichment
  section). Did not touch `RouteDetail.jsx` itself (app code is out of scope for this audit).

**Confirmed correct, no action (re-verified against pass-1/pass-2 fixes, still holding):**
Forbidden Peak elevation 8,815 ft and all four FA records — North Ridge (Beckey, Schwabland,
Wilde, June 8 1952), Northeast Face (Cooper & Ferguson, Sept 15 1961), Northwest Face (Beckey &
Cooper, July 1959), West Ridge (Anderson, F. Beckey, H. Beckey, Crooks, Lind, June 1 1940) —
all match Wikipedia/AAC Publications/multiple independent sources on party and date. Fortress
Mountain elevation 8,679 ft (Wikipedia; matches the pass-1 fix, still consistent across the
area row and all three routes) and summit coordinates (48.15917, -120.93389, matches Wikipedia
to 5 decimal places). Fortune Peak elevation 7,382 ft (Wikipedia). Fortress Mountain's
Northeast Face→"Northeast Ridge" rename from pass 1 is still live with its `corrections` note
intact. Trinity/Buck Creek Trailhead trail numbers (#1550 Chiwawa River, #1513 Buck Creek) and
elevation (~2,800 ft) match USFS/Mountaineers pages.

**Still flagged, not newly resolved (already on record from earlier passes, no new evidence
this run):** Fortress Mountain East Ridge's `loss_ft` (7,900) still exceeds its own `gain_ft`
(5,884) and sibling Southwest Face's `loss_ft` (6,000) for the same trailhead/summit pair with
no alternate descent described — still no confirmed replacement value. Fortress Mountain
Northeast Face's `access.land_manager` (single forest) vs `access.landManager` (adds Mt.
Baker-Snoqualmie NF) conflict — general sources confirm the *peak* straddles both national
forests, but confirming the Forest Service's actual ranger-district boundary against this
specific ridge line was not possible this run (fs.usda.gov and wikipedia.org both blocked for
direct WebFetch; WebSearch summaries weren't precise enough to adjudicate) — left flagged.

Web access this run: WebSearch worked for everything above; WebFetch was blocked for every
domain attempted (en.wikipedia.org, summitpost.org, fs.usda.gov), consistent with prior runs.

Next batch continues alphabetically after `wa_fortune_peak_standard_route` (see progress file).

## Batch 129 — 2026-08-20 (pass 3)

Checked 8 routes across 5 peaks: South Early Winters Spire (Free Mojo), Frenzel Spitz (South
Route), Little Tahoma (Frying Pan/Whitman Glaciers), Ghost Peak (South Route), Gilbert Peak
(Conrad Glacier, Meade Glacier, West Route), Glacier Peak (Cool Glacier/Gerdine Ridge).

**Fixed (3):**
- `wa_ghost_peak_south_route`: `descent_text`'s closing sentence still routed the exit via
  "the Big Beaver Trail to Ross Lake and the dam" — contradicting this route's own approach
  text, `approach_logistics.trailhead`, every waypoint, and the itinerary's own final two
  legs, all of which agree the only access is Hannegan Pass Trailhead (the approach text
  explicitly says Ross Lake/Big Beaver instead serves Luna Peak and Mount Fury further
  south). A much earlier batch's note claims this exact contradiction was already fixed once
  — evidently only part of the paragraph was corrected and this trailing sentence was missed.
  Rewrote it to match the rest of the row.
- `wa_gilbert_peak_conrad_glacier` / `wa_gilbert_peak_meade_glacier`: a continuation of a
  land-manager contamination pattern a prior batch on this same peak already partly fixed —
  the Cowlitz Valley RD/Gifford Pinchot NF value (correct only for `wa_gilbert_peak_west_route`'s
  Snowgrass-side approach) had bled onto the two Naches-side Conrad Meadows routes. That
  earlier fix touched `access.landManager` but missed `access.land_manager` on Meade Glacier
  — the field `RouteDetail.jsx` actually reads first per `ac.land_manager||ac.landManager`,
  so the wrong value was the one rendered even though the correct one sat right beside it —
  and missed `emergency.rangerStation` entirely on Conrad Glacier. Both synced to "Naches
  Ranger District, Okanogan-Wenatchee National Forest", matching the routes' own Conrad
  Meadows/South Tieton approach text and the correct value already present elsewhere on both
  rows. West Route audited clean and independently confirms Cowlitz Valley RD/Gifford Pinchot
  NF is the correct value for its own genuinely west-side Snowgrass Flat approach — nothing
  there was touched.

**Investigated, left unchanged:** `wa_glacier_peak_cool_glacier_gerdine`'s FA field reads
"A. H. Dubor" for a member of the 1897 USGS survey party. This looked at first like the
misspelling a much earlier batch's note describes catching and fixing DB-wide — but that same
note's own wording, re-read carefully plus a web check against Wikipedia/USGS-sourced
material, confirms "Dubor" (the source material actually spells it "DuBor") is the *correct*
form and "Dubois" was the DB-wide error a later batch fixed by restoring "Dubor". Left as-is;
recorded here so a future pass doesn't "fix" it back to the wrong spelling a third time.

**Clean, no action:** `wa_free_mojo` (FA, elevation, coordinates all externally consistent —
Blake Herrington/Graham Zimmerman FA well corroborated); `wa_frenzel_spitz_south_route`
(remote Southern Pickets objective, appropriately hedged FA attribution, internally
consistent approach/descent/waypoint chain). `wa_frying_pan_whitman_glaciers` re-verified
clean against a prior batch's fixes (trailhead, access notes, pitches, gain_ft all still
holding); its existing `data_quality`-flagged likely-duplicate against
`wa_little_tahoma_east_shoulder` persists unchanged — still a human/catalog-maintainer
merge decision, not something this audit auto-fixes.

Web access this run: WebSearch worked; did not attempt WebFetch on wikipedia.org (blocked in
prior runs per earlier log entries).

Next batch continues alphabetically after `wa_glacier_peak_cool_glacier_gerdine` (see
progress file).

---

## 2026-08-20 — Pass 3, Batch 130

Eight routes across four peaks (Glacier Peak 4, Goat Mountain 1, Golden Horn 1, Mount Goode
2): Disappointment Peak Cleaver (Cool Glacier), Frostbite Ridge, Kennedy Glacier, Sitkum
Glacier (Glacier Peak); South Ridge / Standard Scramble (Goat Mountain); North Face (Golden
Horn); Megalodon Ridge, Northeast Face (Goode).

**Confirmed errors → fixes in `sql/2026-08-20-batch-130.sql`:**
- `wa_goat_mountain_south_ridge`: `overview`, `descent`, and `watch_out[0]` all give the true
  (east) summit's elevation as "6,891 ft" — not corroborated by any source found, and wrong.
  Wikipedia and Peakbagger both independently give Goat Mountain (Whatcom County)'s true
  summit as 6,844 ft with a 6,725 ft west/false summit — the latter already matches the
  6,721 ft this row correctly stores in `beta`. Fixed all three prose occurrences to 6,844 ft
  and corrected `high_point_ft` from 6,721 ft (the false summit) to 6,844 ft, since the row's
  own overview/descent/watch_out describe the standard route continuing past the false summit
  to the true one ("many parties turn around at the easier false summit rather than continue
  ... to the true summit").
- `wa_glacier_peak_kennedy_glacier`: `waypoints[0]` ("White Chuck River Trailhead")
  stored elev/elevFt 1700, contradicting this same row's own `approach` field and sibling
  route `wa_glacier_peak_sitkum_glacier`'s `approach` field, both of which give 2,350 ft for
  this identical trailhead — corroborated by USFS/trip-report sources (2,300–2,350 ft).
  Fixed to 2,350 ft. Same waypoint's `note` also claimed the trailhead sits on "Suiattle
  River Rd (FR 26)", contradicting this row's own `road` field ("White Chuck Road (FR 23)")
  and `approach` text ("White Chuck River Trailhead (FS-23...)"). FR 26/Suiattle River Road
  is a different road entirely, used by sibling route `wa_glacier_peak_frostbite_ridge`'s
  separate Milk Creek approach — the note reads like cross-route contamination. Rewrote it
  to name FR 23, matching the rest of the row.

**Flagged for human review (not auto-fixed):**
- `wa_glacier_peak_disappointment_peak_cleaver`: the route mixes two irreconcilable approach
  narratives. `approach`/`overview`/`beta`/`hazards`/`road` consistently describe the real,
  standard North Fork Sauk River Trail → White Pass → Glacier Gap approach (Pilot Ridge
  junction, Red Creek ford, Mackinaw Shelter — all verifiable, all consistent with this peak's
  three sibling routes in this same batch). But `waypoints`/`itinerary`/`timing`/`gpx` instead
  describe a "Trinity Trailhead → Buck Creek Pass → Cool/Gerdine Basin" approach. The
  `waypoints[0]` pin is self-contradictory on top of that: its coordinate (48.05832,
  -121.28793) is verifiably the real North Fork Sauk River Trailhead — it matches a published
  figure for that trailhead exactly, and matches the identical pin used by name on this same
  peak's Frostbite Ridge and Sitkum Glacier routes in this batch — yet the pin's own `note`
  claims this coordinate is "as published... for the Trinity Trailhead" (a real trailhead
  roughly 26 miles away near 48.07,-120.85, on a different road system entirely) and says it
  "REPLACES" a North Fork Sauk pin. That claim is false: the coordinate never changed, it is
  still North Fork Sauk's. Whether Buck Creek Pass is a real, viable approach to this route at
  all is also unconfirmed — nothing found ties Buck Creek Pass/Trinity to Glacier Peak's south
  side climbing routes, only to unrelated Dakobed Range hiking objectives. Untangling this
  needs either deleting the fabricated Trinity/Buck Creek Pass material and rebuilding
  waypoints/itinerary/gpx to match the well-documented North Fork Sauk approach, or the
  reverse — more than a mechanical fix, and not attempted here.
- `wa_golden_horn_north_face`: `waypoints[0]`/`approach_logistics` pin the trailhead as "Rainy
  Pass North Trailhead (PCT)" (48.5153,-120.73601 — externally confirmed as the real Rainy
  Pass PCT north trailhead coordinate), but the row's own `approach` text says standard access
  is instead "the Swamp Creek pullout on Hwy 20 (about 3 miles before Rainy Pass)" — a
  separate, specific roadside parking spot, confirmed by name via multiple trip reports
  (including one titled "Swamp Creek to Snowy Lakes" for this exact peak) as the real
  climbers' approach, distinct from the much longer PCT-from-Rainy-Pass hiking route. No
  authoritative source found gives exact coordinates for the Swamp Creek pullout itself, so
  left flagged rather than guessing a replacement pin.

`wa_glacier_peak_frostbite_ridge`, `wa_glacier_peak_sitkum_glacier`,
`wa_goode_mountain_megalodon_ridge`, and `wa_goode_mountain_northeast_face` audited clean —
Goode's summit coordinate/elevation (48°28'58"N 120°54'39"W, 9,220 ft) independently confirmed
against Wikipedia and used consistently across all three Goode routes in this batch;
Megalodon Ridge's FA date correction (2007, not 2008) already self-documents its own prior
fix accurately; Sitkum/Frostbite's shared North Fork Sauk trailhead pin (48.0579,-121.2882,
~2,100 ft) is internally consistent with itself and with the externally-confirmed figure.

Web access this run: WebSearch worked throughout; WebFetch was blocked by the egress proxy
for fs.usda.gov and naturalatlas.com (consistent with prior runs' notes that some domains are
blocked) — relied on WebSearch's own summarization instead, which was sufficient here.

Next batch continues after `wa_goode_mountain_northeast_face` in the current id-ordered scope
(see progress file — live scope count has drifted slightly from the last recorded count,
529 vs. 532, likely normal catalog churn since the last run).

## 2026-08-20 — Pass 3, Batch 131

Nine routes across five peaks (Mount Goode 1, Mount Stuart 1, Gunnshy Peak 1, Middle/Gunsight
Peak 2, Guye Peak 4): Southwest Couloir (Goode); Gorillas Direct (Stuart); Standard Route
(Gunnshy, Barclay Lake approach); Gunrunner, Standard Route (Gunsight Peaks Traverse); West
Face, North Route ("Hidden Ridge"), Improbable Traverse, Southeast Gully (Guye).

**Confirmed errors → fixes in `sql/2026-08-20-batch-131.sql`:**
- `wa_goode_mountain_southwest_couloir`: `seasonal_hazards.crevasses` claimed "N/A — route is
  described in the on-file beta as snow/scree/rock with no documented glacier crossing." That
  directly contradicts the rest of this same row: `approach` and `waypoints` describe crossing
  the Goode Glacier from the lateral-moraine camp to reach the couloir base (a waypoint of
  type Hazard is literally named "Goode Glacier crossing"), `obj_haz` lists
  "crevasses/moat on the Goode Glacier portion of the approach," and
  `approach_variants[0].hazards` warns of "receding hidden-glacier snowbridges below 8,000 ft."
  Rewrote `crevasses` to describe the real (non-technical, standard-line) glacier crossing
  instead of denying it exists.
- `wa_gunrunner`: `waypoints[1]` ("Middle Peak (Gunsight Range)", the route's own Summit-type
  waypoint) stored `elev: 8000` — about 200 ft below this same row's own `high_point_ft`
  (8200), below sibling route `wa_gunsight_peak_standard`'s summit waypoint for the identical
  peak (8198 ft, essentially the same lat/lng), and below the externally-confirmed figure:
  Wikipedia's "Gunsight Peak" entry (Chelan County; Blue Glacier to the east, Chickamin
  Glacier to the west — matching this row's own hazard/waypoint descriptions) gives 8,198 ft.
  Corrected the waypoint to 8198.

**Flagged for human review (not auto-fixed):**
- `wa_gorillas_direct`: `fa` reads "Sol Wertkin, Jens Holsten & Mark Westman, 2011." Web
  search independently confirms the climbers and the route (a direct variation adding five
  pitches to Gorillas in the Mist, established the year before by Herrington/Holsten/Wertkin
  in 2009), but is split on the year: one summary states "established in 2010," a second says
  "FA'd in 2011... However, another source indicates the Gorillas Direct route was FA'd in
  2010." WebFetch to Mountain Project, the AAC publications archive, and Alpinist's newswire
  (the pages that would settle it) were all blocked by the egress proxy this run, so the
  conflict could not be resolved — left as-is per the "don't guess" instruction.

`wa_gunnshy_peak_standard_route`, `wa_gunsight_peak_standard`,
`wa_guye_peak_improbable_traverse`, `wa_guye_peak_r1`, `wa_guye_peak_r2`, and
`wa_guye_peak_southeast_gully` audited clean. Externally cross-checked and confirmed: Gunn
Peak's elevation (Wikipedia: 6,244 ft — this route's own `pro_tips` already hedges "6,240'-
6,244'," which brackets the correct figure rather than being wrong); Guye Peak's summit
elevation (5,168 ft, matches all four Guye routes' `high_point_ft`/waypoints, `wa_guye_peak_r1`
is 1 ft off at 5169 — too small to be worth a fix); the 1912 first-ascent party (Hazlehurst,
Abel, Dubuar, Hard) as recorded on two of the four Guye routes; the November 2021 rockfall's
~30×40 ft scar and "at least eight" recorded climbing fatalities on Guye Peak, both stated in
`wa_guye_peak_improbable_traverse`'s hazards; and Gunrunner's own FA (Herrington & Hilden, July
9, 2007, IV 5.10 A1, 18 pitches, four-summit Gunsight traverse) against an AAC Publications
listing. `wa_gunsight_peak_standard` is already unusually well self-documented — its own
`data_quality.gaps` already flags an unresolved prominence conflict (518 ft vs. 546 ft) and an
unconfirmed FA party, so those known gaps were not re-flagged.

Web access this run: WebSearch worked throughout. WebFetch was blocked by the egress proxy for
mountainproject.com, publications.americanalpineclub.org, and alpinist.com — consistent with
prior runs' notes that some domains are blocked — which is what left the Gorillas Direct FA
year unresolved rather than fixed or confidently left alone.

Next batch continues after `wa_guye_peak_southeast_gully` in the current id-ordered scope (see
progress file).

## Batch 132 — 2026-08-20

Checked `wa_hadley_peak_cougar_divide`, `wa_hadley_peak_skyline_divide`,
`wa_helmet_butte_standard_route`, `wa_himmelhorn_southeast_route`, `wa_honeymoon_route`,
`wa_hourglass_gully_winter`, `wa_hozomeen_mountain_north_peak_north_route`, and
`wa_hozomeen_mountain_southeast_face`.

**Fixed (SQL in `audits/sql/2026-08-20-batch-132.sql`):**
- `wa_hadley_peak_cougar_divide` and `wa_hadley_peak_skyline_divide` both carried an
  identical, contaminated `bivy[]` — 6 entries each, only 3 of which are actually about
  Hadley Peak. The other 3 ("Crag View, Squak Glacier", "Upper Squak benches...", "Coleman
  Glacier bivy under the Black Buttes north faces") describe camps for Sherman Peak's Squak
  Glacier route and Mount Baker's Coleman Glacier/Black Buttes ice lines — a different
  mountain, ~9 miles away, named explicitly in the notes text itself ("Colfax's three
  north-side ice lines", "the Black Buttes"). Confirmed from the row's own content, no
  external source needed. Trimmed both to the 3 genuine Hadley Peak entries.
- `wa_hadley_peak_cougar_divide`'s own Summit waypoint (elev/elevFt) read 7470, 45 ft below
  the sibling Skyline Divide route's summit waypoint for the same peak (7515) and below two
  independent external sources (listsofjohn.com: 7,515 ft; PeakVisor, USGS-derived: 7,513
  ft). Corrected to 7515.
- `wa_hozomeen_mountain_southeast_face`: `high_point_ft` stored 8071, which is Hozomeen's
  NORTH Peak elevation (confirmed via search: North Peak 8,071 ft, South Peak 8,003 ft) —
  but this route's own Summit waypoint is "Hozomeen Mountain, South Peak" at 8003, matching
  its name and its own Hazard waypoint ("Southeast buttress"). Corrected `high_point_ft` to
  8003. Its `face` field also read "North Peak (main/highest summit)" — a fact about the
  mountain, not a description of this route's own face — rewritten to "Southeast Buttress
  (South Peak)" to match the route's own aspect field (E-SE) and hazard waypoint wording.

**Flagged for human review (not auto-fixed):**
- `wa_himmelhorn_southeast_route`: `aspect`="NW" / `face`="Northwest Aspect" appears to
  contradict the route's own name. Search turned up a Mountain Project route "Southeast
  Gully" on Himmelhorn whose approach (Goodell Creek → Stump Hollow → Crescent Creek Basin →
  Himmel-Otto Col) matches this row's waypoints closely, suggesting this is the same
  historic FA line under a differently-cased name — which would mean "Southeast" is the
  route's real name/orientation and the NW aspect field is wrong. Could not confirm the
  actual compass aspect directly: WebFetch to mountainproject.com and Wikipedia was blocked
  by the egress proxy this run (consistent with prior runs' notes). Left as-is.
- `wa_hourglass_gully_winter` (Mount Index): FA "Jim Pritchard, Stan Jensen & Cecil Bailey
  (1963)" could not be independently confirmed or contradicted by web search — not flagged
  as wrong, just unverified this run.
- `wa_honeymoon_route` (Mount Deception): FA "1965 Arnie & Diane Bloomer" could not be
  independently confirmed by web search this run.
- Mount Index's `high_point_ft` (6002) vs. its own Summit waypoint (5979) vs. external
  sources (Peakbagger/Wikipedia converge on 5,991 ft NGVD29): a real three-way discrepancy,
  but all three are within ~10-20 ft of each other, consistent with ordinary datum/survey
  variance rather than a clear error. Not confident enough to pick a "correct" value; left
  alone rather than guessing.

Externally cross-checked and confirmed accurate: Helmet Butte's elevation (7,400 ft,
matches `high_point_ft` exactly); Hozomeen Mountain North Peak's elevation (8,071 ft,
matches both the north route's `high_point_ft` and its own summit waypoint); Himmelhorn's
first ascent (Ed Cooper, Glen Denny, Joan & Joe Firey, George Whitmore, September 8, 1961 —
matches this row's `fa` field verbatim, cross-checked against an independent search
summary); Hozomeen's 1904 Boundary Survey first ascent (Sledge Tatum & George E. Loudon
Jr., September 6, 1904 — matches `wa_hozomeen_mountain_southeast_face`'s `fa` field).
Mount Deception's summit elevation (7,788 ft) and the Upper Dungeness/Royal Lake approach
on `wa_honeymoon_route` were consistent with known geography and not flagged.

`wa_helmet_butte_standard_route`'s large `bivy[]` (9 entries spanning Mackinaw Shelter,
White Pass, Glacier Gap, Buck Creek Pass, Napeequa Valley, Boulder Pass/Thunder Basin, etc.)
was considered for the same contamination pattern as Hadley Peak's, but all 9 sites sit
within the same Glacier Peak Wilderness drainage system Helmet Butte is actually in (near
Buck Creek Pass, reachable from several trailheads), unlike Hadley's entries which named a
different, non-adjacent mountain outright. Left alone — no clear defect found.

Web access this run: WebSearch worked throughout. WebFetch was blocked by the egress proxy
for mountainproject.com, en.wikipedia.org, www.mountaineers.org, listsofjohn.com, and
www.peakbagger.com — all cross-checks above relied on WebSearch result summaries and
convergence across multiple independent domains rather than a single fetched page.

Next batch continues after `wa_hozomeen_mountain_southeast_face` in the current id-ordered
scope (see progress file).

## Batch 133 — 2026-08-20

Checked `wa_hurry_up_peak_south_ridge`, `wa_icy_peak_ruth_icy_traverse`,
`wa_icy_peak_southwest_route`, `wa_ingalls_peak_east_route`,
`wa_ingalls_peak_south_ridge`, `wa_inner_constance_northwest_buttress`,
`wa_inner_constance_standard`, and `wa_inspiration_peak_west_ridge`. (`wa_j_tnar`
(Jötunheim), the next id after this batch, is `area_type: "crag"`, not a peak —
correctly out of scope per the audit's own scope definition, so it was skipped
without counting toward the batch.)

**Fixed (SQL in `audits/sql/2026-08-20-batch-133.sql`):**
- `wa_inner_constance_standard`: `road.status` claimed the Dosewallips Road washout
  that closed vehicle access sits "roughly 5.5-6.5 miles from Hwy 101." That
  contradicts the row's OWN waypoint list, whose "Dosewallips Road washout parking"
  trailhead entry independently says the washout is "~9 mi from Hwy 101" — and
  matches external sources (a USFS EIS summary and WTA trip reports both put the
  washout at roughly 9-10 miles from Brinnon/Hwy 101). 5.5-6.5 miles turned out to
  be a real number, just for a different leg: WTA reports the former Dosewallips
  Campground/Ranger Station sits about 6.5 miles of closed roadbed *beyond* the
  washout, not from the highway. Rewritten to state both distances correctly rather
  than deleting the 5.5-6.5 figure, since it is genuine information once correctly
  attributed.

**Flagged for human review (not auto-fixed — real source disagreement, not a clear error):**
- `wa_ingalls_peak_south_ridge`: the row's own `pitches` field says 4, but both of
  its own waypoint notes describe the roped climbing as "three pitches." External
  sources split the same way — Mountain Project describes it as both a 3-pitch
  climb (efficient rope management) and a 4-pitch climb (5.4 with a 5.6 "Beckey
  variation" pitch), so this reads as genuine party-to-party variation in how the
  route is broken up rather than a database error. Left as-is.
- Inner Constance's elevation disagrees by 2 ft between its own two routes:
  `wa_inner_constance_northwest_buttress` stores `high_point_ft` 7670,
  `wa_inner_constance_standard` stores 7672 (both in `high_point_ft` and its own
  Summit waypoint). External sources also spread across this range (Wikipedia:
  7,670 ft; listsofjohn.com: 7,667 ft), so — same as Mount Index in batch 132 —
  this reads as ordinary datum/survey variance rather than a value confidently
  correctable to one figure. Left alone rather than picking a winner.
- `wa_inner_constance_northwest_buttress`'s FA ("Eric Hardee and Dan Coffey, 1983")
  could not be independently confirmed or contradicted by web search this run.

Externally cross-checked and confirmed accurate: Hurry-up Peak's elevation (7,821
ft, PeakVisor) and its historical "Ess/S Mountain" alternate name; Icy Peak's
elevation (7,073 ft, matching both `wa_icy_peak_ruth_icy_traverse` and
`wa_icy_peak_southwest_route` exactly, per listsofjohn.com and Wikipedia);
`wa_ingalls_peak_east_route`'s FA (Gene Prater, Bill Prater & Stan Butchart,
November 1952 — matches SummitPost verbatim, order of names aside);
`wa_ingalls_peak_south_ridge`'s FA (Keith Rankin & Ken Solberg, May 30, 1941 —
matches The Mountaineers/SummitPost; Wikipedia's "Lankin" spelling looks like their
own typo rather than a second source); and `wa_inspiration_peak_west_ridge`'s
elevation (7,891 ft) and FA (Fred Beckey and Helmy Beckey, August 29, 1940) —
both match Wikipedia exactly.

`wa_inner_constance_northwest_buttress` is noticeably thinner than its sibling
route — no `grade`, no `pitches`, no `gain_ft`/`loss_ft`, and only a single
waypoint (the trailhead, no summit). Not a factual error and not fixed, just
noted: nothing in it contradicts an external source, it is simply sparse.

Web access this run: both WebSearch and the `npm run check:sql` live-DB check
worked without issue.

Next batch continues after `wa_inspiration_peak_west_ridge` in the current
id-ordered scope (see progress file) — `wa_j_tnar` excluded as a crag, so the
next real candidates start at `wa_jack_mountain_nohokomeen_headwall`.

---

## Batch 134 — 2026-08-20 (Pass 3)

Audited (id-ordered, after `wa_inspiration_peak_west_ridge`):
`wa_jack_mountain_nohokomeen_headwall`, `wa_jack_mountain_northeast_glacier`,
`wa_jack_mountain_south_face`, `wa_johannesburg_mountain_cj_couloir`,
`wa_johannesburg_mountain_northeast_buttress`, `wa_kimtah_peak_scramble`,
`wa_king_kong_gorillas_direct_direct`, `wa_klawatti_peak_southeast_face`.

**Confirmed errors fixed (2):**

- `wa_jack_mountain_south_face` and `wa_kimtah_peak_scramble` both carried the
  identical stray line in `access.seasonal`: *"Cascade River Road (the access road
  for these trailheads) has a history of washouts/closures…"* — boilerplate copied
  from a Cascade Pass–area route. Neither is approached from Cascade River Road:
  Jack's South Face is the **Canyon Creek Trailhead on SR-20** (Jackita Ridge →
  Crater Mtn → Jerry Lakes; confirmed by the rows' own waypoints, `road.name`,
  `access.landManager`, and SummitPost/Beckey), and Kimtah is the **Easy Pass
  Trailhead on SR-20** near MP 151 (WTA/SummitPost). Corrected `access.seasonal` to
  name SR-20 and the WSDOT pass report, re-homing each row's own `road`-block info
  (same contamination fingerprint the trailhead-road audits track). Note the sibling
  routes this batch — Johannesburg (both) and Klawatti — genuinely *do* use Cascade
  River Road, so the line is correct there and was left alone.

**Externally cross-checked and confirmed accurate:** Jack Mountain elevation 9,075 ft
(all three routes; Wikipedia/PeakVisor); Johannesburg 8,200 ft (listsofjohn 8,212,
within tolerance); Johannesburg CJ Couloir FA Calder Bressler, Bill Cox, Ray Clough,
Tom Myers — July 26, 1938 (Wikipedia, verbatim); Kimtah 8,649 ft high-point within
the "8,600+" figure and coordinates matching Wikipedia (48.585, −120.911), FA John
Roper & Jerry Swanson June 1970 ("Gendarmes Peak", SummitPost); Klawatti 8,485 ft and
FA Lloyd Anderson, Karl Boyer, Tom Gorton — July 7, 1940 (Wikipedia/SummitPost,
verbatim); Mount Stuart 9,415 ft and King Kong FA Sol Wertkin/Tyree Johnson 2016,
5.11d (AAC/CascadeClimbers) — the "Enchantment permit area" note is correct because
the West Face sits in the **Stuart Zone**, one of the Enchantment Permit Area's quota
zones.

**Flagged for human review (2, not auto-fixed):**

- `wa_jack_mountain_northeast_glacier`: the legacy `access.notes` stub says *"Best
  season: August–September (least snow)"*, contradicting the row's own researched
  `best_season`/`season` (early-season, **May–Jul**, "while the glacier is still
  filled in and the bergschrund is closed") — the correct call for a heavily
  crevassed north-cirque glacier line. The row also mixes two approaches: `waypoints`
  list the **East Bank Trailhead** (11-mile approach) while `approach_logistics`
  names **May Creek via Ross Lake shuttle**, and `gain_ft`/`dist_km` (4,501 / 5.6 km)
  reflect the short shuttle approach. Needs a human to decide which approach the row
  documents and reconcile season.
- `wa_king_kong_gorillas_direct_direct`: `access.notes` describes the **Stuart Lake /
  Icicle Creek (north-side)** trailhead — *"Parking: 20–30 car spaces… at Stuart Lake
  trailhead. Dogs not allowed in Stuart Lake area. FR 7601 closes…"* — but this west-
  face route is approached from the **Esmeralda Basin Trailhead (North Fork Teanaway
  Rd)**, correctly given in the row's own waypoints/`approach_logistics`. Trailhead
  contamination in `access.notes` (and `road.name`, which hedges "depending on
  route/face"). Elevation, FA, grade and permit are all correct.

Web access this run: WebSearch and the `npm run check:sql` live-DB check both worked;
WebFetch remains blocked by the egress proxy (Wikipedia/SummitPost direct fetch 403),
so facts were confirmed via WebSearch result summaries.

Next batch continues after `wa_klawatti_peak_southeast_face` in the id-ordered scope.

---

## Batch 135 — 2026-08-20 (Pass 3)

Audited (id-ordered, after `wa_klawatti_peak_southeast_face`):
`wa_klawatti_peak_sw_buttress`, `wa_koala_krack`, `wa_kololo_peaks_standard`,
`wa_kyes_peak_glaciated_scramble`, `wa_kyes_peak_northeast_ridge`, `wa_labor_pains`,
`wa_lane_peak_r1` (The Zipper), `wa_lane_peak_r2` (The Fly).

**Confirmed errors fixed: 0.** A genuinely clean batch on hard facts.

**Externally cross-checked and confirmed accurate:** elevations all match
Wikipedia/SummitPost/PeakVisor — Klawatti 8,485 ft, Kangaroo Temple 7,572 ft, Kololo
8,200-8,240 ft (`high_point_ft` 8240 OK), Kyes 7,280+ ft, North Early Winters Spire
7,760 ft, Lane Peak 6,012 ft. Summit coordinates all sit on the named peak and match
the parent area (Kololo 48.0646,-121.0953 matches Wikipedia to the decimal). FAs:
Labor Pains (Steve Risse & Donna McBain, Sep 1988) verbatim per SuperTopo/AAC; Klawatti
(Anderson/Boyer/Gorton, Jul 7 1940); Kyes NE Ridge — AAC's 1968 FA report matches the
row's Sep 14 1968 date and every route detail (Quartz Creek → Curry Gap, "most direct
of three approaches", Class 3 to the SE corner). Access/road blocks each name the
correct trailhead and drainage for their own approach — **no cross-drainage
contamination this batch** (contrast batch 134's stray Cascade River Road lines).

**Flagged for human review (2, not auto-fixed):**

- `wa_kololo_peaks_standard`: the 1063-point `gpx` track is genuine from index 257
  onward — it passes through the real North Fork Sauk trailhead (0.08 km off) and ends
  on the summit — but the first ~257 points are a **spurious prefix segment** starting
  42.7 km away at 48.2497,-121.6002, in a different drainage (Suiattle/White Chuck side)
  that matches none of this route's three stated approaches. Looks like an unrelated
  track fragment concatenated onto the front. Not auto-fixed: rewriting a 1000+ element
  array by hand-SQL is the truncation-prone edit `check:sql` warns against, and it is a
  track-cleanliness issue rather than a verifiable-fact error.
- `wa_kyes_peak_northeast_ridge`: FA stored as "Mike Heath, September 14, 1968" — AAC's
  FA report confirms the date and all route detail, but the **climber's name** could not
  be confirmed from search snippets (WebFetch to AAC/SummitPost still 403s via the
  proxy). Nothing contradicts it, so left as-is; noted for a future full-fetch run.

Web access this run: WebSearch and the anon-key REST reads worked; WebFetch remains
blocked by the egress proxy, so facts were confirmed from WebSearch result summaries.

Next batch continues after `wa_lane_peak_r2` in the id-ordered scope.

## Batch 136 — 2026-08-20 (pass 3)

Routes: wa_lane_peak_r3, wa_le_conte_mountain_northern_aspect, wa_lemah_mountain_east_route,
wa_lemah_two_goatshead_spire, wa_lena_lake_to_mt_stone_traverse, wa_lewis_creek_route,
wa_lexington_tower_east_face, wa_liberty_and_injustice_for_all.

**Clean on hard facts; 0 auto-fixes, 2 flags.** Elevations, summit coordinates, FAs, permits
and access roads all verified or source-consistent. Le Conte Mountain confirmed exact against
Wikipedia (7,762 ft, 48.3794,-121.062) and its Glacier-Peak-Wilderness parent placement is
correct, not a misfile. Lexington 7,560, Liberty Bell 7,720, Mount Stone 6,612, Gunn 6,244,
Lane 6,012 all match. Lemah main stored 7,519 vs the commonly-cited 7,512 is within the row's
own documented 7,463-7,520 source range (already flagged in data_quality pending LiDAR) — left
unchanged. Lane Peak's Narada Falls approach and both Lemah routes' Pete Lake (Cle Elum-side)
approach confirmed; no cross-drainage contamination in any road/access block this batch.

**Flagged (no auto-fix):**

- `wa_lane_peak_r3`: `bivy[0]` is "Snow Lake Camp" but its note is written about **Unicorn
  Peak**, a different Tatoosh objective on the south side (Stevens Canyon Rd east of Reflection
  Lakes). Lane Peak's north couloirs are approached from Narada Falls (confirmed by the route's
  own approach and TRs). Looks like a neighbour-peak bivy note contaminating this route. Soft
  jsonb field, no authoritative substitute camp, so flagged not fixed.
- `wa_lexington_tower_east_face`: summit waypoint "Lexington Tower notch" stores elev 7,621 ft,
  which is *above* the verified 7,560 ft summit and the row's own high_point_ft — impossible for
  a notch the route reaches *below* the true summit. No authoritative notch elevation found, so
  flagged rather than substituting a value.

Web access this run: WebSearch and anon-key REST reads worked; WebFetch still blocked by the
egress proxy, so facts confirmed from WebSearch result summaries.

Next batch continues after `wa_liberty_and_injustice_for_all` in the id-ordered scope.

## Batch 137 — 2026-08-20 (pass 3)

Routes: all 7 routes on Liberty Bell (Beckey Route, East Face, The Independence Route,
Northwest Face, Overexposure, Serpentine Crack, Thin Red Line) plus Liberty Cap via
Liberty Ridge (Mount Rainier).

**2 auto-fixed, 2 flagged for human review.**

**Fixed** (`audits/sql/2026-08-20-batch-137.sql`, validated with `check-sql-targets.mjs`):
the SR-20 hairpin/pond pullout Trailhead waypoint used by `wa_liberty_bell_east_face` and
`wa_liberty_bell_thin_red_line` correctly names itself "(east of Washington Pass)" and its
own `directions` field says "the east-side pullout that every route on this wall uses, not
the Blue Lake Trailhead" — but its `note` field is a stale copy of the *Blue Lake*
Trailhead's note, reading "...about 1.5 mi **west** of Washington Pass." Internal
self-contradiction inside the same row, no external source needed.
`wa_liberty_bell_independence_route`'s copy of the identical waypoint already has a correct,
non-contradictory note and was left alone.

Hard facts otherwise checked clean: Liberty Bell summit 7,720 ft / 48.5154,-120.6584 (matches
Wikipedia, and the row's own `high_point_ft` and summit waypoint agree with each other and
with the trailhead-to-summit `gain_ft` arithmetic). FAs for Beckey Route (Beckey/O'Neil/Welsh,
Sept 27 1946), Thin Red Line (Madsen/Schmitz 1967, FFA Rutherford/Schaefer Sept 2008), and
Independence Route (Bertulis/McPherson 1966, FFA Risse/Hertel 1991) all confirmed exactly
against independent sources (AAC Publications, climbing.com). Permit text for both areas
confirmed against current NPS/USFS pages (Rainier's $82/yr climbing pass above 10,000 ft or
on glaciers, still accurate for 2026; no WA Pass climbing permit, just a parking pass).
Liberty Cap's `high_point_ft` (14,112 ft) is the still-current official/map elevation — its
`overview` text separately and *correctly* cites the real Aug 2025 GPS resurvey
(14,094.9 ft ± 0.1 ft, countryhighpoints.com/arXiv:2512.06567) as a distinct, more recent
figure describing icecap thinning; the two are not in conflict, this is accurate reporting
of two different real numbers and needed no fix.

**Flagged, not fixed:**

- `wa_liberty_bell_nw_face`: the free-FA team given for the Northwest Face
  ("Sandy Bill, Ron Burgner, Ian Martin & Frank Tarver, 1966") is suspiciously close to the
  independently-documented FA team of a *different, named* Liberty Bell route, **Barber Pole**
  ("S. Bill, C. Burgner, F. Tarver, 1966" per search results referencing that route
  specifically). Could not confirm or rule out via the sources reachable this run — Mountain
  Project, SuperTopo, thecrag.com and mountaineers.org are all blocked by the egress proxy for
  WebFetch, and WebSearch snippets weren't decisive enough either way. Left unchanged; flagging
  for a run with working WebFetch or manual guidebook check (Beckey's Cascade Alpine Guide is
  the natural source).
- `wa_liberty_cap_liberty_ridge_finish` appears to be a **duplicate** of the existing
  `wa_mount_rainier_liberty_ridge` (area_id `wa_mount_rainier`) — same real climb (same FA
  party/date: Daiber, Campbell, Borrow[s], Sept 28-Oct 1 1935; same ~9,700 ft gain; both top
  out on Liberty Cap at 14,112 ft). Two things worth a human decision rather than an automated
  merge: (1) `wa_mount_rainier_liberty_ridge`'s own `waypoints` are geographically incoherent —
  they route White River Campground -> **Mowich Lake Camp** (46.952,-121.818, the NW side of
  the mountain) -> "Puyallup Winthrop Junction Camp" -> **Puyallup Glacier** Serac Zone -> 
  Liberty Cap, but the Puyallup Glacier is on the SW side of Rainier nowhere near Liberty
  Ridge or the Winthrop Glacier, and Liberty Ridge's real approach (confirmed against NPS/
  guidebook descriptions, and matching what `wa_liberty_cap_liberty_ridge_finish`'s own
  waypoints already describe correctly) runs via Glacier Basin -> St. Elmo Pass -> Winthrop
  Glacier -> Curtis Ridge -> Carbon Glacier -> Thumb Rock. (2) `wa_liberty_cap` is itself
  parented as a *sibling* of `wa_mount_rainier` under `wa_southwest_cascades` rather than as
  a child of it (same for `wa_point_success`) — the same flat-import fingerprint
  `audit:area-parents` documents for the Liberty Bell Group case, but Mount Rainier has no
  existing "massif" grouping area the way Liberty Bell Group does, so fixing it means either
  reparenting these summit sub-points under `wa_mount_rainier` or leaving the flat structure
  as an intentional convention for named sub-summits — a design call, not a one-line fix.
  Recommend a human read both route rows side by side and decide whether to consolidate
  (keeping the accurate waypoints) or keep both with `wa_mount_rainier_liberty_ridge`'s
  waypoints corrected. Not touched this run — this is exactly the "duplicate flag is a
  hypothesis, confirm both ids, do not delete unilaterally" case CLAUDE.md warns about, and
  a merge/reparent is out of scope for a single UPDATE statement.

Web access this run: WebSearch worked well (including confirming a genuine 2024-2025 Rainier
summit GPS resurvey story); WebFetch remains blocked by the egress proxy for every climbing
reference site tried (mountainproject.com, mountaineers.org, thecrag.com, supertopo.com), so
the Northwest Face/Barber Pole question above could not be resolved from search snippets alone.

Next batch continues after `wa_liberty_cap_liberty_ridge_finish` in the id-ordered scope.

## Batch 138 (2026-08-20, pass 3)

Routes: `wa_liberty_cap_ptarmigan_ridge_finish`, `wa_liberty_crack`, `wa_liberty_crack_free`,
`wa_liberty_traverse`, `wa_lichtenberg_mountain_west_face_west_rib`,
`wa_lincoln_peak_north_ridge`, `wa_lincoln_peak_standard`,
`wa_little_big_chief_mountain_northeast_face`.

**2 confirmed elevation errors, SQL in `audits/sql/2026-08-20-batch-138.sql`:**

- `wa_liberty_crack.high_point_ft` stored 7746. No source found anywhere gives that
  figure for Liberty Bell Mountain; Wikipedia, mountainzone.com and peakvisor.com all
  agree on 7,720 ft. The route's own sibling `wa_liberty_crack_free` already stores
  7720 for the identical summit, and a prior batch in this same audit (137, same day)
  independently confirmed 7,720 ft for `wa_liberty_bell_beckey_route` against the same
  source. Fixed to 7720.
- `wa_lincoln_peak_north_ridge` and `wa_lincoln_peak_standard` both stored
  `high_point_ft` 9101, and `wa_lincoln_peak_standard`'s summit waypoint also stored
  elev/elevFt 9101. Every source checked (Wikipedia, PeakVisor, WTA, peakery,
  stevensong.com) consistently gives Lincoln Peak as "9,080+ ft"; nothing gives 9,101.
  `wa_lincoln_peak_north_ridge`'s own `corrections` column, a leftover note from an
  earlier enrichment pass, already flagged this exact discrepancy and recommended
  9,085 ft citing Wikipedia's Black Buttes article as the more precise figure — the
  correction was apparently written but never applied to `high_point_ft` or to either
  route's waypoints. Fixed both routes' `high_point_ft` and both summit waypoints to
  9085.

**Checked clean, no fix needed:**

- Little Big Chief Mountain: 7,225 ft and 47.5297,-121.2567 peak coordinate both
  confirmed exactly against Wikipedia/Peakbagger. The row's own `corrections` note
  already correctly flags Mountain Project's rival 7,213 ft as the outlier.
- Lichtenberg Mountain's true 5,844 ft summit (matching the route's own `pro_tips`
  claim) confirmed against Wikipedia/listsofjohn.com. The route's own `high_point_ft`
  of 5,800 ft is for a distinct, little-documented sub-summit ("the Lichtenhorn") with
  no independent source to check it against — left alone rather than guessed at.
- Liberty Crack's FA (Steve Marts, Fred Stanley, Don McPherson, July 16-18 1965) and
  its #24 spot on Roper & Steck's Fifty Classic Climbs of North America both confirmed
  against multiple sources (AAC Publications, Wikipedia, climbing.com).
- Liberty Crack (Free)'s FFA history (Sandahl's partial 1991 free lead, full free
  ascent by Herrington/Hadley in 2016 building on Schaefer/Lee's work on the crux and
  slab pitches) is broadly consistent with Blake Herrington's own trip report and AAC
  Publications — not contradicted by anything found.
- Lincoln Peak's X Couloir standard route: FA (Fred Beckey, Wesley Grande, John
  Rupley, Herb Staley, July 22 1956) and SW-Face/X-Couloir routing both confirmed. The
  route's own `corrections` field hedges toward an "east face" description that does
  NOT match reality (every source agrees this is a southwest-face route) — that
  leftover uncertainty note was correctly never applied to the row's actual fields, so
  nothing needed fixing.
- `wa_liberty_cap_ptarmigan_ridge_finish`'s waypoints (Liberty Cap at 14,097 ft per
  the Aug. 2025 GPS resurvey vs. `high_point_ft` 14,112 ft as the traditional
  official/map figure, Columbia Crest noted as historic-but-superseded) mirror the
  exact same legitimate two-figure distinction confirmed for a sibling Liberty
  Cap route in batch 137 — not an inconsistency. Its Mowich Lake / SR-165 Fairfax
  Bridge permanent closure text (April 2025, WSDOT, no detour) matches the same fact
  already documented elsewhere in this repo's own history.
- Ptarmigan Ridge FA (Wolf Bauer and Jack Hossack) confirmed to the summer of 1935;
  the stored exact date "September 8, 1935" could not be independently confirmed or
  contradicted (sources found only say "summer 1935" / gave a two-day ascent with no
  exact date) — left as stored since nothing found disputes it.

`npm run check:sql -- audits/sql/2026-08-20-batch-138.sql` passes: all 5 write targets
exist, no DELETE removes an only copy. It also warns the file (4.4KB) is over the
Supabase SQL Editor's ~4KB safe-paste size — split it into two pastes and verify each
lands before running the next.

Web access this run: WebSearch worked well throughout. WebFetch is still blocked by
the egress proxy for every reference domain tried (en.wikipedia.org), so all
confirmations above come from WebSearch's aggregated snippets across multiple
independent sites rather than a direct primary-source read — flagged here in case a
future run with working WebFetch wants to double-check the Wikipedia infobox figures
directly.

Next batch continues after `wa_little_big_chief_mountain_northeast_face` in the
id-ordered scope.

---

## 2026-08-21 — Pass 3, Batch 139

Ten routes across nine peaks (Little Mac Spire, Little Sister x2, Little Tahoma x2,
Liberty Bell, Lizard Mountain, Luahna Peak, Phantom Peak, Luna Peak): Southwest Route
(Little Mac Spire); North Face, West Face (Little Sister); Cowlitz/Ingraham Glaciers,
East Shoulder (Little Tahoma); Live Free or Die!™ (Liberty Bell); South Route
(Lizard Mountain); Southwest Slope - Southeast Ridge (Luahna Peak); Luna Glacier
(Phantom Peak); Southeast Slopes (Luna Peak).

**Confirmed error → fix in `sql/2026-08-21-batch-139.sql`:**
- `wa_live_free_or_die` (Liberty Bell East Face): `grade`/`rock_grade` stored as
  "5.12-" but both primary sources — Blake Herrington's own AAC Publications writeup
  of the 2017 FA and the Mountain Project route page — give 5.12+ ("mostly 5.10-5.11
  thin face climbing" with "a few short bouldery bits in the 5.12 range" at the
  crux). No source found gives 5.12-. `grade_num` (12) is unaffected by the
  qualifier and left alone.

**Flagged for human review (not auto-fixed):**
- `wa_little_mac_spire_southwest_route`'s `high_point_ft` (7,736 ft) disagrees with
  its own summit waypoint (7,680 ft — whose own note already admits "no
  independently surveyed summit coordinate found for this minor Southern Pickets
  spire") and with two external citations (AAC Publications' "Walking the Fence"
  Southern Picket enchainment article, stephabegg.com) that both give 7,992 ft for
  "Little Mac Spire." Not auto-fixed because those same two sources describe 7,992 ft
  as East McMillan Spire's elevation as well — this reads as an identity question
  (is "Little Mac Spire" a genuinely distinct, separately-surveyed summit in the
  Southern Pickets, or an informal name that the sources fold into East McMillan
  Spire?) rather than a simple wrong-number fix, and needs a human to settle which
  before any write touches this row's elevation.

**Clean (checked, nothing to fix):**
- Little Sister (Twin Sisters Range) 6,600 ft confirmed on both the North Face and
  West Face rows (SummitPost/Wikipedia consistent).
- Little Tahoma 11,138 ft confirmed on both routes. East Shoulder's FA (J.B. Flett
  and Henry H. Garrison, August 29, 1894, first recorded ascent via this line from
  Summerland) confirmed exactly.
- Luahna Peak 8,445 ft confirmed — Wikipedia states "the true summit is 8,445 feet"
  verbatim; listsofjohn.com's independent 8,450 ft is within normal survey variance,
  not a conflict.
- Luna Peak (Picket Range) 8,311 ft confirmed exactly (Wikipedia, PeakVisor). FA
  (Bill Cox and Will F. Thompson, early September 1938) confirmed exactly.
- Phantom Peak / Luna Glacier route: `high_point_ft` 8,016 ft is consistent with
  every source's "8,000+ ft" (nothing publishes a more precise figure to compare
  against). FA (Fred and Helmy Beckey, 1940, during their Picket Range excursions)
  confirmed.
- Lizard Mountain's stored 7,420 ft vs. a single source's 7,408 ft (2,258 m,
  PeakVisor) is a 12 ft difference with no second corroborating figure found — left
  alone as ordinary survey/LIDAR variance, not treated as a confirmed error.
- `wa_little_sister_west_face`'s FA (Darin Berdinka, June 21, 2013) could not be
  independently confirmed or contradicted (an obscure, recent FA of the kind usually
  only documented on Mountain Project, which — like every reference site tried this
  run — is blocked for direct fetch); left as stored since nothing found disputes it.

`npm run check:sql -- audits/sql/2026-08-21-batch-139.sql` passes: both write
targets exist on the live row, no DELETE involved.

Web access this run: same as every prior run — WebSearch worked throughout and was
the sole source of every confirmation above; WebFetch/curl are blocked by the
network egress policy for every reference domain tried this run (en.wikipedia.org,
www.mountainproject.com, listsofjohn.com, www.nps.gov, blakeclimbs.blogspot.com) —
all confirmations rest on WebSearch's aggregated snippets rather than a direct
primary-source read.

Next batch continues after `wa_luna_peak_southeast_slopes` in the id-ordered scope.

---

## 2026-08-21 — Pass 3, Batch 140

Six peaks, 10 routes (Lundin Peak 1, Magic Mountain 4, Martin Peak 1, Morning Star Peak 1,
McMillan Spire West 2, Mesahchie Peak 1): South Face Left (Lundin); North Face, Northeast
Couloir, South Ridge/Southeast Slopes, West Ridge (Magic Mountain); West Ridge (Martin
Peak); Marvin's Ear (Morning Star Peak/Vega Tower); Southwest Ridge, West Ridge/Southwest
Approach (McMillan Spire West); West Ridge/Southwest Gully (Mesahchie Peak).

No SQL fixes this batch — the one real finding needs a human rewrite decision across
several prose fields, not a value patch (see below).

**Flagged for human review (not auto-fixed):**
- `wa_marvin_s_ear`: the row's `face`, `overview`, `beta`, `approach`, `rope_note`, and
  waypoint/itinerary notes all describe the route as climbing **Vega Tower** itself ("climbs
  the skyline ridge of Vega Tower... the first technical route up Vega Tower's west ridge
  proper... only one other technical line (Starshot Ridge) existed on Vega Tower"). The
  primary source — Morgan Zentler's own AAC Publications first-ascent writeup, quoted
  directly — says the opposite: "This route is located on the tower to the climbers right
  of Vega Tower." So per the FA climber's own account, Marvin's Ear is on a *different,
  unnamed* tower next to Vega Tower, not on Vega Tower proper. This isn't a single wrong
  value — the Vega Tower identity is woven through six fields including a specific claim
  about *Vega Tower's* own route history (Starshot Ridge being its only prior technical
  line) that would be misattributed if left as-is. Same shape as the wa_cascade_peak_east_
  ridge / wa_boston_peak_southwest_face cases from earlier passes: needs a human to decide
  how to rewrite the prose (the correct tower has no name in any source found), not a
  mechanical field patch. FA date/party/grade (Sept 16, 2017, Morgan & Sheila Zentler, III
  5.10b, 800 ft) all confirmed correct against the same AAC source and left alone.

**Clean (checked, nothing to fix):**
- Lundin Peak 6,057 ft confirmed (Wikipedia/PeakVisor). The route's own hazard note citing
  a documented fatal fall on descent (AAC, 1980) confirmed exactly against AAC Publications'
  "Fall on Rock, Climbing Unroped — Washington, Lundin Peak": Jerry Pruitt, Oct 11, 1980,
  ~600 ft fall near the false summit on a Mountaineers club climb.
- Magic Mountain 7,610 ft confirmed (Wikipedia) across all 4 routes on this peak (North
  Face, Northeast Couloir, South Ridge, West Ridge all share the summit elevation
  correctly). South Ridge's FA (Bressler, Ray Clough, Cox, Myers, July 1938) confirmed
  against Wikipedia/the Ptarmigan Traverse's own history — one source spells the second
  name "Ralph Clough," another (describing the same 1938 Ptarmigan Traverse first crossing)
  spells it "Ray W. Clough" matching this row; not treated as an error since sources
  themselves disagree on the spelling.
- Martin Peak 8,509 ft confirmed (Wikipedia). FA (Everett Darr and Ida Zacher, July 1936)
  confirmed — Wikipedia independently gives "Ida Zacher Darr, July 1936" (her later married
  name) for the same date.
- McMillan Spire West 8,004 ft confirmed on both routes (Wikipedia/countryhighpoints.com);
  the row's own pre-existing `corrections` note already discloses the 8,000/8,004/8,041 ft
  spread across sources and keeps 8,004, which this run agrees is the best-supported figure.
  FA (Fred and Helmy Beckey) confirmed to 1940 on both routes; the specific date (Aug 29)
  could not be independently confirmed or contradicted.
- Mesahchie Peak 8,795 ft confirmed (Wikipedia/PeakVisor). Row's own "first climbed in
  1966" confirmed exactly (Wikipedia).

**Observation, not flagged (no external source to check it against):** `wa_martin_peak_
west_ridge` stores `grade_num: 2` for a `rock_grade` of "Class 3-4" — every other WA route
sharing that identical rock_grade string in the DB stores `grade_num` 3 or 4 (checked: 10
other rows). `grade_num` is a value the app's own pipeline derives from the grade string,
not a fact sourced from a guidebook or land manager, so per this audit's scope it isn't
something to "fix" against an authoritative source — noting it here in case it's worth a
pipeline/parser look (see CLAUDE.md's `check:grade-parser`), not proposing a row-level SQL
change for it.

Web access this run: same pattern as recent runs — WebSearch worked throughout; direct
WebFetch/curl to reference domains (en.wikipedia.org, publications.americanalpineclub.org,
mountainproject.com) remains blocked by network egress policy, so confirmations rest on
WebSearch's aggregated snippets. One WebSearch summary for Marvin's Ear initially reported
a conflicting FA date ("Fourth of July weekend"); a follow-up, more targeted query against
the same AAC article corrected this to "September 16," matching the row — noted here since
it's a reminder that a single WebSearch summary can misreport even when its own source is
right, and is why the AAC quote was re-fetched a second, more specific way before treating
the Vega Tower finding as solid.

Next batch continues after `wa_mesahchie_peak_west_ridge` in the id-ordered scope.

## Batch 141 (pass 3), 2026-08-21

Scope: `wa_mix_up_peak_east_face`, `wa_mojo_rising`, `wa_mount_adams_adams_glacier`,
`wa_mount_adams_lava_glacier_headwall`, `wa_mount_adams_lyman_glacier`,
`wa_mount_adams_mazama_glacier_headwall`, `wa_mount_adams_north_ridge`,
`wa_mount_adams_northwest_ridge`, `wa_mount_adams_south_climb`,
`wa_mount_adams_wilson_glacier_headwall`. First batch to leave the North Cascades scope
and pick up Mount Adams (10 of its 10 routes fall in this batch's alphabetical window plus
two stragglers from the Cascade Pass / Washington Pass area).

**4 confirmed errors, fixed** (`audits/sql/2026-08-21-batch-141.sql`):
- Lava Glacier Headwall and Lyman Glacier both stored an identical boilerplate `descent`
  field ("retracing the ascent when possible") that contradicts each row's own, more
  detailed `descent_text`, which correctly describes a North Ridge walk-off — never a
  reversal of the technical icefall/headwall itself, which is not something parties
  downclimb. Corrected both to match their own `descent_text`.
- Wilson Glacier Headwall's `season` field ('Jul-Sep') directly contradicted its own
  `best_season` ('May to June') and its own `hazards` text warning that rockfall increases
  sharply as the headwall warms and that early-season, cold conditions are essential —
  i.e. the header-strap season window was pointing climbers at exactly the warm-season
  conditions the row's own hazard advice warns against. Corrected to 'May-Jun', matching
  the sibling Adams Glacier / Lava Glacier Headwall routes' early-season windows.
- Mazama Glacier Headwall's `permit` field carried only the generic Gifford Pinchot NF
  "Mt. Adams Climbing Pass" text (copied verbatim onto every other Mount Adams route this
  batch), despite this route's own `approach` field starting from Bird Creek Road on the
  Yakama Reservation side and its own `watch_out` field separately flagging a Yakama Nation
  Tract-D tribal-use permit requirement. The `permit` field itself — the one a climber
  would check for definitive access rules — named a Forest Service pass that does not
  govern that tribal land. Confirmed via web search (Yakama Nation Tract D / Bird Creek
  Meadows day-use permit, purchased at the Mirror Lake gate, area open to non-tribal-member
  visitors only part of the year) and corrected to state the correct permit regime, without
  hardcoding an exact fee or seasonal open date (transient facts; see CLAUDE.md's standing
  warning against writing those into a permanent field).

**Confirmed correct, no fix needed:** Mix-up Peak East Face's FA (Wesley Grande & Jack
Kendrick, 1947) and elevation (7,440 ft) — both matched independently by Wikipedia/peakery.
Mojo Rising's FA (Mark Allen, Joel Kauffman, Tom Smith, Oct 13-14 2006) matched exactly
against a CascadeClimbers.com trip report and Mountain Project. South Early Winters
Spire's elevation (7,807 ft) and FA (Kenneth Adam, Raffi Bedayn, W. Kenneth Davis, July 20
1937) both matched Wikipedia. Adams Glacier's FA (Fred Beckey, Dave Lind, Robert Mulhall,
July 1945) matched an AAC Publications excerpt (via search snippet) almost verbatim,
including the approach/icefall detail. Mount Adams's 1854 first-ascent credit (A.G. Aiken,
Edward J. Allen, Andrew J. Burge) matched one of two variant historical rosters that
sources disagree on (the other gives Glenn Aiken/Allen/Col. B.F. Shaw) — the row already
hedges this appropriately ("believed to have followed this ridge/cleaver"), so left as is.
Mount Adams's summit elevation (12,276 ft) and coordinates, Mix-up Peak's coordinates, and
the general Cascade Volcano Pass permit terms (above 7,000 ft, May 1-Sep 30, per-trip on
Recreation.gov) all confirmed against USFS-derived search results. Lava Glacier Headwall's
FA (Edward Cooper and Mike Swayne, July 3, 1961) and the Northwest Ridge's FA (Molenaar,
Johnson, Ostro, Startzell, September 1960) could not be independently confirmed or
contradicted — AAC Publications and Mazamas, the two sources most likely to carry them,
are both blocked by network egress policy this run (see below); left unflagged per this
audit's rule not to guess.

**Flagged for human review, not auto-fixed:** the Mount Adams glacier/headwall routes'
`dist_km` values (Adams Glacier 28.16, Lava Glacier Headwall 26.55, Lyman Glacier 37.3,
Wilson Glacier Headwall 27.04 — all one-way per the app's convention) look implausibly long
against the ~4-mile Killen-Creek-trailhead-to-High-Camp approach documented in these same
rows' own `approach` text (confirmed via search: Killen Creek Trail + High Camp Trail is
~4.1 mi to High Camp at 6,900 ft). By contrast, `wa_mount_adams_north_ridge` stores
`dist_km: 5.6` (3.5 mi one-way), which looks too *short* given that same ~4-mile approach
plus the additional distance to the summit. This has the shape of the `dist_km`
one-way-vs-round-trip convention split CLAUDE.md already documents for this column
(`audit:distances`) rather than a one-off typo, and this audit has no authoritative
one-way-mileage figure to pin an exact correct value against for any of the five rows — so
none were changed. Worth a look with `npm run audit:distances -- --state wa` or by hand.

Web access this run: WebSearch worked throughout and was the sole source for every
confirmation above. Direct WebFetch to reference domains (en.wikipedia.org,
publications.americanalpineclub.org, mazamas.org, www.nps.gov) was blocked by network
egress policy on every attempt this run — consistent with prior batches' notes on this.

Next batch continues after `wa_mount_adams_wilson_glacier_headwall` in the id-ordered scope.

## Batch 142 — 2026-08-26 (pass 3)

Routes: `wa_mount_anderson_eel_glacier` (Mount Anderson, Olympics);
`wa_mount_baker_boulder_glacier`, `wa_mount_baker_boulder_park_cleaver`,
`wa_mount_baker_cockscomb_ridge`, `wa_mount_baker_coleman_deming`,
`wa_mount_baker_coleman_headwall`, `wa_mount_baker_easton_glacier`,
`wa_mount_baker_north_ridge` (Mount Baker).

**Confirmed error, fixed:** four Mount Baker routes sharing the Glacier Creek Road (FR
39)/Heliotrope Ridge Trailhead each stored a *different* characterization of the December
2025 flood washout — two said repair work ran "through the end of October 2026," one said
repairs would begin "after July 15, 2026, targeting reopening by late September 2026," and
one said the Forest Service "has not announced a repair timeline." Sibling routes on one
trailhead disagreeing about whether the road is open is the `audit:trailhead-road` shape.
Checked against live sources: the Mt. Baker-Snoqualmie NF's own press release ("Forest
Service Has Opened Glacier Creek Road") and Cascadia Daily News ("Glacier Creek Road
reopens following washout repairs," Aug 20 2026) both confirm the road fully reopened to
vehicles on August 20, 2026 — before any of the four projected dates. All four `road`
values reconciled to the same current status in `audits/sql/2026-08-26-batch-142.sql`.

**Confirmed correct, no fix needed:** Mount Anderson's `high_point_ft` (7330, East Peak)
and the West Peak true-high-point figure (7,365 ft) both matched Wikipedia's Mount
Anderson (Washington) page; the row's own `data_quality.gaps` already discloses the
elevation-varies-by-source uncertainty honestly, so nothing to change there. Cockscomb
Ridge's FA (Chuck Murley, John Musser, E. Vielbig, July 4 1961) was corroborated by an AAC
Publications article on the route whose author appears to be the third named climber.
Boulder Glacier's FA text already self-disqualifies ("specific individuals not confirmed
in available sources") rather than asserting a fabricated roster — correctly hedged on
file, no fix needed.

**Not independently confirmed or contradicted, left unflagged/unfixed per this audit's
rule against guessing:** Coleman Headwall's FA (Ed Cooper, Phil Bartow, Donald Grimlund,
David Nicholson, August 1957) — no corroborating or contradicting source turned up this
run. Mount Anderson's 1920 FA (Fairman B. Lee + 13-person party) was not re-checked this
pass.

Web access this run: WebSearch worked throughout, including for the road-status finding.
Direct WebFetch to reference domains (cascadiadaily.com, fs.usda.gov) was blocked by
network egress policy, consistent with prior batches' notes on this.

Next batch continues after `wa_mount_baker_north_ridge` in the id-ordered scope.

## Batch 143 — 2026-08-26 (pass 3)

Routes: `wa_mount_baker_park_glacier_headwall`, `wa_mount_baker_squak_glacier` (Mount
Baker); `wa_mount_blum_north_ridge` (Mount Blum); `wa_mount_buckindy_scramble` (Mount
Buckindy); `wa_mount_carrie_standard` (Mount Carrie); `wa_mount_challenger_challenger_glacier`
(Mount Challenger); `wa_mount_christie_west` (Mount Christie); `wa_mount_constance_finger_traverse`,
`wa_mount_constance_north_chimney`, `wa_mount_constance_north_chute` (Mount Constance).

**No confirmed errors this batch — a clean batch on hard facts.**

**Confirmed correct, no fix needed:** peak elevations and summit coordinates for Baker,
Buckindy, Carrie, Challenger, Christie and Constance all matched Wikipedia/USGS-derived
figures closely (Buckindy 48.351145,-121.206615 vs Wikipedia 48.3515,-121.2061; Carrie
47.894273,-123.649285 vs 47.894242,-123.649295; Christie 47.698005,-123.545585 vs
47.698021,-123.545417; Constance 7,756 ft vs Wikipedia's 7,756 ft). First ascents for
Mount Challenger's Glacier route (Dickert/Hossack/MacGowan, Sept 7 1936), Mount Constance
(Schellin & Smith, 1922 — row already hedges the exact chimney sequence as undocumented),
Mount Buckindy (Grimlund/Nicholson/Trueblood, Aug 28 1955) and Mount Blum's North Ridge
(Hutchinson/Leatherman/Weigelt, Sept 16 1972 — matched an AAC Publications route report
almost verbatim) all confirmed.

**Road/closure claims checked for currency, all accurate:** Mount Blum's North and South
Ridge routes both cite the Baker Lake Road (FR-11) closure at Shannon Creek Bridge for
bridge-deck repair, July 15-Aug 31 2026 — confirmed via a Mt. Baker-Snoqualmie NF alert and
a Pacific NW Trail post, and (as of this run, Aug 26) still inside its stated window rather
than stale. Dosewallips Road, cited by all three Mount Constance routes with slightly
different phrasing, is confirmed still closed to vehicles since the January 2002 washout
with no scheduled repair — the phrasing differences are not a contradiction (audit:trailhead-
road's "sibling routes disagreeing about whether a road is open" shape does NOT apply here;
all three agree on the substance).

**Worth noting, not a defect:** `wa_mount_buckindy_scramble` is a real two-approach route
(Green Mountain Trailhead via Suiattle River Rd/FR-26 to the south, or Kindy Creek Rd/FR-1570
off Cascade River Rd to the north — both genuine per Mazamas/trip-report sources), and its
`road`, `approach`, `approach_logistics` and `descent_text` fields already document both
correctly, including that FR-26 is currently closed at MP 4 under USFS closure order
#06-05-26-01 (Apr 2 2026-Jan 1 2028) after a 75-ft-deep washout — confirmed exactly via the
MBS NF alert page. This is the CLAUDE.md "peak with two genuine approaches" case (cf. Lundin
Peak) handled correctly on the row already, not a `road`-vs-`approach` mismatch to fix.

**Not independently confirmed or contradicted, left unflagged per this audit's rule against
guessing:** Mount Baker's Coleman Headwall commitment-grade comparison note on Park Glacier
Headwall (unchanged, pre-existing hedge); Hannegan Pass Road's (Mount Challenger) "recent
storm damage" note is vague and hedged with "check current alerts" rather than asserting an
active closure, and current USFS info shows no active 2026 closure notice, so nothing to
change there either way.

Web access this run: WebSearch worked throughout. Direct WebFetch to reference domains
(fs.usda.gov) was blocked by network egress policy, consistent with prior batches' notes.

Next batch continues after `wa_mount_constance_north_chute` in the id-ordered scope.

## Batch 144 — 2026-08-26 (pass 3)

Routes: `wa_mount_constance_terrible_traverse`, `wa_mount_constance_west_arete` (Mount
Constance); `wa_mount_crowder_northeast_ridge`, `wa_mount_crowder_southwest_route` (Mount
Crowder); `wa_mount_cruiser_nw_face_corner`, `wa_mount_cruiser_south_corner` (Mount Cruiser);
`wa_mount_custer_standard` (Mount Custer); `wa_mount_daniel_daniel_glacier` (Mount Daniel).

**Process note before the findings: this exact 8-route batch was already audited in pass 2**
(Batch 80, 2026-08-08, five parallel research agents) — SQL was drafted
(`audits/sql/2026-08-08-batch-80.sql`) but has evidently never been applied to the live
database. A direct read of all 8 rows today shows every one of batch 80's fixes still
outstanding except one (Cruiser South Corner's `road.status`, which is now correct — either
applied by hand or a partial/earlier pass; its sibling route and everything else was not).
Rather than skip re-verifying since "it was already found," each item below was independently
re-confirmed against a fresh source today (18 days on, facts can go stale either direction),
and a new SQL file was written reflecting the current live state rather than assuming batch
80's file is still accurate to paste as-is.

**Confirmed errors, fixed (SQL in `audits/sql/2026-08-26-batch-144.sql`):**
- `wa_mount_constance_west_arete`: `gear` array called the rock "granite," contradicting this
  same row's own `descent_text` ("pillow-basalt rock"). Re-confirmed via WA DNR and NPS
  geology pages: Mount Constance is Eocene pillow basalt, Crescent Formation — not granite.
- `wa_mount_crowder` (area) + both routes' `approach_logistics.peakLat/peakLng`: summit
  coordinate (48.7976266, -121.352631) is a ~50 m outlier. Re-confirmed via Wikipedia
  (48.7977°N 121.3519°W), matching the Northeast Ridge route's own summit waypoint
  (48.79778/-121.35194) — a second coordinate source was mixed into the area row and both
  routes' logistics blocks.
- `wa_mount_cruiser_nw_face_corner`: `road.status` still says "Closed as of 2026 due to the
  Bear Gulch Fire closure order," directly contradicting sibling route South Corner (same
  trailhead, same road), whose `road.status` correctly says the road reopened. Re-confirmed
  via WebSearch against fs.usda.gov/r06/olympic (Bear Gulch Fire page): FR-24 and the
  Staircase entrance reopened July 8, 2026 and remain open as of this audit (Aug 26) — only
  FS-2451/Copper Creek Trail, not used by this route, stay closed.
- `wa_mount_cruiser_nw_face_corner`: `access.closures` separately claims the same road/
  entrance closed "through at least Oct 1, 2026" — same stale claim, same fix. Flapjack
  Lakes Trail/Gladys Divide (this route's actual approach) is left marked closed — WebSearch
  today (AllTrails/WTA) still shows the Gladys Divide Primitive Trail closed for burn-scar
  recovery with no reopening date, so that part of the existing text is still accurate.
- `wa_mount_daniel` (area) `prominence_ft` (3508): re-confirmed via WebSearch — sources
  consistently give 3,480 ft.
- `wa_mount_daniel_daniel_glacier` `max_angle` (56): re-confirmed against The Mountaineers'
  own route page (mountaineers.org/activities/routes-places/mount-daniel-daniel-glacier),
  "Grade II with 35 degrees snow and/or ice" — this row's own `beta` text matches that page's
  description almost verbatim.

**Still flagged, not fixed (no new source found, unchanged from batch 80):** Mount Crowder
Southwest Route's `fa` field and its own `corrections` field still directly contradict each
other on whether the 1962 FA party climbed this line or the NE Ridge. Both Cruiser routes'
`permit` field still claims a Northwest Forest Pass is required, contradicting each row's own
`access.passRequired` ("no Northwest Forest Pass needed... inside the National Park
boundary") — not confirmed enough to pick a side. Mount Cruiser NW Face/Corner's existence/
grade/FA (Wayne Wallace & David Parker, 2004) still not independently corroborated beyond a
low-confidence search snippet.

**Confirmed correct, no fix needed:** Mount Custer Standard's elevation (8,630 ft),
prominence (1,230 ft — note the row's own `data_quality.gaps` cites a different, unconfirmed
1,314 ft figure, unchanged, text-only), FA (Dawe/Mason/Teichman, 1958), and Depot Creek
approach all re-corroborated. Mount Crowder's 1962 FA party (Magnusson/Ardussi/Mech/
Schmechel) confirmed. Mount Cruiser South Corner's road status (see above) and Olympic NP
permit/fee structure confirmed.

Web access this run: WebSearch worked throughout. Direct WebFetch to reference domains
(fs.usda.gov) was blocked by network egress policy, consistent with prior batches' notes.

Next batch continues after `wa_mount_daniel_daniel_glacier` in the id-ordered scope.

## Batch 145 — 2026-08-26 (pass 3)

Routes: `wa_mount_daniel_lynch_glacier` (Mount Daniel); `wa_mount_deception_standard` (Mount
Deception); `wa_mount_degenhardt_southwest_route` (Mount Degenhardt); `wa_mount_despair_east_route`
(Mount Despair); `wa_mount_fairchild_standard` (Mount Fairchild); `wa_mount_formidable_south_face`
(Mount Formidable); `wa_mount_fury_east_mongo_ridge`, `wa_mount_fury_west_west_ridge` (Mount Fury
West Peak); `wa_mount_fury_east_southeast_glaciers` (Mount Fury East Peak); `wa_mount_goode_northeast_buttress`
(Mount Goode).

**Confirmed errors, fixed (SQL in `audits/sql/2026-08-26-batch-145.sql`):**
- `wa_mount_fury_east_southeast_glaciers`: `waypoints[2]` ("Big Beaver Landing") stored
  lat/lng (48.819748, -121.279546) that put it ~11 miles up-valley, essentially on top of
  the very next waypoint (Luna Camp) — contradicting this same waypoint's own note ("roughly
  4.6 mi up-lake from Ross Dam, at Ross Lake's full-pool elevation") and its own `distMi`
  (5.9, vs Luna Camp's 17.4). Re-confirmed via WebSearch (Mountaineers.org "Ross Dam & Big
  Beaver Creek", Ross Lake Resort water-taxi FAQ): Big Beaver Landing is the water-taxi drop
  at the mouth of Big Beaver Creek on Ross Lake, ~6 trail miles from Ross Dam — matching the
  elevation already on file (1,602 ft, Ross Lake's own full-pool elevation) and matching the
  sibling `wa_mount_fury_west_west_ridge` route's own, independently-recorded coordinate for
  the identical landing (48.77563, -121.0658). Three-way corroboration: the row's own prose,
  an external source, and a sibling route's independent record all agree on the same point,
  none of which is the stored coordinate.
- `wa_mount_fury_east_mongo_ridge`: `fa` field hedged "month uncertain: July or August" for
  Wayne Wallace's solo FA, contradicting this same row's own `beta` field ("first ascended
  August 24-27, 2006"). Re-confirmed via three independent sources — AAC Publications ("Mt.
  Fury, West Peak, Mongo Ridge"), a Cascade Climbers trip report titled "Mongo Ridge-W.Fury
  F.A.- VI-5.10- 8/28/2006", and Alpinist's climbing note — all agreeing on August 24-28,
  2006 (started 4am Aug 24, topped out and walked out by the 28th). No source gives a July
  date. Also independently confirms this route's `area_id` (`wa_mount_fury_west`) is correct
  — every source describes Mongo Ridge as the southwest buttress of Mount Fury's *West* Peak,
  despite the route id itself saying "east" (an id-naming quirk, not a data error worth
  touching — renaming a route's primary key is outside this audit's remit and risks breaking
  FK references in `activity`/`contributions`).

**Confirmed correct, no fix needed:** Mount Despair's FA (Beckey, Anderson, Kelley, July 2,
1939 — WTA corroborates both the party and the older 7,292 ft figure already noted in this
row's own `data_quality.gaps`); Mount Fairchild's FA (Pruitt/Baker/Christiansen/Etten, 1963);
Mount Fury West Peak's FA (Watson/Sharpe/Spickard/Josendal/Muzzy, mid-August 1958); Mount
Formidable's FA (Bressler/Clough/Cox/Myers, July 25 1938, inaugural Ptarmigan Traverse); Mount
Goode NE Buttress's first winter ascent (Pilling/Mascioli, March 3-5 1984, AAC Publications
account matches almost verbatim). Mount Deception's elevation (7,788 ft) confirmed against
listsofjohn.com/Wikipedia; the 2 ft difference against this route's own summit waypoint
(7,786 ft) is de minimis survey/rounding noise, not flagged. Mount Fury West Peak's
elevation (8,303 ft, area row) sits inside the ±10 ft margin of the Gilbertson 2022
theodolite survey (~8,305 ft) already cited in this row's own `corrections` field.

**Flagged, not fixed:** `wa_mount_degenhardt_southwest_route`'s `fa` field is a bare "1931"
with no party named. Wikipedia and Peakvisor both credit William Degenhardt and Herbert
Strandberg — but a second search turned up a source giving 1932 for the same two climbers,
so the sources disagree on the year itself. Per audit rules, not fixed; needs human
verification before either the year or the party names are written in.

**Not independently re-verified this pass** (already self-flagged in each row's own
`data_quality.gaps`, no new corroborating or contradicting source found): Mount Degenhardt's
prominence figure choice (already resolved to 280 ft in a prior pass, consistent across
sources); Mount Formidable's route-variant attribution (South Face vs. Southeast Ledges) to
the 1938 FA party; Mount Fury West Peak's FA specifically for the *West* summit (as opposed
to the peak generally) and its connecting-ridge descent rappel count.

Web access this run: WebSearch worked throughout; WebFetch to en.wikipedia.org and
alpenglow.org was blocked by network egress policy, consistent with prior batches.

Next batch continues after `wa_mount_goode_northeast_buttress` in the id-ordered scope.

## Batch 146 — 2026-08-26

Routes: `wa_mount_hardy_snow_scramble`, `wa_mount_hinman_hinman_glacier`,
`wa_mount_howard_south_slope`, `wa_mount_index_north_peak_traverse`,
`wa_mount_index_northeast_buttress`, `wa_mount_johnson_standard`,
`wa_mount_lago_south_slope_south_face`, `wa_mount_larrabee_south_ridge`,
`wa_mount_logan_fremont_glacier`, `wa_mount_logan_r1`.

**Fixed:** `wa_mount_logan_r1` (Banded Glacier) — `approach` described only the Thunder
Creek/Fisher Creek Trail as though it were the route's approach, with no mention of Easy
Pass. But this row's own `beta`, `road`, and `access` fields all agree that Easy Pass
(SR-20 near milepost 151, ~10 mi one-way to the lake camp) is the *standard*, shorter
approach, and that Thunder Creek (~13 mi one-way, from Colonial Creek Campground) is
explicitly "a longer, always-open alternate ... useful when Easy Pass Trailhead is gated."
`descent_text` also defaults to exiting back out over Easy Pass. Rewrote `approach` to lead
with Easy Pass and note Thunder Creek as the alternate, re-homing facts already present in
the row rather than inventing anything.

**Flagged, not fixed — needs human verification:**
- `wa_mount_logan_r1`'s `gain_ft`/`loss_ft` (7027/13000) don't reconcile with each other, or
  with the row's own waypoint `distMi` for the summit (14.51 mi = 23.3 km, against a
  `dist_km` of 19.3 km = 12 mi), under either an out-and-back or a point-to-point reading of
  the route. No confident replacement numbers could be derived from the row itself.
- Area `wa_north_peak_2` (Mount Index North Peak, the target of
  `wa_mount_index_northeast_buttress` and of the traverse in
  `wa_mount_index_north_peak_traverse`) carries a coordinate (47.77453, -121.58093)
  essentially identical to sibling area `wa_main_peak_2`'s (47.77453, -121.58094) — under 2 m
  apart. North Peak (5,357 ft) and Main Peak (5,991 ft) are distinct summits of the Index
  massif roughly separated along a north-south ridge, so this looks like a copied/duplicate
  coordinate rather than North Peak's real location. Could not obtain an independent
  coordinate for North Peak specifically to propose a fix — WebFetch to Wikipedia, Peakbagger,
  SummitPost, and listsofjohn were all blocked by this environment's network egress policy,
  and WebSearch's synthesized snippets didn't surface an exact coordinate for the North Peak
  alone (only Main Peak's, which matched `wa_main_peak_2` closely: 47°46'28"N 121°34'51"W).

**Confirmed correct via external sources, left unchanged:** Mount Hardy elevation (8,099 ft)
and FA (Sidney Schmerling & Hermann Ulrichs, 1933); Mount Hinman elevation (7,492 ft), FA
(1928, named 1934 for Dr. Harry B. Hinman), and the Hinman Glacier "declared dead in 2022"
claim (KUOW/Boise State Public Radio, Jan 2023 reporting on a 2022 finding); Mount Howard
elevation (7,063 ft); Mount Lago elevation (8,745 ft) and FA (Hermann Ulrichs & Dick Alt,
1933); Mount Larrabee elevation (7,865 ft) and FA (James J. McArthur survey party, Sept 11
1908); Mount Logan elevation (9,087 ft) and FA (Lage Wernstedt, 1926, solo). Mount Johnson's
elevation (7,680 ft) confirmed; its `fa` field's "revised attribution" hedge (Osborn/
Halwax/King c.1935 vs. the long-credited Johnson/Martin 1940) was left as-is — already an
honest hedge, not contradicted by anything found. `wa_mount_index_northeast_buttress`'s FA
("July 1929, Lionel Chute & Victor Kaartinen, disputed/uncertain") matches an NWMJ history
piece noting Chute himself gave conflicting dates for the ascent (July 4 1929 vs. later
July 5 1930) — the row's existing hedge is accurate, left unchanged. Mount Logan Fremont
Glacier's `overview` says the route climbs the glacier's "southwest side"; search results on
which flank Fremont Glacier actually sits were internally contradictory (one summary said
southwest, another said southeast) and are most likely conflating the Fremont/Douglas glacier
articles — too unreliable to act on either way, left unchanged.

Ran `audit-waypoints.mjs`, `audit-alpine-gain.mjs`, and `audit-route-identity.mjs` against
the live WA catalog (2,525 areas / 8,369 routes) as a cross-check; none of this batch's 10
routes appeared in any of their findings.

Web access this run: WebSearch worked throughout. WebFetch/curl to en.wikipedia.org,
peakbagger.com, summitpost.org, listsofjohn.com, mountaineers.org, and
nominatim.openstreetmap.org were all blocked by the network egress proxy (403 at the CONNECT
tunnel) — consistent with prior batches' experience with Wikipedia/alpenglow.org.

Next batch continues after `wa_mount_logan_r1` in the id-ordered scope.

## 2026-08-26 — Pass 3, Batch 147

Ten routes across seven peaks: `wa_mount_logan_r2` (Douglas Glacier), `wa_mount_mathias_scramble`
(Bailey Range Scramble), `wa_mount_maude_r1` (North Face), `wa_mount_maude_r2` (Entiat Ice
Fall), `wa_mount_mystery_standard` (Standard Scramble), `wa_mount_olympus_blue_glacier` (Blue
Glacier), `wa_mount_olympus_west_ridge` (West Ridge), `wa_mount_persis_the_hexorcist` (The
Hexorcist), `wa_mount_persis_west_ridge` (West Ridge), `wa_mount_pilchuck_east_ridge` (East
Ridge / Iodine Gulch-Bathtub Lakes).

**Fixed:** `wa_mount_mathias_scramble`'s first waypoint contradicted itself: its own note said
"start of the Sol Duc/High Divide approach into the Bailey Range" but its stored coordinates
were the real Hoh River Trailhead's — identical to the coordinate this same batch's two Mount
Olympus routes correctly use for that trailhead, at 578 ft. The waypoint's own stated elevation
(1950 ft) never matched Hoh at all; it closely matches the real Sol Duc Falls Trailhead
(~1,882-1,950 ft, ~47.955249,-123.835839 per NPS/trip-report sources), which is the documented
start of the Bailey Range Traverse this same waypoint's note describes and which the row's
remaining six waypoints (High Divide, Eleven Bull Basin, Ferry Basin, Blizzard Pass, Camp Pan)
trace in full. The row's own `gain_ft` (6130) only reconciles with the waypoint elevation
profile if this first point sits at ~1950 ft, corroborating the elevation and pointing at the
name/coordinates as the error. Corrected the name and coordinates to the Sol Duc Falls
Trailhead the note already claimed to be; left elevation, note, type, and distMi untouched.

**Flagged, not fixed — needs human verification:**
- `wa_mount_mathias_scramble`'s `approach`/`beta`/`approach_logistics` describe an entirely
  different corridor to the summit (Hoh River Trail → Blue Glacier → Snow Dome → Hoh Glacier,
  with no mention of Sol Duc/High Divide/Eleven Bull Basin/Ferry Basin/Blizzard Pass/Camp Pan)
  than the `waypoints` array traces. Both are real, documented ways to reach Mount Mathias — a
  direct approach via the Hoh Glacier, and the full Bailey Range Traverse from Sol Duc — but
  this one row currently presents them as a single undifferentiated route. Deciding whether to
  split these into two routes, pick one as canonical, or document both is an editorial call
  outside what a database correction can settle.
- `wa_mount_maude_r1` (North Face): `dist_km` (6.4 km = 3.98 mi one-way) is roughly half the
  distance its own `waypoints` array implies (summit waypoint `distMi: 8`, i.e. ~12.9 km). This
  is an unmaintained, off-trail alpine approach with no authoritative one-way mileage source
  found to adjudicate which figure (if either) is right, so left unchanged rather than guessed.
  Note `wa_mount_maude_r2` shares the identical `dist_km`/`gain_ft`/`high_point_ft` with r1,
  suggesting these may be peak-level defaults rather than per-route measurements.
- `wa_mount_olympus_west_ridge`'s FA ("1964, Gary Maykut, Len Miller, and Joe Witte") could not
  be independently corroborated — WebSearch found only the general 1907 Mount Olympus FA and no
  route-specific 1964 record, and WebFetch to SummitPost/Mountaineers/AAJ was blocked by this
  environment's network egress policy. Not contradicted by anything found, so left unchanged.

**Confirmed correct via external sources, left unchanged:** Mount Maude North Face FA (Fred
Beckey, Don Gordon, John Rupley, Herb Staley, June 16 1957 — AAC Publications); Mount Olympus
West Peak FA ("Lorenz A. Nelson party (The Mountaineers), Aug 13, 1907" — matches "L.A. Nelson"
led party per multiple sources, Belmore Browne's separate Middle Peak ascent days earlier is a
different peak/party and not in conflict); Mount Mathias FA (Yves Eriksson and Jim Hawkins,
1957, west face — Wikipedia/PeakVisor); Mount Persis FA for the West Ridge (first recorded
ascent 1917, Harry B. Hinman — matches Wikipedia/Mountaineers, consistent with Hinman's
documented Everett-Mountaineers-era first ascents elsewhere in this state); Mount Mystery's
hazards-field fatality note (Sean Allen, 38, of Port Angeles, died descending near the south
end/Del Monte ridgeline in July 2022 after an apparent ~40 ft fall, per NPS/Columbian/KOMO/
Outside — the row's own hedge on cause, "conditions were a factor," matches reporting that the
fall was attributed to poor visibility) — left unchanged as accurate. Mount Mystery elevation
(7,639 ft) and Mount Persis elevation (5,464 ft) also independently reconfirmed.

Ran `audit-waypoints.mjs`, `audit-alpine-gain.mjs`, and `audit-route-identity.mjs` against the
live WA catalog as a cross-check; none of this batch's 10 routes appeared in any of their
findings — expected for the Mathias waypoint defect, since it's a naming/identity
self-contradiction rather than a geometric off-track or gain-arithmetic problem, and this route
has no gpx track for the geometric checks to measure against.

Web access this run: WebSearch worked throughout. WebFetch to summitpost.org was blocked by the
network egress proxy (403 at the CONNECT tunnel), consistent with prior batches.

Next batch continues after `wa_mount_pilchuck_east_ridge` in the id-ordered scope.
