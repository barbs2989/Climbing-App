# WA Alpine/Mountaineering Audit Log

Recurring fact-audit of Washington alpine/mountaineering routes in the live Supabase DB.
Scope: `routes.discipline in ('alpine','mountaineering')`, WA (`id like 'wa_%'`), restricted to
routes whose parent `areas.area_type = 'peak'` (excludes crags/walls mislabeled with an
alpine/mountaineering discipline — see notes below). At audit start there were 422 routes in
scope out of 557 total WA rows tagged alpine/mountaineering.

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

Next batch will continue alphabetically from `wa_dragontail_peak_r2` (see progress file).
