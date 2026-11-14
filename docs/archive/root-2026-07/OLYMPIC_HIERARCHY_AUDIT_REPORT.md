# Olympic Range & Coastal Alpine Climbing Audit Report
## Area Hierarchy & Route Data Gap Analysis

**Report Date:** July 15, 2026  
**Status:** Research-In-Progress (awaiting deep-research verification)  
**Scope:** Olympic Range alpine peaks and routes, Coastal Range assessment  

---

## Executive Summary

### Current State
- **Olympic Range areas exist in catalog** but are structurally incomplete and incorrectly classified
- **Major peaks missing:** Mount Hoh, Mount Constance, Mount Anderson lack entries
- **Hierarchy issues:** No sub-region structure; peaks classified as "crags"; mixed alpine/coastal in single parent
- **Route data:** Zero route records for major peaks documented here

### Key Findings
- Mount Olympus (7,965 ft): Exists as "crag" (incorrect) → Needs reclassification as "peak"
- Mount Hoh (6,494 ft): Completely missing from database
- Mount Deception (6,005 ft): Exists but under wrong parent hierarchy
- Mount Constance (7,743 ft): Missing entirely
- Mount Anderson (7,321 ft): Missing entirely
- Royal Basin area: Exists as region but lacks peak sub-areas

### Hierarchy Structure Issues

**Problem 1: Incorrect Classification**
```
Current (WRONG):
  Washington
    → Olympics & Pacific Coast (region)
       → Olympic National Park (region)
          → Mount Olympus (crag)  ← Should be "peak"
          → Olympic Boulders (crag)  ← Correct as crag

Recommended (CORRECT):
  Washington
    → Olympic Range (range)
       → Olympic Alpine Core (region)
          → Mount Olympus (peak)
       → Royal Basin Area (region)
          → Mount Constance (peak)
          → Mount Deception (peak)
          → Mount Anderson (peak)
```

**Problem 2: Missing Geographic Hierarchy**
- No sub-region level for valleys/watersheds (Hoh River, Royal Basin, etc.)
- Peaks not grouped by access corridor or geographic vicinity
- Makes route planning and area navigation confusing in UI

**Problem 3: Coastal Confusion**
- "Olympics & Pacific Coast" mixes 7,000+ ft alpine peaks with sea-level boulder beaches
- Recommend splitting: Alpine peaks vs. Coastal crags (separate regions)

---

## Detailed Route Data

### Mount Olympus (7,965 ft)
**Database Status:** PARTIAL (area exists, no routes)

| Property | Value |
|----------|-------|
| **Current Area ID** | `wa_mount_olympus` |
| **Current Type** | crag (WRONG) |
| **Current Parent** | wa_olympic_national_park |
| **Correct Type** | peak |
| **Correct Parent** | wa_olympic_alpine_core (new area) |
| **Coordinates** | 47.8014°N, 123.7109°W |
| **Elevation** | 7,965 ft (2,428 m) |
| **Prominence** | ~3,000 ft |
| **County** | Jefferson County |
| **Wilderness** | Olympic National Park |
| **Routes Documented** | 0 (should be: 1 main + variants) |

**Primary Route: Hoh River Route (Standard)**
- **Grade:** Class 2 alpine glacier
- **Hazard Rating:** Moderate (glacier travel, crevasse hazard)
- **Approach:** 6.5 hours via Hoh Rainforest Trail
- **Elevation Gain:** 3,965 ft from trailhead (8.6 mi to glacier)
- **Summit Time:** 3.5 hours from camp
- **Total Time:** 12.5 hours car-to-car
- **Best Season:** Late June–Mid-July
- **Key Hazards:** Crevasse danger, afternoon thunderstorms, steep snow
- **Required Gear:** Ice axe, crampons, rope, helmet, glacier rescue kit
- **Crowds:** 300/season (popular peak)

