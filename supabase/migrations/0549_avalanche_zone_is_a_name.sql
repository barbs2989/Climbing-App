-- 0549: an area's avalanche zone is a NAME, not a paragraph.
--
-- Owner note, 2026-11-26: Sahale Mountain's AVALANCHE FORECAST card printed, beside its heading,
-- 'NWAC "West Slopes North" zone (nearest official NWAC forecast zone). NWAC's regular forecast
-- season runs roughly mid-November through mid-April and does not cover the typical June-September
-- climbing window for this peak.' A research pass had written its reasoning into areas.avy_zone
-- along with the name. Census of the whole catalog (all 67,528 areas): 69 carry an avy_zone, all
-- in Washington; 34 were longer than 40 characters (up to 334), several named a website as their
-- source, and the spellings of one zone ran to a dozen variants ("NWAC Mount Baker Zone",
-- "Mount Baker zone (NWAC)", "West Slopes North (NWAC)").
--
-- Each value is set to the name of the avalanche.org forecast-zone polygon the area's own
-- coordinate falls in (map layer read 2026-11-26), spelled as that layer spells it and as the live
-- "Avalanche today" card prints it (lib/avalanche.js zoneName). All 69 fall inside an NWAC zone.
-- The polygon also corrects eight areas the prose had filed under a neighbouring zone: Big Four
-- Mountain, Sloan Peak and Dome Peak are West Slopes Central, not West Slopes North; Grotto
-- Mountain is West Slopes Central, not Stevens Pass; Summit Chief Mountain and Burnt Boot Peak are
-- West Slopes Central, not Snoqualmie Pass; Bears Breast Mountain is West Slopes Central, not East
-- Slopes Central. What the paragraphs said about the forecast season is already on each route
-- (seasonal_hazards.avalanche.zone, printed as "Forecast coverage" under the card) and the live
-- card says "off season" by itself when no forecast is issued.
--
-- Then a CHECK so no pass can put a paragraph back. The render side refuses one too
-- (lib/headerValue.js), for the JSON keys a constraint cannot reach.

update public.areas a set avy_zone = v.zone
from (values
  ('wa_american_border_peak', 'West Slopes North'),
  ('wa_apex_mountain_pasayten', 'East Slopes North'),
  ('wa_austera_peak', 'West Slopes North'),
  ('wa_bald_eagle_peak', 'West Slopes Central'),
  ('wa_bears_breast_mountain', 'West Slopes Central'),
  ('wa_big_four_mountain', 'West Slopes Central'),
  ('wa_blackcap_mountain', 'East Slopes North'),
  ('wa_blizzard_peak', 'East Slopes North'),
  ('wa_booker_mountain', 'West Slopes North'),
  ('wa_boston_peak', 'West Slopes North'),
  ('wa_buckner_mountain', 'West Slopes North'),
  ('wa_burnt_boot_peak', 'West Slopes Central'),
  ('wa_chikamin_peak', 'Snoqualmie Pass'),
  ('wa_chiwawa_mountain', 'East Slopes Central'),
  ('wa_colonial_peak', 'West Slopes North'),
  ('wa_concord_tower', 'East Slopes North'),
  ('wa_copper_peak', 'East Slopes Central'),
  ('wa_cutthroat_peak', 'East Slopes North'),
  ('wa_denny_mountain', 'Snoqualmie Pass'),
  ('wa_dome_peak', 'West Slopes Central'),
  ('wa_eldorado_peak', 'West Slopes North'),
  ('wa_forbidden_peak', 'West Slopes North'),
  ('wa_four_brothers', 'Snoqualmie Pass'),
  ('wa_goat_mountain', 'West Slopes North'),
  ('wa_grotto_mountain', 'West Slopes Central'),
  ('wa_guye_peak', 'Snoqualmie Pass'),
  ('wa_hadley_peak', 'West Slopes North'),
  ('wa_hagan_mountain', 'West Slopes North'),
  ('wa_mount_shuksan', 'West Slopes North'),
  ('wa_mount_st_helens', 'West Slopes South'),
  ('wa_mount_thomson', 'Snoqualmie Pass'),
  ('wa_mount_torment', 'West Slopes North'),
  ('wa_mount_washington_olympic', 'Olympics'),
  ('wa_northwest_mox_peak', 'West Slopes North'),
  ('wa_primus_peak', 'West Slopes North'),
  ('wa_red_mountain_snoqualmie', 'Snoqualmie Pass'),
  ('wa_rimrock_ridge', 'West Slopes Central'),
  ('wa_rock_mountain', 'Stevens Pass'),
  ('wa_ruth_mountain', 'West Slopes North'),
  ('wa_sahale_mountain', 'West Slopes North'),
  ('wa_sherman_peak_baker', 'West Slopes North'),
  ('wa_skookum_peak_twinsisters', 'West Slopes North'),
  ('wa_sloan_peak', 'West Slopes Central'),
  ('wa_southeast_mox_peak', 'West Slopes North'),
  ('wa_spinnaker_peak', 'Stevens Pass'),
  ('wa_spire_mountain', 'West Slopes Central'),
  ('wa_summit_chief_mountain', 'West Slopes Central'),
  ('wa_sundial', 'Olympics'),
  ('wa_table_mountain', 'West Slopes North'),
  ('wa_the_brothers', 'Olympics'),
  ('wa_the_fin', 'Olympics'),
  ('wa_the_horn', 'Olympics'),
  ('wa_the_pleiades', 'West Slopes North'),
  ('wa_three_queens', 'Snoqualmie Pass'),
  ('wa_tomyhoi_peak', 'West Slopes North'),
  ('wa_whatcom_peak', 'West Slopes North'),
  ('wa_witches_tower', 'East Slopes Central')
) as v(id, zone)
where a.id = v.id and a.avy_zone is distinct from v.zone;

-- The slot takes a name. 50 is above the longest US forecast-zone name (46) and below every paragraph that was here.
alter table public.areas drop constraint if exists areas_avy_zone_is_a_name;
alter table public.areas add constraint areas_avy_zone_is_a_name
  check (avy_zone is null or (char_length(avy_zone) <= 50 and avy_zone !~ '[.;:] |—')) not valid;
-- NOT VALID: every new write is checked; the rows above were listed from the 2026-11-26 snapshot, and a
-- value written after it must not make the merge-time apply fail. Applied by hand 2026-11-26 after
-- a live re-read (32 rows broke the rule, all listed above) and then VALIDATED there.
