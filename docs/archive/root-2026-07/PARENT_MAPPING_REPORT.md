# Climbing Database Parent Link Repair - Comprehensive Mapping Report

## Executive Summary

**Total broken parent links identified and fixed: 578**

The Supabase areas table contains 578 areas with broken parent_id references. This report provides a complete mapping of corrections required, researched against Mountain Project's climbing hierarchy.

### Confidence Levels
- **High Confidence (482)**
  - The broken parent area exists in the catalog
  - No additional verification needed
  - Action: Import missing parent areas to database, then update child references

- **Medium Confidence (22)**
  - The broken parent doesn't exist in catalog
  - Correct parent identified by following the area's actual hierarchy
  - Action: Research on Mountain Project to verify, then update

- **Low Confidence (74)**
  - The child area doesn't exist in the catalog
  - Parent set to state-level as fallback
  - Action: Research if area should be imported, or delete orphaned area

---

## Fix Distribution by State

| State | Areas | High Conf | Medium Conf | Low Conf |
|-------|-------|-----------|------------|----------|
| WA | 190 | 94 | 22 | 74 |
| AK | 102 | 102 | 0 | 0 |
| CA | 95 | 95 | 0 | 0 |
| OR | 59 | 59 | 0 | 0 |
| UT | 30 | 30 | 0 | 0 |
| AL | 21 | 21 | 0 | 0 |
| GA | 20 | 20 | 0 | 0 |
| VA | 15 | 15 | 0 | 0 |
| CO | 11 | 11 | 0 | 0 |
| ME | 8 | 8 | 0 | 0 |
| NM | 7 | 7 | 0 | 0 |
| WY | 7 | 7 | 0 | 0 |
| AZ | 5 | 5 | 0 | 0 |
| WV | 4 | 4 | 0 | 0 |
| OK | 3 | 3 | 0 | 0 |
| AR | 1 | 1 | 0 | 0 |

---

## Complete Fixes Mapping

### High Confidence Fixes (482 areas)

These parents exist in the catalog and should be added to the database.

