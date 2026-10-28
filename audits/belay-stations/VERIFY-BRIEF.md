# Verify researched belay-station sentences before they reach climbers

Another researcher wrote one sentence per pitch saying where the belay station is. Your job is to
check each sentence ADVERSARIALLY. A wrong belay location on a climbing route is worse than none.

Inputs, per batch: the stored route data (`deep-X.json`: each route's pitches with label, grade,
length, anchor and notes) and the research output (`deep-X.out.json`: per route, `review.sources`
and `belay: { "<label>": "<sentence>" }`).

For EVERY sentence:
1. Read the listed source page(s) in full with WebFetch. Never use curl or a spoofed/browser user
   agent; if a page refuses WebFetch, the sentence cannot be verified: DROP it.
2. PITCH MATCH: find the passage the sentence is based on. Does the source put this belay at the END
   of the pitch that the stored label refers to? Compare by number AND by what the pitch is (the
   stored grade, length and notes). Sources often link or split pitches; if the source's pitch N is
   not clearly the stored pitch with that label, DROP it.
3. SUPPORT: every fact in the sentence must be stated by the source (location, feature, anchor).
   Anything added, guessed or embellished: DROP (or KEEP with a corrected sentence that removes only
   the unsupported part — corrected text must still be our own words, under 200 characters, and name
   no source).
4. COPYING: if the sentence shares 8+ consecutive words with the source, DROP it or reword it.
5. It must say WHERE the belay is, not only the anchor kind.

Output: write ONE JSON file to the path you are given:
{ "<route id>": { "<label>": { "keep": true|false, "why": "<one short reason>", "text": "<final sentence if kept, possibly corrected>" } } }
Cover every sentence in the research outputs. Then reply with one line:
`verified <n> sentences: <kept> kept (<corrected> corrected), <dropped> dropped`.
