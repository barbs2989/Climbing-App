-- Strip `verif.source` from routes. The app carries no sources, and this one was worse than a
-- citation: on 13 rows it held an internal review note that both named sources and leaked working
-- language straight at climbers, rendered on the route page as "Unverified · <note>":
--
--   "Could not verify this specific WA 'Needle Peak' South Route via Mountain Project, SummitPost,
--    or guidebook search…"
--   "…recommend spot-checking this route_id"
--   "Identity review 2026-07-30: core content (waypoints, FA, itinerary, descent, access) matches…"
--
-- The STATUS is kept and still renders — it is the only place the route page discloses that a
-- route's data is unchecked, and removing that signal to remove the citation would be the wrong
-- trade. `VerifNote` now prints the status alone, and stops calling a community-reported route
-- "Unverified", which it did for every status that was not literally "verified".
--
-- Only the one key is removed; the rest of the verif object is untouched.

update routes
set verif = verif - 'source'
where verif ? 'source';
