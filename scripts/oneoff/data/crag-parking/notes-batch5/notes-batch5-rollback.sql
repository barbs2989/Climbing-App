-- Undo a parking-notes batch: clears each note only while it still holds this batch's text.
begin;
update public.areas set parking_note=null where id='ut_green_canyon' and parking_note='Drive east on 1800/1900 North from Logan to the canyon mouth, then up the canyon road a little over a mile; park at campsite 7, directly in front of Devil''s Cave where most routes are. Inverted Stairway is across the road a short way up.';
update public.areas set parking_note=null where id='ut_providence_canyon' and parking_note='Winter ice access: the canyon road is unpaved and only the bottom half mile is plowed. Park at the lot half a mile up, which fills with snowmobile trailers on weekends; the climbs are near an old limestone quarry about 2.25 miles beyond.';
commit;
