-- What a crag is MADE OF, held on the area so every route on it inherits one answer. Read by the
-- route page's Rock tile and by the conditions score (how fast a wall dries after rain).
--   rock        the specific rock as a climber says it: 'granodiorite', 'dolomite', 'welded tuff'.
--   rock_basis  'stated'  = the area's own routes say so (the majority of their `routes.rock`);
--               'mapped'  = the mapped bedrock at the crag's coordinate. Measured 81% agreement on
--                           rock FAMILY against the 215 areas whose routes state it, so the page says
--                           "mapped", never presents it as confirmed.
-- A route's own `routes.rock` still outranks both.
alter table public.areas add column if not exists rock text;
alter table public.areas add column if not exists rock_basis text;
alter table public.areas drop constraint if exists areas_rock_len;
alter table public.areas add constraint areas_rock_len check (rock is null or char_length(rock) between 1 and 40);
alter table public.areas drop constraint if exists areas_rock_basis_check;
alter table public.areas add constraint areas_rock_basis_check check (
  (rock is null and rock_basis is null) or (rock is not null and rock_basis in ('stated', 'mapped'))
);
