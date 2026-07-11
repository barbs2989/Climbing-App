# WA Alpine Accuracy Audit — Flagged Issues for Manual Review

**Date:** 2026-07-10  
**Status:** 50+ single-source suspicions and data integrity issues identified across 132 peaks  
**Action Required:** Human verification and correction for each item below

---

## CRITICAL PRIORITY — Data Integrity / Safety Issues

### 1. Mount Dana — CRITICAL: Incompatible Approaches
- **Peak:** wa_mount_dana
- **Route:** wa_mount_dana_scramble
- **Issue:** Waypoints and itinerary describe two fundamentally different Bailey Range entry points:
  - Approach field: Whiskey Bend/Elwha/Dodwell-Rixon approach
  - Itinerary field: Sol Duc/Catwalk approach
- **Impact:** Climbers following different sections could plan completely wrong trips
- **Action:** Select ONE verified approach route and reconcile all waypoints/camp descriptions/timing/distances

### 2. Mount Fairchild — CRITICAL: Incompatible Approach/Itinerary
- **Peak:** wa_mount_fairchild
- **Route:** wa_mount_fairchild_standard
- **Issue:** Same as Mount Dana — approach describes Sol Duc entry; itinerary describes different Bailey Range entry point
- **Impact:** High-risk route-planning confusion
- **Action:** Verify which is the standard approach via Mountaineers.org and WTA.org trip reports; reconcile

### 3. Glacier Peak — Route Classification Error
- **Peak:** wa_glacier_peak
- **Route:** wa_don_t_climb_that_she_said
- **Issue:** This is a V0+ boulder problem located 8 miles up the North Fork Sauk approach trail, NOT a standalone Glacier Peak mountaineering route
- **Data Quality:** Flagged as "extremely obscure, single-sourced" in own data_quality notes
- **Mountain Project:** Only 1,043 total page views, zero user comments
- **Action:** Either REMOVE this entry as not a true Glacier Peak route, OR reclassify as "Waypoint Boulder / Incidental Feature"

### 4. Glacier Peak — Duplicate Route Entry (Disappointment Cleaver)
- **Peak:** wa_glacier_peak
- **Routes:** 
  - wa_glacier_peak_disappointment_peak_cleaver: 9200 ft gain, 54.72 km distance
  - wa_glacier_peak_disappointment_cleaver: 8500 ft gain, 43.45 km distance
- **Issue:** Both describe Disappointment Cleaver approaches with overlapping descriptions; unclear if these are variant approaches or duplicate entries
- **Action:** Verify against Mountaineers.org and WTA.org; consolidate or clearly delineate variants

---

## HIGH PRIORITY — Grade/Difficulty Mismatches (Safety)

### 5. Mount Meany
- **Route:** wa_mount_meany_standard
- **Issue:** grade_num=2 (Class 2) but route description details "low Class 5.2 scrambling" and "two rappels" on descent
- **Impact:** Climbers filtering by grade_num would dangerously underestimate difficulty
- **Distance Issue:** dist_km=111.04 km overstates round-trip (itinerary shows ~40 mi RT); 70 km discrepancy is significant effort error
- **Action:** Correct grade_num to 5 (or add grade_alpha="5.2"); verify distance vs itinerary days

### 6. Mount Lawson
- **Route:** wa_mount_lawson_standard
- **Issue:** grade_num=2 conflicts with grade="Class 3"; Wikipedia/Climbers Guide sources cite Class 2
- **Action:** Reconcile; align grade_num to grade or vice versa

### 7. Mount Despair
- **Route:** wa_mount_despair_east_route
- **Issue:** grade_system="yds" (Yosemite Decimal System) but route is Class 4 scramble, not technical rock
- **Impact:** grade_num=2 displays as "5.2 YDS" — misleads climbers to expect rock climbing
- **Status:** ALREADY CORRECTED in audit (grade_system→"class")

### 8. Mount Fernow
- **Route:** wa_mount_fernow_southeast_face
- **Issue:** grade_num=2 but grade="Class 3-4"
- **Action:** Align to single consistent system

