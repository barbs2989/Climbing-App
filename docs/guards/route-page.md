# The route page

Rendering of a route's own page: bare routes, enriched columns reaching a screen, token-shaped boxes, provenance, the summit briefing, route breakdown, trailhead directions, the access checked date, wildfire, gear.

Part of the guard notes — see [README.md](README.md) for the full index.

- **`check:bare`** renders the real `RouteDetail` with `react-dom/server` for a route that
  has **no enrichment** — name, grade, pitches and nothing else — across every discipline ×
  sub-tab, and asserts the screen states what it does not know. It exists because `check:ui`
  walks exactly **one** route detail and the route it samples is an *enriched* one, so the
  shape almost every route actually has was the one shape nothing rendered. Enrichment
  reaches ~648 of 5,477 alpine-scope routes; catalog-wide it is 1,023 of 205,492. Two bugs
  shipped straight through that hole: **#641** (`scarfHrs` coerces `+distKm||0`, so "no
  approach data" and "a zero approach" were identical — Total/Est. summit/Est. return added
  a 0.0hr hike leg and the return tile went **green**, an affirmative "you're down before
  dark" with the walk in *and* out counted as zero, and the "After dark" warning could never
  fire) and **#655** (the sport/trad/bouldering safety advice sat behind the Safety tab,
  which was hidden for exactly those three disciplines). **Those per-discipline boxes are now
  REMOVED by user decision** — "Spotting & landing", "Clipping & lowering", "Gear & anchors" and
  "Watch out for on this type of climb" were the same canned lines on every route of a kind,
  advice about climbing in general rather than this climb — and section 3 pins that they stay
  gone on every discipline. The sport bolt-problem reporter survives: it acts on this route.
  Both were invisible to a guard that
  only renders a populated route. Gated by `npm run build`. Injection-tested: restoring the
  pre-#641 file trips 6 assertions, and renaming a UI anchor trips `ANCHOR LOST` rather than
  silently passing. **Effects do not run under `renderToStaticMarkup`**, so anything animated
  (`CountUp`) renders its initial `0` — never assert on those numbers.
  - It also pins **where the nearby-fire panel lives**: first section of the Safety tab, on every
    route, and nowhere else. That needed a **located** fixture — `bare()`'s area has no `lat`/`lng`
    and `FireNearRoute` renders nothing without a coordinate, so every other render here is of a
    route where the panel is correctly absent. Match its loading line, **never its "Fire & smoke"
    heading**: the Safety tab's forecast list links `Fire & smoke — AirNow`, and an injection that
    removed the panel from Safety entirely passed on the strength of that link.
  - **Plan and Safety are gated differently, and it asserts both.** `showPlan` is content-gated;
    the Safety tab is **unconditional**. An empty Plan tab promises an approach and a descent and
    delivers a blank, but the Safety tab is never empty — the forecast
    links and the fire panel all render without the route carrying one safety field of its own.
    While Safety was content-gated too, 99.5% of the catalog had nowhere to show a live wildfire.
    `hasSafetyContent()` is gone; `hasPlanContent()` stays.
- **`check:approach-section`** renders the real `RouteDetail` and pins that the Plan tab has
  **one** APPROACH section. There used to be two: "APPROACHES · N ways in" (`approach_variants`)
  and, under it, a separate APPROACH box holding the `approach` paragraph, which read as a third
  way in, while nothing said which way people actually take. Measured 2026-09-24: 796 routes
  carry both, and on 771 the paragraph is the long-form account of the FIRST variant, so it now
  renders **inside the main way in's card** ("Full description"). The main way in is the variant
  with `primary:true`, else index 0; it is drawn first, and badged **Most used** only when that is a
  RECORDED mark on a route with two or more — never on array order alone. When a variant carries
  `longForm:true`, the paragraph and the route-level numbers hang under IT instead (research found
  ~20 routes whose paragraph describes a way in that is not the most used one). Gated by `npm run build`. Injection-tested: moving the paragraph out of the
  main card, or ignoring `primary`, trips 6 assertions.
  - **The paragraph is never collapsed.** `check:field-renders` proves `approach` reaches a screen
    by server-rendering the page; a "read more" whose tail is behind `useState(false)` is not in that
    markup, so the column would read as unrendered.
  - **The Stream crossing chip reads `hazards` only**, never `notes` or `name`: 546 approach texts
    say "creek", and almost all are places ("Icicle Creek Road"). The chip only repeats a hazard
    already on the card.
  - **Route-level numbers backfill the MAIN card only, under Overview's own labels.** On a summit
    route `gain_ft` is the whole ascent — printing it as "approach gain" would claim the trail
    climbs 5,500 ft before the route starts. Section 7 pins that.
  - **Structurally blind to whether `primary` is TRUE on the ground.** That is research data; this
    proves only that the screen honours the column.
