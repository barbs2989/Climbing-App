# Guidebook walk-in pass: brief for research agents

You read guidebook paragraphs (OCR text from published climbing guidebooks) and decide, for each crag or
peak in your input file, whether the book tells a climber HOW TO WALK TO IT. When it does, you write the
walk-in in your own words.

## Input
`in-NNN.json`, an array of areas:
`{ id, name, state, path, type, routes, lat, lng, parking_name, parking_note, blurb, passages: [{book, year, page, text}] }`.
`path` is the area's place in our tree, e.g. `usa.colorado.co_estes_park_valley.co_lumpy_ridge.co_crescent_wall`.
Each passage is three paragraphs in a row from the book, split by `---`. The middle one named the area.

## Decide for each area
1. **Is it the same place?** The book must be describing THIS area: the same crag/wall/peak, in the same
   region its `path` names. Many names repeat ("Goat Mountain", "The Slabs", "Wood Yard"). If the book's
   place is a different one, or you cannot be sure, it is NOT a match. When unsure and the area is a
   crag with 5+ routes, you may run ONE web search (e.g. "<name> <parent area> climbing") to confirm it is
   the same place. A search snippet confirms identity only; it is never a source for walk-in facts.
2. **Does the book say how to walk there?** It must describe the walk from where you leave the car/trail
   to the base: direction, trail taken, landmarks, what you cross, how long. A sentence that only says
   where the crag IS ("the cliff is above the river") or only covers driving is NOT a walk-in.
   A walk-in for a NEIGHBOURING crag that this one is reached FROM counts only if the book says so
   ("continue 5 minutes past X to reach Y").

## Write (only when both answers are yes)
- `approach`: the walk, IN YOUR OWN WORDS, 1-4 sentences, max 450 characters. Start from the trailhead,
  trail or parking area the book names (naming it is fine: "From the Twin Owls lot, take the Gem Lake
  Trail..."), then direction, landmarks and the final scramble to the base. Present tense, second person
  or imperative, written for a climber.
- `approach_min`: walking minutes ONLY when the book states a time for this walk (integer; "half an hour"
  = 30, "10-15 minutes" = 15 (the upper end), "1 hour" = 60). Otherwise null. Never compute it from a distance.
- Keep a distance when the book states one ("about 1.5 miles"), as written; never convert or compute.

## Never
- Never copy: no run of 8 or more words in a row the same as the book. Rephrase and reorder. A checker
  rejects copies.
- Never write driving directions, road numbers, highway mileposts, how to drive to the lot, fees, permits,
  passes, gates, closures, seasonal restrictions, raptor closures, private-property warnings, or "ask
  permission" lines (they go stale, and this column is the walk only).
- Never name the book, an author, a website or "the guidebook". No "according to". No source of any kind.
- Never write about the pipeline ("the passage says", "the text", "OCR", "our catalog", "this area in the
  app").
- No hazards or safety sermons unless the walk itself needs them to be followed ("cross the creek on the
  log").
- Do not invent a landmark, a direction or a time the passage does not state. Garbled OCR you cannot read
  with confidence: skip that area.
- No ALL CAPS words, no emoji.

## Old books (the passage's `year` is before 2005, or missing)
Trails get rerouted and crags close. For each area you are about to WRITE from such a book, run ONE web
search ("<crag name> <parent area> climbing approach"). Skip the area (match true, approach null, say why)
if a current page shows the crag is closed to climbing, or reached by a clearly different walk now. A
search snippet is never a source for the words you write; it only vetoes.

## Self-check before you finish (required)
Run `python3 /Users/nathanbarber/dev/guidebook-walkins/collect.py NNN` (your batch number). It prints
REFUSED lines for copies (8 words in a row shared with the passage), banned words and length. Reword
every refused approach (change word order and vocabulary, keep the facts) and re-run until it prints no
REFUSED line, or drop that area to approach null.

## Output
Write `out-NNN.json` (same NNN as the input) beside the input, an array with one object per input area:
`{ "id", "match": true|false, "approach": string|null, "approach_min": int|null, "book": "<book id used>",
  "why": "<one short line: why it is or is not the same place, and which passage>" }`.
Save the file once at the end (or after every 10 areas if the input is long). Report only a one-line
count when done: N written, M skipped.

## Scratch scripts
If you write a helper script, name it /Users/nathanbarber/.claude/jobs/caec4c08/tmp/gw-<batch>-<name>.py. Never run a script you did not write (other sessions share /tmp).

## No public access
If a search shows the crag is guided-only or closed to the public (e.g. Sky Top in the Gunks, Hueco East Mountain), write approach null and say why.

## Crags and walls only
Write nothing for an alpine PEAK or a mountain summit (type peak, or a crag row that is really a summit such as a 14er): each route on a peak has its own approach. Rock formations (spires, domes, buttresses, crag "mountains") are fine.