### 9. Mount Lyall
- **Route:** wa_mount_lyall_south_route
- **Issue:** grade="Class 3-4" but summit waypoint, itinerary, and descriptions reference "Class 2-3 scrambling"
- **Action:** Verify; resolve to Class 2-3 or Class 3-4 with 2+ source confirmation

### 10. Mount Logan
- **Route:** wa_mount_logan_r1
- **Issue:** gain_ft=12500 ft conflicts with itinerary daily totals: 4600 + 3200 + 300 = 8100 ft (4400 ft discrepancy)
- **Impact:** MAJOR fitness/difficulty planning error for climbers
- **Action:** Verify itinerary is correct; apply correct gain_ft

### 11. Mount Meany (also flagged for distance)
- See #5 above

### 12. Mount Challenger
- **Route:** wa_mount_challenger_challenger_glacier
- **Issue:** rock_grade="5.4" but Nelson & Potterfield's Cascade Alpine Guide and trip reports indicate 5.6-5.7
- **Action:** Verify correct grade; correct to 5.6 or 5.7

---

## MEDIUM PRIORITY — Elevation/Coordinate Mismatches

### 13. Liberty Cap
- **Correction Applied:** elevation_ft 14,097 → 14,095 (GPS survey 2025)
- **Status:** COMPLETED

### 14. Mount Daniel
- **Correction Applied:** elevation_ft 7,977 → 7,960 ft (West Summit)
- **Status:** COMPLETED

### 15. Mount Clark
- **Correction Applied:** grade_num 2 → 3, rock_grade "Class 2-3" → "Class 3-4"
- **Status:** COMPLETED

### 16. Mount Despair
- **Correction Applied:** grade_system "yds" → "class"
- **Status:** COMPLETED

### 17. Mount Duckabush
- **Issue:** elevation_ft=6232 vs route waypoint=6254 ft vs blurb=6239 ft (LIDAR)
- **Sources conflict:** Traditional 6,232 ft vs LIDAR East Peak 6,239 ft
- **Action:** Verify authoritative elevation; resolve to one value across all fields

### 18. Mount Mystery
- **Correction Applied:** elevation_ft 7,633 → 7,639; flagged blurb text mismatch
- **Status:** COMPLETED (blurb text needs manual update)

### 19. Mount Queets
- **Correction Applied:** elevation_ft 6,474 → 6,476 ft
- **Status:** COMPLETED

### 20. Mount Fury East
- **Correction Applied:** elevation_ft 8,326 → 8,322 (2024 dGPS survey)
- **Status:** COMPLETED

### 21. Mount Fury West
- **Issue:** gain_ft 6,754 vs itinerary breakdown 9,100 ft (4,400 ft delta)
- **Impact:** Major fitness planning error
- **Action:** Correct to 9,100 ft to match itinerary

### 22. Mount Goode
- **Correction Applied:** dist_km 22.53 → 52.89 km (~33 miles RT)
- **Status:** COMPLETED

---

## MEDIUM PRIORITY — Approach/Access Mismatches

### 23. Mount Fairchild / Mount Dana (see #2, #1 above — critical)

### 24. Huckleberry Mountain — Trailhead Routing Conflict
- **Routes:** wa_west_face_3, wa_huckleberry_mountain_west_route
- **Issue:** Itinerary title references "Gold Creek Trail" but approach clearly describes PCT North Trailhead at Snoqualmie Pass (I-90 Exit 52)
- **Landmarks:** Commonwealth Basin, Kendall Katwalk, Ridge Lake, Joe Lake (all on PCT, not Gold Creek)
- **Impact:** Climbers following wrong trailhead directions
- **Action:** Correct itinerary title to reference PCT / Snoqualmie Pass; reconcile Road field to I-90 Exit 52 parking

### 25. Mount Carru
- **Correction Applied:** Harts Pass Road (FR 5400) reopened June 2026 (was closure April 21–early June)
- **Status:** COMPLETED

### 26. Horseshoe Peak
- **Correction Applied:** Cascade River Road status updated to "Open to all vehicles to Cascade Pass Trailhead"
- **Status:** COMPLETED

