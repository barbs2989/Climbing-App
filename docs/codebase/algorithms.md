# Key algorithms — design history

Moved verbatim from `CLAUDE.md`, which keeps a one-paragraph summary of the rule and points here.
Read this before doing the kind of work it describes. Where the text says "this file" it means the
project documentation as a whole — `CLAUDE.md`, `docs/codebase/` and `docs/guards/`.

- `compat(a, b)` (~L1414) — partner compatibility score (20–99) from shared disciplines (16), grade closeness (28),
  **where you climb** (24: shared objectives OR listed areas), verification of both sides (8), pace (10) and
  availability overlap (12). Every term is BOUNDED and the total is RESCALED onto that range; it does not clamp.
  - **THE COMPAT AUDIT OF 2026-11-23 (owner approved all four fixes).** Measured by running the real `compat()` over
    the 5 seed climbers and 11 real-row-shaped personas:
    1. **One number for the pair.** `verified` read only the OTHER climber, so 12 of 20 seed pairs differed by
       direction, by up to 6 points. Each verified side is now half the term; 0 pairs differ.
    2. **WHERE YOU CLIMB is one term (`CMAX_WHERE` 24), replacing `CMAX_OBJ` 20 + `CMAX_AREA` 14.** A crag climber never
       saves a mountain objective (see LISTED AREAS below), so the objectives term could never be earned and a crag pair
       that matched on everything topped out at 84%; an alpine pair with no listed area at 89%. Now the same listed
       area is full marks, one shared objective three quarters, two or more full, and the term takes the higher. Both
       reach 99. Known only for a COMPARABLE pair, which was already `compatUnknown`'s rule.
    3. **Every profile ladder is a grade.** The term read `sportGrade` / `tradGrade` / `boulderGrade` only; ice, alpine,
       mixed and aid grades (`climb_grades`, 0237) were read by nothing, so an ice climber always read *Grade: not
       comparable*. It now takes the closest kind both climbers set (sport, trad, alpine, ice, mixed, aid, boulder); on
       the ice, mixed and aid ladders a number grade is two steps and a "+" one, so WI2 vs WI4 is *Far apart*. The
       cross comparison stays a YDS-only fallback (sport, trad, alpine).
    4. **One rule for a blank: half the term.** It was half for grade and pace, a third for availability and nothing
       for disciplines, objectives and areas, so WHICH field was left blank decided the score. Two empty profiles now
       score 56% rather than 37%, which no screen shows: a real row with 3+ unknowns still refuses to print a %.
    `check:match-percent` section 8 pins all four, and `scripts/oneoff/inject-match-percent-cases.mjs` reverts each
    one on its own (19/19 as expected).
  - **RELIABILITY (`CMAX_REL` 12, 0518, owner 2026-11-23).** Each climber's record (`relRecordOf`: crewmates' trip reports
    from `reliability_of_users`, plus their vouches' Reliability stars) becomes a rate (`relRate`): a trip is worth 1 on time,
    0.9 cancelled with notice, 0.75 late, 0.35 cancelled last minute, 0 no-show; each vouch's stars half a trip at
    (stars−1)/4; pulled toward 0.85 by two imaginary trips, so one bad day on a short record does not sink it (one no-show
    alone reads 0.57). The term is `6 × r(me) + 6 × r(them)`, a missing record counting 0.5, so it stays SYMMETRIC like
    verified and no record is never a bad mark. It is not one of `compatUnknown`'s signals: a new climber's blank record must
    not push real partner rows over the "limited info" line. The checklist line is plain counts (`reliabilityText`).
    `check:match-percent` section 9.
  - **LISTED AREAS (2026-10-15, 0300; merged into WHERE YOU CLIMB on 2026-11-23, above).** Crag partners are found by area, so a yes/no term `CMAX_AREA=14`
    (the weight of ONE shared objective, deliberately — one shared crag is one shared climb's worth of
    "we climb in the same place") fires when any of a's listed-area paths is b's, or sits inside it, or
    contains it (`areaPathsOverlap`, the client form of the ltree `<@`/`@>` reach). In the same change
    **crag-route objectives LEFT the objectives term**: callers pass `ME.matchObjectiveIds` (a route that
    is not crag-family, or that climbs a peak) and real rows get `useMatchObjectivesOfUsers`, so two
    climbers who saved the same sport route no longer score for it — their shared crag does instead.
    `compatUnknown` treats objectives-or-areas as ONE "where you climb" signal, so a crag climber with
    listed areas and no alpine objective is not "unknown". `check:match-percent` demands the new term
    moves the number and names it in the copy ("shared objectives and listed areas").
  - **GRADE IS LIKE WITH LIKE (2026-11-18, compat audit over 10 accounts).** The term took each side's first rope grade
    (sport, else trad), so a sport grade was measured against a trad grade: Avery (5.11a sport / 5.10a trad) read *Far
    apart* from Blake (5.9 trad). It now compares sport with sport and trad with trad, takes the closer when both set
    both, and falls back to the cross comparison only when they share no rope-grade kind. `check:match-percent` pins all three.
  - **EVERY NUMBER GRADE IS A STEP (2026-11-23).** The grade term's scale gave 5.8 and below ONE step, so 5.6 was two
    steps from 5.10a: *Close in grade*, and 22 of the term's 28 points, for a pair four number grades apart. It is now one
    step per number grade up to 5.9 and one per letter grade above. 5.13 and up had shared one step too (5.13a read *Same
    grade* as 5.14d) and now step by letter. 5.9 to 5.12 is spaced as before, so only pairs with a grade below 5.9 or
    above 5.12 move.
    Found when the one-sentence match summary repeated "close grades (5.10a and 5.6)". `check:match-percent` pins it.
  - **AVAILABILITY IS AN OVERLAP COEFFICIENT (2026-11-18).** It scored 6 per shared slot, so two weekends-only
    climbers (the same schedule) got 6 of 12 and an amber "partly". It now scores shared slots over the SMALLER side's
    slots (Szymkiewicz-Simpson), so one schedule wholly inside the other counts fully; flexible stays full. Chosen over
    Jaccard, which would penalise the climber who is free MORE often; partner apps match on whether times line up.
    `scripts/oneoff/measure-compat-designs.mjs` no longer reproduces the shipped formula, and has not since the
    listed-areas term (0300) was added; it is a historical record, not a check.
  - **LEAD vs FOLLOW GRADES (2026-11-05, competitor review item 20).** A roped discipline's profile grade
    is the grade the climber LEADS (or, for a follow-only climber, follows); a leader may add the harder
    grade they will follow (`climb_grades[k].follow`, see `PROFILE_GRADES` in core). The grade term here
    still reads `sportGrade` / `tradGrade` / `boulderGrade` — the lead (or only) grade — and does not look
    at `follow`: two leaders are matched on what each leads, which is the number that decides who
    takes the sharp end. The follow grade is shown beside the role on profiles for the partner to read.
  - **IT SATURATES, AND THE SCREEN'S OWN COPY IS FALSE EXACTLY WHERE THE SEARCH POINTS YOU.**
    Partners says *"Match % blends your shared objectives, grade range, disciplines, availability
    overlap and whether they are verified"* — and the demo walk shows three climbers at **5.10a, 5.11a and
    5.12b all reading 99%**. Measured with `scripts/oneoff/measure-compat-saturation.mjs`
    (report-only, no DB, no browser): **11 of 20 ordered seed pairs (55%) sit on the 99 ceiling**,
    the highest uncapped score is **157**, and **3 of the 5** climbers on the demo's My-Objectives
    pane are pinned.
  - **The cause is that TWO terms are UNCAPPED while every other one is bounded.** Shared
    disciplines score **×16** and shared objectives **×14** with no ceiling, against grade 28,
    availability 12, pace 10 and verified 8. So 3 shared disciplines plus 2 shared objectives is
    `20 + 48 + 28 = 96` **before grade, pace or availability contribute anything**.
  - **The consequence is that grade stops mattering for exactly the climbers the search
    surfaces.** Holding 3 shared disciplines and 2 shared objectives and varying only the
    partner's grade, **5.6 and 5.14a both read 99%** (uncapped 122 vs 116 — the arithmetic moves,
    the clamp eats it). Thin the profile to one shared discipline and no shared objectives and
    grade discriminates properly: 62 / 68 / 80 / 65 / 56. **The mechanism works; the saturation
    hides it**, and a 5.6 climber reading as a 99% match to a 5.11a leader is partner-safety
    adjacent.
  - **FIXED, and this bullet used to say REPORTED-NOT-FIXED — read the design before re-opening
    it.** Every term is now BOUNDED, the maxima are NAMED constants (`CMAX_*`), `COMPAT_MAX` is
    DERIVED by summing them, and the return RESCALES the above-base portion onto 20..99 instead of
    clamping. Measured after: the ceiling went **16 of 30 seed pairs to 0**, the rich-profile grade
    sweep went from **spread 0 to spread 20**, and the My-Objectives pane went from **3 distinct
    values across 5 climbers to 5**, ordered by grade proximity to ME's 5.10c.
  - **THE TWO CAPS ARE STATEMENTS, NOT NUMBERS.** Disciplines are a **yes/no** (`CMAX_DISC` 16):
    the 4th shared discipline does not make somebody a better partner than the 3rd. Objectives keep
    a little count-sensitivity and stop at 20: a second shared objective adds, a tenth does not.
  - **THE DESIGN WAS MEASURED RATHER THAN ARGUED**
    (`scripts/oneoff/measure-compat-designs.mjs`, report-only). Seven candidates were run over the
    seed population, and two results decided it. **Capping alone does not work** — bounding both
    terms while keeping the clamp still left 14 of 30 on the ceiling with grade spread **0**,
    because the bounded maxima summed to 138 against a ceiling of 99. And **the aggregate is not
    the test**: three candidates removed the ceiling while still ranking the pane by something
    other than grade proximity. Only the two tightest orderings put Sam (5.10a, closest to ME's
    5.10c) top and Maya (5.13a) bottom; the shipped one does it with **16 order flips against the
    alternative's 29**.
  - **RESCALING IS MONOTONIC, so it reorders nobody who was not already tied on the ceiling** —
    the flips come from the CAPS, and are reported per candidate so the cost is visible rather than
    implied. That script also **asserts the shipped `compat()` reproduces the chosen candidate on
    every pair**, so it stays a live check that the design measured is the design running.
  - **THE FIX MADE THE EXISTING COPY TRUE RATHER THAN NEEDING NEW COPY.** Three surfaces (the
    glossary, the Partners explainer and the score tooltip) already said the number *"blends your
    shared objectives, grade range, disciplines, availability overlap and whether they are verified"*. That
    sentence was false while the blend was swamped and is now accurate — and `check:match-percent`
    ties it to behaviour so it cannot drift again.
  - The script **lifts `compat()` from source with a fail-closed `ANCHOR LOST`** rather than
    re-typing it — a copy would agree with itself whatever the app did, which is the whole
    question — and keeps a deliberate second, unclamped transcription beside it purely to show
    how far past 99 a pair lands.
