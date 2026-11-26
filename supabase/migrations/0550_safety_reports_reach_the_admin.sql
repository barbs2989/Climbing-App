-- 0550: a safety report, a reported photo or an appeal tells every admin, in the app's own bell.
--
-- Owner, 2026-11-26: reports should be "pushed to my admin dashboard so that I can review it" and act on
-- them, to meet App Store guideline 1.2 ("timely responses") and Google Play's UGC policy. The Review desk
-- (review.html) gets a Safety section in the same PR. What was missing is the PUSH: the only alert is the
-- notify-safety-report email, and it sends nothing until RESEND_API_KEY and SAFETY_ALERT_EMAIL are set
-- (they are not, 2026-11-26). So a report could wait, unseen, behind a promise of "within 24 hours".
--
-- A notice row (user_notices, 0307) for each admin when one of these lands:
--   user_reports        (a climber or a piece of content was reported, or automatic screening held something)
--   content_reports     (a route photo was reported)
--   moderation_appeals  (someone asked for a removal, a suspension, a ban or a contributing pause to be looked at again)
-- Its link is {"desk": "<section>"}; the app opens review.html#<section> when it is tapped.
--
-- A failure to notify must never refuse the report itself, so the body is wrapped in an exception block.
-- The notice names the reason and who it is about, not what was said: the words stay on the desk.

create or replace function _notify_admins_safety() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  a      record;
  v_desk text := 'safety';
  v_title text;
  v_body  text;
begin
  begin
    if tg_table_name = 'user_reports' then
      v_title := case when new.reporter_label = 'Automatic screening' then 'Held by automatic screening' else 'Safety report: ' || coalesce(new.reason, 'no reason given') end;
      v_body  := 'About ' || coalesce(nullif(new.reported_name, ''), 'a climber') || '. Open the Review desk to act; the target is 24 hours.';
    elsif tg_table_name = 'content_reports' then
      v_title := 'A route photo was reported';
      v_body  := 'Open the Review desk to keep it up or take it down; the target is 24 hours.';
    else
      if new.target_kind = 'contributing' then v_desk := 'appeals'; end if;
      v_title := case new.target_kind when 'account' then 'Appeal: a suspended or banned climber'
                                      when 'contributing' then 'Appeal: a paused contributor'
                                      else 'Appeal: removed content' end;
      v_body  := 'Someone asked for another look. Open the Review desk to decide.';
    end if;
    for a in select id from profiles where is_admin loop
      perform _notify(a.id, 'safety_report', v_title, v_body, jsonb_build_object('desk', v_desk));
    end loop;
  exception when others then
    raise warning '_notify_admins_safety: %', sqlerrm;
  end;
  return null;
end;
$$;
revoke all on function _notify_admins_safety() from public, anon, authenticated;

drop trigger if exists user_reports_notify_admins on user_reports;
create trigger user_reports_notify_admins after insert on user_reports
  for each row execute function _notify_admins_safety();

drop trigger if exists content_reports_notify_admins on content_reports;
create trigger content_reports_notify_admins after insert on content_reports
  for each row execute function _notify_admins_safety();

drop trigger if exists moderation_appeals_notify_admins on moderation_appeals;
create trigger moderation_appeals_notify_admins after insert on moderation_appeals
  for each row execute function _notify_admins_safety();

-- Confirm (service key):
--   select tgname from pg_trigger where tgname like '%_notify_admins';   -- 3 rows