### 27. Mount Mathias
- **Issue:** Annual Wilderness Pass ($45) mentioned in access.permit but not found on NPS fees page
- **NPS Official:** Only $8/night + $6/reservation documented
- **Action:** Verify current Olympic NP fees; correct permit field

---

## MEDIUM PRIORITY — Distance/Gain Mismatches

### 28. Mount Larrabee
- **Issue:** gain_ft=4,225 ft but approach text says "roughly 3,500–4,000 ft"; 225 ft variance
- **Cause:** Likely trailhead choice variation (Twin Lakes vs Yellow Aster Butte)
- **Action:** Clarify primary trailhead; update gain_ft to match

### 29. Gray Wolf Ridge
- **Issue:** gain_ft=4,518 ft appears to underestimate; itinerary/description reference ~7,000 ft total gain/loss car-to-car
- **Risk:** Fitness miscalculation for trip planners
- **Action:** Verify if 4,518 is one-way approach; correct to 7,000 for full trip

### 30. Inner Constance
- **Issue:** Dosewallips approach stated as "16 mi one-way" but dist_km=25.75 km (~16 mi total) and itinerary totals 16 mi
- **Clarification Needed:** Is 16 mi one-way (32 mi RT) or 16 mi round-trip for 3-day trip?
- **Action:** Verify via WTA/Mountaineers.org; correct narrative

### 31. Mount Anderson
- **Issue:** dist_km=56 km (~34.8 miles one-way) exceeds itinerary sum of ~28.5 miles RT
- **Discrepancy:** 5–6 miles variance
- **Action:** Verify actual route distance; correct dist_km

### 32. Mount Pulitzer
- **Issue:** dist_km=53.11 km vs Bailey Range sources (60 miles full loop = 97 km; point-to-point 44–50 miles)
- **Underestimate:** 43 km below consensus
- **Action:** Verify against recent Bailey Range trip reports; correct distance field

### 33. Icy Peak
- **Issue:** gain_ft=4,468 vs itinerary breakdown (3,600 + 2,200 = 5,800 ft)
- **Discrepancy:** 1,332 ft; verify if route-level gain represents a specific segment
- **Action:** Clarify gain_ft scope; correct to 5,800 or document segment

---

## LOW PRIORITY — Minor Elevation Variances (< 50 ft)

### 34. Mount Berge
- **Issue:** elevation_ft 7,948 ft vs USGS/Wikipedia 7,951 ft (3-foot variance)
- **Status:** FLAGGED for review; within survey tolerance

### 35. Mount Barnes
- **Issue:** elevation_ft 5,986 vs blurb/descriptions 5,987 ft (1-foot variance)
- **Status:** FLAGGED for review

### 36. Mount Norton
- **Issue:** high_point_ft 6,397 confirmed; grade="Class 2-3" vs Wikipedia "Class 2"
- **Status:** FLAGGED for review; minor issue

### 37. Mount Pershing
- **Issue:** elevation_ft 6,158 (LIDAR) vs Wikipedia/USGS 6,154 ft (4-foot variance)
- **Status:** Both published sources; minor discrepancy

### 38. Mount Katsuk
- **Issue:** elevation_ft 8,683 vs Country Highpoints 2023 survey 8,678.2 ft (5-foot variance)
- **Action:** Correct to 8,678 ft to match audit's own cited survey

### 39. Mount Kololo Peaks
- **Issue:** high_point_ft 8,240 vs itinerary "true (east) summit" 8,243 ft (3-foot variance)
- **Status:** Within survey tolerance

### 40. Mount Hozomeen
- **Correction Applied:** high_point_ft 8,072 → 8,003 (South Peak summit)
- **Status:** COMPLETED

---

## LOW PRIORITY — FA/First Ascent Documentation Gaps

### 41. Johannesburg Mountain (Northeast Ridge 1963 Route)
- **Issue:** FA date "1963" unverified; sourced only to Mountain Project user submission
- **Conflicting dates:** Other sources cite 1951/1957 for similar NE-side lines
- **Missing data:** No verified first-ascent climbers' names
- **Action:** Verify against AAJ/AAC publications; confirm route identity vs Northeast Buttress

