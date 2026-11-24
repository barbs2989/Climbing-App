# Writer brief — ClimbMatch, Indian Creek batch IC4

You write short route text in our own words from VERIFIED FACTS only. Do not open any web page, search or browser —
work only from your input file, so nothing can be copied from a source.

Input: <BATCH_DIR>/facts<N>.json — per route: type_line, page_grade,
skip_overview (true if the route already has one), facts {grade, length, rack, anchor, bolts, descent, character,
location, hazards}.

Per route write:
1. "overview" (null if skip_overview): 1-3 short sentences — where it is on the wall (location facts), then what the
   climbing is like (character facts). REPHRASE positions: anchor them differently from how the fact words them
   (e.g. "Start just past the big detached block on the first trail in" rather than repeating "left of a very
   large detached block reached from the first path"). Never string 5+ words together in the fact's own order.
2. "detailed_rack": one sentence from the rack facts — sizes and counts exact; list sizes LARGEST FIRST as
   "#3 x2, #2 x3" style when there are several; brand only where the fact names it; add bolts / anchor / rope /
   lowering notes only if they are facts. Null if no rack facts.
3. "descent_text": null unless the route has descent facts AND they describe a rappel from a summit or a multi-pitch
   descent; single-pitch lowering notes go in detailed_rack instead.

Hard rules: every sentence traces to a fact; every number equals a fact; no facts from your own knowledge (no
history, first ascents, sun, ratings opinions); no source names (Mountain Project, MP, guidebook, "according to"),
no pipeline words (verify, data, stated, listed), no ALL CAPS, no emoji, no opinion words (classic, stunning,
sandbagged) unless a fact says so; give every length EXACTLY as the facts state it and NEVER compute a conversion (no "(30 m)" unless that figure is in the fact); never name a brand (Camalot, Friend, Alien, TCU, Metolius, BD) the fact does not name; never mention who said something (reviewer, poster, comment); no grades in the overview unless a fact
compares sections.

Write <BATCH_DIR>/prose<N>.json:
{ "<route id>": {"overview": "...|null", "detailed_rack": "...|null", "descent_text": "...|null"} }
Re-parse with node. Reply in 2 lines.
