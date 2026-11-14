-- A topo PHOTO carries a caption from the climber who posted it, and each VARIATION line carries
-- a label of its own (owner, 2026-10-23: "variant line ... allowed to have a caption so the user
-- has context that it's a variant"; "the person who uploaded the photo [can] add a caption ... no
-- limit to the text amount. Users can read the captions as well").
--
-- topos.caption is NOT topos.alt. `alt` (0193) is the screen-reader description of what the
-- picture shows, capped at 300; a caption is context for everyone who opens the topo — which
-- face, when it was taken, what changed since — and has no cap, so it is plain `text` with no
-- check. The uploader writes it: "topos own update" (0026) already scopes updates to created_by.
--
-- topo_lines.variant_labels is aligned by index with topo_lines.variants (0330): label i names
-- variation i ("5.10a direct start", "avoids the wet chimney"), '' when it has none. A parallel
-- array rather than turning each variant into an object, so every reader of `variants` — still
-- an array of [{x,y}, …] lines — keeps working untouched.
--
-- No row moves: 3 topos (none with a caption to carry over) and 0 topo_lines with a variation
-- when this was written.

alter table topos add column if not exists caption text;

comment on column topos.caption is
  'Context from the climber who posted the photo, shown to everyone under the enlarged topo. No length cap. Not the alt text (alt is the screen-reader description).';

alter table topo_lines add column if not exists variant_labels jsonb not null default '[]'::jsonb;

comment on column topo_lines.variant_labels is
  'One label per entry of variants, by index ('''' when unlabelled): what each yellow variation line is, shown beside it on the photo and in the key.';
