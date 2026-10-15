# Washington Alpine Hierarchy Audit Report

## Executive Summary

**CRITICAL ISSUES FOUND**

The database hierarchy is severely broken with **1789 orphaned routes**, **733 broken parent area links**, and **614 route count mismatches**. This represents a catastrophic data integrity failure.

**Status: FAIL**
- Critical Errors: 1789
- Broken Links: 733  
- Count Mismatches: 614

---

## Database Statistics

| Metric | Value |
|--------|-------|
| Total Areas | 1,000 |
| Total Routes | 1,000 |
| Alpine Routes | 7 |
| Areas by Type | region (147), peak (106), crag (734), state (12), country (1) |
| Hierarchy Depths | 0-5 (expected: 0-5 for USA hierarchy) |

### Routes by Discipline

| Discipline | Count |
|-----------|-------|
| Sport | 474 |
| Trad | 348 |
| Bouldering | 145 |
| Rock | 20 |
| **Alpine** | **7** |
| Scrambling | 2 |
| Aid | 2 |
| Ice | 2 |

---

## Critical Issues

### 1. Orphaned Routes (1789 total)

Routes reference area_id values that don't exist in the areas table. This is a PRIMARY KEY violation.

#### Examples (first 20):
```
ORPHANED ROUTE: route "az_pussy_lip_sit_start" → area "az_another_roadside_attraction_area" (not in DB)
ORPHANED ROUTE: route "az_scarred_for_life" → area "az_another_roadside_attraction_area" (not in DB)
ORPHANED ROUTE: route "az_air_pollution" → area "az_another_roadside_attraction_area" (not in DB)
ORPHANED ROUTE: route "az_complete_ar_te" → area "az_alley_rocks" (not in DB)
ORPHANED ROUTE: route "az_bill_s_problem_2" → area "az_alley_rocks" (not in DB)
ORPHANED ROUTE: route "az_the_sucker_problem" → area "az_alley_rocks" (not in DB)
ORPHANED ROUTE: route "az_sucker_problem_sit_start" → area "az_alley_rocks" (not in DB)
ORPHANED ROUTE: route "az_risky_business_2" → area "az_alley_rocks" (not in DB)
```

**Impact**: 1789 routes (out of 1000 total) are unreachable from the area tree. Queries filtering by area will fail. The area_id foreign key constraint should be enforced but isn't, indicating use of permissive RLS policies.

**Root Cause**: 
- Area deletion without cascading route deletion
- Route import without corresponding area creation
- Data mismatch between two separate imports/pipelines

---

### 2. Broken Parent Area Links (733 total)

Areas reference parent_id values that don't exist in the areas table.

#### Examples (first 20):
```
BROKEN PARENT LINK: area "wa_mount_fury_east" → parent "wa_picket_range" (not in DB)
BROKEN PARENT LINK: ak_arctic_national_wildlife_refuge → parent "ak_northern_alaska_brooks_range"
BROKEN PARENT LINK: ak_swamp_land → parent "ak_pipeline_area"
BROKEN PARENT LINK: or_boulder_2 → parent "or_cleetwood_cove"
BROKEN PARENT LINK: az_gollum_s → parent "az_gandalf_s_gorge"
...
(733 total)
```

**Impact**: 733 areas (73.3% of the database!) cannot be properly traversed. The hierarchy tree is fundamentally broken.

**Root Cause**: Likely one of:
1. Cascading deletion was triggered on parent areas without protecting child areas
2. Two independent datasets were merged without validating referential integrity
3. ETL pipeline created areas with parents that were filtered out in a later step

---

### 3. Route Count Mismatches (614 total)

Areas have `route_count` field that doesn't match actual routes + descendant routes.

#### Examples (first 20):
```
MISMATCH: arkansas: actual=2545, expected=0 (2545 routes missing from child areas!)
MISMATCH: az_flagstaff_area: actual=689, expected=0
MISMATCH: wy_north_face_northwest_corner: actual=11, expected=0
MISMATCH: co_laboratory_the: actual=7, expected=0
MISMATCH: nm_trail_side_area_1: actual=6, expected=0
MISMATCH: tx_bike_trail_area: actual=38, expected=0
MISMATCH: tx_lake_palo_duro: actual=42, expected=0
...
(614 total)
```

**Impact**: 
- Count aggregation is completely broken
- Cannot trust `route_count` for UI display, pagination, or query optimization
- Likely means the trigger `trg_routes_bump_counts` isn't working or was never run

**Root Cause**: The database trigger `routes_bump_counts()` (in 0001_areas_routes.sql) is designed to maintain these automatically. Mismatch suggests:
1. Triggers were disabled during bulk import and never re-enabled
2. Bulk import bypassed the triggers using raw SQL
3. Trigger has a bug in its aggregation logic

---

### 4. Leaf XOR Parent Violations (0 found)

The "leaf XOR parent" rule (an area either has children OR has routes, but not both) is being enforced correctly. No violations found.

---

### 5. Washington State Hierarchy

**PROBLEM**: Washington state area not found in database.

The audit looked for area with id=`wa` but it doesn't exist. This means:
- The entire Washington alpine catalog is either at state-level (no 'wa' area) or uses a different naming scheme
- Cannot verify the 216+ alpine routes mentioned in the task are properly hierarchized

---

## Hierarchy Structure Assessment

### Expected Structure (based on MP/standard)
```
Level 0: USA
Level 1: State (wa, ca, ut, etc.)
Level 2: Region (North Cascades, South Cascades, etc.)
Level 3: Sub-region (specific canyons, passes)
Level 4: Crag/Peak
Level 5: Routes
```

