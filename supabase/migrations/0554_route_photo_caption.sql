-- 0554: a ROUTE photo can carry a caption, written by the climber who posted it.
--
-- Owner's note (topo drawing item): "give the person who uploaded the photo [the ability] to add a
-- caption to the photo that would provide further context and no limit to the text amount. Users
-- can read the captions as well." 0362 did this for TOPO photos (topos.caption). A route photo on
-- the Photos tab is a `contributions` row of kind 'photo' (value = {url, alt?, pitch?}), and
-- contributions has NO update policy at all: once posted, nothing about a route photo could change.
--
-- So instead of opening UPDATE on the whole ledger (where a field vote or a new-route proposal must
-- never be edited after the fact), one SECURITY DEFINER function writes ONE key, value->'caption',
-- on ONE kind of row, for its own contributor only:
--   * signed in and not restricted (is_active_user, the rule every insert already carries);
--   * the row is kind 'photo' and contributor = the caller (the delete policy's test, 0151);
--   * no length cap, as the owner asked; blank removes the key;
--   * the words are screened against the floor list like a topo caption (0488). A contribution has
--     no moderation column to hold a row in, so a hit is REFUSED with a message rather than held:
--     the photo itself stays reportable from the viewer, as before.
-- The url, alt and pitch keys are left exactly as they were (value || {caption}), so 0552's
-- https check and every reader of value->>'url' are untouched.

create or replace function set_route_photo_caption(p_id uuid, p_caption text) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := auth.uid();
  v_cap text := nullif(btrim(coalesce(p_caption, '')), '');
  v_val jsonb;
begin
  if v_uid is null then
    raise exception 'Sign in to caption your photo.' using errcode = '42501';
  end if;
  if not is_active_user(v_uid) then
    raise exception 'This account cannot post right now.' using errcode = '42501';
  end if;
  if v_cap is not null and screening_match(v_cap) is not null then
    raise exception 'That caption can''t be posted. Please reword it.' using errcode = 'P0001';
  end if;
  update contributions
     set value = case when v_cap is null then value - 'caption'
                      else value || jsonb_build_object('caption', v_cap) end
   where id = p_id
     and kind = 'photo'
     and jsonb_typeof(value) = 'object'
     and contributor = v_uid::text
  returning value into v_val;
  if not found then
    raise exception 'Only the climber who posted this photo can caption it.' using errcode = '42501';
  end if;
  return v_val;
end;
$$;

revoke all on function set_route_photo_caption(uuid, text) from public, anon;
grant execute on function set_route_photo_caption(uuid, text) to authenticated;

comment on function set_route_photo_caption(uuid, text) is
  'The uploader''s caption on a route photo (contributions kind photo, value->caption): own row only, no length cap, blank removes it, screened like a topo caption (0554).';

-- ── The area page reads captions too ──────────────────────────────────────────────────────────────
-- area_photos (0541) feeds the photo strip on a crag or peak page. It returned each photo's alt but
-- not its caption, so a topo's caption (0362) and now a route photo's never reached the area page's
-- viewer. 0541's function verbatim, with `caption` added to both arms of the union.
create or replace function public.area_photos(p_area_id text, p_limit integer default 40)
returns jsonb
language sql
stable
set search_path = public
as $$
  with here as (select path from areas where id = p_area_id),
  ok as (select area_takes_photos(p_area_id) as place),
  pics as (
    select t.id::text as id, t.storage_path, null::text as url, t.alt, nullif(btrim(coalesce(t.caption, '')), '') as caption,
           t.route_id, r.name as route_name, t.area_id, a.name as area_name, t.created_at
      from topos t
      join areas a on a.id = t.area_id
      left join routes r on r.id = t.route_id
     where (select place from ok) and a.path <@ (select path from here)
       and (t.route_id is not null or t.area_photo)
    union all
    select c.id::text, null, c.value ->> 'url', nullif(c.value ->> 'alt', ''), nullif(btrim(coalesce(c.value ->> 'caption', '')), ''),
           c.route_id, r.name, r.area_id, a.name, c.created_at
      from contributions c
      join routes r on r.id = c.route_id
      join areas a on a.id = r.area_id
     where (select place from ok) and c.kind = 'photo' and jsonb_typeof(c.value) = 'object'
       and coalesce(c.value ->> 'url', '') like 'https://%'
       and a.path <@ (select path from here)
  )
  select jsonb_build_object(
    'place', coalesce((select place from ok), false),
    'photos', coalesce((select jsonb_agg(to_jsonb(p) order by p.created_at desc)
                          from (select * from pics order by created_at desc limit least(greatest(p_limit, 1), 100)) p), '[]'::jsonb))
$$;

grant execute on function public.area_photos(text, integer) to anon, authenticated;
