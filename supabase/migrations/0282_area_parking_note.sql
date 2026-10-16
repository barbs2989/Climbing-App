-- A plain-words description of where climbers park, for crags whose spot has no coordinate yet and as a
-- companion to a pinned spot. Shown on the crag card's PARKING row (RouteDetail CragLocationCard) beside
-- parking_lat / parking_lng / parking_name (0255). Independent of them: a note can exist with no pin, so
-- the 0255 coordinate check is untouched. Written as a description of the place, never naming a source.
alter table public.areas add column if not exists parking_note text;
alter table public.areas drop constraint if exists areas_parking_note_check;
alter table public.areas add constraint areas_parking_note_check check (parking_note is null or length(parking_note) between 5 and 400);
