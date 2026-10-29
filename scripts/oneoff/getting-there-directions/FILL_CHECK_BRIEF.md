# Second check of researched getting-there text — brief

Research only. Do not touch any database, app code, or git.

Another researcher wrote, for each route in your input file, a trailhead name, a driving direction
and an approach paragraph, and listed the pages it relied on. **Your job is to check it
independently, by opening pages yourself.** Assume nothing in it is right until a page you fetched
says so. Earlier rounds of this work found real errors only because the second check opened the
page: a turn written for drivers coming from the other direction, mileages no page gave, a drive
over a bridge that is closed, a road washed out since the summer.

## For each entry

1. Open the cited pages (WebFetch; or `curl -sL -A "Mozilla/5.0" <url>` through Bash), and search
   for at least one more current page about the road (land-manager road status, current alerts).
2. Check: is this the trailhead THIS route is climbed from? Is every road number, turn, mileage,
   distance, elevation and time in the text stated by a page you opened? Is the road open (a
   current or year-round closure must be in the drive, dated)? Does the approach end at the base
   of THIS route (not at a different route's start, and not continuing into the climb)?
3. Verdict:
   - `confirmed` — every fact is backed by a page you opened. Copy the text unchanged.
   - `corrected` — some fact was wrong or unsupported; fix it, or delete the unsupported part,
     keeping the text in our own words (no 8-word run from any page; no source, site, book or
     person named; no "according to"). The trailhead name must still appear in the approach.
   - `rejected` — the trailhead is wrong for this route, or too little can be backed to write
     anything useful, or no page could be opened.
4. Keep the drive to DRIVING ONLY (town or junction to the trailhead parking). Keep the approach
   from the trailhead to the base of the route.
5. `numbersUsed` must list EXACTLY the digit groups in the final `trailheadDirection` + `approach`,
   each once ("FR 4616" → "4616", "5,400 ft" → "5400").

## Output

Write a JSON array to the output file named in your prompt, one object per input entry, same order,
rewritten every 8 entries:

    { "id": "<copied>", "verdict": "confirmed"|"corrected"|"rejected",
      "trailhead": "<final>", "trailheadDirection": "<final>", "approach": "<final>",
      "numbersUsed": ["..."], "confidence": "high"|"medium"|"low",
      "sourceUrls": ["pages YOU opened"], "note": "<one line: what you changed and why, or why rejected>" }

Return to the caller only the counts per verdict and a one-line list of each correction
(route: what changed).
