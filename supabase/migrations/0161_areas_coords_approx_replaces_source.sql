-- `areas.source` is not a source. Give the flag its own name and drop the column.
--
-- The column held two unrelated things. 73 rows carried an INGEST TAG naming where a batch came
-- from — 'fourteeners' (43), 'fifty-classics-roster' (25), 'peak-lists' (3), 'cascade-volcanoes'
-- (2) — which is a source, and the app carries none. The other 2 rows carried
-- 'approx-picket-range', which is not a source at all: `DbAreaBrowser` reads it to render
-- "Coordinates are approximate — the map pin and any distance shown are rough."
--
-- So this is NOT a straight drop. That warning is load-bearing and true: The Pyramid and Frenzel
-- Spitz hold coordinates DERIVED from a published ordering rather than observed (see 0159), and a
-- climber should go on being told so. Dropping the column to satisfy a naming rule would delete a
-- real caveat, which is the same trade refused when the hazard disclaimer lost its sourcing
-- clause and kept "Always check current conditions and forecasts".
--
-- `coords_approx` says what it means, cannot be mistaken for provenance, and cannot quietly grow
-- ingest tags again because it is a boolean.
--
-- Checked before dropping, which is the lesson #1020 paid for: `drop column` leaves any plpgsql
-- function that names the column syntactically valid and breaks it only when it next RUNS. A
-- pg_proc scan over every plpgsql/sql function in `public`, comments stripped, returns ZERO
-- functions naming `source` — 0157 removed the last one. `scripts/check-function-columns.mjs`
-- exists to make that check routine rather than remembered.
--
-- App-side, in the same commit: DbAreaBrowser reads the new column, and the three loaders
-- (load-state, import-alpine, load-wa-rock-safe) stop writing the old one from their aRow
-- builders. Note their rRow builders already stopped at 0155 — aRow is the half that survived,
-- and editing them together by a blanket replace is how you break area loading.

alter table areas add column if not exists coords_approx boolean not null default false;

update areas set coords_approx = true where source = 'approx-picket-range';

alter table areas drop column if exists source;
