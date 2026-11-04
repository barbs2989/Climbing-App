# Season research brief — SYSTEM mode

Same goal and evidence rules as BRIEF.md in this folder (read it first): find the climbing SEASON as
calendar months, from sources that name months, never from guesses or climate reasoning alone.

Difference: you are given crag SYSTEMS (a park, gorge, canyon or crag cluster), each with the list
of its sub-areas. Guidebooks and land agencies usually publish one season for a whole system
("Red Rocks: October to April"). Your job per system:

1. Find the system's rock-climbing season (months), with the BRIEF.md evidence rules.
2. Decide which of the listed sub-areas that window genuinely applies to. A window applies to a
   sub-area only if the sub-area is part of that system as the sources describe it AND nothing
   says it climbs in a different season. EXCLUDE a sub-area when:
   - the system spans a big elevation range and the sub-area sits much higher or lower (e.g. Mount
     Lemmon: the lower highway is a winter crag, the upper mountain a summer one);
   - a source says that sub-area is shaded/sunny enough to have a different season;
   - it is an ice/mixed venue, or you cannot tell what or where it is.
   If the system is too big or varied for one window (a whole mountain range, a region spanning
   desert and alpine), return season_months null and say so.
   IMPORTANT: a window written on the system reaches EVERY sub-area (and everything below it) that
   has no season of its own. So it is written on the system only when you exclude nothing; when you
   exclude any sub-area, only the sub-areas in applies_to get it.
3. Sub-areas that are excluded may get their own window ONLY if a source names months for them.

Output: write a JSON file (the path is in your task) shaped
{ "<system id>": { "name": "...", "season_months": [..] or null, "confidence": "high"|"medium"|"low",
    "sources": ["url", ...], "note": "one line",
    "applies_to": ["<sub-area id>", ...],
    "excluded": { "<sub-area id>": "why" },
    "own_windows": { "<sub-area id>": { "season_months": [..], "sources": ["url", ...], "note": "..." } } } }
List every system you were given. Reply with a 2-3 line summary only. Touch no database and no other file.
