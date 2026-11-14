-- Crashes reach somebody.
--
-- AppErrorBoundary catches a render throw and shows "This screen hit a bug", and logs it to the
-- console of the one device it happened on. Nothing else heard about it: an error a climber hit at
-- a trailhead was known only if they chose to write a Feedback note. A throw in an event handler or
-- an unhandled rejected promise did not even reach the boundary. The owner chose (2026-11-04) to
-- report errors to our own database rather than to a third-party service.
--
-- Shaped like app_feedback (0365): ONE definer function files a row, signed in or not (the
-- publishable key cannot insert into a table as anon, 0078). Only an admin can read the table.
--
-- Bounded so a broken release cannot flood it: every text column is truncated, the same error from
-- the same climber (or the same guest message) on the same screen inside 10 minutes is counted once,
-- a signed-in climber files at most 30 an hour, guests together at most 300 an hour, and rows older
-- than 90 days are deleted as new ones arrive (the retention the Privacy Policy states).

begin;

create table if not exists app_errors (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references profiles(id) on delete cascade,
  kind           text not null check (kind in ('render','error','rejection')),
  message        text not null check (char_length(message) between 1 and 1000),
  stack          text check (stack is null or char_length(stack) <= 4000),
  component_stack text check (component_stack is null or char_length(component_stack) <= 4000),
  path           text check (path is null or char_length(path) <= 300),
  build          text check (build is null or char_length(build) <= 80),
  user_agent     text check (user_agent is null or char_length(user_agent) <= 300),
  created_at     timestamptz not null default now()
);

comment on table app_errors is
  'Errors the app hit on a climber''s device (0399). Filed only through file_app_error(); readable only by '
  'an admin. on delete cascade, as app_feedback: a deleted account takes its reports with it. Rows older '
  'than 90 days are deleted by file_app_error().';

create index if not exists app_errors_created_idx on app_errors (created_at);
create index if not exists app_errors_user_recent_idx on app_errors (user_id, created_at desc);
create index if not exists app_errors_message_recent_idx on app_errors (md5(message), created_at desc);

alter table app_errors enable row level security;

drop policy if exists "admin reads errors" on app_errors;
create policy "admin reads errors" on app_errors for select using (is_admin(auth.uid()));

drop policy if exists "admin deletes errors" on app_errors;
create policy "admin deletes errors" on app_errors for delete using (is_admin(auth.uid()));

-- No insert or update policy: every row arrives through the function below.
revoke insert, update on app_errors from anon, authenticated;

create or replace function public.file_app_error(p_kind text, p_message text, p_stack text default null,
  p_component_stack text default null, p_path text default null, p_build text default null,
  p_user_agent text default null)
returns void
language plpgsql volatile security definer set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_msg text := left(nullif(btrim(coalesce(p_message, '')), ''), 1000);
  v_path text := left(nullif(btrim(coalesce(p_path, '')), ''), 300);
begin
  if p_kind not in ('render','error','rejection') or v_msg is null then
    return; -- a malformed report is dropped, never raised: the caller is already handling an error
  end if;
  -- Same error, same screen, same climber (or any guest), inside 10 minutes: already recorded.
  if exists (select 1 from app_errors
             where md5(message) = md5(v_msg) and message = v_msg
               and path is not distinct from v_path
               and user_id is not distinct from v_uid
               and created_at > now() - interval '10 minutes') then
    return;
  end if;
  if v_uid is not null then
    if (select count(*) from app_errors where user_id = v_uid and created_at > now() - interval '1 hour') >= 30 then
      return;
    end if;
  elsif (select count(*) from app_errors where user_id is null and created_at > now() - interval '1 hour') >= 300 then
    return;
  end if;

  insert into app_errors (user_id, kind, message, stack, component_stack, path, build, user_agent)
  values (v_uid, p_kind, v_msg, left(p_stack, 4000), left(p_component_stack, 4000), v_path,
          left(p_build, 80), left(p_user_agent, 300));

  delete from app_errors where created_at < now() - interval '90 days';
end;
$$;

revoke all on function public.file_app_error(text, text, text, text, text, text, text) from public;
grant execute on function public.file_app_error(text, text, text, text, text, text, text) to anon, authenticated;
comment on function public.file_app_error(text, text, text, text, text, text, text) is
  'Files one error report from the app (0399). Signed in or not. Silently drops a malformed report, a '
  'repeat inside 10 minutes, and anything past 30/hour per climber or 300/hour across all guests; '
  'deletes reports older than 90 days.';

commit;
