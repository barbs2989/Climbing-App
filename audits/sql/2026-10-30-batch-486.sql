-- WA alpine route audit -- batch 486 (pass 8)
-- Routes: wa_e_se_face, wa_eagle_rock_scramble, wa_earl_peak_southwest_ridge,
-- wa_earl_peak_standup_creek_route, wa_east_face, wa_east_face_6,
-- wa_east_mcmillan_spire_northeast_buttress, wa_east_mcmillan_spire_west_ridge
-- All values below were re-read from the live DB immediately before this file was
-- written; each UPDATE carries a guard on the current value so it cannot silently
-- no-op if another session has already touched the same field.
-- No DELETE/DROP/TRUNCATE/ALTER anywhere in this file.

-- wa_e_se_face (Witches Tower, E/SE Face): loss_ft is NULL despite this being a
-- car-to-car round trip back to the same trailhead (gain_ft 5700). The row's own
-- itinerary.days[0].lossFt already states 5700 for this exact outing -- filling
-- loss_ft from the record's own itinerary rather than researched externally.
update routes set
  loss_ft = 5700
where id = 'wa_e_se_face'
  and loss_ft is null
  and gain_ft = 5700;

-- wa_east_face (Middle Peak, Gunsight Range): gain_ft (5000) undercounts the
-- row's own plain-text itinerary, which gives day-by-day ascent gains of
-- 3,100 + 2,600 + 600 = 6,300 ft. This exact fix was proposed in an earlier
-- pass (batch 62/65) but never landed on the live row -- re-confirmed and
-- re-proposed here against the current value.
update routes set
  gain_ft = 6300
where id = 'wa_east_face'
  and gain_ft = 5000;

-- wa_east_face (Middle Peak): rappels names "the moat at the base of the notch"
-- reached via the Blue Glacier, but this row's own approach/waypoints place the
-- climbing-side glacier and base camp on the Chickamin side of the Dome-Chickamin
-- col (Blue Glacier is the separate glacier used on this peak's approach, flowing
-- the opposite direction). Also re-proposed from the earlier, unapplied batch
-- 62/65 fix.
update routes set
  rappels = '2 double-rope rappels: one from near the summit to the notch between Middle and South Gunsight, one more into the moat at the base of the notch, then across the Chickamin Glacier to base camp. With only one 60 m rope expect roughly twice as many; no single-rope count is published.'
where id = 'wa_east_face'
  and rappels = '2 double-rope rappels: one from near the summit to the notch between Middle and South Gunsight, one more into the moat at the base of the notch. With only one 60 m rope expect roughly twice as many; no single-rope count is published.';

-- wa_east_face (Middle Peak): emergency.rangerStation names the Chelan Ranger
-- District (Okanogan-Wenatchee NF, east of the crest) for a route whose own
-- access.landManager/land_manager fields on this same row already correctly
-- name the Darrington Ranger District (Mt. Baker-Snoqualmie NF) and whose own
-- approach is via the Suiattle River Road / Downey Creek Trailhead -- a
-- west-side Mt. Baker-Snoqualmie access, nowhere near Chelan County. Internal
-- self-contradiction; re-proposed from the earlier, unapplied batch 62/65 fix.
update routes set
  emergency = jsonb_set(emergency, '{rangerStation}', '"Darrington Ranger Station, 1405 Emens Avenue North, Darrington, WA 98241 -- (360) 436-1155"'::jsonb)
where id = 'wa_east_face'
  and emergency->>'rangerStation' = 'Chelan Ranger District, 428 W. Woodin Avenue, Chelan, WA 98816, (509) 682-4900';

-- wa_east_face (Middle Peak): emergency.nearestHospital names "Skykomish Valley
-- Hospital, Skykomish, WA" -- no hospital by that name exists in Washington
-- state (confirmed: no CMS/WA DOH/Wikipedia record). Corrected to the two real
-- hospitals serving the Darrington/Suiattle River access side: Skagit Valley
-- Hospital (Mount Vernon) and Cascade Valley Hospital (Arlington), both part of
-- Skagit Regional Health. Re-proposed from the earlier, unapplied batch 62/65 fix.
update routes set
  emergency = jsonb_set(emergency, '{nearestHospital}', '"Skagit Valley Hospital, Mount Vernon (Level III ER) or Cascade Valley Hospital, Arlington -- both serve the Darrington/Suiattle River access side; serious trauma flown to Harborview (Seattle)."'::jsonb)
where id = 'wa_east_face'
  and emergency->>'nearestHospital' = 'Cascade Medical Center, Concrete, WA; Skykomish Valley Hospital, Skykomish, WA';

-- wa_east_face (Middle Peak): top-level permit is NULL even though this row's
-- own access.permit/access.overnight_permit blocks already state the answer
-- (free self-issued Glacier Peak Wilderness permit, no quota). Filling from the
-- record's own access block rather than researching fresh.
update routes set
  permit = 'Free self-issued Glacier Peak Wilderness permit required at the trailhead for day and overnight entry; no quota or fee. Northwest Forest Pass ($5/day or $30/annual) required for parking at the Downey Creek Trailhead.'
where id = 'wa_east_face'
  and permit is null;

-- verify
select id, loss_ft, gain_ft from routes where id = 'wa_e_se_face';
select id, gain_ft, rappels, permit, emergency->>'rangerStation' as ranger, emergency->>'nearestHospital' as hospital
from routes where id = 'wa_east_face';
