# Quick Start: Importing Watch_out Hazard Data

## Prerequisites

```bash
cd /Users/nathanbarber/dev/Climbing-App
npm install  # if not already done
```

## 1. Validate Data

Before importing, always validate the JSON data:

```bash
cat ice_route_watch_out_data.json | node .claude/worktrees/photos-topo-waypoints/verify_watch_out_data.mjs
```

Expected output should show:
- Valid routes count
- No critical errors
- 4-8 hazards per route on average

## 2. Test Import (Dry Run)

Test the import without making changes:

```bash
cat ice_route_watch_out_data.json | node .claude/worktrees/photos-topo-waypoints/batch_update_watch_out.mjs --dry-run --verbose
```

This will:
- Validate each route
- Show which routes would be updated
- NOT make any database changes

## 3. Generate SQL Migration (Optional)

For production deployments, generate a SQL migration file:

```bash
cat ice_route_watch_out_data.json | node .claude/worktrees/photos-topo-waypoints/generate_watch_out_migration.mjs > /tmp/watch_out_updates.sql
```

Review the SQL before running in production.

## 4. Import to Database

Once validated, import the data:

```bash
cat ice_route_watch_out_data.json | node .claude/worktrees/photos-topo-waypoints/batch_update_watch_out.mjs --verbose
```

Monitor output:
- Should show success count
- Any failures will be listed with errors
- Process may take a few seconds for 100+ routes

## 5. Verify in Database

After import, verify the data:

```bash
cd /Users/nathanbarber/dev/Climbing-App
node .claude/worktrees/photos-topo-waypoints/query_watch_out_comprehensive.mjs
```

Should show:
- Updated coverage percentages
- Ice routes with watch_out > 0%
- Sample hazard descriptions

## Data Format

All watch_out data must be valid JSON with structure:

```json
[
  {
    "id": "route_slug",
    "watch_out": [
      "Hazard 1: details",
      "Hazard 2: details"
    ]
  }
]
```

See `ice_route_watch_out_examples.json` for examples.

## Troubleshooting

### Import hangs or times out
- Try smaller batch sizes (edit batch_update_watch_out.mjs line: batchSize: 5)
- Check network connection to Supabase

### Validation fails
- Run verify_watch_out_data.mjs to see specific errors
- Check JSON format (no trailing commas, proper escaping)
- Ensure all route IDs exist in database

### Database updates fail
- Check API key environment variables
- Verify route IDs are correct (case-sensitive)
- Try dry-run first to see what would happen

### Watch_out shows empty in UI
- Verify routes were actually updated (query database)
- Restart dev server (npm run dev)
- Check browser console for errors

## Support Files

- `ice_route_watch_out_examples.json` — complete example data
- `WA_ICE_ROUTE_HAZARD_GUIDE.md` — hazard reference
- `WATCH_OUT_RESEARCH_PLAN.md` — detailed strategy
- `IMPLEMENTATION_CHECKLIST.md` — full checklist

## Next Steps

1. Run research agent to collect hazard data
2. Validate data with verify script
3. Test import with dry-run
4. Import to database
5. Verify coverage with query script
6. Test UI display on route detail page

---

For detailed information, see WATCH_OUT_RESEARCH_PLAN.md
