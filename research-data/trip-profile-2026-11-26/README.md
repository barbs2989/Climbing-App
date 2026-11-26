# Trip profile research pass (owner note, 2026-11-26)

"Is trip profile on all routes that it should be on? Even if there's no data on it? ... Then do a full
research pass to try and fill that section out for all pertinent routes."

A route's TRIP PROFILE comes from its waypoints: each one's published distance from the trailhead
(`distMi`, miles) and height (`elev`, feet). So the research is filling those two fields on existing waypoints.

## Where it stands

Code (all merged): #4052, #4056, #4057, #4061 and #4064 take the routes that draw a profile from 128 to
754+ without any new data, and show the section, empty, on every other mountain route.

Research: `results/*.json` holds what Sonnet agents found (brief: `AGENT-BRIEF.md`) for:
- worklist 1 (463 routes, batches 001-004 and 015-018 run, the rest superseded by the code changes);
- `worklist2/` (152 routes; batches 003-004 run);
- `worklist3/` (59 routes needing only the summit's distance; all 6 batches run).
About 45 values were found, mostly summit distances. Yield was about 1 route in 5, because SummitPost,
The Mountaineers and Mountain Project refuse automated reads. `REJECTED.json` lists the results that
were reviewed and not applied (6 routes).

**NOT YET WRITTEN TO THE DATABASE**: the database was slow when the research finished (dbslot check
failed twice, 1.7 s and 2.7 s probes).

## To apply (from a worktree with .env/.env.local symlinked)

```bash
node ~/dev/db-throttle/dbslot.mjs acquire <session-id>      # wait for GRANTED, then:
node ~/dev/db-throttle/dbslot.mjs check                      # must exit 0
node scripts/oneoff/apply-trip-profile-distances.mjs --dry --reject research-data/trip-profile-2026-11-26/REJECTED.json research-data/trip-profile-2026-11-26/results/*.json
node scripts/oneoff/apply-trip-profile-distances.mjs --reject research-data/trip-profile-2026-11-26/REJECTED.json research-data/trip-profile-2026-11-26/results/*.json
node ~/dev/db-throttle/dbslot.mjs release <session-id>
```

The apply only fills a BLANK `distMi` or `elev`. It refuses a value with no source URL, a value whose stored
waypoint name changed, and a distance shorter than the straight line from the trailhead. It saves a rollback
JSON under `scripts/`, paces its writes, stops on a write slower than 10 s, and re-reads every row.

## Out of scope, decided

- 4,309 mountain routes have NO waypoints, and almost no approach data at all (12 have a distance, 2 have
  camps, 33 have an itinerary). Building their whole approach record is a full enrichment, not this
  section's fill. They show the empty TRIP PROFILE with its "Add waypoints and distances" button.
- 19 routes where a stated waypoint lies past the route's own distance (the two records disagree), and
  2 with a summit stored at 0 mi: these need a correction, not a fill, so they were left alone.
