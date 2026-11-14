# Backlog round 3 (2026-10-29) — addendum to FILL_BRIEF.md

Every entry in your batch was researched once before (`previousAttempt` says what that search found)
and refused, mostly because the only pages describing the route's start answer 403 to WebFetch:
**SummitPost** (summitpost.org) and **The Mountaineers** (mountaineers.org route/place pages).
This round's one new lever is reading those pages in a real BROWSER. Do not repeat the plain web
searches the previous attempt already describes; go to the browser first.

## Browser (Chrome) — how

1. Load the tools in ONE call: ToolSearch `select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__tabs_create_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__get_page_text,mcp__claude-in-chrome__tabs_close_mcp`.
2. Call tabs_context_mcp once, then tabs_create_mcp to make YOUR OWN tab; use only that tab id.
   Another researcher shares the browser; never touch a tab you did not create.
3. Find the page: navigate to `https://www.summitpost.org/object_list.php?object_type=2&object_name_1=<route words>`
   (object_type=1 lists mountains, 2 routes), or a web search to get the page URL, then navigate to it
   and get_page_text. SummitPost mountain pages have a "Getting There" section; route pages an
   "Approach". Mountaineers pages: `https://www.mountaineers.org/activities/routes-places/<peak-route-slug>`.
4. NEVER click buttons, sign in, accept dialogs or submit anything. Reading only. If a page shows a
   bot check ("Just a moment…", "Performing security verification"), give up on that site.
5. Close your tab with tabs_close_mcp when the batch is done.

## Save every page you read in the browser (the copy check needs it)

For every URL you cite that WebFetch cannot open, save the page text you read to the cache so the
applier can run the 8-word copy check against it:

    url='<the exact URL you cite>'; h=$(printf %s "$url" | shasum | cut -c1-40); echo "$h"

then Write the full get_page_text output to `/Users/nathanbarber/dev/getting-there-page-cache/<h>.txt`
(outside the repo on purpose: the page text is not ours to commit).
An entry citing a page that is neither fetchable nor cached is refused.

## Still in force from FILL_BRIEF.md

Evidence rule, your-own-words rule, numbersUsed, trailhead name copied exactly from a sibling when
the route shares it, and: **a page matched to our route by NAME ALONE is not evidence** — the page
must describe a route on THIS peak that starts where you say. If the page gives only the peak's
general approach (same for every route) and our route's own start is not described, it is `low`.
A route whose name looks like a variation of a sibling (same face, same start) may share the
sibling's trailhead and drive; its approach must still end at THIS route's base, from a page.
