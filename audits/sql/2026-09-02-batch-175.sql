-- WA alpine audit batch 175 (pass 3, final batch of this pass)

-- wa_washington_ellinor_traverse_ridge: Mount Washington's summit elevation is stated
-- THREE different ways within this one row. The correct figure, confirmed via Wikipedia
-- ("Mount Washington (Olympics)", 6,260 ft) and matching this route's own primary fields
-- (top-level high_point_ft: 6260, and the "Mount Washington - Summit" waypoint: elev/elevFt
-- 6260), is 6,260 ft. Two other spots in the row disagree with the route's own correct
-- figure and with each other: access._raw.altitude_restrictions says "6,278 feet", and
-- approach_variants[0].notes ends a sentence with "...to the 6,255 ft summit." Neither
-- 6,278 nor 6,255 matches any external source found; both read as copy/paste slips from an
-- enrichment pass rather than a second convention (unlike e.g. West Craggy Peak's
-- independently-citable 8366/8372 split, which CLAUDE.md's batch-110 note explicitly left
-- alone). Corrected both nested strings to agree with the row's own confirmed value.
UPDATE routes
SET access = jsonb_set(
      access,
      '{_raw,altitude_restrictions}',
      '"Mount Washington summit 6,260 feet; day hike accessible year-round (3.2-mile out-and-back)"'::jsonb)
WHERE id = 'wa_washington_ellinor_traverse_ridge'
  AND access->'_raw'->>'altitude_restrictions' = 'Mount Washington summit 6,278 feet; day hike accessible year-round (3.2-mile out-and-back)';

UPDATE routes
SET approach_variants = jsonb_set(
      approach_variants,
      '{0,notes}',
      to_jsonb(replace(approach_variants->0->>'notes', '6,255 ft summit', '6,260 ft summit')))
WHERE id = 'wa_washington_ellinor_traverse_ridge'
  AND approach_variants->0->>'notes' LIKE '%6,255 ft summit%';

-- wa_west_face_2 (West Face, North Peak / Gunsight Range): this is the SAME stale
-- "data/geocoding error" claim in `approach` that CLAUDE.md's audit log records as fixed
-- in pass 2, batch 110 (audits/sql/2026-08-13-batch-110.sql) -- but the live row still
-- carries the original unfixed text verbatim, so that SQL was apparently never applied to
-- the database. Re-verified the underlying claim is still false today: the area's live
-- coordinates (48.3068, -120.994) match Wikipedia's Gunsight Peak entry (48.30667N,
-- 120.99389W) to four decimal places, correctly placing it near Dome Peak in the Glacier
-- Peak Wilderness -- nowhere near Washington Pass (48.52, -120.66). Re-applying batch 110's
-- exact fix (which also resolves that batch's "South Peak's granite faces" cross-
-- contamination flag by rewording to "the peak's granite faces").
UPDATE routes
SET approach = 'The Gunsight Range is a remote granite sub-range near Dome Peak in the Glacier Peak Wilderness. The genuine standard approach is from the Downey Creek Trailhead (off Suiattle River Road) via the southern end of the Ptarmigan Traverse — a rugged, largely off-trail alpine route over Itswoot Ridge/Cub Lake and Bachelor Creek involving glacier travel and significant bushwhacking. Climbers typically budget a full day (or two) of approach before reaching the base of the peak''s granite faces. This is an experienced-mountaineers-only objective, not a roadside crag.'
WHERE id = 'wa_west_face_2'
  AND approach LIKE 'Note: this area''s stored coordinates place it at Washington Pass%';
