-- Spectre Peak "Haunted Wall": no source names this route or feature (identity-six.md).
-- Owner approved deletion 2026-11-24 ("do what you reccomend based on research"). Nothing refers to the row.
begin;
delete from routes where id = 'wa_spectre_peak_haunted_wall' and area_id = 'wa_spectre_peak' and name = 'Haunted Wall';
commit;
