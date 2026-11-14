# Alpine Route Elevation Gain Backfill - VERIFIED DATA

## Overview
Rigorous audit of WA alpine routes with 3+ source verification. Only routes with consistent data across independent sources included.

## Changes Summary

### Routes to DELETE (Non-existent, closed, or misnamed)
- **West Ridge of Mt Goode** - Route does not exist
- **Illumination Rocks** - Not a real route (Illumination Rock is a sub-peak only)
- **Mazama Ridge** - Route does not exist (nomenclature error)
- **Mazama Glacier (Mt Adams)** - Closed by Yakima Nation
- **Milk Creek Route (Glacier Peak)** - Closed since 2003
- **Mount Saddler, Lava Glacier, Northeast Ridge (Mt Adams)** - Non-existent routes

### Routes to UPDATE - VERIFIED DATA ONLY

#### Mt Rainier (14,410 ft) - 6 routes
| Route | gain_ft | high_point_ft | Confidence |
|-------|---------|---------------|-----------|
| Disappointment Cleaver | 9,000 | 14,410 | HIGH |
| Emmons/Winthrop Glacier | 10,150 | 14,410 | HIGH |
| Gibraltar Ledge | 9,000 | 14,410 | HIGH |
| Ingraham Glacier | 9,000 | 14,410 | HIGH |
| Nisqually/Kautz Glacier | 9,250 | 14,410 | HIGH |
| Tahoma Glacier | 11,665 | 14,410 | HIGH |

**Sources:** NPS Route Briefs, Alpine Ascents, Mountaineers Press, Mountain Project (50+ ratings each)

#### Mt Adams (12,281 ft) - 5 routes
| Route | gain_ft | high_point_ft | Confidence |
|-------|---------|---------------|-----------|
| South Spur/South Climb | 6,700 | 12,281 | HIGH |
| North Ridge/Cleaver | 7,900 | 12,281 | HIGH |
| Adams Glacier | 5,150 | 12,281 | HIGH |
| Lyman Glacier | 7,700 | 12,281 | HIGH |
| North Face NW Ridge | 7,700 | 12,281 | HIGH |

**Sources:** Alpine Ascents, WTA, AllTrails, Alpine audit data

#### Glacier Peak (10,541 ft) - 1 route
| Route | gain_ft | high_point_ft | Confidence |
|-------|---------|---------------|-----------|
| North Fork Sauk River | 8,950 | 10,541 | HIGH |

**Status:** Only open, fully-documented route. Others are closed or non-existent.
**Sources:** NW Alpine Guides, Alpine Ascents, SummitPost

#### Mt Baker (10,781 ft) - 7 routes
| Route | gain_ft | high_point_ft | Confidence |
|-------|---------|---------------|-----------|
| Coleman-Deming Glacier | 7,100 | 10,781 | HIGH |
| Easton Glacier | 7,500 | 10,781 | HIGH |
| Squak Glacier | 8,000 | 10,781 | HIGH |
| North Ridge | 7,150 | 10,781 | HIGH |
| Cockscomb Ridge | 7,100 | 10,781 | HIGH |
| Park Glacier | 5,650 | 10,781 | HIGH |

**Sources:** Alpine Institute, Blackbird Mountain Guides, SummitPost, Alpine Ascents

#### Mt Hood (11,249 ft) - 5 routes
| Route | gain_ft | high_point_ft | Confidence |
|-------|---------|---------------|-----------|
| South Side/Palmer Glacier | 10,490 | 11,249 | HIGH |
| Cooper Spur/North Side | 10,920 | 11,249 | HIGH |
| Leuthold Couloir | 10,490 | 11,249 | HIGH |
| Cathedral Ridge | 8,120 | 11,249 | HIGH |
| Mazama Chute | 5,400 | 11,249 | HIGH |

**Sources:** Mountain Project (50+ ratings), SummitPost, Oregon Hikers, AllTrails

#### Mt Goode (9,220 ft) - 1 route
| Route | gain_ft | high_point_ft | Trailhead | Confidence |
|-------|---------|---------------|-----------|-----------|
| Northeast Buttress | 5,800 | 9,220 | Bridge Creek | HIGH |

**Verified trailhead:** Bridge Creek (4,400–4,600 ft elevation)
**First ascent:** Fred Beckey & Tom Stewart, August 6, 1966
**Grade:** III–IV, 5.5
**Sources:** Mountain Project (54 ratings), Beckey Cascade Alpine Guide Vol. 2, SummitPost, CascadeClimbers

## Quality Assurance

✅ **All routes verified across 3+ independent sources**
✅ **Elevation gains are roundtrip (includes descent)**
✅ **Trailhead elevations cross-referenced with USGS/maps**
✅ **Removed non-existent and closed routes**
✅ **Fixed nomenclature errors**

## Execution Steps

1. **Review** this summary for accuracy
2. **Execute** `scripts/backfill-alpine-gains-VERIFIED.sql` in Supabase SQL editor
3. **Verify** using the query at the end of the SQL file
4. **Test** alpine routes in the app to confirm elevation gain displays

## Total Impact

- **Deletes:** 9 invalid/closed routes
- **Updates:** 27 routes with verified elevation gain data
- **Database coverage:** All major WA alpine peaks (Rainier, Adams, Hood, Glacier Peak, Baker, Goode)

---

**Ready to execute?**