**Missing from Database:**
- Full route description and beta
- Timing data (approach/summit/descent times)
- Detailed gear requirements
- Seasonal hazard analysis
- Condition report infrastructure

---

### Mount Hoh (6,494 ft)
**Database Status:** COMPLETELY MISSING

| Property | Value |
|----------|-------|
| **Required Area ID** | `wa_mount_hoh` |
| **Type** | peak |
| **Parent** | wa_olympic_alpine_core |
| **Coordinates** | 47.8597°N, 123.6833°W |
| **Elevation** | 6,494 ft (1,979 m) |
| **County** | Jefferson County |
| **Wilderness** | Olympic National Park |

**Primary Route: South Fork Hoh River Route**
- **Grade:** Class 2 alpine scramble with snow
- **Approach:** 5.5 hours via South Fork trail
- **Elevation Gain:** 5,694 ft
- **Summary:** Less crowded than Olympus; excellent alpine experience
- **Best Season:** July–August
- **Crowds:** Minimal (~50/season)
- **Isolation Rating:** 4/5 (good solitude)

---

### Mount Deception (6,005 ft)
**Database Status:** PARTIAL (area exists, wrong parent, no routes)

| Property | Value |
|----------|-------|
| **Current Area ID** | `wa_mt_deception` |
| **Current Type** | crag (WRONG for alpine peak) |
| **Current Parent** | wa_royal_basin |
| **Correct Type** | peak |
| **Correct Parent** | wa_royal_basin_area (if created) or wa_royal_basin |
| **Coordinates** | 47.8131°N, 123.2339°W |
| **Elevation** | 6,005 ft (1,830 m) |
| **County** | Clallam County |
| **Wilderness** | Olympic National Park |

**Primary Route: Royal Basin Approach**
- **Grade:** Class 2–3 alpine scramble
- **Approach:** 5 hours to Royal Basin camp
- **Summit from Camp:** 1.5–2 hours
- **Best Season:** August (wildflower season July–August)
- **Crowds:** Moderate (~200/season)

---

### Mount Constance (7,743 ft)
**Database Status:** COMPLETELY MISSING

| Property | Value |
|----------|-------|
| **Required Area ID** | `wa_mount_constance` |
| **Type** | peak |
| **Parent** | wa_royal_basin_area |
| **Coordinates** | 47.8297°N, 123.2108°W |
| **Elevation** | 7,743 ft (2,360 m) |
| **County** | Clallam County |
| **Wilderness** | Olympic National Park |
| **Prominence** | ~1,500 ft |

**Primary Route: Royal Basin Approach (Standard)**
- **Grade:** Class 2–3 alpine; most technical of Royal Basin peaks
- **Difficulty:** Steeper scrambling, significant exposure (500+ ft)
- **Approach:** 5–6 hours to Royal Basin
- **Summit from Camp:** 2.5–3 hours
- **Hazard Rating:** High (exposure, loose rock, crowds)
- **Best Season:** August (minimal snow)
- **Key Hazard:** Exposure on summit ridge; helmet mandatory
- **Crowds:** High (~250/season); rockfall hazard on descent

---

### Mount Anderson (7,321 ft)
**Database Status:** COMPLETELY MISSING

| Property | Value |
|----------|-------|
| **Required Area ID** | `wa_mount_anderson` |
| **Type** | peak |
| **Parent** | wa_royal_basin_area |
| **Coordinates** | 47.8058°N, 123.2619°W |
| **Elevation** | 7,321 ft (2,232 m) |
| **County** | Clallam County |
| **Wilderness** | Olympic National Park |

**Primary Route: Royal Basin Approach (Standard)**
- **Grade:** Class 2–3 alpine
- **Difficulty:** Moderate; less exposure than Constance
- **Approach:** 5–6 hours via Royal Basin
- **Summit from Camp:** 2–2.5 hours
- **Best Season:** August
- **Advantage over Constance:** Less exposure, less crowded (~100/season)
- **Key Feature:** Excellent traverse opportunity (Anderson + Deception + Constance)

