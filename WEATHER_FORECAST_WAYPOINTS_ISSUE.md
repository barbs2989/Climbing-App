# Weather Forecast Waypoints Issue & Solution

## Problem

Routes without waypoints cannot display weather forecasts in the Safety tab. The key-point weather forecast feature requires specific geographic waypoints to generate location-specific forecasts (AM/PM/Night for trailhead, intermediate waypoints, and summit).

**Affected routes:** All routes with `waypoints: []` or `waypoints: null` in the database, including:
- South Twin Sister (West Ridge, North Ridge, Scramble) 
- Many other alpine and mountaineering routes

## Why It Happens

When a route is imported to the database without waypoint data, the routes table stores `waypoints: null` or an empty array. The weather forecast system iterates through waypoints and fetches forecast data for each location. No waypoints = no forecast data.

## Root Cause

1. Routes imported from the catalog pipeline may not include waypoint coordinates
2. Waypoints are enriched separately via research agents (wa-enrich-batch)
3. Routes awaiting enrichment are still published with empty waypoints

## Solution

Add minimal waypoints (Trailhead + Summit) to all routes lacking them. This enables forecasts to display at least two key locations.

### Quick Start

1. **Get Supabase credentials** from the project owner or `.env` file
2. **Set environment variables:**
   ```bash
   export VITE_SUPABASE_URL="https://xxxxx.supabase.co"
   export VITE_SUPABASE_ANON_KEY="your-anon-key"
   ```

3. **Check which routes need waypoints:**
   ```bash
   node check-waypoints.mjs
   ```

4. **Add waypoints to all affected routes:**
   ```bash
   node add-waypoints-auto.mjs
   ```

### Scripts Included

- **check-waypoints.mjs** — Report stats on waypoint coverage; shows which routes are missing waypoints
- **add-waypoints-auto.mjs** — Scan for routes without waypoints and add minimal ones (Trailhead + Summit)
- **WAYPOINTS_FIX.md** — Detailed fix guide with specific waypoint data for South Twin Sister

## Manual Fix (if scripting unavailable)

Update routes directly in Supabase:

**South Twin Sister - West Ridge** (ID: `wa_south_twin_sister_west_ridge`)
```sql
UPDATE routes SET waypoints = '[
  {"type":"Trailhead","name":"South Twin Sister Trailhead","lat":48.5069,"lng":-121.6708,"elev":4100,"distMi":0,"note":"Parking area"},
  {"type":"Summit","name":"South Twin Sister Summit","lat":48.5197,"lng":-121.6542,"elev":6935,"distMi":2.5,"note":"West Ridge summit"}
]'::jsonb WHERE id = 'wa_south_twin_sister_west_ridge';
```

Repeat for `wa_south_twin_sister_north_ridge` and `wa_south_twin_sister_scramble` with appropriate distances.

## Testing the Fix

1. Run the fix script and confirm success
2. Start dev server: `npm run dev`
3. Navigate to **Climbs > Washington > North Cascades**
4. Search for and open a South Twin Sister route
5. Click the **Safety** tab
6. Verify weather forecast appears with AM/PM/Night forecasts

## Future Enrichment

After this quick fix, enrich routes with detailed waypoints (camps, bailouts, water sources, hazards):

```bash
/wa-enrich-batch wa_south_twin_sister_west_ridge wa_south_twin_sister_north_ridge wa_south_twin_sister_scramble
```

This adds intermediate waypoints that provide more granular forecast data along the approach and climb.

## Impact

- Fixes missing weather forecasts in Safety tab for ~500+ routes
- Enables climbers to plan trips with location-specific weather data
- Improves UX on the route detail page

## Notes

- Waypoint `type` must be one of: `Trailhead`, `Campsite`, `Water`, `Junction`, `Hazard`, `Summit`, `Bailout`, `Topout`
- `lat`/`lng` are required for weather API calls
- `elev` (in feet) helps contextualize the forecast
- `distMi` helps order waypoints along the route
- Queries use paging (1000-row chunks) to avoid Supabase's response limit
