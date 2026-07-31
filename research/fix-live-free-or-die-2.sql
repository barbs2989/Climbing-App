-- Correction to research/fix-live-free-or-die.sql (#492).
--
-- That fix was right that grade 'V5+' was wrong — a boulder grade on an 1,100ft+
-- multi-pitch route — but it took the replacement values from the route's OWN
-- overview text, and that text is itself wrong on both counts. Verified against
-- independent published sources for the route (Liberty Bell East Face, first
-- climbed 2017):
--
--   pitches   stored 8   -> actually 11
--   grade     stored 5.11+ -> listed as 5.12-
--   length    1200 ft / 366 m  (already correct, and it corroborates 11)
--
-- Where the 8 came from: the line runs 8 pitches to M&M Ledge, then pitches
-- 9-11 continue up Thin Red Line to the top. "8 pitches" is the first section,
-- not the route. length_m 366 (~1200 ft) never matched an 8-pitch reading and
-- was the tell sitting in the same row.
--
-- On the grade there is genuine published disagreement — the route page lists
-- 5.12-, while the first-ascent write-up calls it 5.12+. Both are 5.12; neither
-- is 5.11+. Taking 5.12- as the conservative published figure. The overview's
-- own aside that "crux may feel 5.12b for shorter climbers" already sat oddly
-- beside a 5.11+ label.
--
-- The two factual claims inside the overview prose are corrected in place rather
-- than rewritten, so the surrounding wording is untouched.
--
-- Guarded on the current (post-#492) values; a re-run affects 0 rows.

update routes
   set grade    = '5.12-',
       pitches  = 11,
       overview = replace(
                    replace(overview, 'full 8-pitch', 'full 11-pitch'),
                    'grade 5.11+ yds', 'grade 5.12- yds')
 where id = 'wa_live_free_or_die'
   and area_id = 'wa_liberty_bell'
   and grade = '5.11+'
   and pitches = 8;

select id, grade, grade_system, pitches, length_m,
       left(overview, 160) as overview_head
  from routes
 where id = 'wa_live_free_or_die';
