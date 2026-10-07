# Crag rock audit + fill — agent brief

Input: `batches/bNN.json`, 20 crags each: `{c, pid, crag, region, lat, lng, routes, wallsByHeldRock}`.
`wallsByHeldRock` groups the crag's walls by the rock we hold now, e.g. `"granite (mapped)"` (from a
bedrock map at the coordinate, 81% right) or `"MISSING"` (no rock at all).

For each crag, research ONLINE (WebSearch, then WebFetch the best page: Mountain Project area page,
a guidebook or park geology page, USGS, Wikipedia). Read what climbers' sources say the climbing
rock is. One or two searches per crag; do not guess from memory, and only cite URLs you fetched or
that the search result itself showed.

Decide:
- each held-rock group: `ok` (the walls in it are that rock; granodiorite/monzonite count as granite
  family but keep the specific name we hold), `wrong` (give the correct rock), or `unclear`;
- every MISSING wall: its rock, if the crag's sources make it clear (walls of one crag usually share
  rock; only fill when the crag is on one rock or the wall is named in the source);
- `wallExceptions`: named walls your source puts on a different rock from their group;
- `aspects`: ONLY if a page you read states which way a named wall faces (or "morning/afternoon
  sun"), record it as N/NE/E/SE/S/SW/W/NW. Never infer.

Use specific rock names: granite, granodiorite, gneiss, schist, quartzite, sandstone, conglomerate,
limestone, dolomite, basalt, rhyolite, andesite, welded tuff, gabbro, diabase…

Write `rock-found/bNN.json` (same NN) as an array, one per crag:
`{pid, crag, groups:[{held, verdict, correct}], fills:{wall:rock}, wallExceptions:{wall:rock}, aspects:{wall:dir}, url, quote}`
(`quote`: the rock statement, under 20 words.) Do not touch the database or any other file.
