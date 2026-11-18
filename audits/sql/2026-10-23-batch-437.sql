-- wa_mount_stuart_west_ridge: access->notes contradicts this same row's own permit
-- field. notes is the Enchantment overnight-lottery boilerplate verbatim from the
-- north-side Stuart routes (Girth Pillar's access->notes is word-for-word identical:
-- "2026 lottery application window Feb 15-Mar 1 (results after Mar 17, accept/pay by
-- Mar 31) ... Season requiring the overnight permit: May 15-Oct 31 ..."), but West
-- Ridge's own top-level permit column already says the opposite and correctly so:
-- "The Esmeralda Basin / Ingalls Creek approach is outside the Enchantment Permit
-- Area, so no lottery permit applies." Its own access->overnight_permit.where agrees
-- too ("North-side approaches from the Stuart Lake trailhead are inside the
-- Enchantment Permit Area and need that permit instead"). So the lottery-window text
-- in notes was copy-pasted from a sibling route without checking it against this row's
-- own permit/overnight_permit fields. Replaced with a notes string that agrees with
-- the rest of the row instead of contradicting it; no new research, no field model
-- didn't already support elsewhere in this same row.
UPDATE routes
SET access = jsonb_set(
  access,
  '{notes}',
  to_jsonb('This Esmeralda Basin / Ingalls Creek approach is outside the Enchantment Permit Area, so none of the Enchantment lottery dates or quotas apply here -- only the route''s own free self-issued Alpine Lakes Wilderness permit does. The Enchantment overnight lottery (May 15-Oct 31, applied for the preceding February) applies only to the alternative north-side approach/descent via the Stuart Lake trailhead (e.g. the early-season Sherpa Glacier option).'::text)
)
WHERE id = 'wa_mount_stuart_west_ridge'
  AND access->>'notes' LIKE '2026 lottery application window%';
