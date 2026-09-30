-- ONLY THE INVITEE CAN SAY THEY ARE IN.
--
-- The crew card offered the organiser a "Mark confirmed" button on an invited climber, and the
-- database let it land: 0086's "organizer updates membership" policy has no status condition, and
-- 0180's insert policy lets the organiser add anyone "at any status". So an organiser could put a
-- climber into a crew -- into its chat, its float plan and its "Ready" count -- who had never
-- answered the invite. The button is gone from the app; this makes the row refuse it too.
--
-- A policy cannot express this: WITH CHECK sees only the NEW row, and the rule depends on the OLD
-- status. Two transitions into 'confirmed' stay legal for someone other than the member:
--   * old status 'pending' -- the climber ASKED to join and the organiser accepts the request;
--   * no auth.uid() -- the service role / SQL editor, which bypasses RLS anyway.
-- The member themselves may always confirm (accepting an invite; the creator's own row on create).
-- Every other move into 'confirmed', by UPDATE or by INSERT, raises.
--
-- Withdrawing an invite needs nothing new: 0036's "self or organizer can remove membership"
-- already lets the organiser delete the row.

create or replace function public.crew_members_only_self_confirms()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if new.status = 'confirmed'
     and auth.uid() is not null
     and auth.uid() <> new.user_id
     and (tg_op = 'INSERT' or old.status is distinct from 'confirmed')
     and (tg_op = 'INSERT' or old.status is distinct from 'pending')
  then
    raise exception 'Only the climber themselves can accept a crew invite'
      using errcode = '42501';
  end if;
  return new;
end
$$;

drop trigger if exists crew_members_only_self_confirms on crew_members;
create trigger crew_members_only_self_confirms
  before insert or update of status on crew_members
  for each row execute function public.crew_members_only_self_confirms();

-- VERIFY:
--   select tgname from pg_trigger where tgname = 'crew_members_only_self_confirms';
--   select prosrc from pg_proc where proname = 'crew_members_only_self_confirms';
