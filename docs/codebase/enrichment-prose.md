# Enrichment prose must not be written into a display field

Moved verbatim from `CLAUDE.md`, which keeps a one-paragraph summary of the rule and points here.
Read this before doing the kind of work it describes. Where the text says "this file" it means the
project documentation as a whole — `CLAUDE.md`, `docs/codebase/` and `docs/guards/`.

A research pass has one job that keeps going wrong: it answers the question it was asked
and writes the *answer paragraph* into a column the UI renders as a **label**. The column
is then correct — the prose is accurate, sourced and useful — and the screen is broken,
which is why nothing catches it. Every guard the repo has asks whether a column is
populated; none asks whether what is in it is the right *shape*.

Three columns have taken this and all three now have a reader-side defence. **Write the
value, put the reasoning somewhere else.**

- **`season` is a WINDOW, not an explanation.** It is rendered in the route header strap
  beside elevation and pitch count (`8,815 ft · 6p · Jul-Sep`). Enrichment has written up
  to 232 characters into it (`wa_hourglass_gully_winter`), and a paragraph about snow
  bridges then wrapped over the cover photo and pushed the header open. WA currently has
  **14 `season` values containing a parenthetical** and many more that are a whole
  sentence — `"Late May–June is most commonly reported, when snow still covers the couloir
  and brush; by mid-summer the couloir is loose talus/scree"`. Write `"late May-Jun"` there
  and put that sentence in **`best_season`** or `seasonal_guidance.monthBreakdown`, which
  exist for exactly this and are rendered as prose on the Conditions tab.
  `seasonShort()` in `RouteDetail.jsx` defends the header by matching a month range and
  falling back to a cut at `;`/`.`/`(` — but it is a *repair*, and it can only ever show
  less than what was written.
  - **Shortening is only half a fix; audit what the box ACTUALLY SAYS afterwards.** When the
    same defence was pointed at `approach_variants[].season`, **15% (132 of 885)** fell through
    to its last-resort truncation and read as nonsense — `"Roughly January through the e…"`,
    `"Same window, and only with th…"`. Three causes wanting three different repairs: **25%
    already fitted 48 characters** (the 30-char budget is a HEADER-STRAP constraint, and the
    approach pill owns its own row — `seasonShort(s, max)` now takes a per-call budget); **38%
    had a real window whose ends are SEASONS not months** (`"August to autumn"`, `"Late summer
    into early September"`); **37% genuinely long**, which now truncate on a **word boundary**
    so the pill reads as a sentence that stops rather than a bug. **132 → 44 (15% → 5%)**, both
    mechanical causes at zero.
  - **WIDENING THE PRIMARY PATTERN CAUSED A REGRESSION, and only measuring the OTHER caller
    caught it.** The rungs run window → clause-cut → truncate, so a widened window **preempts**
    values whose first clause was already the better answer:
    `"Summer (rock) or late winter-spring (ice/mixed)"` showed `"Summer"` and became
    `"late winter-spring"` — the strap telling a climber a summer rock route is a winter route.
    The season-word pattern is therefore a **separate, later** fallback tried only after the
    clause cut fails, never a widening of the first. Header diffs went 13 → 8, and the remaining
    8 are all word-boundary improvements.
    **When you change a shared display helper, diff the other caller's output over real data** —
    `scripts/oneoff/verify-season-short-header-unchanged.mjs` loads the function from a git ref
    and from the working tree and compares across every distinct catalog value.
  - **Point the audit at the surface it claims to describe.** That audit called
    `seasonShort(full)` with the default 30 while the app passes 48, so it was measuring the
    header strap while reporting on the approach panel — its "already fits" bucket stayed stuck
    at 33 until that was corrected.
- **`grade` is a GRADE.** It reaches the compact route rows on an area page and the header
  pill, where there is room for `5.9` and not for `"5.11b/c (6c+ French, E4 6a British)"`
  or `"4th class, described by guidebook sources as 'probably low 5th to most'"`.
  `shortGrade()`/`gradeDetail()` in `lib/grade.js` split them, and the qualifier renders in
  the GRADES panel on the route page — so the words are not lost, but the split is done by
  a list of cut tokens and a new phrasing can defeat it. Put the qualifier in
  `pitch_detail[].notes` or `beta`.
