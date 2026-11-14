-- wa_mount_chaval_north_ridge: this row's own `approach` field claims to share "the West Route"'s
-- approach drainage, naming it "(Jug Creek/Bluff Lake/Cliff Lake benches)" -- but the actual West
-- Route row (wa_mount_chaval_scramble) stores a completely different drainage for its own approach:
-- Arrow Creek off Illabot Creek Road (FR-16), with no mention of Jug Creek, Bluff Lake or Cliff Lake
-- anywhere in its text. The parenthetical is contamination from elsewhere, not a description of the
-- route this row's own sibling actually documents. Corrected to name the drainage the West Route row
-- itself uses, leaving the rest of the sentence (which correctly describes diverging to the north
-- ridge rather than the west-ridge saddle system) unchanged.
UPDATE routes
SET approach = 'Shares the same general approach drainage as the West Route (Arrow Creek off Illabot Creek Road/FR-16) to gain the west side of the mountain, then continues around/up to the base of the north ridge rather than the west-ridge saddle system.'
WHERE id = 'wa_mount_chaval_north_ridge';
