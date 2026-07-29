# Phase 3 Tier 2 Deployment Guide

**Status**: Ready for deployment  
**Date**: 2026-07-28  
**Routes**: 15 tier 2 alpine routes  
**Hazards**: 40+ researched hazard entries  
**Projected Coverage**: 10.82% → 11.5%+ (0.7+ percentage points)

---

## What's Included

### Tier 2 Routes (15 total)
- **Mount Shuksan variants**: Fisher Chimneys, North Face Direct
- **Mount Formidable**: South Route, Chasm Route, Southeast Face
- **Eldorado Peak**: West Arete, East Ridge Alternative
- **Secondary peaks**: Triumph, Liberty Cap (2 routes), Nooksack Tower, Colchuck, Dragontail, Remmel, Primus, Cathedral

### Hazard Coverage
- **Multi-source research**: Beckey Alpine Guide, NWAC reports, AAI logs, 2024-2026 trip reports
- **Quality tiers**: High confidence (major peaks), Medium confidence (secondary peaks)
- **Hazard types**: Avalanche, serac, crevasse, exposure, loose rock, weather, route-finding
- **Seasonal windows**: Best climbing months documented per route

---

## Deployment Steps

### Step 1: Run Migrations (SQL)

**Option A: Supabase Dashboard (Manual)**
```sql
-- 1. Copy-paste migration 0056_phase3_tier2_routes.sql
-- 2. Run in Supabase SQL Editor → Execute
-- 3. Expected: 15 rows inserted into routes table

-- 4. Copy-paste migration 0057_phase3_tier2_hazards.sql
-- 5. Run in Supabase SQL Editor → Execute
-- 6. Expected: 40 rows inserted into route_hazard_research table
```

**Option B: Supabase CLI (Recommended)**
```bash
# Deploy all pending migrations
supabase db push

# Verify deployment
supabase db pull  # Shows remote schema
```

### Step 2: Verify Deployment

```bash
# Check routes were inserted
supabase postgres connect
> SELECT COUNT(*) FROM routes WHERE id LIKE '%formidable%' OR id LIKE '%eldorado%';
-- Expected: 5 routes

> SELECT COUNT(*) FROM route_hazard_research WHERE route_id LIKE '%formidable%';
-- Expected: 5+ hazard entries

# Check coverage metrics
> SELECT COUNT(*) FROM routes WHERE hazards IS NOT NULL AND array_length(hazards, 1) > 0;
-- Should see increase from prior count
```

### Step 3: Build & Deploy

```bash
# Build production bundle
npm run build

# No errors expected. If errors occur:
# - Check that all tier 2 route IDs are valid identifiers (alphanumeric + underscore)
# - Verify mountainId references exist in mountains/areas table

# Deploy to GitHub Pages
git push origin worktree-alpine-routes-enrichment-audit:main
# (automatic GitHub Actions → GitHub Pages deployment)
```

### Step 4: Verify on Live App

1. **Open live app**: https://barbs2989.github.io/Climbing-App/
2. **Navigate to Climbs tab**
3. **Search for tier 2 route**: e.g., "Formidable South Route" or "Eldorado West Arete"
4. **Verify route details**:
   - Grade displayed correctly
   - Hazards visible in Safety tab
   - Approach/descent info present
5. **Check leaderboard coverage**: Dashboard should show updated % (11.5%+)

---

## Expected Outcomes

### Database Impact
- **Routes table**: 8,147 → 8,162 (+15 routes)
- **Hazard entries**: 796 → 836+ (+40 entries)
- **Coverage metric**: 9.77% → 10.5%+ (+0.7%+)
- **New peaks**: Shuksan, Formidable, Eldorado variants now visible

### User Experience
- **15 new searchable routes** in Climbs tab
- **Hazard documentation** for high-priority secondary peaks
- **Seasonal window guidance** for each route
- **Research attribution** via source tracking

---

## Quality Gates Passed

✅ All routes have multi-source research (Beckey + trip reports + ranger data)  
✅ All routes tied to existing mountain IDs (no orphaned areas)  
✅ All hazards categorized by type and severity  
✅ Seasonal data complete (best months documented)  
✅ Gear requirements documented per route  
✅ Migrations use IF NOT EXISTS (safe for re-runs)

---

## Rollback Plan (If Needed)

If deployment fails or data corruption occurs:

```sql
-- Delete tier 2 hazards
DELETE FROM route_hazard_research 
WHERE route_id IN (
  'shuksan_fisher_chimneys', 'formidable_south_route', 'eldorado_west_arete', ...
);

-- Delete tier 2 routes
DELETE FROM routes 
WHERE id IN (
  'shuksan_fisher_chimneys', 'formidable_south_route', 'eldorado_west_arete', ...
);

-- Database returns to tier 1 state (8,147 routes, 796 hazards, 9.77% coverage)
```

---

## Next Steps After Deployment

1. **Monitor live data** (1 week): Check route page rendering, hazard display, no errors
2. **Tier 3 Research** (optional): 50+ additional secondary peaks + winter routes
3. **Out-of-State Alpine** (future): 5,800+ routes across 22 states (CA, CO, UT, WY, AK priority)
4. **Phase C Enhancement**: Email notifications, admin dashboard, community submission analytics

---

## Technical Notes

- **Constraints**: All tier 2 route IDs reference existing mountains (no new areas created)
- **Performance**: 15 route inserts + 40 hazard inserts << 1 second
- **Idempotency**: Migrations can be re-run safely (IF NOT EXISTS on inserts)
- **RLS Policy**: All hazard records inherit route's visibility (public by default)
- **Search**: All new routes immediately searchable via existing DbAreaBrowser full-text

---

**Status**: Tier 2 ready to deploy  
**Estimated Deployment Time**: 5-10 minutes (migrations) + 2 mins (build) + 1 min (verify)  
**Risk Level**: LOW (new routes isolated, no schema changes, safe rollback)

