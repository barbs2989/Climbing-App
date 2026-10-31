-- Mount Crowder, Southwest Route (wa_mount_crowder_southwest_route): fa field carried
-- "Cal Magnusson, Jack Ardussi, Don Mech, and Don Schmechel, 1962 (first ascent of the
-- peak)" directly contradicting this same row's own corrections field, which explains
-- that the 1962 FA climbed the NE Ridge line, not this Southwest Route/SW Flank, so
-- "no 'fa' credit is attached to this route entry". The fa field was never actually
-- cleared to match that correction. Nulled it; the FA stays documented in the row's
-- overview/corrections text as peak history, just not attributed to this specific line.
update routes set fa = null
  where id = 'wa_mount_crowder_southwest_route';