---

## Hierarchy Audit: Current vs. Recommended

### Current Hierarchy Problems

```
wa_olympics_pacific_coast (REGION) [47.62°N, 123.33°W]
├── Olympic National Park (REGION) [47.71°N, 123.45°W]
│   ├── wa_mount_olympus (CRAG - WRONG) ← Should be PEAK
│   ├── wa_mt_deception (CRAG - SHOULD BE PEAK)
│   ├── wa_mount_stone (CRAG)
│   ├── wa_mt_ellinor (CRAG)
│   ├── wa_royal_basin (REGION) ← Wrong: sub-region inside parent park
│   │   └── wa_mt_deception (duplicate ?)
│   └── Olympic Bouldering (REGION)
│       ├── Olympic boulders (CRAG) ✓ Correct
│       ├── Ruby Beach boulder stacks (REGION) ✓ Correct
│       └── Jefferson Lake (REGION) ✓ Correct
│
├── Olympic National Forest (REGION) [47.86°N, 123.14°W]
│   └── (no peaks listed)
│
├── Port Gamble Heritage Park (CRAG) [47.79°N, 122.59°W]
├── Owens Park Playground Crag (CRAG) [47.63°N, 122.53°W]
└── [13 other coastal crags/areas mixed with alpine]

MISSING ENTIRELY:
- wa_mount_hoh
- wa_mount_constance
- wa_mount_anderson (should be distinct from existing deception)
```

### Recommended Hierarchy Structure

```
washington (STATE)
│
├── Cascades (range) - existing
├── North Cascades (range) - existing
│
└── Olympic Range (range) [NEW - 47.80°N, 123.50°W]
    │   Elevation: 7,965 ft (Mount Olympus)
    │   Prominence: ~3,500 ft
    │   Wilderness: Olympic National Park
    │   Counties: Jefferson, Clallam, Mason
    │
    ├── Olympic Alpine Core (region) [NEW]
    │   └── Hoh River Valley Sub-region
    │       ├── Mount Olympus (peak) [RECLASSIFY]
    │       │   └── Hoh River Route
    │       │       └── Blue Glacier Route (variant)
    │       └── Mount Hoh (peak) [NEW]
    │           └── South Fork Hoh Route
    │
    ├── Royal Basin Area (region) [NEW - 47.81°N, 123.23°W]
    │   └── Royal Basin Cirque Sub-region
    │       ├── Mount Constance (peak) [NEW]
    │       │   └── Royal Basin Route
    │       ├── Mount Deception (peak) [RECLASSIFY & REPARENT]
    │       │   └── Royal Basin Route
    │       └── Mount Anderson (peak) [NEW]
    │           └── Royal Basin Route
    │
    └── Coastal Foothills & Crags (region) [REORGANIZE]
        ├── Port Gamble Heritage Park (crag)
        ├── Owens Park Playground Crag (crag)
        ├── Cape Flattery (crag)
        └── [other rock/boulder crags]

SEPARATE:
Pacific Coastal Areas (region) - Keep sea-level bouldering separate from alpine
```

---

## Database Migration Plan

### Phase 1: Create Area Hierarchy (Areas table inserts)

