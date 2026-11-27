# Guidebook walk-in pass (owner note, 2026-11-26)

> "Look through all the Guide books again to find how to get their location trail information about how
> to get there ... for each route I guess that would mean an area or crag or wall"

Reads every guidebook the harvest pipeline has already pulled (306 books, ~482k OCR paragraphs in
`~/dev/guidebook-harvest-data/books/gb-*.json`) and fills a crag's or wall's **walk-in**
(`areas.approach` + `approach_min`, shown under *Getting there › Walk in* on the area page and on every
crag climb with no approach of its own) where the area has none.

**What is written, and what is not.** The standing rule (2026-10-01) holds: no ACCESS facts from a
book, since roads, permits and closures go stale. So only the walk from the trailhead or lot to the base
is written. Driving directions, road numbers, fees, permits, gates and closures are refused by
`collect.py`. Alpine peaks get no area walk-in, because each route on a peak has its own approach. A
crag a current page shows closed, guided-only or reached a different way now is skipped. The
old-book rule: for a book before 2005, one search per area may only veto, never supply words. Every
sentence is our own (`collect.py` refuses 8+ words shared with the passage) and names no source.

## Flow
1. `areas-all.json`: every area from the nightly static snapshot (`<pages>/states/*.json.gz`), no DB.
2. `python3 build.py`: name n-grams within punctuation, generic names (>120 hits) dropped, book state
   inferred from state-unique names, homonyms kept only when an ANCESTOR area is named within 25
   paragraphs. Output `cands-raw.json`.
3. `python3 rank.py` → `cands.json` (best passage score ≥ 4), split into `in/in-NNN.json` (20 each, busiest first).
4. Sonnet agents follow `BRIEF.md` → `out/out-NNN.json`, self-checked with `collect.py NNN`.
5. `python3 collect.py` → `fills/fills-all.json` (minus `drop.txt`) = `fills-final.json`.
6. `node scripts/oneoff/apply-crag-approach.mjs fills-final.json [--apply]`: fill-only (an area with an
   approach is never overwritten), paced at 1.2 s per write, re-read per row, rollback file written.

## Result (2026-11-26)
968 candidate areas → 260 walk-ins (73 with a stated time) across 19 states, covering 3,310 climbs.
The other ~700 were a different place with the same name, a passage with no walk, an alpine summit,
garbled OCR, or vetoed by a current page (about 40: rerouted trails, new lots, closures,
guided-only Hueco East Mountain and Sky Top). The ~1,060 areas that `build.py` paired with a passage
but `rank.py` scored below 4 carry no approach wording, so they are not a backlog.
