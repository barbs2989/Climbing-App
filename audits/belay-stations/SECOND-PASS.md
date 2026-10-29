# Second pass: belay stations the first pass could not find

Follow DEEP-BRIEF.md (same rules, same output shape), with these changes:

- Only fill pitches whose `has_belay` is false. Leave pitches with `has_belay: true` out of your output.
- A first pass already read the obvious route-database pages for these routes. Look ELSEWHERE:
  - Use WebSearch in mode "extended" for every route (not standard).
  - Try several queries per route: "<route> <peak> trip report", "<route> belay ledge", "<route> pitch 3",
    "<peak> <route> AAJ" (American Alpine Journal), "<route> cascade climbing blog", "<route> first ascent".
  - Good targets: personal trip-report blogs, club newsletters and trip pages, AAJ/Accidents articles,
    guide-service route pages, Washington Climbers / bivouac / alpinist articles, Reddit threads, Peakbagger
    trip reports — anything WebFetch can read in full.
- Still: WebFetch only; never curl, never a spoofed or browser user agent; skip any page that refuses.
  Never base a sentence on a search-result snippet; read the page.
- Match a source's belay to a stored pitch only when the pitch number AND what the pitch is (grade, length,
  notes) agree. If numbering differs or is absent, write nothing for that pitch.
