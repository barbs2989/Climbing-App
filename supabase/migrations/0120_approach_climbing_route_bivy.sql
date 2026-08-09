-- 0120 — Three structured fields the route page needs and could not express before.
--
-- Each one exists because prose in an existing column was doing two jobs at once, and the
-- reader could not tell which job a given sentence was doing.
--
-- 1. approach_variants
--    `approach` is ONE paragraph. A real alpine approach is often several: a summer trail, a
--    winter/ski line, a different trailhead when the road is gated. Forbidden Peak's West
--    Ridge is the case that prompted this — the on-file approach describes the Boston Basin
--    trail and the couloir to the notch as a single continuous story, and a party trying to
--    find the base of the climbing had no way to see which sentences were "walk here" and
--    which were "this is the feature you are looking for". `baseFinding` is that missing
--    piece, kept as its own key so it can never be buried mid-paragraph again.
--
-- 2. climbing_route
--    The pitch-by-pitch table only exists for routes with pitches. A scramble or a
--    mountaineering line has an actual-climbing section every bit as real, and nowhere to put
--    it — so that description leaked into `approach`, which is why the approach text on those
--    routes so often runs past the base of the climb and keeps going to the summit. This is
--    the pitch table's equivalent for unpitched terrain: ordered segments, each with the
--    class and what to look for. Routes WITH pitches keep pitch_detail and leave this null.
--
-- 3. bivy
--    Where you can sleep on the mountain. Held separately from `waypoints` because a bivy has
--    facts a waypoint has no room for (capacity, water, whether it is a permit site or an
--    emergency ledge). Sites that have coordinates are ALSO mirrored into waypoints by the
--    enrichment script so they appear on the route track — the two are not alternatives.
--
-- All three are jsonb arrays and all three are nullable. Nothing reads a missing value as a
-- zero or an empty claim: the UI renders each section only when its array is non-empty, so a
-- route with none of this looks exactly as it does today.

alter table routes add column if not exists approach_variants jsonb;
alter table routes add column if not exists climbing_route jsonb;
alter table routes add column if not exists bivy jsonb;

comment on column routes.approach_variants is
  'Array of distinct ways to reach the base. [{name, season, hours, distMi, gainFt, baseFinding, notes, hazards[]}]. `baseFinding` is how to RECOGNISE the start of the climbing, kept separate so it cannot be buried inside approach prose.';

comment on column routes.climbing_route is
  'For routes with no pitch_detail (scramble / mountaineering): ordered segments of the actual climbing. [{n, label, class, notes}]. Routes with real pitches use pitch_detail instead and leave this null.';

comment on column routes.bivy is
  'Bivy / high-camp sites on or under the route. [{name, lat, lng, elev, capacity, water, permit, notes}]. Sites with coordinates are also mirrored into routes.waypoints as type "Bivy" so they render on the route track.';