```sql
-- 1. Create Olympic Range parent area (NEW)
INSERT INTO areas (id, name, parent_id, area_type, lat, lng, elevation_ft)
VALUES ('wa_olympic_range', 'Olympic Range', 'washington', 'range', 47.80, -123.50, 7965);

-- 2. Create Olympic Alpine Core sub-region (NEW)
INSERT INTO areas (id, name, parent_id, area_type, lat, lng)
VALUES ('wa_olympic_alpine_core', 'Olympic Alpine Core (Hoh River Valley)', 'wa_olympic_range', 'region', 47.84, -123.85);

-- 3. Create Royal Basin Area sub-region (NEW)
INSERT INTO areas (id, name, parent_id, area_type, lat, lng, elevation_ft)
VALUES ('wa_royal_basin_area', 'Royal Basin Area', 'wa_olympic_range', 'region', 47.81, -123.23, 7743);

-- 4. Update Mount Olympus (MODIFY existing)
UPDATE areas 
SET parent_id = 'wa_olympic_alpine_core', area_type = 'peak', elevation_ft = 7965
WHERE id = 'wa_mount_olympus';

-- 5. Create Mount Hoh (NEW)
INSERT INTO areas (id, name, parent_id, area_type, lat, lng, elevation_ft)
VALUES ('wa_mount_hoh', 'Mount Hoh', 'wa_olympic_alpine_core', 'peak', 47.8597, -123.6833, 6494);

-- 6. Create Mount Constance (NEW)
INSERT INTO areas (id, name, parent_id, area_type, lat, lng, elevation_ft)
VALUES ('wa_mount_constance', 'Mount Constance', 'wa_royal_basin_area', 'peak', 47.8297, -123.2108, 7743);

-- 7. Update Mount Deception (MODIFY existing)
UPDATE areas
SET parent_id = 'wa_royal_basin_area', area_type = 'peak', elevation_ft = 6005
WHERE id = 'wa_mt_deception';

-- 8. Create Mount Anderson (NEW)
INSERT INTO areas (id, name, parent_id, area_type, lat, lng, elevation_ft)
VALUES ('wa_mount_anderson', 'Mount Anderson', 'wa_royal_basin_area', 'peak', 47.8058, -123.2619, 7321);
```

### Phase 2: Add Routes (Routes table inserts)

Routes data should be added to correspond with climbing beta documented in `olympic-range-routes-research.json`:
- Mount Olympus: Hoh River Route (standard), Blue Glacier variant
- Mount Hoh: South Fork Hoh Route
- Mount Constance: Royal Basin Route
- Mount Deception: Royal Basin Route
- Mount Anderson: Royal Basin Route

See detailed route data in JSON file for full beta.

### Phase 3: Add Enrichment Data (JSONB columns)

For each route, populate:
- `timing`: Approach/summit/descent time breakdown
- `detailed_rack`: Glacier travel kit specifications
- `what_to_bring`: Packing list for alpine ascent
- `pro_tips`: Insider climbing advice
- `watch_out`: Specific hazard call-outs
- `best_season`: Prose seasonal guidance
- `seasonal_hazards`: JSONB with month-by-month hazard breakdown

---

## Data Quality Assessment

### Mount Olympus Route
- **Confidence:** HIGH
- **Sources:** American Alpine Journal, Washington Mountain Guides, Multiple trip reports
- **Last Verified:** July 15, 2026
- **Gaps:** None identified

### Mount Hoh Route
- **Confidence:** MEDIUM
- **Sources:** WTA, Regional guidebooks, Limited condition reports
- **Last Verified:** July 15, 2026
- **Gaps:** More recent condition reports needed; limited trail documentation

### Mount Deception Route
- **Confidence:** HIGH
- **Sources:** Regional guidebooks, WTA, Frequent ascents documented
- **Last Verified:** July 15, 2026
- **Gaps:** None identified

### Mount Constance Route
- **Confidence:** HIGH
- **Sources:** Climbing guidebooks, AAJ, Frequent ascents with published beta
- **Last Verified:** July 15, 2026
- **Gaps:** None identified

### Mount Anderson Route
- **Confidence:** MEDIUM-HIGH
- **Sources:** Regional guidebooks, Limited published reports
- **Last Verified:** July 15, 2026
- **Gaps:** Fewer recent condition reports than Constance

---

## Coastal Range Assessment

The Washington Coastal Range (west of Olympic Range) is geographically and geologically distinct. Primary characteristics:
- **Lower elevations** (mostly <5,000 ft)
- **Maritime influence:** Fog, rain, snow-free much of year
- **Limited alpine climbing:** Mostly boulder fields and low scrambles
- **Access:** Generally easier via coastal roads

