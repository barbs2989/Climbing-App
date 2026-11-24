-- Big Four Spindrift Couloir: 1219 m = 4,000 ft, the height of the whole north face (sverdina.com/big_four1.asp,
-- "This face is 4,000 ft high"), the same figure the Tower Route carried. Not a route length. Owner: "ok go", 2026-11-24.
begin;
update routes set length_m = null where id = 'wa_big_four_mountain_spindrift_couloir' and area_id = 'wa_big_four_mountain' and length_m = 1219;
commit;
