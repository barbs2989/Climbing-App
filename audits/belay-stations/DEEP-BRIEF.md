# Deep research: belay stations, pitch by pitch

You are filling one field for a climbing app: for each stored pitch of each route in your batch
file, WHERE THE BELAY STATION IS — where the belayer stands at the end of that pitch and how a
climber finds it ("a sloping ledge with two bolts on the left wall, just above the chimney exit";
"the big tree on the ledge right of the dihedral"; "hanging stance at a two-bolt anchor under the
roof"). This is for climbers on the route, so precision matters more than coverage.

A quick search pass already found NOTHING for these routes. Your job is a DEEP pass: read whole
pages, not snippets.

## Method
1. For each route, run WebSearch (mode "extended" is fine here; these are hard to find) with the
   route name + its peak/crag/area + words like "pitch", "belay", "ledge", "topo", "trip report".
2. READ FULL PAGES with WebFetch only. Never use curl or any tool with a spoofed or browser user
   agent, and never work around a site that blocks automated reads (that is bot-check circumvention
   and is not allowed). If a page refuses WebFetch, skip it and find another: trip-report blogs,
   club and guide-service pages, theCrag, OpenBeta, and the text WebSearch returns. Read the route
   description AND any trip reports or comments on the page; belay ledges are often named there.
3. Aim for 2+ independent pages per route. A single clear source is enough for a pitch.
4. Match each stored pitch to the source by WHAT THE PITCH IS (the stored grade, length and notes
   describe it), not only by number. Many sources link or split pitches differently. If you cannot
   tell which stored pitch a source's belay belongs to, SKIP that pitch.

## Rules — do not relax them
1. Facts come from a source; sentences are OURS. Never reuse 8 or more consecutive words from any
   page (a script checks every sentence against every URL you list and refuses copies).
2. Never name a source or a person in a sentence ("per MP", "the guidebook says", "Beckey").
3. Write NOTHING for a pitch the sources do not locate. No guessing from grade, length, pitch count,
   or "it is probably a ledge". Empty is the correct answer when the record is silent.
4. One plain sentence per pitch, under 200 characters, sentence case, no ALL CAPS.
5. Say WHERE the station is. Do not answer with only the anchor kind ("two bolts").
6. A travel leg (approach, snowfield, scramble, walk-off) usually has no belay station: skip it unless
   a source describes a specific belay stance there.
7. Use the stored label EXACTLY as given in your batch file (e.g. "3", "P3", "Chimney pitch").

## Output
Write ONE JSON file to the output path you were given, exactly this shape:
{
  "<route id>": {
    "review": { "sources": ["<every URL you read and drew a fact from>"] },
    "belay": { "<stored label>": "<sentence>" }
  }
}
Routes where you found nothing map to { "review": { "sources": [] }, "belay": {} }.
List only URLs you actually read in full and used. Then reply with ONE line:
`done <routes> routes, <pitches filled> pitches, <routes with nothing>`. Do not paste sentences back.
