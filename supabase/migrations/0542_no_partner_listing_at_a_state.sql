-- 0542: nobody lists themselves at a STATE or PROVINCE (owner note, 2026-11-25: "we should not allow people to
-- list themselves at a state or province because it is too broad").
--
-- A listing says "I climb here, find me". At Washington or British Columbia it says nothing a partner can act on: the
-- climbers in it are hundreds of miles and every discipline apart. 0311 already stopped a state listing surfacing on
-- every crag inside it; this stops the listing itself. Canadian provinces are area_type 'state' in the catalog (the
-- 12 children of Canada, as the 49 of the United States), so one type covers both.
--
-- A state stays SEARCHABLE: Partners > By Area on "Utah" still finds everyone listed at a region, range, canyon, crag,
-- wall or peak inside Utah (the <@ half of the reach predicate). Only where a listing may SIT changes. 0311's
-- `area_type <> 'state'` on the @> half stays as it is — with no state listings it excludes nothing, and it keeps the
-- reach rule true should one ever be written by hand.
--
-- Existing rows: 0 listings sat at a state when this was written (service-key count, 2026-11-25: 14 crag, 6 region).
-- The delete below is for a replay or a row written between the count and the apply; a listing is the climber's own
-- standing post, so a deleted one is simply re-added at a place inside the state.
--
-- Same function body as 0497 (cap, note screening, updated_at); only the refused types and the message change.

delete from public.partner_areas pa using public.areas a
 where a.id = pa.area_id and a.area_type = 'state';

create or replace function public.partner_areas_validate() returns trigger
language plpgsql security definer set search_path to 'public', 'pg_temp' as $function$
declare t text; n integer;
begin
  select a.area_type into t from areas a where a.id = new.area_id;
  if t is null then raise exception 'unknown area'; end if;
  if t in ('world', 'country', 'state') then
    raise exception 'a whole state, province or country is too broad — list yourself at a region, range, canyon, crag or peak inside it';
  end if;
  select count(*) into n from partner_areas pa where pa.user_id = new.user_id and pa.area_id <> new.area_id;
  if n >= 30 then raise exception 'at most 30 listed areas'; end if;
  if new.note is not null and screening_match(new.note) is not null then
    raise exception 'that note can''t be posted — please reword it';
  end if;
  new.updated_at := now();
  return new;
end $function$;
revoke all on function public.partner_areas_validate() from public, anon, authenticated;
