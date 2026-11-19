-- 0470: the two superseded crew-gear functions are gone (owner 2026-11-18, dead-code audit: "do those now").
--
--   set_my_crew_gear(uuid, text[], text[])   0209. REPLACES the caller's whole gear_claims list with the
--                                            list the client holds, so a screen loaded before a crewmate
--                                            assigned you an item wiped that assignment (the bug 0287 is for).
--   set_my_crew_gear_extras(uuid, text[])    0287. The extras-only replacement for the above.
--
-- The app has called neither since crew gear moved to one item at a time: add_crew_gear_item,
-- assign_crew_gear, set_crew_gear_count, set_crew_gear_wanted, remove_crew_gear_item. Nothing in the app,
-- the edge functions or any other database object names them. 0287 kept set_my_crew_gear "for a cached
-- client still running the old code"; five weeks on, both were still executable by any signed-in
-- account, the first one able to overwrite a member's claims. A client that old now gets an error and a
-- toast instead.
--
-- No data is touched: crew_members.gear_claims and gear_extras stay, and the live functions write them.

begin;

drop function if exists public.set_my_crew_gear(uuid, text[], text[]);
drop function if exists public.set_my_crew_gear_extras(uuid, text[]);

commit;
