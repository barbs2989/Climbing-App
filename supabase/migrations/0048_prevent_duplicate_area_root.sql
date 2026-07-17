-- Prevents a repeat of the WA duplicate-root bug: a second parent_id-IS-NULL
-- "root" area (a leftover 'wa' node sitting beside the real 'usa' root) caused
-- "Washington" to appear twice in the area browser and stranded Eldorado Peak /
-- Guye Peak (plus 100+ routes under 4 other mis-pathed hub nodes) outside the
-- reachable hierarchy. Fixed live in migration-adjacent data cleanup on 2026-07-17;
-- this migration makes it impossible for any future import/insert to recreate it.

-- At most one area may ever have a NULL parent_id (the single tree root).
create unique index if not exists areas_single_root_idx
  on areas ((parent_id is null))
  where parent_id is null;

-- A root-level area must be the country row, never a bare/placeholder node like
-- the old 'wa' row (area_type was null on every one of its 14 descendants' hub).
alter table areas
  add constraint areas_root_must_be_country
  check (parent_id is not null or area_type = 'country');
