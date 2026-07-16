# North Cascades Hierarchy Audit Report
Generated: 2026-07-15

## Executive Summary

The North Cascades area hierarchy in the database contains **significant route_count denormalization errors** and **unbalanced child area route distributions**. The core issue is that computed aggregation counts do not match actual route assignments.

### Key Findings
- **Critical**: wa_north_cascades_core declares 76 routes but has only 58 actual routes
- **Critical**: Boston Basin declares 1 route but contains 19 actual routes  
- **Critical**: Chilliwack Range declares 0 routes but contains 9 actual routes
- **Critical**: wa_north_cascades parent area declares 75 routes; children sum to 84 declared, but 93 actual
- **Structural**: All 37 peaks in NC Core are leaf areas (correct)
- **Structural**: No orphaned routes found (all routes link to valid areas)
- **Structural**: No hierarchy violations (areas are either parent XOR leaf, never both)

---

## Hierarchy Structure

### wa_north_cascades (parent region)
- **Declared route_count**: 75
- **Actual recursive routes**: 93
- **Discrepancy**: -18 routes (under-counted)

#### Child Areas (Direct children of wa_north_cascades):

1. **North Cascades Core** (wa_north_cascades_core)
   - Type: region
   - Declared: 76 routes | Actual: 58 routes | Mismatch: -18
   - Contains 37 peak/crag leaf areas

2. **Boston Basin** (wa_boston_basin)
   - Type: region  
   - Declared: 1 route | Actual: 19 routes | Mismatch: -18
   - Contains 7 peak/crag child areas including Forbidden Peak, Sahale Peak, Shuksan, Torment, etc.

3. **Chilliwack Range** (wa_chilliwack_range)
   - Type: region
   - Declared: 0 routes | Actual: 9 routes | Mismatch: -9
   - Contains 4 peak child areas (Redoubt, Ruth, Terror siblings, etc.)

4. **Mamie Peak** (wa_mamie_peak)
   - Type: crag (leaf)
   - Declared: 4 routes | Actual: 4 routes | ✓ Correct

5. **Alpine and Technical Traverses** (wa_alpine_and_technical_traverses)
   - Type: crag (leaf)
   - Declared: 1 route | Actual: 1 route | ✓ Correct

6. **Twin Sisters Range** (wa_twin_sisters_range)
   - Type: region
   - Declared: 2 routes | Actual: 2 routes | ✓ Correct

7. **Pan Dome Falls** (wa_pan_dome_falls)
   - Type: crag (leaf)
   - Declared: 0 routes | Actual: 0 routes | ✓ Correct

---

## North Cascades Core (wa_north_cascades_core) Detailed Audit

### 37 Direct Peak/Crag Children

All child peaks show correct individual route_counts:

