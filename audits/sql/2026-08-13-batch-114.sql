-- wa_beckey_davis (Prusik Peak, Beckey-Davis, South Face)
-- The stored `pitches` value (7) and `beta` text ("Seven pitches...") contradict this
-- same row's own `pitch_detail` array, which itemizes exactly 6 pitches, and its own
-- `rope_note` field, which already says "6 pitches, 700ft". External sources agree with
-- the 6-pitch count: stephabegg.com's trip report is titled "Prusik Peak, Beckey-Davis
-- (5.9, 700', 6p)" and its own pitch-by-pitch breakdown lists 6 pitches; Mountain
-- Project's route page for Beckey-Davis matches. FA (Fred Beckey & Dan Davis, June 29
-- 1962) was independently confirmed correct and is left unchanged.
UPDATE routes SET
  pitches = 6,
  beta = 'Six pitches from 5.5 to 5.9, starting up a chimney left of two prominent V-shaped features on the south face, crossing a long chimney-gully to Snafflehound Ledge, then finishing with a forced rightward dihedral/jam-crack crux and a choice of two summit finishes.'
WHERE id = 'wa_beckey_davis';

-- wa_austera_peak_southwest_ridge (Austera Peak, Southwest Ridge / McAllister Glacier)
-- grade_num stores 5, but the route's own `grade` field is "Grade II, 5.2" and its own
-- `rock_grade` field is "Easy 5th (roughly 5.2-5.4, short sections)" -- both point to a
-- YDS 5.2 crux. This catalog's convention is grade_num = the digits after the decimal
-- point (5.10 -> 10, not 5.1; see CLAUDE.md's check:grade-parser notes), so 5.2 should
-- store grade_num = 2. That convention is independently confirmed by the sibling route
-- at the same peak, wa_austera_peak_chockstone_route, whose crux is the identical 5.2
-- grade and which correctly stores grade_num = 2. A value of 5 reads as the exact bug
-- class check:grade-parser exists to catch: taking the whole-number part before the
-- decimal instead of the digits after it.
UPDATE routes SET grade_num = 2 WHERE id = 'wa_austera_peak_southwest_ridge';
