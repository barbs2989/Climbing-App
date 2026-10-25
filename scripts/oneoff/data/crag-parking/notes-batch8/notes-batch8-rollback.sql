-- Undo a parking-notes batch: clears each note only while it still holds this batch's text.
begin;
update public.areas set parking_note=null where id='wi_03_the_reserve' and parking_note='Park in the lot near the boat launch on South Shore Road (the South Shore side). From the lot''s southwest corner, walk straight into the woods looking for concrete slabs, then follow the trail uphill; about 20-30 minutes.';
update public.areas set parking_note=null where id='wi_burma_road' and parking_note='Park on Burma Road about 1.1 miles in from South Shore Road, by a tree on the right that still shows the scar of an old steel cable. A faint trail leads east into the woods; the boulders are about five minutes away.';
update public.areas set parking_note=null where id='wi_steinke_basin' and parking_note='Start from the Steinke Basin parking lot just off Hwy DL (on the East Bluff Woods Trail). The trail from the North Shore lot is not the right one; the other start is at the North Shore exit at Hwy DL.';
commit;