- **`rappels` is prose today and reads like a count.** Every WA value is a sentence
  (`"~5 single-rope rappels, approximately 400 ft total, down the NE Face"`,
  `"Variable — downclimb/short rappels on West Ridge itself, or ~5 single-rope raps via
  East Ledges/NE Face"`). There are also `rappel_count_note` and `rappel_detail` columns.
  A UI that wants "how many rappels" cannot get it from any of them without parsing
  English, and a parse that reads "~5" out of the second example is **wrong** — that route
  is a downclimb unless you choose the East Ledges descent. If a numeric rappel count is
  ever needed it has to be a new, explicitly-nullable column, and `null` must mean
  "depends on the descent chosen" rather than defaulting to 0. See
  [[fail-open-coercion-hides-missing-data]] for why the 0 would be the dangerous part.
  - **"Every WA value is a sentence" is MEASURED NOW, and understated: it is every value in the
    CATALOG.** `scripts/oneoff/measure-rappels-column-shape.mjs` reads the whole column rather than
    the WA subtree — **733 of 733 rows are strings**, no objects, no numbers, no arrays.
  - **That is what makes `fmtRappels`' unit branch DEAD, and it is why the unit census flags it.**
    That helper returns early on `typeof r!=="object"` and otherwise renders `r.lengthM+"m"` or
    `r.lengthFt+"ft"` — a unit chosen by WHICH COLUMN the value came from rather than by the
    climber's setting — reaching `rappelNoteText` and the TECH STATS *Rappels* tile. It is a
    **false positive** of `measure-imperial-unit-literals.mjs`, not a defect to convert, because no
    row can reach it. **The measurement is the tripwire**: the day something writes an object here,
    the branch arms itself and shows metres to an imperial climber, so re-run the script rather
    than re-reading this sentence. Same discipline as the `sling_rack` shapes — *a claim about the
    stored shape is a claim about the DATA*, and this file records being wrong about that before.

- **`bivy[].capacity` / `.water` / `.permit` are CHIPS, and the camping enrichment filled all
  three with paragraphs.** Measured on the live catalog: median **130 / 136 / 297** characters
  and up to **1,386**, so **5,001 / 5,008 / 5,020 of 5,083** sites carried prose inside a
  rounded pill (`borderRadius:20, padding:"2px 9px"`). The panel reached **15,796 characters**
  on one route and was always fully expanded on a 390px phone. This is the same defect as
  `season` and `grade` above, committed by a pass that had *read this section* — the two named
  columns were avoided and three unnamed ones took the identical hit, because the rule was
  remembered as a fact about `season` and `grade` rather than as a question to ask of any
  column. **Ask the question of the column you are actually writing.**
  - Defended reader-side, the way `seasonShort()` and `shortGrade()` defend theirs: the pill is
    gone, the sites are **collapsed** to name + elevation + type, and the prose renders as a
    labelled block inside the disclosure. `check:camping` pins both directions — prose out of
    the default view, and prose still *selected* by `campDetail()`, since a disclosure that
    stops selecting has not hidden the data, it has deleted it.
  - **A derived "water · no permit" summary line was designed, measured and REJECTED**, and the
    measurement is worth not repeating (`scripts/oneoff/measure-camping-verdict-vocabulary.mjs`).
    A keyword rule leaves **44% of permits and 30% of waters** in no bucket at all, and where it
    *does* fire it is wrong in the dangerous direction: *"Free self-issued wilderness permit at
    the Killen Creek trailhead"* reads as **no permit** to any negation rule, and a self-issued
    permit is one you still have to fill in. Being wrong about a permit costs a fine; being
    wrong about water sends a party up dry. Same refusal as `rappels` above — **do not read a
    fact out of English prose**, least of all a safety- or money-adjacent one.
  - The measuring script's own first-clause splitter cut *"Cascade Volcano Pass (Mt. Adams)"* at
    the abbreviation, which is the tokeniser trap `audit:approach-scope` already records. **A
    count is only as good as its tokeniser**, including the count you are using to decide
    whether a rule is safe.

- **`approach_logistics.trailheadDirection` is how to DRIVE there, and it ends AT the trailhead.**
  The TRAILHEAD card prints it under the trailhead's name beside *Drive here*. **230 routes** had the
  walk in it, e.g. *"…at the end of Harts Pass Road: backpack ~13 miles via the Whistler Cutoff"*,
  *"From Paradise: Skyline Trail to Camp Muir"*, a bare *"North"*. Most came from hand-written
  enrichment SQL. Name the start and the road to it, and put the walk in **`approach`**.
  `check:sql` now refuses a file that writes the walk here, the card hides such a value, and
  `check:trailhead-direction-shape` holds the rule (its entry is in `docs/guards/route-page.md`).

The rule generalises: **before writing a researched string into an existing column, look at
where that column renders.** `npm run check:field-renders` will tell you; a column that
reaches a header, a pill, a chip or a table cell takes a value, and its explanation belongs
in the prose column beside it. Note what that guard could **not** catch here: it asks whether a
column reaches a screen, and all three of these did — correctly, in full, in the wrong shape.
**Reaching a screen and fitting the element it reaches are different questions.**
