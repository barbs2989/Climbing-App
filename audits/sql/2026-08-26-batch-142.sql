-- WA alpine audit — batch 142 (2026-08-26, pass 3)
-- Routes: wa_mount_anderson_eel_glacier (Mount Anderson), wa_mount_baker_boulder_glacier,
-- wa_mount_baker_boulder_park_cleaver, wa_mount_baker_cockscomb_ridge,
-- wa_mount_baker_coleman_deming, wa_mount_baker_coleman_headwall,
-- wa_mount_baker_easton_glacier, wa_mount_baker_north_ridge (Mount Baker).
-- All WHERE clauses include the current (wrong) value as a safety check
-- per project convention.

-- =========================================================================
-- Mount Baker — Glacier Creek Road (FR 39) / Heliotrope Ridge Trailhead
-- =========================================================================
-- Four sibling routes on this same trailhead (Cockscomb Ridge, Coleman-Deming,
-- Coleman Headwall, North Ridge) each stored a DIFFERENT, mutually
-- inconsistent characterization of the December 2025 flood washout: two said
-- "repair work through the end of October 2026", one said repairs would
-- begin "after July 15, 2026, targeting reopening by late September 2026",
-- and one said "the Forest Service has not announced a repair timeline" --
-- the audit:trailhead-road shape (routes sharing one trailhead disagreeing
-- about whether the road is open), on a road that in fact reopened weeks
-- before any of those projected dates. Confirmed via the Mt. Baker-Snoqualmie
-- NF's own press release ("Forest Service Has Opened Glacier Creek Road")
-- and corroborated by Cascadia Daily News ("Glacier Creek Road reopens
-- following washout repairs", Aug 20, 2026): the road fully reopened to
-- vehicles on August 20, 2026. All four rows updated to the same, current
-- status; driveNote and seasonalGate reconciled to match.

UPDATE routes SET
  road = jsonb_set(
    jsonb_set(road, '{status}', to_jsonb('Reopened to vehicles as of August 20, 2026: the Mt. Baker-Snoqualmie National Forest completed repairs to the Glacier Creek bridge washout (~MP 3.0) caused by the December 2025 flood. Check current USFS alerts before a trip in case of new seasonal damage.'::text)),
    '{driveNote}', to_jsonb('Drive Glacier Creek Road (FR 39) to its end at the Heliotrope Ridge Trailhead. No washout detour is currently required.'::text)
  )
WHERE id = 'wa_mount_baker_cockscomb_ridge'
  AND road->>'status' = 'Closed to vehicles at the Glacier Creek bridge (~MP 3.0), roughly 5 miles below the trailhead, due to December 2025 flood damage. Repairs scheduled to begin after July 15, 2026, targeting reopening by late September 2026 (subject to change).';

UPDATE routes SET
  road = jsonb_set(
    jsonb_set(
      jsonb_set(road, '{status}', to_jsonb('Reopened to vehicles as of August 20, 2026: the Mt. Baker-Snoqualmie National Forest completed repairs to the Glacier Creek bridge washout (~MP 3.0) caused by the December 2025 flood. Check current USFS alerts before a trip in case of new seasonal damage.'::text)),
      '{driveNote}', to_jsonb('Drive Glacier Creek Road (FR 39) to its end at the Heliotrope Ridge Trailhead. No washout detour is currently required.'::text)
    ),
    '{seasonalGate}', to_jsonb('Typically drivable late May through October, snowpack permitting.'::text)
  )
WHERE id = 'wa_mount_baker_coleman_deming'
  AND road->>'status' LIKE 'Closed to vehicles at the Glacier Creek bridge (roughly MP 3.0, about 5 miles below the trailhead) since the December 2025 flood (repeat of a 2021 washout), for scheduled repair work through the end of October 2026%';

UPDATE routes SET
  road = jsonb_set(
    jsonb_set(
      jsonb_set(road, '{status}', to_jsonb('Reopened to vehicles as of August 20, 2026: the Mt. Baker-Snoqualmie National Forest completed repairs to the Glacier Creek bridge washout caused by the December 2025 flood. Check current USFS alerts before a trip in case of new seasonal damage.'::text)),
      '{driveNote}', to_jsonb('Drive Glacier Creek Road (FR 39) to its end at the Heliotrope Ridge Trailhead. No washout detour is currently required.'::text)
    ),
    '{seasonalGate}', to_jsonb('Typically snow-free and drivable late May through October.'::text)
  )
WHERE id = 'wa_mount_baker_coleman_headwall'
  AND road->>'status' LIKE 'Washed out roughly 4.5 miles below the trailhead since the December 2025 flood (a repeat of a 2021 washout)%';

UPDATE routes SET
  road = jsonb_set(
    jsonb_set(
      jsonb_set(road, '{status}', to_jsonb('Reopened to vehicles as of August 20, 2026: the Mt. Baker-Snoqualmie National Forest completed repairs to the Glacier Creek bridge washout (~MP 3.0) caused by the December 2025 flood. Check current USFS alerts before a trip in case of new seasonal damage.'::text)),
      '{driveNote}', to_jsonb('Drive Glacier Creek Road (FR 39) to its end at the Heliotrope Ridge Trailhead. No washout detour is currently required.'::text)
    ),
    '{seasonalGate}', to_jsonb('Typically drivable late May through October, snowpack permitting.'::text)
  )
WHERE id = 'wa_mount_baker_north_ridge'
  AND road->>'status' LIKE 'Closed to vehicles at the Glacier Creek bridge (roughly MP 3.0, about 5 miles below the trailhead) since the December 2025 flood (repeat of a 2021 washout), for scheduled repair work through the end of October 2026%';

-- =========================================================================
-- Mount Anderson (wa_mount_anderson) — wa_mount_anderson_eel_glacier
-- =========================================================================
-- No confirmed error. high_point_ft=7330 for the East Peak matches the
-- figure cited on Wikipedia's Mount Anderson (Washington) page (citing
-- USGS); West Peak at 7,365 ft as the massif's true high point (not
-- reached by this route) also checks out. The row's own data_quality.gaps
-- already discloses the elevation-varies-by-source uncertainty honestly --
-- no fix needed. FA (1920, Fairman B. Lee + 13-person party) not
-- independently re-confirmed this pass; no contradicting source found.

-- =========================================================================
-- Mount Baker (wa_mount_baker) — remaining routes in this batch
-- =========================================================================
-- wa_mount_baker_boulder_glacier, wa_mount_baker_boulder_park_cleaver,
-- wa_mount_baker_easton_glacier: no confirmed error this pass.
--
-- wa_mount_baker_cockscomb_ridge FA (Chuck Murley, John Musser, E. Vielbig,
-- July 4, 1961) corroborated by an AAC Publications article on the route
-- (American Alpine Club archive), whose author appears to be Vielbig --
-- matches the third-party name on file.
--
-- wa_mount_baker_coleman_headwall FA (Ed Cooper, Phil Bartow, Donald
-- Grimlund, David Nicholson, August 1957) -- NOT independently confirmed
-- this pass; no corroborating or contradicting source turned up in a web
-- search. Flagged needs-human-verification rather than fixed or guessed.
--
-- wa_mount_baker_boulder_glacier FA text already self-disqualifies
-- ("specific individuals not confirmed in available sources") -- correctly
-- hedged on file already, no fix needed.