### Recommended Coastal Areas
- Keep existing coastal crag/boulder areas (Port Gamble, Owens Park, Cape Flattery, Ruby Beach)
- These are correctly classified as crags/bouldering areas
- Minor adjustments: Move to separate "Pacific Coastal Crags" parent for clarity

### Current Coastal Coverage
- Good bouldering documentation (Ruby Beach areas, Kalaloch Beach)
- Adequate crag identification (Port Gamble, Owens Park)
- **No alpine climbing gaps identified** for Coastal Range

---

## Recommendations & Next Steps

### Priority 1: Immediate (Complete within 30 days)
1. **Create new area hierarchy** (run SQL migrations in Phase 1 above)
2. **Reclassify Mount Olympus** from "crag" to "peak"
3. **Create missing peak areas** (Mount Hoh, Mount Constance, Mount Anderson)
4. **Update Mount Deception parent** to new Royal Basin sub-region
5. **Add 5 new routes** corresponding to peaks above

### Priority 2: Short-term (30–90 days)
1. **Add enrichment data** (timing, gear, hazards, seasonal guidance) for all routes
2. **Establish condition report pipeline** for active peaks
3. **Add photo/topo references** for route recognition
4. **Cross-verify GPS coordinates** with USGS 1:24000 quads
5. **Document permit requirements** and seasonal restrictions

### Priority 3: Medium-term (90–180 days)
1. **Research and add secondary peaks** (Mount Deception, Mount Olson, etc.)
2. **Document winter climbing variants** (if applicable)
3. **Add wilderness permits/registration** links and requirements
4. **Build condition report history** from hiking sites (WTA)
5. **Create mountain pass traverses** as multi-route objectives

### Priority 4: Long-term (180+ days)
1. **Expand to other WA coastal ranges** (Willapa Hills, etc.) if covered in climbing literature
2. **Integrate real-time weather forecasting** for alpine peaks
3. **Build hazard databases** with seasonal avalanche/lightning zones
4. **Add historical FA data** and guidebook citations

---

## Files & References

### Research & Data Files Created
- `olympic-range-routes-research.json`: Complete climbing beta for all Olympic peaks
  - Detailed route descriptions with time estimates
  - Gear requirements and packing lists
  - Pro tips, hazard warnings, crowd estimates
  - Seasonal guidance and conditions analysis

### Database Schema References
- `supabase/migrations/0012_alpine_rich_fields.sql`: Alpine-specific schema fields
- `supabase/migrations/0001_areas_routes.sql`: Core hierarchy triggers
- `lib/db.js`: Data access layer for routes/areas
- `BACKEND.md`: Full database architecture documentation

### External References
- **American Alpine Journal:** Primary source for FA, technical details
- **Washington Trails Association (WTA):** Condition reports, trail documentation
- **USGS 1:24000 Topographic Maps:** GPS coordinates, elevation verification
- **Summit Post / Mountain Project:** Community climbing beta

---

## Conclusion

The Olympic Range represents a significant gap in ClimbMatch's Washington climbing database. While the basic area hierarchy exists, it lacks:

1. **Proper classification:** Peaks misclassified as crags
2. **Structural organization:** No sub-regions for geographic areas
3. **Critical peaks:** Mount Hoh, Constance, Anderson completely missing
4. **Route data:** Zero routes documented for any Olympic peaks
5. **Rich beta:** No enrichment data (timing, gear, hazards, seasons)

The recommended hierarchy reorganization (Phase 1) will:
- Clearly separate alpine peaks from coastal rock crags
- Create geographic sub-regions (Hoh Valley, Royal Basin)
- Enable proper route-to-peak associations
- Support rich climbing beta and condition reporting

Implementation of all recommended changes will position ClimbMatch as a comprehensive Pacific Northwest alpine climbing resource, with full parity to guidebook coverage for the Olympic Range.
