-- 0488: a topo photo's CAPTION is screened, like its description.
--
-- 0265 screens the words of a new or edited row against the floor list, and for a topo those words
-- were `alt` and `photographer`. 0362 then added `topos.caption`: text of any length, written by the
-- uploader and read by everyone who opens the topo, both under its thumbnail and in the viewer. It
-- was never added to screening_text, so the one long free-text field on a topo was the one the floor
-- did not read (topo audit, 2026-11-23; measured on the live function).
--
-- Only the 'topo' line changes. screen_should_run compares screening_text before and after an
-- UPDATE, so a caption edited later is screened too; nothing else needs to change. No backfill: the
-- live table held no captioned topo when this was written.
--
-- NOT covered here: the text on a topo LINE (its name, its variations' captions, its markers' notes,
-- all in topo_lines) has no screening kind at all. That needs a moderation column on topo_lines and a
-- report kind, which is a decision, not a one-line fix.

create or replace function screening_text(p_kind text, r jsonb) returns text
language sql immutable as $$
  select case p_kind
    when 'message'      then r->>'body'
    when 'crew_message' then r->>'body'
    when 'group_post'   then r->>'body'
    when 'group_event'  then concat_ws(E'\n', r->>'title', r->>'descr', r->>'location')
    when 'comment'      then r->>'text'
    when 'trip_report'  then concat_ws(E'\n', r->>'notes', r->>'beta', r->>'gear_beta', r->>'road_note', r->>'outcome_note', r->>'sun_note')
    when 'group'        then concat_ws(E'\n', r->>'name', r->>'blurb', r->>'location')
    when 'topo'         then concat_ws(E'\n', r->>'alt', r->>'photographer', r->>'caption')
    when 'list'         then concat_ws(E'\n', r->>'name', r->>'description')
  end;
$$;