- **`check:field-renders`** asks, for every enriched `routes` column, whether its value ever
  reaches a screen. A column can be mapped in `dbRouteToCamel`, offered in the fix form, and
  displayed **nowhere**: `descent_text` was populated on 1,021 routes and rendered on none
  while the form invited climbers to write into it (#707). Grep cannot find that — every
  identifier is referenced. Only rendering can. It pulls a **real value from the live DB** per
  column, injects it onto a bare route, renders all six sub-tabs, and looks for it on screen.
  Runs on every PR via `render-guards.yml`; not a build gate (it reads the DB).
  - It replaced `scripts/oneoff/measure-which-tab-renders-each-field.mjs`, which hardcoded
    `ROOT` to the `rappels-rack-filter-class-audit` worktree — so it silently measured a
    different branch's code than the one you ran it in.
  - **Six ways this kind of probe reports a healthy column as dead.** All six were live in the
    first drafts and the count went 15 → 3 as each was fixed, so distrust a first run: a
    hardcoded root; too few sub-tabs (`climate` renders on *conditions*); rendering
    `<RouteDetail/>` alone when `ClimbMatch.jsx` also mounts sibling panels that own whole
    columns (`EnrichmentPanels` owns crowds/partner_requirements/seasonal_guidance/data_quality,
    `EmergencyRescueCard` owns emergency); one discipline base, when `RouteGearCheck` is
    `cragOnly`; testing only the longest string leaf, which condemns a column over one hidden
    sub-key (it called `pitch_detail` dead, and that visibly renders); and confusing **used**
    with **echoed** — the RACK box prints `rackSummary()`, so raw `gear` prose never appears
    verbatim though the column drives the screen.
    - **A SEVENTH, added 2026-08-20 after it produced a wrong claim in a merged PR:
      `dbRouteToCamel` opens `return { ...r, ... }`.** It SPREADS the raw row and then adds
      camelCase aliases, so every snake_case column reaches the app whether or not the mapper
      names it. `grep -c difficulty lib/db.js` returning **0** therefore proves nothing, and a
      session concluded from exactly that grep that `difficulty` (8,029 routes) "was mapped by
      NOTHING" and that DiffRadar was dark catalog-wide. Executing the pre-change mapper settled
      it in one line: `.difficulty` came back intact, 70 keys. **Read the whole mapper — or just
      run it — before concluding a column is unreached.** Same shape as the `descentText`
      rivalry, where three sessions in a row derived a rule from one line of `var M` without
      reading the fix-ups below it.
      - What the episode DID leave behind is real and worth keeping: `difficulty` was absent from
        `FIELDS`, so the guard that exists to catch a column reaching no screen had never asked
        about it; and a rendered measurement (24,236 → 39,027 characters) that is a fact about
        the DATA's value on a route that carries it, not evidence of a defect.
  - The `KNOWN` map records **reasons, not passes**, and a name in it that starts rendering
    fails as stale bookkeeping.
  - **The `FIELDS` list is hand-maintained, and that was checked rather than assumed —
    deriving it automatically was measured and REJECTED.** `dbRouteToCamel` reads 61 columns
    against the 54 walked here, so 21 are unwalked; each was probed with a sentinel across all
    three bases and six sub-tabs. **Every one reaches a screen.** Six are numeric and judged
    only on "did the page change" (`length_m`, `gain_ft`, `loss_ft`, `dist_km`, `max_angle`,
    `high_point_ft`, plus `alpine_draws`/`rope_length_m`), the four grade variants and
    `rope_type`/`ascender` render outright, and the two that *looked* dead are both
    **used-not-echoed**: `grade_system` selects a format via `gradeSystemFor()` and is never
    printed, and `auto_generated` picks a provenance chip label in `lib/provenance.js` which
    needs section content a bare route does not have. So a derived list would carry ~10
    exemptions to report **zero** findings — bookkeeping that rots, in exchange for nothing.
    Add a column here by hand when one is added, and re-run that measurement before automating
    it. `check:field-renders`' subject is columns that reach a screen, not list maintenance.
  - **A column with ZERO populated rows was unguarded by construction, which is the worst
    possible moment for it.** The method pulls a REAL value, so a column nothing has written
    yet has nothing to pull: it reported `NO DATA` and was never checked — exactly when you
    most want to know the reader is wired, i.e. just after a migration adds the column and
    before any backfill. `0135` shipped the write for `prot_rating`, `start_type`, `landing`,
    `pads`, `rock` and `crux`, and #855 then had to prove they reach a screen with a **106-line
    one-off**, because this guard structurally could not answer it. That one-off is now folded
    in and deleted — a verification nobody runs is not a verification.
    - `SENTINELS` injects a distinctive value (`ZZCRUXZZ`) onto a bare route and looks for it,
      proving the **reader** independently of whether any row is populated. All six render, on
      Overview, in the TECH STATS tiles.
    - **Two traps, inherited from #855's probe rather than rediscovered.** `dbRouteToCamel`
      emits **both** `rock` and `rockType` from the single `rock` column, so patching one
      reports a healthy column as dead — mimic the MAPPER, never the column. And `pads` is
      numeric: the tiles render through `<CountUp/>`, which is `useState(0)` reaching its
      target only inside a `useEffect`, and effects do not run under `renderToStaticMarkup`.
      So a numeric tile renders **0** and its value can never be asserted here — those are
      judged on "did the page change", never on the number. Same warning `check:bare` carries.
    - A third base (`BOULDER`) exists because `landing`, `pads` and `start_type` are shown on a
      boulder problem and nowhere else; probing them from `crag` reports live columns as dead —
      the discipline-gating trap this file already records for `RouteGearCheck`.
    - `NEVER RENDERS (sentinel)` fails the run like any other unrendered column — matched with
      `startsWith`, not `===`, or the whole sentinel class could report a defect and still exit
      0. Injection-tested: deleting the `Crux` tile from `RouteDetail` fails naming `crux` and
      printing the injected patch, and restoring it goes green.
  - **A FAILED QUERY IS NOT AN EMPTY COLUMN, and conflating the two produced wrong advice
    rather than silence.** `if (!r.ok) return []` made a dead database indistinguishable from
    "no route has this column populated". Main went red twice on 2026-08-12 with all 46
    columns reading `NO DATA`, and the only line either run printed was
    `STALE allowlist entries (these now render — remove them): data_quality` — i.e. it told
    the author to delete correct bookkeeping from `KNOWN` because the DB was down. Following
    it would have removed the recorded reason a column is not rendered and the guard would
    then have called that column dead forever after. #863 fixed it.
    - That red was an **accident**, and the default was a **false pass**: the stale test is
      the only thing on that path that exits non-zero when nothing rendered, so with an empty
      allowlist the identical outage prints `ok — every measurable enriched column reaches a
      screen` and exits **0**. Measured, not argued.
    - **It was already lying on GREEN runs**, which matters more. Against the last green main
      run: 44 verdict rows identical, and `approach` reported `NO DATA` in CI while it
      demonstrably renders on three tabs. A silent timeout laundered into a coverage gap on a
      *passing* run. Do not read green here as "it read the data".
    - It now fails closed **before any verdict is interpreted** — ahead of the stale test in
      particular, since that is what turned an outage into an accusation. A thrown fetch is a
      separate path from `!r.ok` (connection refused used to escape as a raw `ECONNREFUSED`
      stack, which reads as a broken guard rather than a broken database), and a healthy `200`
      with `[]` for **every** column fails too — that is RLS rejecting every row or a wrong
      project, not a clean catalog.
    - **A `42703` gets its own message.** "This guard names a column that does not exist" and
      "the database is unreachable" need opposite repairs. That paid immediately: `permit_url`
      **is not a column** — `routes` has 95 and exactly one permit-ish one, `permit` — so every
      run had queried a phantom, got a 400, and filed it as `NO DATA`. Removed — this guard's
      subject is column → screen, and with no column there is nothing to query.
      - **The reason first given for that removal was wrong, and the wrong reason is the
        dangerous half.** It said the form does not offer `permitUrl` and no DB route can have
        one; both are false, and together they would justify deleting a working feature. It
        **is** offered — `{k:"permitUrl",label:"Permit link"}` lives in **`RouteDetail`'s own
        `FIELDS`** list, not `ClimbMatch.jsx`'s, which is exactly how the first check missed
        it — it is in `SS`, and RouteDetail renders `<a href={route.permitUrl}>` beside the
        permit prose. A DB route reaches it through the **contribution overlay**, which needs
        no column at all: `dbContribs` rows are grouped by field, gated on `SS[rc.field]` and
        applied onto the route object client-side once the 3-agree gate passes. Not every
        contributable field is column-backed, so "absent from `routes`" does **not** mean
        "unreachable" — check `SS` and the overlay before concluding a field is dead.
    - **Retries are five, and the number is measured.** The failure being retried is `57014`,
      the 3s anon statement timeout, so the *client* timeout is irrelevant — the server gives
      up on its own and only a later attempt against a warmer cache can succeed. A run
      recorded `season — succeeded on attempt 3` and still lost 17 of 45 columns, so three was
      the boundary rather than a margin. The same query measured 233–654ms for
      access/hazards/gear and timed out for approach/descent/road **minutes apart, with the
      slow set moving between runs**. Backoff is exponential because a fixed 400ms re-asks
      inside the same busy moment, and a total retry budget still caps the run so a
      wholesale-slow project degrades to one attempt per column, ends, and fails closed. A
      retry that **succeeds** is printed: absorbing it would turn a measurable flake into an
      invisible one.
    - **`order=id.asc` is what costs, NOT a missing index on the filtered column** — and the
      difference matters because it sends you to opposite repairs. Measured on the live
      project, same column, seconds apart: `descent` **timed out** with the order and returned
      **200 in 193ms** without it; `road` 3131ms → **123ms**; `approach` 13654ms → 6231ms.
      With `order=id.asc&limit=8` Postgres walks the id index and filters row by row until it
      finds 8 matches, so a **sparse** column traverses most of the table; unordered it can
      stop at the first 8 it meets. Narrowing with `id=like.wa_*` does **not** rescue it
      (still timed out on all three).
      - **Read those numbers as a RATIO, not an absolute, and here is the baseline that says
        why.** Every figure above was taken while the project was already degrading. Measured
        again the minute Postgres came back healthy, same three columns, ordering still in
        place: `approach` **206ms**, `descent` **215ms**, `road` **205ms** — against timeouts
        for all three an hour earlier. So the ordering is genuinely the more expensive plan
        and the A/B stands, but it is ~200ms on a healthy database, comfortably inside the 3s
        anon ceiling. It only becomes fatal when the database is *already* sick. Do not read
        this note as "the ordered query is slow" and go optimise it; the query is fine, and on
        2026-08-13 the actual fault was Postgres being unreachable
        (`503 PGRST002`) while Storage and the gateway stayed healthy.
    - **Indexes were considered and rejected, deliberately.** Partial indexes
      (`(id) WHERE col IS NOT NULL`) would make the ordered query instant, but that is ~45 of
      them on a 205k-row table, maintained on every route write, serving **only this guard**:
      `lib/db.js` issues **zero** `not.is.null` queries, so the app gains nothing. Dropping
      the ordering is the other obvious fix and is worse — it is the exact non-determinism the
      note above this one exists to prevent. Retries are the cheap correct answer here, since
      the row genuinely exists and only cache warmth decides whether this attempt sees it.
      **Do not "fix" this with an index without first re-measuring whether the app has started
      issuing this query shape.**
    - CI timeout is 25 minutes for this reason, not because a healthy run is slow (~40–85s).
  - Injection-tested: removing the TURNAROUND section fails naming `turnaround`; neutering the
    long-beta block fails naming `beta`. The fail-closed half is injection-tested against a
    **local HTTP server standing in for PostgREST** — 500s, connection refused, `200 []`,
    `400 42703`, and fail-once-then-succeed — which needs no database and caught the
    wrong-advice path directly. Trap when doing that: `scripts/lib/supabase-env.mjs` makes the
    **dotfiles win over `process.env`**, so a `VITE_SUPABASE_URL=…` prefix is silently ignored
    if `.env.local` exists in the worktree and the injection quietly hits the real DB.
- **`check:summit-briefing`** asserts that a peak page's **ACROSS EVERY ROUTE HERE** panel states
  what its routes agree on and refuses where they do not. Renders the real `SummitBriefing`
  (`lib/DbAreaBrowser.jsx`) over real catalog rows, so it reads the DB and is **not** a build gate;
  it runs on every PR and every push to main via `render-guards.yml`, on the **anon key** — `routes`
  is publicly readable and CI has no business holding a key that bypasses RLS, the same stance
  `check:field-renders` takes one job over.
  - **IT SHIPPED AS A `scripts/oneoff/` PROBE IN #943 AND WAS RED ON MAIN WHEN SOMEBODY FINALLY RAN
    IT.** Two of its twenty assertions failed and both were real: **Mount Baker's peak page had
    stopped naming its land manager and its parking pass**. Nothing about the app looked wrong,
    because the panel's refusal — *"Differs by route — check the one you are climbing."* — is a
    legitimate state that renders perfectly. *A verification nobody runs is not a verification*, on
    a surface whose entire contract is when to speak and when not to. The promotion is the fix for
    that; the rule change below is the fix for what it found.
  - **AGREEMENT WAS A PREFIX TEST, AND A PREFIX IS ORDER-SENSITIVE.** `sharedFact` asked whether
    every stated value was a prefix of the longest once spelling was normalised — so one agency
    written **agency-first** and **place-first** read as a disagreement. Baker's nine routes carry
    `"U.S. Forest Service"`, `"USDA Forest Service — Mount Baker-Snoqualmie National Forest, Mt.
    Baker NRA"` and two leading `"Mt. Baker-Snoqualmie National Forest — Mt. Baker Wilderness
    (USFS)"`: one agency, four levels of detail, and the page answered *"Differs by route"* to
    both questions.
  - **The rule is CONTAINMENT now — every version must say nothing the fullest one does not — and
    the A/B is why it is safe.** Measured over the whole WA catalog
    (`scripts/oneoff/measure-summit-briefing-refusals.mjs`, which **executes the panel's own
    `normFact`/`sharedFact` rather than a copy**, with `ANCHOR LOST` if either moves): the panel
    renders on **198 WA areas** and prefix agreed on **371 of 563** fact rows. Containment agrees on
    **422** — **51 gained, 0 LOST, and the value displayed where it already agreed does not move.**
    So no page loses a fact and no page changes one it already showed.
  - **The four documented genuine conflicts all still refuse, and that was checked rather than
    assumed**: Mount Stuart's and Argonaut's Enchantment-vs-Teanaway permits, **Mount Adams' Yakama
    Nation land** (a different manager, not a fuller description of one), and Agnes Mountain's two
    forests and two parking regimes.
  - **All 51 gains were READ, not counted.** They are one fact at different specificity — *"National
    Park Service"* against *"National Park Service — Mount Rainier National Park"*, *"Okanogan-Wenatchee
    National Forest — Alpine Lakes Wilderness"* against the same with the ranger district. Several
    are strictly better than the refusal they replace: Morning Star Peak's fullest string says in as
    many words *"…not Glacier Peak Wilderness"*, correcting its sibling, and Bulls Tooth's names both
    forests because the trailhead and the summit are in different ones.
  - **WHAT CONTAINMENT IS LOOSER ABOUT, stated rather than glossed:** a short version can be
    **contradicted** by the fullest rather than merely less specific than it — *"Northwest Forest
    Pass"* sits inside *"Not a Northwest Forest Pass … standard NPS entrance fee applies"*. The
    reader is not misled, because the fullest version is the one on screen and it is the one that
    explains itself; what is lost is the refusal. A negation deny-list was considered and
    **rejected**: it would withhold three correct facts (Little Tahoma, Morning Star, Mount Rainier
    parking) to guard a hypothetical, and this file records four times over that a deny-list is
    beaten by one more adjective.
  - **TWO SYNTHETIC PEAKS BESIDE THE THREE REAL ONES, because the live defect is now FIXED** and a
    case that can only exist while the tree is unhealthy is not a case. One pins the
    order-insensitivity; its **negative** — two different national forests must still refuse — is
    what stops the rule being widened until it agrees on anything.
  - **Assertions are scoped to their own ROW, never to the panel.** The panel says *"Northwest
    Forest Pass"* in more than one place, so a panel-wide match reads one row's copy as another's —
    the count-inside-the-panel rule `check:camping` records three times over.
  - Fails **closed**: an unreachable catalog, a fixture peak that returned too few routes, a panel
    under 400 characters (against which every *"must NOT contain"* assertion passes), and fewer than
    **26 assertions RUN**.
  - Injection-tested **6/6** (`scripts/oneoff/inject-summit-briefing-cases.mjs`), each case proving
    its edit landed **by checksum** and restoring `lib/DbAreaBrowser.jsx` byte-identically. Case 1 is
    the real historical rule, restored verbatim. **Two must stay SILENT** — a comment quoting the
    forbidden prefix shape, and the `ALIAS` table reordered — because both are correct work.
  - **A THIRD MEASURED NON-FINDING, on the one row nothing had examined.** The `Rock difficulty`
    span uses `rock_grade` deliberately — the entry above records that `grade_num` would rank a
    Roman COMMITMENT grade on the same scale as class — and what it still conflates is **class
    against YDS**: `class 3` and `5.3` are both 3, so where the span's ends tie numerically the row
    prints ONE grade, chosen by input order. Measured
    (`scripts/oneoff/measure-rock-difficulty-scale-tie.mjs`): 166 panels render the row, **53 tie
    numerically, and 3** of those are on different scales — `wa_chimney_peak` and
    `wa_klawatti_peak` print *"Class 3"* on peaks that also hold a 5.3, `wa_ottohorn` prints
    *"5.7"* on one that also holds a Class 4. **Recorded rather than fixed:** separating them means
    a LEXICAL scale test inside a display helper, against strings like *"Class 3-4 (scrambling)"*
    and *"Class 3 (Class 4 in spots)"*, and three peaks does not buy the fragility this file
    records for every regex over grade prose. If it is ever worth doing, the honest render is a
    **span** — *"Class 3 to 5.3"* — never a different single grade.
  - **THE PANEL'S RENDERED COPY IS CLEAN CATALOG-WIDE, which nothing had asked.** #1672 swept the
    ROUTE page for broken copy and found it clean; the AREA page had never been swept, and this
    panel is the part of it that DERIVES rather than displays.
    `scripts/oneoff/measure-summit-briefing-copy.mjs` renders **all 198** WA peak briefings and
    scans for `NaN` / `undefined` / `Infinity` / `[object Object]`, and for a value row holding
    prose: **0 findings.** It fails closed under 100 renders, since a short sweep reports a clean
    catalog. A measurement rather than a guard — the contract is already proven on five fixtures,
    and rendering all 198 every run buys a catalog read for a question whose answer moves only when
    the catalog does.
  - **Three more measured NON-findings from the same sitting, recorded so they are not re-derived.**
    Every live `areas.area_type` has an `ATYPE` label (0 fall through to the generic *"Area"*) and
    every live `routes.discipline` has a `DISC_LABELS` entry (0 print the raw column value). And
    the heading **ACROSS EVERY ROUTE HERE** is computed from the area's DIRECT routes while
    `route_count` on the strap above is a SUBTREE aggregate — measured, **0 of the 198** panels
    differ, so the heading is not over-claiming.
  - **THE APPROACH ROW STATED A DIFFERENT DISTANCE FROM THE ROUTE PAGE, on 126 of the 198 peak
    pages, usually by a FACTOR OF TWO.** It read `dist_km` raw; `RouteDetail` has always read
    `effDistKm`, which prefers the route's **own itinerary** — the sum of its days' miles — and
    halves it unless the trip is recorded as a loop or point-to-point. On those rows `dist_km`
    holds the ROUND TRIP while the itinerary agrees with half of it, so this panel labelled the
    whole trip *"Approach"* while the route page for the same climb said half of it. The #1203
    shape — one fact, two screens — arrived on a browse surface.
    - Measured by `scripts/oneoff/measure-approach-distance-two-screens.mjs`: of the **543** WA
      routes carrying both a `dist_km` and itinerary day-miles, **336 differ by more than 15%**.
    - **THE FIX IS CONSISTENCY, NEVER A VERDICT ON `dist_km`.** That column holds two conventions
      at once and this file forbids normalising it in bulk; nothing here touches it. What changed
      is which SOURCE a reader prefers, and only where the route states an itinerary of its own —
      with none, the stored column is returned untouched.
    - The three helpers moved to **`lib/outing.js`** unchanged, for the reason `lib/rack.js` and
      `lib/rappels.js` record: core cannot import `RouteDetail` and `lib/DbAreaBrowser.jsx` imports
      only `lib/`. It reads **both spellings** of the column, because the route page's object has
      been through `dbRouteToCamel` while the area browser holds RAW PostgREST rows — the
      `land_manager`/`landManager` mistake, one module over.
    - **Behaviour-neutral for the route page, proven rather than asserted.**
      `scripts/oneoff/verify-outing-distance-equivalence.mjs` runs a VERBATIM copy of the pre-move
      expression against the SHIPPED function over every WA route: **8,365 compared, 790 resolving,
      0 differ**, plus seven synthetic cases pinning that the snake-case fallback only ADDS (the
      camel spelling still wins where both are present).
    - **Pinned by the guard, because reverting it changes NO identifier** — `audit:silent-reverts`
      says in its own closing caveat it cannot see that. Mount Adams is the fixture, its two
      readings being furthest apart (3.5–23.2 mi raw against 5.0–11.6 mi effective), and the
      assertion first checks that they DIFFER so it cannot pass vacuously.
  - **A measured NON-finding, so it is not re-derived.** The `High point` row is the one row with no
    denominator caveat and no majority gate, unlike its four siblings. Measured: it prints on **15**
    WA peak pages, **1** of them backed by a minority of the peak's routes, and **none** below the
    peak's own stated elevation. A caveat there would be bookkeeping for a class of one. Two of the
    15 state a high point ABOVE their peak, and **both are correct, checked rather than assumed**:
    `wa_mount_torment` at 8,815 ft is Forbidden Peak's height on the **Torment-Forbidden Traverse**,
    and `wa_the_tooth` at 6,238 ft is Chair Peak's on the **Tooth-Chair Traverse** — the peak's other
    six routes all state 5,604-5,606. A traverse's high point is legitimately its far summit, which
    is exactly what the row's own caption claims, so neither is a data question. *Read the route
    that carries an outlier before filing it as one.*
- **`check:token-boxes`** asks whether any element **shaped like a token holds a paragraph**. It is
  the enforcement for the rule CLAUDE.md has stated in prose since `season` — *before writing a
  researched string into an existing column, look at where that column renders* — which had been
  broken **three** times by the time it was written, the third by a pass that had **read the rule**.
  `season` took 232-char explanations into the header strap; `grade` took qualifiers into the pill;
  `bivy[].capacity/.water/.permit` took up to **1,386 characters** into chips. Renders the real
  `RouteDetail` over real rows and reads the markup, so it needs the DB — **not** a build gate; it
  runs on every PR via `render-guards.yml`.
  - **`check:field-renders` is the near miss, and the distinction is the whole point.** That guard
    asks whether a column reaches a screen. All three of these did — correctly, in full, in the
    wrong shape. **Reaching a screen and fitting the element it reaches are different questions.**
  - **It found a FOURTH on its first real run**: `approach_variants[].season` in the APPROACHES
    panel, a pill carrying **both** `white-space:nowrap` **and** `flex-shrink:0`, so the text could
    neither wrap nor shrink. **534 of 801 variants (67%), across 470 routes**, up to 392 characters
    — worse than the camping chips, which at least wrapped into a blob. Fixed with the app's own
    `seasonShort()`, the same defence the header strap already uses, with the full sentence rendered
    as prose in the card so nothing is lost (`probe-approach-season-onscreen.mjs` proves that half —
    shortening a display field is a LOSS unless the text still lands somewhere).
  - **TWO EARLIER DESIGNS WERE VACUOUS, and that is the most useful thing here.** Matching a
    rendered `x.prop` to a column **by name** scored **0 of 7** on a real run: `q.status` is a guide
    inquiry's, `v.season` a trip report's, `t.label` a route-tag chip's. Restricting to expressions
    **rooted at `route.<col>`** then reported **ok against the very commit containing the camping
    defect**, because the panel maps over `campSites(route)` — a helper's return value. Resolving
    that needs interprocedural analysis. So it resolves **nothing**: it renders, and asks the markup
    a question that needs no name and no scope.
  - **A regex cannot read nested HTML, and it passed one injection anyway.** The first scanner was
    `/<(\w+)[^>]*style="([^"]*)"[^>]*>([\s\S]*?)<\/\1>/g`, which consumes an element's children
    when it matches the parent — it inspected **1,019** boxes where a real tag stack inspects
    **4,491**, and it found the approach-season pill only by ACCIDENT (the outer flex div's match
    terminated on its first child's `</div>`, leaving the pill exposed as the next match).
    **Injection case 2 came back MISS and that is what exposed it.** A guard that catches one real
    defect can still be blind to the next, and only an injection it FAILS will tell you.
  - **Two exclusions, both measured, both about not reporting correct work.** A box that clips with
    `overflow:hidden` + `text-overflow:ellipsis` degrades correctly (that alone took an early scan
    from 104 candidates to 54, nearly all deliberately-ellipsised route names). And a box carrying
    `word-break`/`overflow-wrap` has been **thought about** — the STAGES table is the measured case,
    where a stage's `grade` really is terrain prose and the JSX already carries wrapping put there
    by someone who found this exact problem. Reporting it would tell an author to undo a correct fix.
  - Fails **closed** three ways: a failed catalog read is reported as a failed read and never as
    "no prose in a chip", zero renders is a broken probe, and zero token-shaped boxes means the
    shape test matches nothing.
  - **It walks a SEVENTH screen, and the route page is not the only place route columns land.**
    `ListsManager` — the tick-list rows on the Logbook tab — renders route columns into pills and
    lives in core, so mounting `RouteDetail` cannot reach it. That is how the **last raw
    `r.grade`** in the app survived every guard: every sibling row goes through `shortGrade()`,
    that one read the column directly, and grades run to **77 characters** in the live catalog
    (`"Grade III, 5.10a (5 pitches, 900 ft: P1 5.9+, P2 5.9, P3 5.6, P4 5.7, P5 5.7)"`).
    - **Adding the screen was measured first, not assumed.** Of **90** distinct token-shaped
      expressions outside `RouteDetail`, exactly **one** was a route column; everything else is a
      name or a count, which cannot be long. So this is the only screen worth the mount.
    - **The fixture's list id MUST be `ul_obj`.** `ListsManager` splits `userLists` into the
      objectives list (that exact id, rendered expanded) and custom lists, which stay collapsed
      behind a `useState` SSR cannot click. With any other id the fixture rendered the panel
      chrome and **no route row at all** — the seventh screen was coverage in name only, and the
      guard reported a screen it had never inspected. Caught only because injection case 5
      **missed**; the box count had gone up, which looked like coverage.
  - **A SENTINEL route is rendered alongside the real ones**, because a sample can only find a box
    holding a paragraph *today*. Long grades exist on ~36 rows catalog-wide, so a 40-row sample
    never meets one and the tick-list pill was invisible to the sampled pass. The sentinel asks
    the stronger question — *can this box receive one?* Same reasoning as `check:field-renders`'
    `SENTINELS`: a column nothing has written yet is unguarded by construction.
  - **`shortGrade()` had NO length bound, and the sentinel is what exposed it.** It cuts at the
    qualifier delimiters in `CUTS` and then stops, so a grade containing none of them rendered in
    full inside a nowrap pill — while its sibling `seasonShort()` has always capped. Now capped at
    **48**, a number chosen to clear both bounds: the longest real `shortGrade` output is **34**
    (`"Class 2 snow climb / non-technical"` — a real compound grade that must NOT be truncated),
    and a cap at 60 would emit 60 + an ellipsis = **61** and trip the very guard it exists to
    satisfy. Proven behaviour-neutral before shipping across **236** distinct grades with the long
    shapes over-sampled (`verify-grade-cap-equivalence.mjs`): **2 differ, both synthetic**, and in
    both the remainder moves into `gradeDetail` rather than being lost.
  - Injection-tested **6/6** (`scripts/oneoff/inject-token-box-cases.mjs`), and **case 0 is the one
    that matters**: it runs the guard against `RouteDetail.jsx` exactly as it stood at `6f82fc0`,
    the commit before the camping collapse. Both earlier designs passed that tree. **Case 5 pins
    the seventh screen** — it reverts the tick-list row to raw `r.grade`, and it MISSED twice
    before the fixture was right. Two cases must stay **quiet**, pinning the exclusions above.
- **`check:provenance`** asserts that every route-page section that carries a provenance chip
  still renders one, and that a section with **no data carries none**. The chip says how a
  section was **sourced** — `Climber-verified` / `On file` / `Auto-generated` — and deliberately
  not how *true* it is, because nothing in `routes` can support that claim:
  `data_quality.confidence` is **94.0% "MEDIUM"** across 8,367 WA routes (58 LOW, 57 HIGH), and
  89% of the `gaps` arrays are one boilerplate sentence repeated 8,021 times. A chip fed by
  either says one word everywhere. Static apart from a `renderToStaticMarkup` pass, so it sits
  in `npm run build`. See `lib/provenance.js`.
  - **Adding the prop is not enough, and that is the whole reason this renders rather than
    greps.** Five of the first ten wired headings showed no chip, each for its own reason:
    `rappels` was wired to the wrong one of **two** surfaces that both render the text
    "RAPPELS" (grep cannot separate them; only one is the heading users see); `gpx` and
    `waypoints` are **alpine-gated** and invisible to a `trad` fixture — the `cragOnly` trap
    `check:field-renders` already records; `pitch_detail` split **per entry** across
    PITCH-BY-PITCH and ROUTE BETA, so wiring one left the other bare (they are one
    ROUTE BREAKDOWN now, and both fixtures stay because either kind alone must still draw it);
    and the
    "CLIMATE & SEASON" box is gated on `route.climate`, **not** `route.season`, so a
    season-keyed chip there rendered nothing at all.
  - A failing row distinguishes **"its heading never rendered — fixture too thin"** from a chip
    bug, because those need opposite fixes. Match a heading, never the chip label alone.
  - **`gear` is deliberately NOT wired.** #806's RACK caption owns that section, reads the real
    per-section column (`gear_confidence`) and stays **silent on the verified majority** —
    praise on every route is what got two page-level graders (`ProvenancePanel`'s DATA
    CONFIDENCE, `EnrichmentPanels`' DATA QUALITY) deleted. `sectionProvenance("gear")` is still
    unit-tested; **do not add a second label to RACK**.
  - **A per-section signal must beat the route-level flag**, and `sectionProvenance` checks
    `auto_generated` **last** for that reason: 138 WA routes are `auto_generated=true` AND
    `gear_confidence=verified` — the audit went back and confirmed a generated rack. #810 added
    the three assertions that exercise the ordering, because every other case in the file sets
    one signal or the other and would still pass if the two blocks were swapped.
  - **"`auto_generated` is 5.4% true" is catalog-wide and understates it badly.** Among routes
    that actually carry these fields — the only ones that render these sections — it is true on
    **39–66%** (66% of the 584 with a gpx track). So the chip discriminates: 64.4% "On file"
    across 13,790 chips, not one word everywhere. `scripts/oneoff/measure-provenance-spread.mjs`
    is the measurement. Judge a signal on the subset that reaches a screen, never on the table.
  - **Counting chips: count the `title` attribute, not the label text.** `ProvChip` renders its
    label in both `title="How this section was sourced: …"` and the text node, so counting
    `"On file"` returns exactly **double**. That artifact read as duplicate labelling on a tab
    and was very nearly reported as a defect.
  - One assertion is **marked WEAK in the script on purpose**: "a bare route renders no chip"
    passes even when `sectionProvenance` is broken to rate absent data, because a bare route's
    sections are content-gated and never render, so no heading exists to hang a chip on. The
    honesty rule is pinned by the unit assertions, not by that one.
  - Injection-tested three times, all caught: neutering `ProvChip` fails **every** reachability
    row (10 today, real exit code 1); disabling the chip inside `SL` fails its rows; rating
    absent data fails the four emptiness assertions.
- **`check:access-checked-line`** asserts the road/access **CHECKED DATE** reaches a screen, and that
  a route without one says **nothing**. Static (one esbuild bundle, two SSR renders), so it sits in
  `npm run build`.
  - **`routes` had 94 columns and not one was a date, which is the ROOT of the expiring-closures
    class rather than a detail of it.** `audit:expiring-closures`' standing instruction is *"date it
    or drop the claim"* and there was nowhere to put the date, so the app could not show a reader how
    old a road claim was and nothing could rank ~118 flagged values by staleness.
    `probe-can-a-road-claim-be-dated.mjs` is the measurement, and note the asymmetry it found: a
    `contributions` row CAN be dated (`created_at`, since `0002`), so a **climber's** correction is
    datable while the enrichment pass that wrote the original is not. That runs the wrong way round.
  - **`0172` adds `access_checked_at`, and what it MEANS is the load-bearing part.** It records that
    somebody read this route's road/access claims **against a primary source** on that date — *not*
    when the row was last written. So it is deliberately **not** defaulted, **not** trigger-set, and
    **not** stamped by `patchRow()`: a mechanical stamp on every write would date a typo fix as a
    verification, and the column would become a write timestamp wearing a freshness label.
  - **NULL is the honest backfill and it is the whole point.** We do not know when the existing prose
    was written, so `now()` would assert that 205,492 stale claims were checked today — fabricating
    the verifications the column exists to expose. 39 routes are stamped, each against a named alert
    read on 2026-08-27; **Harts Pass is deliberately excluded** because its research came back
    UNSETTLEABLE, and *a failed check is not a check*.
  - **`check:field-renders` structurally cannot answer this**, which is why a separate guard exists:
    that one pulls a REAL value and looks for it on screen, and this column's value is an ISO
    timestamp rendering as `27 Aug 2026`. It is a **used-not-echoed** column, the same category as
    `grade_system`, and would be reported as `NEVER RENDERS` on a working feature.
  - **The date is hand-formatted, never `toLocaleDateString`, and that is ASSERTED.** A locale date
    emits a different string per machine, so any assertion about the line would pass on the author's
    box and fail in CI — and `DLOCALE` is a global a signed-in user can change.
  - **Silence on an undated route is a DECISION, not a gap.** Saying *"age not recorded"* is more
    informative and would change what ~1,000 WA road blocks say at once, which is a product call;
    showing a date where one exists is additive. The guard pins the silence so it cannot drift into
    a catalog-wide banner by accident.
  - **It states the date and stops** — no staleness verdict, no *"worth re-checking"* past some
    threshold. That would be the app adding a judgement on top of its one fact, with an invented
    threshold; the column's value is that the reader can judge the age themselves.
  - **"Checked", never "verified"**, and asserted: an alert read on a Tuesday can be superseded on
    the Wednesday. The column records the reading, not a guarantee about the world.
  - Fails **closed**: a missing export, a thin render, or a GETTING THERE panel that never appeared
    are each a broken probe — every *must NOT contain* assertion passes against a component that
    rendered nothing. Scoped to the **panel**, never the tab, the mistake the camping work made three
    times in one sitting. Injection-tested **5/5**
    (`scripts/oneoff/inject-access-checked-cases.mjs`), each case proving its edit landed **by
    checksum** and restoring the file byte-identically. **Case 4 must PASS** — a comment naming the
    render site is documentation, and a guard flagging it would forbid explaining itself.
- **`check:pitch-split`** asserts that every `pitch_detail` entry is a row of **ROUTE BREAKDOWN**,
  in the record's own order, drawn as the kind of ground it actually is. Static SSR, in the build.
  - **IT USED TO READ THE VERDICT OFF THE HEADING**, because there were two: roped pitches under
    PITCH-BY-PITCH and travel legs under ROUTE BETA, stacked on the Plan tab. **That stacking was
    itself a claim the record never made.** 144 routes hold both kinds interleaved —
    `wa_big_four_mountain_tower_route` is *"Approach gully / First tower / Notch rappel / Second and
    third towers / Summit snowfield"*, i.e. travel, climbing, descent, climbing, travel — and split
    into two boxes it reads as every walk first and then every pitch, which is not the climb. The
    array **order** is the sequence, and the only way to show a sequence is one list.
  - **What does NOT merge is the vocabulary.** A roped pitch and a walk are different kinds of
    ground: a pitch keeps its square `P1` badge, its blue accent and its full detail (length,
    bolts, anchor, per-pitch consensus, photos, beta comments); a section keeps a round badge, a
    terrain chip and its own three tiles. The **spine** down the left runs through both, in order,
    and that is what carries the integration. On a pure-pitch or pure-stage route the section is
    what it always was, renamed.
  - **So the assertion moved to the row's own `data-kind`**, and that is strictly stronger than the
    heading test it replaces: per entry rather than per page, and it can check the **ORDER**, which
    nothing did before. With one heading the classification is only visible in the markup — it is
    the badge shape, the accent and the detail block, none of which survive tag-stripping.
  - The **numeric sort is scoped to a route with no stages**, which is exactly the old behaviour for
    a pure-pitch route. A mixed route's two label spaces (`"1"` and `"Approach gully"`) cannot be
    compared at all, so sorting one is not an ordering — it is the two boxes rebuilt inside one.
  - **#1440's shortfall rule is unchanged and both its cases are kept.** Merging removes the
    MECHANISM that produced the false claim — everything described is now in one list, so
    `pitchShortfall(route, rows.length)` reduces to *"the route claims more pitches than the page
    describes"* — but a route that genuinely climbs more than it describes must still say so, and a
    rule that only ever suppresses is satisfied by deleting the feature.
  - **The cumulative "N ft up" still counts roped pitches only**, stepping over the walking between
    them. It is a climbing figure and always was; summing the approach into it would silently change
    what that number means, which is the
    [[changing-which-record-wins-leaves-the-neighbouring-field-behind]] shape.
  - **NO BROWSER GUARD SEES THIS SECTION, and the two probes beside it exist for that reason.**
    `check:overflow` and `check:a11y-badges` reach the route page with `?zr=1`, which opens
    `ROUTES[0]` — `kings_hf`, a scramble whose `pitchDetail` is null — so "0 offenders" there is a
    statement about a page these rows were never on.
    `scripts/oneoff/probe-route-breakdown-overflow.mjs` lays them out in Chrome at 390×844 over the
    measured worst case (the 51-character terrain prose, a compound grade, a long descriptive
    title) and is **proven non-vacuous**: restoring `nowrap` on the right-hand group reproduces the
    historical **394px** overflow and it catches it.
    `probe-route-breakdown-onscreen.mjs` prints the three shapes as read.
  - **THE ROWS ARE DISCLOSURES, so the state is `aria-expanded` and the NAME does not repeat it.**
    The stage row's old ▸ carried the attribute and lost it when the whole row became the control
    — a regression rather than a gap — while the pitch row had spelled `", collapsed"` into its own
    `aria-label` instead, which announces the state to a screen reader and to nothing else: no
    automation, and no user agent that offers *expand* as an action. This file already states the
    convention on `TagChip` (*"`aria-expanded` rather than `aria-pressed`: this is a disclosure,
    not a toggle that changes anything"*); it simply had not been applied here. With both, a reader
    hears "collapsed" twice, so the attribute carries it and the name says only what the row IS.
    `check:selected-state` accepts `aria-expanded` and cannot see these rows anyway — `?zr=1` opens
    `kings_hf`, whose `pitchDetail` is null. `probe-breakdown-rows-announce-expanded.mjs` is the
    measurement, proven non-vacuous in **both** directions: dropping the attribute and re-adding
    the words each fail it.
  - **IT TOOK `check:ui`'s PITCH-EXPAND STEP WITH IT, AND THAT STEP WAS RIGHT TO GO RED.** That
    walk found the pitch row by the text **`"▸ more"`** — a string only the old pitch row
    rendered, so once both kinds of row got the same bare `▸` the needle matched nothing and the
    step reported *"the pitch-expand render path went unchecked"*. It was not a stale assertion
    about cosmetics: expanding a pitch is the render path that blanked in #359, and it carries the
    photos, the comments and PitchConsensus. It clicks the row by `data-kind="pitch"` now — what
    the step has always MEANT — and a travel section is deliberately not accepted, since expanding
    one exercises a much smaller path. Verified non-vacuous by the capture growing: Plan 21,576
    chars against pitch-expanded 21,820. **A guard keyed on a string that one component happens to
    render is keyed on that component**, and it will go quiet rather than wrong the day the
    component changes — this one failed loudly only because it counts a miss as a failure.
  - Injection-tested **6/6** (`scripts/oneoff/inject-route-breakdown-cases.mjs`). Cases 1-3 are the
    original three re-run against the merged section — *a guard that still catches everything it
    used to* is half the claim. **Case 4 is the property the merge added**: reorder the rows into
    stages-then-pitches (the old two boxes, merged) and only the ORDER assertion can see it. **Case
    5's first version reported MISS while the guard was innocent** — it called `pitchShortfall` with
    a different `shown`, and the `> described` half of that predicate is *inside* the function, so
    the edit landed by checksum and reproduced no defect. *Checksum movement proves an edit
    happened, not that it was the right one.*
- **`check:trailhead-directions`** asserts a screen offers **exactly one way to drive to the
  trailhead**, that the **coordinates** are beside it, and that a **label describes the value under
  it**. Static (one esbuild bundle, five SSR renders), so it sits in `npm run build`.
  - **IT IS THE GATE #1437 DID NOT GET.** That change moved `TrailheadCard` up under GETTING THERE
    and dropped the standalone *"Directions to trailhead"* button standing there — both resolved
    the same `trailheadPoint()`, so the page offered one destination twice and printed the road
    name and status twice with it. Its check is
    `scripts/oneoff/probe-trailhead-sits-with-getting-there.mjs`, and **nothing runs
    `scripts/oneoff/`** — the *"a verification nobody runs is not a verification"* shape, on a
    surface this file records as user-visible since the trailhead sweep.
  - **NOTHING ELSE CAN SEE THE CLASS.** `check:dead-props` asks whether a prop is read — both
    controls were read and both worked. `check:field-renders` asks whether a column reaches a
    screen — these reached it **twice**, which is more than enough for that guard.
    `check:waypoint-placement` asks whether a coordinate is DRAWABLE, not whether it is drawn once.
    **A duplicate is invisible to every guard that asks *does this reach a screen*; the question
    has to be *how many times*.**
  - **COUNTING A CONTROL IS THE WHOLE PROBLEM, AND BOTH OBVIOUS METHODS ARE BLIND IN OPPOSITE
    DIRECTIONS — measured, not reasoned about.** By **label** over the page text is a deny-list
    over English, and this catalog writes prose into the very fields that render here: an
    `approach_logistics.trailheadDirection` reading *"Drive here and park at the gate"* makes a
    correct page report two controls. By **destination URL** over the markup looks rigorous and is
    worse: the Plan tab's control is an `<a href>`, but the crag Overview's is
    `<button onClick={window.open(…)}>`, and **React does not serialize a handler** — so the URL is
    not in the markup at all. A first version counted hrefs and reported **zero** controls on a
    screen that plainly has one. It counts **anchor-or-button elements whose own text is a drive
    label**: prose lives in a `<div>` and is not counted, a handler-only button is. Injection cases
    6 and 7 are those two false positives and both must stay **SILENT**.
  - **IT FOUND A MISLABELLED ROW ON 249 ROUTES.** The crag Overview printed
    `road.driveNote || road.name` under the heading **"Trailhead"**, so *"Roughly 25-30 minutes
    (about 20 miles) from Dayton, WA via S 4th Street"* read as the name of the trailhead — a
    description of the **drive**, under the name of the place you drive to, and the same string the
    Plan tab labels correctly as *"Drive notes"*. **One label cannot be right for both values**, so
    it is chosen per value (`"The drive"` / `"Road"`) rather than picked once and made to cover the
    other. `scripts/oneoff/measure-crag-drive-note-label.mjs` is the count.
    - **That class is now closed BY CONSTRUCTION, which is stronger than the assertion it
      replaces.** `road` is one of the fields `hasPlanContent()` reads, so a route carrying a drive
      note always has a Plan tab, and the Overview panel it used to be mislabelled in no longer
      renders that route's road at all. Section 4 therefore asserts the label on the tab that DOES
      print it, plus the negative that the surviving crag Overview panel carries no drive note under
      any label. **Injection case 4 had to be repointed for the same reason and MISSED first** —
      aimed at the Overview it found nothing to mislabel, which reads as a guard that stopped
      working and is really a defect that stopped being reachable. Asserting the old shape against
      today's crag Overview would pass **vacuously**.
  - **"With GETTING THERE" is asserted as ORDER, not as a character window** — the control renders
    inside `TrailheadCard`, so slicing N characters after the heading would encode a guess about
    the panel's size, the trap the camping panel and the Logbook badge both record. It must fall
    between the GETTING THERE and APPROACH headings.
  - **The seasonal gate is asserted because it nearly went with the duplicate.** It had two render
    sites; the surviving one showed it only as a **suffix on the road STATUS row**, so a route with
    a gate and no status would have lost it silently — the
    [[changing-which-record-wins-leaves-the-neighbouring-field-behind]] shape.
  - **THAT KNOWN GAP IS CLOSED, and reading it as a worklist rather than a caveat is what closed
    it.** The entry here used to say a crag route shows GETTING THERE **twice** — once on Overview,
    once on Plan, with a different drive control on each — and defer it as *"a product decision
    rather than polish"*. #1493 is that decision: the gate is `cragOnly && !showPlan`, so exactly
    one tab owns the panel. Measured on the pre-fix tree, the same crag rendered GETTING THERE and
    a drive control on **both** tabs; after it, a crag **with** plan content shows it on Plan only
    and a crag **without** one still shows it on Overview — moved, not deleted, and both directions
    are asserted. This is the [[a-stated-limitation-is-a-worklist-not-a-caveat]] shape for the
    fourth time in this file.
  - **The two PRs looked like a collision and were not.** #1493 forked before this guard existed,
    so its merge was the first time they met, and the guard went red on `ANCHOR LOST` — its crag
    Overview fixture asserted the very duplication its own entry called a defect. What changed is
    the fixture and the section, never the invariant: section 1 now walks the Plan tab and the crag
    Plan tab, section **1b** asserts the no-duplication rule directly, and the crag Overview fixture
    is a route with **no plan content**, the only state in which that panel is the owner.
  - **A crag Overview can never carry a drive control, by construction rather than by fixture.** A
    control needs `trailheadPoint()` to resolve, which needs a placed Trailhead waypoint or
    `approach_logistics.trailheadLat/Lng` — and **both are fields `hasPlanContent()` reads**, so the
    Plan tab exists and owns the panel. Section 1 says so where it drops that row, rather than
    leaving a reader to wonder whether coverage was lost.
  - Fails **closed** five ways: a thin render, either GETTING THERE panel missing, a missing
    APPROACH heading, a `TrailheadCard` that did not render, or a control detector that matches
    nothing anywhere — every "exactly one" assertion here is satisfied by a page that rendered
    nothing at all.
  - **SECTION 7 — THE TRAILHEAD CARD CARRIES NO STAT TILES (2026-09-25, user request).** The card
    used to print Elevation, `"Approach (one way)"` and a straight-line `"To the peak"` bearing
    above its directions. The user asked for them gone: elevation and approach are already in
    TECH STATS on the same page, and the card now answers only WHERE the trailhead is and HOW to
    drive there (name, directions, one compact *Drive here* + copyable-coordinates row). The
    fixture carries every input those tiles read — a placed Trailhead pin with an elevation, a
    `distKm`, and `approachLogistics.peakLat/peakLng` — so a returning tile would render.
    **NON-VACUITY:** the card must be found and must carry its coordinates first.
    - **HISTORY, so it is not re-derived:** this section used to pin the Approach tile's SOURCE —
      it was labelled "one way" and read raw `route.distKm`, which on hundreds of WA routes holds
      the ROUND TRIP, so one page printed two different one-way approaches for one climb. Fixed by
      reading `effDistKm` (with two fixtures, because an unconditional halving is wrong for a
      recorded `point`). Removing the tile retired that assertion; TECH STATS and the planner
      (section 8) still read `effDistKm`, and section 8 still pins the planner's reading
      behaviourally in both directions. Measurement scripts from that work:
      `scripts/oneoff/measure-planner-distance-vs-the-tile.mjs`,
      `scripts/oneoff/probe-trailhead-approach-is-one-way.mjs` (the latter now anchors on a tile
      that no longer exists — it is spent).
  - **SECTION 8 — THE PLANNER WAS THE LAST READER ON THIS PAGE STILL ON THE RAW COLUMN.** TECH STATS
    states the one-way approach; the planner is a second reader of the same fact on the same page, so
    `scarfHrs(route.distKm, …)` meant Est. summit, Est. return and the After-dark warning were
    computed from a distance the page did not show. Four readers already used `effDistKm` — TECH
    STATS, the header strap, the (since removed) TrailheadCard tile and the area browser's span — and this was the
    holdout, so the page stated the approach distance two ways.
    - **THE CURRENT ARITHMETIC DOUBLE-COUNTED THE WALK OUT on the rows that move most.**
      `wa_blizzard_peak_standard` is a 64-mile round trip whose `dist_km` holds the whole 63, so
      the walk was charged once to reach the summit and **0.75 of it again** to get out — **110
      miles of walking for a 64-mile trip, 72% over**. With `effDistKm` it charges 1.75 × 32 = 56
      against that 64, and the shortfall is the deliberate downhill-is-faster factor rather than an
      error. **72% over versus 12% under.**
    - **BEHAVIOURAL, NOT A SPELLING, and that is what makes it an anti-revert gate.** Reverting the
      call moves **no identifier** — `effDistKm` stays imported and four other readers keep calling
      it — so `audit:silent-reverts` is blind to it by its own closing caveat, and a source match
      would pin one way of writing the call and forbid a correct refactor. Each fixture is instead
      rendered against a **CONTROL identical but for the itinerary**: read raw, the two are
      byte-identical inputs and the estimate cannot move at all. The itinerary reaches that
      estimate through `effDistKm` and nothing else (`gainCoversWholeOuting` reads gain/loss,
      `publishedIsWholeDay` reads timing, `sectionsCoveredByItinerary` touches only the
      published-times block), which is what makes the movement attributable.
    - **BOTH DIRECTIONS, because a rule that only ever demands a SHORTER estimate is satisfied by
      an unconditional halving** — section 7's own lesson, and why a recorded point-to-point
      fixture exists here too: an out-and-back halves its itinerary total and gets shorter, a
      `point` does not retrace, so its total IS the one-way distance and it gets LONGER.
    - **THE INJECTION FOUND A WEAKNESS IN THE GUARD RATHER THAN IN THE APP, which is what a suite
      is for.** Section 8's point-to-point control was section 7's **30 km**, and against that a
      shape-blind halving (99.8 → 49.9 km) still reads LONGER — so case 13 **passed silently**
      against exactly the over-reach it exists to reject, while section 7 correctly failed. The
      control is **70 km** now, between the halved and the full figure, and only then does the case
      fire. Section 8 keeps its own fixtures rather than widening section 7's, so an edit to one
      section's data cannot silently weaken the other's assertion.
    - **CASE 13 IS ALSO WHY THE SUITE NOW JUDGES ON THE GUARD'S OWN FAIL LINES.** It trips section
      7 AND section 8, so a harness reading only the exit code would credit section 8 with its
      neighbour's catch — *an injection that produces a different failure is not a catch*. Each
      case may name the text its own failure must carry, matched against **FAIL lines only** (never
      the word, since these assertion labels are prose and several contain it), and the harness
      **refuses any expectation that already appears in the clean run**. It also snapshots every
      file a case may touch — case 13 edits `lib/outing.js` — and reports **TREE NOT RESTORED**
      rather than exiting 0 on a tree it has damaged.
    - **WHAT IT DOES NOT CLAIM**: that `effDistKm` is the better number on every row. Among the 118
      that get LONGER are routes where `dist_km` may correctly hold the one-way while the itinerary
      covers more than the approach, and there it overstates — conservatively, and agreeing with
      TECH STATS, which is the property being bought.
  - Injection-tested (`scripts/oneoff/inject-trailhead-directions-cases.mjs`), each case
    proving its edit landed **by checksum** and restoring every file it touches byte-identically. Cases 1-3 put
    the duplication back one piece at a time so the guard cannot pass on the strength of its
    neighbours; **case 4b reverts #1493's gate** and must fail on section 1b, so the closed gap
    cannot quietly re-open. Case 8 is section 7 — the stat tiles put back on the card (cases 9-10,
    which pinned the removed tile's source, were retired with it). **Cases 11-13 are section 8** — the planner reverted to the raw
    column, a **SILENT** hoist to a local (section 8 is behavioural, so it cannot be defeated by
    how the call is spelled), and the shape-blind halving, which is the one that edits
    `lib/outing.js` rather than the app file.
- **`check:trailhead-direction-shape`** asserts that `approach_logistics.trailheadDirection` says
  how to **reach** the trailhead and stops there. The TRAILHEAD card prints it under the trailhead's
  name beside *Drive here*, and the contribute form labels it *"Driving directions"*. Static in the
  build; `--live` scans the catalog daily (`trailhead-direction-shape.yml`, anon key).
  - **IT IS THE FOURTH COLUMN TO TAKE PROSE IN THE WRONG SHAPE**, after `season`, `grade` and
    `bivy[]` (CLAUDE.md, *Enrichment prose must not be written into a display field*). On 2026-09-24
    **230 routes** carried the walk here: *"From Slate Pass (~6,900 ft) at the end of Harts Pass Road:
    backpack ~13 miles via the Whistler Cutoff toward the Pasayten base camps"*, seven Rainier routes
    reading *"From Paradise: Skyline Trail to Camp Muir…"*, **ten bare compass words** (*"North"*,
    *"West then North"*) and **two strings cut off mid-sentence** (*"From Glacier, drive Mt."*). The
    column was populated, so `check:field-renders` and every coverage audit read it as done.
    `check:trailhead-directions` asks how many drive CONTROLS a screen has, not what the prose says.
  - **THE ORIGIN IS THE HAND-WRITTEN SQL, and `check:sql` now refuses it.** 31 of the 48 values
    the committed `.sql` files write fail the test, most of them from `alpine_trailhead_enrichment.sql`
    (*"North-northeast via glacier traversals"*). `scripts/lib/trailhead-direction-sql.mjs` reads
    the three shapes those files use (a `jsonb_set` JSON string, `to_jsonb('…')`, a whole JSON object)
    and `check:sql` exits before any DB read if one fails. The `wa-enrich-batch` workflow does NOT
    write this key, which is why the fix is there and not in the workflow prompt.
  - **THE RULE: the value ENDS AT THE TRAILHEAD.** It may name the trail you start on (*"via
    Trail #677"*). It may not say where that trail goes, how far or how long on foot, what you cross,
    or what terrain you reach, and it must name somewhere you can drive to. A first cut drew the line
    by feel and was **inconsistent**: it kept *"via Trail #677 to the Coleman Glacier moraine"* while
    flagging *"via Killen Creek Trail #113 to the PCT and High Camp"*, the same shape. Writing a
    detector exposed that, and ~20 values joined the repair so one rule decides all of them.
  - **A DENY-LIST OVER ENGLISH, SO IT IS HELD TO A CORPUS, BOTH DIRECTIONS.**
    `scripts/trailhead-directions-reviewed.json` is every distinct live value on 2026-09-24 (377),
    each read by hand, plus the 79 new values the repair wrote: **302 drive, 154 not**. Section 1
    fails on any disagreement. A false alarm matters as much as a miss, because
    `TrailheadCard` **hides** a refused value (reader-side defence, the `seasonShort()` precedent),
    so a detector that widened silently would delete good directions from the page. The drafts
    measured the hazard: keyword rules first ran **35 missed / 36 false**, then **11 / 63**. Words
    like *summit* (*"Stevens Pass summit"*), *glacier* (the town of **Glacier, WA**; *Glacier Creek
    Road*), *cross* (*"cross the Sauk River bridge"*) and *walk* (*"walk or bike ~8 miles to the
    Whiskey Bend Trailhead"*, which is the way TO the start) are all legitimate drive vocabulary. What
    fixed it was structure rather than more words: **a value that names nowhere you can drive to**
    (no trailhead, lot, pullout, road, gate) cannot be driving directions, and an on-foot mileage that
    ends *at a trailhead* is access, not the walk.
  - **THE CORPUS FOUND DEFECTS THE HAND REVIEW MISSED**, which is the argument for having one: two
    values the reviewer had passed turned out to be truncated (*"…has, in recent years, added a bike
    or"*) or trail description (*"which climbs steadily through forest"*). The review also mislabelled
    four values by writing LINE numbers where it meant INDEX numbers in the second half of the file.
    **Key a hand review by the TEXT, not by a position in a listing.**
  - **WHAT IT CANNOT SEE.** Agreement with 456 values is not proof on new prose; a phrasing none of
    them used can slip through, which is why the live scan runs daily. It does not judge whether the
    directions are TRUE, only whether they are the right KIND. A climber's contributed value that
    fails is hidden by the card with no message to the contributor. That's accepted: the form's
    placeholder already shows the drive shape, and a contributed hike narrative belongs in `approach`.
  - **WHEN IT FIRES:** repair the ROW (cut it back to the drive part, or clear the key; the walk is in
    `approach`). If the DETECTOR is wrong, add the value to the corpus with its verdict **first**,
    then change the rule until both agree. Never widen the rule without a corpus row that proves why.
  - The repair is `scripts/oneoff/apply-trailhead-direction-repair.mjs` over
    `research-data/trailhead-direction-repair-2026-09-24.json` (`old` is the rollback; `--rollback`
    restores it). It refused any row changed since review, and refused to clear a row whose own
    `approach` was under 50 characters. **230 written, 230 re-read holding the target, 0 skipped.**
    Injection-tested **3/3** (`scripts/oneoff/inject-trailhead-direction-shape-cases.mjs`): a walk
    labelled drive FAILS, good directions labelled walk FAIL, a correct row PASSES; each edit proven
    landed by checksum, corpus restored byte-identically.
- **`check:crew-gear`** asserts that a crew's "what to bring" reaches a **real** route, and that
  nothing invents a priority the data does not carry. `CrewCard` gated its gear section on
  `route.gearTiers` — carried by **14 hand-seeded routes** and by a climber's own contribution,
  never mapped by `dbRouteToCamel`, never written by any enrichment JSON. So the entire
  who's-bringing-what feature rendered on the demo and on **no real Washington route**. Static
  (it imports `lib/rack.js`, which imports nothing), so it sits in `npm run build`.
  - **Every layer reviewed as finished**, which is why this survived: the component existed, the
    props were wired, and the seed route rendered it correctly. Only the data said otherwise —
    the same shape as `descent_text` populated on 1,021 routes and rendered on none, and as
    `approve_new_route` writing six columns nothing filled.
  - **The honesty rule is the second half.** `Required`/`Recommended`/`Optional` is a real
    ranking on a seed route and on a contribution; the DB carries a rack, not a priority order.
    Painting a derived list red as REQUIRED is a safety-adjacent claim nothing in the row
    supports, so derived gear renders as **neutral groups** and the guard fails if
    `required`/`recommended`/`optional` ever appear on a derived result.
  - **The generic table is a last resort and says so.** Measured 2026-08-14 against 8,366 WA
    routes: `detailed_rack` 957, `pro_needs` 990, `what_to_bring` 1028 — so the route's *own*
    rack answers for ~12% and `DISC_RACK` answers for the rest. A stock list is labelled
    *"Typical … rack — not this route's own"*, and a route that has its own rack must never get
    one stapled underneath it; both are asserted.
  - It also pins the crew card as a **third reader of the rack correction rivalry**
    (`check:correction-readers`): a climber's agreed rack must reach the crew card, not the
    value they replaced. That is where this would silently diverge from the RACK box.
  - Comments are stripped before the structural scan, because `CrewCard` now *explains* the bug
    in prose naming `route.gearTiers` — the same trap `check:ci-cancel` records.
  - `rackFromText`/`_rackEdited`/`contribRack`/`routeRackFor`/`DISC_RACK` moved to **`lib/rack.js`**
    for this: core cannot import `RouteDetail.jsx` (lazy-loaded, and it already imports *from*
    core, so a static import both cycles and drags the route page into the main bundle). Same
    shape as `lib/rappels.js`, which is why that file was already in
    `check:correction-readers`' `FILES`; `lib/rack.js` was added to it in the same commit.
- **"Specific to this route" is gone; `mergeGearList` folds it into the one list.** The route page
  used to print the stock per-discipline kit and then a second box headed *Specific to this route*,
  so a route naming "Helmet" got two Helmet bullets under two headings — a climber packing off that
  page reads it as two things. `gearKey`/`sameGear`/`mergeGearList` in `RouteDetail.jsx` merge them:
  the key collapses the **qualifier** and not the item (`"Crampons"` == `"Crampons (early/mid-season
  or lingering-snow years)"`, `"Rope"` == `"ropes"`), the **richer wording wins in place**, and
  genuinely different gear stays apart (`"Ice axe"` vs `"Ice tools"`, `"Warm layers"` vs
  `"Weatherproof shell jacket and pants"`).
  - Measured on the live catalog, not on fixtures: across the **600** WA routes carrying
    `what_to_bring`, **633 duplicate lines removed on 409 of them**, and **0 routes lost a stock
    item**. `scripts/oneoff/probe-gear-merge-dedupes.mjs` **lifts the three functions out of
    `RouteDetail.jsx` by balancing braces** rather than copying them, with `ANCHOR LOST` if any is
    renamed — a copy would agree with the source the day it was written and measure a fossil
    afterwards, which is the whole question here.
  - The **conditional** block keeps sole ownership of its items, so an item that is only needed in
    early season does not also appear in the unconditional list.
- **"Do online research on gear" is 13 routes of RE-HOMING, not 4,938 of research — measured.**
  4,938 roped WA routes carry no rack. That number is not a worklist: **4,908 of them populate
  zero or one text column each** — catalog stubs literally named `10a Right` and `#1`, where no
  published rack exists to find and `DISC_RACK`'s honest *"Typical … rack — not this route's own"*
  is already the right answer. Turn the question round and it collapses: of the **594** roped
  routes that have been **written up**, **568 already carry a rack**. Only **30** are written up
  and rackless. *"Rackless" and "un-enriched" are very nearly the same population.*
  - Of those 30, **13 already STATE their protection inside their own `pitch_detail`** — *"3 bolts
    plus small gear for crux"*, *"small nuts/cams"*, *"protect w/ #5 Camalot"*, *"Hand crack,
    natural gear; only unbolted pitch"*. Surfacing that into `gear` is **re-homing**, the same
    operation the `climbing_route` sweep performs, and it is verifiable the same way.
    `fix-derive-rack-from-pitch-detail.mjs` writes them behind a traceability gate and refuses
    the whole run if any entry names something the row does not.
  - **The other 17 are deliberately left alone, and that is the load-bearing half.** Five Goose
    Egg routes carry an overview a previous pass wrote saying, in as many words, *"no published
    approach, pitch-by-pitch, or gear beta was found beyond this record"*. That is a **documented
    negative result**; writing a plausible rack over it is fabrication. Same for the Hozomeen,
    Molar Tooth, Mole and Pyramid lines, whose own beta says the protection is unrecorded or
    disputed. **A previous pass's recorded failure to find something is evidence, not a gap.**
  - Entries carry **only what is specific to the route**. `DISC_ASSUMED` already supplies rope,
    harness, quickdraws, helmet, shoes and a nut tool, and `mergeGearList` folds the two together
    — restating them would rebuild the duplication that work removed.
  - **The traceability checker had FOUR bugs and every one flagged CORRECT work**, which is the
    direction that teaches people to ignore a guard, committed by the guard's own author. Each is
    a different way a text comparison lies: `leaves()` returns only string **values**, so
    `pitch_detail`'s `"pitch": 1` never entered the source and every pitch number read as
    invented; keeping `.` in the token pattern (so `5.10` survives) left **sentence periods**
    attached, so the source's `belay.` and `cams.` never matched; keeping `-` made `tip-jamming`
    one token so `tip` missed; and demanding generic connectives be quoted demands a **copy**
    rather than a rewrite, which is the opposite of re-homing. The stemmer also needed the
    **trailing-`e` strip this file already records for `check:enrichment-traceable`** — without
    it `traverse` and `traverses` never meet.
  - It carries a **self-test that runs on every invocation**, because every entry passing is
    exactly what a broken checker prints. The positive cases matter as much as the negative ones:
    a checker tightened until it rejects everything is no more useful than one that accepts
    everything. Numbers stay strict — `pitch N` is stripped **before** that test, or any small
    number could launder itself through a pitch index.
  - **Verified on screen, and the render found a defect the write could not.**
    `routeRackFor()` reads `contribRack → detailedRack → proNeeds → route.rack` and **not**
    `route.gear`; the write lands only through `dbRouteToCamel`'s
    `rack: toArr(r.rack).length ? toArr(r.rack) : gearArr(r.gear)` fallback, so a populated
    `routes.rack` would have shadowed all 13 silently. Checked: all 13 rows have it empty.
- **A SPORT route could not say it needs natural gear, on any tab.** `RouteGearCheck` takes an
  early branch for `sport`, computes a quickdraw count from bolt counts and returns — so the RACK
  box never renders and the route's own rack reaches **nothing**. Right for a pure sport line,
  where the rack IS draws; a lie for the exception. `wa_technicians_of_the_sacred` is a 6-pitch
  5.12c whose own pitch 6 reads *"Hand crack, natural gear; only unbolted pitch"*, and a party
  racking off that page brings draws and arrives with nothing to place.
  - Measured at **3 of 2,714** WA sport routes (`probe-sport-routes-needing-natural-gear.mjs`),
    and the measurement is the story: the first run said **19**, and **17 of those were routes
    saying "no trad gear needed" / "Fully bolted; no natural gear required"** — the exact opposite
    of the thing being looked for. **A negation is not a claim**, the same trap
    `check:rappel-lengths` records for *"Not plowed in winter"*. The 19th was `wa_lady_slipper`, a
    fully bolted 5.5, matched on *"tie a **stopper** knot"* — a knot, not a nut. Fix the **phrase**,
    never the word list.
  - Guarded in **`check:bare`**, because bare-vs-enriched is exactly the axis it fails on — the
    quickdraw note renders identically either way, so nothing else would notice. **Both
    directions** are asserted: a route with no rack of its own must add **no** list, or the stock
    quickdraw kit gets restated directly under the note that already says it. Injection-tested
    2/2, each restored to the pre-injection checksum.
- **A packing list has no negative form, and three entries were exploiting that.** `what_to_bring`
  renders as bullets under WHAT TO BRING, so every entry reads as *carry this*. Three were not gear:
  two Monte Cristo routes said **"Approach shoes unnecessary beyond a short roadside walk"** while
  their own approach is a **4-mile** walk of closed railroad grade from the Barlow Pass gate, and
  `wa_cordwood` carried *"Do not climb until you have personally assessed the loose blocks"* — a
  safety instruction. All three removed (`fix-non-gear-packing-entries.mjs`), each only after
  confirming the fact survives elsewhere: Cordwood's warning is in `hazards`, `watch_out` **and**
  `beta` in fuller form.
  - The two Monte Cristo entries are **wrong, not merely misfiled**, and the phrasing matches **The
    Dikes** — a southeast-Washington basalt area whose approaches genuinely are "very short and
    roadside". That is the cross-region duplicate-field-value fingerprint `audit:identity`
    describes, landing in a gear column instead of a prose one.
  - **Precision was 3 of 11 on the negation probe and 2 of 7 on the follow-up, and both bad buckets
    are instructive.** `probe-what-to-bring-negations.mjs` flags a negation anywhere in the entry,
    so it reports 8 correct entries whose *justification* contains one — *"headlamp — long days are
    common even for parties that don't get lost"*, *"Gaiters and gear you do not mind soaking"*,
    *"Northwest Forest Pass … (not needed at the #1587 US-2 trailhead)"*. Read the entry, never the
    flag.
  - **`probe-roadside-gear-contamination.mjs` reported 7 of 7 contradicted on its first run, with a
    "consistent" bucket of ZERO — which is the tell.** It was matching any mileage in the approach,
    and *"drive the Mt. Baker Highway 13.3 miles past Glacier"* is a **drive** to a genuinely
    roadside cliff. Mileage now counts only inside a sentence that says somebody is on foot and does
    not say they are in a car.
  - **`dist_km` is deliberately excluded from that verdict**, and that was measured. Using it as a
    floor condemned `wa_east_ridge` on a `dist_km` of 6.4 (= 4.0 mi) while its own approach — 
    byte-identical to two sibling routes on the same spire — says the walk-up is *"around 20 minutes
    or less"* from a road that *"runs almost directly beneath the formation"*. The gear note is
    correct and the **6.4 is wrong**; that is an `audit:distances` finding, not a gear one. Prose is
    the better record for *is this walk short*.
- **`check:fire`** enforces the honesty invariants of the wildfire surfaces (`lib/fire.js`,
  `lib/FireMap.jsx`, `lib/FireNearRoute.jsx`). It exists because those screens were each
  verified by hand in a browser against live federal services, and every one of those runs
  was throwaway — while what they proved was not *rendering* (`check:ui`/`check:zero` cover
  that) but a set of rules about what the screens may **claim**. Six of those rules had
  already been broken at least once, and a wildfire screen is the worst place in the app to
  quietly re-break one. Static — no browser, no dev server, and no calls to NIFC or NOAA —
  so it sits in `npm run build`, cannot flake, and does not hammer a public federal service
  on every commit.
  - What it locks down, each a shipped defect: **`uDistMi` used as a boolean** (it is a
    *formatter*, so the branch is always truthy and every metric user saw "mi" — invisible
    to `check:dead-props` and `check:refs`, since the prop is both read and bound, and
    imperial is the default); **`resultRecordCount` with no `orderByFields`** (the server
    returns an arbitrary OBJECTID slice while the UI says "showing the largest", and
    truncation is the *normal* case on the default viewport); **`onset` fetched and dropped**
    (a Red Flag Warning starting tomorrow rendered as current danger — 15 of 48 live products
    had a future onset); **`where: "1=1"` on the perimeters query** (prescribed burns drawing
    as wildfires, dormant out of burn season); **`Date.parse(z.ends || 0)`** (stringifies null
    to `"0"`, parses as the year 2000, so a product with *no* end time outranked every real one
    and became the headline); and **`placeholderData` on the per-route query** (the key is the
    route's coordinate, so it would print the previous route's fires under this route's heading).
  - It also asserts the two caveats are still on screen — there is **no national closures API**,
    so both surfaces must say so, and the per-route panel must say its distances are to the
    fire's *reported point of origin* (a 138,000-acre fire is ~24km across, so its edge can be
    far closer than that number).
  - **An empty result and a failed read are checked by source ORDER, not proximity**: an error
    branch and a `.data` read must both precede the "No active wildfires" claim. A first draft
    used "look at the preceding 600 characters" and reported the route panel's real gate —
    early returns 40 lines up — as missing.
  - Injection-tested, 13/13, each naming its own defect. **Two started as false passes and both
    were scope mistakes rather than missing rules**: the `body.error` check looked for `throw`
    within 200 characters and found the *next statement's* throw, and the `zoneInEffect` check
    only asked whether the name appeared in the file, so neutering the draw while leaving the
    in-effect/upcoming split intact kept it green. Presence is not use, and proximity is not
    scope — the `injection logged, counter didn't move` shape again.
  - Writing it found a live gap nobody had noticed: the **fire-weather query was the one capped
    request still going out unordered**. Size is meaningless for a weather zone, but
    "which of these ends first" is exactly what you want to keep, so it now orders `ends ASC`.
  - It also reads `RouteDetail.jsx`, for **reachability only**. The first version had the same
    hole one level up: it asserted a great deal about the panel's contents and nothing about
    whether the panel was *mounted*. Measured rather than assumed — neutering the mount left it
    green, which is the `descent_text` shape (populated on 1,021 routes, rendered on none).
    Since **#769** the placement is two mutually exclusive mounts (`{fireEl}` on Safety;
    `{showSafety?null:fireEl}` on Overview) because `showSafety` is **content-gated** — a bare
    crag route is offered no Safety tab at all. So *neither* is a reachable state and would be
    #655 again, and *both* would double-render a red hazard box; the guard pins exactly one.
    That block reads **raw** source, because the discriminator is a string literal
    (`tab==="safety"`) and the blanker wipes string contents, collapsing every branch to
    `tab===""` — the first run failed with "gone blind" for precisely that reason.
