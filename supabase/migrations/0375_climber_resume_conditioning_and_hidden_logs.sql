-- The résumé's CONDITIONING, and the logged climbs its owner has taken OFF the Experience list.
--
-- Conditioning was shown on a résumé (`climber.conditioning`) but nothing stored or edited it: the
-- value was seeded "" on every real profile and no editor wrote it, so a real climber could never
-- say how they train (owner's note, 2026-10-25). It lives on the same one-row-per-climber table as
-- the headline and courses, so the owner's edit and every other reader read it through one policy.
--
-- hidden_logs holds the KEYS of logged climbs the owner does not want on Experience ("routeId|date|tickType",
-- built by Resume.tsx `logKey`). It hides the row from the résumé only: the log itself, Sends by
-- grade and the logbook are untouched. Hand-added climbs are removed from the `climbs` list instead.
begin;

alter table public.climber_resumes
  add column if not exists conditioning text not null default ''
    check (char_length(conditioning) <= 400),
  add column if not exists hidden_logs jsonb not null default '[]'::jsonb
    check (jsonb_typeof(hidden_logs) = 'array' and jsonb_array_length(hidden_logs) <= 2000);

comment on column public.climber_resumes.conditioning is
  'How the climber trains, in their own words (0375). Shown on the résumé; written only by the owner.';
comment on column public.climber_resumes.hidden_logs is
  'Keys ("routeId|date|tickType") of logged climbs the owner hid from the résumé Experience list (0375). The climbs themselves are unchanged.';

commit;

-- PostgREST caches the schema; without this the new columns are invisible until the next reload.
notify pgrst, 'reload schema';
