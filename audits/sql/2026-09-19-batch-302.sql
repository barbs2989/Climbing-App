-- WA alpine route audit -- batch 302 (2026-09-19, pass 5)
-- Human-reviewable fixes. Nothing here is applied automatically.

-- wa_the_rake_traverse_route (The Rake, Southern Pickets)
-- grade_num stored 7 for a route whose own `grade`/`rock_grade` is "5.9" -- every
-- other route in the catalog carrying a 5.9 rock grade (15/15 sampled, including
-- routes combining an alpine commitment grade with 5.9 exactly as this one does,
-- e.g. wa_mount_stuart_north_ridge's identical "Grade IV, 5.9" format) stores
-- grade_num = 9. This route's grade_num of 7 is the sole outlier and would sort/filter
-- it as roughly a 5.7 instead of a 5.9 anywhere the app orders routes by grade_num.
UPDATE routes SET grade_num = 9
  WHERE id = 'wa_the_rake_traverse_route' AND grade_num = 7 AND grade = 'IV, 5.9';

-- wa_the_west_face (The West Face, North Early Winters Spire)
-- Three related fixes, all corroborated externally (North Cascade Mountain Guides'
-- and a Wenatchee-Outdoors-style route description, both independently describing
-- the line as five roped pitches -- "a couple of pitches of 5.7-5.8", then corner/
-- layback climbing to the crux belay, the crux pitch itself, then "an easy pitch
-- and some scrambling lead to the summit" -- with "half a dozen rappels" back to
-- the base, a separate number from the pitch count) and by this row's own stored
-- pitch_detail, which has only ever held 5 entries (P1-P5):
--  1. pitches stored 6, contradicting this row's own pitch_detail array length (5)
--     and the external route descriptions above ("five pitches"; check:pitch-split's
--     documented pitchShortfall class -- a route claiming more pitches than its own
--     pitch_detail describes).
--  2. overview repeated the same wrong pitch count and also gave a length (500 ft /
--     152 m) that matches neither this row's own length_m (201 m) nor theCrag's
--     independently listed "200m Alpine climb" for this exact route -- corrected to
--     match the figure already stored in length_m.
--  3. loss_ft was NULL despite gain_ft=2400 on a route with a short (1-2 hr),
--     same-trailhead car-to-base-and-back approach (per this row's own `approach`
--     text) -- two direct sibling routes on this same peak with the same trailhead
--     (wa_early_winter_couloir, wa_flycatcher_buttress) both store gain_ft=loss_ft=2400.
UPDATE routes SET pitches = 5
  WHERE id = 'wa_the_west_face' AND pitches = 6;
UPDATE routes SET overview = 'The West Face (III 5.11-) is a 5-pitch, roughly 660 ft (201 m) route first climbed (with aid) by Fred Beckey and Dave Beckstad in 1965, with Steve Risse and Dave Tower making the first free ascent in 1985.'
  WHERE id = 'wa_the_west_face' AND overview = 'The West Face (III 5.11-) is a 6-pitch, roughly 500 ft (152 m) route first climbed (with aid) by Fred Beckey and Dave Beckstad in 1965, with Steve Risse and Dave Tower making the first free ascent in 1985.';
UPDATE routes SET loss_ft = 2400
  WHERE id = 'wa_the_west_face' AND loss_ft IS NULL AND gain_ft = 2400;

-- wa_the_roof, wa_classic_route_2, wa_open_book_2 (Unicorn Peak summit-block routes)
-- Found while auditing wa_the_roof: all three of Unicorn Peak's summit-block lines
-- (The Roof, Classic Route, Open Book) share the IDENTICAL length_m value of 122,
-- yet each row's own pitch_detail independently and consistently documents itself
-- as a single 15 m pitch (matching the ~40-50 ft single-rope rappel each route's own
-- descent_text/rappels field describes for getting back down). 122 m (~400 ft) does
-- not match any of the three routes' own documented climbing and is the same value
-- copied across all three siblings rather than a route-specific figure -- the
-- cross-route field-value contamination pattern this project's own audit tooling
-- (check:field-renders / audit:identity) is written to catch. Corrected all three to
-- 15, matching each row's own pitch_detail.lengthM. wa_classic_route_2 and
-- wa_open_book_2 were not part of this run's assigned batch but were queried
-- directly as necessary corroborating context (both share the identical anchor
-- system and are explicitly cross-referenced in wa_the_roof's own beta/pitch_detail
-- text) and are fixed here alongside it rather than left half-corrected.
UPDATE routes SET length_m = 15
  WHERE id = 'wa_the_roof' AND length_m = 122;
UPDATE routes SET length_m = 15
  WHERE id = 'wa_classic_route_2' AND length_m = 122;
UPDATE routes SET length_m = 15
  WHERE id = 'wa_open_book_2' AND length_m = 122;

-- wa_the_triad_east_peak (The Triad, East Peak)
-- overview self-contradicted its own first-ascent sentence: it names FOUR climbers
-- (Dick Eilertsen, Dick Lowery, Dick Scales, and Don Wilde) and then describes them
-- as "a party of three climbers all named Dick" -- but Don Wilde is not named Dick,
-- so the party cannot be both four-named and three-total-all-Dick. Confirmed via
-- external search (matches this row's own names) that the historical party was
-- four people, three of whom shared the first name Dick (hence the "Three Dicks"
-- nickname the row already reports); Don Wilde was the fourth, differently-named
-- member. Corrected the count/description to match the four names already listed,
-- with no names added, removed, or changed.
UPDATE routes SET overview = 'The Triad is a cluster of three rocky summits (west, middle, and east peaks, all within roughly 80 ft of each other in height) on the southwest ridge extension of Eldorado Peak, rising above the remote, glaciated Marble Creek cirque in North Cascades National Park. Composed of granodioritic orthogneiss, the peaks were first climbed in 1949 by Dick Eilertsen, Dick Lowery, Dick Scales, and Don Wilde -- a four-person party, three of whom were named Dick, who first called the massif the ''Three Dicks'' before the tamer ''Triad'' stuck. It lies about 2 miles southwest of Eldorado Peak (~8,873 ft) and offers views toward Dorado Needle and Early Morning Spire. Despite sitting right next to one of the North Cascades'' most popular glacier climbs, the Triad itself is rarely ascended.'
  WHERE id = 'wa_the_triad_east_peak' AND overview = 'The Triad is a cluster of three rocky summits (west, middle, and east peaks, all within roughly 80 ft of each other in height) on the southwest ridge extension of Eldorado Peak, rising above the remote, glaciated Marble Creek cirque in North Cascades National Park. Composed of granodioritic orthogneiss, the peaks were first climbed in 1949 by Dick Eilertsen, Dick Lowery, Dick Scales, and Don Wilde -- a party of three climbers all named Dick, who first called the massif the ''Three Dicks'' before the tamer ''Triad'' stuck. It lies about 2 miles southwest of Eldorado Peak (~8,873 ft) and offers views toward Dorado Needle and Early Morning Spire. Despite sitting right next to one of the North Cascades'' most popular glacier climbs, the Triad itself is rarely ascended.';