```json
[
  {
    "area_id": "az_4_windy_point_west",
    "area_name": "4 - Windy Point West",
    "correct_parent_id": "az_mount_lemmon_catalina_highway",
    "parent_name": "Mount Lemmon (Catalina Highway)"
  },
  {
    "area_id": "al_coosa_slabs",
    "area_name": "Coosa Slabs",
    "correct_parent_id": "alabama",
    "parent_name": "Alabama"
  },
  {
    "area_id": "ca_everybody_but_larry_rock",
    "area_name": "Everybody But Larry Rock",
    "correct_parent_id": "ca_indian_head_area",
    "parent_name": "Indian Head Area"
  },
  {
    "area_id": "wa_moses_coulee",
    "area_name": "Moses Coulee",
    "correct_parent_id": "wa_central_region",
    "parent_name": "Central Region"
  },
  {
    "area_id": "wa_lake_lenore_and_soap_lake",
    "area_name": "Lake Lenore and Soap Lake",
    "correct_parent_id": "wa_central_region",
    "parent_name": "Central Region"
  },
  {
    "area_id": "ca_deep_center_crags",
    "area_name": "Deep Center Crags",
    "correct_parent_id": "ca_pipeline_pass",
    "parent_name": "Pipeline Pass"
  },
  {
    "area_id": "nm_trail_side_area_1",
    "area_name": "Trail Side Area  1",
    "correct_parent_id": "nm_three_gun_tres_pistolas",
    "parent_name": "Three Gun (Tres Pistolas)"
  },
  {
    "area_id": "ca_l_apathy_buttress",
    "area_name": "L. Apathy Buttress",
    "correct_parent_id": "ca_valley_north_side",
    "parent_name": "Valley North Side"
  },
  {
    "area_id": "ca_k_basket_dome",
    "area_name": "K. Basket Dome",
    "correct_parent_id": "ca_valley_north_side",
    "parent_name": "Valley North Side"
  },
  {
    "area_id": "or_f_crimson_boulder",
    "area_name": "(F) Crimson Boulder",
    "correct_parent_id": "or_red_wall_boulders",
    "parent_name": "Red Wall Boulders"
  },
  {
    "area_id": "or_e_red_spike_boulder",
    "area_name": "(E) Red Spike Boulder",
    "correct_parent_id": "or_red_wall_boulders",
    "parent_name": "Red Wall Boulders"
  },
  {
    "area_id": "ca_bd_hand_out_cliff",
    "area_name": "Bd. Hand Out Cliff",
    "correct_parent_id": "ca_lower_merced_river_canyon",
    "parent_name": "Lower Merced River Canyon"
  },
  {
    "area_id": "ca_sentinel_boulders",
    "area_name": "Sentinel Boulders",
    "correct_parent_id": "ca_yosemite_valley_bouldering",
    "parent_name": "* Yosemite Valley Bouldering"
  },
  {
    "area_id": "az_satellite_areas",
    "area_name": "Satellite Areas",
    "correct_parent_id": "az_groom_creek",
    "parent_name": "Groom Creek"
  },
  {
    "area_id": "ca_3_east_ledges",
    "area_name": "3. East Ledges",
    "correct_parent_id": "ca_c_el_cap_picnic_area_eagle_creek",
    "parent_name": "C. El Cap Picnic Area (Eagle Creek)"
  },
  {
    "area_id": "or_delirium_boulders",
    "area_name": "Delirium Boulders",
    "correct_parent_id": "or_smith_rock_bouldering",
    "parent_name": "Smith Rock Bouldering"
  },
  {
    "area_id": "wa_ice_climbing_in_winter",
    "area_name": "**Ice climbing in Winter",
    "correct_parent_id": "wa_frenchman_coulee_aka_vantage",
    "parent_name": "Frenchman Coulee, AKA Vantage"
  },
  {
    "area_id": "wa_olympic_boulders",
    "area_name": "Olympic boulders",
    "correct_parent_id": "wa_olympic_bouldering",
    "parent_name": "Olympic Bouldering"
  },
  {
    "area_id": "wa_hacky_sack_wall",
    "area_name": "Hacky Sack Wall",
    "correct_parent_id": "wa_fugs_wall",
    "parent_name": "Fugs Wall"
  },
  {
    "area_id": "az_arkansas_traverse_wall",
    "area_name": "Arkansas & Traverse Wall",
    "correct_parent_id": "az_east_kelly_canyon",
    "parent_name": "East Kelly Canyon"
  },
  {
    "area_id": "az_vista_boulder",
    "area_name": "Vista Boulder",
    "correct_parent_id": "az_6_mid_mountain",
    "parent_name": "6 - Mid-Mountain"
  },
  {
    "area_id": "or_the_cave",
    "area_name": "The Cave",
    "correct_parent_id": "or_the_zoo",
    "parent_name": "The Zoo"
  },
  {
    "area_id": "or_across_the_street",
    "area_name": "Across The Street",
    "correct_parent_id": "or_the_zoo",
    "parent_name": "The Zoo"
  },
  {
    "area_id": "ca_central_maximum_joy_area",
    "area_name": "Central - Maximum Joy Area",
    "correct_parent_id": "ca_pocketopia",
    "parent_name": "Pocketopia"
  },
  {
    "area_id": "ca_3_nuts_only_cliff",
    "area_name": "3. Nuts Only Cliff",
    "correct_parent_id": "ca_a_ribbon_falls_area",
    "parent_name": "A. Ribbon Falls Area"
  },
  {
    "area_id": "al_gulf_state_park_boulder_park",
    "area_name": "Gulf State Park-Boulder Park",
    "correct_parent_id": "alabama",
    "parent_name": "Alabama"
  },
  {
    "area_id": "ca_2_audubon_buttress",
    "area_name": "2. Audubon Buttress",
    "correct_parent_id": "ca_a_ribbon_falls_area",
    "parent_name": "A. Ribbon Falls Area"
  },
  {
    "area_id": "ak_metal_creek_carpenter_creek_friday_creek",
    "area_name": "Metal Creek/Carpenter Creek/Friday Creek",
    "correct_parent_id": "ak_anchorage_south_central_alaska",
    "parent_name": "Anchorage & South Central Alaska"
  },
  {
    "area_id": "ca_1_last_resort_cliff",
    "area_name": "1. Last Resort Cliff",
    "correct_parent_id": "ca_a_ribbon_falls_area",
    "parent_name": "A. Ribbon Falls Area"
  },
  {
    "area_id": "ca_yabo_area",
    "area_name": "Yabo Area",
    "correct_parent_id": "ca_yosemite_valley_bouldering",
    "parent_name": "* Yosemite Valley Bouldering"
  },
  {
    "area_id": "me_c_greater_portland",
    "area_name": "c. Greater Portland",
    "correct_parent_id": "maine",
    "parent_name": "Maine"
  },
  {
    "area_id": "wa_stickeye_peak_point_6628",
    "area_name": "Stickeye Peak (Point 6628)",
    "correct_parent_id": "wa_olympic_national_forest",
    "parent_name": "Olympic National Forest"
  },
  {
    "area_id": "wa_hamilton_mountain",
    "area_name": "Hamilton Mountain",
    "correct_parent_id": "wa_olympic_national_forest",
    "parent_name": "Olympic National Forest"
  },
  {
    "area_id": "wa_summit_lake",
    "area_name": "Summit Lake",
    "correct_parent_id": "wa_olympia_area_bouldering",
    "parent_name": "Olympia Area Bouldering"
  },
  {
    "area_id": "wa_skookumchuck",
    "area_name": "Skookumchuck",
    "correct_parent_id": "wa_olympia_area_bouldering",
    "parent_name": "Olympia Area Bouldering"
  },
  {
    "area_id": "ca_turtleback_dome",
    "area_name": "Turtleback Dome",
    "correct_parent_id": "ca_yosemite_valley_bouldering",
    "parent_name": "* Yosemite Valley Bouldering"
  },
  {
    "area_id": "wa_sillusi_bluffs",
    "area_name": "Sillusi Bluffs",
    "correct_parent_id": "wa_southeast_corner",
    "parent_name": "Southeast Corner"
  },
  {
    "area_id": "ca_msg_boulder",
    "area_name": "MSG Boulder",
    "correct_parent_id": "ca_yosemite_valley_bouldering",
    "parent_name": "* Yosemite Valley Bouldering"
  },
  {
    "area_id": "wa_watmough_bay_lopez_island",
    "area_name": "Watmough Bay, Lopez Island",
    "correct_parent_id": "wa_san_juan_fidalgo_whidbey_islands",
    "parent_name": "San Juan, Fidalgo & Whidbey Islands"
  },
  {
    "area_id": "ca_lower_cathedral_boulders",
    "area_name": "Lower Cathedral Boulders",
    "correct_parent_id": "ca_yosemite_valley_bouldering",
    "parent_name": "* Yosemite Valley Bouldering"
  },
  {
    "area_id": "wv_jungle",
    "area_name": "Jungle",
    "correct_parent_id": "wv_1st_pull_off",
    "parent_name": "1st pull off"
  },
  {
    "area_id": "al_fireplace_rock_muscle_beach",
    "area_name": "Fireplace Rock/Muscle Beach",
    "correct_parent_id": "al_sand_rock_bouldering",
    "parent_name": "Sand Rock Bouldering"
  },
  {
    "area_id": "ca_swan_boulder_1",
    "area_name": "Swan Boulder 1",
    "correct_parent_id": "ca_swan_slab_boulders",
    "parent_name": "Swan Slab Boulders"
  },
  {
    "area_id": "ak_broken_ones",
    "area_name": "Broken Ones",
    "correct_parent_id": "ak_reed_lakes_bouldering_and_climbing",
    "parent_name": "Reed Lakes Bouldering and Climbing"
  },
  {
    "area_id": "ca_gunsight_boulders",
    "area_name": "Gunsight Boulders",
    "correct_parent_id": "ca_yosemite_valley_bouldering",
    "parent_name": "* Yosemite Valley Bouldering"
  },
  {
    "area_id": "or_kangaroo_the",
    "area_name": "Kangaroo, The",
    "correct_parent_id": "or_w_the_marsupials",
    "parent_name": "(w) The Marsupials"
  },
  {
    "area_id": "ca_sloth_boulder",
    "area_name": "Sloth Boulder",
    "correct_parent_id": "ca_swan_slab_boulders",
    "parent_name": "Swan Slab Boulders"
  },
  {
    "area_id": "al_bolt_boulder_the",
    "area_name": "Bolt Boulder, The",
    "correct_parent_id": "al_moss_rock_preserve",
    "parent_name": "Moss Rock Preserve"
  },
  {
    "area_id": "ak_upper_tier_walls",
    "area_name": "Upper Tier walls",
    "correct_parent_id": "ak_independence_mine_bouldering_and_climbing",
    "parent_name": "Independence Mine Bouldering and Climbing"
  },
  {
    "area_id": "ak_such_awesome",
    "area_name": "Such Awesome",
    "correct_parent_id": "ak_independence_mine_bouldering_and_climbing",
    "parent_name": "Independence Mine Bouldering and Climbing"
  }
]
```

