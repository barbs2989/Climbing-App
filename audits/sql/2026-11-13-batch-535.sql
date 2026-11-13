-- Batch 535 (pass 8, 2026-11-13)
-- Routes: Primus Peak's South Ridge/McAllister Glacier; Prusik Peak's Alpine Cragger's
-- Delight, Der Sportsman, East Face, Prayer for a Friend, Sail Away, Solid Gold, South Face
-- (Burgner-Stanley), and Stanley-Burgner (two rows -- see flag below).

-- wa_prusik_peak_east_face: stored name is "East Face" with fa "Fred Beckey and Dan Davis",
-- but no source found describes an East Face route on Prusik Peak by anyone, let alone this
-- party. Fred Beckey and Dan Davis's well-documented 1962 first ascent on Prusik Peak is the
-- SOUTH face (Mountain Project's "Beckey-Davis" route, 5.9, ~700 ft/6-7 pitches; corroborated
-- by SummitPost, stephabegg.com and the AAJ 1963 annual). The Mountaineers' own Prusik Peak
-- area page groups "Beckey-Davis" under South Face routes alongside Stanley-Burgner and Solid
-- Gold -- there is no East Face among them. This fixes the name to match the FA it actually
-- carries; the id (wa_prusik_peak_east_face) is left untouched since renaming ids is a
-- separate, riskier operation outside this audit's scope -- a human should decide whether to
-- rename the id too.
UPDATE routes SET name = 'South Face (Beckey-Davis)', name_search = 'south face beckey davis'
WHERE id = 'wa_prusik_peak_east_face' AND name = 'East Face';

-- wa_prusik_peak_prayer_for_a_friend: stored pitches is 6, but the row's OWN pitch_detail
-- array lists 7 entries (P1-P6 climbing the headwall, plus a 7th "West Ridge to summit"
-- scramble finish) -- an internal contradiction. This matches Mountain Project and the AAC's
-- publications.americanalpineclub.org writeup, both of which give this route as 7 pitches,
-- 600 ft (182 m) -- consistent with the stored length_m of 183.
UPDATE routes SET pitches = 7
WHERE id = 'wa_prusik_peak_prayer_for_a_friend' AND pitches = 6;
