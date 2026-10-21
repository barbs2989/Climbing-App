-- A topo line's VARIATIONS are lines of their own, drawn yellow beside the red route line.
--
-- The editor used to offer a "Variant line" PIN: a single dot standing in for a line, which
-- cannot show where a variation leaves the route or where it rejoins it. The owner asked for
-- variations on the Draw line tab instead (2026-10-21), as printed topos and Steph Abegg's
-- overlays draw them. Each entry is its own [{x,y}, …] polyline, in the same 0..100 photo
-- percentages as `points`.
--
-- No row moves: topo_lines held 0 rows (and 0 variant pins) when this was written. Pitch GRADES
-- need no column: they are pins of category 'grade' whose note is the grade, in `pins`.

alter table topo_lines add column if not exists variants jsonb not null default '[]'::jsonb;

comment on column topo_lines.variants is
  'The route''s variations on this photo: an array of lines, each [{x,y}, …] in 0..100 photo percentages (like points). Drawn yellow; the route line (points) is red.';
