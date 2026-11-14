# Crag walk-in research — brief for each research agent

Research only. Do not touch any database, app code, or git.

A climbing app shows on every route at a crag the crag's own **walk-in**: one short paragraph on
where to park and how to walk to the base of the wall. The crags in your batch file have none. Most
are Washington ice and drytooling crags. Each entry carries `area_id` (copy it back), `crag`,
`parent` (the area above it), the crag's `lat`/`lng`, a few `routes` on it, and `parkingNote` if one
is stored already.

## For each crag

1. Find a page that describes how to reach THIS crag: the Mountain Project area page for the crag
   or its parent (its "Getting There" or description section; fetch with
   `curl -sL -A "Mozilla/5.0" <url>` through Bash, or WebFetch), Washington Trails Association,
   Forest Service, Park Service, Washington State Parks, Department of Natural Resources, county
   parks, or a climber's trip report. SummitPost and mountaineers.org answer 403; skip them.
2. Check that the page is about this crag (the `lat`/`lng` and route names help), and look for
   access problems: private land, a closure, a seasonal gate, a permit or pass (Discover Pass,
   Northwest Forest Pass, Sno-Park permit), or a request from the land manager.

## Writing (three fields, because the app shows them in three places)

- `trailhead`: a short place name for where you park ("Banks Lake pullout (SR 155 milepost 18)").
- `trailheadDirection`: DRIVING ONLY, one or two sentences, from a named town, junction or exit to
  that parking. A pass or permit (Discover Pass, Sno-Park, Northwest Forest Pass) and a dated
  closure may go here; nothing about walking, trails, lakes, passes or the climbing.
- `approach`: the WALK from the parking to the base of the crag, one to four sentences. It MUST
  contain the `trailhead` text exactly. No roads or driving.
- **Our own words.** Never copy 8 or more words in a row from any page; a machine checks every
  page you cite and refuses the entry. No quotes, no "according to", never name or link a website,
  guidebook, app or person. No coordinates, no emoji, no ALL CAPS.
- Mileages, mileposts, exits, road numbers, distances and times only as a fetched page gives them.
- `numbersUsed`: EXACTLY the digit groups in `trailheadDirection` + `approach` together ("I-90" →
  "90", "Exit 38" → "38", "milepost 54.6" → "54.6", "1,200 ft" → "1200"), each once.

(Not `areas.approach`: that column is the walk only, by design, and the crag WALK-IN it feeds
renders only on rock routes — these crags' ice and mixed routes show their own trailhead card.)

## Evidence rule

- `found: true` needs a page you actually opened that describes the way to THIS crag. A search
  snippet is not enough. List only fetched pages in `sourceUrls`, the crag's own page first.
- `confidence`: `high` = the crag's own page plus an agreeing second page, or an official page;
  `medium` = one good page about this crag; `low` = a page about a neighbouring crag, or vague.
  Low is never written; say so honestly.
- If you cannot find it, `found: false` with a one-line `note`. Do every crag.

## Output

Write a JSON array to the output file named in your prompt, one object per input crag, same order,
rewritten every 8 entries:

    { "area_id": "<copied>", "found": true|false, "trailhead": "<name>",
      "trailheadDirection": "<drive>", "approach": "<walk>",
      "numbersUsed": ["..."], "confidence": "high"|"medium"|"low",
      "sourceUrls": ["..."], "note": "<one line: what you relied on, or why not found>" }

Return to the caller only the counts by found and confidence.