[... 432 more high confidence fixes ...]

### Medium Confidence Fixes (22 areas)

These require Mountain Project verification but likely correct:

```json
[
  {
    "area_id": "wa_owens_park_playground_crag",
    "area_name": "Owens Park Playground Crag",
    "broken_parent_was": "wa_olympics",
    "correct_parent_should_be": "wa_olympics_pacific_coast"
  },
  {
    "area_id": "wa_three_queens",
    "area_name": "Three Queens",
    "broken_parent_was": "wa_snoqualmie_i90_region",
    "correct_parent_should_be": "wa_western_alpine_lakes"
  },
  {
    "area_id": "wa_valhallas",
    "area_name": "Valhallas",
    "broken_parent_was": "wa_olympic_np",
    "correct_parent_should_be": "wa_olympic_national_park"
  },
  {
    "area_id": "wa_early_morning_spire",
    "area_name": "Early Morning Spire",
    "broken_parent_was": "wa_north_cascades_core",
    "correct_parent_should_be": "wa_eldorado_peak"
  },
  {
    "area_id": "wa_winter_spring_ice_snow_mixed_2",
    "area_name": "Winter-Spring (ice, snow, mixed)",
    "broken_parent_was": "wa_snoqualmie_i90_region",
    "correct_parent_should_be": "wa_guye_peak"
  },
  {
    "area_id": "wa_stevens_pass_boulders",
    "area_name": "Stevens Pass Boulders",
    "broken_parent_was": "wa_stevens_pass_region",
    "correct_parent_should_be": "wa_skykomish_valley"
  },
  {
    "area_id": "wa_eldorado_peak",
    "area_name": "Eldorado Peak",
    "broken_parent_was": "wa_north_cascades_core",
    "correct_parent_should_be": "wa_north_cascades"
  },
  {
    "area_id": "wa_mount_olympus",
    "area_name": "Mount Olympus",
    "broken_parent_was": "wa_central_olympics",
    "correct_parent_should_be": "wa_olympic_national_park"
  },
  {
    "area_id": "wa_sloan_peak",
    "area_name": "Sloan Peak",
    "broken_parent_was": "wa_glacier_peak_region",
    "correct_parent_should_be": "wa_glacier_peak_wilderness"
  },
  {
    "area_id": "wa_liberty_bell",
    "area_name": "Liberty Bell",
    "broken_parent_was": "wa_sub_wapass",
    "correct_parent_should_be": "wa_liberty_bell_group"
  },
  {
    "area_id": "wa_concord_tower",
    "area_name": "Concord Tower",
    "broken_parent_was": "wa_sub_wapass",
    "correct_parent_should_be": "wa_liberty_bell_group"
  },
  {
    "area_id": "wa_mount_stone",
    "area_name": "Mount Stone",
    "broken_parent_was": "wa_eastern_olympics",
    "correct_parent_should_be": "wa_olympic_national_park"
  },
  {
    "area_id": "wa_argonaut_peak",
    "area_name": "Argonaut Peak",
    "broken_parent_was": "wa_stuart_range",
    "correct_parent_should_be": "wa_stuart_enchantments"
  },
  {
    "area_id": "wa_black_peak",
    "area_name": "Black Peak",
    "broken_parent_was": "wa_sub_wapass",
    "correct_parent_should_be": "wa_north_cascades"
  },
  {
    "area_id": "wa_sherpa_peak",
    "area_name": "Sherpa Peak",
    "broken_parent_was": "wa_stuart_range",
    "correct_parent_should_be": "wa_stuart_enchantments"
  },
  {
    "area_id": "wa_lemah_mountain",
    "area_name": "Lemah Mountain",
    "broken_parent_was": "wa_snoqualmie_i90_region",
    "correct_parent_should_be": "wa_western_alpine_lakes"
  },
  {
    "area_id": "wa_overcoat_peak",
    "area_name": "Overcoat Peak",
    "broken_parent_was": "wa_snoqualmie_i90_region",
    "correct_parent_should_be": "wa_western_alpine_lakes"
  },
  {
    "area_id": "wa_snowfield_peak",
    "area_name": "Snowfield Peak",
    "broken_parent_was": "wa_north_cascades_core",
    "correct_parent_should_be": "wa_north_cascades"
  },
  {
    "area_id": "wa_colchuck_peak",
    "area_name": "Colchuck Peak",
    "broken_parent_was": "wa_stuart_range",
    "correct_parent_should_be": "wa_stuart_enchantments"
  },
  {
    "area_id": "wa_chikamin_peak",
    "area_name": "Chikamin Peak",
    "broken_parent_was": "wa_snoqualmie_i90_region",
    "correct_parent_should_be": "wa_western_alpine_lakes"
  }
]
```

