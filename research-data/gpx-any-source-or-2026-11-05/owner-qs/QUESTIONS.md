# Oregon owner questions (2026-11-05)

Every question comes from the Oregon Peakbagger pass: the verdicts in `../verdicts-frozen/` (read the
`notes`, `missing` and `otherTracksConsidered` of the named file), the packets in `../packets/`, the
duplicate research in `../dupes/`, and `catalog-or-mountains.json` (every route we hold on the Oregon
volcanoes, Mount Hood, the Wallowas and Anthony Lakes). **A route is only missing if it is absent from
catalog-or-mountains.json under every name and spelling** — on WA every "missing" claim from the first
wave was false, and today four of the six Mount Hood "missing" routes were already stored on
`or_west_side_3`.

Owner, 2026-11-05: "if you find peaks or routes that we don't have, add them". For an ADD, `proposed`
must hold a whole row in our own words: name, area_id (an existing area; or say a new PEAK area is
needed, with its name, parent area_id and summit coordinate from a fetched page), discipline, grade, face,
aspect, season ("Jul-Sep"), overview (2-4 sentences), approach (2-3 sentences), descent_text, and a
Trailhead coordinate only if a fetched official/mapped page gives it (`confirmedBy` URL).

| key | question | start from |
|---|---|---|
| hood-cooper-spur | Cooper Spur on Mount Hood is not in the catalog. Confirm it is a standard route, and give a full row. Which of our Hood areas does it belong on (`or_north_side`, `or_east_side_2`)? Cloud Cap / Tilly Jane trailhead coordinate from a fetched page. | verdicts-frozen/or_east_side_2.json `missing`; catalog Hood areas |
| jefferson-whitewater | Mount Jefferson's Whitewater Glacier route is not in the catalog (22 logged ascents). Confirm and give a full row; Whitewater trailhead coordinate. | verdicts-frozen/or_mt_jefferson.json `missing` |
| jefferson-southwest-ridge | Is Jefferson's "Southwest Ridge" a distinct route from our South Ridge (Pamelia Lake), or a name for the same line? If distinct, a full row. | or_mt_jefferson.json |
| jefferson-center-ridge | Our row "Center Ridge" (alpine, Easy 5th) on Mount Jefferson: no source was found. Does such a route exist (try Smoot/Bond guide content, AAJ, Mazamas, cascadeclimbers, MP)? If yes, what is it; if it is another route under a wrong name, which. Read its stored text first. | or_mt_jefferson packet allRoutesOnPeak |
| north-sister-southeast-ridge | North Sister "Southeast Ridge" (~10 logged ascents) is not in the catalog. Distinct from our South Ridge? If so, a full row. | verdicts-frozen/or_north_sister.json notes |
| north-sister-west-face-right | Our row "West Face- Right" on North Sister: no source found. Does it exist? Read its stored text. | or_north_sister packet |
| broken-top-south-peak | Broken Top's South Peak "South Ridge" (class 3, 6 logged ascents): add as a route? South Peak is a separate summit from our Broken Top main summit — does it need its own peak area, or is it a route on `or_broken_top`? | verdicts-frozen/or_broken_top.json `missing` |
| gunsight-west-ridge | Gunsight Mountain (Anthony Lakes) "West Ridge" class 3 scramble: is it a real, climbed route? If so a full row on `or_gunsight_mountain`. | verdicts-frozen/or_gunsight_mountain.json |
| matterhorn-wallowas | The Wallowa Matterhorn: our rock routes sit on the crag area `or_ice_lake_peaks`. The standard route (from Ice Lake, ~20 logged ascents) is missing. Give a full row; should the Matterhorn get its own PEAK area (and the West Face routes move onto it)? Also the Sacajawea–Matterhorn traverse: a route worth adding? | verdicts-frozen/or_ice_lake_peaks.json |
| petes-point | Our row "Pete's Point" (mountaineering, Easy Snow) on `or_aneroid_lake_peaks`: which line is it (its own text)? Is the North Ridge from Tenderfoot Pass a different route to add? Pete's Point's summit is ~2.5 km from the area's coordinate (Peakbagger 45.18934,-117.22031). | verdicts-frozen/or_aneroid_lake_peaks.json |
| krag-peak | Krag Peak's standard SE Ridge (from Crater Lake, Wallowas) is missing, and there is no Krag Peak area; our "Krag Peak Traverse" sits on `or_wallowa_mountains_traverses`. Add Krag Peak as a peak area + the SE Ridge route? How does the traverse relate? | verdicts-frozen/or_wallowa_mountains_traverses.json |
| thielsen-partly-void | Mount Thielsen: is "Partly Void, Mostly Stars" (alpine 5.7) the same climb as our "Northwest Arete" (trad, id or_h_mt_thielsen_northwest_arete)? Also: Northwest Arete and Northeast Buttress are filed TRAD on a peak — owner rule says roped rock on a peak is ALPINE; confirm each. | or_mt_thielsen packet + verdicts notes |
| mcloughlin-discipline | Mount McLoughlin East Ridge (the trail route, merged today with "Trail #3716"): its discipline is mountaineering, grade "Easy Snow", disciplines ["mountaineering","alpine"]. What are the right discipline, grade and disciplines for a summer trail + Class 2 scree walk-up that is a snow climb in winter/spring? | or_mt_mcloughlin packet |
| volcano-ice-rows | Many Oregon volcano rows are filed discipline `ice` though they are snow/glacier/alpine-ice routes (Leuthold Couloir, Reid/Sandy Glacier Headwalls, Yocum Ridge, Cathedral Ridge, Devil's Kitchen Headwall variations, Eliot Glacier Headwall, Wy'East, Western Gulch, North/South Sister couloirs, Broken Top Full Richardson/High Noon...). Owner rules: mountaineering = non-technical walk-up; any roped/technical snow-ice or rock on a peak = alpine; `ice` is for ice climbing. For EACH ice/mixed row in catalog-or-mountains.json (Hood, Sisters, Broken Top, Thielsen, Jefferson, Wallowas — not waterfall-ice crags like Polallie Creek Falls or Salmon River Slab), recommend keep `ice` or change to `alpine`/`mountaineering`, with the reason. | catalog-or-mountains.json |
| red-eye-peking | Smith Rock area pairs: (a) "Red Eye" (3 pitches) vs "Red Eye [E]" (one 18 m pitch) on Red Wall — one climb (the [E] row = its first pitch) or two? (b) "Chouinard's Crack (1st Half Pitch of Peking)" vs "Peking" — keep both or merge? | ../dupes/pairs.json keys p023, p011 |
| crag-unsure-pairs | Settle the 11 unsure crag pairs from Mountain Project's area listings (left-to-right order, grades, FA): keys p003 p004 p036 p039 p041 p044 p047 p085 p086 p122 p155 p167 in ../dupes/pairs.json, verdicts in ../dupes/verdicts/. | ../dupes/ |
| diamond-pioneer-gulch | Diamond Peak's Southwest Ridge starts at the Pioneer Gulch trailhead: find its coordinate on a fetched official or mapped page (USFS, Oregon Hikers, OSM node/way). Also: does our "South Ridge (from Summit Lake)" describe a separate line? (The dupe research said yes.) | or_diamond_peak packet |
