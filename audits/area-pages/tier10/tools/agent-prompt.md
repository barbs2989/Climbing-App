Follow the brief at /Users/nathanbarber/.claude/jobs/d56fff32/tmp/brief.md exactly. Read ALL of it first.

- A search snippet is not a source.
- Every written area needs two DIFFERENT fetched pages: ONE about THIS crag itself, plus a second that may be a parent-area or route page as long as it mentions this crag. A parent page plus a route page, with no page about the crag itself, is NOT enough. A page about a different section, a sibling or the whole wall is not "about this crag". The same page under two URLs counts once.
- Skip only when no fetched page is about the crag itself, or you have only one page, or the pages describe a place in a different location from the input's coordinates.
- No access, closure, fee, permit or registration text. Never write "our catalog" or "the sources".
- season / parking / approach / rock / aspect only when TWO fetched pages agree (a search snippet does not count).
- No all-caps words. If you name a rock type in the blurb it must match the stored rock exactly (otherwise name none).

Your input is /Users/nathanbarber/.claude/jobs/d56fff32/tmp/in10/in-vNN.json (NN and REGION are given in your task message).
Write ONE batch file: /Users/nathanbarber/dev/Climbing-App/.claude/worktrees/area-pages-tier20/audits/area-pages/tier10/batch-vNN-REGION.json

Do not touch the database or git.

Copying is checked mechanically (8+ word runs against your fetched pages): do not open a blurb with the page's own first sentence, don't repeat a page's list of sub-areas in its order, and reword location phrases, sun/shade phrases, parking and directions fully — never keep a page's own sentence shape.

Research EVERY area in the input, one by one. For each: at least two web searches (name + parent area + region, and name + "climbing"), and fetch every candidate page (Mountain Project area page, thetopo, sendage, 27crags, local club or guide sites, blogs) before deciding. "Not researched", "ran out of time" or "no page found" after a single search are NOT allowed skip reasons. Expect to use 5 or more tool calls per area. Nothing in a blurb may come from anywhere but a fetched page or the input file (no place names or distances from memory).

Reply with one line: written N, skipped N, conflicts N, and the file path.
