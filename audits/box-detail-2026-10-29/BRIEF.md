# Research brief: more in each ROUTE BREAKDOWN box (2026-10-29)

Owner's note: "We need more information on the route beta section for each box."
Each route's ROUTE BREAKDOWN (`routes.pitch_detail`) is a list of boxes: roped pitches and travel
legs (approach gully, glacier, snowfield, summit ridge, rappel). Many boxes in your batch hold only
a short line ("Long, steep, exposed snowfield leads to the summit") and nothing else. Your job: for
each THIN box listed in your batch, write a fuller note a climber can use standing at the start of
that section, and add a length / anchor only when a source states it.

## Inputs
- Your batch: a list of route ids and, per route, the THIN labels to work on.
- `audits/box-detail-2026-10-29/context/<route_id>.json` — the stored row (name, area, grade,
  overview, approach, descent, beta, the whole pitch_detail). Read it first. Make sure every source
  you use describes THIS route (same peak/crag, same line). If unsure, skip the route.

## Method
1. WebSearch (mode "standard"; "extended" when standard is thin) for the route + peak/area + words
   like "route description", "trip report", "climbing route".
2. READ FULL PAGES with WebFetch only. Never use curl or any spoofed user agent, and never work
   around a site that blocks automated reads. If a page refuses, move on: trip-report blogs, club and
   guide-service pages, land-agency pages, OpenBeta, theCrag, Peakbagger, AAC journal articles.
3. Aim for 2+ independent pages per route. About 5–10 fetches per route is plenty.
4. Match each box by WHAT IT IS (its stored grade, name and notes), not only by order.

## What to write per thin box
- `notes`: 1–3 sentences, < 320 characters. Terrain (rock type, gully, ledges, snow angle, glacier
  features), where it goes, route-finding cues, the main hazard, and how the box ends (a notch, a
  col, the base of the next tower). Keep every fact the stored note already states unless a source
  contradicts it (say so in `changed`).
- `lengthM` (number, metres) and `anchor` (short text) ONLY when a source states them. Feet → metres.
- Never write a `grade`; never change a label.

## Rules — the apply script refuses violations
1. Facts come from a source; sentences are OURS. Never reuse 8+ consecutive words from any page you
   list (a script fetches every listed URL and refuses copies). Trimming a source sentence is not a
   rewrite.
2. Never name a source, guidebook, author or website in the text ("per MP", "Beckey says").
3. Nothing invented: no guessed lengths, angles, times, or features. If the sources say nothing new
   about a box, leave that box out. Empty is a correct answer.
4. No ALL CAPS words, no first person, no testimony. Sentence case.
5. Conditions-dependent facts are stated as such ("melts out to scree by August").

## Output — ONE JSON file at the path you were given
{
  "<route_id>": {
    "boxes": { "<stored label exactly>": { "notes": "...", "lengthM": 60, "anchor": "..." } },
    "review": { "confidence": "high|medium|low", "sources": ["full URLs read and used"],
                "changed": "what you wrote, what you left out and why",
                "other_findings": "anything in the stored row that looks WRONG — report only" }
  },
  "skip_reasons": { "<route_id>": "why" }
}
Then reply with ONE line per route: id, boxes written, confidence — and the skips. Do not paste text back.
