# Research brief: why a party takes each other way in

Owner's note (2026-10-28): "Declare which approach is most common per route and explain why others
would use the other approach. Research online."

The route page lists several ways in for a climb. One is marked **Most used** (`primary: true`).
Under every OTHER way in we now show one line, **Why go this way**: when, and why, a party would
take it instead of the most used one.

## Your input

A JSON file of routes (`audits/approach-why/in/bNN.json`). Each has `id`, `name`, and `ways`: each
way in's exact `name`, whether it is `primary`, its `season` window and `notes`. `priorPrimaryResearch`
is an earlier session's note on which way is most used, when there is one.

## What to do for each route

1. Read the stored ways in. Then research online: WebSearch (mode "standard"; "extended" only when
   standard comes back thin) and WebFetch on Mountain Project, SummitPost, Washington Trails
   Association, Peakbagger, NWHikers, CascadeClimbers, USFS/NPS pages, The Mountaineers. Mountain
   Project answers a fetch; SummitPost often refuses, so lean on search snippets for it. Two or three
   pages per route is usually enough; do not spend more than ~6 tool calls on one route.
2. For each way in that is NOT primary, write `why`: ONE sentence, at most ~200 characters, saying
   when or why a party chooses it over the most used way. Good reasons are concrete:
   - season or snow ("early season, while the couloir still holds snow"; "late season, once the
     glacier is too broken")
   - access ("when the Forest Service road to the main trailhead is washed out or gated")
   - combining objectives ("when linking the climb with the traverse to X")
   - avoiding a hazard ("to avoid the Thunder Creek ford in high water")
   - shorter/faster but harder ("shorter, but a steep off-trail bushwhack; for parties who know the
     area"), permits/quotas, camping, party skill.
   Start with the situation, not a generic phrase. Not "This is an alternative approach."
3. If the route has NO primary way in, decide which is most used from the evidence and give it as
   `primary` (the exact way-in name). If the evidence is genuinely weak or split, leave `primary`
   out and say so in `review.notes` (the route is then skipped; that is fine). If a way in is
   unlawful (e.g. crosses the Canada border off a port of entry), it must never be primary.
4. If the stored data contradicts the evidence (a non-primary way's own notes say it is "the line
   most parties use"; the marked primary looks wrong), do NOT change the mark: record it under
   `problems` for the owner. Still write the `why` lines if you can do so honestly; if the
   contradiction makes a `why` impossible to write honestly, leave that way in out.
5. If you cannot find any evidence for a way in, you may still write a `why` from the stored notes
   and season when they clearly say why (e.g. notes "exists only to avoid the ford"), and set
   `review.fromStoredNotes` listing those way-in names. Never invent a reason.

## Hard rules for the `why` text (a script refuses violations)

- **Our own words.** Facts may come from a page; sentences may not. Never copy 8 or more words in a
  row from any page. Write it fresh.
- **No sources in the text.** Never name a website, guidebook, author or "trip reports" ("per
  Beckey", "Mountain Project says", "according to"). The sources go in `review.sources` only.
- No ALL CAPS words, no emoji, plain sentence case, ends with a full stop.
- Use the exact way-in `name` strings from the input as keys.
- Do not write anything to the database or edit any repo file other than your output file.

## Output

Write `audits/approach-why/out/bNN.json` (same NN as the input), an object keyed by route id:

```json
{
  "wa_example_route": {
    "primary": "Only when the route had none marked: exact name",
    "why": { "Exact non-primary way-in name": "Early season, while the gully still holds snow and covers the loose rock." },
    "review": { "sources": ["https://..."], "notes": "one or two lines on the evidence", "fromStoredNotes": [] },
    "problems": ["optional: contradictions for the owner"]
  }
}
```

Include every route in the input, even one you could not do (then `why: {}` and a note).
Return a short summary: routes done, ways in given a reason, routes skipped and why, problems found.