| Peak Name | Area ID | Type | Routes | Status |
|-----------|---------|------|--------|--------|
| Austera Peak | wa_austera_peak | peak | 1 | ✓ |
| Booker Mountain | wa_booker_mountain | peak | 1 | ✓ |
| Cascade Peak | wa_cascade_peak | peak | 1 | ✓ |
| Colonial Peak | wa_colonial_peak | peak | 1 | ✓ |
| Cosho Peak | wa_cosho_peak | peak | 1 | ✓ |
| Crater Mountain | wa_crater_mountain | peak | 1 | ✓ |
| Dorado Needle | wa_dorado_needle | peak | 4 | ✓ |
| Early Morning Spire | wa_early_morning_spire | crag | 0 | ✓ |
| Eldorado Peak | wa_eldorado_peak | peak | 4 | ✓ |
| Horseshoe Peak | wa_horseshoe_peak | peak | 1 | ✓ |
| Hurry-Up Peak | wa_hurry_up_peak | peak | 1 | ✓ |
| Jack Mountain | wa_jack_mountain | peak | 1 | ✓ |
| Johannesburg Mountain | wa_johannesburg_mountain | peak | 3 | ✓ |
| Katsuk Peak | wa_katsuk_peak | peak | 1 | ✓ |
| Kimtah Peak | wa_kimtah_peak | peak | 1 | ✓ |
| Klawatti Peak | wa_klawatti_peak | peak | 1 | ✓ |
| Magic Mountain | wa_magic_mountain | peak | 1 | ✓ |
| Main Peak | wa_main_peak | crag | 6 | ✓ |
| Mesahchie Peak | wa_mesahchie_peak | peak | 1 | ✓ |
| Mix-up Peak | wa_mixup_peak | peak | 1 | ✓ |
| Mount Buckindy | wa_mount_buckindy | peak | 1 | ✓ |
| Mount Chaval | wa_mount_chaval | peak | 1 | ✓ |
| Mount Formidable | wa_mount_formidable | peak | 2 | ✓ |
| Mount Goode | wa_mount_goode | peak | 4 | ✓ |
| Mount Logan | wa_mount_logan | peak | 3 | ✓ |
| Mutchler Peak | wa_mutchler_peak | peak | 1 | ✓ |
| Primus Peak | wa_primus_peak | peak | 3 | ✓ |
| Pyramid Peak | wa_pyramid_peak_colonial | peak | 1 | ✓ |
| Ruby Mountain | wa_ruby_mountain | peak | 0 | ✓ |
| Snowfield Peak | wa_snowfield_peak | peak | 2 | ✓ |
| Snowking Mountain | wa_snowking_mountain | peak | 2 | ✓ |
| Spider Mountain | wa_spider_mountain | peak | 1 | ✓ |
| Storm King | wa_storm_king | peak | 1 | ✓ |
| The Needle | wa_the_needle | peak | 1 | ✓ |
| The Triad | wa_the_triad | peak | 1 | ✓ |
| Trapper Mountain | wa_trapper_mountain | peak | 1 | ✓ |
| Tricouni Peak | wa_tricouni_peak | peak | 1 | ✓ |

**Total in NC Core peaks: 58 routes**  
**NC Core declares: 76 routes**  
**Missing from declared count: 18 routes**

---

## Boston Basin Detail (wa_boston_basin)

**Critical mismatch**: Declared 1 route, contains 19 actual routes

### Child Areas and Routes:

1. **Forbidden Peak** (wa_forbidden_peak) - 7 routes
   - Northeast Ridge
   - North Ridge  
   - Direct North Buttress
   - North Buttress
   - Southwest Face / Southwest Slopes
   - East Ridge
   - West Ridge

2. **Quien Sabe Peak** (wa_quien_sabe_peak) - 2 routes
   - Quien Sabe Glacier
   - Southeast Face

3. **Sahale Peak** (wa_sahale_peak) - 2 routes
   - Sahale Arm / Sahale Glacier
   - Southeast Ridge

4. **Shuksan Lake Peak** (wa_shuksan_lake_peak) - 2 routes
   - Southeast Face
   - Northwest Ridge

5. **Tremolo Peak** (wa_tremolo_peak) - 2 routes
   - Southwest Face / Southwest Slopes
   - North Face

6. **Torment-Forbidden Traverse** (wa_torment_forbidden_traverse) - 1 route
   - (single route)

7. **Mount Torment (near Boston Basin)** (wa_mount_torment_boston_basin) - 3 routes
   - South Ridge
   - North Ridge
   - East Ridge

**Total actual routes: 19**  
**Declared: 1**  
**Discrepancy: +18 routes (over-declared in counts but under-counted in parent)**

---

## Chilliwack Range Detail (wa_chilliwack_range)

**Critical mismatch**: Declared 0 routes, contains 9 actual routes

### Child Areas and Routes:

1. **Redoubt** (wa_redoubt) - 1 route
2. **Ruth** (wa_ruth) - 1 route  
3. **Mount Shuksan** (wa_mount_shuksan) - Should be wa_shuksan_baker_neighbors parent, but some routing found here
4. And 6 additional routes distributed among child peaks

**Total actual routes: 9**  
**Declared: 0**  
**Discrepancy: +9 routes (completely missing from count)**

---

## Issues Summary

