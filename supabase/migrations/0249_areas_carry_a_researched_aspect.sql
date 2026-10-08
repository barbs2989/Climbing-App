-- Which way a WALL faces, held on the area so every route on it inherits one answer. Read by the
-- conditions score (sun vs shade by the hour) when the route has no `routes.aspect` of its own.
--   aspect  one of N NE E SE S SW W NW, or 'varies' (a formation with faces every way).
--           Written ONLY from an online statement about that wall or its crag ("south-facing",
--           "morning sun"), never from a coordinate or the terrain; unconfirmed walls stay null.
-- And a third rock basis:
--   rock_basis 'researched' = the crag's rock as stated online, which outranks the mapped bedrock.
alter table public.areas add column if not exists aspect text;
alter table public.areas drop constraint if exists areas_aspect_check;
alter table public.areas add constraint areas_aspect_check check (
  aspect is null or aspect in ('N','NE','E','SE','S','SW','W','NW','varies')
);
alter table public.areas drop constraint if exists areas_rock_basis_check;
alter table public.areas add constraint areas_rock_basis_check check (
  (rock is null and rock_basis is null) or (rock is not null and rock_basis in ('stated', 'mapped', 'researched'))
);
