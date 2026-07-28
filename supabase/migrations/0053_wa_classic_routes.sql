-- 0053_wa_classic_routes.sql
-- First real data pass for the `classic` column added in 0052. Scope: a small,
-- deliberately conservative set of Washington standard/classic mountaineering
-- routes, verified by name against the live catalog before writing this file
-- (see PR for the verification transcript) rather than guessed. Each of these
-- is the well-established standard/easiest line up a well-known Cascades peak
-- -- the kind any Washington climber would name first -- and each name is
-- distinctive enough within Washington's catalog to match unambiguously.
--
-- This is intentionally a small starting set, not a comprehensive audit of
-- Washington's classics. Several strong candidates (Liberty Bell's Beckey
-- Route, The Tooth's South Face, Mount Stuart's North Ridge, Forbidden Peak's
-- West Ridge, Index/Vantage/Leavenworth rock classics) were investigated but
-- skipped here because the live search returned multiple same-named routes
-- across different crags/peaks and the route detail page doesn't surface a
-- reliable parent-area name to disambiguate from a script -- marking the
-- wrong one classic would misrepresent a real route, so they're left for a
-- follow-up pass that can verify area attribution directly (e.g. browsing
-- into the named area rather than a global route-name search).
--
-- One further candidate -- a route in the catalog named exactly
-- "Disappointment Cleaver / Sitkum Glacier" -- was also skipped: Sitkum
-- Glacier is a real feature on Mount Baker, not Rainier, so a route carrying
-- both names in one title looks like a data-entry issue (two routes merged,
-- or a copy-paste error) rather than a genuine route name. Worth a data-
-- quality look separately; not something to paper over by flagging it here.

update routes set classic = true
where area_id in (select id from areas where path <@ (select path from areas where id = 'washington'))
and name in (
  'Coleman–Deming Glacier',   -- Mount Baker's standard glacier route
  'Easton Glacier',           -- Mount Baker's other standard route, via the south side
  'Emmons–Winthrop Glacier',  -- Mount Rainier's most-climbed standard route
  'Kautz Glacier',            -- Mount Rainier's classic harder alternative to the DC
  'Cascadian Couloir'         -- Mount Stuart's standard/easiest route to the summit
);
