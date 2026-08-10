-- Rappel-count corrections 1/2 — Liberty Bell. 2026-08-09.
-- Run `npm run check:sql -- audits/2026-08-09-rappel-counts-1-liberty-bell.sql` first.
-- The SQL Editor reports success for an UPDATE that matched zero rows, so re-read the ids after.
--
-- The row said 2 rappels while its own gear list says to bring a "50-60m rope" — one rope.
-- Those cannot both be right, and the sources agree with the rope:
--   * StephAbegg's Washington Pass page (the standard photo-beta reference for this
--     formation): "Three rappels with a single 60 will get you down", with descent photos
--     captioned "Rappel 1 of 3", "Rappel 2 of 3", "Rappel 3 of 3".
--   * Trip reports describe the same three stations - downclimb from the summit to slings on
--     a tree, rappel to a station with two good bolts on solid rock, rappel to a third
--     station (two trees with slings, the higher one better), then rappel diagonally to the
--     notch between Concord Tower and Liberty Bell.
--   * Mountain Project's "2 single rope rappels" describes the shorter EAST-side variant
--     entered 200 ft below the summit, not this line.
-- So 2 is the two-rope count and 3 is the single-rope count. The route recommends a single
-- rope, so 3 matches its own advice. Both are stated, because a party on doubles does do it
-- in 2. Per-rappel lengths are NOT published: 30 m is the bound implied by "three rappels
-- with a single 60", and rappel_count_note says so rather than implying a measured figure.
UPDATE routes SET
  rappels = '3',
  rappel_detail = '[
    {"n":1,"lengthM":30,"anchor":"tree hung with rappel slings","notes":"Reached by downclimbing the upper pitch about 20 ft from the summit, then moving left (east). First of the three single-rope rappels."},
    {"n":2,"lengthM":30,"anchor":"two bolts on solid rock","notes":"Second station, on a large ledge reached by scrambling down and to the right from the first rappel."},
    {"n":3,"lengthM":30,"anchor":"tree with rappel slings (two trees present, the higher one is the better anchor)","notes":"Rappels somewhat diagonally into the Liberty Bell-Concord notch at about 7,300 ft. Downclimb the gully from there to the packs."}
  ]'::jsonb,
  rappel_count_note = 'Three rappels with a single 60 m rope, which is the rope this route recommends. Parties carrying two ropes combine the lower two into one double-rope rappel and do it in 2, which is where the previous count of 2 came from. Individual rappel lengths are not published - 30 m is the bound implied by "three rappels with a single 60", not a measured length. This is the standard descent line shared with the East Face and Northwest Face routes.'
WHERE id = 'wa_liberty_bell_beckey_route';

-- Same descent line, recorded with a different count and no explanation. Not changing the
-- number - the East Face enters the rappel line lower, so 2 may well be right for it - but
-- the row should say the count depends on rope configuration, because a climber comparing
-- these three routes currently sees 2, 2 and 3 for one descent.
UPDATE routes SET
  rappel_count_note = 'Shares the standard Liberty Bell notch descent with the Beckey Route and Northwest Face. The count depends on rope configuration - the lower section is one double-rope rappel or two single-rope rappels, so a party on a single 60 m rope should expect one more rappel than the number recorded here. The East Face enters this line lower than the Beckey Route does.'
WHERE id = 'wa_liberty_bell_east_face';