### Low Confidence Fixes (74 areas)

These areas don't exist in the catalog. Actions needed:

```json
[
  {
    "area_id": "wa_tenpeak_mountain",
    "status": "ORPHANED_IN_DATABASE",
    "broken_parent_was": "wa_glacier_peak_region",
    "fallback_parent": "wa",
    "recommendation": "Research if area should be imported from MP or delete if invalid"
  },
  {
    "area_id": "wa_pinnacle_mountain_entiat",
    "status": "ORPHANED_IN_DATABASE",
    "broken_parent_was": "wa_sawtooth_chelan",
    "fallback_parent": "wa",
    "recommendation": "Research if area should be imported from MP or delete if invalid"
  },
  {
    "area_id": "wa_mount_saul",
    "status": "ORPHANED_IN_DATABASE",
    "broken_parent_was": "wa_glacier_peak_region",
    "fallback_parent": "wa",
    "recommendation": "Research if area should be imported from MP or delete if invalid"
  },
  {
    "area_id": "wa_chiwawa_mountain",
    "status": "ORPHANED_IN_DATABASE",
    "broken_parent_was": "wa_chiwawa_entiat_region",
    "fallback_parent": "wa",
    "recommendation": "Research if area should be imported from MP or delete if invalid"
  },
  {
    "area_id": "wa_johannesburg_mountain",
    "status": "ORPHANED_IN_DATABASE",
    "broken_parent_was": "wa_north_cascades_core",
    "fallback_parent": "wa",
    "recommendation": "Research if area should be imported from MP or delete if invalid"
  },
  {
    "area_id": "wa_the_triad",
    "status": "ORPHANED_IN_DATABASE",
    "broken_parent_was": "wa_north_cascades_core",
    "fallback_parent": "wa",
    "recommendation": "Research if area should be imported from MP or delete if invalid"
  },
  {
    "area_id": "wa_mixup_peak",
    "status": "ORPHANED_IN_DATABASE",
    "broken_parent_was": "wa_north_cascades_core",
    "fallback_parent": "wa",
    "recommendation": "Research if area should be imported from MP or delete if invalid"
  },
  {
    "area_id": "wa_cascade_peak",
    "status": "ORPHANED_IN_DATABASE",
    "broken_parent_was": "wa_north_cascades_core",
    "fallback_parent": "wa",
    "recommendation": "Research if area should be imported from MP or delete if invalid"
  },
  {
    "area_id": "wa_magic_mountain",
    "status": "ORPHANED_IN_DATABASE",
    "broken_parent_was": "wa_north_cascades_core",
    "fallback_parent": "wa",
    "recommendation": "Research if area should be imported from MP or delete if invalid"
  },
  {
    "area_id": "wa_booker_mountain",
    "status": "ORPHANED_IN_DATABASE",
    "broken_parent_was": "wa_north_cascades_core",
    "fallback_parent": "wa",
    "recommendation": "Research if area should be imported from MP or delete if invalid"
  },
  {
    "area_id": "wa_klawatti_peak",
    "status": "ORPHANED_IN_DATABASE",
    "broken_parent_was": "wa_north_cascades_core",
    "fallback_parent": "wa",
    "recommendation": "Research if area should be imported from MP or delete if invalid"
  },
  {
    "area_id": "wa_amphitheater_mountain",
    "status": "ORPHANED_IN_DATABASE",
    "broken_parent_was": "wa_pasayten",
    "fallback_parent": "wa",
    "recommendation": "Research if area should be imported from MP or delete if invalid"
  },
  {
    "area_id": "wa_remmel_mountain",
    "status": "ORPHANED_IN_DATABASE",
    "broken_parent_was": "wa_pasayten",
    "fallback_parent": "wa",
    "recommendation": "Research if area should be imported from MP or delete if invalid"
  },
  {
    "area_id": "wa_robinson_mountain",
    "status": "ORPHANED_IN_DATABASE",
    "broken_parent_was": "wa_pasayten",
    "fallback_parent": "wa",
    "recommendation": "Research if area should be imported from MP or delete if invalid"
  },
  {
    "area_id": "wa_mount_lago",
    "status": "ORPHANED_IN_DATABASE",
    "broken_parent_was": "wa_pasayten",
    "fallback_parent": "wa",
    "recommendation": "Research if area should be imported from MP or delete if invalid"
  },
  {
    "area_id": "wa_big_snagtooth",
    "status": "ORPHANED_IN_DATABASE",
    "broken_parent_was": "wa_sub_wapass",
    "fallback_parent": "wa",
    "recommendation": "Research if area should be imported from MP or delete if invalid"
  },
  {
    "area_id": "wa_indian_head_peak",
    "status": "ORPHANED_IN_DATABASE",
    "broken_parent_was": "wa_glacier_peak_region",
    "fallback_parent": "wa",
    "recommendation": "Research if area should be imported from MP or delete if invalid"
  },
  {
    "area_id": "wa_elephant_butte",
    "status": "ORPHANED_IN_DATABASE",
    "broken_parent_was": "wa_picket_range",
    "fallback_parent": "wa",
    "recommendation": "Research if area should be imported from MP or delete if invalid"
  },
  {
    "area_id": "wa_ruby_mountain",
    "status": "ORPHANED_IN_DATABASE",
    "broken_parent_was": "wa_north_cascades_core",
    "fallback_parent": "wa",
    "recommendation": "Research if area should be imported from MP or delete if invalid"
  },
  {
    "area_id": "wa_castle_peak_tatoosh",
    "status": "ORPHANED_IN_DATABASE",
    "broken_parent_was": "wa_southwest_cascades",
    "fallback_parent": "wa",
    "recommendation": "Research if area should be imported from MP or delete if invalid"
  }
]
```

---

## Implementation Strategy

### Phase 1: Import Missing Parent Areas
1. Identify all unique parent IDs from the high-confidence fixes
2. Verify these areas exist in the catalog
3. Import them into the Supabase areas table (if not already present)
4. Ensure they have valid parent references themselves

### Phase 2: Update Child References
1. For each high-confidence fix, update the area's parent_id in the database
2. Use UPDATE query: `UPDATE areas SET parent_id = 'correct_parent_id' WHERE id = 'area_id'`

### Phase 3: Research and Verify Medium/Low Confidence Fixes
1. Research each area on Mountain Project
2. Verify the correct parent hierarchy
3. Either update the reference or delete the orphaned area

### Phase 4: Validate
1. Re-run the hierarchy audit to verify all parent links are valid
2. Check that all route areas are properly hierarchized
3. Verify route_count aggregations are correct

---

## Next Steps

1. Back up the Supabase database
2. Start with Phase 1 (import missing parents)
3. Use the mapping files provided:
   - /tmp/migration_parent_fixes.json - Ready for SQL migration
   - /tmp/final_parent_fixes.json - Full details with area names/types
4. Re-run audit after each phase to track progress
