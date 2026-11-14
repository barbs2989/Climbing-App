# Verify existing driving directions — brief for each research agent

Research only. Do not touch any database, app code, or git.

A climbing app shows, on each route, a trailhead name and a short **driving direction** to that
trailhead. You are given a batch file `verify-N.json`: an array of entries, each with `i` (an id —
copy it back), `trailhead` (the stored name), `trailheadDirection` (the text the app shows today),
`routes` (up to 4 route ids, which name the peak and route — context for which trailhead is meant)
and `routeCount`.

## For each entry

Check the stored direction against CURRENT sources: Washington Trails Association hike pages, US
Forest Service and National Park Service pages (including current alerts and road status),
Mountain Project, and similar. Use WebSearch (mode "extended" when standard is thin) and WebFetch.
Prefer the trailhead's own page and official agencies over a forum post.

Check: the start town or junction; highway, Forest Road and road numbers; turn directions;
mileages and mileposts; the trailhead it ends at; and whether the road is currently closed,
washed out or gated **year-round** (seasonal winter closures are normal; only flag them if the
text claims something false about them).

Give one verdict:
- `accurate` — the text matches current sources (rounding like "about 8 miles" vs 8.3 is fine).
- `fix` — a source you can cite contradicts a specific fact (wrong road number, wrong turn, a
  mileage off by more than ~20%, a wrong start, a trailhead or road that has since been
  closed/decommissioned/moved). Write a corrected text.
- `not-directions` — the text is not a drive at all (it is a walk, a bearing, or nothing usable).
  Write a drive if you can source one.
- `unverifiable` — you could not find a source that confirms or contradicts it. Do NOT mark a
  text wrong just because you could not confirm it.

## Writing a corrected text (`fix` / `not-directions`)

One to three sentences of DRIVING ONLY: start at a named town or highway junction, end at the
trailhead parking. Keep what was right in the old text; change only what the source contradicts.
Road numbers and mileages only as a source gives them. Your own words; no quoting, no "according
to", never name or link a website, guidebook or app in the text. No coordinates, no emoji. Do not
describe the walk, the trail or the climb.

## Evidence rule (added after batches 1–2, which were too shallow)

- **Fetch the page.** A verdict of `accurate`, `fix` or `not-directions` with a drive written needs
  at least one page you actually opened with WebFetch (a search snippet is not enough). List only
  fetched pages in `sourceUrls`. If no page could be opened, the verdict is `unverifiable`.
- Do every entry. If you run out of time, mark the rest `unverifiable` with problem "not checked".
- A text that only names the trailhead ("From the Cascade Pass Trailhead") is `not-directions`; it is
  not wrong, so write a drive only when a fetched page gives one.
- `numbersUsed` must list EXACTLY the digit groups in `correctedDirection` ("SR-20" -> "20",
  "22.5 miles" -> "22.5", "FR-2610" -> "2610"), nothing else.

## Output

Write a JSON array to `verify-N-out.json` (same folder, same N), one object per input entry, same
order. Rewrite the file after every 10 entries so partial work survives an interruption.

    { "i": <copied>, "verdict": "accurate"|"fix"|"not-directions"|"unverifiable",
      "problem": "<one sentence: what is wrong, or ''>",
      "correctedDirection": "<text, only for fix/not-directions, else ''>",
      "numbersUsed": ["every number in correctedDirection, as strings"],
      "confidence": "high"|"medium"|"low",
      "sourceUrls": ["URLs used — for the owner's review only"] }

Confidence: `high` = an official page or two agreeing sources; `medium` = one good current source;
`low` = a single old or forum source. Return to the caller only counts per verdict and a one-line
list of each `fix` (trailhead: what was wrong).
