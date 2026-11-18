-- 0456 — A CLIMBER CAN LIST THEMSELVES AT A PEAK (owner 2026-11-18: "for saved areas make a [switch] next to each area
-- to allow them to list themselves in partner search for that area. Also same for peaks. Allow users to find partners
-- and crews by peaks as well").
--
-- 0300 refused a listing at a peak because alpine partners were found by route (saved objectives). The owner now wants
-- a peak to be a place you can be found at, the same as a crag: Partners › A peak shows the climbers LISTED at the peak
-- beside the ones whose objectives sit on it. Two changes, nothing else:
--   * partner_areas_validate refuses only world and country (still too broad to mean anything);
--   * the disciplines a listing may name widen from the crag family to the alpine family too, since what a climber
--     wants at a peak is alpine, mountaineering, scrambling, ice or mixed.
-- The reach rules (0311: path <@ T, or path @> T below the state) need no change: a peak is below its state, so a peak
-- listing answers a search at the peak and at every area that contains it.

begin;

create or replace function public.partner_areas_validate() returns trigger
language plpgsql security definer set search_path to 'public', 'pg_temp' as $function$
declare t text; n integer;
begin
  select a.area_type into t from areas a where a.id = new.area_id;
  if t is null then raise exception 'unknown area'; end if;
  if t in ('world', 'country') then
    raise exception 'list yourself at a peak, crag, canyon, range or state — a country is too broad to search';
  end if;
  select count(*) into n from partner_areas pa where pa.user_id = new.user_id and pa.id <> new.id;
  if n >= 30 then raise exception 'at most 30 listed areas'; end if;
  new.updated_at := now();
  return new;
end $function$;
revoke all on function public.partner_areas_validate() from public, anon, authenticated;

alter table public.partner_areas drop constraint if exists partner_areas_disciplines_values;
alter table public.partner_areas add constraint partner_areas_disciplines_values
  check (disciplines <@ array['trad','sport','toprope','aid','bouldering','alpine','mountaineering','scrambling','ice','mixed']::text[]);
comment on column public.partner_areas.disciplines is
  'What the climber wants at this area; empty = any. Crag types (trad/sport/toprope/aid/bouldering) and, since 0456 (peak listings), alpine/mountaineering/scrambling/ice/mixed.';

commit;