### Issue 1: Route_count Aggregation Mismatch (Critical)
- **Affected Areas**: wa_north_cascades, wa_north_cascades_core, wa_boston_basin, wa_chilliwack_range
- **Root Cause**: The `route_count` trigger that should aggregate child routes appears to be:
  - Not counting routes in nested child areas (only direct children)
  - Or being recalculated after data was loaded, causing stale counts
  - Or records were manually edited without trigger recalculation
- **Evidence**: 
  - wa_north_cascades declares 75, but children sum to 84 declared, 93 actual
  - wa_north_cascades_core declares 76 but has 58 actual
  - Boston Basin declares 1 but has 19 actual
  - Chilliwack Range declares 0 but has 9 actual

### Issue 2: Inconsistent Parent-Child Accounting
- Boston Basin and Chilliwack Range under-count dramatically
- NC Core over-counts by 18
- The discrepancy of 18 in NC Core exactly matches the 18 unaccounted routes in Boston Basin
- This suggests routes may have been moved or mis-assigned between areas

### Issue 3: Non-leaf Parent Areas with route_count > 0
- wa_north_cascades_core is a region (non-leaf) but has route_count=76
- This violates the rule that "routes only on leaves; areas are leaf XOR parent"
- However, no routes are directly assigned to this area (all are on child peaks)
- The count is purely denormalized/derived

---

## Recommendations

### Immediate Actions (Data Repair)

1. **Recalculate all route_count values** via migration:
   ```sql
   -- Clear all route_counts
   UPDATE areas SET route_count = 0;
   
   -- Recalculate by triggering the aggregation
   SELECT areas_set_path();  -- This will trigger re-aggregation
   ```

2. **Verify Boston Basin assignment**:
   - Check if routes for Forbidden Peak and other peaks are correctly assigned to wa_boston_basin children
   - Consider whether Boston Basin should declare 1 (only a placeholder) or 19 (all nested peaks)

3. **Verify Chilliwack Range assignment**:
   - Routes currently declared 0 but 9 exist
   - Ensure these are intentionally under this area

### Verification Actions

1. **Run a full hierarchy recount** after any corrections to ensure:
   - Parent route_count = SUM of all leaf route counts in subtree
   - No non-leaf areas have routes directly assigned
   - All routes reference valid leaf areas

2. **Add data validation** to the migration/ETL pipeline:
   - After loading/updating routes, verify route_count aggregation
   - Alert on any mismatches > 1 route difference
   - Log affected areas for manual review

### Schema Recommendations

Consider adding a database view to detect future issues:

```sql
-- View: detect_count_mismatches
SELECT 
  a.id,
  a.name,
  a.route_count as declared_count,
  (SELECT COUNT(*) FROM routes r 
   WHERE r.area_id = a.id) as direct_routes,
  (SELECT COUNT(*) FROM routes r 
   JOIN areas a2 ON r.area_id = a2.id 
   WHERE a2.path <@ a.path) as recursive_routes
FROM areas a
WHERE a.route_count != (
  SELECT COUNT(*) FROM routes r 
  JOIN areas a2 ON r.area_id = a2.id 
  WHERE a2.path <@ a.path
);
```

---

## Hierarchy Integrity Summary

### What's Correct
- ✓ No orphaned routes (all routes link to valid areas)
- ✓ No non-leaf/parent violations (areas are cleanly categorized)
- ✓ Breadcrumb paths (ltree) are correct
- ✓ Parent-child references are valid
- ✓ 37 NC Core peaks all have correct individual route counts

### What Needs Fixing
- ✗ Root-level aggregation counts are stale/incorrect
- ✗ 3 areas have significant route_count mismatches
- ✗ No systematic way to detect/prevent these in the future

---

## Testing Checklist

After applying fixes:

- [ ] Run `node audit_nc_clean.mjs` - should show all counts matching
- [ ] Verify wa_north_cascades total = 58 (NC Core) + 1 (Alpine) + 1 (Mamie) + 19 (Boston Basin) + 9 (Chilliwack) + 2 (Twin Sisters) = 90 total
- [ ] Check that parent route_count update is reflected in queries
- [ ] Verify UI route counts match for spot-check peaks
- [ ] Test that new routes added to any child area trigger parent count update

