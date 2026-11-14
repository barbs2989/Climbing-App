-- Undo a parking-notes batch: clears each note only while it still holds this batch's text.
begin;
update public.areas set parking_note=null where id='wa_duty_dome_warrior_wall_peek_a_boo_area' and parking_note='Drive about 6.3 miles up Icicle Creek Road and park on the south side of the road, about 200 yards before the base of Icicle Buttress. A trail starts by a large boulder on the roadbank; first crags are ~15 minutes up.';
update public.areas set parking_note=null where id='ut_hell_area' and parking_note='Park in the large pullout on the right (uphill side) of the Alpine Loop road, about 0.65 mi past the Hideaway parking and marked by the green mile marker 11 sign. Cross the road for the trail. It is a National Forest fee area.';
update public.areas set parking_note=null where id='ut_box_canyon' and parking_note='Drive 0.8 mi up Maple Canyon Road from the canyon mouth, where the pavement turns to dirt, and park at one of several roadside pullouts. The land is private; a small donation for parking is requested.';
commit;
