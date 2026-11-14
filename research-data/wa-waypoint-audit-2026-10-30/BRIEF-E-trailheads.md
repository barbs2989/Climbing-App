# Batch E: every WA alpine trailhead pin against its published coordinate

Read BRIEF.md first; its rules all apply. Your input is `trailheads-E<N>.json`. Each entry is one
distinct stored trailhead coordinate `{lat, lng, pins:[{id, i, name, elev}], text}`. `text` is the
first pin's driving directions, which tell you which trailhead it means.

For EACH entry:
1. Identify the trailhead (name plus directions) and find its PUBLISHED coordinate. WTA hike pages
   print "Co-ordinates" for the trailhead; search `site:wta.org <trailhead name>`. USFS, NPS and
   Recreation.gov pages also give them, and GNIS layer 5 sometimes holds a named "Trailhead". Use
   two sources when you can.
2. Measure the stored coordinate's distance from it (haversine).
   - Within 150 m: `none`. Record the published coordinate and distance in `reason`, so the
     verification is on file.
   - Further off and clearly the same trailhead: `move` to the published coordinate, with source
     and quote. Check its 3DEP ground height against the pin's `elev` (stay within 300 ft, or say
     why). Give one decision entry per pin (route id plus pin index) in the entry, each with `from`
     equal to the stored [lat, lng] and `name` copied exactly.
   - Washout and road-closure parking, climbers' pullouts and other spots no source publishes:
     `none` with "no published coordinate". Do the same when the route text describes a different
     spot from the one the published coordinate marks.
   - No source found in reasonable time: `none`, with "unverified" in reason.
3. Spend at most about 3 searches per trailhead. Many share one WTA page, so reuse what you find.

Output `decisions-E<N>.json`, an array of decision entries in BRIEF.md's format. Include one `none`
entry per distinct coordinate. You need not repeat it for every pin; use the first pin's id and i,
and add `"coordinate_key": "lat,lng"`. Every `move` needs one entry PER PIN. Reply with counts
(verified within 150 m / moved / unpublished / unverified) and a table of the moves only.
