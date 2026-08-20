-- Class B: the ONE confirmed duplicate of the twelve pairs.
--
-- wa_little_tahoma_east_shoulder and wa_frying_pan_whitman_glaciers are the same climb on the same
-- peak. All EIGHT identity facts agree — high point 11,138 ft, gain 7,600 ft, distance 11.3 km,
-- grade "Grade II+, Class 3-4", pitches, aspect E, face "East Shoulder", and the FA string down to
-- the date (J.B. Flett and Henry H. Garrison, August 29, 1894). The row being deleted says so in
-- its own overview: modern route guides describe the two names as "the same standard route".
--
-- THE MERGE HAS ALREADY RUN AND IS VERIFIED. The only thing wa_frying_pan_whitman_glaciers held
-- that the survivor lacked was its approach_variant, and that has been copied onto
-- wa_little_tahoma_east_shoulder (corroborated: the variant names Whitman Notch at 9,100 ft, which
-- is the survivor's own waypoint elevation). The survivor keeps 8 waypoints and a trailhead
-- coordinate against the deleted row's 2 and none.
--
-- WHY THIS IS HANDED OVER RATHER THAN RUN: the Triple Couloirs precedent — a real route was
-- destroyed by a delete taken on a duplicate claim that had not been checked. Both ids were
-- confirmed to return rows before this was written, and ELEVEN of the twelve Class B pairs turned
-- out NOT to be duplicates, so no other delete from that list should be run.

begin;

-- Guard: refuse unless the survivor exists AND already carries the merged variant. If the merge did
-- not land, this deletes nothing rather than destroying the only copy of that approach description.
delete from routes
where id = 'wa_frying_pan_whitman_glaciers'
  and exists (
    select 1 from routes s
    where s.id = 'wa_little_tahoma_east_shoulder'
      and s.area_id = 'wa_little_tahoma'
      and s.approach_variants is not null
      and jsonb_array_length(s.approach_variants) >= 1
  );

-- Expect: DELETE 1. A DELETE 0 means the guard held — check the survivor before re-running.
commit;
