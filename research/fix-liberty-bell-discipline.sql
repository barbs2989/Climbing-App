-- Two Liberty Bell routes are labelled `bouldering` while their own fields say
-- otherwise. Route filtering runs server-side through the routes_in_subtree RPC on
-- the singular `discipline` column, so today both are invisible under an Alpine
-- filter and pollute Bouldering results.
--
--   Dark Side of Liberty   10 pitches, "Grade IV, 5.13+, 1,100 ft"
--   Live Free or Die!      11 pitches, and its own overview opens "Despite its name
--                          and grade label on file, Live Free or Die! is NOT a
--                          boulder problem — it is a full 8-pitch ... free route"
--
-- Target value `alpine` is not a guess: 14 of Liberty Bell Mountain's 20 routes use
-- it, including both nearest peers by grade and pitch count —
--   A Servant To Liberty   11p  5.13-   alpine
--   Liberty Crack (Free)   12p  5.13b   alpine
--
-- Each statement is guarded on the CURRENT value and the area, so re-running it after
-- it has already applied affects 0 rows rather than silently re-writing something
-- else. Check the reported row count: "UPDATE 1" each. The SQL Editor reports success
-- for an UPDATE that matched nothing.

update routes
   set discipline = 'alpine'
 where id = 'wa_dark_side_of_liberty'
   and area_id = 'wa_liberty_bell'
   and discipline = 'bouldering';

update routes
   set discipline = 'alpine'
 where id = 'wa_live_free_or_die'
   and area_id = 'wa_liberty_bell'
   and discipline = 'bouldering';

-- Verify: both rows should come back `alpine`, and Liberty Bell should show 16 alpine
-- routes and 0 bouldering.
select id, name, discipline, pitches
  from routes
 where id in ('wa_dark_side_of_liberty', 'wa_live_free_or_die');

select discipline, count(*)
  from routes
 where area_id = 'wa_liberty_bell'
 group by discipline
 order by count(*) desc;
