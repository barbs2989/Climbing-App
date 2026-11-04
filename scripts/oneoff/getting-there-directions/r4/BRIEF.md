# Re-check dated road/trail closure claims — research brief (round 4)

Research only. Do not touch any database, app code, or git. Today is 2026-10-29.

A climbing app shows each route's road and access notes. Each entry in your input file has
`id` (route id: it names the peak and route), `field` (which note), and `text` (what the app shows
today). `npm run audit:expiring-closures` flagged every one as stating a closure or condition with a
SHELF LIFE (an "until further notice", a "since <date>", a dated reopening, a period like "as of
2021", or an end date that has passed). Your job: find out whether each claim is STILL TRUE TODAY.

Many entries share one road or one closure: research each ROAD/CLOSURE once, then apply the answer
to every entry naming it.

## Sources
Land-manager pages first: the national forest's Alerts & Notices / road status pages, the National
Park's current conditions / road status / fire closures pages, WSDOT, county road pages, B.C.
DriveBC / Ministry of Transportation advisories. Then WTA hike-page alerts and trip reports.
**When sources disagree, the land manager wins**; record the disagreement. Use WebSearch (mode
"extended" for anything recent) and WebFetch. A verdict other than `unverifiable` needs at least one
page you actually OPENED with WebFetch that states the current status (a search snippet is not
enough). Prefer pages dated in the last 2 months.

## Verdicts, per entry
- `accurate`: still true as written (the dates it names are right and the closure still stands, or
  the reopening still holds).
- `fix`: a fetched page contradicts it (it has reopened, the closure is now dated differently, an end
  date has passed, the closure has an end date we omit, the year in a posted seasonal window is
  stale). Write `corrected`: the SAME note rewritten with only that change; keep every other true
  sentence. Date a current closure the way the source does ("since July 2026", "order in effect to
  Dec 31, 2027"). For a lapsed claim, say what is true now. Never write "currently" or "as of
  today" without a date.
- `unverifiable`: no page you could open says either way. Do NOT call it wrong for want of a page.

## Writing rules for `corrected`
Your own words: never copy 8 or more consecutive words from any page. Never name or link a website,
guidebook, app or web page as a SOURCE ("according to WTA", "per the park's page"). Naming the
agency that manages the road as who issued an order or who to call is fine ("a Forest Service
order", "Mount Baker Ranger District"). No emoji, no ALL CAPS, no coordinates. Same length or
shorter than the old text where you can.

## Output
Write a JSON array to `<input-name>-out.json` beside the input file (e.g. `olympic-out.json`), one
object per input entry, same order; rewrite it after every 10 entries so partial work survives.

    { "id": "...", "field": "...", "verdict": "accurate"|"fix"|"unverifiable",
      "problem": "<one sentence, or ''>", "corrected": "<only for fix, else ''>",
      "confidence": "high"|"medium"|"low", "sourceUrls": ["fetched pages only"] }

high = an official page, or two agreeing sources; medium = one good current source; low = one old or
forum source (low is never written to the app). Return to the caller only: counts per verdict, one
line per `fix` (id/field: what changed), and any land-manager vs other-source disagreement.
