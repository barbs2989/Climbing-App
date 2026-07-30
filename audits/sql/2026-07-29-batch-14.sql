-- WA alpine/mountaineering audit — batch 14 (pass 1)
-- Reviewed 2026-07-29. Each fix below was cross-checked against at least one authoritative
-- source / the row's own internal data or sibling routes on the same peak (see
-- audits/wa-alpine-audit-log.md for the summary). These are PROPOSED fixes for a human to
-- review and run -- not yet applied. Continues the same scope/ordering as batches 1-13
-- (routes.discipline in ('alpine','mountaineering'), id like 'wa_%', area_type = 'peak').
-- Column types re-verified against supabase/migrations/*.sql before writing each statement.

-- Mount Goode, Megalodon Ridge (wa_goode_mountain_megalodon_ridge): the row's own `fa` field
-- claims "September 5-7, 2008 ... primary AAC/Alpinist coverage confirms 2008", contradicting
-- this same row's own `overview`/`beta` text (both say "first climbed September 6, 2007") and
-- the wa_mount_goode area blurb (also says "2007 Megalodon Ridge"). Verified externally:
-- Alpinist's contemporaneous newswire piece (published fall 2007, url path "web07f") and
-- Climbing.com's "Megalodon Man" account both directly document the ascent as September 6,
-- 2007. The AAC Publications article id referenced ("...12200813101") is from the American
-- Alpine Journal's 2008 annual, which reports on the prior (2007) climbing season -- the on-file
-- fa field appears to have mistaken that publication year for the ascent year. Corrected to the
-- externally-confirmed 2007 date, matching this row's own overview/beta and the area blurb.
update routes set fa =
  'Blake Herrington and Sol Wertkin, September 6, 2007 (previously listed here as 2008, which ' ||
  'was the American Alpine Journal''s publication year for its writeup, not the ascent year; ' ||
  'Alpinist''s 2007 newswire and Climbing.com''s contemporaneous account both confirm the climb ' ||
  'itself took place September 6, 2007)'
  where id = 'wa_goode_mountain_megalodon_ridge';

-- Mount Goode area blurb (wa_mount_goode): misspells 1936 first-ascent party member Othello
-- Philip "Phil" Dickert's surname as "Dickett". This row's own wa_goode_mountain_southwest_couloir
-- route (the 1936 FA route) already spells it correctly as "Dickert" in its own fa field;
-- confirmed externally (Mountaineers.org Wolf Bauer history / 1936 Mountaineer annual) that
-- "Dickert" is correct.
update areas set blurb = replace(blurb, 'Philip Dickett', 'Philip Dickert')
  where id = 'wa_mount_goode';

-- Mount Goode, Southwest Couloir (wa_goode_mountain_southwest_couloir): the route's own
-- itinerary.sourceNote already states "on-file gainFt was corrected to 8,400 ft to match
-- WTA.org's cited total" -- but the actual stored top-level gain_ft column was never updated
-- and still reads 5,300 ft, while loss_ft (8,400 ft) does match the note's claimed corrected
-- figure. Applying the correction described in the row's own sourceNote to the field it was
-- supposed to update.
update routes set gain_ft = 8400 where id = 'wa_goode_mountain_southwest_couloir';

-- Gunsight Peak (wa_gunsight_peak area, and its wa_gunsight_peak_standard route): area
-- elevation_ft/prominence_ft (8,185 ft / 546 ft) conflict with this same route's own summit
-- waypoint (8,198 ft) -- a conflict this route's own data_quality.gaps note already flags
-- ("Prominence figure conflicts between sources (518 ft per Wikipedia/Wikidata vs. 546 ft
-- previously on file) - not independently resolved"). Verified externally (Topozone/Peakbagger-
-- style summit data for Gunsight Peak, Chelan County, WA, Dome Peak massif): elevation 8,198 ft,
-- prominence 518 ft -- matching this route's own waypoint and resolving the previously-flagged
-- prominence conflict in favor of the 518 ft figure. Note: sibling route
-- wa_gunsight_peak_east_face (discipline 'trad', outside this audit's alpine/mountaineering
-- scope) also stores high_point_ft 8,200 -- a 2 ft variant of the same error -- left untouched
-- since it falls outside this batch's selected routes; flagging in the log for a future/human
-- pass since its discipline tag means it will not otherwise come up in this recurring audit's
-- normal rotation.
update areas set elevation_ft = 8198, prominence_ft = 518 where id = 'wa_gunsight_peak';

update routes set high_point_ft = 8198 where id = 'wa_gunsight_peak_standard';

-- Goat Mountain (wa_goat_mountain area) and its wa_goat_mountain_south_ridge route: the area's
-- own elevation_ft (6,892 ft) is the sole outlier against this route's own overview ("true
-- (east, 6,891 ft) summits"), its own hazards list ("true 6,891 ft east summit"), its own true-
-- summit waypoint (6,891 ft), and the sibling wa_goat_mountain_east_peak route's high_point_ft
-- (also 6,891 ft) -- only this route's itinerary.days[0] (objective text and one schedule entry)
-- separately says "6,892 ft", twice. Verified externally: SummitPost's Goat Mountain page gives
-- the East Peak (true summit) as 6,891 ft against the West Peak's 6,721 ft, matching the 6,891 ft
-- figure already used everywhere else across these two rows. Corrected the area's elevation_ft
-- and the two stray 6,892 ft mentions in the route's itinerary to match.
update areas set elevation_ft = 6891 where id = 'wa_goat_mountain';

update routes set itinerary = jsonb_set(
  jsonb_set(
    itinerary, '{days,0,schedule,4,detail}',
    to_jsonb('True (East) summit at 6,891 ft; views of Baker, Shuksan, and the Nooksack valley.'::text)
  ),
  '{days,0,objective}',
  to_jsonb('Reach Goat Mountain''s true (East) summit, 6,891 ft'::text)
) where id = 'wa_goat_mountain_south_ridge';
