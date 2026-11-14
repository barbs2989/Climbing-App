# GPX tracks replaced from FastestKnownTime, 2026-10-28

Owner note: a stored track must run trailhead → summit → trailhead, and only a real recording may draw the line.

**Method**
1. Crawled FastestKnownTime's route index (7,799 routes) and kept the 839 slugs for WA, OR, CA, CO, WY, ID and MT.
2. Downloaded the GPS Track GPX of every page that has one (761 files).
3. Matched by geometry: a track is complete when it starts and ends within 300 m of the route's Trailhead pin and reaches within 300 m of its Summit pin (`scripts/audit-track-completeness.mjs`, rule copied in `scripts/oneoff/gpx-tracks-fkt/rule.mjs`).
4. Route identity was judged by a reviewer from the FKT page text (`review.json`, `verdict-*.json`). Geometry alone matched 154 pairs; the reviewer accepted 26 as the same route and rejected traverses, link-ups and other lines on the same peak.
5. Wrote the 20 accepted tracks that were still incomplete at write time, paced at 1,000 ms, with rollback saved and every row re-read (0 reconcile problems). The other 6 accepted routes were already complete on the day, so they were skipped.

**Written:** `decisions.json`. Rollback: `scripts/rollback-fkt-gpx-tracks-2026-10-28.json`.

**Not done:** about 546 incomplete routes have no FKT match. Their next source is other reputable sites, which needs its own batch and is not in this record.
