# Planner estimates, gain and rappels

Numbers a party plans a day around: return legs, gain floors, impossible legs, the pitch discount, logged times, the gain audits, rope-length and rappel-count checks.

Part of the guard notes — see [README.md](README.md) for the full index.

- **`check:rappel-lengths`** asks whether a rappel table states a distance the rope it describes
  can actually reach. **A rope doubled through an anchor reaches HALF its length** — one 60m rope
  gives 30m rappels, two 70m ropes give 70m — and where a source published no per-station
  distance, an earlier enrichment pass wrote the rope's *capacity* into `lengthM` instead of null.
  `wa_ellation` stored 8 x 70m, i.e. 560m of rappel down an 8-pitch route, while its own prose said
  the raps "approach the rope's full 35m reach". `wa_overcoat_peak_southeast_route` had the
  identical 2x error. A climber rigs for a rappel twice as long as the rope allows; this is the
  rope-off-the-end shape, and it is the worst thing in this dataset to get wrong.
  - **It is not a "does every rappel have a length" check, and must never become one.** `null` is
    the CORRECT value where no source gives a distance, and writing nulls rather than inventing
    numbers is what the repair did. **Halving is also wrong**: a rappel with no published distance
    may be 35m or 15m, so a halved figure replaces one fabricated number with another.
  - **30m is both a rope size and the correct half of a 60m rope**, so the rope-size rule is scoped
    to stations >=50m. Including 30 flagged 22 correct routes. Separately, any station over 60m is
    impossible on less than two ropes, and that rule does not need a rope to be *named*.
  - Two false-positive classes were found by running it, and both were regexes that flagged correct
    work — which teaches people to ignore a guard. `/double[- ]rope\b/` does not match "double
    **ropes**", so it condemned `wa_action_potential`, whose descent text lists all five lengths
    individually *and* names double ropes. And matching "rope length" in the count note flagged
    three routes whose notes accurately said things like "depending on rope length/number of ropes
    carried"; the admission being looked for is specifically the rope's **capacity** standing in
    for a measurement.
  - The third rule is about the **note, not the numbers**: a table can be corrected while
    `rappel_count_note` still states the method that produced the wrong value, and the next pass
    then re-derives it. That is why `enrich:apply` grew a `set` path for the scalar prose columns.
  - **It read four prose columns and not `gear`, which is where a route most often names its rope
    outright** — `60m single rope`, `Two 30m ropes (or one 60m)`, `50m rope (60m or double 50m
    ropes preferable for 3-person parties)`. 1,065 routes carry a gear array, and a route whose only
    named rope lived there had **no rope size at all** as far as rules 2 and 3 were concerned, so it
    passed for want of evidence rather than on the merits. Fixed; the live catalog stays at **0
    failures**, with 2 new report-only candidates and **nothing lost**.
    - **Gear feeds the two-rope test AND the named-size scan, and they cannot be separated.**
      Reading gear only for sizes would take the `60m` out of `Two 30m ropes (or one 60m)` while
      ignoring the word saying there are two of them, and condemn a correct route. The text that
      names the rope is the text that says how many there are.
    - **But the two-rope test is STRICTER on gear than on prose, and that asymmetry is measured.**
      A descent narrative saying "ropes" is nearly always counting them; a gear list pluralises
      casually. Of the 34 rappel-table routes whose gear says `ropes`, **4 name no two-rope
      configuration**, and two are `Single 60m rope (skinny 7-8mm ropes are common)` and `60m dynamic
      ropes (single rope technique)` — **single**-rope routes a bare plural would have stood rules 1
      and 2 down on. Standing down wrongly is a false PASS on a rope-off-the-end check.
    - A range (`50-60m`) names both ends and rule 3 takes the largest, since reading the low end
      understates the rope. An **open-ended** size (`50m+`) names no upper bound, so rule 3 stands
      down rather than substituting one — inventing a 60 there would be the exact fabrication this
      script exists to catch, committed by the checker.
  - Read-only, anon key, fails closed on an empty read *and* on zero rappel tables. **Not a build
    gate** — a property of the DB, not the checkout, so no code change can cause or fix it; same
    reasoning as `check:counts`. Injection-tested, **6** cases at the bottom of the script; note that
    `--inject=clean` (every length nulled) and `--inject=geartwo` must **PASS**.
    - **Widening a script's INPUTS invalidates its injections, not just changing its logic.**
      `--inject=capacity` claims to describe a route naming one rope, and left the row's real `gear`
      alone. Once gear was read, `tables[0]` is `wa_a_servant_to_liberty`, whose gear says **"two
      ropes for rappel"** — so the case was handing the guard a self-contradictory route, the guard
      stood down exactly as documented, and the case printed `ok`. That reads as *the guard broke*
      when the guard was right and the **injection** was wrong. It clears `gear` now.
  - Reader-side, `RappelTable` prints `—` for a null length. Its total was summed with `||0`, which
    turns "unknown" into "zero": a table with two known 30m rappels and one unknown printed "60 m
    total" and read as the whole descent. It now sums only known stations and says "60 m across 2
    of 3" when the line is partial.
