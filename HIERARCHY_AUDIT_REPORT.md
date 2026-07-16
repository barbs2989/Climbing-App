# Area Hierarchy Audit Report
## Mount Rainier & Washington Volcanic Peaks

**Audit Date:** 2026-07-15  
**Scope:** Washington State volcanic peaks and area hierarchy validation

---

## Executive Summary

The area hierarchy audit reveals **critical data integrity issues** in the Supabase database:

1. **Three major volcanic peaks are completely missing:** Mount Rainier, Mount St. Helens, and Mount Baker (as a peak)
2. **Several orphaned mountain areas** exist in the routes table but are missing from the areas table
3. **Severe route mismatch** in the Glacier Peak region: stored route_count values don't match actual assigned routes
4. **Wide-scale orphaned routes:** 923 total orphaned routes (158 unique non-existent area_ids referenced)

---

## Findings by Peak

### Mount Rainier
**Status:** ❌ **MISSING FROM DATABASE**

- No peak area exists in the `areas` table
- No routes assigned
- No region hierarchy established
- Expected hierarchy: `Washington → Cascade Range → Mount Rainier Region → Mount Rainier`

**Impact:** High - Mount Rainier is Washington's most prominent peak and should be foundational to the alpine area hierarchy

---

### Mount Adams
**Status:** ⚠️ **ORPHANED PEAK AREA**

- Area exists in routes table: `wa_mount_adams`
- **Missing from areas table** (orphaned)
- 1 route assigned: "Mount Adams circumnavigation" (ID: wa_adams_circumnavigation)
- Cannot establish parent hierarchy (parent_id unknown)

**Impact:** High - A critical alpine peak with at least one documented route is unreachable in the area browser

---

### Mount Baker
**Status:** ⚠️ **INCOMPLETE - No Peak Area**

- **Peak area `wa_mount_baker` missing** from database
- Represented only as a region: `wa_shuksan_baker_neighbors` (region, 49 routes)
- Path: `usa.washington.wa_northwest.wa_shuksan_baker_neighbors`
- No dedicated peak hierarchy for Mount Baker itself

**Routes in Mount Baker region area:**
- Baker Crags: 18 routes
- Various areas under "Bellingham and Mt Baker Hwy": 49 total routes

**Impact:** Medium - Baker is hierarchically bundled with Shuksan rather than having its own peak entry

---

### Glacier Peak
**Status:** ⚠️ **CRITICAL MISMATCH - Route Count Discrepancy**

**Hierarchy:**
```
USA → Washington → wa_northwest → wa_glacier_peak_region → wa_glacier_peak
Path: usa.washington.wa_northwest.wa_glacier_peak_region.wa_glacier_peak
```

**Route Count Issue:**

| Item | Stored Value | Actual Count | Mismatch |
|------|------------|--------------|----------|
| Peak (wa_glacier_peak) | 7 routes | 0 routes | ❌ -7 |
| Region (wa_glacier_peak_region) | 55 routes | 0 routes | ❌ -55 |
| Glacier Peak Wilderness (child) | 7 routes | 0 routes | ❌ -7 |
| Darrington (child region) | 126 routes | 0 routes | ❌ -126 |

**Children of Glacier Peak Region (all showing 0 actual routes):**
- Agnes Mountain (peak): stored=1, actual=0
- Bedal Basin (crag): stored=4, actual=0
- Darrington (region): stored=126, actual=0
- Dome Peak (peak): stored=1, actual=0
- Elephant Head (peak): stored=1, actual=0
- Glacier Peak (peak): stored=7, actual=0
- Glacier Peak Wilderness (region): stored=7, actual=0
- Gunsight Peak (peak): stored=1, actual=0

**Impact:** CRITICAL - All routes in this major region are orphaned; route_count is completely inaccurate

---

### Mount St. Helens
**Status:** ❌ **MISSING FROM DATABASE**

- No peak area exists in the `areas` table
- No routes assigned
- No region hierarchy established
- Expected hierarchy: `Washington → Cascade Range → Mount St. Helens Region → Mount St. Helens`

**Impact:** High - Mount St. Helens is a major volcanic peak with significant climbing and hiking activity

---

### Mount Shuksan
**Status:** ⚠️ **ORPHANED PEAK AREA**

- Area exists in routes table: `wa_mount_shuksan`
- **Missing from areas table** (orphaned)
- 1 route assigned: "Beckey-Schmidtke" (ID: wa_beckey_schmidtke)
- Cannot establish parent hierarchy (parent_id unknown)

**Impact:** Medium - A prominent Cascade peak with documented climbing routes is unreachable

---

## Orphaned Routes Summary

### Overview
- **Total orphaned routes:** 923 routes
- **Total unique orphaned area_ids:** 158 area IDs referenced in routes but missing from areas table
- **Percentage of all routes:** 92% of routes are orphaned!

### Breakdown by State
| State | Orphaned Routes | Example Missing Areas |
|-------|-----------------|------------------------|
| Arizona (az) | 733 routes | az_alley_rocks, az_another_roadside_attraction_area, az_stewart_peak |
| Washington (wa) | 128 routes | wa_mount_adams, wa_mount_shuksan, wa_mount_stuart, wa_k_cliff, wa_little_dishman_and_tiny_dishman |
| California (ca) | 51 routes | ca_* (various) |
| Idaho (id) | 8 routes | id_* (various) |
| Colorado (co) | 2 routes | co_* (various) |
| Iowa (ia) | 1 route | ia_* |

### Washington Orphaned Mountain Areas
These area_ids are referenced by routes but missing from the areas table:

