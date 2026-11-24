-- 0507: a partner no longer needs a 30-day-old account for their confirmation to count
-- (owner, 2026-11-23: "i don't think we need to wait 30 days").
--
-- rankable_logs() required the confirming partner's account to be at least 30 days old at the moment
-- they confirmed (since 0203). That rule is gone, and with it the join to profiles only it needed.
-- Still required: the partner was tagged on the log, is not the author, has a confirmed email, is an
-- accepted connection, neither has blocked the other, and any one partner backs at most 12 of your
-- climbs a calendar year. A climb a tagged partner denies still counts nowhere.
--
-- Body = 0504's definition with the account-age line removed; nothing else changes.

CREATE OR REPLACE FUNCTION public.rankable_logs(p_users uuid[])
 RETURNS TABLE(id uuid, user_id uuid, route_id text, date_climbed date, tick_type text, created_at timestamp with time zone, is_report boolean, tier text, nth_on_route bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  with raw as (
    select l.id, l.user_id, l.route_id, l.date_climbed, l.tick_type, l.created_at,
           (coalesce(l.trip_report_visibility, '') in ('public', 'crew', 'friends')
            and (btrim(coalesce(l.notes, '')) <> '' or cardinality(coalesce(l.cond_tags, '{}')) > 0
                 or btrim(coalesce(l.beta, '')) <> '')) as is_report,
           l.partners, l.photo_taken_on, l.photo_near_route, l.photo_hash, l.gpx_track,
           coalesce(ro.lat, ra.lat) as rlat, coalesce(ro.lng, ra.lng) as rlng
      from climb_logs l
      join routes ro on ro.id = l.route_id
      join areas ra on ra.id = ro.area_id
     where l.user_id = any(p_users)
       and l.date_climbed is not null
       and l.date_climbed <= current_date + 1
       and not exists (select 1 from climb_log_confirmations c
                        where c.log_id = l.id and c.verdict = 'denied' and c.partner_id = any(l.partners))
  ),
  good_conf as (
    select c.log_id, r.user_id as author, c.partner_id, r.date_climbed
      from raw r
      join climb_log_confirmations c on c.log_id = r.id
     where c.verdict = 'confirmed'
       and c.partner_id = any(r.partners) and c.partner_id <> r.user_id
       and exists (select 1 from verification_records v
                    where v.user_id = c.partner_id and v.verification_type = 'email' and v.status = 'verified')
       and exists (select 1 from connections cn where cn.status = 'accepted'
                    and ((cn.requester = r.user_id and cn.addressee = c.partner_id)
                      or (cn.addressee = r.user_id and cn.requester = c.partner_id)))
       and not exists (select 1 from blocked_users b
                        where (b.blocker = r.user_id and b.blocked = c.partner_id)
                           or (b.blocker = c.partner_id and b.blocked = r.user_id))
  ),
  -- Any one partner backs at most 12 of your climbs a calendar year. (Until 0504 this also
  -- required two different partners before any confirmation counted.)
  capped_conf as (
    select g.log_id,
           row_number() over (partition by g.author, g.partner_id, extract(year from g.date_climbed)
                              order by g.date_climbed, g.log_id) as nth
      from good_conf g
  ),
  tiered as (
    select r.*,
           case when exists (select 1 from capped_conf cc where cc.log_id = r.id and cc.nth <= 12) then 'confirmed'
                when (r.photo_taken_on between r.date_climbed - 1 and r.date_climbed + 1
                      and r.photo_near_route is not false
                      and photo_is_first_use(r.id, r.photo_hash))
                  or log_track_backs_climb(r.gpx_track, r.date_climbed, r.rlat, r.rlng) then 'evidence'
                else 'self' end as tier
      from raw r
  ),
  one_a_day as (
    select t.*,
           row_number() over (partition by t.user_id, t.route_id, t.date_climbed
                              order by case t.tier when 'confirmed' then 0 when 'evidence' then 1 else 2 end,
                                       t.created_at, t.id) as rn_day
      from tiered t
  ),
  deduped as (
    select d.*,
           row_number() over (partition by d.user_id, d.date_climbed order by d.created_at, d.id) as rn_cap,
           row_number() over (partition by d.user_id, d.route_id order by d.date_climbed, d.created_at, d.id) as nth
      from one_a_day d where d.rn_day = 1
  )
  select x.id, x.user_id, x.route_id, x.date_climbed, x.tick_type, x.created_at,
         x.is_report, x.tier, x.nth
    from deduped x where x.rn_cap <= 30;
$function$;

revoke all on function public.rankable_logs(uuid[]) from public;
revoke all on function public.rankable_logs(uuid[]) from anon;
revoke all on function public.rankable_logs(uuid[]) from authenticated;
