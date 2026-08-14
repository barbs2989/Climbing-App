-- Nine routes move from combined areas onto the summits they actually climb. Four stay, and the
-- four that stay are the point of doing this by hand.
--
-- 0146 added Crestone Peak, Crestone Needle, Mount Wilson and Maroon Peak beside the combined
-- crags that already held their technical routes, and deliberately MOVED NOTHING — re-filing
-- needs each route adjudicated on its own. This is that adjudication. Every route below was
-- looked up individually; none was moved on the strength of its name alone, and the ones that
-- could not be attributed to a single summit were left exactly where they are.
--
-- MOVED — the summit is established:
--
--   Crestone Peak
--     co_crestone_peak_north_pillar      names the peak in its own title
--     co_crestone_peak_north_buttress    names the peak in its own title
--     co_red_gully                       THE standard route: ~2,000 ft of sustained Class 3 up
--                                        the red-stained gully of the South Face. 14ers.com files
--                                        it as Crestone Peak - South Face.
--     co_india                           east face, on the buttress left of centre; tops out over
--                                        East Crestone Peak to the main summit. The approach walks
--                                        RIGHT of the Ellingwood Arete, which is what places it on
--                                        the Peak rather than the Needle.
--   Crestone Needle
--     co_ellingwood_ledges               the NE arete. "Ellingwood Ledges", "Ellingwood Route" and
--                                        "Ellingwood Arete" are the same climb under three names.
--                                        A FIFTY CLASSIC — see the note below.
--     co_merhar_direct                   NE wall, the left of two couloir systems, topping out at
--                                        a notch ~13,300 ft near the standard Needle route.
--   Kit Carson Peak
--     co_north_ridge_of_kit_carson       names the peak in its own title
--     co_the_prow_kit_carson             names the peak in its own title
--   Challenger Point
--     co_septem_virtutum_anima_mea       THE SURPRISE OF THIS PASS. Not a Crestone at all: the
--                                        north face above Willow Lake, approached from the town of
--                                        Crestone on the WEST side of the range — the wrong side
--                                        entirely for South Colony. Confirmed by two independent
--                                        sources, one of them an American Alpine Club report
--                                        titled for Challenger.
--
-- NOT MOVED — each summits nothing, or leaves the group entirely:
--
--   co_crestone_traverse       spans Crestone Peak AND Crestone Needle. Belongs to neither.
--   co_bag_o_stones            a link-up of FIVE summits — Needle (via Ellingwood) -> Peak -> Kit
--                              Carson (via The Prow) -> Challenger -> HUMBOLDT PEAK. It leaves the
--                              Crestones altogether, so no Crestone summit can own it.
--   co_bells_traverse...       spans both Maroon summits.
--   co_megamoronal...          not a Bells traverse at all: a ~20-mile, 12,000 ft horseshoe from
--                              Buckskin Pass to PYRAMID PEAK, taking in Belleview, Sleeping
--                              Sexton and Thunder Pyramid. Its 5.4 crux is on the Thunder Pyramid
--                              -> Pyramid chimney, i.e. not on either Bell.
--   co_bell_cord_couloir       the interesting one. It climbs the slot BETWEEN the two Bells and
--                              tops out at the notch (~13,600-13,800 ft), summiting NEITHER; from
--                              there South Maroon is 3rd-4th class and North Maroon about 5.4.
--                              14ers.com titles its page "Maroon Peak - Bell Cord Couloir", so
--                              moving it to co_maroon_peak would match one convention — but the
--                              honest record is that it reaches a saddle and the summit is the
--                              climber's choice. Left in the combined area, which is the only row
--                              that can say that. co_maroon_bells is therefore UNCHANGED at 3.
--
-- THE FIFTY CLASSIC IS SAFE, and this was checked rather than assumed. `co_ellingwood_ledges`
-- carries lists = {fifty_classics}, and the `fifty` list resolves through routeInList by TAG, not
-- by area — so changing area_id cannot alter that count. The verification below re-reads the tag
-- after the move; audit:list-coverage must still report fifty 50 of 50.
--
-- NOT CHANGED HERE, though the research turned it up: `co_merhar_direct` is stored as discipline
-- `ice` with grade 5.6, but its real difficulty is AI4 M5-6 — the 5.6 is only the rock sub-grade
-- on a mixed line. `ice` is defensible and the grade question is enrichment, a different subject
-- from which mountain the route is on. Recorded rather than folded in.
--
-- Also here: `co_el_diente_peak_mount_wilson` is renamed to "El Diente Peak". It was named for two
-- fourteeners while holding one route — "North Buttress - El Diente Peak" — and since 0146 gave
-- Mount Wilson its own area the combined name is simply wrong. The ID is left alone: ids are
-- opaque keys and rewriting one would strand every reference to it.
--
-- These are UPDATEs, so `npm run check:sql` validates every target id against the live DB — run it
-- before applying. Re-runnable: each UPDATE is idempotent (setting the same area_id twice is a
-- no-op), and `route_count` is maintained by a trigger on routes.

begin;

update routes set area_id = 'co_crestone_peak'
  where id in ('co_crestone_peak_north_pillar', 'co_crestone_peak_north_buttress', 'co_red_gully', 'co_india');

update routes set area_id = 'co_crestone_needle'
  where id in ('co_ellingwood_ledges', 'co_merhar_direct');

update routes set area_id = 'co_kit_carson_peak'
  where id in ('co_north_ridge_of_kit_carson', 'co_the_prow_kit_carson');

update routes set area_id = 'co_challenger_point'
  where id = 'co_septem_virtutum_anima_mea';

update areas set name = 'El Diente Peak'
  where id = 'co_el_diente_peak_mount_wilson';

commit;

-- Verify AFTER, as SEPARATE statements — a failing SELECT inside the transaction rolls the updates
-- back, which is how 0097's writes were undone:
--
--   select id, route_count from areas where id in
--     ('co_crestones_the','co_crestone_peak','co_crestone_needle','co_kit_carson_peak',
--      'co_challenger_point','co_maroon_bells') order by id;
--   -- expect  co_challenger_point 2 (was 1)   co_crestone_needle 3 (was 1)
--   --         co_crestone_peak    5 (was 1)   co_crestones_the   2 (was 11)
--   --         co_kit_carson_peak  3 (was 1)   co_maroon_bells    3 (UNCHANGED)
--
--   select id, name, area_id, lists from routes where id = 'co_ellingwood_ledges';
--   -- area_id co_crestone_needle, and lists STILL {fifty_classics}
--
--   select name from areas where id = 'co_el_diente_peak_mount_wilson';   -- 'El Diente Peak'
--
--   select string_agg(name, ', ' order by name) from routes where area_id = 'co_crestones_the';
--   -- expect exactly: 'Bag O Stones', Crestone Traverse
--   -- i.e. the two routes that genuinely span more than one summit, and nothing else
--
-- The route TOTAL must not change: these are moves, not inserts. `npm run check:counts` afterwards
-- verifies every ancestor's cached subtree count followed the moves.
