-- Undo a parking-notes batch: clears each note only while it still holds this batch's text.
begin;
update public.areas set parking_note=null where id='ca_fisherman_s_buttress_area' and parking_note='Drive 0.6 mi from the dam on the south shore. Limited parking: a dirt pullout (about 3 cars) just east of the crag on the south side, one across the road, or a lakeside pullout west toward the dam (5-6 cars).';
update public.areas set parking_note=null where id='ca_castle_rock_area_2' and parking_note='Park on Highway 18 about 1 mile from the dam; the lot is about 200 ft past the small signed trailhead, on the left. The trail to Castle Rock is about 1.2 mi and mostly uphill.';
commit;
