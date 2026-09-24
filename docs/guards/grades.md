# Grades

One grade parser, one displayed grade, and whether the stored grade_num still agrees.

Part of the guard notes — see [README.md](README.md) for the full index.

- **`check:grade-parser`** asserts `routes.grade_num` is parsed in exactly one place. That
  column is the sortable grade — both finder RPCs (`0018`/`0019`) rank and filter on it — and a
  wrong value is invisible: the route just sits in the wrong place in a list nobody
  cross-checks. The arithmetic existed **four** times (`load-state.mjs`,
  `load-wa-rock-safe.mjs`, `import-alpine.mjs`, `oneoff/import-class2-3-routes.mjs`) and had
  already drifted into **three** behaviours — three agreed, the oneoff returned `5.1` for
  `"5.10"` where the catalog convention is `10`, and **none** handled a bare ordinal (`"4th"`,
  `"Easy 5th"`) that the live column nonetheless had right. All four now import `gradeNumFrom`
  from `lib/grade.js`. Static, so it sits in `npm run build`.
  - **The swap was proven before it was made, not after.** `verify-grade-parser-equivalence.mjs`
    ran both implementations over every distinct `(grade, system)` pair in the live WA catalog
    plus hand-written edge cases — **348 inputs, identical on every one** — because these
    scripts write `grade_num` for the whole catalog and "I reformatted it and it looks the same"
    is not evidence. Adding the bare-ordinal branch then differed on exactly **4** inputs, all
    `null` → a correct value. Agreement with the stored column went 98.09% → 98.49%.
  - That equivalence script keeps a **verbatim copy** of the pipeline parser on purpose — its
    job is to be a second opinion, and importing the function under test would make it vacuous.
    It is the one exemption, named explicitly so it cannot quietly widen.
  - Matches a **declaration**, not the word `gradeNum` — every importer mentions it. It also
    skips comment lines, because this guard has to *say* `function gradeNum(` to explain
    itself and flagged itself on the first run. Deliberately not the comment/string blanker
    other guards use: that one eats real code when a string contains `//` (a URL), and a
    declaration is never inside a string literal.
  - Fails closed: fewer than 20 files walked means the walk broke, not that the tree is clean.
    Injection-tested (4 cases at the bottom of the script); re-inlining a parser fails naming
    the file and line, and renaming the export fails with "every importer is broken".
  - **SECTION 2 GUARDS THE *DISPLAYED* GRADE, and the guard's name is now narrower than its
    contents** — the rename is deliberately not done in the same change, the precedent
    `check:topo-outage-copy` records. Section 1 is about the SORTABLE grade; this is the same
    failure one column over. **Which column a route's grade comes from was written out THREE
    times** — `gradeLabelRaw` in `ClimbMatchCore.jsx`, `rowGrade` in `lib/DbAreaBrowser.jsx`, and a
    third inside `climbRowItem` that **only the new guard found**, before it shipped. All three
    read `rock_grade || ice_grade || alpine_grade || grade || commitment`, they agreed on all
    8,365 WA rows — which is what a hand-copy looks like before it drifts — and **all three were
    wrong in the same way.**
    - **A COMMITMENT GRADE IS NOT A CLIMBING GRADE, and it was the headline on 30 routes.** 517
      routes carry an `alpine_grade`; **274 of those hold a bare NCCS roman numeral**, which says
      how committing the day is rather than how hard the climbing is. On **30** no rock or ice
      grade shadows it, so it was what the header pill, the stat strip, the sibling rows and every
      area-list row displayed. **Slesse Mountain's NE Buttress read "V" in the header pill while
      the CRUX GRADE tile a few inches below it read "5.9 A2"** — one screen stating the route's
      grade twice and disagreeing with itself, which is the sentence `cruxGrade`'s own note opens
      with. Mount Alberta's Japanese Route read **"V"** against a stored `5.6`, Bugaboo Spire's
      East Ridge **"III"** against `5.7`, Eldorado's East Ridge **"Grade II"** against
      `"Grade II, Class 3, glacier"`. Eleven of the thirty are Fifty Classics.
    - **`cruxGrade` FIXED THE OTHER HALF OF THIS AND LEFT THE HEADLINE**, which is why the two
      surfaces disagreed: that repair reads the remainder of a compound `grade` STRING, and this
      one is about which COLUMN is consulted. Different questions, one defect. `displayGrade()`
      does both — it takes the first column that carries a climbing grade and then hands it to
      `cruxGrade` — so the pill and the tile cannot disagree again.
    - **...AND `cruxGrade`'s OWN PATTERN WAS SHORT BY 20 VALUES, found by asking it the same
      question from this side.** `COMMITMENT_ONLY` matched `^(Grade )?[IVX]+(-[IVX]+)?$` and missed
      three shapes this catalog writes: a **`+`/`-` suffix** (`"IV+"`, `"III+"`, `"VI-"` — 15
      routes), the NCCS **`"Alpine "` prefix** (`"Alpine IV"`, 3), and an **en-dash range**
      (`"Grade IV–V"`), which appears as often as the hyphen. Widened, **six crux tiles gained a
      real grade**: Goode's Megalodon Ridge showed `"IV+"` against a stored `"IV+, 5.10"`,
      Eldorado's West Arete `"Alpine IV"` against `"Alpine IV, 5.8"`, Little Tahoma and Frying Pan
      `"Grade II+"` against `"Grade II+, Class 3-4"`. Strictly a widening — anything the old
      pattern matched still matches — and its own probe reports **112 → 116 fixed, 0 worse**.
    - **THAT PROBE COULD NOT SEE THE WIDENING, BECAUSE IT RE-IMPLEMENTED THE RULE INSTEAD OF
      CALLING IT.** `probe-crux-grade-tile.mjs` was written before `cruxGrade` shipped and kept its
      `fixedB` and its own `isCommitmentOnly` — so once the app's pattern moved, the probe measured
      a rule the app no longer ran and scored six real fixes as no change. The four-grade-parsers
      shape, arriving in the **instrument** rather than the pipeline. `fixedB` is now
      `cruxGrade(...)`. The verdict's `isCommitmentOnly` stays a deliberate copy — the thing under
      test cannot also be the thing that judges it — but it was brought level, and the comment now
      says which of the two it is and why.
    - **THE TEST IS POSITIVE — does the value carry a CLIMBING grade — never a deny-list of
      commitment spellings.** A deny-list is defeated by one more noun and this catalog has them:
      `"Grade II glacier climb"`, `"Grade II–III glacier"`, `"Grade II, moderate snow"` are all
      commitment grades wearing a terrain word, and a pattern anchored on the numeral misses every
      one. The [[a-deny-list-detector-is-defeated-by-one-more-adjective]] shape, refused in advance.
    - **IT IS NOT `gradeNumFrom`, DELIBERATELY, and that is the interesting part.** That parser has
      a last-resort branch scoring a bare roman numeral, so a commitment-only route still SORTS
      among the catalog rather than falling behind all of it — right for sorting, and exactly the
      case display must reject. So the two lists are ALLOWED to disagree, and
      `scripts/oneoff/verify-climbing-grade-vocabulary.mjs` is what says they disagree ONLY there
      rather than a comment claiming it: over the **755 distinct grade values in the catalog** they
      agree on **732** and the **23** they do not are every one roman-shaped. It also asserts the
      one-way rule — a value the display list calls a climbing grade must be one the sortable
      parser can read — so a fifth dialect cannot creep in.
      - **Its first run accused the display list over EIGHT MIXED GRADES and the display list was
        right.** `gradeNumFrom` is system-aware and has no system-agnostic `M` branch, so
        `gradeNumFrom("M5", null)` is null while `gradeNumFrom("M5", "m")` is 5 — and the app
        always calls it through `gradeNumFor(grade, discipline)`, which supplies one. **Compare
        against the call the app makes, not the convenient one.**
    - **A FRENCH ALPINE GRADE IS A REAL DIFFICULTY AND MUST KEEP WINNING.** `alpine_grade` also
      holds `F`/`PD`/`AD`/`D`/`TD`/`ED` on 155 routes, and the contribute form offers that scale
      **and** the six romans in one picker — which is the ambiguity that produced this. The app's
      own form is the evidence that a bare roman is a commitment grade rather than a judgement
      about climbing imported from outside: `commit`'s options are exactly `["I".."VI"]`.
    - **MEASURED OVER THE WHOLE CATALOG BEFORE IT SHIPPED: 205,543 routes, 20 displayed grades
      change, 0 lose the grade they had, 0 gain one from nowhere.** Two of the twenty were not
      predicted and are both improvements — a `rock_grade` of `"3-4"` and one of
      `"low fifth class"`, each losing to a `grade` that says `"Class 4 / low 5th"`.
    - **THE 11 THAT DO NOT MOVE ARE THE LOAD-BEARING HALF.** A rule that only ever replaces a roman
      numeral is satisfied by deleting the commitment grade from the app, so a route whose record
      genuinely holds nothing else — Rainier's Emmons Glacier, Baker's Easton Glacier — must still
      show it. And the labelled **ALPINE** pill in COMPOSITE GRADE keeps rendering the numeral on
      every one of the twenty: that block is where a commitment grade belongs, and the probe
      asserts it survived, or this "fix" would be a deletion.
    - **SCOPE THE SCREEN ASSERTION TO THE HERO, never the whole page.** The first version forbade
      the old value appearing anywhere in the markup and failed **7/7 against the correct fix** —
      because COMPOSITE GRADE renders it, correctly, under its own label. Count inside the panel,
      the rule `check:camping` records three times over.
    - **A LINE IS NOT A SCOPE IN THIS CODEBASE, and rule A shipped wrong first because of it.**
      `RouteDetail`'s COMPOSITE GRADE block is `var ag=route.alpineGrade||route.alpine_grade,
      rg=route.rockGrade||route.rock_grade,…` — four columns on one physical line in four separate
      and correct expressions, each merely the two SPELLINGS of one column. A per-line test
      reported it as a chain. Column names are canonicalised (so two spellings read as one column)
      and the line is segmented on the delimiters that end an expression.
    - **TWO RULES, because a stale-base squash can take either half alone.** Rule A forbids the
      chain being written again; rule B **executes** `displayGrade` over nine fixtures and asserts
      both call sites still route through it — restoring `gradeLabel(r) = shortGrade(gradeLabelRaw(r))`
      reinstates the whole defect while leaving exactly one chain in the tree, which rule A cannot
      see. Injection case `header-pill-unwired` is exactly that.
    - Scoped to what RENDERS (the three app files plus `lib/*.jsx|js`), because a display chain only
      matters where a climber reads the result; `scripts/oneoff/` is excluded on the precedent
      `check:screen-lists` sets, and three throwaway query scripts do print several grade columns
      with `||` while promising nobody anything.
    - Fails **closed**: fewer than 5 rendering sources found, a missing `displayGrade` export, or a
      call site that no longer names it.
    - Injection-tested **8/8** (`scripts/oneoff/inject-grade-pill-cases.mjs`), each case proving its
      edit landed **by checksum**, restoring the file byte-identically, and judged on the guard's
      **own failure text**; the harness refuses any expectation that already appears in the clean
      run. **Three must stay SILENT** — a comment quoting the chain is this guard's own
      documentation, two spellings of one column is correct code, and a commitment-only route
      keeping its numeral is the point. **One case reported FIRED ON CORRECT WORK and the guard was
      innocent**: it changed `rowGrade`'s shape as well as adding a chain, so rule B's wiring anchor
      fired instead. *An injection that produces a different failure is not a catch.*
    - The live-catalog half is `scripts/oneoff/probe-grade-pill-is-not-a-commitment-grade.mjs`,
      which needs the database: it renders the real `RouteDetail` over the real rows through the
      real `dbRouteToCamel`, and is proven non-vacuous — reverting the rule fails **14** of its
      assertions.
- **`audit:grade-num-drift`** asks whether the **stored** `grade_num` still agrees with what
  `lib/grade.js` derives from the row's own `grade`. `check:grade-parser` asserts there is exactly
  ONE parser in the CODE and structurally cannot see this: the column was populated by importers,
  so a row written by an older parser stays wrong forever and every gate stays green. Nobody had
  asked. Reads the DB, so **not** a build gate; report-only.
  - **Measured first run: 113 of 8,014 readable WA grades disagree (1.4%).** It is not cosmetic —
    `grade_num` is the sortable grade and both finder RPCs (`0018`/`0019`) rank and filter on it, so
    a wrong value is invisible: the route simply sits in the wrong place in a list nobody
    cross-checks.
  - **MOST DISAGREEMENTS ARE NOT DEFECTS, which is why it must stay report-only.** `grade_num` is
    **lossy across grade systems by construction**: `gradeNumFrom` maps `class 3` and `5.3` to the
    same `3`, and a roman numeral — a **commitment** grade — to its own number, so a Grade V alpine
    route and 5.5 share a slot. Sweeping the parser's answer over the column would file scrambles
    among rock climbs. The six classes separate *"the row disagrees with its own system"* (E, F —
    read these) from *"the column cannot express this"* (A, B, D — leave them).
  - **ONE ROW WAS FIXED, and how it was cleared is the bar for the rest.**
    `wa_shock_and_awe` stored **10** for `"V3"`, sorting a boulder problem among 5.10 routes. The
    convention was then measured against the population that PASSES rather than reasoned about:
    **2,277 of 2,278 V-graded WA rows store the V number**, none stores a YDS equivalent, and this
    was the single exception. *A convention with one exception is a defect, not a convention.*
    `scripts/oneoff/probe-v-grade-convention.mjs` is that measurement and
    `fix-shock-and-awe-grade-num.mjs` the write, under the usual declared-state contract.
  - **Compare a suspect against the rows in its own system that AGREE before calling it wrong.**
    That step is what separated the one real defect from 113 rows where the column, not the row, is
    the limitation — and it is the same step that stopped a "fix" being applied to correct data in
    the camp-elevation and clickable-shield work.
  - Fails **closed** twice: zero routes for the state, and zero grades the parser can read, are each
    a broken scan rather than a clean catalog.
  - **DECIDED BY THE USER, 2026-09-23: THE GRADE IS THE HIGHEST GRADE — and the parser, the column
    and the filter now all say so.** The entry below measured this and concluded there was nothing
    to decide, on the strength of a 93% low-end convention in the stored data. **That reading was
    overtaken by a product call**, which is the right way round: the measurement said what the
    catalog *did*, never what it *should* do. `gradeNumFrom` now resolves a grade to the highest
    grade in the string rather than the first.
    - **IT REMOVES A DIALECT RATHER THAN ADDING ONE, which is the only reason a change here was
      allowed at all.** The standing objection recorded below is that *"a fifth dialect is the
      problem, not the fix"*, and it would have applied in full to inventing a new rule. This
      invents nothing: the grade FILTER has always parsed the same string and taken the MAXIMUM
      (`routeBandIdx`, *"Difficulty=crux, so a range route surfaces when you filter for its top
      grade"*), so `"Class 3-4"` filtered as **4** and sorted as **3**. One fact, two derivations.
      The sortable column now agrees with the filter the app already ships.
    - **THE CHANGE IS EXACTLY "max instead of first", AND THE EXACTNESS IS ENFORCED RATHER THAN
      CLAIMED.** Each branch keeps its original pattern, spacing, digit count and case flag, with
      only a range tail and `/g` added — so `verify-highest-grade-equivalence.mjs`'s **0 GAINED** is
      a guarantee by construction rather than an accident of today's data. A first version injected
      `\s*` after every prefix, which reads as harmless and silently made `"WI 2-3"` newly
      parseable; only `verify-climbing-grade-vocabulary.mjs` surfaced it. **A widening that changes
      no row today still changes the rule.**
    - **THE RANGE CAPTURE IS THE PART "just take the max" GETS WRONG.** `"5.4-5.6"` is already two
      separate YDS matches so it needs nothing; `"Class 3-4"` is ONE match of `/class\s*(\d)/` and a
      bare max over that pattern still scores 3. The systems that write a range as a single token
      (class, V, WI/AI, M, aid) capture both ends.
    - **THE DATA FOLLOWED, because a parser change alone is worse than neither.** Measured
      catalog-wide: **8,908 rows move, every one UPWARD — 0 lowered, 0 lost, 0 newly parsed.**
      Leaving them would have `audit:grade-num-drift` reporting 8,908 rows forever *and* left the
      filter/column disagreement standing on exactly the rows the change is about.
      `fix-grade-num-to-highest-grade.mjs` swept **8,892**, writes only where the stored value
      agreed with the OLD parser (so the move is attributable to the rule rather than hiding
      pre-existing drift inside a bulk write), only ever upward, through `patchRow`, behind a
      rollback file, reconciled by read-back.
    - **THE 16 IT SKIPPED ARE THE READING LIST, and they are a different question:** stored
      disagrees with the old parser too, so those rows were already drifting — `wa_sahale_mountain_r1`
      stores 3 where the old parser says 0, `wa_mount_challenger_challenger_glacier` stores 5 where
      it says 6. That is `audit:grade-num-drift`'s subject, not this sweep's.
      - **READ 2026-09-23, AND THE LIST IS NOW SEVEN.** The count moved because the sweep
        itself wrote 8,892 rows; re-derive it rather than quoting either figure.
        **`rock_grade` IS THE ADJUDICATOR** — an independent record of the same route's technical
        difficulty, written by a different pass — so where it and the parser AGREE and the stored
        number is the odd one out, two records outvote one and no judgement is needed. **Three were
        repaired on that rule** (`scripts/oneoff/fix-grade-num-corroborated-by-rock-grade.mjs`,
        which COMPUTES every value from the row's own columns, so a repair needing a number the row
        does not imply cannot be expressed): `wa_dragontail_peak_east_ridge_aasgard_pass` null→3,
        `wa_sahale_mountain_r1` 3→4, and `wa_soviet_route` 10→**10.25**.
      - **THAT LAST ONE IS A CLAIM IN THIS FILE THAT #1769 QUIETLY FALSIFIED.** The entry below
        records `wa_soviet_route` as the row *"NO RECORD SUPPORTS"*, refused because the
        quarter-grade repair's fingerprint is `stored === Math.floor(parser)` and *"here is
        `10 === 9` — false, so it structurally cannot be selected"*. Under highest-wins the parser
        reads `"V, 5.9-5.10a"` as **10.25**, so the floor is 10, **the fingerprint now MATCHES**,
        and parser and `rock_grade` **agree** at 10.25 with the stored 10 being the dropped letter.
        *A refusal justified by a parser's output expires when the parser changes* — and nothing
        reconciles the two entries, so it sat as a standing refusal for a row that had become
        decidable.
      - **FOUR ARE READ AND DELIBERATELY LEFT**, each for its own reason, recorded in that script so
        they are not re-derived. `wa_mount_shuksan_northwest_arete` — the recorded refusal STANDS;
        #1769 narrowed the gap from 3 grades to 2 and did not close it, so the NULL is still honest.
        `wa_mount_challenger_challenger_glacier` — **the stored 5 AGREES with `rock_grade` ("5.5")**
        and it is the grade STRING that disagrees, so writing the parser's 7 would move the column
        AWAY from its corroborating record: a question between two columns, not a `grade_num`
        defect. And the two `"5.8 A2 or 5.10"` big walls (Beckey-Chouinard, Lotus Flower Tower),
        where 10 is defensible and `rock_grade` is NULL, so nothing corroborates it.
        - **THOSE LAST TWO WERE FILLED WITH 10 ON 2026-09-24, i.e. A RECORDED REFUSAL WAS
          OVERRIDDEN — said plainly, because a silent reversal is the thing this file exists to
          prevent.** The refusal was made by `fix-grade-num-corroborated-by-rock-grade.mjs`, whose
          contract is *repair a row where `rock_grade` corroborates the parser*; with `rock_grade`
          NULL those two were outside its EVIDENCE STANDARD, which is not the same as a judgement
          that the column must stay NULL. **They are not the Shuksan shape**: Shuksan has two
          candidate fills that CONTRADICT each other, so NULL is the honest third answer; these
          have exactly ONE candidate, and leaving NULL sorts them behind the whole catalog, which
          is strictly worse than a defensible number. 10 is also not merely defensible — it is
          what the catalog's own DECIDED rule produces, since "the grade is the highest grade"
          (2026-09-23) makes `"5.8 A2 or 5.10"` a 10. **Two refusals, two different standards:
          check which contract refused a row before reading the refusal as a verdict.**
      - **THE MIRROR CLASS WAS TWO ORDERS OF MAGNITUDE LARGER AND IS NOW SWEPT: 778 routes stored a
        NULL `grade_num` while carrying a grade the parser reads perfectly well. 772 filled, 6
        refused.** Same consequence as an unreadable grade — they sort behind the whole catalog —
        and a different cause: nothing ever wrote the column (this file already records one source,
        `approve_new_route` not setting it).
        - **THE OBJECTION THAT DEFERRED IT WAS HALF RIGHT, AND MEASURING SPLIT THE HALVES.** It
          read *"a blanket fill from the parser is a write with no corroborating record, which is
          exactly what the Shuksan refusal declines"*. The Shuksan refusal is about a row whose
          OWN RECORDS DISAGREE — `grade` implying 4 against a `rock_grade` of 5.7 — not about the
          operation. `grade_num` is BY DEFINITION the parsed form of `grade`, and
          `scripts/pipeline/load-state.mjs` computes it exactly this way at import. Measured
          against the population that PASSES, the method that settled `wa_shock_and_awe`:
          **204,529 of 204,565 populated rows (99.98%) store exactly what this parser reads**, and
          **2,273 of 2,281 commitment-only rows (99.65%) store the roman numeral**. So the fill is
          the catalog's own operation and the roman last-resort branch is its own convention.
        - **THE SIX REFUSALS ARE THE RESULT, and the instrument found Shuksan BY ITSELF** — which
          is what says the rule is right rather than fitted. Every one is a commitment-only or
          ice `grade` against a technical `rock_grade`: two candidate fills, so NULL stays honest.
        - **THE CORROBORATION RULE WAS WRONG TWICE BEFORE IT WAS RIGHT, and both are the same
          class of error — comparing two DIFFERENT QUANTITIES.** First it used `alpine_grade` and
          reported **11 disagreements, every one correct data**: `"5.7"` against `alpine_grade
          "IV"` is a technical grade against a roman COMMITMENT grade, the distinction this file
          records in half a dozen places. Then, with that removed, it never mapped the **`class`**
          system — silently moving Shuksan itself out of REFUSE and into FILL, because class and
          YDS are ONE numeric scale here (`class 3` and `5.3` both score 3) and the mapping was
          missing. **A scale shared for SCORING is shared for CORROBORATION.**
        - The rule lives in `scripts/lib/grade-corroboration.mjs`, shared by the measurement and
          the sweep — the `scripts/lib/camp-names.mjs` precedent, because a sweep and an audit
          that disagree about "the same row" either bless the sweep's mistakes or report correct
          work as broken. **Re-run `measure-readable-but-unpopulated-grades.mjs` rather than
          quoting any figure here**; 778 was 833 under a looser filter before it was measured
          cleanly, and it is 6 today.
    - **AND THE EIGHT "OUTLIERS" BELOW WERE ALREADY RIGHT — SEVEN OF THEM STORE EXACTLY WHAT THE NEW
      RULE PRODUCES.** They appear in the sweep's SKIPPED list precisely because their stored value
      already equals the highest grade: `wa_mount_stuart_west_ridge` 6, `wa_cathedral_rock_standard`
      4, `wa_mount_logan_fremont_glacier` 4, and four more. **The adjudication that found "zero
      repairs" and the rule change agree**, by two completely different routes — one reading each
      row's own `rock_grade`, one applying a rule decided afterwards. The eighth,
      `wa_guye_peak_r2`, is unmoved by either.
    - **TWO REAL DEFECTS WERE FOUND AND DELIBERATELY NOT FIXED HERE** — both are now MEASURED
      (2026-09-23), and **only ONE of them was real**, which is the part worth reading.
      - **LOWERCASE `v11`/`v6` WAS REAL AND IS FIXED.** Those rows scored **null**, so they sorted
        behind the whole catalog and were dropped outright by any range filter. The V branch is
        case-insensitive now. Measured over all **205,382** graded routes: **12 RESCUED, 0 CHANGED,
        0 LOST** — strictly additive, which is the only shape a widening here may have, and each
        gain **proven attributable to case** rather than assumed (the old parser, handed the same
        string UPPERCASED, produces the same number). 10 rows needed the data sweep; 2 already
        stored the right value. **`nv_back_crack` is graded `v0` and scores `0`, which is FALSY** —
        every test in the sweep is `!= null`, never truthiness, or that row is silently skipped.
      - **`"WI 2-3"` IS A CLASS OF ZERO — do NOT widen the parser for it.** It occurs **exactly
        once catalog-wide**, and it is in **`ice_grade`, not `grade`**, on a route whose `grade` is
        `"4th"` and whose `grade_num` is a correct **4**. So `gradeNumFrom` never sees it and the
        row is not mis-sorted; the value already reaches a screen as a labelled ice grade, which
        needs no parsing. A spaced-prefix widening rescues **0**, changes 0 and loses 0 — and it is
        actively dangerous, because `V\s*(\d+)` then reads *"Grade V 5.9"* as a V5 boulder problem,
        the roman-commitment-vs-technical conflation this column exists to avoid.
      - **The lesson is the asymmetry.** Both were written down in the same sentence, in the same
        shape, as *"one-line fixes with their own before/after to measure"*. Measuring turned one
        into a shipped repair and the other into a refusal — and nothing about the original
        sentence distinguished them. *A deferred item is a hypothesis until somebody counts it.*
      - **A THIRD shape surfaced from the same measurement — `"Vb"`/`"VB"` on 9 bouldering routes —
        AND IT IS FIXED, AT -1: THE FIRST VALUE THIS COLUMN HAS EVER HELD BELOW ZERO.** This entry
        used to defer it as *"a product call, not polish"*, on the grounds that giving V-Beginner a
        number means deciding whether `grade_num` admits values under zero. Measuring turned that
        into an answerable question rather than a preference, and the answer is written into
        `lib/grade.js` beside the branch.
        - **THE CONSUMERS WERE READ, NOT ASSUMED** (`scripts/oneoff/measure-vb-grade-rows.mjs`).
          The RPCs declare `min_grade`/`max_grade` as `numeric default null` and sort `nulls last`,
          so a negative sorts correctly and is excluded only by a floor it is genuinely below; the
          one live `queryArgs` (`lib/DbAreaBrowser.jsx`) passes NEITHER, so **the range filter is
          unwired today and the live consequence of a null is the SORT**; `lib/offline.js` goes
          through `numOrNull` + `cmpNullsLast`. **`techHrs(pitches,len,gradeNum)` is NOT a consumer
          of this column** — its callers pass `gn(route.grade)`, a different parser over the grade
          STRING — so no safety-adjacent time estimate is in frame, which the parameter's name
          makes it very easy to believe otherwise.
        - **-1 RATHER THAN 0, because 0 is taken.** `V0` maps to 0 and 10,159 rows hold it, so
          reusing it would assert that VB and V0 are the same grade; -1 is what the scale claims.
          Measured before choosing: the column holds **min 0, max 17 and ZERO negatives**, so this
          really is a new class of value and nothing does arithmetic on the stored number.
        - **SCOPED TO THE V SYSTEM, AND THAT COSTS NOTHING**: all 9 occurrences of a `VB` token in
          `grade` are `bouldering`, and there are **0** in rock/ice/alpine/aid_grade or
          `commitment`. So the safer scoping is also the complete one, and a system-agnostic
          fallback would buy no row while putting "VB" in reach of a string meaning something else.
        - **9 GAINED, 0 CHANGED, 0 LOST** over all 205,382 graded routes
          (`verify-vb-branch.mjs`), which also asserts the branch's SCOPE on 12 declared cases
          before reading a row — because "0 CHANGED" is equally true of a branch that never fires.
          One of those cases pins that a bare `"V"` is **5**, the PRE-EXISTING roman last-resort
          branch, so the new branch cannot be blamed for it later.
      - `scripts/oneoff/{measure-unreadable-grades,verify-v-case-widening,fix-grade-num-lowercase-v}.mjs`.
        The measurement **derives which widenings are already shipped** by asking the parser two
        one-line questions rather than restating them — a control hardcoded to the pre-fix shape
        failed closed on the very next run, correctly, and that is a script that rots the moment its
        subject ships.
    - **AND A THIRD PARSER READS A GRADE FOR THE TIME MODEL AND STILL TAKES THE FIRST MATCH —
      `gn()` in `ClimbMatchCore.jsx`, 5 call sites.** It is NOT `grade_num` and not a fifth dialect
      of it: it maps every system onto one difficulty axis for `techHrs` (WI -> 6+n, M -> 7+0.6n,
      aid -> 8+n), which is a different question. But it reads the same range strings, and it takes
      the **easier** end — so a route graded `"5.9-5.10a"` is timed as 5.9.
      **THE DIRECTION IS THE WORRYING PART**: an easier grade means a FASTER climbing leg, so
      Est. summit and Est. return come out optimistic and the "After dark" warning fires less
      often. That is the #641 direction this file records throughout.
      **Not changed here, deliberately** — and it is now MEASURED, which corrects this entry's own
      first claim. It said *"it moves time estimates app-wide"*, written from the direction rather
      than from a count, and that is wrong by five orders of magnitude:
      `scripts/oneoff/measure-gn-highest-grade-rule.mjs` reports **3 routes**, worst **+0.50 h** on
      Est. return, and **ZERO "After dark" warnings gained or lost**. The direction was right; the
      blast radius was invented. *An unmeasured magnitude is a hypothesis wearing a finding's
      clothes*, and this file forbids exactly that everywhere else.
      - **THE REASON IT IS SO SMALL IS THAT `gn()` HAS NO CLASS BRANCH.** `"Class 3-4"` is not a
        range it reads the wrong end of — it is a grade it cannot read **at all**, so it falls to
        the `7.5` default. Class ranges are most of the 8,908 rows `grade_num` moved, which is why
        one rule moved 8,908 there and 3 here. **Ask which branches a parser HAS before sizing a
        class from a sibling parser's count.**
      - **14 rows differ in total and 11 are MASKED by `route.timing`**, not immune: `techH` prefers
        a published or derived summit time, so those activate the day that column is dropped. The
        largest is `wa_liberty_crack` (12 pitches, `gn` 11.25 -> 13.5). Small **today**.
      - **THE `pitches = 0` POINTER IS NOW MEASURED (2026-09-23), AND THE COLUMN COUNT OVERSTATED IT BY
        FOUR ORDERS OF MAGNITUDE: the answer is SIX ROUTES.** **128,020** roped routes store 0 or
        null against **617** with a real count, and `techHrs` returns **0** for those — `0074`'s
        *"0 means unknown for a roped route and no pitches for a boulder problem"* conflation
        landing on the time model. That is a fact about a COLUMN. On screen:

              121,860  are a CRAG discipline, so <Calculator/> is never mounted at all
                6,098  have no Plan tab (hasPlanContent false)
                   11  render "N/A"
                   45  carry a published or derived summit time — THAT is the climbing leg
                    6  render a number with a zero climbing leg   <- the defect

      - **THE GATE THAT DECIDES IT IS `{!cragOnly ? <Calculator/> : null}`.** A trad or sport route
        **never renders a time estimate at all**, and those two dominate the roped catalog — so
        most of the 128,020 cannot make a false claim by construction. Two further things protect
        it, both worth knowing: `hasAnyEstimate` ends in **`!!route.pitches`**, which is **FALSY at
        0**, so a zero-pitch route does not claim an estimate on the strength of its pitch count
        (a falsy-zero test that is normally a bug and here is the thing preventing one); and the
        **Climbing tile already renders `N/A`** rather than `0.0hr`.
      - **WHAT IS LEFT IS 6 ALPINE ROUTES, AND THE SHARP END IS 3.** Three already carry the **`≥`**
        marker, because their hike inputs are incomplete and the app is already saying the number is
        a lower bound. The other three — `wa_guye_peak_southeast_gully`,
        `wa_colchuck_peak_north_buttress_couloir`, `wa_lane_peak_r3` — have COMPLETE hike inputs, so
        they present an **exact** Total beside a Climbing tile reading **N/A**, and *"Est. return"*
        equal to *"Est. summit"* (the walk branch of `retH` fires when `pitches` is falsy, so the
        descent is zero too).
        - **THE REPAIR THIS ENTRY NAMED IS TAKEN, 2026-09-24, AND ALL SIX ARE HEDGED.** It read
          *"REPORTED, NOT FIXED … a handful of routes does not justify moving a safety-adjacent
          estimate"*, and closed by naming the consistent repair: extend the marker to an unknown
          CLIMBING leg, *"which can only ever make the app hedge MORE, never less"*. That is the
          argument that makes it polish rather than a product call — the change adds a caveat and
          moves no number, so the objection about touching the estimate does not apply to it. The
          measurement now reports **6 hedged, 0 bare** (was 3/3).
        - **`climbKnown` IS THE CLIMBING TILE'S OWN TEST**, not a second one written beside it.
          That tile already renders `N/A` on exactly this condition, so deriving the marker from
          the same expression means the `N/A` and the `≥` cannot disagree — the rule this repo
          applies to `_hfr`, `_memN` and `dayOf`. The aggregates take `lowerBound = approachUnknown
          || climbUnknown`; **the Approach tile keeps its OWN flag**, because an unrecorded pitch
          count says nothing about the walk, and that is the load-bearing assertion in the probe:
          a rule that only ever ADDS a hedge is satisfied by hedging everything.
        - **NO `!publishedIsWholeDay` CLAUSE, deliberately.** `publishedIsWholeDay` requires
          `summitTimeHrs != null`, which IS `hasPublishedSummitH`, so it is a subset of
          `climbKnown` and the guard could never fire. A redundant condition in a guard reads as
          coverage and is not, so it is **asserted** in
          `scripts/oneoff/probe-climb-leg-lower-bound.mjs` rather than written into the code.
        - That probe renders the real `RouteDetail` over six fixtures, **37 assertions**, and is
          proven non-vacuous by A/B: reverting the aggregates to `approachUnknown` fails **exactly
          3**, all in the one case, with the other 34 green — so it is specific rather than firing
          on any change. Four of the six cases must stay CLEAN.
      - **THE STATIC PREDICATE WAS WRONG AND THE RENDER VALIDATION IS WHAT CAUGHT IT.** The first
        version of `scripts/oneoff/measure-zero-pitch-estimate-reach.mjs` computed these buckets
        from columns alone and missed `cragOnly` entirely; rendering a sample through the real
        `RouteDetail` reported **21 of 28 rows disagreeing** because the tile was not on the page.
        *A bucket count derived from columns is a claim about the renderer*, so that script renders
        real rows and FAILS if the screen disagrees in either direction — including `absent` cases,
        which are the load-bearing half, since a validation of only the rows that DO render would
        have re-confirmed the very prediction that was wrong.
      - Two further `gn()` limits fall out of the same run and are reported, not fixed: **20 of the
        394 routes it decides fall through every branch to the `7.5` default** (14 carry no usable
        grade at all), and the app sees **`usableGrade(r)`**, not `routes.grade` — a bare class
        grade on a crag discipline is NULLED at the `dbRouteToCamel` boundary, so measuring the raw
        column measures a different input.
    - `scripts/oneoff/measure-highest-grade-rule.mjs` is the measurement,
      `scripts/oneoff/verify-highest-grade-equivalence.mjs` the check that the shipped parser only
      raises (its reference is loaded from **git**, never retyped), and
      `scripts/oneoff/fix-grade-num-to-highest-grade.mjs` the sweep.
    - **`verify-grade-parser-equivalence.mjs` DECLARES THE CHANGE AS A RULE, NOT A LIST.** It holds
      a verbatim fossil of the pipeline parser as a second opinion, so 68 range strings started
      reporting as unexpected drift. Enumerating them would be bookkeeping that rots on the first
      new range value imported, and would say nothing about whether the change is sound. It declares
      the **invariant** instead — a highest-wins parser can only return a LARGER number than a
      first-match one — so `lib > pipeline` is intended and a lowering, a loss or a newly-parsed
      value still exits 1.
      - **A SIXTH RULE WAS ADDED 2026-09-23, AND IT IS THE NARROWEST ONE THERE ON PURPOSE.** The V branch is
        case-insensitive now and the fossil is not, so `v11` goes null -> 11 — precisely the
        *newly-parsed* shape the sentence above leaves UNEXPECTED. **Declaring "a newly-parsed value
        is fine" would gut the check**, because that is exactly what a pattern widened beyond its
        scope looks like. So the rule is **attributable** rather than permissive: a gain counts as
        intended only if the FOSSIL, handed the same string UPPERCASED, produces the very number
        `lib` produced. A gain from anywhere else still exits 1. Reads `2 newly parsed by the CASE
        rule` and `no unexpected difference`.
  - **THE "WHICH END OF A RANGE" QUESTION WAS MEASURED FIRST, AND THE MEASUREMENT SAID THERE WAS
    NOTHING TO DECIDE — true of the catalog, and overtaken by the decision above — measured by
    `scripts/oneoff/measure-class-range-end.mjs`.** It had been carried as an open product call
    (*"`Class 3-4` → 3 or 4?, 129 low / 16 high"*), which reads as a catalog genuinely split down
    the middle and waiting on somebody to pick. It is not: of **171** WA routes stating a range of
    two grades in one system, **159 store the LOW end, 8 the high, 0 the midpoint** — a 93%
    convention that `gradeNumFrom` already implements (169 low / 2 high), because its
    `/class\s*(\d)/i` took the first digit. **There was nothing to sweep and — on the catalog's own
    evidence — nothing to decide**;
    what remained was 8 outlier rows to read, **and they have now been read — NONE is a defect.**
    - **The quoted 129/16 was wrong, and the shape of the error is the useful part**: a number
      carried in prose rather than re-derived. Re-run the script rather than quoting this line,
      which has now been wrong once — **and then moved AGAIN inside a single session**, 8207 → 8212
      graded routes, LOW 159 → 160, "none of them" 4 → 3, while HIGH held at 8. The catalog is live
      and other sessions write to it; every figure here is a timestamp, not a fact.
    - **HALF THE FIRST RUN'S "NEITHER" BUCKET WAS THE MEASUREMENT'S OWN REGEX.** A range mentioned
      in a string is not the route's grade: `"Alpine IV, 5.8 (sustained 5.6-5.7)"` stores **8**,
      which is correct, and a bare match reads the parenthetical; `"5.6-5.7 (2 technical pitches;
      remainder Class 3-4 scrambling"` describes the ground BETWEEN the pitches. The range only
      counts when the parser's own answer falls inside it — 10 unexplained rows became 4. *A count
      is only as good as its tokeniser*, and a measurement that manufactures half its findings
      would have sent somebody to "fix" correct rows.
    - **THE 8 HIGH-END ROWS WERE READ AGAINST THEIR OWN SECOND RECORD, AND THE ANSWER IS ZERO
      REPAIRS — the shape said "sweep them to the low end" and the DATA says that would break
      correct rows.** `rock_grade` is an independent record of the same route's difficulty, present
      on 7 of the 8, and it **corroborates the stored value far more often than it contradicts it**:
      `wa_mount_stuart_west_ridge` stores **6** and its rock_grade says **"5.6"**;
      `wa_mount_logan_fremont_glacier` stores 4 and says **"4th class"**;
      `wa_cathedral_rock_standard` stores 4 and says *"4th class, described by guidebook sources as
      'probably low 5th to most'"* — i.e. 4 **or harder**. Three rows restate their own range
      (`"Class 3-4"`, and one string shared verbatim by the two Little Tahoma routes) so they
      disambiguate nothing, and `wa_primus_peak_south_ridge` has no second record at all.
      **`wa_guye_peak_r2` looked like the one row whose own records disagree with it** — rock_grade
      reads *"Class 3 (class 3-4 per WTA)"*, so its primary answer is 3 while it stores 4 — **and
      asking the parser closed even that**: `gradeNumFrom` returns **4** for its grade string, so
      stored == derived and it is not drift at all. Worth knowing WHY, because it is not the obvious
      reason: the string is *"Class 3-4 scramble (NCCS Grade I, **optional 5.4** rappel/toprope
      variation)"* and the YDS branch fires on the **optional variation's** 5.4 before the class
      branch is reached. The number is defensible and its provenance is an accident — which is a
      row to read, not a row to write. *(Its rock_grade also cites a third party, which is the
      citations sweep's problem, not this one's.)*
    - **THE DECIDING MEASUREMENT IS THE POPULATION THAT AGREES, and for CLASS grades there is no
      convention to violate.** The `wa_shock_and_awe` precedent is *compare a suspect against the
      rows in its own system that pass* — there, 2,277 of 2,278 V-graded rows stored the V number
      and the one exception was a defect. Here the same query says the class catalog is **genuinely
      split**: rows whose `rock_grade` is exactly **`"4th class"` store 4 three times and 3 three
      times**, `"Class 4"` stores 4 six times and 3 twice, `"Class 3"` stores 3 thirteen times, 2
      seven times and **4 twice**. *A convention with one exception is a defect; a 50/50 split is not
      a convention at all*, so there is no majority for a high-end row to be wrong against. The
      headline 93% is about ranges in the `grade` STRING and does not transfer down to the row.
    - **AND `grade_num` IS NOT ALWAYS THE SAME QUESTION AS `rock_grade`, which is the trap in using
      it as corroboration.** For a scramble `grade_num` is the CLASS while `rock_grade` may describe
      a short harder step: rows whose rock_grade is exactly `"5.6"` store **6 forty-eight times and 3
      or 4 four times**, all correctly. So corroboration is strong for a YDS-graded route
      (`wa_mount_stuart_west_ridge`) and weak for a scramble, and a rule that read the two columns as
      interchangeable would manufacture findings.
    - **THE 3 "NEITHER" ROWS ARE THREE DIFFERENT QUESTIONS, and only one is even arguable.** Two are
      a **NULL** `grade_num`, i.e. a missing value rather than a wrong end — and
      `wa_mount_shuksan_northwest_arete` is the one where **filling it from the headline string would
      be actively wrong**: `gradeNumFrom` returns **4** for `"Grade III-IV, Class 4-5 (mixed rock and
      snow)"` while the row's own rock_grade says **5.7**, so the obvious fill understates the
      route's own hardest recorded climbing by three grades. *When two candidate fills disagree by
      that much, the NULL is the honest value.* `wa_dragontail_peak_east_ridge_aasgard_pass` is the
      opposite and the only clean one — parser 2, `grade` `"Class 2-3"`, rock_grade `"Class 2-3"`,
      every record agreeing — but filling NULLs is a different question from which end a range
      stores, and it is not this measurement's.
    - **`wa_soviet_route` IS THE ONE ROW NO RECORD SUPPORTS, AND IT IS STILL REFUSED.** It stores
      **10** against a grade of `"V, 5.9-5.10a"` and a rock_grade of **`"5.10a"`** — and the
      quarter-grade convention is near-unanimous (rows with rock_grade `"5.10a"` store **10.25 seven
      times to 10 once**, and `"5.10b"` stores 10.5 **eleven of eleven**), so the stored 10 looks like
      the letter being dropped in transcription. **THREE RECORDS GIVE THREE VALUES** —
      `gradeNumFrom` says **9**, the column says **10**, rock_grade says **10.25** — and it is not
      repaired, because **the quarter-grade repair's OWN contract already refuses it**, twice over:
      that pass corroborates every row against `rock_grade` and *"a row where the two disagree is
      refused rather than picked"*, and its fingerprint is `stored === Math.floor(parser)`, which
      here is `10 === 9` — false, so it structurally cannot be selected. This is an existing rule
      holding, not a fresh judgement. **It also explains why that sweep never saw it**: the
      quarter-grade measurement is scoped to rows whose `grade` is *exactly* a lettered YDS grade,
      and this one is a range. **It belongs to the quarter-grade class (`audit:grade-num-drift`
      class D), not to this one** — and it is the row to start from if that class is reopened.
    - **THE APP ALREADY ANSWERS THIS QUESTION TWICE, IN OPPOSITE DIRECTIONS — and that is a bigger
      finding than the eight rows.** The grade FILTER does not read `grade_num` at all: `passesFilters`
      calls `routeBandIdx(sys, r.grade)`, which parses the **string** and takes the **maximum** —
      `hi()` walks every match and keeps the largest, and the YDS branch does the same with
      `if(idx>best)best=idx`. So `"Class 3-4"` bands as **4** and `"III, 5.4-5.6"` bands as **5.6**,
      deliberately: the commit that made it so says *"Difficulty=crux, so a range route surfaces when
      you filter for its top grade"*. Meanwhile `grade_num` — which both finder RPCs rank and
      range-filter on — stores the **LOW** end on 160 of 171 of the same rows. **One fact, two
      derivations, disagreeing on exactly the rows this measurement is about.**
      - **It reframes the outliers rather than condemning them.** A high-end `grade_num` row is
        *consistent with the filter's stated convention* and *inconsistent with the column's* — so
        "sweep them to the low end" would align them with one mechanism by moving them away from the
        other. Another reason the answer here is zero repairs.
      - **The open question was the DISAGREEMENT, not the eight rows** — whether the sortable column
        should mean *the crux* (matching the filter, and how climbers quote a grade) or *the easiest
        ground* (matching 93% of the catalog as loaded). It was raised rather than swept because it
        is a product call with app-wide effect, **and the user took it the same day: the crux.** See
        the DECIDED entry above; the column now matches the filter.
    - **"Report only" APPLIED TO THIS AUDIT AND NOT TO A DECISION.** The reason below — that
      `gradeNumFrom` matches `load-state.mjs` verbatim and a fifth dialect is the problem rather
      than the fix — still governs anyone tempted to *improve* the parser on their own judgement. It
      never governed the product owner choosing what the number means, and the change made above
      removes a dialect rather than adding one.
