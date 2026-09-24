# Units and formatting

`check:units`, and the neighbouring display-format defects: dates against the climber's preference, machine tokens on screen, singular/plural stat chips.

Part of the guard notes — see [README.md](README.md) for the full index.

- **`check:units`** asserts that **a surface renders in the climber's chosen units, and that a
  control which WRITES converts before it stores**. Static (one shared esbuild bundle, six SSR
  renders through three render functions, two Babel parses and four lifted-and-executed source
  expressions), so it sits in `npm run build`.
  - **IT IS SIX PROBES PROMOTED AT ONCE, AND PROMOTING ONE WOULD HAVE BEEN THE WRONG SHAPE.** All
    six lived in `scripts/oneoff/`, **which nothing runs**, and each proved a fix that changes
    **strings and no identifier** — a label, a unit word, a conversion at a call site.
    `audit:silent-reverts` says in its own closing caveat it cannot see that, so a stale-base squash
    could restore every one of these with each existing gate green. That is the argument that
    promoted `check:topo-outage-copy`, `check:policy-claims`, `check:profile-claims` and
    `check:offline-claims`. Promoting one would have left five still running nowhere — *an instance
    fixed by hand is not a class closed*, which this file records under a dozen names.
  - **IT WAS FIVE UNTIL THE SIXTH LANDED MID-BUILD, and that is the reason to re-check rather than
    quote.** #1671 merged while this guard was being written, adding another unit probe that ran
    nowhere — so a guard shipping as *"the five"* would have been **stale on arrival**. The finding
    that exposed it looked like a live defect (the approach-variants editor storing raw under a
    "miles" label) and was **my own branch being behind main**, which is the `check:column-drift`
    lesson exactly: *a stale tree is indistinguishable from an undescribed defect.* **Re-read
    `git log origin/main` before believing a finding in a long-running branch.**
  - **AND A SEVENTH LANDED THE SAME DAY, WHICH IS THAT WARNING PAYING OUT IMMEDIATELY.** The entry
    above says to re-check for new members rather than quote the count, and `profile` is one: three
    sites rendered a raw number beside a hardcoded imperial unit — `FullProfile`'s header
    (`{dist.toFixed(1)} mi away`), its COMPATIBILITY WITH YOU card (`… miles away`, a second
    spelling of one unit inside one component), and `lib/FireNearRoute.jsx`'s overflow line
    (*"and N more within {radiusMi} miles"*).
    - **EACH HAD A CORRECT SIBLING BESIDE IT**, which is what makes them misses rather than a
      missing convention: the partner card has always written `uDistMi(+dist.toFixed(1))+" away"`,
      and the fire panel converts **every individual fire's distance two lines above** the one it
      did not. `dist` is `distMiles(ME, climber)`, so it really is miles and nothing converted it.
    - **The general rule is what earns the section**, rather than three hand-picked sites: *a value
      rendered immediately before a literal `mi`/`ft`/`lb` cannot convert, whatever the setting
      says.* Measured across all **17** app and `lib` sources — exactly these three, and **zero**
      after. It is checked on every run, so the next one fails rather than being found by reading.
    - **SOURCE-ONLY, and the reason is structural rather than laziness.** `FullProfile` ends in
      `createPortal(…, document.body)`, which the server renderer refuses, and this guard bundles
      react-dom **IN** — so the portal cannot be flattened from outside its bundle the way a
      standalone probe does it. The RENDER proof therefore stays in
      `scripts/oneoff/probe-full-profile-distance-honours-units.mjs`, which renders both units and
      asserts **the number moves too** (195.8 mi → 315.1 km), not merely that a unit word swapped.
    - **A rule that only demands ABSENCE is satisfied by deleting the feature**, so the section also
      asserts both readouts are still REACHABLE — the header's `dist!=null&&isFinite(dist)` gate and
      the compatibility card both have to survive.
    - Injection-tested **5/5** (`scripts/oneoff/inject-full-profile-distance-cases.mjs`), each case
      naming **which** of the two checkers must react, because requiring both everywhere would be
      wrong: the probe does not render the fire panel, and only the render can see a number that
      failed to convert. **Case 5 must stay SILENT in both** — `uDistMi(dist)` is a different
      rounding, not a units defect, and firing on it would forbid a correct refactor.
    - **The probe's own non-vacuity check earned itself on its first run.** Its fixture picked the
      first seed climber with coordinates, several of whom share Salt Lake City with `ME`, so
      `distMiles` returned **0** — which renders `"0.0 mi away"` and `"0.0 km away"`, identical
      strings, and would have failed the conversion assertion against a perfectly correct fix. It
      takes the FARTHEST seed climber now.
  - **AND AN EIGHTH, WHICH IS THE `variants` STORY ONE ROW UP THE SAME FORM.** #1671 made the
    approach-variant boxes unit-aware and left the **pitch length** box directly above them asking
    for `Length (m)` whatever the setting — while `PitchTable` renders that stored length back
    through `uLen`, so an imperial climber READS *"148 ft"* on the route page. Typing the number
    they had just read stored **148 m**, and the route then claimed **486 ft**.
    - **CENSUSED, NOT SPOTTED, and the census is what makes it a finding rather than a lucky
      catch.** Of the **six** unit-bearing inputs in `SuggestFix`, five were already unit-aware and
      this was the only hardcoded one — a class of ONE with the convention two lines *below* it.
      *An instance fixed by hand is not a class closed*, arriving inside the very form the previous
      member was fixed in.
    - **FOUR EDGES, AND REVERTING ANY ONE IS SILENT** — the value still flows, in the wrong unit,
      under a success toast: the PREFILL (canonical → the climber's units), the BOX (label and
      placeholder), the STORE (typed → canonical metres), and the two SUMMARY strings. **The
      prefill is the dangerous one**: without it an imperial climber opens a 45 m pitch, sees `45`
      under a feet label, changes nothing, saves, and the pitch becomes **14 m**.
    - **THE SUMMARY IS THE SUBTLE ONE, and it is why converting the draft alone would have been
      wrong.** `pitchStr` is fed the DRAFT by `pendStr`/`filledStr` and **canonical rows** by
      `curRefStr`, so one formatter was carrying two conventions the moment the draft moved to
      display units — the editor would have compared `55m` against `"180m"`. `curRefStr` is fed
      `routePitches` now, so one convention flows through.
    - **MEASURED, so it needs no `_orig` guard where `itinStoreVal` does:** every length
      **1-200 m round-trips m→ft→m exactly**, so a box seeded from a stored length and saved
      untouched cannot drift. Miles and pounds do not, which is what that guard exists for.
    - **The converters live in `ClimbMatchCore.jsx` beside `uElevN`/`uElevIn`** — `uLenN`/`uLenIn`,
      the MIRROR of that pair, since a pitch length's canonical unit is metres where an elevation's
      is feet. `uLen` formats what they convert, so the metre↔foot arithmetic exists **once**.
    - **THE INJECTION SUITE CAUGHT AN OVER-STRICTNESS IN THE SECTION'S OWN ASSERTION**, which is
      the whole reason `placeholder-reworded` must stay silent: the first version pinned the
      **exact** placeholder string, so a reworded one — ordinary editorial work — was flagged as a
      defect. It is a shape test now (does the expression consult `uLenUnit()` at all), and still
      catches the real revert, so it was not loosened into vacuity.
    - Injection-tested **9/9** (`scripts/oneoff/inject-pitch-unit-cases.mjs`), each edit proven by
      checksum and restored byte-identically. `metric-converts-too` is the over-reach in the other
      direction — handing a metric climber their own typing back changed, worse than the defect it
      replaces. The FIELD-RETENTION half stays in
      `scripts/oneoff/probe-pitch-contribution-keeps-what-was-typed.mjs` (11 assertions, 7/7),
      which asks a different question and runs the branch in metric where the conversion is the
      identity — **two homes for two questions, not two copies of one.**
  - **AND A NINTH, FOUND BY READING THIS GUARD'S OWN STATED BLIND SPOT: THE FORECAST'S FREEZING
    LEVEL.** The `profile` section records, in as many words, that the bare-unit needle *"wants a
    bare unit AFTER a brace"* — so a JSX `{v} ft` is caught and a **concatenation** `v + " ft"` is
    invisible. That is not a hypothetical gap: the *Freezing level* tile rendered
    `{dy.freezeMax.toLocaleString()+" ft"}` and sat in it, on the one panel that decides whether an
    ice route is frozen. **A stated limitation is a worklist**, for the fifth time in this file.
    - **SEVEN OF THE EIGHT TILES IN THAT PANEL ALREADY CONVERTED** — `uTemp` ×4, `uWind`,
      `uPrecip`, `uSnowfall` — which is what makes this a MISS rather than a missing convention,
      the same argument the `profile` entry makes about its three sites.
    - **`uElev()` IS THE CONVERSION, NOT THE RE-CONVERSION THE FETCH COMMENT FORBIDS.** That
      comment read *"do not re-convert freezeMax below"*, meaning **never scale it by 3.28 again**
      because `precipitation_unit=inch` already makes Open-Meteo return feet. Converting the
      canonical value to the climber's unit is a different operation, and the comment now says so
      — left as it was, the next reader would have read the fix as the thing being forbidden.
    - **THE SAME COLUMN IS HYDRATED TWICE AND BOTH HALVES HAD IT.** `climb_logs.freezing_level_ft`
      is a number, and `ClimbMatch.jsx` and `RouteDetail.jsx` each rendered it `+" ft"`, so a
      metric climber read **another climber's report** in feet. This file already records that
      this pair DRIFTS when only one half is touched, so both are fixed and both are asserted.
      `check:log` guards which COLUMNS each hydration carries and is blind to the unit.
    - **...AND THEN THE CONTRACT MOVED (2026-09-24, log-form rework).** Hydrating to `uElev()`'s
      STRING was itself a units defect one step later: the log form re-seeded its box from
      `"3,353 m"`, `syncLogToDb` pulled the first digits out of it and stored **3353 as feet**, so
      every metric edit shrank the value 3.28x. Both hydrations now carry the raw number as
      `cond.freezingFt`, and the conversion happens where it is DRAWN (`ReportStats`, CONDITIONS
      NOW) and where it is TYPED (`uElevIn` in the form). The guard asserts all four links and
      FAILS on the old `uElev(row.freezing_level_ft)` shape rather than accepting it. The legacy
      prose `cond.freezing` (seed routes) still renders as written.
    - **The imperial output is NOT byte-identical here and that is stated rather than glossed**:
      `11000+" ft"` becomes `uElev(11000)` = `"11,000 ft"`. A thousands separator, matching the 35
      other `uElev` call sites in that file. The forecast tile IS byte-identical, since `freezeMax`
      is already rounded.
  - **THE GENERAL RULE IS A GATE NOW, AND IT IS A COUNT RATCHET BECAUSE THE FILE'S OWN IDIOM IS
    ONE.** `rawImperialUnits()` walks the AST of the three app files and three `lib` ones and asks
    whether anything CHOSE the unit — a `uImp()` ternary, or the defensive `uElev ? uElev(x) :
    <fallback>` a lib component falls back to when a caller omits the helper. **28 concatenations,
    6 raw**, and the six are enumerated beside the constant with a reason each, in the same shape
    the `profile` section already uses for its *" mi away"* pair.
    - **A COUNT IS ONLY AS GOOD AS ITS TOKENISER, three times over in one sitting.** `" in"` is
      the English preposition far more often than inches and reported `"APPROACHES · "+n+" way"+
      (s)+" in"` as a defect; `key={"lb"+i}` on the long-beta rows is a **React key**, not pounds;
      and a **default parameter** (`uDistMi = mi => Math.round(mi)+" mi"`) is the documented
      degrade-rather-than-crash fallback. All three are excluded structurally, not by a word list.
    - **The six that remain are unreachable or reported, never overlooked**: the two dead
      `rappels` object branches (733 of 733 rows are strings), `OverviewMap` and `QuickMatch`
      (declared seed-only, asserted as such by the `profile` section), `GettingThere` (dead by a
      closed decision), and App's area search — which renders the **seed `MOUNTAINS` tree**, so
      its distance is the AddRoute area-picker class and converting it would polish a surface
      showing the wrong data. **Check the branch before polishing a control.**
    - **NearMePanel is what the ratchet caught that nothing else could.** Its distance read
      `a._mi.toFixed(1) + " mi · "` **18 lines from a correctly-guarded sibling** using the same
      `uDistMi` prop, in the LIVE DB area browser. No targeted assertion covers it, and the
      injection proves it: reverting that one line fires the ratchet and **nothing else**.
    - **THE MIRROR CLASS IS EMPTY, MEASURED, SO THE RATCHET IS SCOPED TO IMPERIAL ON PURPOSE.** A
      hardcoded METRIC unit shown to an imperial climber is the same defect, so the same AST test
      was run over `km|kg|cm|m`: **30 concatenations, 13 raw, and NOT ONE is a units defect.**
      **Six are `m` for MINUTES** — `"9h 30m"` on the car-to-car line, `fmtDurMin`, `relTime` —
      two are the comment-id prefix `"cm"`, two are the documented-dead `rappels` object branches,
      and **three are metric BY CLIMBING CONVENTION**: sling sizes in cm and rope length in
      metres, which American climbers use too (a 60 m rope is a 60 m rope). Converting those
      would be the guard arguing with correct work. *A detector for a class of zero is the thing
      this repo keeps refusing to build* — so no metric ratchet was shipped.
    - **AND THE TOKENISER TRAP LANDED A FOURTH TIME IN THAT ONE SCAN.** `" in"`, `key={"lb"+i}`
      and the default parameter were the first three; `"m"` is **minutes far more often than
      metres** in this codebase, and a scan that read it as a unit would have reported six
      correct duration strings as defects. **Read the hits, never the count.**
    - Injection-tested by reverting each fix in place and restoring **byte-identically by
      checksum**: the tile, both hydrations and the ratchet each fire naming their own defect, and
      the area-browser revert fires the ratchet alone. The weather floor rises **14 → 20** — a
      floor left at the old count cannot see the new half stop asking.
  - **ONE BUNDLE, NOT SIX.** Each probe built its own esbuild bundle of the same 400kB file and two
    of them bundled `RouteDetail` separately. Merging is the `check:outage-copy` precedent, which
    folded two probes together for exactly this reason. Measured back-to-back on one box: the five
    probes it started from cost **~3x `check:policy-claims`**, the merged guard **~1.5x** — a little
    over half, for more assertions. **Quote the ratio, never the clock**: those readings were taken
    at load average 488, where this file already records a profile being off by 4x.
  - **THE CLASS IS ONE CLASS AND THE WRITE HALF IS THE SERIOUS END.** A display defect misinforms
    one reader; a form that stores what was typed corrupts the record for **every** reader — a
    metric climber typing 10 meaning 10°C had **10 written into `climb_logs.temp_f`**, so their own
    report told everyone else the route was at -12°C. **Four** writes are covered: the trip-report
    temperature, the itinerary builder, the bail form's distance, and the approach-variants editor.
  - **THE VARIANTS WRITE IS THE WORST OF THE FOUR, and not because it is the biggest.** Its two
    numbers are the ones `sameEditValue` compares **numerically with a tolerance** (0.1/0.2 on
    `distMi`, 0.1/50 on `gainFt`) so two climbers who measure 4.8 and 4.9 miles count as agreeing. A
    stored kilometre does not merely display wrong: it lands **1.6x away** from the same measurement
    taken on the other setting, so the two never cluster and **the 3-agree merge gate can never be
    reached** — the correction sits pending forever.
  - **THE COLUMN STAYS CANONICAL AND THE CONVERSION HAPPENS AT THE EDGES**, and that is asserted
    rather than assumed. Re-fetching or re-storing in the climber's own units reads as tidier and is
    wrong twice over: `wxTempColor`'s 85/70/50/32 and `wxWindColor`'s 30/15 are calibrated in
    Fahrenheit and mph, and the forecast response is **cached per coordinate**, so the unit setting
    would leak into the cache key. Injection case `fetch-converts-at-the-source` pins it.
  - **A DIFFERENCE IS NOT A TEMPERATURE.** The panel prints two of them, comparing Open-Meteo
    against NWS and MET. Converting one uses the **scale** and never the 32-degree offset: a 4
    degree disagreement is 2°C, not **-16**. That is the historical defect and it is case 1 of the
    weather suite.
  - **SIX SECTIONS, each seeing something the others cannot**: `persist` (the preference survives a
    reload at all, and a throwing `localStorage` cannot take a screen down), `weather` (the forecast
    helpers, and the colour thresholds still receiving RAW imperial), `reports` (a climber's own
    temperature, on screen and on the way into the column), `itinerary` (the builder, the downloaded
    `.txt`, and the bail form's second writer of the same column), `variants` (the approach-variants
    editor, on both boundaries and in its two labels), `filters` (the chips, and whether a length
    LABEL agrees with the predicate it labels).
  - **FLOORS ARE PER SECTION, because ONE TOTAL CANNOT SEE A SECTION THAT STOPPED ASKING** — five
    healthy sections carry the number while the sixth contributes nothing and the run prints the
    same `ok`. That is the per-file floor lesson `check:control-names` paid for, where a **partial**
    restyle left it checking 1 file of 2. Each floor sits two below what a clean tree produces
    (15/16/17/18/15/30). **Raise one when you add an assertion; never lower one to make a run pass.**
  - **`--only=<section>` PRINTS A PARTIAL BANNER AND CAN NEVER READ AS A PASS**, the contract
    `check:a11y-badges`' `--only=route` already sets. It exists so an injection case pays for one
    section rather than five; a flag that let a partial run look complete would be the false pass
    this whole file is built to refuse.
  - **THE TEXTUAL CHECKS READ A MASKED COPY AND THE AST CHECK DOES NOT, and the asymmetry is
    deliberate.** A comment explaining the colour rule names the very call it forbids — but an AST
    does not see comments, so that test needs no mask. The fetch and bare-unit tests are string
    matches and do, or the guard fails on its own documentation (the `check:ci-cancel` trap). **The
    line-comment pattern protects `://`**: the forecast fetch is an https URL, and a naive `//`
    strip would delete the exact line the canonical-units check is looking for. Two injection cases
    must stay SILENT to pin both halves.
  - **PROMOTING IT FOUND TWO INJECTION ANCHORS THAT HAD ALREADY ROTTED, and nothing had said so.**
    The guarded read/write moved out of `lib/units-pref.js` into `definePref` in `lib/prefs.js` when
    a third stored preference appeared; two cases kept naming the old file and reported **HARNESS
    BUG** on every run — of which there were none. **A suite nobody runs rots exactly like a guard
    nobody runs**, and the only thing that surfaced it was running the suite in order to re-point
    it. Two dead citations in neighbouring comments went the same way, one of them naming a file
    that has never existed under that name.
  - **The `weather` section had NO suite at all** — the one of the five whose assertions had never
    been shown to fail on anything. It has 8 cases now.
  - Fails **closed** four ways, each of which otherwise prints identically to a clean run: the app
    not bundling, any of 25 expected exports missing, a section falling under its floor, and each
    section's own `ANCHOR LOST` (the CONDITIONS NOW chip, the units toggle's option list, a thin
    render, a source file that does not parse).
  - **`process.exit()` SKIPS `finally`**, so every fail-closed path sets the problem and throws a
    sentinel the runner swallows; the bundle directory is removed in `finally`. That trap is
    recorded under `check:block-guarantees`, and one probe folded in here leaked nine directories
    into `git status` before it was fixed.
  - Injection-tested **47/47** across six suites (`inject-units-preference-cases`,
    `inject-weather-unit-cases`, `inject-report-temp-cases`, `inject-itinerary-unit-cases`,
    `inject-approach-variant-unit-cases`, `inject-filter-label-cases`), each case proving its edit
    landed **by checksum** and restoring every file byte-identically. **Eight must stay SILENT** — a
    cosmetic dash, two renamed locals, a reworded placeholder, a deliberately bare degree sign on
    the forecast, and the two comment cases above.
  - **SECTION 9 (`keyed`) COVERS THE ONE CONTRIBUTE PATH WITH NO CONVERSION AT ALL, and sections
    1-8 are blind to it by construction.** `itinerary`, `variants` and `pitches` cover the ARRAY
    editors, which convert at the edges through `itinStoreVal`. The **eleven KEYED-object** editors
    (`road`, `access`, `timing`, `crowds`, `partnerRequirements`, `seasonalGuidance`, `emergency`,
    `approachLogistics`, `difficulty`, `climate`, `seasonalHazards`) never reach `structuredVal` at
    all: `submit` coerces them with a bare `parseFloat(v)` for `k[3]==="num"`, and **`CANON`/`UNCANON`
    cannot reach them** because those maps are keyed by the TOP-LEVEL `f.k` while these keys sit one
    level down inside the object.
    - **THAT MISSING CONVERSION IS HARMLESS TODAY, AND THE REASON IS A FACT ABOUT THE VOCABULARY
      RATHER THAN ABOUT THE CODE.** `lib/objKeys.js` declares exactly **10** entries that store a
      number and every one is unit-invariant: **four are HOURS** (`totalHrs`, `approachTimeHrs`,
      `summitTimeHrs`, `descentTimeHrs`) — an hour is an hour on both settings — and six are
      unitless rating scales. So there is **no unit-bearing number on that path to get wrong**, and
      the units WRITE class really is closed, now over the **fifth** path, which this entry's own
      list of four (temp #1578, itinerary + bail form #1654, variants #1671) never named.
    - **A PARAGRAPH SAYING THAT WOULD ROT, WHICH IS WHY IT IS A SECTION.** It is a claim about
      `lib/objKeys.js`, so the day somebody adds a distance or an elevation key it **arms itself** —
      stored raw in whatever the climber typed, into a canonical column, exactly the shape #1654 and
      #1671 fixed on the array editors. The class-growth argument `check:bottom-panels` records.
    - **THE REGISTRY IS READ FROM THE APP, never restated**, so a twelfth keyed editor added to
      `OBJ_KEYS` comes into frame by itself rather than silently falling outside the section.
    - **AN UNDECLARED NUMERIC KEY IS A QUESTION, NOT AUTOMATICALLY A DEFECT**, and the failure says
      so: a new unit-invariant number is one declared line, while a real measurement needs conversion
      at the edges. A guard that called every new number a defect would flag correct work.
    - **THE SCOPE WAS MEASURED, NOT CHOSEN, and the wider rule is the one that would have shipped
      noise.** *"Flag any entry whose label or placeholder names a unit"* fires on **four** live
      entries and **all four are free-text PROSE**, where the unit appears only in an example
      (*"e.g. last 4 mi rough, high clearance helps"*). The app cannot convert a sentence. Scoped
      instead to entries that actually **store** a number — `num`, or an `enum` with numeric options,
      which is exactly what `submit`'s own coercion tests, so the section mirrors the store path
      rather than guessing at it.
    - **A `mi` SUBSTRING SCAN IS USELESS HERE**: `com`**mi**`tment`, `per`**mi**`t`, `sum`**mi**`t`
      and `group_li`**mi**`t` all match and none is a measurement — the *Weston Wall matched "west"*
      trap. And the vocabularies live in **`lib/objKeys.js`**, not in the two files that consume
      them, so a grep scoped to `RouteDetail.jsx`/`ClimbMatchCore.jsx` returns a confident **zero for
      every vocabulary at once** — the *when every case in a sweep shares one result, suspect the
      sweep* tell.
    - Fails **closed** four ways, each of which otherwise prints identically to a clean run: a moved
      `OBJ_KEYS` (`ANCHOR LOST`), fewer than 8 editors parsed out of it, a vocabulary the registry
      names that the module does not export (reading it as *"no numeric keys here"* is the
      false-pass direction), and **zero numeric entries matched at all** — the store path coerces
      both shapes, so matching none means the scan cannot fire.
    - **ITS OWN FLOOR CAUGHT THE SECTION'S FIRST DEFECT**: every runner sets `section` as its first
      line and this one did not, so 15 assertions printed while counting against a section that was
      not running and the floor reported `0`. The per-section floor working exactly as designed.
    - Injection-tested **8/8** (`scripts/oneoff/inject-keyed-unit-cases.mjs`), each case proving its
      edit landed **by checksum** and restoring the file byte-identically. **Three must stay
      SILENT** — a new hours key, a prose key whose placeholder names a unit, and a rating scale.
      **Two cases reported MISS while the guard was INNOCENT**: the fail-closed path goes through
      `dead()`, which prints `- BROKEN: …` on a line carrying no `FAIL`, so a filter matching only
      `FAIL` read two correctly-firing cases as misses — the mirror of the *match a FAIL line, never
      the word* trap.
  - **SECTION `weather` ALSO COVERS THE HEIGHT MISMATCH, WHICH IS THE SAME FAMILY ONE STEP OUT:
    two quantities that look comparable and are not.** The wind tile's sustained figure is
    `wind_speed_80m` — a ridge-level proxy — while the only gust Open-Meteo publishes is
    `wind_gusts_10m`, a SURFACE figure. The gust line was gated on `gustMax > windMax`, i.e.
    **across 70 m of altitude**, and an 80 m sustained routinely exceeds a 10 m gust.
    - **MEASURED AGAINST THE LIVE API RATHER THAN REASONED ABOUT: 51% of 168 hours had the gust at
      or below the 80 m sustained and rendered NO gust line, against 8% on the honest same-height
      comparison.** So the suppression is overwhelmingly an ARTEFACT, and 8% is the real physical
      case (a gust barely above a steady wind). On the seeded CI capture **15 of 36 day tiles show
      no gust**, including the windiest tile in the whole capture — the gust vanished exactly when
      a climber needs it.
    - **THE OBVIOUS FIX IS WRONG, AND MEASURING IS WHAT KILLED IT.** Standardising the panel on
      10 m makes the gate coherent and makes the NWS/MET cross-check rows compare like with like —
      and it takes **2026-09-10 from AMBER to GREEN while a 29 mph gust stands**, and 09-11
      likewise with a 22 mph gust, because the 80 m figure runs 39% higher at the median (2.86x at
      p90) and `wxWindColor`'s 30/15 cut-offs are crossed by the 80 m number. That is the **#641
      under-warning direction** on a safety panel. **The headline stays at 80 m**, and section
      `weather` asserts that as hard as it asserts the gate: injection case `headline-moves-to-10m`
      satisfies every gust assertion and must FAIL, because *a rule that only ever demands the gust
      appear is satisfied by the change that under-warns.*
    - The fix is therefore the **GATE**, not the headline: fetch `wind_speed_10m` in the same
      request and compare the gust against the SURFACE sustained. With no 10 m series at all it
      **shows** the gust — withholding a gust figure is the dangerous way for this to fail — and
      `wind10Max` is `null` rather than `-Infinity` on an empty bucket so that branch is explicit.
    - **AND THE PANEL SAYS WHICH HEIGHT EACH NUMBER IS**, because the fix creates a legible-looking
      oddity of its own: a tile can now correctly read *"22 mph"* above *"gusts to 22"*. The same
      sentence explains the other half of the mismatch, which no code change reaches — the NWS and
      MET winds printed beside each day are **10 m** figures against an 80 m headline, so the
      capture shows **36 mph against NWS's 10** and a reader sees a 3.6x disagreement between
      forecasters that is not one. The panel's own comment states its purpose as flagging
      divergence *"instead of presenting one number as gospel"*, and that only works where the
      three are the same quantity: they are for temperature (the `differs` tag is `uTempDelta` and
      fires on temperature ALONE, checked rather than assumed) and they are not for wind.
    - **The 80 m choice was UNDOCUMENTED**, which is how it survived: the comment block above the
      fetch explains `forecast_days` and the freezing-level unit in detail and says nothing about
      wind height. **This is the only weather fetch in the app**, so there was no internal
      inconsistency to trip over either.
    - **A GATE rather than a probe**, and folded into `check:units` rather than given its own file:
      the fix changes a URL field, a comparison and a string, so reverting the gate to
      `dy.gustMax>dy.windMax` moves **no identifier** and `audit:silent-reverts` is blind to it by
      its own closing caveat. The section already loads the bundle, reads `RouteDetail.jsx` and
      keeps a comment-masked copy, so it costs no second node start and no second Babel parse —
      the cheap version this file records taking three times already.
    - The rule is **lifted from source and executed** with `ANCHOR LOST`, never retyped: a copy
      would agree with itself whatever the app did, which is the whole question. The floor rises
      **20 -> 37**, two below a clean 39.
    - Injection-tested **16/16** (`scripts/oneoff/inject-weather-unit-cases.mjs`, 8 pre-existing
      re-run plus 8 new), each case proving its edit landed **by checksum** and restoring the file
      byte-identically. `gust-compared-across-heights` is the defect restored verbatim;
      `gate-hides-on-a-missing-series` pins the fail-OPEN direction, which no wiring test can see.
      **Two must stay SILENT** — a comment naming the forbidden cross-height comparison (this fix's
      own documentation) and a reworded caption, since the rule is that the caption NAMES both
      heights rather than uses one phrasing.
  - What it does **not** prove, stated in the guard rather than implied: that the forecast panel
    renders correctly in a BROWSER. `scripts/oneoff/probe-forecast-onscreen-in-both-units.mjs` is
    the one unit probe left in `scripts/oneoff/` and it drives Chrome, so it stays out of the build
    chain.
    - **IT READ FOUR VALUES AND THE FREEZING LEVEL WAS NOT ONE**, so the tile this guard's ninth
      finding fixed had no browser witness at all while its seven siblings did. It reads five now.
    - **THE LABEL IS `textTransform:"uppercase"` AND `innerText` RETURNS THE CSS-TRANSFORMED
      TEXT**, so the screen says `FREEZING LEVEL`. A case-sensitive needle matched nothing and the
      probe reported *"the tile was removed from the panel"* **on a completely correct app** —
      a guard flagging correct work, from a trap this file already records twice (`check:ui`'s
      `PEOPLE YOU'VE CLIMBED WITH`, and `"CREW · 2 MEMBERS"`). Match case-insensitively here.
      - **A STATIC SELF-TEST OF THE NEEDLE PASSED ALL FOUR SHAPES AND WAS CIRCULAR**: it tested
        the regex against the markup *as imagined*, not as the browser renders it. Only the run
        disagreed. **A regex test written from the source is not a test of what is on screen.**
    - **THE TWO RUNS ARE SEPARATE PAGE LOADS MAKING SEPARATE FETCHES, so the underlying forecast
      can move between them** — observed as a provider delta of 12°F in one run against 6°C in
      the other, which is drift rather than a conversion error. So the freezing assertion is a
      **10% band, sized by the DEFECT** (an unconverted figure is 3.28x out, which no 10% band
      can hide) rather than an equality that ordinary drift turns red. The existing hi/lo and
      delta assertions still demand exact equality and inherit that flakiness; that is
      pre-existing and worth knowing before reading a lone red from this probe as a defect.
    - **ABSENCE IS SPLIT THREE WAYS, because they want different reactions**: no forecast figures
      at all is the run failing (already NOT MEASURED — and the freezing checks are gated behind
      it, after a first version piled *"the tile was removed"* on top of a metric run that had
      simply never loaded); a label with no number is the provider giving none; and a missing
      label is the tile actually going.
    - **THE COMPARISON IS SELF-TESTED BEFORE ANY BROWSER RUNS**, and on this probe that matters
      more than usual: the metric leg routinely produces no figures on a loaded box, so the happy
      path can go unexercised for a whole session while the run still prints green. `freezeVerdict`
      is exercised on five constructed pairs first — it must ACCEPT a real conversion and REJECT
      the unconverted number, a wrong figure, and a metric run still showing feet — and one
      implementation serves the self-test and the live comparison so they cannot drift.
    - **THE METRIC LEG IS OBSERVED NOW, AND THIS BULLET USED TO SAY IT NEVER HAD BEEN.** It read
      *"NOT observed: a live METRIC render of this tile — every attempt hit a box at 51x-103x where
      the metric leg returned no forecast at all … it closes with one run on a quiet one."* That run
      happened (2026-09-23, load 3.6x), and **both legs captured every one of the five values**:

          imperial   hi/lo 54/38   wind 4 mph     precip 0.11"   delta 8   freeze 13,878 ft
          metric     hi/lo 12/3    wind 6 km/h    precip 2.8 mm  delta 4   freeze 4,230 m

      The two assertions that could only ever be made live both hold: **13,878 ft renders as
      4,230 m**, so the tile converts rather than swapping a unit word; and **the provider
      disagreement goes 8° to 4°, not −13°**, so a difference is converted with the scale and not
      the offset — the historical defect, caught in a browser for the first time.
    - **The rest of the observation list stands**: the self-test (5/5), and the not-rendered gate
      printing NOT MEASURED instead of accusing the app. **What is still unobserved is the
      not-rendered branch firing on a genuinely absent tile** rather than on a loaded box — the
      same shape one level down, and it needs a route with no forecast rather than a quiet machine.
      *A stated limitation is a worklist*, so when that one is exercised, replace this sentence with
      the measurement instead of deleting it.
- **THE NWS CROSS-CHECK ROW PUT A MACHINE TOKEN ON THE SAFETY TAB.** The forecast panel prints
  three sources side by side, and the NWS line read:

      NWS  High 53° · Low 45° · Wind 9 mph · Rain_showers

  MET's condition goes through `metWxLabel()`; NWS's went through `cap()`, which only uppercases
  the first letter — so NWS's snake_case gridpoint vocabulary reached the climber intact. **The
  asymmetry is the defect, not a missing map entry**: two sibling sources on one row, one labelled
  and one not.
  - **A MAP IS RIGHT FOR MET AND WRONG FOR NWS, which is why this is not "add a table".**
    `clearsky` and `partlycloudy` are not English, so that source genuinely needs one. NWS ships
    English words joined by underscores (`rain_showers`, `freezing_rain`, `blowing_snow`), so
    replacing the separator labels the **whole vocabulary** — where a table would be a second list
    to maintain whose first unlisted code puts the raw token straight back on screen.
  - **FOUND BY READING A CI CAPTURE**, on the tab a climber opens to decide whether to go. Every
    other condition on that panel reads as prose, which is what made the one token visible.
  - **A NUMBER ON THE SAME ROW LOOKED WRONG AND WAS NOT — checked before reporting it.** The
    *"differs N°"* tag appeared not to match the highs beside it. It compares day **midpoints**:
    Sep 12's Open-Meteo mid is 56.5 against NWS's 49, i.e. 7.5 → *"differs 8°"*, and today's 4.5 is
    correctly below the threshold and untagged. Reading it as a defect would have "fixed" a correct
    comparison.
  - `scripts/oneoff/probe-nws-condition-is-prose.mjs` — 9 assertions, no browser, no DB, both
    helpers lifted from source. It tests **every value NWS publishes** rather than the one code that
    was noticed, and its non-vacuity case keeps `cap("rain_showers") === "Rain_showers"` so the rest
    cannot pass against a vocabulary that never had underscores.
- **TWO STAT SURFACES STATED LESS THAN THEY KNEW, and both were found by READING a CI capture
  rather than by any guard.** Neither is a wiring fault — the column is populated, the identifier
  is bound, the number is a number — which is why nothing sees them.
  - **`1 vouches` on a partner card**, live on the `ui-screens` capture
    (*"27 catches · 74 climbs · 1 vouches"*). The three stat chips carried a fixed plural in a
    tuple and rendered `st[1]+" "+st[2]`, so a single catch, climb or vouch all read wrong.
    **A CONVENTION VIOLATION, NOT A NEW RULE**: the app already singularises in **59** places —
    54 as `!==1?"s":""` and 5 as `!==1?"es":""`, including `"catch"+(_slCaught===1?"":"es")` for
    this exact word. The singulars are **declared** rather than derived, because dropping a
    trailing `s` from *catches* gives *catche*; slot `[2]` stays the plural, since it is also the
    React key and the discriminator in the `act` ternary beside it.
  - **THE CLASS IS ONE SITE, MEASURED BY TWO SHAPES, AND THE OBVIOUS SCAN IS BLIND TO IT.** A scan
    for a count welded to a **literal** plural returns **45** candidates and **none is reachable
    at 1**: constants that can never be 1 (`RECENT_DAYS`, `MAX_WAYPOINTS`), `.toLocaleString()`
    counts of thousands, `sibs.length+1` which is always ≥2, aria-labels built from an **index**
    (*"Pitch 3 notes"*) rather than a count, and the *"Show all N …"* family, which is gated above
    1 — alerts at `length>8`, friends at `length>5`. A scan for a count welded to a noun held in a
    **variable** returns 21, of which **exactly one** is a count and a noun: this one. **The first
    scan cannot see the defect that was actually on screen**, because the plural lives in `st[2]`
    rather than in a string literal. *A single scan reporting 45 candidates while missing the one
    real instance is worth more as a warning than as a worklist.*
  - **A LABEL WITH NO VALUE UNDER IT: `High-factor catch ratio`.** The ratio existed only as the
    **width of a `<Bar>`** — two nested divs with a percentage width, no role, no text, no aria —
    so a screen reader read the label and stopped, and a sighted reader got a bar with no number.
    The **#654** dangling-label shape, on a safety record.
    - **Also a class of one, measured**: 8 `<Bar>` uses across the app and **seven state their
      value in adjacent text** (*"COMPATIBILITY WITH YOU — 74%"*, `{cur}/5`, `{avg.toFixed(1)}`,
      `{t.pct}%`). The eighth is this. No detector.
    - **Computed ONCE (`_hfr`) so the sentence and the bar cannot disagree**, and `null`
      distinguishes *"no catches, so there is no ratio"* from a genuine **0%**. A failed
      `belay_catches` read keeps the **—** the three tiles above already show: printing *"0%"*
      there would state a measurement the app does not have, which is the defect `unavailable`
      exists to prevent, committed one line lower.
  - Probes: `scripts/oneoff/probe-stat-chip-singulars.mjs` and
    `scripts/oneoff/probe-catch-ratio-states-its-number.mjs`. Both **lift the expression out of
    the source** with `ANCHOR LOST` rather than retyping it, and both assert the **negative**
    direction — the plural must still render at 0 and 2, and the ratio must stay silent with no
    catches — because a fix that singularised or captioned unconditionally passes any suite that
    only checks the interesting case.
- **FIVE SURFACES RENDERED A RAW ISO DATE, IGNORING THE CLIMBER'S OWN dateFmt PREFERENCE.** The app
  stores a date-format choice (`lib/date-pref.js`: auto / US / international) and formats through
  `DLOCALE` in **19** places — a raw `2026-06-17` is neither of the two formats it offers, so these
  were the outliers rather than the convention.
  - **FOUND BY READING A CI `ui-screens` CAPTURE**, the seventh defect that technique has produced:
    `Crew:Friends` renders **FRIENDS' RECENT ACTIVITY** over rows dated `2026-06-17`, while every
    sibling shows *"84 days ago"* or *"Posted 12w ago"*.
  - **A HAND-LISTED RECEIVER SET FOUND 4 AND THE TRUTH WAS 8 — the too-narrow-proxy trap, in the
    instrument.** A first census matched `\{(?:it|x|a|r|c|n|v|p|e|w|m)\.date\}`, which is a guess
    about what the variable is called; an AST sees every receiver and added `t.date`,
    `ascent.date`, `dy.date`, `g.date`, `eventForm.date`. **Measure the shape, never the spelling.**
  - **AND IT ALSO REPORTED ONE FALSE POSITIVE FROM ITS OWN COMMENT** — the explanation beside the
    fix quotes the forbidden shape, so a textual scan fails on its own documentation. An AST does
    not see comments at all; the reason `check:profile-claims` §3 is parsed rather than matched.
  - **THREE OF THE EIGHT ARE JSX ATTRIBUTES AND MUST NOT BE TOUCHED**, which is the precision rule:
    two are React `key={x.date}` (the `key={"lb"+i}` trap the units census already records) and the
    third is **`value={eventForm.date}` on an `<input type="date">`, whose value MUST stay a raw ISO
    string** — formatting it would break the control, so a scan that flagged it would tell an author
    to do exactly that. Scoped to **children position**, which is structural rather than a name list.
  - **THE `T12:00:00` IS LOAD-BEARING and every existing copy already had it**: `new Date("2026-06-17")`
    parses as **UTC midnight**, which renders as the **16th** anywhere west of Greenwich.
  - **THE OLD HELPER'S CATCH WAS DEAD, measured rather than read.** `RouteDetail` already carried
    `shortDate` twenty lines from one of the raw sites, ending `catch(e){return d||"";}` — and
    `toLocaleDateString` on an Invalid Date **RETURNS `"Invalid Date"` instead of throwing**, so that
    fallback could never fire for the malformed input it was written for. Its single caller guarded
    `t.date` at the **call site**, so nothing was on screen — but a vouch built from a row with no
    `created_at` carries `date: ""`, and adding five callers without hardening it would have put
    **"Invalid Date"** in front of a climber. Falsy in, empty out; unparseable in, the input back.
  - **THE REPAIR IS TO COLLAPSE, not to add a sixth copy**: `shortDate` moved into core beside
    `DLOCALE` and `RouteDetail` imports it. Two implementations of one date formatter is how this
    codebase ended up with four grade parsers. **The five inline `fD`/`_fmt`/`fmt` copies elsewhere
    are correct code and are deliberately NOT swept** — that is a behaviour-neutral refactor across a
    dense file, and a separate change.
  - Proven by `scripts/oneoff/probe-dates-honour-the-preference.mjs` — 15 assertions, no browser and
    no database. **Both halves of the hardening are proven load-bearing by A/B**: dropping the falsy
    guard fails 2, and removing the `T12:00:00` fails the off-by-one-day assertion and nothing else.
