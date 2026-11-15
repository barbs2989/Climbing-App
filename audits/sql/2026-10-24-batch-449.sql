-- WA alpine/mountaineering audit — batch 449 (pass 7)
-- Reviewed 2026-10-24. Each fix below was cross-checked against at least one authoritative
-- source (see audits/wa-alpine-audit-log.md for the summary). These are PROPOSED fixes for
-- a human to review and run — not yet applied.

-- Remmel Mountain (wa_remmel_mountain): area row's elevation_ft stored as 8688 ft, but the
-- area's own blurb text already says "8,685 ft", and Wikipedia, SummitPost and Komoot all
-- independently give 8,685 ft (PeakVisor gives 8,684 ft, a one-foot rounding variant). No
-- source found gives 8,688. The two routes under this peak (NW Ridge, Southeast Slope) both
-- already store high_point_ft = 8685, i.e. the area row was the outlier.
update areas set elevation_ft = 8685 where id = 'wa_remmel_mountain';

-- Ruby Mountain (wa_ruby_mountain): area row's elevation_ft stored as 7426 ft, which matches
-- no source found. Wikipedia and PeakVisor both independently give 7,412 ft (NAVD 88). WTA
-- and several trip reports give 7,408 ft instead (an older/GPS-datum variant, normal
-- cross-source spread) -- notably the same 7,408 ft already stored in this peak's own
-- wa_ruby_mountain_happy_creek route row, left as-is. 7,426 ft is not supported by any
-- source checked.
update areas set elevation_ft = 7412 where id = 'wa_ruby_mountain';

-- Rock Mountain, West Route (wa_rock_mountain_west_route): the route's own data_quality.gaps
-- text says "treat 6,856 ft as approximate", but the route's own high_point_ft field holds
-- 6,852 ft (which matches mountaineers.org's Rock Mountain route page exactly) -- the note
-- was citing a different number than the field it was describing. Fixing the note's number
-- to match the stored value; not a claim that 6,852 ft is more "correct" than the area row's
-- 6,841 ft (Wikipedia/PeakVisor ~6,840 ft) -- summit elevation here still has a known small
-- cross-source spread, which the gaps text already says.
update routes
  set data_quality = jsonb_set(
    data_quality,
    '{gaps,0}',
    to_jsonb(replace(data_quality->'gaps'->>0, '6,856 ft', '6,852 ft'))
  )
  where id = 'wa_rock_mountain_west_route';
