-- Second pass of the trad -> alpine review (owner, 2026-11-11: "do all of those now", after 0413).
-- Same rule as 0413 (research-data/trad-alpine-2026-11-11/RULE.md; owner: "yes crag for trad is just a short
-- approach"): trad at a crag is about an hour or less on foot and a return to the base; alpine is a mountain
-- setting plus a summit or ridge-crest finish, a long backcountry approach (camp, bivy, boat, plane), or
-- glacier/snow travel.
--
-- 0413 only looked at trad routes on a peak, graded III+, or with a summit/glacier descent. This pass read all
-- 78,452 trad routes and flagged 144 more whose approach or descent names a camp or bivy, glacier or snow travel,
-- a multi-mile or multi-hour walk, or a long distance or gain. Each was judged against the rule
-- (pass2-decisions.json, with a reason per row). 84 are alpine at high or medium confidence: the Bugaboos,
-- the Devil's Thumb, Lotus Flower Tower, the Incredible Hulk, Mount Whitney, the Wind Rivers' Cirque and Mount
-- Hooker among them. 52 stay trad (e.g. roadside walls whose text only names a glacier as a landmark,
-- Medicine Bow's Diamond, Lamont Pinnacles, Mammoth Crest); 3 low-confidence alpine and 5 unsure rows stay trad.
--
-- Assert-then-set, as 0413: a row no longer typed trad is left alone. The route triggers (0051, 0198)
-- re-derive area types. Discipline is owner-locked (0406); this is the owner's edit.

update routes set discipline = 'alpine'
 where discipline = 'trad'
   and id in (
  'ak_3rd_4th_the_curtain_the_mammoth', -- 3rd/4th The Curtain: Mendenhall Towers are reached by helicopter or a long ski/glacier approach with a glacier camp below the route.
  'ak_5390_west_face_all_that_for_a_hand_crack', -- 5390 West Face: Remote Baranof Island massif needing a full-day or kayak approach with camping, and a descent over snow.
  'ak_5390_west_face_granitic_dreams', -- 5390 West Face: Remote Baranof Island massif needing a full-day or kayak approach with camping; tops the formation and descends over snow.
  'ak_crown_jewel_crown_royal', -- Crown Jewel: Little Switzerland via air taxi and glacier travel, with a bergschrund crossing and snow at the start.
  'ak_devil_s_thumb_south_pillar_free', -- Devil’s Thumb: Stikine Ice Cap peak reached by helicopter or boat with glacier travel and an upper base camp.
  'ak_north_troll_northeast_ridge', -- North Troll: Ridge route to a Little Switzerland summit reached by air taxi and glacier travel.
  'bc_1_north_faces_from_fairy_meadow_nw_ridge_quadrant_with_rabbit_ears_arete_s', -- North Faces (from Fairy Meadow): Ridge route on Quadrant from the remote Fairy Meadow hut over the Echo Glacier.
  'bc_1_north_faces_from_fairy_meadow_sentenel_peak_shoofly_arete_of_north_ridge', -- North Faces (from Fairy Meadow): Ridge-crest route to Sentinel Peak starting from the Shoestring Glacier, from the remote Fairy Meadow hut.
  'bc_2_gothics_neve_routes_via_friendship_col_east_peak_of_gothics_north_east_ridge', -- Gothics Neve Routes (via Friendship Col): Ridge route to a summit reached through Friendship Col across the glacier and up steep snow from a remote base camp.
  'bc_2_gothics_neve_routes_via_friendship_col_gibraltar_north_face', -- Gothics Neve Routes (via Friendship Col): Reached from the remote Fairy Meadow base camp over Friendship Col and the glacier, with a moat to step across.
  'bc_bugaboo_spire_divine_intervention', -- Bugaboo Spire: East face of Bugaboo Spire, reached from the Kain hut or Applebee camp across the Crescent Glacier.
  'bc_bugaboo_spire_kain_route_south_ridge', -- Bugaboo Spire: Classic summit ridge of Bugaboo Spire, approached over snow to the col with an ice axe and possibly crampons.
  'bc_copilot_seppuku', -- Copilot: Peak face reached by the Sky Pilot approach across the Stadium Glacier, described as an alpine day.
  'bc_copilot_west_ridge', -- Copilot: Ridge to the summit of Copilot, reached by crossing the Stadium Glacier and its snow slopes.
  'bc_crescent_spire_energy_crisis', -- Crescent Spire: Short line on Crescent Spire in the Bugaboos, still reached from a backcountry camp by crossing the Crescent Glacier.
  'bc_crescent_spire_mctech_arete', -- Crescent Spire: Bugaboos spire reached from the Applebee/Kain backcountry camp across the Crescent Glacier, finishing on the spire’s ridge crest.
  'bc_crescent_spire_paddle_flake', -- Crescent Spire: Bugaboos spire reached from the Applebee/Kain backcountry camp across the Crescent Glacier, finishing on the spire’s ridge crest.
  'bc_crescent_spire_paddle_flake_direct', -- Crescent Spire: Bugaboos spire reached from the Applebee/Kain backcountry camp across the Crescent Glacier, finishing on the spire’s ridge crest.
  'bc_crescent_spire_paddle_to_the_stars', -- Crescent Spire: Headwall line high on Crescent Spire, reached from a Bugaboos backcountry camp across the Crescent Glacier.
  'bc_crescent_spire_roof_mctech', -- Crescent Spire: Start variant of McTech Arete on Crescent Spire, reached from a Bugaboos backcountry camp across the Crescent Glacier.
  'bc_crescent_spire_surprisingly_subsevere', -- Crescent Spire: Bugaboos spire reached from the Applebee/Kain backcountry camp across the Crescent Glacier, finishing on the spire’s ridge crest.
  'bc_crescent_spire_woza_moya', -- Crescent Spire: Bugaboos spire reached from the Applebee/Kain backcountry camp across the Crescent Glacier, finishing on the spire’s ridge crest.
  'bc_dione_dehydrated_on_dalwhinnie', -- Dione: Face of Dione in the Tantalus Range, reached from a remote hut across the Dione Glacier.
  'bc_dione_drilling_dionysus', -- Dione: Face of Dione in the Tantalus Range, reached from a remote hut across the Dione Glacier.
  'bc_dione_sw_spur', -- Dione: Spur up Dione from the Dione couloir, reached from a remote Tantalus hut across the glacier.
  'bc_east_ear_the_howler', -- East Ear: Line on one of the Wolfs Ears spires in the Valhallas, reached from the Gimli backcountry base camp over a ridge and into a basin.
  'bc_ionia_mountain_ionia_ne_spur', -- Ionia Mountain: Long spur on a Tantalus peak reached over the Lycia-Serratus col and across the Ionia Glacier.
  'bc_mount_rexford_west_ridge', -- Mount Rexford: Ridge route to the summit of Mount Rexford, with a descent down the Northeast Ridge over snow and rock with rappels.
  'bc_nesakwatch_spires_nesakwatch_enchainment_d', -- Nesakwatch Spires: Traverse over three summits from a backcountry bivouac basin.
  'bc_pigeon_feathers_fingerberry_jam', -- Pigeon Feathers: Bugaboos tower climbed from a snow slope to its top, reached from the Kain hut or Applebee camp.
  'bc_pigeon_spire_draco', -- Pigeon Spire: South face of Pigeon Spire in the Bugaboos, reached across the Bugaboo Glacier and finishing on the east ridge.
  'bc_sir_sanford_group_east_ridge', -- Sir Sanford Group: Remote Selkirks ridge climbed from a glacier high camp, a roughly 16-hour first-ascent day.
  'bc_snowpatch_spire_becky_mather_free_5_12_or_5_11_c1_for_4m', -- Snowpatch Spire: Snowpatch Spire face in the Bugaboos, reached from a backcountry camp by glacier travel with a moat to cross.
  'bc_snowpatch_spire_furry_pink_arete', -- Snowpatch Spire: West face of Snowpatch Spire, reached by roped glacier travel to the Bugaboo-Snowpatch col from a backcountry camp.
  'bc_snowpatch_spire_minotaur_direct', -- Snowpatch Spire: Snowpatch Spire face in the Bugaboos, reached from a backcountry camp by glacier travel with a moat to cross.
  'bc_snowpatch_spire_sendero_norte', -- Snowpatch Spire: East face of Snowpatch Spire, reached from a backcountry camp over the glacier with an axe and rope.
  'bc_snowpatch_spire_sunshine_crack', -- Snowpatch Spire: North side of Snowpatch Spire, reached from a backcountry camp up the snow slope toward the col, with crampons.
  'bc_snowpatch_spire_welcome_to_the_machine', -- Snowpatch Spire: Snowpatch Spire face in the Bugaboos, reached from a backcountry camp by glacier travel with a moat to cross.
  'bc_tantalus_tantalus_standard_route', -- Tantalus: Standard route on Mount Tantalus, reached across the Dione Glacier with a bergschrund at the base.
  'bc_the_minaret_reinhold_pussycat', -- The Minaret: Bugaboos spire reached by glacier travel over cols from a bivy in East Creek.
  'bc_the_old_settler_east_buttress_of_the_south_peak', -- The Old Settler: Climbs to the South Peak summit after a bushwhack approach to a lake camp, with a scrambling descent off the peak.
  'bc_the_sphinx_north_ridge', -- The Sphinx: Ridge to a Garibaldi Park summit reached over the Sphinx Glacier or by paddling the lake.
  'ca_bear_claw_spire_peak_12_563_northeast_ridge', -- Bear Claw Spire (Peak 12,563): Ridge to a 12,563 ft High Sierra summit from a cross-country camp, descending via Royce Col.
  'ca_bear_claw_spire_peak_12_563_scavenger_hunt', -- Bear Claw Spire (Peak 12,563): Start variation that joins Treasure Hunt to the summit of a remote High Sierra spire reached from a backcountry camp.
  'ca_bear_claw_spire_peak_12_563_treasure_hunt', -- Bear Claw Spire (Peak 12,563): Eight pitches to a High Sierra summit block, approached cross-country from a camp near Golden Lake.
  'ca_blacksmith_peak_southwest_chimney', -- Blacksmith Peak: Snow-graded Sawtooth Ridge summit route reached by a long trailless approach.
  'ca_fletcher_peak_left_west_buttress_of_fletcher_peak', -- Fletcher Peak: Buttress on a Cathedral Range peak reached only by a long backcountry hike to Vogelsang.
  'ca_incredible_hulk_choose_joy', -- Incredible Hulk: Tops out on the Hulk’s ridge after a multi-hour backcountry approach up Little Slide Canyon, often with a bivy.
  'ca_lone_pine_peak_land_of_little_rain', -- Lone Pine Peak: 2,800 ft up Lone Pine Peak’s south face from a bivouac, descending by mountain ledges and gullies.
  'ca_mount_whitney_if_at_first', -- Mt. Whitney: Long route on the Whitney massif from an overnight camp at Iceberg Lake.
  'ca_mount_whitney_inyo_face', -- Mt. Whitney: Ten-pitch face on the Whitney massif reached by an overnight approach to Iceberg Lake.
  'ca_mt_goode_the_goode_life', -- Mt. Goode: Ends on Mt. Goode’s ridge after a snowfield approach, descending the peak’s normal route.
  'ca_mt_irvine_stone_meysan', -- Mt. Irvine: Finishes on the Irvine-Mallory divide after an overnight approach, descending along the crest.
  'ca_north_face_the_abyssus_abyssum_invocat', -- North Face, The: Base guarded by a steep snowfield needing snow travel on Mt. Hoffmann’s north face, finishing on the ridge.
  'ca_north_face_the_grendel', -- North Face, The: Mt. Hoffmann north-face line whose base requires steep snowfield travel.
  'ca_north_face_the_marmot_fur_slippers', -- North Face, The: Mt. Hoffmann north-face line reached across a steep snowfield that needs snow skills.
  'ca_north_face_the_marmotzilla', -- North Face, The: Ends on Mt. Hoffmann’s ridge after a snowfield approach needing snow travel.
  'ca_north_face_the_nazg_l', -- North Face, The: Joins Mt. Hoffmann’s northeast ridge after a snowfield approach needing snow travel.
  'ca_north_face_the_north_face', -- North Face, The: Four pitches up Mt. Hoffmann’s north face behind a steep snowfield needing snow travel.
  'ca_north_face_the_shelob', -- North Face, The: Tops out on Mt. Hoffmann’s summit plateau after a snowfield approach, descending the northeast face.
  'ca_spring_lake_wall_angels_and_demons', -- Spring Lake Wall: Wall at the head of Cliff Creek reached only by a long backcountry trip over Glacier Pass or Timber Gap.
  'ca_spring_lake_wall_spring_roll', -- Spring Lake Wall: Remote backcountry wall over a high pass, with a descent over the formation’s back needing mountain travel.
  'ca_tenderfoot_peak_tendernob', -- Tenderfoot Peak: Peak route deep in the Gorge of Despair that takes a backpacking and cross-country approach.
  'co_arrowhead_broken_arrow', -- Arrowhead: Tops out on Arrowhead in an RMNP cirque about 5 mi in, descending by rappels and downclimbing from the saddle.
  'co_arrowhead_orange_pillar', -- Arrowhead: Face on Arrowhead in a high RMNP cirque about 5 mi from the trailhead, below the summit ramp.
  'co_arrowhead_try_cam_corner', -- Arrowhead: Reached by the roughly 5-mile Glacier Gorge walk to Black Lake and a steep scramble onto Arrowhead, a long backcountry approach in an alpine
  'co_hallett_peak_ad_nauseum', -- Hallett Peak: A seven-pitch line on Hallett Peak’s north face, a mountain face that tops out on the peak’s upper slopes rather than a valley rim.
  'co_north_face_cowboy_nudes', -- North Face: Finishes high on Thatchtop’s north face and descends by walking down the mountain’s slopes and a talus gully, which is mountain travel.
  'co_north_face_the_dark_tower', -- North Face: Climbs a tower on Thatchtop’s north face whose descent scrambles to the ridgeline and walks off the mountain.
  'co_spearhead_humdinger', -- Spearhead: The Spearhead is an alpine spire above Black Lake, reached by a 5-plus-mile walk to treeline and beyond.
  'co_stoneman_pass_the_stoneman', -- Stoneman Pass: A tower on the Continental Divide reached over Stoneman Pass, climbed to near its summit.
  'mt_northeast_face_the_stumbling_stone', -- Northeast Face: A 16-pitch face on A Peak in the Cabinet Wilderness, reached by a backcountry lake approach and a snow slope.
  'nt_lotus_flower_tower_silk_road', -- Lotus Flower Tower: Lotus Flower Tower in the Cirque of the Unclimbables needs a floatplane flight and backcountry camp.
  'nu_coronation_glacier_raise_the_drawbridge', -- Coronation Glacier: Reached by boat or kayak and travel up the Coronation Glacier on Baffin Island.
  'wa_ne_arete', -- Molar Tooth: Climbs the northeast arete of Molar Tooth to its summit after a long trail approach toward Cutthroat Pass.
  'wa_ne_chimney', -- Molar Tooth: Climbs Molar Tooth’s NE face to an alpine spire summit after a long approach toward Cutthroat Pass.
  'wa_north_face_of_the_mole', -- Hook Creek Drainage: Climbs to the summit of an Enchantments-fringe granite spire after a 5,300 ft approach.
  'wa_zool_patch', -- Juno Tower: Juno Tower is a Washington Pass spire reached by a long cross-country approach up Silver Star Creek, well over an hour.
  'wy_cody_peak_north_ridge', -- Cody Peak: Climbs Cody Peak’s north ridge after a bushwhack and a couloir that can need an axe and crampons.
  'wy_mount_hooker_the_living_stone', -- Mount Hooker: A big-wall face on Mount Hooker, reached by a 14 to 16 mile backcountry trek with a camp below the wall.
  'wy_springfield_gully_kamp_krusty', -- Springfield Gully: Lies in the Cirque of the Towers, an alpine cirque reached only by a long backcountry hike to a camp.
  'wy_springfield_gully_spiderpig', -- Springfield Gully: Lies in the Cirque of the Towers, an alpine cirque reached only by a long backcountry hike to a camp.
  'wy_watchtower_the_the_pretender', -- Watchtower, The: A Garnet Canyon tower reached from the Caves backcountry camp toward the Teepe Glacier, a multi-hour mountain approach.
  'yt_white_range_moose_illusion_open_project'  -- White Range: Reached by crossing Windy Arm by boat and an untracked bushwhack to remote towers.
);
