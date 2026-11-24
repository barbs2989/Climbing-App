# Snow-free date per route — research rule (2026-11-24)

Owner, 2026-11-24, on the "unsure" pass: "do deeper research. Forbidden West Ridge for example has 2 routes to get
to the ridge and one of them is the couloir which is early season snow only, and then when it melts out you have to
take the Cat Scratch Gully." One yes/no for the whole season is wrong for a route like that: it is a snow climb in
June and July and a dry rock route by late August. The Conditions card knows today's date, so each route gets a
DATE: `snowFreeFrom`.

## The two answers per route

- **`snowInSeason`** (`yes` / `no` / `unsure`): does the usual line cross or climb snow on ANY normal day of the
  route's season? A route whose season is Jun–Oct and that holds snow "through June" is **yes** (June is in the
  season). A route whose season is Jul–Sep and whose text says only "snow lingers into June" is **no**.
- **`snowFreeFrom`** (`"MM-DD"` or `null`): the date from which, to the END of the season, the usual line needs no
  snow and no glacier travel at all: approach, climb and normal descent, taking the late-season way in where a
  route has one (Forbidden West Ridge: Cat Scratch gullies and the class 3 rock spur beside the Quien Sabe remnant).
  - Use the 1st or the 15th: "early August" → `08-01`; "by mid-August" / "late August" → `08-15`;
    "into July" / "through June" → `07-01`; "into mid-July" → `07-15`. When unsure between two, take the LATER date
    (snow warnings stay on longer: the careful error).
  - `null` when the line holds snow or ice all season (a real glacier, a permanent snowfield, a north-face ice
    line), when `snowInSeason` is `no`, or when the text gives no timing at all.
  - A real glacier with crevasses NEVER melts out: a glacier route keeps `null` even when its gullies and
    snowfields melt out, unless the text names a late-season way that stays off the glacier entirely.
  - The date must fall INSIDE the season (after its start). If the snow is gone before the season starts, the
    answer is `snowInSeason: no`, `snowFreeFrom: null`.
- **`lateLine`** (string or null): when the melt-out moves the usual line (a different gully, a rock rib, the
  variant named in `approach_variants`), its name as the route's own text gives it, e.g. "Cat Scratch gullies".
  Otherwise null.
- **`glacier`**: repeat the current answer unless the text plainly contradicts it; then give the new answer and say
  why. `yes` / `no` / `unsure`.

## Evidence

The route's own stored text first (approach, the ways in with their `season` lines, descent, hazards). Say in `why`
which sentence decided it, in your own short words. A web check comes later for the risky calls, so mark
`needsWeb: true` when:

- you set a `snowFreeFrom` on a route whose `glacier` is `yes` or `unsure`;
- you flip `snowInSeason` from what it is now;
- the text's timing is vague ("later in summer", "once it melts out") and you had to guess the date.

## Asymmetry

Dropping snow warnings from a day that does have snow on the line is the dangerous error. Set a date only on
evidence that the line is dry after it; otherwise `null` (warnings all season).
