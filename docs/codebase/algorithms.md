# Key algorithms — design history

Moved verbatim from `CLAUDE.md`, which keeps a one-paragraph summary of the rule and points here.
Read this before doing the kind of work it describes. Where the text says "this file" it means the
project documentation as a whole — `CLAUDE.md`, `docs/codebase/` and `docs/guards/`.

- `compat(a, b)` (~L335) — partner compatibility score (20–99) from shared disciplines, grade closeness, shared objectives, verification, pace (`hikingSpeedFtHr`), and availability overlap. Every term is BOUNDED and the total is RESCALED onto that range; it does not clamp.
  - **IT SATURATES, AND THE SCREEN'S OWN COPY IS FALSE EXACTLY WHERE THE SEARCH POINTS YOU.**
    Partners says *"Match % blends your shared objectives, grade range, disciplines, availability
    overlap and verified trust"* — and the demo walk shows three climbers at **5.10a, 5.11a and
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
    shared objectives, grade range, disciplines, availability overlap and verified trust"*. That
    sentence was false while the blend was swamped and is now accurate — and `check:match-percent`
    ties it to behaviour so it cannot drift again.
  - The script **lifts `compat()` from source with a fail-closed `ANCHOR LOST`** rather than
    re-typing it — a copy would agree with itself whatever the app did, which is the whole
    question — and keeps a deliberate second, unclamped transcription beside it purely to show
    how far past 99 a pair lands.
