# Trad → alpine review: the rule (2026-11-11)

Owner request: trad routes "in the mountains" should be filed as alpine; research what makes a route alpine
or trad at a crag. Owner's standing rule (migration 0197, 2026-09-24): "Trad only applies to climbs at a
crag"; a peak's 5th-class route is alpine.

## What the sources say
- **Trad is a protection style, alpine is a setting.** Trad means the leader places the gear; many alpine
  routes are trad too. Alpine is about a mountain environment, self-reliance, and long routes that can mix
  rock, snow and ice. The line between multi-pitch and alpine is "not defined"; communities judge it.
  ([Wikipedia: Multi-pitch climbing](https://en.wikipedia.org/wiki/Multi-pitch_climbing),
  [Alpine climbing](https://cavac.at/cavacopedia/Alpine%20climbing))
- **Alpine terrain means complex approaches and descents**, possibly over snow, ice or glaciers, up to
  alpine Grade 5 (the AMGA's Alpine Guide terrain). ([AMGA](https://amga.com/?p=852),
  [AMGA Alpine Guide](https://amga.com/alpine-guide/))
- **Roped rock routes to alpine summits are alpine climbs.** The Mountaineers' Basic Rock path lists climbs
  that reach alpine summits by easy multi-pitch rock (The Tooth, Ingalls, South Early Winter Spire), and
  their Basic Climbs are summit routes.
  ([Mountaineers: Basic Alpine](https://www.mountaineers.org/activities/activity-overviews/climbing/basic-alpine-climbing),
  [club-wide standards](https://mountaineers.org/about/vision-leadership/board-of-directors/clubwide-activity-standards/climbing),
  [SCC flowchart, Dec 2025](https://www.mountaineers.org/locations-lodges/seattle-branch/committees/seattle-climbing-committee/seattle-climbing-website/scc-entry-level-courses-flowchart_dec-2025-update.pdf))
- **Commitment factors**: approach and descent length, route length, objective hazards (rockfall, weather,
  snow), and the nature of the climb. Weather and objective hazards are the alpine signature.
  ([Ortovox: alpine dangers](https://ortovox.com/uk/safety-academy-lab-rock/chapter-1-alpine-climbing-basics/alpine-dangers),
  [Timberline Trails](https://mail.timberlinetrails.com/Climbing.html))
- **A crag** is a cliff (often small) climbed with a short approach from the car, where you come back to the
  base: lower off, rappel, or walk off to your pack. Cliff height alone does not make it not-a-crag.
  ([theCrag glossary](https://thecrag.com/article/glossary),
  [GearJunkie glossary](https://gearjunkie.com/climbing/definitive-guide-climbing-jargon),
  [MP forum](https://www.mountainproject.com/forum/message/111988114))
- **Elevation/treeline alone does not decide it.** Climbers propose ~10,000 ft or "above trees", and others
  point out that Cascade peaks under 9,000 ft are more alpine than many Sierra crags. Mountain Project sets its
  "Alpine" tag per area, by judgment. ([MP forum](https://www.mountainproject.com/forum/message/109120359),
  [MP forum](https://www.mountainproject.com/forum/message/126610081))

- **Alpine routes are long and set in mountains**, often reached over glaciers or snow, with objective hazards
  (rockfall, storms, remoteness); they "often ... require a full day of climbing, or even several days", and do
  not always reach the summit. ([Wikipedia: Alpine climbing](https://en.wikipedia.org/wiki/Alpine_climbing))
- **An alpine setting alone does not make a trad route alpine.** theCrag does not label pure trad or aid
  climbs alpine just because they are in an alpine setting; its alpine style is about reaching a summit.
  (theCrag's styles article, seen via a search summary; the page returns 403 to automated reads.)
- **No source sets a cutoff in hours.** Usage: crag means a short approach near the car; alpine means
  multi-hour to multi-day approaches in mountain terrain.
  ([MP: Sport climbing vs. "Cragging"](https://www.mountainproject.com/forum/topic/111987851/sport-climbing-vs-cragging),
  [MP: Define Alpine Climbing](https://www.mountainproject.com/forum/topic/113496422/define-alpine-climbing),
  [Explorersweb grades guide](https://explorersweb.com/guide-to-climbing-grades-ratings/))

**Owner, 2026-11-11: "yes crag for trad is just a short approach."** Short is taken as about an hour or less on
foot from the car (roughly 2-3 miles), coming back to the base.

## The rule applied
**alpine**: the outing is a mountain day, shown by at least one of:
- the line tops out on or near the summit or ridge crest of a mountain, peak or alpine spire (not the rim of a valley wall);
- getting there or back needs mountain travel: glacier, snow, crampons or axe, a high camp or bivy, or a long backcountry approach;
- it is a face on a high peak or alpine cirque reached by backcountry travel, where weather and objective hazards rule the day.

**trad** (stays): a cliff or wall climbed as a cragging day, even a long one:
- valley and canyon walls with a walk-off or rappels back to the base (Yosemite Valley, Squamish Chief, Index,
  Snow Creek Wall, Eldorado Canyon, Black Canyon, Zion, Red Rocks, Lumpy Ridge);
- desert towers and crag "summits" (Castleton, Fisher Towers);
- **high roadside crags**: a formation high on a mountain but a short walk from a road, climbed and lowered or
  walked off back to the pack (Pikes Peak highway formations, Mt Blue Sky's Black Wall). Elevation alone is not alpine;
- a commitment grade (III+) or a long route alone does NOT make it alpine.

**unsure**: real ambiguity; say what would settle it. Unsure rows stay trad.

Each decision carries a one-line reason. `decisions.json` holds the first pass; `final` is the call after this
sourced rule was applied to the low-confidence and unsure rows.

## Pass 2 (0418)
All 78,452 trad routes were read (not just the 476 with a peak, III+ or summit-descent signal). 144 more carried an
approach/descent signal: a camp or bivy, glacier or snow travel, a multi-hour or 3+ mile walk, or a large distance or
gain. Judged against the same rule in three batches (`pass2-in-*.json` / `pass2-out-*.json`, merged in
`pass2-decisions.json`): 84 alpine (high/medium), 52 trad, 3 low-confidence alpine and 5 unsure left trad.
Limit: only 993 trad routes have any approach text, so a backcountry route with none is not caught by this pass.

Open questions for the owner: The Comb (Darrington) routes have no location text; one source puts Desire on the nearer
Comb Buttress (20 min to 1 hr), the earlier research a 2 hr approach to Green Giant Buttress. They stay alpine
until a source settles it. The 3 rows unsure in pass 1 (North Fortress, Brokeback Mountain, Eocene) still have no
approach time (out-pass2-research.json) and stay trad.
