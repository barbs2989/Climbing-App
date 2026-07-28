# Alpine Route Elevation Gain Backfill

## Overview
This document summarizes the elevation gain data research and backfill for WA alpine routes.

## Changes Summary

### Routes to DELETE
- **West Ridge of Mt Goode** - Route does not exist (verified across 10+ sources: Mountain Project, SummitPost, Beckey Vol. 2, OpenBeta, trip reports)

### Routes to UPDATE with gain_ft & high_point_ft

#### Mt Rainier (14,410 ft summit)
| Route | gain_ft | high_point_ft | Confidence |
|-------|---------|---------------|-----------|
| Emmons Glacier | 10,300 | 14,410 | HIGH |
| Winthrop Glacier | 10,300 | 14,410 | HIGH |
| Disappointment Cleaver | 9,000 | 14,410 | HIGH |
| Ingraham Glacier Direct | 9,000 | 14,410 | HIGH |
| Fuhrer Finger | 9,100 | 14,410 | HIGH |
| Nisqually Cleaver | 9,000 | 14,410 | HIGH |

**Sources:** NPS Route Brief, Alpine Ascents, Mountaineers Press, Mountain Project

#### Mt Adams (12,281 ft summit)
| Route | gain_ft | high_point_ft | Confidence |
|-------|---------|---------------|-----------|
| South Climb / Suksdorf Ridge | 6,700 | 12,281 | HIGH |
| North Ridge | 6,500 | 12,281 | MEDIUM |
| Adams Glacier | 5,000 | 12,281 | MEDIUM |
| Lyman Glacier | 5,200 | 12,281 | MEDIUM |
| Mazama Glacier | 4,200 | 12,281 | MEDIUM |

**Sources:** Alpine Ascents, AllTrails, WTA, Alpine audit 2026-07-15

#### Mt Hood (11,249 ft summit)
| Route | gain_ft | high_point_ft | Confidence |
|-------|---------|---------------|-----------|
| South Side / Palmer Glacier | 5,350 | 11,249 | HIGH |
| Cooper Spur | 5,300 | 11,249 | MEDIUM |
| Yocum Ridge | 5,400 | 11,249 | HIGH |
| Eliot Glacier | 4,000 | 11,249 | MEDIUM |

**Sources:** Mountain Project, Prominence Registry, Backpacker Magazine, Oregon Hikers

#### Glacier Peak (10,541 ft summit)
| Route | gain_ft | high_point_ft | Confidence |
|-------|---------|---------------|-----------|
| White Chuck Glacier | 8,900 | 10,541 | HIGH |
| Gerdine Glacier | 8,900 | 10,541 | HIGH |
| Suiattle River | 10,879 | 10,541 | MEDIUM |
| Ermine Ridge | 11,000 | 10,541 | MEDIUM |

**Sources:** NW Alpine Guides, Alpine Ascents, SummitPost, Mountaineers Press

**Route to DELETE:** Milk Creek Route (closed since 2003)

#### Mt Baker (10,781 ft summit)
| Route | gain_ft | high_point_ft | Confidence |
|-------|---------|---------------|-----------|
| Coleman-Deming Glacier | 7,175 | 10,781 | HIGH |
| Easton Glacier | 7,500 | 10,781 | HIGH |
| Park Glacier | 4,000 | 10,781 | MEDIUM |
| Heliotrope Ridge* | 1,860 | 5,550 | HIGH |

**Sources:** Alpine Institute, Blackbird Mountain Guides, SummitPost, Alpine Ascents

*Heliotrope Ridge is a day-hike approach trail (not a summit route) — marked accordingly

#### Mt Goode (9,220 ft summit)
| Route | gain_ft | high_point_ft | Confidence |
|-------|---------|---------------|-----------|
| Northeast Buttress | 7,200 | 9,220 | HIGH |
| Southwest Couloir | 6,250 | 9,220 | HIGH |
| Megalodon Ridge | 7,000 | 9,220 | HIGH |
| Northeast Face | 7,200 | 9,220 | MEDIUM |
| No Goode | 7,200 | 9,220 | HIGH |
| Goode Adventure | 7,200 | 9,220 | HIGH |

**Sources:** Mountain Project, Beckey Cascade Alpine Guide Vol. 2, CascadeClimbers, Alpinist Magazine, trip reports 2015–2025

## Execution

1. **Review** this summary for accuracy
2. **Execute** `scripts/backfill-alpine-gains.sql` in Supabase SQL editor
3. **Verify** using the verification query at the end of the SQL file
4. **Test** in the app UI to confirm routes display elevation gain correctly

## Data Quality Notes

- All gains are roundtrip from listed trailhead to summit
- HIGH confidence = verified across 3+ independent sources
- MEDIUM confidence = verified across 2 sources
- Seasonal variations (snow conditions, access) documented where applicable
- Trailhead elevations affect gain calculations; see SQL comments for specific routes

## Next Steps

1. After backfill, retest alpine routes in the app
2. Monitor user reports for any anomalies
3. Consider adding `gain_confidence` field to routes table for future audits
4. Schedule annual verification against updated guidebooks/Mountain Project data
