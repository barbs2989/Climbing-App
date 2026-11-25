-- The screen-content hook is SIGNED, so a captured or forged call cannot be replayed.
--
-- 0265 wired screen_after_insert to POST { kind, id } to the screen-content edge function through
-- pg_net. The function is deployed --no-verify-jwt (the caller is the database, which has no user
-- JWT), and the request carried nothing that proved it came from the database. Anyone who knew the
-- URL and a row id could post it at any time and the function would screen that row again. Its only
-- guard was a "once per row" ledger entry meant to last 30 days, which the ledger's own cleanup
-- deletes after 8 (_shared/ratelimit.ts) -- so any visible row older than ~8 days could be replayed
-- into a fresh paid model call and a possible new hold, up to the 2,000/hour cap, and burning that
-- cap leaves genuinely new content unscreened by the model.
--
-- Now, once a secret is configured, every hook call carries:
--   x-screen-timestamp  unix seconds when the trigger fired
--   x-screen-signature  hex HMAC-SHA256(secret, "<timestamp>.<kind>.<id>")
-- The function recomputes it, compares in constant time, and refuses anything older than 10
-- minutes. A replay outside that window fails the timestamp; inside it, the per-row ledger entry
-- (now 7 days, inside the cleanup) refuses it. The fields are signed rather than the JSON text, so
-- the check does not depend on how pg_net serialises the body.
--
-- Rollout (production, by hand, in this order):
--   1. Apply this migration. Nothing changes yet: with no secret the trigger sends what it sent before.
--   2. Make one secret and give it to both ends:
--        insert into app_secrets (key, value)
--        values ('screen_hook_secret', encode(extensions.gen_random_bytes(32), 'hex'))
--        returning value;
--        npx supabase secrets set SCREEN_HOOK_SECRET=<that value>
--   3. Deploy the function: npx supabase functions deploy screen-content --no-verify-jwt
-- From then on an unsigned or stale call gets 401. Until SCREEN_HOOK_SECRET is set the function
-- still accepts unsigned calls, so deploying the code first cannot switch screening off.

-- pgcrypto for hmac(); Supabase installs it in "extensions". Guarded like 0265's pg_net, so a
-- replay without it degrades to unsigned calls rather than failing.
do $$ begin
  create extension if not exists pgcrypto with schema extensions;
exception when others then
  raise notice 'pgcrypto is not available here; the screen hook will be sent unsigned: %', sqlerrm;
end $$;

-- Secrets the database itself needs. RLS on and NO policies: no client role can read or write it.
-- Only the service role and security-definer functions (screen_after_insert below) see it.
-- Deliberately not app_settings, which admins can read from the app.
create table if not exists app_secrets (
  key   text primary key,
  value text not null
);
alter table app_secrets enable row level security;
revoke all on app_secrets from anon, authenticated;

-- 0265's body, unchanged except for the signed headers on the hook call.
create or replace function screen_after_insert() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_kind    text := tg_argv[0];
  v_author  uuid := (to_jsonb(new) ->> tg_argv[1])::uuid;
  v_text    text := screening_text(tg_argv[0], to_jsonb(new));
  v_cat     text;
  v_url     text;
  v_secret  text;
  v_ts      text;
  v_headers jsonb := '{"Content-Type": "application/json"}'::jsonb;
begin
  if not screen_should_run(v_kind, tg_op, case when tg_op = 'UPDATE' then to_jsonb(old) end, to_jsonb(new)) then
    return null;
  end if;
  if new.moderation = 'held' and (tg_op = 'INSERT' or old.moderation = 'visible') then
    v_cat := screening_match(v_text);
    insert into user_reports (reporter, reporter_label, reported_id, reported_name, reason, detail, status,
                              target_kind, target_id, snapshot, snapshot_at)
    values (null, 'Automatic screening', v_author::text,
            (select case when pr.show_name and coalesce(pr.name, '') <> '' then pr.name
                         when coalesce(pr.username, '') <> '' then '@' || pr.username else 'A climber' end
               from profiles pr where pr.id = v_author),
            'Automatic screening: ' || coalesce(v_cat, 'flagged term'), 'Held before anyone else saw it.', 'open',
            v_kind, new.id::text, left(v_text, 8000), now());
    insert into moderation_actions (actor, action, target_kind, target_id, target_owner, note)
    values (null, 'auto_hold', v_kind, new.id::text, v_author, 'screening term: ' || coalesce(v_cat, '?'));
    return null;
  end if;
  select value into v_url from app_settings where key = 'screen_hook_url';
  if v_url is not null and new.moderation = 'visible' then
    begin
      select value into v_secret from app_secrets where key = 'screen_hook_secret';
      if v_secret is not null then
        -- clock_timestamp, not now(): now() is the transaction's start, which a long transaction
        -- would push toward the function's freshness limit.
        v_ts := floor(extract(epoch from clock_timestamp()))::bigint::text;
        v_headers := v_headers || jsonb_build_object(
          'x-screen-timestamp', v_ts,
          'x-screen-signature', encode(extensions.hmac(v_ts || '.' || v_kind || '.' || new.id::text, v_secret, 'sha256'), 'hex'));
      end if;
      perform net.http_post(url := v_url,
                            body := jsonb_build_object('kind', v_kind, 'id', new.id),
                            headers := v_headers);
    exception when others then
      -- Screening must never cost a climber their post.
      raise notice 'screen hook skipped: %', sqlerrm;
    end;
  end if;
  return null;
end;
$$;
