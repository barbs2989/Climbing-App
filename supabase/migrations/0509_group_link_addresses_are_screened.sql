-- 0509: a group link's ADDRESS is screened as well as its label (review of 0506, 2026-11-23).
--
-- 0506 added up to four links to a group and screened their labels with the group's other text. The About tab
-- prints each link's address under its label too (without the https://), so an address could carry words
-- screening never read. The 'group' line now carries both halves. Only that line changes; every other kind is 0506's.
create or replace function screening_text(p_kind text, r jsonb) returns text
language sql immutable as $$
  select case p_kind
    when 'message'      then r->>'body'
    when 'crew_message' then r->>'body'
    when 'group_post'   then r->>'body'
    when 'group_event'  then concat_ws(E'\n', r->>'title', r->>'descr', r->>'location')
    when 'comment'      then r->>'text'
    when 'trip_report'  then concat_ws(E'\n', r->>'notes', r->>'beta', r->>'gear_beta', r->>'road_note', r->>'outcome_note', r->>'sun_note')
    when 'group'        then concat_ws(E'\n', r->>'name', r->>'blurb', r->>'location', r->>'welcome_text', r->>'announcement', r->>'mod_title',
                               (select string_agg(concat_ws(' ', l->>'label', l->>'url'), E'\n') from jsonb_array_elements(case when jsonb_typeof(r->'links') = 'array' then r->'links' else '[]'::jsonb end) l))
    when 'topo'         then concat_ws(E'\n', r->>'alt', r->>'photographer', r->>'caption')
    when 'topo_line'    then nullif(concat_ws(E'\n', r->>'label',
                               (select string_agg(v, E'\n') from jsonb_array_elements_text(case when jsonb_typeof(r->'variant_labels') = 'array' then r->'variant_labels' else '[]'::jsonb end) v where v <> ''),
                               (select string_agg(p->>'note', E'\n') from jsonb_array_elements(case when jsonb_typeof(r->'pins') = 'array' then r->'pins' else '[]'::jsonb end) p where coalesce(p->>'note', '') <> '')), '')
    when 'list'         then concat_ws(E'\n', r->>'name', r->>'description')
  end;
$$;
