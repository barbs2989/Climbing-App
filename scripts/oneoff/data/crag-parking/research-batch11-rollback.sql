-- Rollback for research-batch11 (22 areas set 2026-10-08). Clears only those ids,
-- and only while they still hold one of the batch's lots.
begin;
update public.areas set parking_lat = null, parking_lng = null, parking_name = null where id in ('bc_cbc_wall','bc_chickadee_wall','bc_grad_wall','bc_hail_mary_wall','bc_kinnaird_bluffs','bc_mount_sentinel','bc_nurses_wall','bc_open_book_wall','bc_polished_wall','bc_ravens_wall','bc_red_rocks_wall','bc_sentinel_wall','bc_serenity','bc_squeeze_chimney_wall','bc_sunshine_wall','bc_the_big_boulder','bc_the_corners','bc_the_valhalla_wall','bc_transgression_wall','bc_waterline','bc_whirlwind_wall','bc_yellow_sling_wall')
  and (parking_lat, parking_lng) in ((49.26683, -117.66282), (49.27891, -117.66108), (49.32813, -117.63819));
commit;
