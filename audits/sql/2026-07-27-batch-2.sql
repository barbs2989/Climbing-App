-- WA alpine/mountaineering audit — batch 2 (pass 1)
-- Reviewed 2026-07-27. Each fix below was cross-checked against at least one authoritative
-- source (see audits/wa-alpine-audit-log.md for the summary). These are PROPOSED fixes for a
-- human to review and run — not yet applied. Continues the same scope/ordering as batch 1
-- (routes.discipline in ('alpine','mountaineering'), id like 'wa_%', area_type = 'peak').

-- Argonaut Peak / Southeast Ridge (wa_argonaut_peak_east_ridge): the route's own "corrections"
-- and "rope_note" fields assert that only single-rope (2x) rappels are correct and that a
-- "double-rope rappel" claim "overstates" reality -- but descent_text still describes "most
-- parties make a double-rope rappel," a direct internal contradiction. Mountaineers.org's
-- route page (the authoritative source both fields claim to be based on) actually documents
-- BOTH options as legitimate: "8 pitches of solid rock including two single, or 1 double rope
-- rappel into the notch." Rewriting descent_text to match that source instead of asserting one
-- option exclusively.
update routes set descent_text = 'Descend by reversing the East Ridge: downclimb and scramble back through the gendarme and knife-edge sections to the notch just west of the lone gendarme where the roped climbing began. From the notch, per Mountaineers.org''s route description parties either make two single-rope rappels or one longer double-rope rappel (two ropes tied together, or twin/half ropes) down steep snow to the glacier/snow slopes below rather than downclimbing the exposed step -- both are standard, established options, not just one. Anchors on this route are natural — slung horns, blocks, or small trees — supplemented by whatever tat/fixed slings a prior party left; there is no bolted station, so carry extra webcord and be ready to build or back up an anchor. Once down to the snow/talus below the notch, downclimb into the basin and reverse the long approach: back down through Porcupine Creek basin, re-ford Ingalls Creek, and climb back out over Fourth Creek Pass to the trailhead. Given the length of this descent, start it with a comfortable margin of daylight.'
  where id = 'wa_argonaut_peak_east_ridge';

-- Prusik Peak / Beckey-Davis (wa_beckey_davis): the route's own approach text names Stuart Lake
-- Trailhead -> Aasgard Pass as the standard access (7.5-8 mi one-way), with the Snow Lakes
-- Trail as a longer fallback used only when wildfire closures force it (~10 mi, per the same
-- approach text). But the route's primary "Trailhead"-type waypoint (waypoint index 0, the one
-- other app logic would treat as the default) is labeled "Snow Lakes Trailhead" with no
-- indication it's the fallback, not the standard route. Clarifying the note in place rather
-- than guessing new coordinates for a Stuart Lake Trailhead waypoint we didn't independently
-- re-verify this pass.
update routes set waypoints = jsonb_set(
  waypoints, '{0,note}',
  '"Alternate access only, used when the standard Stuart Lake Trailhead / Aasgard Pass approach is closed (e.g. wildfire closures) -- longer route via Snow Lakes/Lake Viviane (~10 mi one-way, per this route''s own approach text). Stuart Lake Trailhead is the standard/preferred access described in the approach field."'::jsonb
) where id = 'wa_beckey_davis';

-- =========================================================================
-- NOT fixed here (flagged for human review only -- see audit log for detail):
--  - Argonaut Peak Northeast Ridge (wa_argonaut_peak_northeast_ridge): no source found
--    documents a "Northeast Ridge" as a distinctly named route matching the stored PD/Class
--    4-low 5th/5.4/3-pitch spec -- the real named NE-side lines are "Northeast Buttress" and
--    "Northeast Couloir," neither of which matches. Possible route-identity issue, same
--    category as the Apex Buttress flag in batch 1. Needs a human to determine the correct
--    identity before any fix.
--  - Baring Mountain North Face (wa_baring_mountain_r1): Fred Beckey's presence on the actual
--    1960 summit FA (vs. an earlier 1959 attempt with Gordon/Cooper) is ambiguous in available
--    sources; the IV-V/5.9+ grade and the walk-off (vs. the FA account's own "long rappels down
--    the upper walls") descent claim could not be independently confirmed either way.
--  - Bacon Peak (wa_bacon_peak_diobsud): FR-1107's washout closure at MP 3.8 is corroborated as
--    of a Dec 2025 event but its current (mid-2026) status couldn't be confirmed live.
--  - Austera Peak (wa_austera_peak_southwest_ridge): "aspect: Northeast" on a route named
--    "Southwest Ridge" is plausible as describing the summit-block crux face rather than the
--    overall line (per trip-report snippets), but not confirmed against a primary source.
--  - Big Kangaroo Beckey-Tate (wa_beckey_tate): the exact FA day (5/29/1967) and the specific
--    "2023 theodolite survey" elevation source page couldn't be directly fetched to confirm,
--    though both are plausible and corroborated by secondary snippets.
--  - Bear Mountain North Buttress (wa_bear_mountain_chilliwack_north_buttress): the record's
--    own flagged question (is this the Beckey/Fielding 1967 7-pitch line or the Kearney/Knight
--    1980 21-pitch "Direct North Buttress"?) was RESOLVED as correct -- confirmed via AAJ that
--    this is the 1967 Beckey/Fielding route, correctly distinguished from the 1980 line. No fix
--    needed; noting the resolution here so it isn't re-flagged next pass.
-- =========================================================================

-- Verify afterward:
select id, descent_text from routes where id = 'wa_argonaut_peak_east_ridge';
select id, waypoints from routes where id = 'wa_beckey_davis';
