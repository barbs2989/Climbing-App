-- Read-only: count, in EVERY table with a foreign key to routes(id), the rows pointing at the
-- 3 misfiled routes. One row per table; all must be 0 before the duplicate is deleted.
do $$
declare r record; n bigint; out text := '';
begin
  for r in select conrelid::regclass::text t, a.attname c
           from pg_constraint k join pg_attribute a on a.attrelid = k.conrelid and a.attnum = any(k.conkey)
           where k.contype = 'f' and k.confrelid = 'public.routes'::regclass loop
    execute format('select count(*) from %s where %I = any($1)', r.t, r.c) into n
      using array['wa_bald_eagle_peak_daniel_glacier','wa_big_chiwaukum_mount_temple_ridge','wa_big_chiwaukum_three_musketeers_ridge'];
    out := out || r.t || '.' || r.c || '=' || n || ' ';
  end loop;
  create temp table if not exists _fk_out(s text); delete from _fk_out; insert into _fk_out values (out);
end $$;
select s from _fk_out;
