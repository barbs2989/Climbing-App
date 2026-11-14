-- Undo a parking-notes batch: clears each note only while it still holds this batch's text.
begin;
update public.areas set parking_note=null where id='az_upper_middle_elden_canyon' and parking_note='Park at the trail easement on either Skyline Drive or Lugano Way (Lugano is preferred), then follow social trails up the canyon; about 45 minutes to the top crags.';
update public.areas set parking_note=null where id='az_gloria_s' and parking_note='Take Paradise Rd. and park at the end of the cul-de-sac, taking care not to block driveways or mailboxes. A longer option is on foot from Buffalo Park, about 15 minutes.';
commit;
