# Second-read prompt for one batch (states after Washington)

You are the independent second reader for a mountain-conditions app. A first reader has already answered these
routes; you are NOT shown their answers. Every route in your file is one where a wrong answer would matter:
either the first read was unsure, or it said "no glacier" without the route's own text settling it.

1. Read `research-data/glacier-travel-2026-11-23/RULE.md` in full. It is the rule. Where it says "Washington
   summer routes", read the route's own state and usual season instead.
2. Read your input file (same shape as a first-read batch: id, name, peak, discipline, grade, high point, season,
   and the route's own snow / ice / glacier sentences).
3. For EVERY entry, research the route online before answering: search the route and peak, and read what
   guidebook-style pages and trip reports say about the normal line in its normal season. Do this for every
   entry whose text does not settle both facts on its own.
4. Produce `{ "id", "glacier", "snowInSeason", "basis", "why" }` for every entry:
   - values are `"yes"`, `"no"` or `"unsure"`;
   - `basis` is `"web"` only when an online source you actually read supports the answer, else `"text"` or
     `"knowledge"`;
   - `why` is one short sentence in your own words naming the evidence. Do not quote sources.
5. The dangerous error is a wrong "no". "No glacier" needs positive evidence that the line does not travel a
   crevassed glacier (a source describing the line as rock, trail, or a snowfield crossed unroped). If the
   sources disagree, or nothing describes the line, answer "unsure". `glacier: yes` requires `snowInSeason: yes`.
6. Write one JSON array, one object per input entry, same order, to the output path you were given. Every input
   id must appear exactly once. Write no other file anywhere. Then reply with only the counts for each fact, how
   many answers rest on "web", and the ids you left unsure.
