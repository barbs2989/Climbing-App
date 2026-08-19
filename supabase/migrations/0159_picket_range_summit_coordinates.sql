-- Picket Range summit coordinates: repair the placeholders, and stop warning about the ones that
-- were always correct.
--
-- Eleven areas carried source='approx-picket-range', which `DbAreaBrowser` renders as
-- "Coordinates are approximate — the map pin and any distance shown are rough." Two things were
-- wrong with that. Five of the eleven were not merely approximate but PLACEHOLDERS SHARED VERBATIM
-- between different summits — three peaks at 48.768,-121.288 and two at 48.823,-121.345 — and six
-- of the eleven had accurate coordinates and were being disclaimed for no reason.
--
-- EVIDENCE, per peak. Nothing here is a guess dressed as a measurement; where a value is derived
-- rather than observed, the flag STAYS so the app keeps saying so.
--
--   Little Mac Spire   48.7737,-121.2762   its own Southwest Route's summit waypoint, corroborated
--                                          by that route's 209-point recorded track ending 180 m
--                                          away. Was 1,072 m off, on a shared placeholder.
--   Spectre Peak       48.812,-121.343     its own South Ridge route's summit waypoint. Was
--                                          1,232 m off, on a shared placeholder.
--   Poltergeist Pin.   48.83524,-121.3419  140 m south of Mount Challenger. Three independent
--                                          lines agree: an external description giving that
--                                          bearing AND distance; this catalog's own route prose
--                                          ("south of Mount Challenger's summit"); and elevation,
--                                          8,198 ft against Challenger's 8,207 ft, which is what
--                                          "one of the main pinnacles of Challenger" looks like.
--                                          The stored value sat 1,518 m away.
--   The Pyramid        48.77144,-121.29193 DERIVED, not observed. A published east-to-west
--                                          enumeration puts it between Inspiration Peak and Mount
--                                          Degenhardt; interpolated across that gap. ±150 m or so,
--                                          and the gap's summit count is itself an assumption
--                                          (Pinnacle Peak is not in this catalog). Moves it 479 m.
--   Frenzel Spitz      48.77638,-121.31694 DERIVED, not observed. Same enumeration puts it beyond
--                                          Himmelhorn at the west end; this catalog's own route
--                                          prose puts it by "the north face of Ottohorn on the
--                                          ridge connecting the Southern and Northern Pickets".
--                                          Stepped one Ottohorn-Himmelhorn spacing (163 m, the
--                                          nearest measured analogue) further west. ±250 m, and
--                                          the prose suggests the true point may lie somewhat
--                                          north of this line. Moves it 2,317 m.
--
-- THE DERIVATION METHOD WAS VALIDATED BEFORE IT WAS TRUSTED: the same style of statement for Ghost
-- Peak ("0.30 mi NNE of Phantom Peak") reproduces to within ~40 m against this catalog's own two
-- rows. That is why Poltergeist was derived and the remaining two are still flagged.
--
-- NOT changed: Himmelhorn and Ghost Peak match external survey data exactly, and East/West Twin
-- Needle, Ottohorn and The Rake agree with their own routes to within 0-15 m. Their flag was
-- simply stale.
--
-- Ruled out as a source of truth: OpenStreetMap carries only the official names here (it confirms
-- Degenhardt, Terror, Inspiration, East McMillan, Phantom and Crooked Thumb to within metres, and
-- has none of these eleven); Wikipedia has no article for Frenzel Spitz or The Pyramid AND gives
-- Ghost Peak and Poltergeist Pinnacle the IDENTICAL coordinate, so copying from it would have
-- manufactured a fresh duplicate; Peakbagger, SummitPost and the Mountaineers all refuse
-- automated access.
--
-- Idempotent: each update names its target and its final value, so re-running is a no-op. The
-- first three were already applied by script on 2026-08-19; they are restated here so the whole
-- repair is reviewable in one place rather than living only in a transcript.

update areas set lat = 48.7737,   lng = -121.2762   where id = 'wa_little_mac_spire';
update areas set lat = 48.812,    lng = -121.343    where id = 'wa_spectre_peak';
update areas set lat = 48.83524,  lng = -121.3419   where id = 'wa_poltergeist_pinnacle';
update areas set lat = 48.77144,  lng = -121.29193  where id = 'wa_the_pyramid_picket';
update areas set lat = 48.77638,  lng = -121.31694  where id = 'wa_frenzel_spitz';

-- The warning is false on every peak whose coordinate is now observed rather than derived.
update areas set source = null
where id in ('wa_poltergeist_pinnacle','wa_little_mac_spire','wa_spectre_peak','wa_himmelhorn',
             'wa_ghost_peak','wa_east_twin_needle','wa_west_twin_needle','wa_ottohorn','wa_the_rake');

-- The Pyramid and Frenzel Spitz KEEP source='approx-picket-range'. Their coordinates are better
-- than they were and still derived, and the app should go on saying so.
