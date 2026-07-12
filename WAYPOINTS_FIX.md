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

### wa_south_twin_sister_west_ridge
```json
[
  {
    "type": "Trailhead",
    "name": "South Twin Sister West Ridge Trailhead",
    "lat": 48.5069,
    "lng": -121.6708,
    "elev": 4100,
    "distMi": 0,
    "note": "Parking area for South Twin Sister approach"
  },
  {
    "type": "Summit",
    "name": "South Twin Sister Summit",
    "lat": 48.5197,
    "lng": -121.6542,
    "elev": 6935,
    "distMi": 2.5,
    "note": "West Ridge summit"
  }
]
```

### wa_south_twin_sister_north_ridge
```json
[
  {
    "type": "Trailhead",
    "name": "South Twin Sister North Ridge Trailhead",
    "lat": 48.5069,
    "lng": -121.6708,
    "elev": 4100,
    "distMi": 0,
    "note": "Parking area for South Twin Sister approach"
  },
  {
    "type": "Summit",
    "name": "South Twin Sister Summit",
    "lat": 48.5197,
    "lng": -121.6542,
    "elev": 6935,
    "distMi": 2.8,
    "note": "North Ridge summit"
  }
]
```

### wa_south_twin_sister_scramble
```json
[
  {
    "type": "Trailhead",
    "name": "South Twin Sister Scramble Trailhead",
    "lat": 48.5069,
    "lng": -121.6708,
    "elev": 4100,
    "distMi": 0,
    "note": "Parking area for South Twin Sister approach"
  },
  {
    "type": "Summit",
    "name": "South Twin Sister Summit",
    "lat": 48.5197,
    "lng": -121.6542,
    "elev": 6935,
    "distMi": 2.2,
    "note": "Class 3 scramble summit"
  }
]
```

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