- **`check:return-leg`** asserts the planner does not re-add a walk its own figures already
  covered. `hikeH = scarfHrs(distKm, gainM, lossM)` is charged for gain **and** loss, so on a row
  where those are the whole outing it is already the round trip — and `retH` then added
  `hikeH * 0.75` on top. **196 WA routes, median +7.67 hr.** Static SSR, so it sits in `npm run build`.
  - **The app already knew.** `gainCoversWholeOuting` (|loss−gain|/gain ≤ 3%) relabels the tile
    **"On foot"** and TECH STATS says *"Total ascent is the whole day from the trailhead, not just
    the walk in"* — and the return leg ignored both. `wa_ptarmigan_traverse` read `21.6hr On foot`
    with Est. return **16.2 hr after** Est. summit. Label and arithmetic contradicting each other on
    one screen.
  - **The premise is solid because 433 of the 484 qualifying rows have gain EXACTLY equal to loss** —
    a round trip, or a traverse ending at its start elevation. Not a coincidence on a one-way
    approach. Checked before any code was written, after #1361 shipped a defect for want of exactly
    that step.
  - **SCOPED TO THE WALK BRANCH, and the first draft was not.** A pitched route's return is
    `techH * 0.7` — the descent of the **climb**, which the walk never double-counted — so
    short-circuiting the whole expression the way `publishedIsWholeDay` does would strip a real leg
    from **212** rows. Caught before shipping, by a count that did not reconcile (88 "unexplained"
    against 50 unmatched) rather than by a red guard. Injection case 2 pins it.
  - **IT DROPS THE "After dark" WARNING ON 102 ROUTES, and that was the decision.** `late` is
    `retH > 18.5`, so a smaller return means fewer warnings. Keeping them would mean preserving a
    known double-count as an invisible safety margin that only these 196 routes get — and *a false
    warning is how a real one stops being read*, the rule this file states for rope warnings and
    caveats alike. A warning firing off a number the code knows is wrong is not a safety feature.
  - **NOTHING HAS YET ASKED whether the base walk model is optimistic**, and that is the honest
    residual. `scarfHrs` at "intermediate" gives ~1,970 ft/hr of ascent, which puts Bonanza's 7,000 ft
    round trip at ~7.4 hr on foot. If that is fast it is fast on **every** route, including the ~700
    one-way ones this does not touch — a uniform question needing real party times, which this repo
    does not have. Do not answer it by restoring the double-count.
  - Injection-tested both directions, each restoring byte-identically: reverting the fix fails
    *"Est. return equals Est. summit"*, and the over-broad first draft fails *"a PITCHED
    whole-outing route keeps its climb descent"*. Live-verified through the real `dbRouteToCamel`
    (`scripts/oneoff/probe-whole-day-walk-return.mjs`): **106/106** walk-only rows no longer re-add,
    **49** one-way or pitched rows keep their leg, **0** lost.
  - **SECTION 2 IS THE SAME TILE'S OTHER HALF: THE TWO RED LABELS WERE COMPARED AGAINST A CLOCK
    HOUR AND `sumH`/`retH` ARE UNBOUNDED.** Both are absolute hours from midnight of the DEPARTURE
    day, so an estimate that crosses midnight passes **18.5** (6:30 PM) and **13** (1:00 PM)
    permanently — while `fmt`, declared on the line BETWEEN them, reduces the same value mod 1440 to
    render a clock time and appends `(+Nd)`. The result was a red **"After dark" beside "Est. return
    12:10 PM (+1d)"**, and **"Leave earlier" beside a 4:28 AM summit**, where leaving earlier makes
    it DARKER.
    - **MEASURED AT THE CALCULATOR'S OWN DEFAULTS, over the whole WA catalog
      (`scripts/oneoff/measure-after-dark-on-a-multiday-estimate.mjs`): 168 of 495 "After dark"
      labels annotated a return in broad DAYLIGHT — eight of them within 15 minutes of NOON — and 67
      of 556 "Leave earlier" labels sat beside a MORNING summit.** One of the eight is
      `wa_mount_stuart_north_ridge`, the route `check:ui` pins as its sample, so this was on the
      app's most-walked route page in its most-reachable state.
    - **NEITHER THRESHOLD MOVES, AND THAT IS WHAT MAKES THE CHANGE PROVABLE.** `retH > 18.5` is
      exactly *"this outing runs past dusk"*, which is the right trigger however long the outing;
      what it cannot say is which DAY the arrival lands on. So the trigger is untouched — **no
      warning is added and none is suppressed** — and only the LABEL gains the day. The measurement
      re-run after the fix reports the identical 495 and 556, which IS the behaviour diff.
    - **"Overnight" is the STRONGER claim, not a softer one**, so this cannot under-warn in the #641
      direction: a party out past a second dawn is told something larger than *"after dark"*, not
      something smaller, and the tile stays red either way.
    - **`dayOf` is the SAME function `fmt` uses for the `(+Nd)` suffix**, deliberately: a second
      next-day test written beside the label could disagree with the suffix rendered inches away —
      the *computed ONCE so the two cannot disagree* rule this file records for `_hfr` and `_memN`.
      Section 2 asserts it is declared exactly once.
    - **SECTION 2 PINS NO WORDING, and the SILENT case is what proves it.** A guard holding
      `"Overnight"` would forbid improving the copy, which this file records as its own failure mode
      more than once. The invariant is structural instead — a same-day tile and a next-day tile must
      **both carry a label** and those labels must **DIFFER**. That catches the historical defect
      (both said *"After dark"*), catches deleting the next-day label, and catches labelling
      everything one way; and `SILENT-every-label-reworded` changes all four strings and stays green.
    - **A COUNT, NOT A PROXIMITY WINDOW, AND THE LABEL IS READ FROM RAW MARKUP.** Stripping the tags
      welds the warning to the next tile with no reliable right-hand boundary, so the reader anchors
      on the tile's own `Est. summit`/`Est. return` caption and takes the div that follows it,
      identified by a `margin-top` the caption does not carry. The colour is matched as `[^"]*`
      rather than `C.red`'s hex, which would be a hand-copy of the palette. An ABSENT warning
      returns `""` and a caption that never rendered returns `null`, because *"there is no
      warning"* and *"the tile is missing"* want different repairs.
    - The floor rises to **21**, two below a clean 23.
  - **SECTION 3 — THE MULTI-DAY DISCLAIMER SITTING ON TOP OF THESE TILES RENDERED FOR NOBODY.**
    Sections 1 and 2 are about the estimate and its labels; the amber *"typically done over N days
    … the single-push estimate below is a reference only"* box directly above them was gated on
    **`route.campOptions`, a SEED-ONLY field**. `routes` has no such column under any spelling, the
    DB store is `bivy`, and `deploy.yml` sets `VITE_USE_DB=true` — so the one sentence telling a
    climber not to plan a single push off these numbers was absent exactly where the numbers are
    most absurd.
    - **MEASURED BY EXECUTING `dbRouteToCamel`, NEVER BY GREPPING IT**
      (`scripts/oneoff/measure-multiday-disclaimer-reach.mjs`): the mapper **spreads** the row, so a
      zero grep in `lib/db.js` proves nothing about a column — the mistake this file records a
      session making about `difficulty`. Run it: `campOptions` survives on **0 of 8,365** WA routes.
    - **THE APP ALREADY HAD THE RIGHT SIGNAL, IN THE SAME FILE, AND THE PLANNER WAS THE OUTLIER.**
      `RouteGearEssentialsBox` derives multi-day from the route's own **itinerary day count** and
      adds a tent, a sleeping bag, a stove and extra food on the strength of it. So on **344**
      routes the app packed for a bivy while the planner said nothing. The two gates disagreed on
      **all 344**, which is the `_memN`/`_hfr` shape: one fact, two derivations, one screen. They
      are one exported `isMultiDayOuting()` in `lib/outing.js` now — the module that already owns
      itinerary reasoning — so they cannot disagree again.
    - **PORTING THE OLD GATE TO `bivy` WOULD HAVE LOOKED LIKE A FIX AND CHANGED NOTHING**, which is
      the measurement worth keeping: the seed shape is `campOptions.some(c => c.stars > 0)` and
      **0 of the 796 WA routes carrying a bivy entry has a starred camp**. That store does not hold
      stars. *Measure the replacement, not just the defect.*
    - **THE ITINERARY IS THE HONEST SIGNAL AND THE CLAIM WAS CHECKED AGAINST THE ROWS**, not
      assumed: a camp EXISTING means you could sleep there, while a 2+ day itinerary is the route
      stating its own trip length — and those rows read *"A committing 2-day trip"*, *"A 2-day trip
      is standard"*, *"A long 4-day round trip"*. The gear box already makes the **stronger**
      commitment on the same signal, so a signal good enough to pack a tent for is good enough to
      caveat an estimate.
    - **THE COPY HAD TO MOVE WITH THE GATE, AND THAT IS THE TRANSFERABLE HALF.** It read *"use the
      **Plan** tab for a realistic day-by-day plan"* — while sitting **ON** the Plan tab, with
      `<ItineraryView/>`'s **Trip plan** rendered directly above it. A pointer past the very thing
      it pointed at, invisible for as long as the box rendered for nobody. **Ask what a
      newly-reachable surface SAYS, not only that it now reaches somebody** — the same lesson the
      offline area-jump records, where making a list reachable made everything downstream of it
      reachable too.
    - **FOUND BY ITS OWN `data-multiday`, NOT BY ITS SENTENCE, AND THE INJECTION IS WHAT FORCED
      THAT.** The first version matched the copy, so `SILENT-multiday-copy-reworded-but-still-honest`
      **FIRED ON CORRECT WORK** — a guard pinned to one phrasing forbids improving it. The attribute
      is the structural anchor ROUTE BREAKDOWN's rows already use, and it carries the day count so
      the two cannot drift: the box must also **PRINT** that number, asserted separately and needing
      no particular wording. The *"above"* claim is asserted as **ORDER** in the raw markup, and the
      pointer is matched inside the **box's own text** — page-wide it would pass on the strength of
      the destination existing rather than on the disclaimer naming it.
    - **BOTH DIRECTIONS.** A rule that only demands the box APPEAR is satisfied by showing it
      always, which would print *"typically done over 1 days"* on a car-to-car scramble — which is
      exactly what the reverted gate does to the seed-shaped fixture, and what that fixture is for:
      restoring the old gate fails the first case, **OR-ing** the two fails only this one.
    - Injection-tested **14/14** (`scripts/oneoff/inject-return-leg-day-cases.mjs`), each case proving
      its edit landed **by checksum** and restoring `RouteDetail.jsx` byte-identically. Case 1 is the
      defect restored verbatim; cases 2 and 3 revert one tile each so neither can pass on the
      strength of the other. **`next-day-label-deleted` is the load-bearing one** — dropping the
      label satisfies every *"must not reuse the same-day wording"* assertion while removing the
      warning, so non-emptiness is asserted BEFORE difference. **`keyed-on-the-estimate-not-the-tile`
      is the one only the split fixture can see**: a label asking whether the ESTIMATE is multi-day
      rather than whether its OWN tile is passes every same-day and every next-day case.
    - **THE HARNESS DELIBERATELY DOES NOT REFUSE AN EXPECTATION THAT APPEARS IN THE CLEAN RUN, and
      trying it is what established why** — it refused all nine cases on its first run.
      `check:return-leg` prints each assertion's LABEL on its `ok` line and its `FAIL` line alike, so
      a correct expectation legitimately appears in a green run; applied to the clean run's FAIL
      lines instead it is vacuous, since a green run has none. What protects against a needle written
      against passing text is judging on **FAIL LINES ONLY** — never the word `FAIL`, because these
      assertion labels are prose. Same conclusion, and the same reason, as the suite for
      `check:count-matches-its-list`.
    - **The MEASUREMENT was reworded once the fix landed**, so it prints the 168 and the 67 as a
      CLASS SIZE — *the tiles a day-blind label gets wrong* — rather than as live findings. A script
      that went on reporting a fixed defect as live is the stale instrument #1695 was caught by six
      times over.
  - **THREE SIBLING SUSPICIONS WERE MEASURED AND ARE NON-FINDINGS — read this before re-deriving
    them.** The planner mixes conventions in several places and most of them turn out fine:
    - **`relief` falls back to `highPointFt - 0`** when a route has no `elevPts`, which would be
      the height above SEA LEVEL rather than the route's vertical extent. The *"Vertical relief"*
      tile is gated on `hasElevPts`, so that branch is unreachable for display. Dead, not wrong.
    - **`avgGrade` divides an ascent by `effDistKm`** without consulting `gainIsWholeOuting` or
      `distIsWholeTrip`, both of which sit two lines away. Ambiguous rather than wrong — gain over a
      ONE-WAY distance *is* the ascent's average grade — and the distribution is sane: **771 routes,
      p50 12.2%, p90 25.1%, exactly ONE over 100%.** The steep tail (Johannesburg's NE Buttress at
      90%, Big Four's Spindrift Couloir at 85%) is real alpine ground, not arithmetic.
    - **`gain_ft` holding the CLIMB's height instead of the approach's** is **4 rows of 676** (plus
      12 within 5%), so it is a handful of per-route judgements, not a class. `wa_liberty_traverse`
      is one — gain 2,001 ft == its own `routeFt`, over 26 pitches — which is independent
      corroboration of why `check:gain-floor-stated` must credit the climbing vertical first.
- **`check:gain-floor-stated`** asserts that a `gain_ft` the route's **own pins** say is impossible
  is stated rather than quoted silently. A party on the summit that started at the trailhead has
  gained at least summit − trailhead, so a stored gain below that cannot be the trailhead-to-summit
  figure. It is not decoration: `dbRouteToCamel` maps it to `gainM`, `scarfHrs()` turns it into the
  approach estimate, and that feeds **Est. summit**, **Est. return** and the **After dark** warning.
  Static SSR (no browser, no DB), so it sits in `npm run build`.
  - **87 WA routes**, every one of which moves the estimate: median **0.44 hr** understated, worst
    **3.59 hr** — `wa_mount_rainier_tahoma_glacier` stores **5,007 ft** against **11,506 ft**
    between its own two pins, and the Plan tab said nothing. Erring SHORT on *"are you down before
    dark"* is the #641 direction: an affirmative that reads green.
  - **`audit:gain` has reported this class for months and the READER half was never asked.** That
    audit's own entry concludes the DATA repair is per-route research, because *"a transform would
    have to invent a value"* — true, and silent about the screen. **Stating what the row's own pins
    prove needs no research at all.** Same split as the rappel work: the data fix needs a source,
    the honesty fix does not.
  - **IT REPORTS, IT DOES NOT SUBSTITUTE.** Which record is wrong is not decidable here — the row
    may be measuring from a high camp it never recorded — and TECH STATS renders `gain_ft`, so
    feeding the planner a different number would put two answers on one screen
    ([[changing-which-record-wins-leaves-the-neighbouring-field-behind]]). The caveat names both
    figures and says which one the times used.
  - **ONE-SIDED, like the audit.** Too little gain is impossible; too much is not, because a real
    route rolls over bumps its endpoints cannot see. A two-sided test would flag correct data.
  - **THE CLIMBING VERTICAL IS CREDITED FIRST, and getting that wrong is how this shipped a defect.**
    `scarfHrs` is the HIKE leg and `techHrs` the CLIMBING leg, so `gain_ft` is the **approach**
    gain — trailhead to the base — not trailhead to summit. Summit − trailhead therefore includes
    vertical the PITCHES already account for. As first merged the caveat accused **36 of 87** routes
    whose gain was fine: `wa_liberty_traverse` is **26 pitches over a 2,520 ft rise**, so the walk
    accounts for none of it and its stored 2,001 ft is entirely plausible. Subtract `pitches × 35 m`
    (the app's own default) before judging; a route with no pitch count subtracts nothing, matching
    what the app credits it for **time**. **87 → 51.**
  - The quoted figure is the **walking** rise for the same reason — naming the whole-outing rise
    beside a claim about the approach overstates it by exactly the climbing. Tahoma Glacier still
    reads 11,506 ft because it records **no pitches**; checked, not assumed.
  - **It was found by asking the same question of the SIBLING column, and that non-finding is why.**
    The `dist_km` version produced **160 candidates and all were noise** — `dist_km` is approach-only
    while a summit waypoint's cumulative `distMi` includes the climbing, so the two measure different
    things. Realising that is what turned the objection back onto `gain_ft`, where it applied.
    Two traps inside that measurement: `max(distMi)` picks up **return-leg pins**
    (`wa_mount_rahm_standard`'s furthest is *"Trailhead / border return"*), and scoping to the summit
    pin was necessary but **not** sufficient. Sinuosity against the straight-line chord is
    **unimodal** (p50 1.78), so `distMi` is NOT holding two conventions — that hypothesis is dead,
    do not re-derive it.
  - **The 300 ft slack is the audit's own, not a fresh threshold.** The shortfall distribution is
    **continuous** — p50 805 ft, p90 2,774, max 6,499 — with no void to cut at, so a magnitude bar
    would be fitted to the answer. Routes that RECORD something at the implied start are excluded:
    that is the documented high-camp convention (24 routes), and flagging them would accuse correct
    work.
  - **AND "RECORDS SOMETHING" MEANS EITHER COLUMN, WHICH IT DID NOT UNTIL #1533.** The predicate
    read `waypoints` alone, and most high camps live in **`bivy`** — so a quarter of the caveats it
    rendered were telling a climber that a CORRECT gain was impossible. Measured A/B on the live
    catalog: the caveat fires on **49 routes, 12 of them falsely**, and the widening takes it to 37
    with those 12 at zero. The worst was `wa_mount_rainier_tahoma_glacier` — the caveat claimed it
    **6,499 ft short** while the row records a camp at 9,440 ft, **41 ft** from the implied start;
    `wa_south_ridge_6` matched to the **foot**. *A false warning is how a real one stops being
    read*, which this file states for rope warnings and for the "After dark" tile, arriving on the
    tile next to them.
    - The two stores are the same pair **`campSites()` already merges** for CAMPING & BIVY, so this
      is not a new source — it is the second half of one the app already treats as one thing.
    - **The widening is NOT a blanket excuse**, and the guard pins that: a bivy at some *other*
      height must still let the caveat fire, or any route recording a camp anywhere would be
      silenced. Both directions are cases, and the new one was proven non-vacuous by reverting the
      predicate and watching it fail.
    - **`audit:gain` had the same blind spot and is NOW WIDENED TOO — its count is 61, not 80.**
      This bullet used to say the audit "is left" and to read its 80 as an upper bound; a stated
      limitation is a worklist, and leaving it would have had the next reader work 19 routes whose
      gain is correct. Measured: **19 of the 80 record their implied start in `bivy`** — four
      Cutthroat routes at the "Cutthroat Wall base terrace", `wa_south_ridge_6` matching Boston
      Basin lower camp to the FOOT. The audit's own comment records that a few of the 19 are
      excused by a camp on the WRONG SIDE of the same peak (Tahoma Glacier by Camp Schurman),
      which is `audit:camp-route-fit`'s question and not this one.
  - **`elevM` was checked, not assumed.** `normalizeWaypoints` coerces `elev`/`elevFt`/`elev_ft` and
    **not** `elevM`, so a waypoint carrying only the legacy spelling would be invisible to the app
    while visible to a raw-column measurement. Measured: **0 of 4,228 WA waypoints use `elevM`**;
    all 3,969 elevations are `elev`. The two-convention trap this file records for the *bivy* store
    does not reach the waypoint store.
  - Injection-tested, and **it caught a vacuous assertion of my own**: `11,506 ft` is also the
    summit pin's elevation in the waypoint list below, so a tab-wide `includes` for it **passed
    with the caveat deleted**. Scoped to the sentence — *count inside the panel, never across the
    tab*. Three injections, each pinning one rule: removing the render fails 4 assertions, breaking
    the one-sidedness fails the above-the-rise case, breaking the recorded-start exclusion fails the
    high-camp case.
  - **A measured structural note, so nobody contrives a case for it:** near the boundary the slack
    rule and the recorded-start rule **coincide by construction** — `implied = summit − gain`, so as
    the gain approaches the rise the implied start approaches the trailhead pin, which is recorded.
    Breaking the slack alone therefore leaves those cases silent.
  - **VERIFIED ON THE LIVE CATALOG, and that run corrected the invariant rather than the code.**
    The guard proves the caveat on a synthetic route; `scripts/oneoff/probe-gain-caveat-on-live-rows.mjs`
    renders **real rows through the real `dbRouteToCamel`** (which hands the app METRES) and
    `normalizeWaypoints`, either of which could have silenced it with every fixture assertion still
    green. First run: **80 of 87 fired, 7 missed** — which read as a defect in the fix and was not.
    All seven are crag-family (`trad`/`sport`) routes whose Plan tab renders **no time estimate at
    all**: no *Est. summit*, no *Est. return*. **With no estimate there is no false claim**, so the
    caveat is correctly absent. Asserting the data-only form would have driven a "fix" to working
    code — the failure this file records under half a dozen other names.
  - So the invariant is **not** *"the data contradicts"* but *"the SCREEN quotes an estimate built
    on the contradicted number"*. Corrected, the probe reported **80/80 fired, 0 missed, 0 false
    alarms across 200 clean rows**. Routes with no estimate are counted and reported, never scored.
  - **THAT PROBE THEN WENT RED FOR TWO WEEKS AND NOBODY KNEW, AND THE APP WAS RIGHT THROUGHOUT.**
    Run on 2026-09-09 it reported **12 MISSES of 42**, `wa_mount_rainier_tahoma_glacier` among
    them — which reads as the caveat having stopped firing on a safety-adjacent surface. It had
    not: the bullet above records #1533 widening the app's recorded-start exclusion to the **bivy**
    store, *"the widening takes it to 37 with those 12 at zero"*, and **the probe's own prediction
    was never carried across**. So it went on predicting the pre-#1533 rule against an app
    implementing the post-#1533 one, and every one of the 12 was a row the app is RIGHT to leave
    alone. Nothing runs `scripts/oneoff/`, so it said so unread. Fixed: **30/30 fired, 0 missed, 0
    false alarms** over 36 predicted.
  - **ITS WORKED EXAMPLE HAD INVERTED, AND STILL READ LIKE A FAILURE ON A PASSING RUN.** The probe
    printed Tahoma Glacier's sentence back verbatim *"so it cannot pass on a count alone"* — and
    #1533 made that row correctly SILENT, so the line printed `-- caveat NOT found --` about the
    app working. It now reads back **two** examples: a route that fires, named from the fired set,
    and Tahoma, which must be silent **and must have a camp recorded** — so the silence cannot come
    from the row losing its pins. Injection-tested by reverting #1533 in place: the silent example
    goes `STILL FIRING` and the probe fails. *When a fix inverts an example, the example is part of
    the fix.*
- **`check:impossible-leg`** asserts that the waypoint list never prints a leg distance its own
  two pins make impossible. The route page renders *"N.N mi from last"* between consecutive pins
  as `wp.distMi - prev.distMi`, and **473 of the 2,405 legs the app prints, on 261 routes, are
  shorter than the great-circle distance between the two pins they span** — counted through the
  hydration the app uses (`normalizeWaypoints` then `tidyWaypoints`, which reorders and
  de-duplicates, so the raw array order is not what renders) — `wa_luna_glacier` printed **0.0 mi**
  for a leg whose pins are **14.2 miles** apart, `wa_lizard_mountain_south_route` 3.7 mi for one
  that is 16.3. A trail cannot be shorter than its own chord, so this needs no prose and no
  judgement. Static SSR, so it sits in `npm run build`.
  - **IT IS THE PER-LEG FORM OF `audit:waypoint-distances`, WHICH IS WHY IT IS LARGER.** That
    audit measures the CUMULATIVE distance from the trailhead and reports 211 pins on 118 routes.
    A route can be clean cumulatively and still print an impossible leg, and that audit's skip
    rules — a placeholder coordinate, a `distMi` that does not start at 0, a non-monotonic list —
    put routes out of its frame that still render a leg distance to a climber.
  - **THE HONEST ANSWER IS NO NUMBER, NOT A DIFFERENT ONE.** Substituting the straight line is
    forbidden for the reason `campDistMi` already records in core — a chord is not a trail
    distance — and it would trade a number a climber can see is wrong for one they cannot. The
    **elevation** on the same row is a separate record and is untouched; dropping it too would be
    the [[changing-which-record-wins-leaves-the-neighbouring-field-behind]] shape.
  - **ONE-SIDED, like every audit in this family.** A leg LONGER than the chord is every real
    trail; only shorter is impossible. Flagging the other direction would suppress almost every
    distance on the site, which is why two of the cases assert that a 40-mile leg across a 4-mile
    chord is kept.
  - **PURELY GEOMETRIC, so it needs no knowledge of which convention the row uses.** 57 of 653 WA
    routes store a `distMi` that is not cumulative from the trailhead, where the app's own
    subtraction is meaningless anyway; this catches those without a second rule. It also covers
    the 3 routes storing a BACKWARDS pair, since the app prints `Math.abs(segMi)` and the
    magnitude is what has to be possible — the ordering is `audit:waypoint-order`'s subject.
  - **AND THE SAME RULE ON A CUMULATIVE DISTANCE — `cumMi` — because three surfaces print one.**
    A waypoint's `distMi` is measured from the trailhead, so it cannot be less than the straight
    line from the trailhead PIN either. Measured: **197 of the 2,567 cumulative distances the
    waypoint row prints, across 112 routes**, and **35 of the 412 in CAMPING & BIVY**, where
    `wa_poltergeist_pinnacle` printed *"Boundary Camp · 8.0 mi"* for a camp **21.8 miles** from its
    trailhead. That one matters most: it is the number a party uses to decide whether they can
    reach camp on day one. The trailhead's own `distMi` is 0 by convention, so `|wp − trailhead|`
    IS the cumulative distance and `cumMi` is `legMi` applied with the trailhead as the previous
    pin — **one rule, not a second copy of it**.
    - **A SELF-COMPARISON GUARD WAS WRITTEN HERE AND THE INJECTION PROVED IT DEAD.** `th===wp`
      looks necessary and is not: the chord from a point to itself is 0, so `legMi` already
      returns the trailhead's own 0 mi. The case reported MISS, the clause came out, and the
      reason is recorded in the source so nobody re-adds it. Dead code in a guard reads as
      coverage and is not.
  - **20% OF PRINTED LEG DISTANCES DISAPPEAR, AND THE SHAPE OF THAT IS MEASURED RATHER THAN
    WAVED AT.** 473 of 2,405 is a lot of information to remove from a product, so: **23 routes
    lose EVERY leg distance and 16 of those have only one leg**; three lose 6-7, and they are the
    badly-broken rows `audit:waypoint-distances` already reports (`wa_garfield_mountain_scramble`
    7/7, `wa_mount_buckindy_scramble` 6/6). The other 238 lose some and keep the rest. The panel
    keeps most of its distances on most routes, which is what makes suppression proportionate
    rather than a blanket.
  - **An UNPLACED pin cannot contradict anything**, so the stored number stands. Suppressing it
    there would remove a distance from every route whose pins carry no coordinate — a guard
    flagging correct work, which is the failure this file records under a dozen other names.
  - Fails **closed** on a missing `legMi` export and on a waypoint list that did not render, so an
    absent distance can never read as a suppressed one.
  - Injection-tested **7/7** (`scripts/oneoff/inject-impossible-leg-cases.mjs`), each case proving
    its edit landed **by checksum** and restoring `ClimbMatchCore.jsx` byte-identically. Case 1 is
    the real defect (`return seg`) and fails 5; **case 2 makes it suppress EVERYTHING** and fails
    6, because a guard that only ever asserts absence is satisfied by deleting the feature; case 4
    flags legs LONGER than the chord and fails, pinning the one-sidedness. **Two must stay
    SILENT** — a comment naming the forbidden shape, and a widened tolerance that still catches the
    fixture, which pins that the cases test BEHAVIOUR rather than the constant.
  - **And it is verified on LIVE ROWS, not only the fixture** — `dbRouteToCamel` and
    `normalizeWaypoints` both sit between the column and the screen, and either could have made the
    suppression reach nothing.
    `scripts/oneoff/probe-legmi-on-live-rows.mjs` **counts** rather than spot-checking, because
    `wa_lizard_mountain_south_route` prints 3.7 mi for a 16.3 mi leg and a search for a literal
    *"0.0 mi"* would call it clean: it derives the expected number of printed legs from the same
    geometry and asserts it exactly. Non-vacuous both ways — 3 of 4 routes fail on the old code,
    and the clean control `wa_mount_baker_coleman_deming` stays green either way.
- **`check:rappel-single-rope`** keeps the headline count honest for the rope most parties carry,
  and it asks the question two ways. `rappelRopeNeed()` decided which rope a descent
  needs from `rappel_detail[].lengthM` **alone** — deliberately, and the reasoning in its own
  comment is right: lengths catch every route that records them, prose catches only the few that
  describe their setup. What it could not catch is the other direction, **a row whose recorded
  lengths fit one rope while the row itself says they do not.**
  - `wa_east_face_2` is the case. Two stations, lengths `[35, null]` → `single70` → the header read
    **`RAPPELS · 2 rappels`** and `rappelSingleRopeWarning()` — the amber line written for a
    single-rope party to read *before they leave the car* — was **silent**. The row says twice that
    it must not be: its count note reads *"a single rope does not link the stations"* and the
    station's own `pull` note repeats *"Two 60 m ropes are the standard kit for this descent and a
    single rope will not link these two stations."*
  - **The length rule was resting on a number the same row disclaims.** That note continues
    *"Per-station distances are not published; the listed values are estimates … and should not be
    planned around"* — and the 35 that produced `single70` is one of them. Nulling it does not help
    (no lengths → no verdict → still no warning); the fix is to read what the row **states**.
  - **A STATED requirement carries no distance, so `max` is null and neither reader may quote one.**
    Inventing a metre figure on a safety line is the class this file records under half a dozen
    other column names. The header says `two ropes` rather than `two ropes (longest N m)`, and the
    warning names no distance it does not have.
  - **THE ESCAPE IS PER SENTENCE AND IT IS THE WHOLE PRECISION RULE.** *"Double-rope rappel (or two
    single-rope rappels)"* is **not** a two-rope requirement — one rope works and costs one extra
    rappel, which is the `singleRopeExceeds` path's job. **Seven catalog rows are that shape** and
    none may match, because a false rope warning is how a real one stops being read. Per sentence
    rather than per row, so a requirement stated about one station is not cancelled by an
    alternative offered about another.
  - **Behaviour-diffed across every row rather than asserted**: 151 station tables, old module vs
    new, **exactly 1 header and 1 warning changed**, the gained warning justified by the row's own
    words, and **0 rows lost a warning**. Injection-tested — reverting `lib/rappels.js` fails 7 of
    the new cases by name, and the four negative cases stay silent in both directions.
  - **Measured NON-finding, so nobody re-derives it as a defect:** 9 rows disclaim their own station
    lengths, and 3 of those show a warning quoting a metre figure (`wa_action_potential`,
    `wa_liberty_bell_thin_red_line`, `wa_ultramega_ok`). Each is **correct anyway** — their notes
    say the figures *assume near-full-length double-rope rappels*, i.e. the lengths are derived from
    the two-rope conclusion rather than evidence for it — and each note renders directly beneath the
    warning, so the screen self-corrects. Do not "fix" these by dropping the number.
- **`rappels` DENIED PER-STATION LENGTHS ITS OWN ROW STATED FIVE WAYS, on one panel.** The Plan
  tab's RAPPELS section read, in this order: *"4 stations · two ropes (longest 50 m) · 558 ft
  total"*, then *"the published descent is roughly 50 m, 50 m, 50 m and a short 20 m"*, then the
  table — R1 164 ft, R2 164 ft, R3 164 ft, R4 66 ft — and then, last, **"per-station lengths
  unconfirmed"**. One screen, two answers, on a rappel record.
  - **THE MIRROR OF `audit:rappel-claims`, which asks whether `rappels` claims raps the descent
    text DENIES.** Here it denied what the row states, so that audit is blind to it by construction.
  - **Which half was stale needed no judgement.** #1043 nulled 50/50/50/20 on the reasoning that
    this route's own `descent_text` then said *"~30 m each"* and its gear list named a single 60 m
    rope. A later research pass reversed that **with a source** and updated every record except the
    summary: `descent_text` now reads *"four consecutive double-rope rappels of roughly 50 m, 50 m,
    50 m and 20 m"*, `rappel_count_note` cites two independent accounts, `gear` names *"Two 60m
    dynamic ropes"*, and the header and 558 ft total are derived from the table. Five records
    against one clause.
  - **A CLASS OF ONE, MEASURED:** across the 113 WA routes whose `rappel_detail` states lengths,
    exactly one had a `rappels` string denying them. No detector — that is the thing this repo keeps
    declining to build. `scripts/oneoff/fix-west-face-rappels-deny-their-own-table.mjs` removes the
    clause under a declared-state contract that re-asserts all four corroborating records at apply
    time, so a further re-research refuses rather than being written over.
  - **THE HEDGE IS NOT LOST WITH THE CLAUSE**, which is the rule this repo holds prose repairs to:
    the count note's *"roughly"* and its two named accounts render directly above the summary. What
    was removed is a claim the row contradicts, not an uncertainty it carries.
  - **FOUND BY RUNNING A `scripts/oneoff/` VERIFIER, AND THE VERIFIER WAS ITSELF STALE.**
    `verify-rappel-fix-renders` still asserted #1043's nulled state — *"no 50 m on screen"*, *"em
    dashes for the nulled stations"*, *"the summary says lengths are unconfirmed"* — i.e. it demanded
    the app contradict its own sourced row. Repointed rather than deleted, because the question
    survives every re-research: **does the panel agree with itself?** It now asserts the row states
    four lengths, that the 50 m station reaches the screen, and that the summary does not deny what
    the table above it prints.
- **`audit:rappel-claims`** asks whether a route's `rappels` field claims rappels its own
  `descent_text` says are not made. Both describe the same descent of the same climb, so a
  disagreement means one is wrong. `wa_mount_stuart_north_ridge` — the route `check:ui` pins as its
  sample — stored **"6 raps to 30m"** while its descent text said the Cascadian Couloir walk-off
  needs "no rappelling required (0 rappels)" and that the only rappel is an optional bypass taken on
  the way **up**. `wa_mount_baker_coleman_headwall` stored "2-3 rappels to 30m" against a text
  saying no trip report describes a fixed rappel on its descent at all.
  - **No coverage check can see this.** They ask whether the column is populated, and it is — a
    wrong claim and a right one are identical from there.
  - **Report-only, and it must stay that way.** Measured precision on the first run was **6
    flagged, 1 real**. A walk-off descent can still involve a real rappel elsewhere on the day
    (Buckner's North Face rappels the Sharkfin Col step on the *return leg*, and its text says to
    treat that, not the summit slopes, as the route's rappel hazard), and rappelling is often a
    conditional alternative to downclimbing rather than a contradiction (Stickney). Read both
    fields in full before changing either. The exit code says "things to look at", never "bugs".
  - The claim regex matches only a **leading** number. Prose that merely mentions a rappel is not
    an assertion that the descent has N of them, and matching it buries the real hits.
  - Two of the six were fixed as **phrasing** rather than errors: Colchuck's Northeast Couloir led
    with a rappel sequence its own text calls an emergency option while discouraging that descent
    entirely, and Stickney's bare "1" became "0-1, conditions- and party-dependent". Leading with
    the wrong descent is its own defect even when every fact is true.
  - **ITS CURRENT THREE CANDIDATES ARE ALL NON-FINDINGS, read 2026-08-26 and recorded so the next
    reader does not re-derive them.** Two share one mechanism, and it is the one this entry's own
    warning names: **a no-rappel ALTERNATIVE is not a denial of the stated count.**
    `wa_mount_mystery_standard` claims 2 and its descent text *confirms* two single-rope rappels —
    it trips on a trailing note about a longer high-route exit "with no rappels required", which
    the text itself labels *"a valid but distinct high-route variant, not the standard
    reverse-the-ascent descent"*. `wa_overcoat_peak_southeast_route` claims 2 and its text says
    *"most parties do NOT free-downclimb the full corner — instead, build two rappels"*; it trips
    on *"Some parties instead find they can downclimb the full chimney/ledge system"*. The third,
    `wa_buckner_mountain_north_face`, is the case this entry already documents.
  - **Do NOT tighten the needle to make those three go away.** An alternative and a contradiction
    are the same words in a different frame, and a rule strict enough to separate them would be
    fitted to these three — the *tightened until it no longer fires* failure `audit:silent-reverts`
    records. The audit is report-only and says so; three candidates a reader can settle in a
    minute is the intended cost, and the fix for a stale one is a line here, not a stricter regex.
  - **DO NOT BUILD THE PITCH-COUNT SIBLING OF THIS AUDIT — measured 2026-09-09 and refused.**
    *"Does a route's stored `pitches` disagree with a count in its own prose?"* is the same
    question this audit answers for `rappels`, and the founding observation is real and on screen:
    **Mount Stuart's North Ridge stores 20 pitches** while its own overview says *"roughly 18
    pitches and 3,000 ft total"* and its PRO TIPS say *"a full day for ~18 pitches"* — three
    numbers for one route on one page. `scripts/oneoff/measure-pitch-count-claims.mjs` sizes it
    across all 8,365 WA routes: **115 state a count, 24 disagree with the stored value, and
    reading them gives roughly THREE real** — ~15% precision, worse than `audit:area-parents`'
    first draft, which this file already records as a mistake.
    - **Prose states a pitch count for at least six reasons and only one is the route total**: a
      **section** (*"the Runnels — roughly 3 pitches of steep ice"*), a **shared** section
      (*"shares its first 3 pitches with A Servant To Liberty"*), a **different route named to warn
      you off it** (*"a distinct, harder variation called 'North Face Direct' (5.9, 5 pitches) …
      should not be confused"*), a **descent** (*"rappel the first 3 pitches"*), a **historical**
      state (*"when the route reportedly had 9 pitches of ice; today's icefall is shorter"*), and a
      **linked** count (*"many parties link it into just 4-5 pitches"*).
    - And a **sum** can agree while no single number does — *"8 pitches to M&M Ledge, then shares
      its final 3-4 pitches"* against a stored 11. Flagged, and correct.
    - *A distinction that defeats a regex is a distinction a sweep will get wrong* — the same
      conclusion this file reaches for the `guidebook` citation family. What survives is two or
      three per-route data questions needing a **source**, not a transform:
      `wa_cathedral_rock_northeast_buttress` (*"Overall grade III, 6 pitches"* against a stored 7),
      `wa_chair_peak_east_face` (*"Rated 5.2 (PG13) over 3 pitches, 600 ft"* against 4), and
      Stuart's 20-vs-18. **Report, do not sweep.**
- **`check:pitch-discount`** guards the climbing-time discount two ways: that the curve has the
  properties its comment claims, and that the planner **says** it applied. Promoted out of
  `scripts/oneoff/`, where it had been proving both and **running nowhere** — the shape this file
  records under `check:field-renders` (*"a verification nobody runs is not a verification"*) and
  `check:guard-wiring` (*"a guard authored, injection-tested, documented and never wired in looks,
  from every vantage point anyone checks, exactly like a guard that passes"*). Static SSR + esbuild,
  **0.8s CPU** against `check:waypoint-placement`'s 6.3s on the same box, so it sits in `npm run build`.
  - **What it protects is the "down before dark" answer.** `techHrs` discounts per-pitch time on
    easy ground, and that number feeds Est. summit / Est. return. Erring short there is the #641
    direction — an affirmative that reads green. The curve assertions are the ones a future edit
    breaks silently: **never shortens** an estimate against the old step, **monotone**, **bounded to
    [0.5, 1]**, and an **unparsed grade or NaN cannot earn a discount**.
  - **The step became a taper and the boundary MOVED with it** — 5.6 went from full discount to
    none, cutting the worst single-grade jump from **2.17x to 1.44x**. An earlier version of this
    probe asserted the disclosure was PRESENT at 5.6 and caught that drift by failing. **Keep the
    model and the message pinned together here, or they separate silently.**
  - Asserts **both directions** — present at 5.5 and 5.4, absent at 5.6, 5.10a and with no pitches —
    plus an `ANCHOR` that the estimate tiles rendered at all, without which every "absent" is
    vacuous. Injection-tested on promotion: a flat `pitchedFraction` returning 0.2 fails four named
    assertions and exits 1.
  - **Promoting a one-off changes its DEPTH, and `ROOT` was `../..`.** It failed loudly — esbuild
    could not resolve the app files — rather than silently measuring the wrong tree, which is how
    `measure-which-tab-renders-each-field.mjs` reported another branch's code for weeks. Check the
    root resolution of anything moved out of `scripts/oneoff/`.
  - **THE OTHER INPUT TO THAT ESTIMATE IS ASSUMED ON EVERY DB ROUTE, AND HALF OF THEM STATE IT.**
    The climbing leg is `techHrs(route.pitches, route.avgPitchLength || 35, gn(route.grade))`, and
    `routes` has **no pitch-length column** — only `pitches` and `pitch_detail` — while
    `avgPitchLength` is not produced by `dbRouteToCamel` and exists on **seed routes only**. So the
    `|| 35` fires on all 205,492 DB routes. Measured by
    `scripts/oneoff/measure-assumed-pitch-length.mjs` over 451 multi-pitch routes carrying
    `pitch_detail`: **50.6% state a length on 2+ pitches**, p50 **36 m**, mean **39.9 m**.
    - **35 is well chosen, not invented** — it sits on the median — so this is NOT the fabrication
      class. The narrower finding is that on half these routes the app HAS the number and
      substitutes a constant, on a value feeding Est. summit / Est. return.
    - **The deciding measurement is WHERE the number comes from**, because this file's standing rule
      is *do not read a fact out of English prose*, least of all a safety-adjacent one — the reason
      the rappel counts and the camping permit verdict were both refused. Here **~85% is an explicit
      numeric field** on the pitch object, not prose, so a fix could read those and ignore prose
      entirely.
    - **CORRECTED, AND THE CORRECTION KILLS THE CASE FOR CHANGING ANYTHING. A `pitch_detail` ENTRY
      IS NOT ALWAYS ONE PITCH.** The figures above (50.6%, mean 39.9 m) counted **stage
      aggregates** as pitch lengths: `pitch` is a string on many routes — *"1-13 (roped/simul-climbed
      sections)"* at **396 m**, *"Approach (unroped)"* at **305 m**, *"Section 1: Beckey Route
      (Liberty Bell)"* at **152 m** — and the `lengthM` beside it covers the whole stage. This file
      already records that shape under `check:pitch-split`; the measurement did not apply it.
      Counting only entries whose `pitch` is a NUMBER, and bounding to 10-100 m:

          usable (2+ single-pitch entries)   152 of 451  (33.7%, not 50.6%)
          implied average                    p10 26m   p50 35m   p90 53m
          mean                               37.3m against the assumed 35m

      **The default is now exactly the median.** The mean differs by 6.6%, on a third of
      multi-pitch routes, in both directions.
    - **So the change was NOT made, and that is the finding.** Reading each route's own lengths
      would move a safety-adjacent estimate by a few percent, both ways, to replace a constant that
      already sits on the median. The measurement is worth keeping; the fix is not worth the risk.
      **A count is only as good as its tokeniser** — the same lesson `audit:approach-scope` records,
      and the reason the first version of this note overstated by half.
- **`check:logged-times`** asserts that a climber's logged time reaches the planner. Since #787
  a trip report carries approach / climb / descent minutes and a car-to-car total, and other
  climbers can read them — but the planner still answered "how long will this take?" with
  Scarf's Rule alone, so the app held evidence of how long a route takes and printed a formula
  beside it. The panel now sits **above** the estimate, because ordering is a claim about
  authority: measurement first, model second.
  - **No existing guard could ever see it.** `check:bare` renders a route with no activity;
    `check:ui` walks the seeded demo, whose `cond.carToCar` is **prose** ("7 hr", "3 days",
    "Turned around") and therefore deliberately ignored; `check:zero` has nothing logged; and
    `check:field-renders` covers `routes` columns while these are `climb_logs` ones. That is the
    `check:anniversary` shape — a surface nothing exercises breaks silently and stays broken.
  - **Numeric minutes only, never the `carToCar` string.** Parsing it would read `3` out of
    "3 days", which is the mistake `rappels` and `season` already record. `carToCarMin` is the
    integer; the legs are integers; their sum is a real car-to-car. One assertion exists purely
    to fail if anything ever starts parsing English durations.
  - It does **not** feed the model. `scarfHrs` is parameterised by the READER's fitness and pack
    weight, and a logged time comes from a party whose fitness nobody recorded; blending them
    would give a number that is neither measurement nor prediction. A median with the spread and
    the party count says what it is. A **turned-around** party is excluded from the total — they
    covered real ground, but not the route — and the count on screen is what proves it.
  - Static SSR (no browser, no DB), so it sits in `npm run build`. Injection-tested, 5 cases at
    the bottom of the script; dropping the `activity` prop, counting non-completions, parsing the
    prose, and swapping the median for a mean each fail it by name.
  - **THE WHOLE PATH IS BUILT AND CARRYING NO DATA, and that is a fact about USAGE, not a defect.**
    Measured 2026-08-28 with the service key: `climb_logs` holds **1 row**, and **0** rows populate
    any of `approach_minutes`, `climb_minutes`, `descent_minutes`, `car_to_car_minutes`. Every link
    works — all four are in `syncLogToDb`'s write payload, in `TRIP_REPORT_COLS` on the read, and
    this guard proves the render. There is simply nothing to render yet.
  - **So a green run here does NOT mean the feature is delivering.** It means the reader is wired
    ahead of the data — the `check:field-renders` `SENTINELS` situation, and the right state to be
    in — but do not read it as evidence that climbers' times are reaching anyone.
  - **It is the precondition for the two open modelling questions this file records**: the
    `techHrs` grade cliff, and whether `scarfHrs`' base rate runs optimistic (see
    `check:return-leg`). Both stop at the same wall — nothing measures how long parties actually
    take — and both become answerable when this table fills, not before. **Do not answer either by
    guessing a curve**; that is the fabrication these notes keep refusing.
  - **An ANON count says 0 whatever the table holds**, so measure this with `requireServiceKey()`.
    A future "is there data yet?" check run on the anon key would answer no, confidently and
    wrongly.
- **`gain_ft` BELOW `loss_ft` ON A ROUTE THAT RETURNS TO ITS OWN TRAILHEAD — you cannot finish
  lower than you started.** The same kind of claim `check:impossible-leg` makes: no prose, no
  judgement, the row contradicts itself. And the app already knows the pairing — `gainCoversWholeOuting`
  is |loss − gain| / gain ≤ 3% and relabels the TECH STATS tile *"On foot"* when it holds.
  `scripts/oneoff/measure-gain-vs-loss-on-an-out-and-back.mjs`.
  - **`audit:gain` IS BLIND TO IT, and that is why it is worth having.** That audit compares
    `gain_ft` against the rise between the route's own PINS, so a route whose pins agree — or whose
    implied start happens to coincide with a recorded waypoint — never reaches its output. All
    three routes repaired here were EXCUSED by its recorded-start rule, not flagged.
  - **ONE-SIDED, for `audit:gain`'s reason.** Loss SMALLER than gain is ordinary: 135 of these 640
    rows differ by more than 3% and the bulk have a tiny `loss_ft`, because that column also holds
    the APPROACH's net descent rather than the outing's — **two conventions in one column**, the
    shape recorded for `dist_km`. Only the other direction is a contradiction.
  - **A TRAVERSE IS ALLOWED TO FINISH LOWER, and that is most of the raw count**: 45 of the 52 say
    traverse / point-to-point / one-way / shuttle in their own prose.
  - **OF THE SEVEN LEFT, FOUR ARE A CONVENTION AND NOT A DEFECT, and separating them is the whole
    precision.** Where `gain_ft` matches the trailhead-to-summit PIN RISE almost exactly while
    `loss_ft` is larger, gain is the RISE and loss is the total descent **including re-gains over
    intermediate bumps** — two true numbers answering different questions, which is what five of the
    seven pairs in the facts-stored-twice census also turned out to be.
    `wa_spinnaker_peak_s_route` (2,045 against a 2,054 rise), `wa_mount_saul_se_route` (4,993 against
    4,993), `wa_mount_lincoln_standard` and `wa_buckhorn_marmot_pass` are those, and they are left
    alone.
  - **THREE WERE BELOW BOTH `loss_ft` AND THE PIN RISE**, so that reading cannot explain them, and
    each had a third and fourth record agreeing: `wa_wilmans_peak_scramble` (2,300 against loss 4,500,
    rise 4,518 and a totalNote saying *"4,500 ft of gain"*), `wa_union_peak_se_route` (1,096 against
    loss and rise agreeing **to the foot** at 1,696) and `wa_mount_rainier_curtis_ridge` (7,000
    against loss 9,500, a totalNote saying *"~9,500 ft gain"*, and a 10,006 ft rise). Repaired by
    `scripts/oneoff/fix-gain-below-its-own-loss.mjs`, which **copies `loss_ft` rather than typing a
    number** — the declare-a-donor contract the trailhead and summit-pin repairs use, so a fix
    needing a figure the row does not hold cannot be expressed. Contradictions **3 → 0**.
  - **It is not cosmetic.** `gain_ft` becomes `gainM`, `scarfHrs` turns it into the approach
    estimate, and that feeds Est. summit, Est. return and the After dark warning — so an understated
    gain makes the app **optimistic**, the #641 direction.
  - **A NINTH PAIR MEASURED ON THE WAY AND LEFT AS A READING LIST:** `gain_ft` against the trip
    total stated in the route's own `itinerary.totalNote`
    (`scripts/oneoff/measure-gain-vs-itinerary-total.mjs`). **192 comparable, 17 disagree** — but
    only the **8** with a ONE-DAY itinerary are decidable, because where the trip has a camp *"the
    trip total"* and *"the gain this column holds"* are different questions by the documented
    high-camp convention. Two narrowings carry that precision, and the first draft got both wrong:
    the figure must be one the note itself calls a TOTAL (a first version took the first number it
    found and read a per-day LEG as the total, reporting 44, several with `gain_ft` LARGER than the
    "total" it had picked), and the comparison is one-sided with the climbing vertical credited
    first. **Read the row before repairing one** — `wa_grotto_mountain_e_route` stores `dist_km`
    7.72 against a note saying 4.8 miles ROUND TRIP, i.e. that row is also carrying the two
    `dist_km` conventions this file forbids normalising in bulk.
  - **AND A NARROWING OF `audit:gain`'s OWN EXCLUSION WAS MEASURED AND REJECTED — do not
    re-derive it.** That rule excuses a route which RECORDS something at the height its stored gain
    implies, and on a one-day car-to-car itinerary there is no high camp, so the exclusion is
    sometimes satisfied by a junction, a stream crossing or a roadside campground. Measured: of the
    **29** excused, **23 are excused by a CAMP** and **1 by the BASE of the climb** — the convention
    working — and only **5 by something else**. Reading those five, three are marginal (334–576 ft
    over a 300 ft slack), one is a three-day trip where a camp may legitimately apply, and one is a
    genuine 642 ft shortfall. So tightening buys **~1 real finding and risks 4 false warnings** on a
    caveat this file already records #1533 widening precisely to stop false accusations. *A false
    warning is how a real one stops being read.*
- **`audit:gain`** asks whether a route's stored `gain_ft` is even POSSIBLE given its own
  waypoints. A party that starts at a trailhead at X ft and stands on a summit at Y ft has gained
  at least Y − X, so a row storing less than its own net rise is storing a number that cannot be
  true — and no research is needed to say so, because the contradiction is inside the row. Same
  family as the chord-vs-trail-mileage test. **88 of 800 comparable WA routes (11%)** fail it.
  - **It is not cosmetic, and the chain was checked rather than assumed**: `routes.gain_ft` →
    `dbRouteToCamel`'s `gainM: r.gain_ft/3.28084` → `scarfHrs(distKm, gainM, …)` → the Plan tab's
    estimated summit time, estimated return, and "after dark" warning. Measured with the app's own
    `scarfHrs`: `wa_mount_rainier_tahoma_glacier` stores 5,007 ft against a trailhead→summit rise
    of 11,506 ft, which **understates its approach by 3.3 hours**. That is the #641 shape — a
    number that quietly makes the return tile optimistic.
  - **ONE-SIDED BY DESIGN.** Too little gain is impossible; too much is not, because a real route
    rolls over intermediate bumps its endpoints cannot see. A two-sided test would flag correct data.
  - **IT ACCUSED 26 ROUTES THE APP'S OWN PREDICATE CALLS FINE, FOR AS LONG AS BOTH EXISTED — the
    four-grade-parsers shape, in a guard/audit PAIR rather than in two functions.**
    `gainBelowOwnPins` has credited the climbing vertical since #1533 (`scarfHrs` is the HIKE leg
    and `techHrs` the climbing leg, so `gain_ft` is the APPROACH gain and a trailhead→summit rise
    includes vertical the PITCHES already account for); this audit never gained that rule and was
    still comparing against the raw rise. **60 findings → 34.**
    - **THE GUARD'S OWN SUITE NAMED THE CASE THE AUDIT WAS GETTING WRONG.**
      `check:gain-floor-stated` pins `wa_liberty_traverse` — 26 pitches over a 2,520 ft rise — as a
      route that must **not** be accused, and `audit:gain` was accusing it. When two things ask one
      question, the one with a test suite is the one to believe.
    - **A CREDIT CAN ONLY EVER EXCUSE, and asserting that caught a real error in the fix.** The
      first version also credited the climb inside the CONVENTION test, which moved **two** routes
      INTO the findings (`wa_colchuck_balanced_rock_west_face`, `wa_mount_terror_southeast_face`)
      by un-excusing a convention they legitimately use. The convention test stays **summit-based**
      — this column holds two readings, and the audit's own worked example is the second kind
      (`wa_mount_adams_adams_glacier`, 12,276 − 5,150 = 7,126, a camp-to-summit gain). Diff the
      finding SETS, never the counts: the totals alone read as a clean 60 → 34 either way.
    - **THE FALSE-PASS DIRECTION WAS MEASURED BEFORE SHIPPING.** Crediting the climb against a rise
      whose high pin is the BASE of the route would excuse a row wrongly — `wa_smears_jugs_and_rock_roll`'s
      high pin is *"Base of Prusik Peak south face"*, where the pitches sit above it. **0 of the 26
      excused rows has a base-like high pin**; every one tops out at a named summit. Re-check that
      if the endpoint rule ever changes.
    - Two independent methods agreed on the same 26 (a standalone join against `pitches`, and the
      audit itself after the edit), with **0** disagreements either way.
    - `--fixture <path>` reads a synthetic catalog, because these faults live in the DATA and a
      checker must not write to the live project to make one — the mechanism `audit:trailhead-road`
      already sets. Injection-tested **6/6**
      (`scripts/oneoff/inject-gain-credit-cases.mjs`), judged on the audit's own `--json` rather
      than on text, so a case cannot be written against the wording of a PASS. **Three must stay
      SILENT** — the credit firing, a correct gain, and a camp-to-summit convention — because a
      credit that excused everything satisfies every must-fire case. Proven **non-vacuous** by A/B:
      with the credit neutered, the load-bearing case reports the finding again.
  - **The obvious alternative explanation is HALF TRUE, which is why it is a filter and not a
    footnote.** `gain_ft` may legitimately be measured from a high camp or the base of the climb
    rather than from the trailhead. Of the 112 routes that fail the raw test, **24 have a waypoint
    at exactly the elevation the stored gain implies** — `wa_mount_adams_adams_glacier` stores
    5,150 against a "High Camp" pin at 7,000 ft, and 12,276 − 5,150 = 7,126. Those are a
    **convention**, not an error, and reporting them would be reporting correct work. The other 88
    imply a start the row records nothing at. Same shape as `dist_km` holding two conventions at
    once — **this column has two readings too, and only one of them is wrong.**
  - **AND THE REMAINDER IS 30 SOURCES, NOT 34 ROWS — `scripts/oneoff/triage-gain-findings.mjs`.**
    It runs the audit rather than restating its rule, and separates what a row count hides: **2**
    already adjudicated in the audit's own header (the Austera pair, whose reasons sat in a comment
    while being reported as the top two findings by magnitude), **1** cluster where several routes
    on one peak share one starting elevation and therefore one number, and **29** genuine
    singletons. It also flags **2** roped routes storing ZERO pitches, where the missing record may
    be the PITCH COUNT rather than the gain — repairing `gain_ft` there is the
    [[changing-which-record-wins-leaves-the-neighbouring-field-behind]] shape.
    - **A PEAK IS NOT AN APPROACH.** Keying on `area_id` alone put three Rainier routes in one
      "cluster" while they start at Paradise, Mowich Lake and White River — three walks, three
      numbers. A cluster counts as one fact only when the low pins agree within 200 ft; the rest
      are printed as context and counted as singletons.
    - **AND KEYING ON THE TRAILHEAD NAME WAS WORSE.** The first version keyed on `area_id` plus the
      pin's rendered name and reported 1 cluster of 3 against a true 4: the two Austera routes are
      one peak off one road, spelled *"Eldorado Creek / Cascade River Road TH"* and *"Eldorado Creek
      trailhead (Cascade River Road mile 20)"*. **A name is not an identity**, and
      [[a-detectors-clustering-key-decides-what-it-can-see]].
    - **The clustering hypothesis mostly DIED and that is the result**: 5 of 34 are one fact
      repeated, so it collapses the job by four rows, not by an order of magnitude. Report only —
      it picks no column and writes nothing.
  - **THE 88 HAVE NO COMMON CAUSE — both stories were tested and BOTH DIED, so do not write a bulk
    repair.** The findings look systematic (57 of 88 share a `gain_ft` with another finding, and the
    shared values are round: 4000 six times, 4800 six, 1200 five, 2200 five), which reads as either a
    value copied across siblings or a round number guessed instead of measured. Measured against the
    **passing** population — the denominator the audit itself does not emit —
    `probe-gain-findings-are-round-estimates.mjs` says neither holds. Roundness is a property of the
    **column**, not of the defect: 73.9% of failures are a multiple of 100 against **63.5% of the 688
    passing routes**, which is a 10-point lean and not a cause. And the contamination story fails in
    the **opposite direction** — a failing route shares its gain with another route **64.8%** of the
    time against **76.0%** for a passing one, so the defective rows are *less* duplicated than the
    healthy ones.
    - So these are 88 individually wrong numbers, not one import bug with 88 symptoms, and the repair
      is per-route research. **A transform would have to invent a value**, which is the class this
      file records for interpolated pins and halved rappel lengths. 23 of the 88 carry a non-round
      gain (`wa_mount_rainier_edmunds_headwall` 8,470; `wa_mount_logan_r1` 7,027) — a guessing story
      never explained those either.
    - The transferable half is the method rather than the answer: **a pattern among findings is not
      evidence until it is compared against the rows that pass.** Every count here that was quoted
      without its denominator has overstated the work.
  - Elevations are read from `elev` (**feet**) with the legacy `elevM` spelling converted, because
    mixing them would put a silent 3.28x error into every comparison.
  - **`--json` must never be followed by `process.exit()`**, and this cost an hour to see. On a TTY
    stdout is synchronous and the exit is harmless; on a **pipe** it is asynchronous, so exiting
    truncates whatever has not flushed. The first consumer got valid-looking JSON cut off at a
    *different byte on every run*, which reads as "this script emits broken JSON" when the output
    is fine and the exit is the bug. The two modes are branches now. **Any script here that grows a
    machine-readable mode inherits this trap.**
  - **WHICH summit, and which trailhead? `.find()` took whichever the enrichment listed FIRST**,
    so on the **24 WA routes carrying more than one summit-typed pin** the audit's answer depended
    on row order — one of them by **1,815 ft**. Row order is not a record. It now takes the LOWEST
    summit-typed pin and the HIGHEST trailhead, which give the smallest rise: `rise` is used as a
    LOWER BOUND and the whole one-sidedness rests on it, so a smaller rise can only under-report,
    never accuse a correct row. **Proven behaviour-neutral on today's catalog** — the finding set
    and every `rise` are byte-identical, so this removes a dependence on row order without moving
    a single verdict.
    - **"HIGHEST SUMMIT" WAS MEASURED AND REJECTED, and the measurement is the whole point.** It
      adds 5 findings and loses none, which reads as strictly better coverage until you open
      them: **four are Squire Creek Wall south-face routes** whose own Topout pin says they end
      at the 3,249 ft grassy saddle, while a Summit pin records the FORMATION's 4,958 ft high
      point they never reach. Only `wa_sherpa_glacier` is genuine. **One real in five** is the
      precision that teaches people to ignore an audit.
    - **Preferring the route's own Topout does not rescue it either**, and that is why the
      endpoint cannot be resolved from the pin TYPES at all: `wa_sherpa_glacier` carries *"Top of
      Sherpa Glacier"* (7,600) as an INTERMEDIATE topout on the way to Stuart's 9,415 ft summit,
      so the same field means *where the route ends* on one route and *a milestone* on the other.
    - **KNOWN MISS, stated rather than hidden**: `wa_sherpa_glacier` stores 6,000 ft against a
      trailhead-to-Stuart rise of 6,485 and is NOT reported, because its lowest summit-typed pin
      is that intermediate topout.
  - Read-only, anon key, fails closed on an empty read. **Not a build gate** — a property of the DB,
    not the checkout, so no code change can cause or fix it; same reasoning as `check:counts`.
