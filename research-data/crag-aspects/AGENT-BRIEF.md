# Crag aspect + rock research — agent brief

You research CRAGS (climbing areas) online and record, for each WALL listed under a crag:
which compass direction the wall FACES, and for the crag as a whole: its ROCK TYPE.
Your output feeds a climbing app's conditions score (sun/shade and drying time), so a wrong
direction is worse than none. Record ONLY what an online page actually states.

## Input
`research-data/crag-aspects/queue.json` is an array; you are given a list of `k` numbers.
Each entry: `{k, pid, crag, trail, region, routes, ourRock, walls:[{id,name,lat,lng,routes}], wallsOmitted}`.
`ourRock` is what the app currently believes (often from a coarse geology map; may be wrong).

## Method (per crag)
1. WebSearch the crag (use `trail` for location context), e.g. `"<crag>" <state> climbing walls facing`,
   `"<wall name>" "<crag>" faces`, `"<crag>" rock type climbing`. Prefer guidebook publishers,
   climbing databases (crag/area pages), local climbing coalitions, land-manager pages.
2. WebFetch a few of the most promising pages (area pages often list each wall with
   "south-facing", "faces west", "gets morning sun", "shady all day").
3. For each wall, decide an aspect ONLY from an explicit statement:
   - direct: "south-facing", "faces SW", "north face of the formation" → that direction.
   - sun timing: "morning sun / afternoon shade" → E; "afternoon/evening sun" → W; "sun all day"
     in the northern hemisphere → S; "shade all day" → N. Mark `how:"sun"`.
   - crag-wide: "all the walls face south", "the cliff band faces east" → apply to every wall the
     statement covers, mark `how:"crag"`.
   - A wall NAMED "South Wall"/"North Face" is NOT evidence by itself (names lie). Only use it
     when a page says that is the way it faces.
   - Formations with walls facing all ways (boulders, towers) → `aspect:"varies"` only when a page
     says so; otherwise leave unconfirmed.
4. Rock: the crag's rock type as stated online (be specific: "quartz conglomerate", "schist",
   "Wingate sandstone" → "sandstone" is fine if that is all that is stated; keep specific names
   like granodiorite, gneiss, rhyolite, welded tuff, dolomite, quartzite, basalt, conglomerate).
   If walls differ in rock, give per-wall `rock` too.
5. Do NOT guess from coordinates, maps, photos, or terrain. Unconfirmed is a fine answer.
   Spend effort proportional to `routes`; it is fine to leave small walls unconfirmed.

## Output
Write ONE file per crag: `research-data/crag-aspects/found/<k>.json`:
```json
{"k":1,"pid":"...","crag":"Indian Creek",
 "rock":{"value":"sandstone","agreesWithOurs":true,"url":"https://...","note":"<=15 words, your words"} ,
 "walls":[
   {"id":"<wall id from queue>","aspect":"SW","how":"direct|sun|crag","rock":null,"url":"https://...","note":"<=15 words, your words"}
 ],
 "unconfirmed":["<wall ids with no statement found>"],
 "searched":"<one line: what you searched>"}
```
- `aspect` is one of N NE E SE S SW W NW varies. `rock` is null when not stated online.
- Every wall id from the queue entry appears exactly once, in `walls` or `unconfirmed`.
- Notes are paraphrase in your own words — never paste sentences from the page.
- Do not edit any other file. Do not touch the database. Return a 3-line summary:
  crags done, walls confirmed / total, rock disagreements with `ourRock`.
