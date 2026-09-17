-- WA alpine audit batch 285 (pass 5)
-- Routes checked: wa_mount_triumph_northeast_ridge, wa_ne_ridge, wa_needle_peak_north_ridge,
-- wa_neve_glacier_west_ridge, wa_news_nw_corner, wa_nooksack_tower_beckey_route,
-- wa_nooksack_tower_south_face, wa_north_face_3

-- Fix 1: wa_neve_glacier_west_ridge (Snowfield Peak, Neve Glacier/West Ridge) --
-- gain_ft (7,400) disagrees with this row's own itinerary, which is explicit and
-- internally consistent: itinerary.days[0].gainFt (4,600) + itinerary.days[1].gainFt
-- (2,650) = 7,250, and itinerary.totalNote independently restates "~7,250 ft gain round
-- trip" in prose. loss_ft (7,250) already matches this sum exactly; only gain_ft was off
-- by 150 ft. Corrected to match the row's own stated total (same class of fix as
-- wa_mount_thomson_west_ridge in batch 284 and wa_mount_stuart_stuart_glacier_couloir in
-- batch 283). Both 7,400 and 7,250 clear the hard trailhead(1,150 ft)-to-summit(8,351 ft)
-- floor of 7,201 ft, so this was not caught by that test -- only by reading the itinerary.
UPDATE routes
SET gain_ft = 7250
WHERE id = 'wa_neve_glacier_west_ridge'
  AND gain_ft = 7400
  AND loss_ft = 7250;

-- Fix 2: wa_neve_glacier_west_ridge -- bivy carried a 6-entry corridor-wide camp list
-- (Neve Camp, Junction Camp, Skagit Queen Camp, Thunder Basin Hiker Camp, Fremont Glacier
-- moraine high camp, Five Mile Camp/Park Creek trail) that is entirely the Thunder Creek
-- Trail / Park Creek Pass corridor serving Mount Logan, Buckner Mountain, Booker Mountain
-- and Storm King, approached from the Colonial Creek trailhead on SR-20 and running south
-- up Thunder Creek to Park Creek Pass -- explicitly named as such in every one of the six
-- entries' own text ("staging camp for Booker, Storm King and Buckner", "the natural
-- first or second night for parties heading to Mount Logan", etc). None of the six
-- entries mentions Pyramid Lake, the Colonial Glacier, the Neve Glacier, or any other
-- feature on this route's own approach (Pyramid Lake Trailhead -> climbers' path ->
-- Colonial-Neve col), which is a different trailhead entirely on a different stretch of
-- SR-20. This route's own itinerary already correctly describes its actual camp in prose
-- ("treeline or on-snow camp around 5,400-5,900 ft, or Colonial Basin"), so nothing
-- specific to Snowfield Peak was lost by removing the contaminated array; a bivy entry for
-- this route's own approach was never present to begin with, so cleared rather than
-- rewritten (same "the fix is a deletion" pattern as prior corridor-contamination fixes,
-- e.g. wa_mount_spickard_silver_glacier in batch 282, wa_mount_thomson_west_ridge in
-- batch 284).
UPDATE routes
SET bivy = NULL
WHERE id = 'wa_neve_glacier_west_ridge'
  AND bivy::text LIKE '%Skagit Queen Camp%'
  AND bivy::text LIKE '%staging camp for Booker, Storm King and Buckner%';

-- Fix 3: wa_neve_glacier_west_ridge -- access.rules contained a Boston Basin-specific
-- clause ("Boston Basin camping restricted to two designated sites (Low Camp ~5,300 ft,
-- High Camp ~6,400 ft)") with no bearing on this route. Boston Basin is the approach
-- basin for Forbidden Peak, Sahale Mountain and Torment (reached from the Cascade Pass
-- trailhead), an entirely different valley from this route's Pyramid Lake / Colonial-
-- Neve Glacier approach -- nothing else on this row mentions Boston Basin, Forbidden
-- Peak, or Cascade Pass. Removed the misapplied clause; kept the surrounding group-size
-- and bear-canister sentences, which are generic North Cascades National Park backcountry
-- policy consistent with the rest of this row's access fields.
UPDATE routes
SET access = jsonb_set(access, '{rules}',
  '"Group size capped at 6 in off-trail cross-country zones (12 in on-trail corridors). Bear canisters required in some zones — free loaners at permit offices."'::jsonb
)
WHERE id = 'wa_neve_glacier_west_ridge'
  AND access->>'rules' LIKE '%Boston Basin camping restricted to two designated sites%';

-- Fix 4: wa_nooksack_tower_beckey_route (North Face / Beckey-Schmidtke Route) --
-- pitch_detail[0] (labelled "Approach pitch"/pitch 1, describing "the ice-couloir start of
-- the historic Beckey-Schmidtke line") stored lengthM=50 (164 ft), which contradicts the
-- length of that same feature stated three separate times elsewhere on this exact row:
-- beta ("climbers kick steps up an 800-foot, 50-degree ice couloir on the north face"),
-- itinerary.days[1].note/schedule ("Start up the 800 ft, 50-60 degree snow/ice couloir on
-- the north face" ... "Top of the couloir"), and approach_variants[0].baseFinding
-- ("800 ft of 50-degree ice couloir above [the bergschrund]"). 800 ft = 243.8 m. The
-- route's own top-level length_m (610) is independently consistent with this reading:
-- 800 ft (couloir) + 1,200 ft (the beta/overview's stated rock-arete length) = 2,000 ft =
-- 609.6 m, matching length_m=610 almost exactly -- confirming the couloir pitch, not the
-- rock arete, is the one whose stored length is wrong. Corrected pitch_detail[0].lengthM
-- to 244 (800 ft rounded to the metre) to match the row's own thrice-stated figure.
UPDATE routes
SET pitch_detail = jsonb_set(pitch_detail, '{0,lengthM}', '244'::jsonb)
WHERE id = 'wa_nooksack_tower_beckey_route'
  AND pitch_detail->0->>'pitch' = '1'
  AND (pitch_detail->0->>'lengthM')::numeric = 50;

-- Fix 5: wa_nooksack_tower_south_face -- access.landManager ("National Park Service
-- (North Cascades National Park)") disagreed with the more detailed land_manager field on
-- this exact same row ("Mt. Baker-Snoqualmie National Forest (Mt. Baker Ranger District)
-- -- Mount Baker Wilderness, with some upper routes crossing into North Cascades National
-- Park"), and with the sibling route on the identical peak (wa_nooksack_tower_beckey_route),
-- whose landManager/land_manager fields both agree with the fuller Forest
-- Service/Wilderness description. The app's own display convention reads land_manager
-- ahead of landManager (per CLAUDE.md), so this was a lower-visibility inconsistency, but
-- the field is still factually wrong on its own and disagreed with its sibling row for the
-- same peak. Corrected landManager to match this row's own land_manager text.
UPDATE routes
SET access = jsonb_set(access, '{landManager}',
  '"Mt. Baker-Snoqualmie National Forest (Mt. Baker Ranger District) — Mount Baker Wilderness, with some upper routes crossing into North Cascades National Park"'::jsonb
)
WHERE id = 'wa_nooksack_tower_south_face'
  AND access->>'landManager' = 'National Park Service (North Cascades National Park)';
