-- Six doubtful route identities (2026-11-24). Research: identity-six.md.
-- Only lengths that are demonstrably NOT a route length are cleared; grades and rows are left for the owner.
begin;
-- Mount Johnson (Olympics) Southwest Route: 3 m has no source; no source names this route at all.
update routes set length_m = null where id = 'wa_mount_johnson_southwest_route' and area_id = 'wa_mount_johnson' and length_m = 3;
-- Three Queens West Peak: 183 m is the ~600 ft from Spectacle Point camp to the summit, not a route length.
update routes set length_m = null where id = 'wa_three_queens_west_peak' and area_id = 'wa_three_queens' and length_m = 183;
-- Big Four Tower Route: 1219 m = 4,000 ft, the height of the whole north face (sverdina.com), not the route.
update routes set length_m = null where id = 'wa_big_four_mountain_tower_route' and area_id = 'wa_big_four_mountain' and length_m = 1219;
commit;