| Area ID | Routes | Examples |
|---------|--------|----------|
| wa_mount_adams | 1 | Mount Adams circumnavigation |
| wa_mount_shuksan | 1 | Beckey-Schmidtke |
| wa_mount_stuart | 1 | Gorillas in the Mist |
| wa_mount_maude | 1 | South Slopes |
| wa_mount_persis | 1 | Standard Scramble |
| wa_le_conte_mountain | 1 | Standard Route |

---

## Hierarchy Depth Analysis

**Current Hierarchy Depth:** 5 levels (Glacier Peak only example)
```
Level 1: usa (country)
Level 2: washington (state)
Level 3: wa_northwest (regional grouping)
Level 4: wa_glacier_peak_region (mountain region)
Level 5: wa_glacier_peak (individual peak)
```

**Expected consistency for volcanic peaks:**
- All major volcanics should follow same 5-level depth
- Intermediate regional groupings should be consistent
- Peak type should be `area_type='peak'`

---

## Database Integrity Violations

### 1. Route Count Mismatches
Multiple areas show stored route_counts that don't match actual routes:
- **Glacier Peak region:** stored=55, actual=0
- **Darrington:** stored=126, actual=0
- **Glacier Peak peak:** stored=7, actual=0
- **Glacier Peak Wilderness:** stored=7, actual=0

### 2. Missing Area Records
Routes reference area_ids that don't exist in the areas table:
- wa_mount_adams, wa_mount_shuksan, wa_mount_stuart (and 155 others)
- Violates foreign key constraint (if enforced)
- Makes these routes unreachable via area navigation

### 3. Missing Peak Hierarchy Nodes
Critical peaks missing from areas table entirely:
- Mount Rainier (Washington's most prominent peak)
- Mount St. Helens
- Mount Baker (as independent peak, not bundled region)

### 4. Inconsistent Area Type Assignments
- Mount Baker is a "region" not a "peak"
- Glacier Peak is correctly a "peak" but routes don't reference it

---

## Recommendations

### Immediate Actions (Critical)

1. **Add missing major peaks to areas table:**
   - Mount Rainier: Insert as peak type under appropriate region/parent
   - Mount St. Helens: Insert as peak type under appropriate region/parent
   - Verify Mount Baker has dedicated peak area

2. **Create missing orphaned peak areas:**
   - wa_mount_adams: Establish parent hierarchy (should be under Cascade Range/Adams region)
   - wa_mount_shuksan: Establish parent hierarchy
   - wa_mount_stuart: Establish parent hierarchy
   - Others: Review and create where appropriate

3. **Audit and fix Glacier Peak region:**
   - Verify stored route_counts are correct (likely all should be 0 if routes truly don't exist)
   - Investigate why routes table is empty for this region despite non-zero counts
   - Determine if routes exist elsewhere or if data loading failed

### Short-term Actions (High Priority)

4. **Reconcile orphaned routes:**
   - Query all 923 orphaned routes (923 routes with non-existent area_ids)
   - For each orphaned area_id, either:
     - Create the missing area record (if it should exist)
     - Move the route to correct area_id (if mismatch in routes table)
     - Delete the route if invalid (if it's junk data)

5. **Validate all area hierarchy paths:**
   - Verify all parent_id references point to existing areas
   - Ensure no circular references in hierarchy
   - Confirm path strings accurately reflect hierarchy

6. **Update route_count triggers:**
   - Run trigger to recalculate all route_count values from actual routes table
   - Verify consistency with stored counts
   - Ensure trigger is functioning for future inserts/updates

### Medium-term Actions

7. **Data quality audit:**
   - Systematic review of all areas with route_count > 0 to verify routes actually exist
   - Check for duplicate area entries with different slugs
   - Validate coordinates and elevation data

8. **Hierarchy consistency check:**
   - Verify all peaks follow same hierarchy depth pattern
   - Ensure regional groupings are consistent across similar peaks
   - Document the canonical hierarchy structure

9. **Build area browser UI tests:**
   - Test navigation through each major peak's area hierarchy
   - Verify route counts display correctly
   - Test filtering and search across affected areas

---

## Validation Checklist for Fixes

For each peak/area corrected, verify:

- [ ] Area exists in `areas` table with correct id, name, and type
- [ ] Parent ID is valid and points to existing area
- [ ] Path string reflects actual hierarchy structure
- [ ] Area type is appropriate (peak, region, crag, etc.)
- [ ] Coordinates (lat, lng) are accurate
- [ ] All routes that should reference this area_id do so
- [ ] Route count matches actual routes assigned to area
- [ ] No orphaned routes reference this area
- [ ] Child areas have correct parent_id pointing to this area
- [ ] Hierarchy depth is consistent with similar peaks

---

## Technical Notes

**Database tables involved:**
- `areas(id, name, parent_id, path, area_type, route_count, ...)`
- `routes(id, area_id, name, discipline, grade, ...)`

**Key constraints expected:**
- Routes must reference leaf areas only
- Parent IDs must reference existing areas
- Route count must be maintained by trigger on insert/update/delete

**Current schema:** 24 migrations applied (see `supabase/migrations/`)

---

## Appendix: Full Orphaned Mountain Areas

### All Orphaned Areas with "Mount" or "Mountain" in ID

- az_picket_post_mountain: 2 routes
- az_stewart_peak: 20 routes
- wa_le_conte_mountain: 1 route
- wa_mount_adams: 1 route
- wa_mount_maude: 1 route
- wa_mount_persis: 1 route
- wa_mount_shuksan: 1 route
- wa_mount_stuart: 1 route

### Total Scope of Orphaned Routes Problem

**Total routes in database:** 1,000  
**Total orphaned routes:** 923  
**Actual valid routes:** 77 (7.7%)

This indicates a severe data loading issue that affected most multi-state imports.
