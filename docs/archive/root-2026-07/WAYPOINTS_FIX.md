# Weather Forecast Waypoints Fix

## Issue
Routes without waypoints cannot display weather forecasts in the Safety tab. The weather API requires specific geographic points (trailhead, waypoints, summit) to generate forecasts.

## Routes Missing Waypoints
- `wa_south_twin_sister_west_ridge` - Alpine Grade II-III
- `wa_south_twin_sister_north_ridge` - Alpine Grade III
- `wa_south_twin_sister_scramble` - Scrambling Class 3

And potentially many other routes in the database.

## Solution

### Prerequisites
You need Supabase credentials:
```bash
export VITE_SUPABASE_URL="your-supabase-url"
export VITE_SUPABASE_ANON_KEY="your-supabase-anon-key"
```

### Option 1: Automatic Fix (Recommended)
Run the enhanced script that finds ALL routes missing waypoints and adds minimal waypoints:

```bash
node add-waypoints-auto.mjs
```

This will:
1. Find all routes with null/empty waypoints
2. Extract available location data (start coords, peak coords, elevation)
3. Create basic Trailhead and Summit waypoints
4. Update the database

### Option 2: Manual Fix
Update the routes directly in Supabase with the waypoint data below.

## South Twin Sister Waypoint Data

**CORRECTED 2026-07-15:** the coordinates originally listed here (lat 48.5069/48.5197, lng -121.6708/-121.6542) were wrong by ~20 miles — verified against Wikipedia/Peakbagger, the real South Twin Sister (7,004 ft, Twin Sisters Range) sits at approximately **48.7669,-122.0394** (trailhead: Middle Fork Nooksack River Bridge / FR 38 Gate) to **48.7049,-121.9874** (summit). This matches the area's own registered coordinates and the recorded GPX tracks already on these routes — do not reuse the old numbers below for any future route on this peak.

### wa_south_twin_sister_west_ridge
Already correct in the live DB (not from this doc) — Trailhead 48.7669,-122.0394 (1,200 ft) → Summit 48.7049,-121.9874 (7,004 ft), distMi 12. See the route's live `waypoints` for the full multi-point chain (Dailey Prairie, Orsino Creek Crossing, West Ridge Notch, False Summit Dihedral).

### wa_south_twin_sister_north_ridge
Fixed in the live DB — Trailhead 48.7669,-122.0394 (same as West Ridge) → Summit 48.7049,-121.9874 (7,004 ft), distMi ~9.5. Its recorded gpx track (47 points, previously incorrectly cleared then restored) confirms this location.

### wa_south_twin_sister_scramble
This route id no longer exists in the live catalog as of 2026-07-15 (removed/renamed by other concurrent work) — nothing to fix.

## Testing the Fix

1. Set Supabase credentials and run the fix script
2. Start the dev server: `npm run dev`
3. Navigate to Climbs > Washington > North Cascades
4. Search for "South Twin Sister" route
5. Open route detail and check Safety tab
6. Weather forecast should now appear with AM/PM/Night forecasts

## Broader Strategy

This fix adds minimal waypoints (Trailhead + Summit) to all routes lacking them. For routes with better data available (intermediate waypoints, bailout points, camps), enrich them with the wa-enrich-batch skill:

```
/wa-enrich-batch south_twin_sister_west_ridge south_twin_sister_north_ridge south_twin_sister_scramble
```

This will:
1. Research actual approach routes, waypoints, and hazards
2. Add detailed waypoint arrays with intermediate stops
3. Improve forecasts by providing multiple forecast locations
