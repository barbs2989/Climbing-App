# HOLD list: pitch-count research (2026-10-28)

18 routes were held in the 2026-10-25 mismatch pass. Two Sonnet research batches (read-only) checked each
against Mountain Project, the guide-service and club pages, Supertopo, trip reports and the AAJ.

**Result: no stored `pitches` count was changed.**
- Batch 1 (9 routes): 0 SET. KEEP on 6 (Forbidden E Ridge 6, Thomson W Ridge 6, North Ridge W Side 3,
  North Face Left Buttress 14 vs one source's 12, Dragontail Serpentine 14 vs one source's 13, Dorado
  Needle E Ridge 14); UNCLEAR on Eldorado Glacier NW, Forbidden W Ridge (sources say 4, 6 and 8).
- Batch 2 (9 routes): 1 candidate, 8 KEEP or UNCLEAR. West Ridge 2 (Forbidden-area route, stored 7):
  Mountain Project describes P1–P8 and says 8; NC Mountain Guides says "seven to eight"; Supertopo's
  count is N/A. Only one per-pitch source, so NOT changed. Recommend SET 8 once a second source or the
  owner confirms it, and the table gets an 8th row.
- Stored count is KEPT wherever the sources disagree or are only snippets (Scarface, South Arete, Sperry,
  Spire Point, Spontaneity, Johannesburg, Rapple Grapple 4 agrees, Skeena26 12 agrees, South Face).

**Why nothing moved:** the rule used is two independent sources that agree on a count that differs from
the stored one. Most held routes have one readable source, because the Mountaineers, SummitPost and
Cascade Climbers pages return 403 or Cloudflare blocks to fetches.

**Real decisions for the owner:** Forbidden West Ridge (4 vs 6 vs 8), Eldorado Glacier NW, Spontaneity Arete
(Mountain Project says 6, Supertopo 8), West Ridge 2 (SET 8 recommended). Print guidebook text or a
first-hand count would settle the rest.

Files: hold-live.json (the 18 with stored and found counts), research-batch-1.json, research-batch-2.json.

## Pass 2 (2026-10-28, extended search)
- **wa_west_ridge_2 (Paisano Pinnacle): stored pitches 7 -> 8 (APPLIED, re-read verified).** The breakdown already covered pitches 1 to 8 (row "1-2" links two pitches); only the count was wrong. Sources: Steph Abegg report captions pitch 8 as final; Andrew Leader headings run to "Pitch 8 - 5.8"; Mountain Project says 8 (earlier read). One dissent: James Wolff implies about 7. Rollback: rollback-wa_west_ridge_2.json.
- wa_forbidden_peak_west_ridge: KEEP 8 (high). Mountain School and Northwest Alpine Guides both say eight pitches; the Mountaineers says four (dissent).
- wa_spontaneity_arete: KEEP 7 (medium). WTA report says "a nice 7-pitch route"; Mountain Project 6 plus optional 7th fits; Supertopo says 8.
- wa_eldorado_peak_eldorado_glacier_nw: still UNCLEAR, stored 8 kept. No two sources agree.
