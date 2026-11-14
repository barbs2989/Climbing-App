-- A partial index on routes(id) for every sparse column check:field-renders samples.
--
-- check:field-renders runs in CI on every PR push. For each of its 61 FIELDS it asks PostgREST for
-- `routes?<col>=not.is.null&order=id.asc&limit=8`. Every one of those columns is filled on at most
-- 6% of the 315,754 routes (most under 0.4%), so with no index the planner walks routes_pkey in id
-- order and discards rows until it finds eight: measured 2026-10-28 for climbing_route, 282,764
-- rows removed and 235,524 buffers touched (~1.8 GB of page reads) for ONE query, 436 ms. Sixty-one
-- of those per run, ~24 runs in 45 minutes from parallel sessions' PRs, on a Micro instance (2
-- shared CPUs, 1 GB): pg_stat_user_tables showed 17M routes rows read sequentially in the half hour
-- after the restart that followed the 2026-10-28 stall.
--
-- `(id) where <col> is not null` holds only the filled rows, already in id order, so each sample is
-- an 8-entry index read. Together they hold ~100k entries (a few MB). Writes to the 99%+ of rows
-- where these columns are null never touch them.
--
-- Production was built with CREATE INDEX CONCURRENTLY, one statement per call, so no write to
-- routes waited; this file uses plain `if not exists` so it replays inside a preview's transaction
-- and is a no-op on production. Adding a column to FIELDS? Add its index here (a new migration).

create index if not exists routes_access_nn_idx on public.routes (id) where access is not null;
create index if not exists routes_alt_names_nn_idx on public.routes (id) where alt_names is not null;
create index if not exists routes_anchor_nn_idx on public.routes (id) where anchor is not null;
create index if not exists routes_approach_nn_idx on public.routes (id) where approach is not null;
create index if not exists routes_approach_logistics_nn_idx on public.routes (id) where approach_logistics is not null;
create index if not exists routes_approach_variants_nn_idx on public.routes (id) where approach_variants is not null;
create index if not exists routes_best_season_nn_idx on public.routes (id) where best_season is not null;
create index if not exists routes_beta_nn_idx on public.routes (id) where beta is not null;
create index if not exists routes_bivy_nn_idx on public.routes (id) where bivy is not null;
create index if not exists routes_bolts_nn_idx on public.routes (id) where bolts is not null;
create index if not exists routes_climate_nn_idx on public.routes (id) where climate is not null;
create index if not exists routes_climbing_route_nn_idx on public.routes (id) where climbing_route is not null;
create index if not exists routes_comms_nn_idx on public.routes (id) where comms is not null;
create index if not exists routes_corrections_nn_idx on public.routes (id) where corrections is not null;
create index if not exists routes_crowds_nn_idx on public.routes (id) where crowds is not null;
create index if not exists routes_crux_nn_idx on public.routes (id) where crux is not null;
create index if not exists routes_data_quality_nn_idx on public.routes (id) where data_quality is not null;
create index if not exists routes_descent_nn_idx on public.routes (id) where descent is not null;
create index if not exists routes_descent_text_nn_idx on public.routes (id) where descent_text is not null;
create index if not exists routes_description_nn_idx on public.routes (id) where description is not null;
create index if not exists routes_detailed_rack_nn_idx on public.routes (id) where detailed_rack is not null;
create index if not exists routes_difficulty_nn_idx on public.routes (id) where difficulty is not null;
create index if not exists routes_elev_pts_nn_idx on public.routes (id) where elev_pts is not null;
create index if not exists routes_emergency_nn_idx on public.routes (id) where emergency is not null;
create index if not exists routes_face_nn_idx on public.routes (id) where face is not null;
create index if not exists routes_ffa_nn_idx on public.routes (id) where ffa is not null;
create index if not exists routes_fwa_nn_idx on public.routes (id) where fwa is not null;
create index if not exists routes_gear_nn_idx on public.routes (id) where gear is not null;
create index if not exists routes_gear_confidence_nn_idx on public.routes (id) where gear_confidence is not null;
create index if not exists routes_gpx_nn_idx on public.routes (id) where gpx is not null;
create index if not exists routes_guide_stars_nn_idx on public.routes (id) where guide_stars is not null;
create index if not exists routes_hazards_nn_idx on public.routes (id) where hazards is not null;
create index if not exists routes_itinerary_nn_idx on public.routes (id) where itinerary is not null;
create index if not exists routes_landing_nn_idx on public.routes (id) where landing is not null;
create index if not exists routes_lists_nn_idx on public.routes (id) where lists is not null;
create index if not exists routes_location_nn_idx on public.routes (id) where location is not null;
create index if not exists routes_obj_haz_nn_idx on public.routes (id) where obj_haz is not null;
create index if not exists routes_overview_nn_idx on public.routes (id) where overview is not null;
create index if not exists routes_pads_nn_idx on public.routes (id) where pads is not null;
create index if not exists routes_partner_requirements_nn_idx on public.routes (id) where partner_requirements is not null;
create index if not exists routes_permit_nn_idx on public.routes (id) where permit is not null;
create index if not exists routes_pitch_detail_nn_idx on public.routes (id) where pitch_detail is not null;
create index if not exists routes_pro_needs_nn_idx on public.routes (id) where pro_needs is not null;
create index if not exists routes_pro_tips_nn_idx on public.routes (id) where pro_tips is not null;
create index if not exists routes_prot_rating_nn_idx on public.routes (id) where prot_rating is not null;
create index if not exists routes_rappel_count_note_nn_idx on public.routes (id) where rappel_count_note is not null;
create index if not exists routes_rappel_detail_nn_idx on public.routes (id) where rappel_detail is not null;
create index if not exists routes_road_nn_idx on public.routes (id) where road is not null;
create index if not exists routes_rock_nn_idx on public.routes (id) where rock is not null;
create index if not exists routes_rope_note_nn_idx on public.routes (id) where rope_note is not null;
create index if not exists routes_season_nn_idx on public.routes (id) where season is not null;
create index if not exists routes_seasonal_guidance_nn_idx on public.routes (id) where seasonal_guidance is not null;
create index if not exists routes_seasonal_hazards_nn_idx on public.routes (id) where seasonal_hazards is not null;
create index if not exists routes_sling_rack_nn_idx on public.routes (id) where sling_rack is not null;
create index if not exists routes_start_type_nn_idx on public.routes (id) where start_type is not null;
create index if not exists routes_timing_nn_idx on public.routes (id) where timing is not null;
create index if not exists routes_variations_nn_idx on public.routes (id) where variations is not null;
create index if not exists routes_verif_nn_idx on public.routes (id) where verif is not null;
create index if not exists routes_watch_out_nn_idx on public.routes (id) where watch_out is not null;
create index if not exists routes_waypoints_nn_idx on public.routes (id) where waypoints is not null;
create index if not exists routes_what_to_bring_nn_idx on public.routes (id) where what_to_bring is not null;