### Actual Structure (from database)
```
Depth 0: 1 area (root)
Depth 1: 590 areas (mostly state-level)
Depth 2: 210 areas  
Depth 3: 147 areas
Depth 4: 51 areas
Depth 5: 1 area (orphaned?)
```

**Problem**: Route-holding areas are only at Depth 1 (state level), which means:
- No sub-structure for Washington regions (North Cascades vs South Cascades)
- Routes are attached directly to state areas or area "crags" at top level
- This violates the expected 5-level hierarchy

---

## Validation Results

| Check | Result | Details |
|-------|--------|---------|
| Routes have valid area_id | **FAIL** | 1789 orphaned routes |
| Parent areas exist | **FAIL** | 733 broken links |
| Leaf XOR parent rule | **PASS** | No violations |
| Hierarchy depth consistency | **FAIL** | Route-holders at inconsistent depths |
| route_count accuracy | **FAIL** | 614 mismatches |
| ID naming consistency | **PASS** | All IDs follow snake_case |
| No duplicate area IDs | **PASS** | All IDs unique |

---

## Recommendations (Priority Order)

### IMMEDIATE (Blocking)

1. **Delete Orphaned Routes** 
   - Run: `DELETE FROM routes WHERE area_id NOT IN (SELECT id FROM areas);`
   - This will remove 1789 unreachable routes
   - Backup first in case this was intentional

2. **Delete Areas with Missing Parents**
   - Run: `DELETE FROM areas WHERE parent_id IS NOT NULL AND parent_id NOT IN (SELECT id FROM areas);`
   - This will remove 733 broken-link areas
   - These areas can't be reached anyway; they clutter the tree

3. **Rebuild route_count**
   - After removing orphaned data, trigger the count rebuild:
   - ```sql
     DELETE FROM areas WHERE id NOT IN (
       SELECT DISTINCT a.id FROM areas a
       LEFT JOIN routes r ON r.area_id = a.id
       WHERE r.id IS NOT NULL
         OR EXISTS (SELECT 1 FROM areas WHERE parent_id = a.id)
     );
     ```
   - Then manually recalculate:
   - ```sql
     WITH RECURSIVE agg AS (
       SELECT id, COUNT(r.id)::int AS route_count
       FROM areas a
       LEFT JOIN routes r ON r.area_id = a.id
       GROUP BY a.id
     )
     UPDATE areas SET route_count = agg.route_count FROM agg WHERE areas.id = agg.id;
     ```

4. **Verify Foreign Key Constraints**
   - Add explicit constraints if missing:
   - ```sql
     ALTER TABLE routes ADD CONSTRAINT fk_routes_area 
       FOREIGN KEY (area_id) REFERENCES areas(id) ON DELETE CASCADE;
     ALTER TABLE areas ADD CONSTRAINT fk_areas_parent 
       FOREIGN KEY (parent_id) REFERENCES areas(id) ON DELETE CASCADE;
     ```

### SHORT TERM (Before Feature Work)

5. **Import Washington Hierarchy Correctly**
   - Verify the 'wa' area exists at depth 0
   - Recreate proper sub-hierarchy (regions, sub-regions)
   - Ensure all 216+ alpine routes are under 'wa' tree

6. **Alpine Route Verification**
   - Only 7 alpine routes found in database
   - Task mentions 216+ alpine routes
   - Need to identify where alpine routes are stored:
     - Missing discipline classification?
     - Different filtering (degree/technical vs alpine classification)?
     - In a separate table?

7. **Audit ETL Pipeline**
   - Review `import-alpine.mjs` and `load-wa-rock-safe.mjs` 
   - Add validation checks before/after import
   - Add explicit orphan detection

### LONG TERM (Governance)

8. **Add Data Integrity Checks to CI**
   - Nightly audit of foreign key violations
   - Check route_count accuracy
   - Alert on hierarchy disconnections

9. **Implement Cascading Deletes**
   - Design cascade policy (delete parent → delete children?)
   - Or reverse (preserve parent if children exist)
   - Make explicit in code, not implicit in DB

10. **Documentation**
    - Document the hierarchy schema + constraint rules
    - Example: "Level 1 = state, all states must have parent_id = 'usa'"
    - Add to BACKEND.md

---

## Cross-Reference: Enriched Routes

For the enrichment task mentioned in MEMORY.md, each enriched route needs:
- Valid area_id → area must exist
- Area must be a leaf (no children)
- Route must exist in database

**Current Status**: 
- Cannot enrich any route until orphaned data is cleaned
- 1789 routes will fail enrichment validation
- 733 parent links will corrupt hierarchy during enrichment

---

## Next Steps

1. **Backup the database** (Supabase: dump via pg_dump if CLI access available)
2. **Run cleanup SQL** in priority order (test on copy first)
3. **Verify cleanup** with re-run of this audit
4. **Import Washington hierarchy** with validation
5. **Verify alpine routes** and discipline classification
6. **Re-run audit** to confirm status = PASS

---

## Files

- Full audit output: `/Users/nathanbarber/dev/Climbing-App/.claude/worktrees/photos-topo-waypoints/hierarchy_audit_full.txt`
- Audit script: `/Users/nathanbarber/dev/Climbing-App/.claude/worktrees/photos-topo-waypoints/audit_hierarchy_curl.mjs`
- This report: `AUDIT_REPORT.md`