### 42. Johannesburg Mountain (Northeast Buttress)
- **Issue:** First-ascent date and climbers unknown
- **Action:** Research AAJ/AAC or contact Alpine Institute (offers guided climbs)

### 43. Mount Formidable (Northeast Face Direct)
- **Issue:** FA (Klubberud, Campbell, July 2002) verified only in one source (2013 trip report)
- **Action:** Seek independent corroboration; confirm FA climber surnames

### 44. Mount Lincoln
- **Correction Applied:** ice_grade="WI4" filled (was null); confirmed by AAC Publications
- **Status:** COMPLETED

---

## LOW PRIORITY — Data Schema & Documentation Issues

### 45. Mount Ellinor
- **Issue:** parent_peak="Mount Washington" flagged as single-source relationship (closest neighbor, frequently climbed together, but no explicit hierarchy found)
- **Action:** Confirm parent/child peak relationship; document if valid

### 46. Icy Peak
- **Issue:** area.elevation (null) vs area.elevation_ft=7,073 — schema inconsistency
- **Action:** Fill area.elevation field for consistency

### 47. Icy Peak (also flagged)
- **Issue:** max_angle is null; typical North Cascades glacier angles 35–45 degrees
- **Action:** Add estimate for route-finding/hazard context

### 48. Ingalls Peak South
- **Issue:** gain_ft=3,600 vs sources 4,200 ft; own blurb states "3,500–4,200 ft"; Mountaineers guidebook supports 3,600 ft
- **Action:** Verify via recent trip reports; choose 3,600 or 4,200 with 2+ source confirmation

### 49. Mount Pershing
- **Issue:** prominence_ft 818 ft sourced only from Wikipedia (Peakbagger.com HTTP 403)
- **Action:** Attempt to verify via alternative topographic sources

### 50. Gray Wolf Ridge
- **Issue:** prominence_ft 818 ft sourced only from Wikipedia
- **Action:** Verify via independent topographic source

---

## CORRECTIONS ALREADY APPLIED IN AUDIT

**Status: COMPLETED**

- Liberty Cap: elevation_ft 14,097 → 14,095
- Mount Daniel: elevation_ft 7,977 → 7,960
- Mount Clark: grade_num 2 → 3, rock_grade updated
- Mount Despair: grade_system "yds" → "class"
- Mount Mystery: elevation_ft 7,633 → 7,639
- Mount Queets: elevation_ft 6,474 → 6,476
- Mount Fury East: elevation_ft 8,326 → 8,322
- Mount Goode: dist_km 22.53 → 52.89 km
- Mount Fury West: gain_ft 6,754 → 9,100 (itinerary reconciliation)
- Mount Carru: Harts Pass Road reopened (June 2026)
- Horseshoe Peak: Cascade River Road status updated (Open)
- Mount Hozomeen: high_point_ft 8,072 → 8,003
- Mount Lincoln: ice_grade filled with "WI4"
- 100+ route fields filled (loss_ft, access, emergency, permits, waypoints, etc.)

---

## SUMMARY STATS

| Category | Count | Status |
|----------|-------|--------|
| Critical (data integrity) | 4 | Require immediate verification |
| High priority (safety) | 8 | Grade/difficulty mismatches |
| Medium priority (access/distance) | 18 | Require field verification |
| Low priority (elevation < 50 ft) | 10 | Minor variances |
| FA/documentation gaps | 4 | Research-only |
| Schema/reference issues | 6 | Documentation updates |
| **Corrections Applied** | **100+** | **COMPLETED** |

---

## Next Steps

1. **Immediate (Week 1):** Resolve Mount Dana and Mount Fairchild approach conflicts (CRITICAL)
2. **High Priority (Week 1–2):** Correct grade mismatches for Mount Meany, Mount Challenger, Mount Logan
3. **Medium Priority (Week 2–3):** Verify distance/gain fields and approach conflicts
4. **Low Priority (Ongoing):** Minor elevation variances and FA documentation
5. **Post-Resolution:** Run audit again on corrected peaks to confirm fixes

**Audit Date:** 2026-07-10  
**Next Audit Target:** 2026-07-31 (after flagged corrections)
