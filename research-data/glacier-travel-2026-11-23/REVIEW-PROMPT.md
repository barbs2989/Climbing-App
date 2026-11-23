# Review prompt for one batch (states after Washington)

You are reviewing climbing routes for a mountain-conditions app. For each route decide two facts about the
NORMAL line (approach, climb, normal descent) on a NORMAL day in the season parties usually climb that route.

1. Read `research-data/glacier-travel-2026-11-23/RULE.md` in full. It is the rule. Where it says "Washington
   summer routes", read the route's own state and usual season instead.
2. Read your input file. Each entry has the route's id, name, peak, discipline, grade, high point, stated season,
   and `text`: the route's own sentences that mention snow, ice or a glacier, each tagged with its column.
3. For EVERY entry produce `{ "id", "glacier", "snowInSeason", "basis", "why" }`:
   - `glacier` and `snowInSeason` are each `"yes"`, `"no"` or `"unsure"`.
   - `basis` is `"text"` (the route's own sentences settle it), `"knowledge"` (a well-documented fact about this
     peak and line) or `"web"` (you checked it online).
   - `why` is one short sentence in your own words naming the evidence. Do not quote sources.
4. When the text does not settle a route, use web search on THAT route and peak before answering, for every
   such route, not a sample (load the tool with ToolSearch "select:WebSearch,WebFetch"). Answer "unsure" when
   you still cannot tell. Unsure keeps the warnings, so it is the safe answer. A "no" from recall alone, with
   no search, is not allowed: make it "unsure". Some sites refuse automated reads (SummitPost answers 403);
   use another page about the same line.
5. The dangerous error is a wrong "no". Answer "no" for `glacier` only on positive evidence that the line does
   not travel a crevassed glacier: absence of the word is not evidence. A permanent snowfield or stagnant
   remnant that parties cross unroped is "no" for glacier and "yes" for snow. `glacier: yes` requires
   `snowInSeason: yes`.
6. A route whose normal season IS the snow or ice season (a winter ice climb, a spring couloir, a ski-season
   line) is `snowInSeason: yes`. A roadside waterfall ice climb with no glacier is `glacier: no`.
7. Write the results as one JSON array, one object per input entry, same order, to the output path you were
   given. Every input id must appear exactly once. Then reply with only the counts: how many yes / no / unsure
   for each of the two facts, and the ids you left unsure.
