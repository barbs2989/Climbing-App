# Settle brief: which way in is MOST USED, where the research disagreed

Read audits/approach-why/BRIEF.md first: every rule there about the `why` text still applies (our own
words, no sources named in the text, at most ~200 characters, exact way-in names, no ALL CAPS).

The first research pass wrote a `why` for each alternative way in, and flagged routes where the
stored **Most used** mark (`primary: true`) may be wrong. Each route on your list names the batch
output (`audits/approach-why/out/bNN.json`) that holds its `problems` note and its current `why`
lines, and the census row is in `audits/approach-why/census.json` (exact way-in names, which one is
primary, notes, season).

## For each route

1. Research which way in most parties actually take TODAY, with WebSearch in **extended** mode and
   WebFetch on the pages it finds (land agency pages first: NPS, USFS, then Mountain Project,
   SummitPost snippets, WTA, Peakbagger, recent trip reports, The Mountaineers). Look for at least
   two independent sources. Current closures count: a way in whose road or trail is closed now is
   not the most used now, even if it was the standard for decades.
2. Decide one of:
   - **keep** the stored mark (most cases where evidence is split: do not move a mark on a hunch);
   - **move** the mark to another way in: only with two or more independent sources that say so;
   - **set** a mark on a route that has none (same two-source bar), or leave it unmarked.
3. BORDER RULE. A way in that enters the United States on foot from Canada away from a port of
   entry (e.g. Depot Creek from the Chilliwack Lake road; Frosty Mountain / Manning Park south to
   the border) must never be the Most used mark, even when it is the most common, because the app
   would be recommending an unlawful crossing. Confirm the law first from an official page (CBP, NPS
   North Cascades or the US/Canada border guidance) and put its URL in sources. If it is unlawful
   and it is currently primary, move the mark to the most used LAWFUL way in. Its own `why` may then
   say plainly what it is, e.g. "Shortest and historically the usual way, but it enters the US on
   foot away from a port of entry, which is unlawful without prior authorisation." Use the law's
   real terms as the official page states them; do not invent a permit.
4. After a move or a set, the way in that is now primary must have NO `why`, and the way in that
   lost the mark NEEDS one: write it.

## Output

`audits/approach-why/settle/sN.json` (your file name is in your prompt), keyed by route id, in the
same shape as a batch entry, plus a decision:

```json
{
  "wa_route": {
    "decision": "keep | move | set | unmarked",
    "primary": "exact name — ONLY for move or set",
    "movePrimary": true,
    "why": { "every non-primary way-in name": "its sentence (copy the batch one when it still holds)" },
    "review": { "sources": ["at least two URLs for a move or set"], "notes": "the evidence, one or two lines" }
  }
}
```

`movePrimary: true` only for a move. For `keep`, give `why` only if a batch line needs correcting,
else `{}`. Write nothing to the database and no other file. Return a short summary: decisions per
route with the one-line reason.
