# Round-5 findings verified — 2026-09-26

Two agents checked the other-column findings in `2026-09-26-round5-findings.md` against sources (`2026-09-26-verify-10.json`,
`-verify-11.json`; each entry's `review` block carries the evidence and is never written). Findings that the verify-8/9 pass
had already settled (Ellen Pea grade, L&H voice, Davis Peak testimony, Mount Carrie name, Big Snow grade) were not re-checked.
Only CONFIRMED findings were written, each diffed against the live value first, applied with `enrich:apply --from`, and
verified on re-read.

## Written

- **Prose, 6 routes:**
  - Kangaroo Temple South Face `approach`: the closing clause said the route never crosses Kangaroo Pass and follows the
    creek southeast instead. It shares the approach to the pass, then drops below it and traverses to the face.
  - L&H Route (Free Variation) `fa`: adds the 2015 first free ascent beside the 1969 aid line.
  - Prayer for a Friend `overview`: south face → southwest face.
  - South Peak South Ridge `overview`: "clean granite" → clean in the opening corners, marginal on the crest and at the arch.
  - Mount Johnson `descent_text` and `rappels`: no source reports a rappel; the summit chimney is downclimbed. The optional
    30–50 ft rappel is removed, the natural-anchor caveat is kept, and `rappels` 1 → 0.
  - Mount Maude Nothing Couloir `pitch_detail`: the four section lengths (152/46/198/61 m, summing exactly to length_m) are
    removed; the only description gives a single total. Nothing else in the table changed; 4/4 rows render.
- **Classification SQL** (`2026-09-26-classification-6.sql`, rollback beside it; `check:sql` clean; grade_num = `gradeNumFor()`):
  One Piece at a Time 5.10+ → 5.10d (grade_num 10 → 11); Gunsight Peak Standard "Class 5.6 / glacier" → "5.6"; South Peak
  South Ridge discipline mountaineering → alpine.

## Refuted or unclear — not written

- Refuted: Mount Johnson "right of Gasp Pinnacle" (a report goes right to stay class 3); Tower Mountain's class 4 gully slab
  (reported; only the 15 ft figure is unsourced); Mount Logan's traverse to the top of the Banded Glacier (the route
  description does this); South Ridge approach (Blue Lake is the basin at the foot of the route, reached via Downey Creek);
  Ruby 7,426 ft and Carrie 7,156 ft summit figures (nothing gives 7,426; 7,156 ft is a different Olympic summit); Prayer for
  a Friend's belay bolt (no prose claims it; the table agrees with two sources).
- Unclear: Davis–Holland descent (the stored rappels/descent are empty; the sourced descent is recorded in the review),
  South Spur grade 4th vs Class 3, Little Sister summit 6,017 vs 6,600 ft (area-level), Davis Peak FA year (1972/1974/1976),
  Prayer for a Friend 6 vs 7 pitches (the 7th is the scramble, already its own row), Gunsight's line identity (every column
  describes the one West Face dike-and-notch line), Logan's Banded Glacier descent, Tower and Logan grades.
- Noted, not a finding: Davis–Holland `fa` has no year; sources give 1965.
